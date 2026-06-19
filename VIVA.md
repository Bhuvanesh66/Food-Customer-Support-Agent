# 🎤 Viva Preparation — FoodAssist AI Customer Support Agent

> Everyone on the team should read this and be able to explain the **why**, not just the **how**.
> Live demo: **https://food-customer-support-agent.onrender.com**
> Repo: **https://github.com/Bhuvanesh66/Food-Customer-Support-Agent**

---

## 1. Group Project Discussion

### Q: What did you build?

We built **FoodAssist AI**, an AI-powered Tier-1 customer support agent for a food-delivery
platform. It's a **multi-turn, context-aware support agent** that:

- **Resolves common issues autonomously** using **RAG** (Retrieval-Augmented Generation) over a
  product knowledge base — order help, refunds, delivery, payments, account, restaurants.
- **Looks up a specific customer's order** by ID (e.g. FA-1003) via a tool, then explains the exact
  resolution for *that* order.
- **Escalates** edge cases to a human queue with a **complete structured handoff summary**, so the
  human agent never re-reads the thread.
- Ships with a **live chat UI** (typing indicators, timestamps, AI-vs-human state), an **admin
  analytics dashboard**, and a **feedback loop**.

On top of the brief, we added 5 standout features: **voice support, image/vision complaint
detection, emotion-aware escalation, an AI copilot for human agents, and a self-learning knowledge
base** (details in §"differentiators").

**Architecture in one line:** a **Vite + React** frontend (immersive 3D UI) talking to an
**Express + SQLite** backend that does RAG, a tool-using agent loop, and a **4-provider LLM rotation
with failover**.

---

### Q: What problem does it solve?

Support teams spend **60–80% of their time answering the same ~20 questions** ("where's my order?",
"how do refunds work?", "my food was cold"). That's expensive, slow, and repetitive.

Our agent:
1. **Triages** every incoming request,
2. **Resolves** the common ones instantly and correctly (grounded in the knowledge base, not made
   up),
3. **Escalates** only the genuinely hard cases — with full context — so humans spend their time
   where they add value.

The result: faster responses for customers, lower cost per ticket, and human agents freed from
repetitive Tier-1 work.

---

### Q: Who are your competitors?

The commercial AI-support landscape (2026):

| Competitor | What they are |
|---|---|
| **Intercom Fin** | AI agent + agent copilot for support teams |
| **Zendesk AI** | AI resolution + "resolution learning loop" |
| **Decagon / Sierra** | Enterprise conversational AI support agents |
| **Forethought** | AI support with "Discover" (KB-gap detection) |
| **Salesforce Agentforce** | Agentic support with self-evaluation |
| **Ada / Forethought** | Automation-first support bots |

Student-team competitors typically build a **plain RAG chatbot** — text-only, single LLM, no
escalation logic, no analytics.

---

### Q: What features do competitors have?

The strong commercial ones offer: RAG over docs, multi-turn memory, **agentic actions** (look up an
order, issue a refund), **human handoff with context**, **agent-assist / copilot**, **sentiment-
aware routing**, **self-improving knowledge bases**, analytics dashboards, and increasingly
**multimodal** (voice, images) and **multilingual** support.

---

### Q: What does YOUR project have that competitors (especially other student teams) do not?

We match the core of the commercial systems **and** add five differentiators — all running on
**free API tiers, no extra signups**:

1. **🔄 Multi-Provider LLM Rotation with Failover** — we rotate across **Groq → NVIDIA → OpenRouter
   → Gemini** with 429/5xx detection, exponential cooldowns, and automatic failover. This gives us
   *paid-tier reliability from free tiers*. Most student teams use one API key and break when it
   rate-limits. **This resilience layer is itself a differentiator** and our core engineering.

2. **📷 Image/Vision Complaint Detection** — attach a photo of a food problem (burnt pizza, spilled
   drink); **Gemini multimodal** assesses it and drafts a complaint + resolution. Truly multimodal,
   not a text-only bot.

3. **🎙️ Voice-First Support** — speak your issue (Speech-to-Text) and hear the reply
   (Text-to-Speech), with a typed fallback.

4. **😟 Emotion- & Urgency-Aware Escalation** — we escalate on **sentiment**, not just retrieval
   confidence. An angry or time-critical customer is handed to a human **earlier**, with an
   empathetic tone. (Demo: type an angry message → instant empathetic escalation.)

