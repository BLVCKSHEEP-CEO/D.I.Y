const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function getAssistantPrompt(problemContext) {
  return [
    'You are D.I.Y Repair Assistant.',
    'Help with practical hardware/software repair diagnostics.',
    'Always include safety reminders for physical repair steps.',
    'Prefer step-by-step troubleshooting and ask for missing details when required.',
    'Keep answers concise, actionable, and beginner-friendly unless user asks for advanced detail.',
    `Problem context: ${problemContext || 'No problem context provided yet.'}`
  ].join('\n');
}

export async function askGeminiRepairAssistant({ messages, problemContext }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
  }

  const contents = messages.map((message) => {
    const parts = [];

    if (message.text) {
      parts.push({ text: message.text });
    }

    if (message.role === 'user' && message.imageData && message.imageMimeType) {
      parts.push({
        inline_data: {
          mime_type: message.imageMimeType,
          data: message.imageData
        }
      });
    }

    return {
      role: message.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: getAssistantPrompt(problemContext) }]
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text).join('\n').trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}







