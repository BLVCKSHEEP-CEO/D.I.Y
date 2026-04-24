const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

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

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const parts = [];

  if (lastUserMessage?.text) {
    parts.push({ text: lastUserMessage.text });
  }

  if (lastUserMessage?.imageData && lastUserMessage.imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: lastUserMessage.imageMimeType,
        data: lastUserMessage.imageData
      }
    });
  }

  const contents = [
    {
      role: 'user',
      parts: [{ text: getAssistantPrompt(problemContext) }, ...parts]
    }
  ];

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
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