5. **🧑‍💼 AI Copilot for Human Agents + 🔁 Self-Learning KB** — on handoff, the human gets the
   structured summary **plus AI-suggested replies**. And every unanswered question becomes a **KB
   gap** the admin can fill with a one-click **AI-drafted article** — the product gets smarter with
   use (the "flywheel/moat").

> **Plus:** an **immersive 3D UI** (React Three Fiber, custom GLSL shaders) — most teams ship a
> plain chat box; ours is a cinematic, Awwwards-grade experience.

---

### Q: How did you deploy it? (Render / AWS / etc.)

We deployed on **Render** as a **single web service**. Express serves both the API **and** the
prebuilt React app from one origin (no CORS, no separate frontend host). SQLite runs as a file in
the same container.

**Deploy specifics (be ready for this):**
- The client is **prebuilt and committed** (`client/dist`) and the database ships **pre-seeded**
  (`data/app.db`), so the host does **no heavy build or embedding at runtime** — this was a
  deliberate fix because the Vite + Three.js build and the KB-embedding step each exceeded Render
  free's **512 MB** memory limit.
- A **GitHub Actions cron** pings `/api/health` to reduce free-tier cold starts.
- Every push to `main` **auto-redeploys**.

---

### Q: Why Render and not AWS?

**Short answer:** Render gives us zero-ops, single-command deploy that fits a 5-person student
timeline. AWS is over-engineered for one container + a file database.

**The defensible reasoning:**
- Our app is **one process** (Express serving UI + API) with **SQLite** (a file). That's a perfect
  fit for a single Render web service. On AWS we'd need **ECS/Fargate or EC2 + a load balancer +
  RDS or a managed DB + S3 + IAM + a VPC** — a lot of moving parts for the same result.
- **Time-to-demo:** Render deploys from a GitHub push in minutes with no infra code. AWS would mean
  writing Terraform/CDK, configuring networking, and managing secrets — days, not minutes.
- **Cost:** Render's **free tier** covers a student demo. Comparable AWS reliability isn't free.
- We **understand the AWS path** and can describe it: for production scale we'd move to **ECS
  Fargate** (container), **RDS Postgres + pgvector** (replacing SQLite for concurrent writes and
  real vector indexing), **S3** for uploaded images, **CloudFront** for the static frontend, and
  **Secrets Manager** for keys. We chose Render because at our scale that complexity buys us
  nothing for the demo.

> **If asked "when WOULD you move to AWS?":** when we outgrow SQLite (concurrent writes, >10k KB
> chunks needing an ANN index), need horizontal scaling, or require enterprise compliance/VPC
> isolation.

---

### Q: Architecture, design decisions & edge cases

**Two-app architecture**
- `client/` — Vite + React + TypeScript SPA (React Three Fiber 3D, Zustand state, Tailwind).
- `server/` — Express + TypeScript (run via `tsx`), `better-sqlite3` for data **and** vectors.
- npm workspaces; one `npm run dev` runs both.

**RAG pipeline** (`server/src/rag/`)
1. **Ingest** PDF / Markdown / URL → clean text.
2. **Chunk** — structure-aware, **~180 tokens target, 300 max, 40 overlap** (section-level).
3. **Embed** — Gemini `gemini-embedding-001`, **768-dim**, stored as **Float32 BLOBs** in SQLite.
4. **Retrieve** — **brute-force cosine**, **top-k = 8**, returns max score for confidence.

**Agent loop** (`server/src/agent/`)
- A reasoning loop (max **4 iterations**) with **4 tools**: `knowledge_base_search`,
  `check_order_status`, `create_ticket`, `escalate_to_human`.
- **Universal JSON tool protocol** — the model replies with one JSON object (`{"tool":…}` or
  `{"final":…, "confidence":…, "sentiment":…, "urgency":…}`). A **tolerant parser** extracts it.
  This works on **any** model, even ones without native function-calling.
- **Confidence** = `0.5 × retrieval_score + 0.5 × LLM_self_assessment`. Escalate if combined < **0.4**
  (adaptive: lower threshold when the customer is angry/urgent), or if KB score < **0.45** and the
  model says "not answerable" (out of scope).

**Key design decisions (the "why"):**

