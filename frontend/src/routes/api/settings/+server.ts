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

export const GET: RequestHandler = async () => {
  const settings = readSettings();
  return json(settings);
};

export const POST: RequestHandler = async ({ request }) => {
  const settings: Settings = await request.json();
  writeSettings(settings);
  return json({ success: true });
};
