import { useEffect, useMemo, useState } from 'react';
import { askGeminiRepairAssistant } from '../../lib/gemini';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/telemetry';
import { useAuth } from '../../context/auth-context';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SESSION_STORE_KEY = 'diy.assistant.sessions';
const PLAYBOOK_DRAFTS_KEY = 'diy.playbook.drafts';
const SAFETY_CONFIRM_KEY = 'diy.safety.confirmed';
const riskyKeywords = ['battery puncture', 'mains', 'high voltage', 'live wire', 'esd', 'short mains'];

async function compressImageFile(file) {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(imageBitmap.width, imageBitmap.height));
  canvas.width = Math.max(1, Math.round(imageBitmap.width * scale));
  canvas.height = Math.max(1, Math.round(imageBitmap.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context for image compression.');
  }

  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.82);
  });

  if (!blob) {
    throw new Error('Image compression failed.');
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg'
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image data.'));
        return;
      }

      const commaIndex = result.indexOf(',');
      if (commaIndex < 0) {
        reject(new Error('Invalid image encoding.'));
        return;
      }

      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error('Could not load selected image.'));
    reader.readAsDataURL(file);
  });
}

function buildInitialMessage(problemContext) {
  if (problemContext) {
    return `I can help you troubleshoot this case. Ask me about diagnostics, tool checks, or next safe steps.`;
  }

  return 'Describe your repair problem and I will suggest a troubleshooting path.';
}

