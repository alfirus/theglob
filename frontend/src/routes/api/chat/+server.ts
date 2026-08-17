import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const HERMES_URL = 'http://localhost:8642/v1/chat/completions';
const HERMES_KEY = 'sofia-voice-key-2026';

export const POST: RequestHandler = async ({ request }) => {
  const { message } = await request.json();

  if (!message || typeof message !== 'string') {
    return json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const response = await fetch(HERMES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HERMES_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'hermes-agent',
        messages: [{ role: 'user', content: message }],
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hermes API error:', response.status, errorText);
      return json({ error: `Hermes API error: ${response.status}` }, { status: 502 });
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
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

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
  } catch (err) {
    console.error('Hermes connection error:', err);
    return json({ error: 'Cannot connect to Hermes Agent' }, { status: 503 });
  }
};
