<script lang="ts">
  import { browser } from '$app/environment';
  import NeuralGlobe from '$lib/glob/NeuralGlobe.svelte';
</script>

<svelte:head>
  <title>Glob Interface</title>
  <meta name="description" content="Neural Electric Globe — AI Interface" />
</svelte:head>

{#if browser}
  <NeuralGlobe />
{/if}
