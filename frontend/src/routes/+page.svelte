<script lang="ts">
  import { browser } from '$app/environment';
  import NeuralGlobe from '$lib/glob/NeuralGlobe.svelte';
  import ChatInput from '$lib/ChatInput.svelte';
  import ChatBubble from '$lib/ChatBubble.svelte';
  import DeviceStats from '$lib/DeviceStats.svelte';
  import Settings from '$lib/Settings.svelte';
  import ConversationSidebar from '$lib/ConversationSidebar.svelte';
  import type { Message } from '$lib/ChatBubble.svelte';
  import * as db from '$lib/db';

  // State management for multi-conversation support
  let conversations: Array<{ id: string; title: string; messages: Message[] }> = $state([]);
  let activeConversationId: string | null = $state(null);
  let showInput = $state(false);
  let isThinking = $state(false);
  let isSpeaking = $state(false);
  let currentAudio: HTMLAudioElement | null = null;
  let selectedProvider = $state<string>('hermes');
  let systemPrompt = $state('');

  // Load conversations from IndexedDB on mount
  async function loadConversations() {
    if (!browser) return;
    
    try {
      const settings = JSON.parse(localStorage.getItem('globe-settings') || '{}');
      selectedProvider = settings.provider || 'hermes';
      systemPrompt = settings.systemPrompt || '';

      const stored = await db.getConversations();
      
      conversations = stored.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: conv.messages.map(m => ({ role: m.role as 'user' | 'assistant', text: m.content }))
      }));

      // Restore active conversation or create new one
      if (stored.length > 0) {
        activeConversationId = stored[0].id;
      } else {
        await createNewConversation();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      await createNewConversation();
    }
  }

  async function createNewConversation() {
    const id = crypto.randomUUID();
    const newConv = {
      id,
      title: 'New Conversation',
      messages: [] as Message[]
    };
    
    conversations = [newConv, ...conversations];
    activeConversationId = id;
    showInput = true;

    // Save to IndexedDB
    await db.saveConversation({
      id,
      title: newConv.title,
      messages: [],
      provider: selectedProvider,
      systemPrompt,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  async function selectConversation(id: string) {
    activeConversationId = id;
    
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      conversations = conversations.map(c => 
        c.id === id ? { ...c, messages: [...conv.messages] } : c
      );
    }

    // Load full conversation from IndexedDB
    try {
      const stored = await db.getConversation(id);
      if (stored) {
        conversations = conversations.map(c => 
          c.id === id ? { ...c, messages: stored.messages.map(m => ({ role: m.role as 'user' | 'assistant', text: m.content })) } : c
        );
      }
    } catch {}

    showInput = true;
  }

  async function deleteConversation(id: string) {
    conversations = conversations.filter(c => c.id !== id);
    
    if (activeConversationId === id) {
      activeConversationId = null;
      
      if (conversations.length > 0) {
        await selectConversation(conversations[0].id);
      } else {
        await createNewConversation();
      }
    }

    // Delete from IndexedDB
    try {
      await db.deleteConversation(id);
    } catch {}
  }

  async function saveCurrentConversation() {
    if (!activeConversationId) return;

    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) return;

    // Auto-generate title from first user message
    let title = conv.title;
    if (conv.messages.length > 0 && !title.startsWith('New Conversation')) {
      const firstUserMsg = conv.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        title = firstUserMsg.text.substring(0, 50);
      }
    }

    try {
      await db.saveConversation({
        id: activeConversationId,
        title,
        messages: conv.messages.map(m => ({ role: m.role, content: m.text })),
        provider: selectedProvider,
        systemPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Update local state with new title if changed
      conversations = conversations.map(c => 
        c.id === activeConversationId ? { ...c, title } : c
      );
    } catch (err) {
      console.error('Failed to save conversation:', err);
    }
  }

  function handleGlobeClick() {
    if (!activeConversationId) {
      createNewConversation();
    } else {
      showInput = true;
    }
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
    
    if (!activeConversationId) return;

    // Add user message to current conversation
    conversations = conversations.map(c => 
      c.id === activeConversationId 
        ? { ...c, messages: [...c.messages, { role: 'user', text }] }
        : c
    );

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
        headers: { 
          'Content-Type': 'application/json',
          'X-Provider': selectedProvider,
          'X-System-Prompt': systemPrompt || ''
        },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      // Add empty assistant message for streaming
      conversations = conversations.map(c => 
        c.id === activeConversationId 
          ? { ...c, messages: [...c.messages, { role: 'assistant', text: '' }] }
          : c
      );

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
                
                // Update streaming message in real-time
                conversations = conversations.map(c => 
                  c.id === activeConversationId 
                    ? { 
                        ...c, 
                        messages: c.messages.map((m, idx) => 
                          idx === c.messages.length - 1 && m.role === 'assistant'
                            ? { role: 'assistant', text: assistantText }
                            : m
                        )
                      }
                    : c
                );
              }
            } catch { /* skip */ }
          }
        }
      }

      // Speak with Piper TTS after streaming completes
      if (assistantText) {
        speak(assistantText);
      }

      // Save conversation after completion
      await saveCurrentConversation();
    } catch (err) {
      console.error('Chat error:', err);
      
      conversations = conversations.map(c => 
        c.id === activeConversationId 
          ? { 
              ...c, 
              messages: [...c.messages.slice(0, -1), {
                role: 'assistant',
                text: `⚠️ Cannot connect to ${selectedProvider}. Check settings.`
              }]
            }
          : c
      );
    } finally {
      isThinking = false;
    }
  }

  function handleProviderChange(providerId: string) {
    selectedProvider = providerId;
    
    // Update current conversation's provider setting
    if (activeConversationId) {
      conversations = conversations.map(c => 
        c.id === activeConversationId ? { ...c, id: c.id } : c
      );
    }

    // Save to IndexedDB
    saveCurrentConversation();
  }

  function handleVoiceInput(text: string) {
    console.log('Voice input received:', text);
  }

  // Initialize on mount
  if (browser) {
    loadConversations();
  }
</script>

<svelte:head>
  <title>Glob Interface</title>
  <meta name="description" content="Neural Electric Globe — AI Interface" />
</svelte:head>

{#if browser}
  <!-- Conversation Sidebar -->
  {#if conversations.length > 0}
    <ConversationSidebar 
      {conversations}
      activeId={activeConversationId}
      onSelect={selectConversation}
      onNew={createNewConversation}
      onDelete={deleteConversation}
    />
  {/if}

  <!-- Globe centered -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="globe-wrapper" onclick={handleGlobeClick}>
    <NeuralGlobe {isSpeaking} {isThinking} />
  </div>

  <!-- Chat history: single card on the LEFT side -->
  {#if activeConversationId && conversations.length > 0}
    {#each conversations as conv (conv.id)}
      {#if conv.id === activeConversationId && conv.messages.length > 0}
        <div class="chat-card">
          {#each conv.messages as msg}
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
    {/each}
  {/if}

  <!-- Chat input at the BOTTOM CENTER -->
  {#if activeConversationId && showInput}
    <ChatInput 
      bind:visible={showInput} 
      on:send={handleSend}
      onVoice={handleVoiceInput}
    />
  {/if}

  <!-- Device stats at the TOP RIGHT -->
  <DeviceStats />

  <!-- Settings button at bottom right -->
  <Settings 
    initialProvider={selectedProvider} 
    on:change={handleProviderChange} 
  />
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
    left: calc(280px + 40px);
    transform: translateY(-50%);
    z-index: 50;
    width: min(320px, calc(100vw - 360px));
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