export default function RepairAssistantPanel({ title = 'Gemini Repair Assistant', problemContext = '' }) {
  const { user } = useAuth();
  const initialMessage = useMemo(
    () => [{ id: 'init', role: 'assistant', text: buildInitialMessage(problemContext) }],
    [problemContext]
  );

  const [messages, setMessages] = useState(initialMessage);
  const [question, setQuestion] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageData, setImageData] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dangerConfirmed, setDangerConfirmed] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [safetySaving, setSafetySaving] = useState(false);
  const [safetyLoading, setSafetyLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSafetyConfirmation() {
      if (isSupabaseConfigured && user?.id) {
        const { data, error: loadError } = await supabase
          .from('profiles')
          .select('safety_confirmed')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        if (loadError) {
          setError('Could not load safety confirmation.');
          trackEvent('ai_safety_load_error', { message: loadError.message });
        }

        const confirmed = Boolean(data?.safety_confirmed);
        setSafetyConfirmed(confirmed);
        setSafetyChecked(confirmed);
        setSafetyLoading(false);
        return;
      }

      const localConfirmed = window.localStorage.getItem(SAFETY_CONFIRM_KEY) === '1';
      setSafetyConfirmed(localConfirmed);
      setSafetyChecked(localConfirmed);
      setSafetyLoading(false);
    }

    loadSafetyConfirmation();

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function confirmSafetyOnce() {
    if (safetySaving || !safetyChecked) return;

    setSafetySaving(true);
    setError('');

    try {
      if (isSupabaseConfigured && user?.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ safety_confirmed: true })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      window.localStorage.setItem(SAFETY_CONFIRM_KEY, '1');
      setSafetyConfirmed(true);
      setSafetyChecked(true);
      trackEvent('ai_safety_confirmed', { userId: user?.id || 'anonymous' });
    } catch (err) {
      setError('Could not save safety confirmation.');
      trackEvent('ai_safety_save_error', { message: err?.message || 'save failed' });
    } finally {
      setSafetySaving(false);
    }
  }

  async function onSelectImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large. Max file size is 8MB.');
      event.target.value = '';
      return;
    }

    try {
      const candidateFile = file.size > 1024 * 1024 ? await compressImageFile(file) : file;
      const encoded = await fileToBase64(candidateFile);
      setImageData(encoded);
      setImageMimeType(candidateFile.type);
      setImageName(candidateFile.name);
      setImagePreviewUrl(`data:${candidateFile.type};base64,${encoded}`);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not process image.');
    } finally {
      event.target.value = '';
    }
  }

  function clearImage() {
    setImagePreviewUrl('');
    setImageData('');
    setImageMimeType('');
    setImageName('');
  }

  async function onAsk(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if ((!trimmed && !imageData) || loading) return;

    if (!safetyConfirmed) {
      setError('Safety confirmation required before using Gemini.');
      trackEvent('ai_safety_confirmation_blocked', { snippet: trimmed.slice(0, 120) });
      return;
    }

    const textForRisk = `${problemContext}\n${trimmed}`.toLowerCase();
    const risky = riskyKeywords.some((keyword) => textForRisk.includes(keyword));
    if (risky && !dangerConfirmed) {
      setError('Safety confirmation required for risky hardware operations.');
      trackEvent('ai_safety_confirmation_blocked', { snippet: trimmed.slice(0, 120) });
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed || 'Analyze this image and suggest troubleshooting steps.',
      imageData,
      imageMimeType,
      imageName,
      imagePreviewUrl
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion('');
    clearImage();
    setLoading(true);
    setError('');

    try {
      const reply = await askGeminiRepairAssistant({
        messages: nextMessages,
        problemContext
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: reply
        }
      ]);

      if (/resolved|fixed|solved|working now/i.test(reply)) {
        const drafts = JSON.parse(window.localStorage.getItem(PLAYBOOK_DRAFTS_KEY) || '[]');
        drafts.push({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          title: trimmed.slice(0, 80) || 'AI repair draft',
          summary: reply.slice(0, 220),
          source: 'assistant-session'
        });
        window.localStorage.setItem(PLAYBOOK_DRAFTS_KEY, JSON.stringify(drafts));
        setSessionNotice('Potential solution detected. Draft playbook saved.');
      }
    } catch (err) {
      setError(err.message || 'Assistant request failed.');
      trackEvent('ai_request_error', { message: err.message || 'Assistant request failed.' });
    } finally {
      setLoading(false);
    }
  }

  function saveDiagnosticSession() {
    const sessions = JSON.parse(window.localStorage.getItem(SESSION_STORE_KEY) || '[]');
    sessions.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      problemContext,
      messages
    });
    window.localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(sessions));
    setSessionNotice('Diagnostic session saved to workflow memory.');
  }

  function onReset() {
    clearImage();
    setMessages(initialMessage);
    setQuestion('');
    setError('');
  }

  return (
    <section className="diy-card p-4 sm:p-5">
      {!safetyLoading && !safetyConfirmed ? (
        <div className="mb-4 border-2 border-black bg-white p-4 shadow-hard">
          <h4 className="text-base font-bold uppercase tracking-wide">One-time safety confirmation</h4>
          <p className="mt-2 text-sm">
            Confirm you understand the risks before using Gemini. This is stored once per account.
          </p>
          <label className="mt-3 flex items-start gap-2 border-2 border-black bg-paper px-3 py-2 text-xs shadow-hard">
            <input
              type="checkbox"
              checked={safetyChecked}
              onChange={(event) => setSafetyChecked(event.target.checked)}
            />
            <span>
              I understand risky steps (battery puncture, mains voltage, ESD) need safety controls and power isolation.
            </span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="pressable bg-neon px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={!safetyChecked || safetySaving}
              onClick={confirmSafetyOnce}
            >
              {safetySaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold">{title}</h3>
        <span className="sticker-tag bg-electric text-white">Gemini</span>
      </div>

      <div className="mb-3 max-h-[420px] space-y-3 overflow-y-auto border-2 border-black bg-white p-3 shadow-hard">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`border-2 border-black p-3 text-sm shadow-hard ${
              message.role === 'user' ? 'ml-6 bg-electric text-white' : 'mr-6 bg-paper text-ink'
            }`}
          >
            <p className="mb-1 font-mono text-xs uppercase tracking-wide">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </p>
            {message.imagePreviewUrl ? (
              <img
                src={message.imagePreviewUrl}
                alt={message.imageName || 'User upload'}
                className="mb-2 max-h-56 w-auto border-2 border-black bg-white shadow-hard"
              />
            ) : null}
            <p className="whitespace-pre-wrap">{message.text}</p>
          </article>
        ))}
      </div>

      {error ? (
        <p className="mb-3 border-2 border-black bg-action px-3 py-2 font-mono text-xs text-white shadow-hard">
          {error}
        </p>
      ) : null}

      {sessionNotice ? (
        <p className="mb-3 border-2 border-black bg-neon px-3 py-2 font-mono text-xs shadow-hard">
          {sessionNotice}
        </p>
      ) : null}

      <form className="grid gap-3" onSubmit={onAsk}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="pressable cursor-pointer bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink">
            Add Picture
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onSelectImage}
            />
          </label>

          {imageName ? (
            <span className="sticker-tag bg-amber text-ink">{imageName}</span>
          ) : null}

          {imageData ? (
            <button
              className="pressable bg-action px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              type="button"
              onClick={clearImage}
            >
              Remove Picture
            </button>
          ) : null}
        </div>

        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt="Pending upload"
            className="max-h-52 w-auto border-2 border-black bg-white p-1 shadow-hard"
          />
        ) : null}

        <textarea
          className="input-brutal min-h-28"
          placeholder="Ask about your repair issue, symptoms, or next test step (optional if sending an image)"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="pressable bg-neon px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !safetyConfirmed}
            type="submit"
          >
            {loading ? 'Thinking...' : 'Ask Gemini'}
          </button>
          <button
            className="pressable bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink"
            type="button"
            onClick={onReset}
          >
            Reset Chat
          </button>
          <button
            className="pressable bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
            type="button"
            onClick={saveDiagnosticSession}
          >
            Save Diagnostic Session
          </button>
        </div>
      </form>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide">
        Requires VITE_GEMINI_API_KEY in your environment. Supports image uploads up to 8MB.
      </p>
    </section>
  );
}







