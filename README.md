<div align="center">

# 🏛️ Regulatory Intelligence Engine

**Ask SEBI or RBI a question in plain English (or Hinglish). Get the rule, the source, and what changed — not just a wall of PDF text.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Try_it_now-2F4F3F?style=for-the-badge)](#)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=flat-square)
![FAISS](https://img.shields.io/badge/FAISS-005571?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-000000?style=flat-square&logo=ollama&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## What is this?

SEBI and RBI publish new circulars constantly — dense, layout-heavy PDFs, spread across separate websites, with old and new versions of the same rule often sitting online side by side and no clear label on which one is current. Get the wrong version and it's not a typo, it's a compliance problem.

This project reads those circulars, keeps track of which rules replace older ones, and lets you just *ask* — in English or Hinglish — instead of hunting through PDFs. Every answer comes with its source, a confidence score, and a full trace of how the system got there.

## 📸 See it in action

| Landing page | Ask a question | Full history |
|:---:|:---:|:---:|
| ![Landing page](./screenshots/landing.png) | ![Query and answer view](./screenshots/query-answer.png) | ![History view](./screenshots/history.png) |

## 🧠 How it thinks

Every question runs through a 5-step LangGraph agent — not a single black-box LLM call:

```mermaid
flowchart LR
    A[🔀 route_intent] --> B[🔍 search_index]
    B --> C[⚖️ resolve_conflict]
    C --> D[✍️ synthesize_answer]
    D --> E[📦 aggregate_output]
    B -.no results, retry.-> A
```

| Step | What it actually does |
|---|---|
| **route_intent** | Turns your casual Hinglish/English question into a clean search query, using your last few messages for context if you're following up on something |
| **search_index** | Searches the vector index — separately for SEBI vs. RBI if you're comparing the two |
| **resolve_conflict** | If a rule was amended, pulls *both* the old and new version and labels them clearly — never mixes them together |
| **synthesize_answer** | Writes the answer using only what was actually retrieved. If nothing relevant was found, it says so — it never makes something up |
| **aggregate_output** | Bundles the answer, citations, and full execution log for the frontend to display |

Every one of those steps is visible in the app itself — click "How this was generated" on any answer to see the real trace.

## ✨ Features

- 🗣️ **Ask in Hinglish or English** — "AIF band karne ke liye kya guidelines hain?" works exactly like the formal version
- ⚖️ **Amendment-aware** — old and current versions of a rule are shown side by side, never blended into one confusing answer
- 🔍 **Full transparency** — see exactly which node ran, what it retrieved, and why, for every single answer
- 📎 **Cited, scored answers** — every response links back to its source circular with a confidence score
- 🔑 **Bring your own key** — runs on your own free Gemini API key, no shared quota to fight over
- 🛡️ **No hallucinated answers** — if it's not in the retrieved circulars, the system tells you it doesn't know, instead of guessing

## 🛠️ Built with

| Layer | Tech |
|---|---|
| Backend | FastAPI (async), LangGraph, LangChain |
| LLM | Google Gemini in production, with a local-first fallback via **Ollama** for offline/no-cost development |
| Vector search | FAISS |
| Database | PostgreSQL, hosted free on [Neon](https://neon.tech) — stores chat threads, LangGraph's conversation checkpoints, and an ingestion dedupe table so the same circular is never processed twice |
| Frontend | React + Tailwind CSS |
| Observability | LangSmith |
| PDF ingestion | PyMuPDF + Tesseract OCR (for scanned circulars) |
| Containerization | Docker (backend) |

## 🚀 Getting started

Want to run it yourself? Here's the whole thing, start to finish.

### 1. Clone it

```bash
git clone https://github.com/Sanjay-jat/regulatory-intelligence-engine.git
cd regulatory-intelligence-engine
```

### 2. Get a free Gemini API key

Grab one in a minute at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — you'll need it either way.

### 3. Spin up the backend

```bash
cd rie-backend
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and fill in:

| Variable | What it's for |
|---|---|
| `LLM_PROVIDER` | `gemini` (or `ollama` if you want to run a local model instead) |
| `GEMINI_API_KEY` | Your key from step 2 |
| `DATABASE_URL` | A PostgreSQL connection string ([neon.tech](https://neon.tech) has a free tier that works great) |
| `FAISS_INDEX_PATH` | Leave as default — a small sample index ships with the repo |
| `API_KEY` | Any string you choose — this locks down your own API |
| `RATE_LIMIT_PER_MINUTE` | Requests allowed per IP per minute |

Then run it:

```bash
uvicorn app.main:app --reload
```

Backend's up at `http://localhost:8000`.

### 4. Spin up the frontend

```bash
cd ../rie-frontend
npm install
cp .env.example .env
```

Set `VITE_API_URL` to your backend URL and `VITE_API_KEY` to match the `API_KEY` you picked above. Then:

```bash
npm run dev
```

Open the URL it gives you, add your Gemini key from the 🔑 icon in the app, and start asking questions.

## 📚 What's in the index right now

Around 45 circulars from SEBI and RBI, mostly from the recent period — enough to see amendment tracking, citations, and Hinglish queries working end to end. It's a working demo, not the full regulatory archive (yet).

## 🤔 Things worth knowing

- **Your API key is visible in the browser bundle.** This is a static single-page app — any `VITE_`-prefixed variable ships in the public JS by design. Rate limiting keeps the backend safe from abuse, but this isn't a secret-storage mechanism.
- **No shared key in production** — everyone brings their own Gemini key. There's no fallback quota to burn through.
- **Gemini's free tier has daily limits**, which can pause bulk ingestion runs mid-way. Nothing breaks — it just picks up where it left off.

## 🔗 Connect

Built by **Sanjay** — [github.com/Sanjay-jat](https://github.com/Sanjay-jat)

If you spot a bug or have an idea, open an issue. Always happy to hear from people who've actually poked around in the code.
