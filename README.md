<div align="center">

# 🤖 Synapse AI — AI-Powered Customer Support Agent

**A context-aware, multi-turn AI support agent that resolves customer issues autonomously
over a product knowledge base — and escalates the rest to a human with full context.**

Built for the **"FoodAssist AI"** food-delivery demo, with RAG, a tool-using agent,
multi-provider LLM rotation, an immersive 3D chat UI, and a holographic admin console.

`RAG + Agents` · Assignment #1

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Keys](#-api-keys)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [API Reference](#-api-reference)
- [Demo Script](#-demo-script)
- [Configuration & Tuning](#-configuration--tuning)
- [Verification](#-verification)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

Support teams spend most of their time answering the same handful of questions. **Synapse AI**
triages incoming requests, resolves common issues autonomously using **RAG** (Retrieval-Augmented
Generation) over a knowledge base, and escalates edge cases to a human queue with a **complete
handoff summary** — so the human agent never has to re-read the thread.

The defining engineering challenge is **reliability on free API tiers**: the agent rotates across
**four LLM providers** (Gemini, Groq, OpenRouter, NVIDIA NIM) with automatic failover, so
rate limits and token budgets never interrupt a conversation.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **RAG Knowledge Base** | Ingest **PDF, Markdown, and URLs**. Content is chunked, embedded (Gemini), stored as vectors in SQLite, and retrieved by cosine similarity. New content is queryable within **seconds** — no re-index. |
| 💬 **Multi-Turn Memory** | Full conversation context per session. Follow-up questions resolve references ("it", "that", "those") against earlier turns. |
| 🛠️ **Tool-Using Agent** | A reasoning loop with 4 tools — `knowledge_base_search`, `check_order_status`, `create_ticket`, `escalate_to_human` — driven by a universal JSON protocol that works on **any** model (native function-calling not required). |
| 🎚️ **Confidence & Escalation** | `confidence = 0.5·retrieval + 0.5·LLM self-assessment`. Low confidence or out-of-scope queries escalate to a human queue with a **structured handoff summary** (issue, summary, sources, attempted answer, suggested next steps). |
| 🔄 **Multi-Provider Rotation** | Round-robin among preferred providers + **429/5xx failover** + exponential cooldown + per-provider rate windows. Adding an OpenAI-compatible provider is **one config row**. |
| 🎨 **Immersive 3D Chat UI** | Streaming SSE responses, typing indicators, timestamps, a living **GLSL AI Core orb** that animates through 6 states, citations, an AI-vs-human state badge, and drag-to-interact 3D. |
| 📊 **Admin Analytics Console** | Floating 3D metric islands, a topic network graph, an escalation heatmap, query-volume wave, top unanswered questions, and live provider-rotation health. |
| 👍 **Feedback Loop** | 👍/👎 per answer (negatives queue for KB review) **plus** a 1–5★ satisfaction prompt. Both surface in the admin Feedback Review page. |

---

## 🏗️ Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│   CLIENT  (Vite + React)    │  HTTP   │        SERVER  (Express + TS)        │
│                             │ ──────► │                                      │
│  • Landing (3D hero)        │  /api   │  Routes ─ chat (SSE) · ingest · kb   │
│  • Chat (streaming SSE)     │ ◄────── │           feedback · escalations     │
│  • Admin (3D analytics)     │  SSE    │           analytics                  │
│  • R3F / GLSL orb · Zustand │         │                                      │
└─────────────────────────────┘         │  Agent loop ── tools · confidence    │
                                         │  RAG ── ingest · chunk · embed       │
                                         │  Providers ── rotation · failover    │
                                         │                                      │
                                         │         ▼                            │
                                         │   SQLite (better-sqlite3)            │
                                         │   data + Float32 vector BLOBs        │
                                         └──────────────────────────────────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────────┐
                          ▼            ▼                ▼              ▼
                       Gemini        Groq          OpenRouter      NVIDIA NIM
                    (embeddings    (chat #1)        (chat #3)       (chat #2)
                     + chat last)
```

**Two npm-workspace apps** — `server/` (Express API + all AI/RAG/data logic) and `client/`
(Vite React SPA) — run together with a single `npm run dev`.

---

## 🧱 Tech Stack

**Frontend**
- **Vite 6** + **React 18** + **TypeScript**
- **React Three Fiber** (`three` 0.171) + **drei** + **postprocessing** (bloom) — custom **GLSL** shaders
- **Framer Motion** (transitions) · **Zustand** (state) · **Tailwind CSS**

**Backend**
- **Express 4** + **TypeScript** (run via `tsx`)
- **better-sqlite3** — relational data **and** vector storage (Float32 BLOBs)
- **@google/genai** — Gemini embeddings + chat · **openai** SDK — Groq / OpenRouter / NVIDIA (via `baseURL`)
- **pdf-parse** + **pdf-lib** (PDF) · **@mozilla/readability** + **jsdom** (URL) · **zod** (validation)

---

## 🚀 Quick Start

> **Prerequisites:** Node.js **≥ 20** (built & tested on Node 22). A free **Gemini API key** is required.

```bash
# 1. Install all workspaces
npm install

# 2. Configure API keys (copy the template, then edit .env)
cp .env.example .env          # add at least GEMINI_API_KEY

# 3. Create the database schema
npm run migrate

# 4. Seed the FoodAssist AI knowledge base (embeds via Gemini)
npm run seed

# 5. Run server + client together
npm run dev
```

Then open the Vite URL (default **http://localhost:5173**).

> 💡 **Shortcut:** after editing `.env`, run `npm run setup` to install + migrate + seed in one step.

| Command | What it does |
|---|---|
| `npm run dev` | Start Express + Vite together (hot reload) |
| `npm run migrate` | Create / update the SQLite schema |
| `npm run seed` | (Re)build the knowledge base from `data/seed/` |
| `npm run verify` | Run the demo test set and assert success metrics |
| `npm run build` | Production build of the client |

---

## 🔑 API Keys

Set keys in **`.env`** (gitignored). **At minimum `GEMINI_API_KEY`** — it powers embeddings *and*
serves as a fallback chat provider. **More keys = more rotation headroom = fewer rate-limit stalls.**

| Provider | Get a free key | Env var | Role |
|---|---|---|---|
| **Google Gemini** *(required)* | https://aistudio.google.com/apikey | `GEMINI_API_KEY` | Embeddings + chat (deprioritized) |
| **Groq** | https://console.groq.com/keys | `GROQ_API_KEY` | Primary chat |
| **NVIDIA NIM** | https://build.nvidia.com | `NVIDIA_API_KEY` | Chat failover |
| **OpenRouter** (incl. Kimi) | https://openrouter.ai/keys | `OPENROUTER_API_KEY` | Chat failover |

> ⚠️ Never commit `.env`. It is already in `.gitignore` — verify with `git check-ignore .env`.

---

## 📁 Project Structure

```
AI-powered-Customer-Support/
├─ package.json                  # npm workspaces + dev scripts
├─ .env / .env.example           # API keys (server reads)
├─ data/
│  ├─ app.db                     # SQLite (generated, gitignored)
│  └─ seed/                      # source-of-truth KB → docs, FAQs, tickets, orders
│
├─ server/
│  ├─ scripts/                   # migrate · seed · verify
│  └─ src/
│     ├─ index.ts                # Express app + route mounting
│     ├─ routes/                 # chat (SSE) · conversations · ingest · kb · feedback · escalations · analytics
│     ├─ db/                     # schema.sql · client · repositories
│     ├─ providers/              # rotation engine · Gemini + OpenAI-compatible adapters
│     ├─ embeddings/             # Gemini embeddings
│     ├─ rag/                    # ingest · chunk · store · retrieve
│     ├─ agent/                  # loop · tools · confidence · prompts
│     └─ analytics/ · util/      # event tracking · SSE/token/cosine helpers
│
└─ client/
   └─ src/
      ├─ pages/                  # Landing · Chat · Admin (+ Kb / Escalations / Feedback)
      ├─ three/                  # R3F scenes — AICore (GLSL orb) · HeroScene · OrbAvatar
      ├─ components/{chat,admin,ui}/
      ├─ store/                  # Zustand (chat + UI state)
      ├─ api/                    # fetch wrappers + SSE reader
      └─ styles/                 # design tokens + globals
```

---

## ⚙️ How It Works

### RAG pipeline
1. **Ingest** — PDF (`pdf-parse`), Markdown, or URL (`@mozilla/readability` + plain-text fallback) → clean text.
2. **Chunk** — structure-aware split into ~180-token sections with overlap.
3. **Embed** — Gemini `gemini-embedding-001` (768-dim) → stored as `Float32` BLOBs in `kb_chunks`.
4. **Retrieve** — embed the query, brute-force cosine over all chunks, return top-k + max score.

### Agent loop
Loads conversation history → pre-retrieves KB context → reasons over ≤4 iterations, calling tools
via a **universal JSON protocol** (`{"tool": ...}` or `{"final": ..., "confidence": ...}`) →
computes confidence → **answers** (streamed token-by-token) or **escalates** with a structured
handoff summary.

### Provider rotation (the reliability core)
`callWithFailover()` picks the **highest-priority eligible provider** (round-robin among equals),
calls it, and on **429/5xx** sets an exponential cooldown and **immediately fails over** to the
next — so a rate-limited provider never breaks a conversation. Gemini is deprioritized for chat to
preserve its free quota for embeddings.

---

## 🌐 API Reference

All endpoints are mounted under `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/conversations` | Create a conversation |
| `GET` | `/conversations` · `/conversations/:id` | List / fetch a conversation + messages |
| `POST` | `/conversations/:id/takeover` | Human take over / release / resolve |
| `POST` | `/chat` | **SSE** — run one agent turn (streams state, tokens, sources, final/escalated) |
| `POST` | `/ingest` | Ingest a PDF (multipart), or `{type:"markdown"\|"url", ...}` |
| `GET` · `DELETE` | `/kb` · `/kb/:id` | List / delete knowledge base documents |
| `POST` | `/feedback` | 👍/👎 on a message |
| `POST` · `GET` | `/feedback/satisfaction` | Submit / list 1–5★ satisfaction |
| `GET` · `PATCH` | `/escalations` · `/escalations/:id` | Human handoff queue |
| `GET` | `/admin/analytics` | Dashboard aggregates + provider health |

---

## 🎬 Demo Script

1. **Resolve (≥70%)** — Ask in-scope questions: *"My order is late, what should I do?"*,
   *"How do I report a missing item?"*, *"How much is FoodAssist Plus?"* → answered from the KB with
   citations + confidence, no escalation.
2. **Multi-turn** — *"How do refunds work?"* then *"How long does it take to my card?"* → resolves
   against the earlier turn.
3. **Tool use** — *"What's the status of order FA-1002?"* → the agent calls `check_order_status`.
4. **Escalate** — *"What's the weather in Tokyo?"* → escalates; the handoff capsule animates; it
   appears in **Admin → Escalations**. Click **Take over** → the chat badge flips to *"Connected to
   human agent"*.
5. **Feedback** — 👎 an answer (queued for review) and submit the **★ satisfaction** prompt → both
   appear in **Admin → Feedback**.
6. **60s freshness** — In **Admin → Knowledge Base**, add a Markdown note with a new fact, then ask
   about it in chat within a minute.
7. **Rotation** — Watch **Admin → Provider Rotation** while chatting; failover is automatic.
8. **Analytics** — **Admin → Overview** reflects live volume, resolution rate, escalation-by-topic,
   and top unanswered questions from the session.

---

## 🔧 Configuration & Tuning

Tunable in `.env` (sensible defaults baked in):

| Variable | Default | Effect |
|---|---|---|
| `ESCALATE_THRESHOLD` | `0.45` | Lower → resolve more aggressively; raise → escalate sooner |
| `RETRIEVAL_FLOOR` | `0.55` | Min retrieval score before a query is "out of scope" |
| `MAX_AGENT_ITERATIONS` | `4` | Max tool-use reasoning steps per turn |
| `GEMINI_EMBED_MODEL` / `GEMINI_EMBED_DIM` | `gemini-embedding-001` / `768` | Embedding model + dimensions |
| `*_MODEL` | per provider | Override the model per provider |

---

## ✅ Verification

```bash
npm run verify
```

Runs the demo test set (8 in-scope + 3 out-of-scope) through the live agent and asserts the
assignment's success metrics:

```
Resolution rate (in-scope):  100%  (8/8)   — target ≥70%   ✓
Out-of-scope escalated:       3/3           — target 100%   ✓
Providers used in rotation:   groq, nvidia
✓ PASS — meets success metrics
```

---

## 🩹 Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `gemini failed (status 429)` in logs | **Not an error** — a provider hit its rate limit and the rotation **failed over** automatically. The user still gets an answer. |
| URL ingest → `422` | The page loads content via JavaScript (no server-rendered text). Use a plain article/help page, or paste the text via the **Markdown** tab. |
| `Too many active WebGL contexts` | Restart `npm run dev` (StrictMode is disabled; scenes are guarded by `SafeCanvas`). |
| `npm run seed` fails | `GEMINI_API_KEY` is missing or invalid — seeding needs it to embed the KB. |
| Empty admin metrics | Expected on a fresh DB — they populate live as you chat (refresh every ~8s). |

---

<div align="center">

Built with RAG, multi-provider agents, and React Three Fiber.

</div>