| Decision | Why |
|---|---|
| **Chunk 180/300/40 tokens** | Section-level chunks → sharper retrieval (a query matches the relevant section, not a diluted whole doc); overlap preserves continuity across boundaries. |
| **Brute-force cosine, not a vector DB** | At our scale (hundreds of chunks) it's **sub-10ms**, needs **no index build**, and **freshly ingested docs are queryable instantly** — which satisfies the "KB updates reflect within 60s" metric. We'd switch to an ANN index (FAISS/pgvector) only beyond ~10k chunks. |
| **SQLite, not Postgres** | Zero-ops, single file, fast for a single-process demo; vectors fit fine as BLOBs. Postgres/pgvector is the production upgrade. |
| **Prompted JSON protocol, not forced JSON mode** | Some free models (NVIDIA/OpenRouter) reject `response_format`; a tolerant parser + low temperature (0.2) gives near-deterministic JSON on **every** provider. |
| **Free APIs + rotation** | Cost-controlled; the rotation engineering turns free-tier limits into paid-tier reliability. Gemini is reserved for embeddings (separate quota) and is last in the chat rotation. |
| **Order data via a TOOL, not in the KB** | User-specific facts (a particular order) must NOT be embedded — that would be an architecture error. The KB holds **general policy**; the **tool** fetches the **specific order**; the agent combines them. |

**Edge cases we handle:**
- **All providers rate-limited** → retry with backoff, then escalate gracefully ("providers busy").
- **Out-of-scope / creative prompts** (poem, weather, trivia) → forced low confidence → escalate.
- **Malformed model JSON** → tolerant parser + a "protocol repair" re-prompt.
- **Embedding failure mid-turn** → return no matches → low confidence → safe escalation (no crash).
- **Unsupported browser for voice** → mic hidden, typing still works.
- **Bad / irrelevant image** → vision returns `isFoodRelated:false` and the agent asks for details.
- **Connection "Premature close" on a provider** (seen on Render) → `Connection: close` + retryable
  classification → fail over to a working provider.
- **PDF that's scanned/image-only** → ingestion marks it `failed` rather than silently empty.

---

## 2. Project Demonstration — Workflow

**The end-to-end flow when a customer sends a message:**

1. **User message** (typed, spoken, or with a photo) hits `POST /api/chat` (Server-Sent Events).
2. **Vision step (if image):** Gemini analyzes the photo → structured complaint assessment.
3. **Pre-retrieval:** the query is embedded and the **top-8 KB chunks** are fetched (cosine).
4. **Agent loop:** the LLM (via the rotation) reasons over ≤4 steps, calling tools as needed —
   e.g. `check_order_status("FA-1003")` for an order question, `knowledge_base_search` for policy.
5. **Sentiment/urgency** are classified each turn (drives the mood chip + adaptive escalation).
6. **Decision:** confident → stream the answer token-by-token with **source citations**; not
   confident / out-of-scope / angry → **escalate** with a structured handoff summary.
7. **Analytics events** are recorded throughout → the admin dashboard updates live.
8. **Feedback:** 👍/👎 and a ★ satisfaction prompt; 👎 + unanswered queries feed the **self-learning
   KB** loop.

**Suggested live demo order (5–7 min):**
1. In-scope Qs first (builds a high resolution rate): *"How do refunds work?"*, *"How much is
   FoodAssist Plus?"*
2. **Order lookup + policy:** *"Where is my order FA-1001?"* then *"What's the refund procedure for
   FA-1003? An item was missing."* → shows specific order data + policy together.
3. **Multi-turn:** *"How do refunds work?"* → *"How long to my card?"* (uses prior turn).
4. **Vision:** attach a food photo on order **FA-1008** → auto complaint + resolution.
5. **Emotion escalation:** *"This is the WORST service, my order NEVER came!!"* → instant empathetic
   escalation; mood chip shows **angry / urgent**.
6. **Voice:** mic button → speak a question → spoken reply.
7. **Admin:** show the live dashboard (resolution rate, escalation by topic, top unanswered),
   **AI Copilot** suggested replies on the escalation, and the **Self-Learning KB** "generate &
   publish" flow.
8. **Out-of-scope:** *"What's the weather in Tokyo?"* → correctly escalates.

---

## 3. Individual Contributions

The work split across the team by subsystem (reflected in the Git commit history):

