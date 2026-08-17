<script lang="ts">
  export type Message = {
    role: 'user' | 'assistant';
    text: string;
  };

  let { message }: { message: Message } = $props();
</script>

<div class="message {message.role}">
  <span class="role">{message.role === 'user' ? 'You' : 'Glob'}</span>
  <span class="text">{message.text}</span>
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
    line-height: 1.5;
    color: #c0d4ff;
    text-align: left;
    word-wrap: break-word;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
