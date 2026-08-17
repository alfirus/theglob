import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { RequestHandler } from './$types';

const PIPER_MODEL = 'C:/Users/alfir/piper-voices/en_US-lessac-medium.onnx';

export const POST: RequestHandler = async ({ request }) => {
  const { text } = await request.json();

  if (!text || typeof text !== 'string') {
    return new Response('Text is required', { status: 400 });
  }

  const tmpWav = join(tmpdir(), `piper-${Date.now()}.wav`);

  try {
    // Run Piper TTS
    execSync(
      `echo "${text.replace(/"/g, '\\"')}" | piper --model "${PIPER_MODEL}" --output_file "${tmpWav}"`,
      { timeout: 30000 }
    );

    // Read the WAV file
    const wavBuffer = readFileSync(tmpWav);

    // Clean up
    unlinkSync(tmpWav);

    return new Response(wavBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString()
      }
    });
  } catch (err) {
    console.error('Piper TTS error:', err);
    // Clean up on error
    try { unlinkSync(tmpWav); } catch {}
    return new Response('TTS failed', { status: 500 });
  }
};