| Member | Area of ownership | What they built |
|---|---|---|
| **Bhuvanesh66** | Backend — Data & RAG, deploy, standout features | SQLite schema + repositories, RAG pipeline (chunk/embed/retrieve), seed knowledge base & order data, Render deployment, and the 5 advanced features (voice, vision, emotion, copilot, self-learning). |
| **Joe-Daniel29** | Agent & Providers | Tool-using agent loop, the 4 tools, confidence & escalation logic, the universal JSON tool protocol, and the multi-provider rotation/failover engine. |
| **om-malviya** | API & Scripts | Express API routes (chat SSE, ingest, feedback, escalations, analytics), the app entrypoint, SSE/utilities, and the migrate/seed/verify scripts. |
| **Rabari9999** | Frontend | Vite + React app, the immersive 3D scenes (R3F + GLSL AI Core orb), chat experience (streaming bubbles, suggestions, satisfaction prompt), and the admin console UI. |
| **vanshkamra12** | Project & Data | Project scaffold (workspaces, config), the FoodAssist AI knowledge-base content (docs, FAQs, tickets, mock orders), and the README/documentation. |

> Everyone should be able to explain the overall workflow and the **why** behind the shared design
> decisions above — not only their own area.

---

## 4. Rapid-Fire "Why" Cheat Sheet

- **Why RAG?** To ground answers in real policy and avoid hallucination — the agent answers *only*
  from retrieved chunks, with citations.
- **Why embeddings + cosine?** Semantic search — matches meaning, not keywords ("my food was cold"
  finds the quality-issue policy).
- **Why a confidence threshold?** To know when *not* to answer — low confidence → escalate instead
  of guessing.
- **Why multi-provider rotation?** Free-tier rate limits; rotation + failover = reliability.
- **Why is order data not in the KB?** It's user-specific; embedding orders would be wrong. Tool
  lookup for specifics, KB for general policy.
- **How do you measure success?** ≥70% in-scope resolution, 100% out-of-scope escalation, live
  admin data, multi-turn memory, 60s KB freshness — all verified by our `npm run verify` script
  (currently **100% resolution, 3/3 escalation**).
- **How do you prevent hallucination?** Answer only from retrieved context + show sources; low
  confidence escalates; out-of-scope is forced to escalate.

---

## 5. Terminology & Tech Choices (study sheet)

> Clear, examiner-ready answers to the "what is X / why did you use X" questions. The whole team
> should be able to give these.

### Q: You used TypeScript everywhere — so why React and Express?

**TypeScript is a *language*; React and Express are *frameworks* written in that language.** They
aren't alternatives — they work together.

- **TypeScript** = the language you write in (typed JavaScript). It's *how* you write code.
- **React** = a frontend library that renders the UI (chat bubbles, composer, admin dashboard, 3D
  orb). Without it you'd manipulate the browser DOM by hand.
- **Express** = a backend framework that runs the web server / API (`/api/chat`, talking to the DB,
  calling the LLMs). Without it you'd hand-write a raw Node HTTP server with no routing.

You **cannot** build the app with "just TypeScript" — it only gives typed JavaScript; it doesn't
render UI or serve HTTP. Both React and Express are **imported into TypeScript files** — our whole
stack (93 `.ts`/`.tsx` files) is TypeScript, frontend and backend. That gives **end-to-end type
safety across the full stack** — a strength.

> **One-liner:** *"TypeScript is the language; React renders the frontend, Express runs the backend
> API — both written in TypeScript, giving end-to-end type safety."*

### Q: What is multi-turn?

**Multi-turn = the agent remembers earlier messages in the same conversation**, so the user doesn't
repeat themselves. A "turn" is one back-and-forth.

```
Turn 1  You: "How do refunds work?"
        AI:  "Credit instantly, or your card in 3-5 business days."
Turn 2  You: "How long does that take to my card?"   ← "that" = refunds from Turn 1
        AI:  "Card refunds take 3-5 business days."   ← understood the context
```

