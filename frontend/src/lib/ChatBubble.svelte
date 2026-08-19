<script lang="ts">
  import { marked } from 'marked';
  
  export type Message = {
    role: 'user' | 'assistant';
    text: string;
  };

  let { message }: { message: Message } = $props();

  // Sanitize and render markdown safely
  function renderMarkdown(text: string): string {
    try {
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      
      const html = marked.parse(text) as string;
      
      // Basic sanitization - remove script tags and event handlers
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/g, '');
    } catch {
      return text;
    }
  }

  function formatText(text: string): string {
    // Escape HTML entities for display
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
</script>

<div class="message {message.role}">
  <span class="role">{message.role === 'user' ? 'You' : 'Glob'}</span>
  {#if message.role === 'assistant'}
    <div class="text markdown-content" innerHTML={renderMarkdown(message.text)}></div>
  {:else}
    <div class="text plain-text">{formatText(message.text)}</div>
  {/if}
</div>

<style>
  .message {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(68, 136, 255, 0.08);
    animation: fadeIn 0.3s ease-out;
  }

  .message:last-child {
    border-bottom: none;
  }

  .role {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .message.user .role {
    color: rgba(68, 136, 255, 0.6);
  }

  .message.assistant .role {
    color: rgba(100, 180, 255, 0.5);
  }

  .text {
    font-size: 13px;
    line-height: 1.6;
    color: #c0d4ff;
    text-align: left;
    word-wrap: break-word;
  }

  /* Markdown styling */
  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3) {
    color: #e0e8ff;
    margin: 16px 0 8px 0;
    font-weight: 600;
  }

  .markdown-content :global(h1) { font-size: 20px; }
  .markdown-content :global(h2) { font-size: 17px; }
  .markdown-content :global(h3) { font-size: 15px; }

  .markdown-content :global(p) {
    margin: 8px 0;
  }

  .markdown-content :global(strong) {
    color: #e0e8ff;
    font-weight: 600;
  }

  .markdown-content :global(em) {
    font-style: italic;
    color: #a0b4dd;
  }

  .markdown-content :global(code) {
    background: rgba(68, 136, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    color: #88aaff;
  }

  .markdown-content :global(pre) {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(68, 136, 255, 0.2);
    border-radius: 8px;
    padding: 12px;
    margin: 12px 0;
    overflow-x: auto;
  }

  .markdown-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: 13px;
    line-height: 1.5;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }

  .markdown-content :global(li) {
    margin: 4px 0;
  }

  .markdown-content :global(blockquote) {
    border-left: 3px solid rgba(68, 136, 255, 0.4);
    padding-left: 12px;
    margin: 8px 0;
    color: #a0b4dd;
    font-style: italic;
  }

  .markdown-content :global(a) {
    color: #4488ff;
    text-decoration: underline;
  }

  .markdown-content :global(hr) {
    border: none;
    border-top: 1px solid rgba(68, 136, 255, 0.2);
    margin: 16px 0;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
