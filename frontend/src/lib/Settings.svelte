<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export type Provider = 
    | 'hermes'
    | 'lmstudio'
    | 'opencode'
    | 'openrouter'
    | 'deepseek'
    | 'openclaw';

  interface ProviderConfig {
    id: Provider;
    name: string;
    icon: string;
    baseUrl: string;
    apiKey: string;
    model: string;
  }

  const dispatch = createEventDispatcher<{ change: Provider }>();

  let open = $state(false);
  let { initialProvider = 'hermes' }: { initialProvider?: Provider } = $props();
  let selectedProvider = $state<Provider>(initialProvider as Provider);

  // Load from localStorage on init
  try {
    const saved = JSON.parse(localStorage.getItem('globe-settings') || '{}');
    if (saved.provider) selectedProvider = saved.provider;
  } catch {}

  const providers: Record<Provider, ProviderConfig> = {
    hermes: {
      id: 'hermes',
      name: 'Hermes Agent AI Platform',
      icon: '🤖',
      baseUrl: '',
      apiKey: '',
      model: 'hermes-agent'
    },
    lmstudio: {
      id: 'lmstudio',
      name: 'LM Studio (Local)',
      icon: '💻',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: ''
    },
    opencode: {
      id: 'opencode',
      name: 'OpenCode Zen and Go',
      icon: '🔮',
      baseUrl: 'http://localhost:8765/v1',
      apiKey: '',
      model: ''
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: '🌐',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      model: ''
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      icon: '🔵',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat'
    },
    openclaw: {
      id: 'openclaw',
      name: 'OpenClaw AI Platform',
      icon: '🦞',
      baseUrl: '',
      apiKey: '',
      model: ''
    }
  };

  async function handleSelect(providerId: Provider) {
    selectedProvider = providerId;
    dispatch('change', providerId);
    
    // Save to localStorage and server API
    try {
      const settings = JSON.parse(localStorage.getItem('globe-settings') || '{}');
      settings.provider = providerId;
      localStorage.setItem('globe-settings', JSON.stringify(settings));
      
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch {}
  }

  function toggle() {
    open = !open;
  }
</script>

<!-- Settings Button (bottom right) -->
<button class="settings-btn" onclick={toggle} title="Settings">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
</button>

<!-- Settings Modal -->
{#if open}
  <div class="backdrop" onclick={toggle}></div>
  <div class="settings-modal">
    <div class="modal-header">
      <h2>⚙️ LLM Provider Settings</h2>
      <button class="close-btn" onclick={toggle}>×</button>
    </div>

    <div class="provider-list">
      {#each Object.values(providers) as provider}
        <button
          class="provider-card {selectedProvider === provider.id ? 'active' : ''}"
          onclick={() => handleSelect(provider.id)}
        >
          <span class="provider-icon">{provider.icon}</span>
          <div class="provider-info">
            <span class="provider-name">{provider.name}</span>
            {#if selectedProvider === provider.id}
              <span class="selected-badge">✓ Active</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    <!-- Provider Configuration -->
    {#if providers[selectedProvider]}
      <div class="config-section">
        <h3>Configure: {providers[selectedProvider].name}</h3>
        
        <div class="form-group">
          <label>Base URL</label>
          <input 
            type="text" 
            bind:value={providers[selectedProvider].baseUrl}
            placeholder="e.g., http://localhost:1234/v1"
            on:change={() => {
              try {
                const settings = JSON.parse(localStorage.getItem('globe-settings') || '{}');
                settings.configs = settings.configs || {};
                settings.configs[selectedProvider] = providers[selectedProvider];
                localStorage.setItem('globe-settings', JSON.stringify(settings));
              } catch {}
            }}
          />
        </div>

        <div class="form-group">
          <label>API Key (optional)</label>
          <input 
            type="password" 
            bind:value={providers[selectedProvider].apiKey}
            placeholder="sk-..."
            on:change={() => {
              try {
                const settings = JSON.parse(localStorage.getItem('globe-settings') || '{}');
                settings.configs = settings.configs || {};
                settings.configs[selectedProvider] = providers[selectedProvider];
                localStorage.setItem('globe-settings', JSON.stringify(settings));
              } catch {}
            }}
          />
        </div>

        <div class="form-group">
          <label>Model</label>
          <input 
            type="text" 
            bind:value={providers[selectedProvider].model}
            placeholder="e.g., qwen3.6-35b-a3b"
            on:change={() => {
              try {
                const settings = JSON.parse(localStorage.getItem('globe-settings') || '{}');
                settings.configs = settings.configs || {};
                settings.configs[selectedProvider] = providers[selectedProvider];
                localStorage.setItem('globe-settings', JSON.stringify(settings));
              } catch {}
            }}
          />
        </div>

        <button class="save-btn" onclick={toggle}>Save & Close</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .settings-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(10, 15, 30, 0.8);
    border: 1px solid rgba(68, 136, 255, 0.3);
    color: #4488ff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 90;
    transition: all 0.2s ease;
    backdrop-filter: blur(12px);
  }

  .settings-btn:hover {
    background: rgba(68, 136, 255, 0.3);
    border-color: rgba(68, 136, 255, 0.6);
    box-shadow: 0 0 20px rgba(68, 136, 255, 0.4);
    transform: rotate(90deg);
  }

  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    z-index: 95;
  }

  .settings-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(600px, 90vw);
    max-height: 80vh;
    background: rgba(10, 15, 30, 0.95);
    border: 1px solid rgba(68, 136, 255, 0.3);
    border-radius: 16px;
    z-index: 96;
    overflow-y: auto;
    backdrop-filter: blur(20px);
    box-shadow: 0 0 40px rgba(68, 136, 255, 0.2);
    animation: modalIn 0.2s ease-out;
  }

  @keyframes modalIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(68, 136, 255, 0.2);
  }

  .modal-header h2 {
    font-size: 18px;
    color: #e0e8ff;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #4488ff;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(68, 136, 255, 0.2);
  }

  .provider-list {
    padding: 16px 20px;
    display: grid;
    gap: 8px;
  }

  .provider-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(68, 136, 255, 0.05);
    border: 1px solid rgba(68, 136, 255, 0.15);
    border-radius: 12px;
    color: #e0e8ff;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .provider-card:hover {
    background: rgba(68, 136, 255, 0.1);
    border-color: rgba(68, 136, 255, 0.4);
  }

  .provider-card.active {
    background: rgba(68, 136, 255, 0.2);
    border-color: #4488ff;
    box-shadow: 0 0 15px rgba(68, 136, 255, 0.3);
  }

  .provider-icon {
    font-size: 24px;
  }

  .provider-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .provider-name {
    font-weight: 600;
    color: #e0e8ff;
  }

  .selected-badge {
    font-size: 12px;
    color: #4ade80;
    font-weight: 500;
  }

  .config-section {
    padding: 20px;
    border-top: 1px solid rgba(68, 136, 255, 0.2);
  }

  .config-section h3 {
    font-size: 16px;
    color: #e0e8ff;
    margin-bottom: 16px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    color: #8899bb;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .form-group input {
    width: 100%;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(68, 136, 255, 0.3);
    border-radius: 8px;
    color: #e0e8ff;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
  }

  .form-group input:focus {
    border-color: #4488ff;
    box-shadow: 0 0 10px rgba(68, 136, 255, 0.3);
  }

  .form-group input::placeholder {
    color: rgba(136, 170, 255, 0.4);
  }

  .save-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #4488ff, #2266dd);
    border: none;
    border-radius: 10px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .save-btn:hover {
    background: linear-gradient(135deg, #5599ff, #3377ee);
    box-shadow: 0 0 20px rgba(68, 136, 255, 0.4);
  }

  .settings-modal::-webkit-scrollbar {
    width: 6px;
  }

  .settings-modal::-webkit-scrollbar-track {
    background: transparent;
  }

  .settings-modal::-webkit-scrollbar-thumb {
    background: rgba(68, 136, 255, 0.3);
    border-radius: 3px;
  }
</style>
