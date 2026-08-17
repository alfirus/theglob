<script lang="ts">
  import { browser } from '$app/environment';
  import NeuralGlobe from '$lib/glob/NeuralGlobe.svelte';
  import ChatInput from '$lib/ChatInput.svelte';
  import ChatBubble from '$lib/ChatBubble.svelte';
  import DeviceStats from '$lib/DeviceStats.svelte';
  import type { Message } from '$lib/ChatBubble.svelte';

  let showInput = $state(false);
  let messages: Message[] = $state([]);
  let isThinking = $state(false);
  let isSpeaking = $state(false);
  let currentAudio: HTMLAudioElement | null = null;

  function handleGlobeClick() {
    showInput = true;
  }

  async function speak(text: string) {
    // Stop any ongoing speech
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    isSpeaking = true;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('TTS failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;

      audio.onended = () => {
        isSpeaking = false;
        currentAudio = null;
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        isSpeaking = false;
        currentAudio = null;
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err) {
      console.error('Piper TTS error:', err);
      isSpeaking = false;
    }
  }

  async function handleSend(e: CustomEvent<string>) {
    const text = e.detail;
    messages = [...messages, { role: 'user', text }];
    isThinking = true;

    // Stop any ongoing speech
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
      isSpeaking = false;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      messages = [...messages, { role: 'assistant', text: '' }];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantText += parsed.content;
                messages = [...messages.slice(0, -1), { role: 'assistant', text: assistantText }];
              }
            } catch { /* skip */ }
          }
        }
      }

      // Speak with Piper TTS after streaming completes
      if (assistantText) {
        speak(assistantText);
      }
    } catch (err) {
      console.error('Chat error:', err);
      messages = [...messages.slice(0, -1), {
        role: 'assistant',
        text: '⚠️ Cannot connect to Hermes Agent. Make sure the API server is running.'
      }];
    } finally {
      isThinking = false;
    }
  }
</script>

<svelte:head>
  <title>Glob Interface</title>
  <meta name="description" content="Neural Electric Globe — AI Interface" />
</svelte:head>

{#if browser}
  <!-- Globe centered -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="globe-wrapper" onclick={handleGlobeClick}>
    <NeuralGlobe {isSpeaking} />
  </div>

  <!-- Chat history: single card on the LEFT side -->
  {#if messages.length > 0}
    <div class="chat-card">
      {#each messages as msg}
        <ChatBubble message={msg} />
      {/each}
      {#if isThinking}
        <div class="thinking">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Chat input at the BOTTOM CENTER -->
  <ChatInput bind:visible={showInput} on:send={handleSend} />

  <!-- Device stats at the TOP RIGHT -->
  <DeviceStats />
{/if}

<style>
  .globe-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    cursor: pointer;
    z-index: 1;
  }

  .chat-card {
    position: fixed;
    top: 50%;
    left: 40px;
    transform: translateY(-50%);
    z-index: 50;
    width: 320px;
    max-height: 70vh;
    overflow-y: auto;
    background: rgba(10, 15, 30, 0.8);
    border: 1px solid rgba(68, 136, 255, 0.15);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(12px);
    box-shadow: 0 0 30px rgba(68, 136, 255, 0.08);
  }

  .chat-card :global(::-webkit-scrollbar) {
    width: 4px;
  }

  .chat-card :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  .chat-card :global(::-webkit-scrollbar-thumb) {
    background: rgba(68, 136, 255, 0.2);
    border-radius: 4px;
  }

  .chat-card :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(68, 136, 255, 0.4);
  }

  .thinking {
    display: flex;
    gap: 4px;
    padding: 8px 0;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: rgba(68, 136, 255, 0.5);
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1.2); }
  }
</style>
