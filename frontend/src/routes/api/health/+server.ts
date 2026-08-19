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

const DEFAULTS: Record<Provider, Partial<{ baseUrl: string; apiKey: string; model: string }>> = {
  hermes: { baseUrl: '', apiKey: 'sofia-voice-key-2026', model: 'hermes-agent' },
  lmstudio: { baseUrl: 'http://localhost:1234/v1', apiKey: '' },
  opencode: { baseUrl: 'http://localhost:8765/v1', apiKey: '' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', apiKey: '', model: '' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat' },
  openclaw: { baseUrl: '', apiKey: '', model: '' }
};

export const POST: RequestHandler = async ({ request }) => {
  const { providerId, baseUrl, apiKey } = await request.json();

  if (!providerId || !baseUrl) {
    return json({ error: 'Provider ID and base URL are required' }, { status: 400 });
  }

  // Validate provider ID
  if (!DEFAULTS[providerId as Provider]) {
    return json({ error: `Invalid provider: ${providerId}` }, { status: 400 });
  }

  const healthCheckUrls = [
    `${baseUrl}/health`,
    `${baseUrl}/v1/models`
  ];

  let healthy = false;
  let responseTime = 0;
  let error = '';

  for (const url of healthCheckUrls) {
    try {
      const startTime = Date.now();
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000)
      });

      responseTime = Date.now() - startTime;

      if (response.ok || response.status === 200) {
        healthy = true;
        break;
      }
    } catch (err: any) {
      error = err.message || 'Connection failed';
      continue;
    }
  }

  return json({
    providerId,
    baseUrl,
    healthy,
    responseTime,
    error: healthy ? '' : error || 'No health endpoint responded',
    checkedAt: new Date().toISOString()
  });
};
