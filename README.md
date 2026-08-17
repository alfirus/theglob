# 🌐 The Glob

A living neural electric globe — a visual AI interface with voice interaction.

Not a solid orb. A network of glowing neuron nodes, electric connections, and traveling sparks shaped into a sphere. The glob IS the agent.

## What Is This?

The Glob Interface is a locally-hosted, visually reactive **neural electric globe** that acts as a physical embodiment of an AI agent. It floats on your desktop as a transparent window — no chrome, no borders, just a living orb of electricity.

**The brain is [Hermes Agent](https://hermes-agent.nousresearch.com/)** — not a raw LLM. The glob inherits all of Hermes' capabilities: skills, memory, sessions, tools, and the full MCP ecosystem. [LM Studio](https://lmstudio.ai/) runs the LLM inference locally.

## ✨ Features

- **Neural Electric Visual** — 300+ nodes, dynamic connections, traveling sparks
- **Transparent Desktop Window** — floats on your wallpaper (Electron)
- **Voice Interaction** — speak to it, it speaks back
- **Hermes Agent Brain** — skills, memory, tools, sessions
- **Color-Shifting** — changes based on mood/context
- **Always Alive** — breathing, sparking, evolving even when idle

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  Electron (transparent window)   │
│  └── SvelteKit + Three.js        │
│      └── Neural Globe (GLSL)     │
└──────────────┬──────────────────┘
               │ WebSocket
┌──────────────┴──────────────────┐
│  Bridge Server (Node.js :8742)   │
│  └── CORS proxy + audio relay    │
└──────────────┬──────────────────┘
               │ HTTP SSE
┌──────────────┴──────────────────┐
│  Hermes Agent API Server :8642   │
│  └── LM Studio :1234             │
└─────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/alfirus/theglob.git
cd theglob/frontend

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🎨 Visual Design

The glob is **not a solid sphere**. It looks like electric neurons in a glob form:

- **Nodes** — Sharp bright points (Fibonacci sphere distribution)
- **Connections** — Dynamic lines between nearby nodes (form/dissolve)
- **Sparks** — Bright pulses traveling along connections
- **Core** — Central glow with heartbeat rhythm
- **Ambient** — Floating particles for depth

### Color States

| State | Color |
|-------|-------|
| Idle | Soft electric blue |
| Listening | Blue brightens + white sparks |
| Thinking | Deep blue → purple |
| Speaking | Warm amber/gold |
| Error | Red flash |

## 📁 Project Structure

```
theglob/
├── frontend/                # SvelteKit + Three.js
│   └── src/lib/glob/
│       ├── NeuralGlobe.svelte  # Main scene
│       ├── nodes.ts            # Node cloud
│       ├── connections.ts      # Dynamic lines
│       ├── sparks.ts           # Action potentials
│       ├── core.ts             # Central glow
│       ├── ambient.ts          # Floating particles
│       └── shaders/            # GLSL shaders
├── bridge/                  # WebSocket bridge (Phase 2)
├── BLUEPRINT.md             # Full architecture spec
├── WORKFLOW.md              # Agent workflow (Sofia/Shiela/Maisarah)
└── README.md
```

## 🛠️ Tech Stack

- **Window:** Electron (transparent, frameless, always-on-top)
- **Frontend:** SvelteKit + Vite
- **3D:** Three.js + GLSL shaders
- **Post-processing:** UnrealBloomPass
- **Audio:** Web Audio API
- **Brain:** Hermes Agent API Server
- **LLM:** LM Studio (localhost:1234)
- **TTS:** Edge TTS (free)
- **STT:** Web Speech API

## 📅 Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Static Neural Globe | ✅ Done | Three.js scene, nodes, connections, idle animation |
| 2. Text Chat | 🔲 TODO | Bridge + Hermes API, text input, streaming |
| 3. Voice Input | 🔲 TODO | Web Speech API, microphone |
| 4. Voice Output | 🔲 TODO | Edge TTS, audio-reactive animation |
| 5. Polish | 🔲 TODO | Emotion mapping, particles, error states |
| 6. Electron | 🔲 TODO | Transparent window, desktop pet |
| 7. Advanced | 🔲 TODO | Wake word, multi-language, AI City integration |

## 🤖 Agent Workflow

- **Sofia** — Plans architecture, evaluates reviews
- **Shiela** — Implements code
- **Maisarah** — Reviews, finds bugs/gaps

See [WORKFLOW.md](WORKFLOW.md) for details.

## 📄 Documentation

- [BLUEPRINT.md](BLUEPRINT.md) — Full architecture spec
- [WORKFLOW.md](WORKFLOW.md) — Agent workflow
- [Hermes Agent Docs](https://hermes-agent.nousresearch.com/docs) — Hermes documentation

## License

MIT