**How our code does it:** every message is saved to the SQLite `messages` table by `conversationId`;
before each turn, `buildHistory()` reloads the conversation and feeds it back to the LLM (capped at a
**3000-token budget** so long chats don't overflow the context window). *(see `server/src/agent/loop.ts`)*

> **One-liner:** *"We store every message by conversation ID and reload the history each turn, so
> follow-ups like 'how long does that take?' are understood in context."*

### Q: What is SQLite and why did you use it?

**SQLite is a serverless, file-based SQL database** — the entire database is **one file**
(`data/app.db`), read/written directly by the app. No server to install, start, or connect to over a
network. (It's the most-deployed database in the world — in every phone and browser.)

**Why we chose it:**
1. **Zero-ops** — no DB server to manage; the file *is* the database. Ideal for a student timeline.
2. **Single-process fit** — our backend is one Express process that owns the data. (Postgres shines
   when many services share a DB; we don't have that.)
3. **It stores our vectors too** — RAG embeddings (768-dim) are saved as **Float32 BLOBs** in
   `kb_chunks`, so one file holds both relational data **and** the vector store — **no separate
   vector DB** (no Pinecone/Chroma).
4. **Fast at our scale** — `better-sqlite3` is synchronous & in-process (no network hop); brute-force
   cosine over hundreds of chunks is **<10ms**.
5. **Trivial deploy** — the DB ships as a committed file inside the container; no managed-DB service.
6. **Reliable** — ACID transactions; we enable **WAL mode** (concurrent reads) and `foreign_keys=ON`.

**When would you move off SQLite?** *"At scale — concurrent writes from many services, horizontal
scaling, or an ANN vector index beyond ~10k chunks — we'd move to **Postgres + pgvector** (same SQL,
managed server). At our scale that complexity buys nothing."*

> **One-liner:** *"A file-based SQL database — zero-ops, and it stores our vectors as BLOBs too, so
> one file is both the data store and the vector store. We'd switch to Postgres+pgvector only at
> scale."*

### Q: What chunking strategy did you use?

**Structure-aware (section-level) chunking with overlap.** *(see `server/src/rag/chunk.ts`)*

| Parameter | Value |
|---|---|
| Target chunk size | **180 tokens** |
| Max chunk size | **300 tokens** (oversized blocks hard-split by sentence) |
| Overlap | **40 tokens** (~20%) |

**How:** split the text on **markdown headings / blank lines** (not blind fixed-size cuts) → pack
paragraphs up to ~180 tokens → carry a 40-token overlap into the next chunk for continuity.

**Why:** topic-aligned chunks give **sharper retrieval** — a refund query matches the *refund
section* strongly, instead of a big diluted chunk mixing many topics. Overlap preserves meaning
across boundaries.

**Rejected alternatives:** fixed-size character chunking (cuts mid-sentence, mixes topics);
whole-document chunks (vague matches, can't pinpoint the section).

> **One-liner:** *"Structure-aware section-level chunking — split on headings, ~180-token chunks,
> 40-token overlap — for sharp, focused retrieval instead of diluted fixed-size chunks."*

### Q: What prompting style did you use?

A **ReAct-style agent prompt with a strict single-JSON tool protocol.** *(see `server/src/agent/prompts.ts`)*

The system prompt has four parts: **(1) role/persona**, **(2) a strict output protocol** (reply with
exactly one JSON object — either `{"tool":…}` to act or `{"final":…, "confidence":…, "sentiment":…,
"urgency":…}` to answer), **(3) policy/grounding rules** ("answer ONLY from the KB", "always search
first", "escalate when…", order+policy linking, empathy), and **(4) the tool definitions**.

**Key technique — prompted JSON protocol (not native function-calling):** we instruct the model to
emit JSON and parse it tolerantly, instead of using each provider's built-in function-calling. **Why:**
we rotate across 4 providers and some free models don't reliably support `response_format`/native
tools; prompted JSON + low temperature (0.2) + a tolerant parser gives near-deterministic structured
output on **every** provider — it's provider-agnostic.

Other choices: **ReAct** (reason → act → observe → repeat, ≤4 iterations); **grounding instructions**
to prevent hallucination; **self-assessment** (the model reports its own confidence/sentiment/urgency,
which drive escalation).

> **One-liner:** *"A ReAct-style agent prompt with a strict single-JSON tool protocol — the model
> emits a tool call or a final answer with self-reported confidence/sentiment. We use prompted JSON
> (not native function-calling) so it works across all 4 providers, plus grounding rules to prevent
> hallucination."*

### Q: What is RAG / embeddings / cosine similarity? (quick definitions)

- **RAG (Retrieval-Augmented Generation):** before the LLM answers, we **retrieve** relevant
  knowledge-base chunks and feed them in — so answers are grounded in real policy, not invented.
- **Embedding:** a model (`gemini-embedding-001`) turns text into a **vector of 768 numbers** that
  captures its *meaning*. Similar meanings → nearby vectors.
- **Cosine similarity:** measures the **angle** between two vectors (0–1). High score = similar
  meaning. We embed the query, compare it against every chunk's vector, and take the **top-8** — that's
  how "my food was cold" finds the *food-quality* policy without sharing any keywords.
- **SSE (Server-Sent Events):** a one-way stream from server → browser, used to **stream the
  answer token-by-token** (the typewriter effect) and push live status events to the chat.
