import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), '.globe-settings.json');

type Provider = 'hermes' | 'lmstudio' | 'opencode' | 'openrouter' | 'deepseek' | 'openclaw';

interface Settings {
  provider?: Provider;
  configs?: Record<string, any>;
}

function readSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSettings(settings: Settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

const DEFAULTS: Record<Provider, Partial<{ baseUrl: string; apiKey: string; model: string }>> = {
  hermes: { baseUrl: '', apiKey: 'sofia-voice-key-2026', model: 'hermes-agent' },
  lmstudio: { baseUrl: 'http://localhost:1234/v1', apiKey: '' },
  opencode: { baseUrl: 'http://localhost:8765/v1', apiKey: '' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', apiKey: '', model: '' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat' },
  openclaw: { baseUrl: '', apiKey: '', model: '' }
};

async function callProvider(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<Response> {
  const url = `${baseUrl}/chat/completions`;
  
  console.log(`Calling provider at ${url} with model ${model}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, stream: true })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Provider API error (${baseUrl}):`, response.status, errorText);
    throw new Error(`Provider error: ${response.status}`);
  }

  // Stream SSE response back to client
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
        console.error('Stream read error:', err);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

export const POST: RequestHandler = async ({ request }) => {
  const { message, systemPrompt } = await request.json();

  if (!message || typeof message !== 'string') {
    return json({ error: 'Message is required' }, { status: 400 });
  }

  // Get selected provider from header or settings file
  const providerHeader = request.headers.get('x-provider');
  let providerId = (providerHeader || 'hermes') as Provider;

  // Validate provider ID
  if (!DEFAULTS[providerId]) {
    return json({ error: `Invalid provider: ${providerId}` }, { status: 400 });
  }

  // Read settings from file
  const settings = readSettings();
  
  // Build config for this provider
  const defaults = DEFAULTS[providerId];
  const configs = settings.configs || {};
  const config = {
    baseUrl: (configs[providerId]?.baseUrl ?? defaults.baseUrl) || '',
    apiKey: (configs[providerId]?.apiKey ?? defaults.apiKey) || '',
    model: (configs[providerId]?.model ?? defaults.model) || ''
  };

  // Validate config
  if (!config.baseUrl) {
    return json({ error: `No base URL configured for ${providerId}` }, { status: 502 });
  }

  try {
    // Build messages array with system prompt
    const messages: Array<{ role: string; content: string }> = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: message });
    
    return await callProvider(config.baseUrl, config.apiKey, config.model, messages);
  } catch (err) {
    console.error('Chat error:', err);
    return json({ error: `Cannot connect to ${providerId}` }, { status: 503 });
  }
};
