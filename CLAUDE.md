# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**VigilDesk** is a production-grade, multi-tenant **Autonomous Support Triage Agent** and **RAG Knowledge Service** built with Python/Flask and React/TypeScript (Vite). The backend under `server/` provides a bounded agent loop, dynamic multi-tenant company customization, stateful Human-in-the-Loop (HITL) safety, prompt injection boundaries, tool catalogs, and observability/audit telemetry. The frontend under `client/` provides an enterprise Ticket Triage Workbench, interactive ticket resolution flow, context-aware AI copilot ("Pip"), and an observability Audit Dashboard.

## Architecture

Two primary systems:
1. **Knowledge Service** — AnythingLLM in Docker at `http://localhost:3001`. Documents from `knowledge_base/` are embedded into workspace collections; the agent queries via AnythingLLM's developer API (Bearer auth, workspace chat endpoint).
2. **The Agent & Application** — Flask backend + React (Vite) frontend. The core is a **bounded agent loop**: the LLM reasons → selects a tool → executes → observes results → repeats until complete or `MAX_AGENT_STEPS` is reached.

Intended layout:

```
server/
├── app.py              ← application factory, blueprints & routes
├── agent.py            ← the bounded agent loop (decide → execute → observe)
├── config.py           ← application configuration & environment bindings
├── models.py           ← SQLAlchemy data models (Tickets, Users, Runs, Tenancy)
├── prompts.py          ← system prompts & routing classifiers
├── tools/              ← modular tool implementations (search_knowledge, tickets, escalate)
├── llm.py              ← unified model interface
├── observability.py    ← execution telemetry & run step logging
└── tests/              ← pytest unit and integration test suite
client/                 ← React (Vite, TypeScript, Material-UI, Emotion)
docs/                   ← Architecture designs, case studies & eval specs
```

### Core Architectural & Safety Rules

- **Single Model Interface:** All model calls pass through `generate(messages, tools)` in `llm.py`. Models are dynamically swappable via config (Ollama `llama3.1:8b`, OpenAI `gpt-4o-mini`, etc.).
- **Isolated Knowledge Interface:** Retrieval queries execute through `search_knowledge(query)` returning `{answer, sources}`.
- **Safety & Guardrails:** Hard iteration cap (`MAX_AGENT_STEPS`), parameter schema validation with single-retry graceful degradation, tool timeouts (`TOOL_TIMEOUT_SECONDS`), and **Human-in-the-Loop (HITL) confirmation** before any consequential action (escalation/creation).
- **Prompt Injection Boundaries:** External tool outputs are strictly enclosed in `<tool_result>` data envelopes; instructions within retrieved documents are never executed as system directives.
- **Observability:** Every LLM step and tool call is persisted with latency, status, arguments, and full trace logs for auditability.
- **Multi-Tenant Isolation:** Dynamic company branding, ticket queues, and knowledge base routing are scoped per tenant.
- Config lives in `.env` (see `.env.example`); never commit a real `.env`.

## Commands

```bash
# Knowledge service (prerequisite — see docs/anythingllm-setup.md)
docker run -d -p 3001:3001 -e STORAGE_DIR="/app/server/storage" \
  -v anythingllm_storage:/app/server/storage \
  --name anythingllm mintplexlabs/anythingllm

# Models (Ollama must be running: `ollama serve`)
ollama pull llama3.1:8b       # agent reasoning model (tool calling)
ollama pull llama3.2:1b       # tiny model for fast local iteration

# Backend (server/)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=agent -e POSTGRES_DB=agentdb \
  -v agentdb_data:/var/lib/postgresql/data --name agentdb postgres:16
python -m venv .venv && source .venv/bin/activate
pip install -r server/requirements.txt
flask --app server.app db upgrade   # create/update the schema
flask --app server.app run --debug  # http://localhost:5000

# Frontend (client/)
npm install
npm run dev                   # http://localhost:5173

# Tests
python -m pytest server/tests -v                                                # all backend tests
python -m pytest server/tests/test_agent.py::test_loop_terminates_at_max_steps -v  # single test
cd client && npm test -- --run                    # frontend tests (single run)
cd client && npm test -- --run src/tests/chat.test.tsx  # single frontend test file
```

Ports: 3001 = AnythingLLM, 5000 = Flask, 5173 = Vite, 5432 = Postgres, 11434 = Ollama.

## Testing Conventions

- **Mock external model and tool calls in CI** — CI must not need a running model or live AnythingLLM. Assert the agent builds the right tool calls, parses results, terminates the loop, and catches malformed tool calls.
- Loop termination and stop conditions must have regression tests.
- CI (GitHub Actions) runs install + lint + tests on every PR; a red build blocks merge.
- The task-based eval set lives in `docs/eval.md`; re-run after prompt/tool/model adjustments.

## Git Workflow (from CONTRIBUTING.md)

- GitHub Flow: short-lived `feature/<name>` branches off protected `main`; all changes via reviewed PRs (≥1 approval).
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`); small focused commits.
