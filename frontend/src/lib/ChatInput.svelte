<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  let { visible = $bindable(false) }: { visible?: boolean } = $props();

  const dispatch = createEventDispatcher<{ send: string }>();

  let input = $state('');
  let inputEl: HTMLInputElement;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && input.trim()) {
      dispatch('send', input.trim());
      input = '';
    }
    if (e.key === 'Escape') {
      visible = false;
      input = '';
    }
  }

  function handleSend() {
    if (input.trim()) {
      dispatch('send', input.trim());
      input = '';
    }
  }

  function handleBackdropClick() {
    visible = false;
    input = '';
  }

  $effect(() => {
    if (visible && inputEl) {
      inputEl.focus();
    }
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="backdrop" onclick={handleBackdropClick}></div>
  <div class="chat-input-container">
    <div class="chat-input-wrapper">
      <input
        bind:this={inputEl}
        bind:value={input}
        onkeydown={handleKeydown}
        type="text"
        placeholder="Ask the glob something..."
        class="chat-input"
      />
      <button class="send-btn" onclick={handleSend} disabled={!input.trim()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99;
  }

  .chat-input-container {
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    width: 380px;
    animation: slideUp 0.2s ease-out;
  }

  .chat-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(10, 15, 30, 0.85);
    border: 1px solid rgba(68, 136, 255, 0.3);
    border-radius: 16px;
    padding: 6px 8px 6px 16px;
    backdrop-filter: blur(12px);
    box-shadow:
      0 0 20px rgba(68, 136, 255, 0.15),
      inset 0 0 20px rgba(68, 136, 255, 0.05);
  }

  .chat-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e0e8ff;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: 0.3px;
  }

  .chat-input::placeholder {
    color: rgba(136, 170, 255, 0.4);
  }

  .send-btn {
    background: rgba(68, 136, 255, 0.15);
    border: 1px solid rgba(68, 136, 255, 0.3);
    border-radius: 10px;
    padding: 8px;
    cursor: pointer;
    color: #4488ff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .send-btn:hover:not(:disabled) {
    background: rgba(68, 136, 255, 0.3);
    border-color: rgba(68, 136, 255, 0.6);
    box-shadow: 0 0 12px rgba(68, 136, 255, 0.3);
  }

  .send-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
</style>
