# Running the Knowledge Service (AnythingLLM)

VigilDesk utilizes [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) as its underlying containerized vector search and RAG knowledge service. The VigilDesk agent backend queries AnythingLLM via its developer REST API through the `search_knowledge` tool.

---

## 1. Start AnythingLLM (Docker)

```bash
# STORAGE_DIR is required — without it the container crash-loops on startup.
docker run -d -p 3001:3001 \
  -e STORAGE_DIR="/app/server/storage" \
  -v anythingllm_storage:/app/server/storage \
  --name anythingllm mintplexlabs/anythingllm
```

Open http://localhost:3001 and complete the first-run setup.

## 2. LLM Provider Setup

In **Settings → LLM Preference**, choose your preferred provider (e.g. **Ollama** running `llama3.1:8b`, or **OpenAI**). This is the model AnythingLLM uses for embedding synthesis and document Q&A.

## 3. Create Workspace & Embed Documents

1. Create a workspace matching `ANYTHINGLLM_WORKSPACE` in your `.env` (default: `vigildesk-kb`).
2. Upload the files in [`../knowledge_base/`](../knowledge_base) and click **"Save & Embed"**.
3. Verify retrieval in the AnythingLLM web UI.

## 4. Generate Developer API Key

In **Settings → Tools → Developer API**, generate an API key and add it to your `.env` file as `ANYTHINGLLM_API_KEY`.

## 5. Verify API Connection

You can verify workspace communication directly via `curl`:

```bash
curl -X POST http://localhost:3001/api/v1/workspace/vigildesk-kb/chat \
  -H "Authorization: Bearer $ANYTHINGLLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "How much does Nimbus Pro cost?", "mode": "query"}'
```

## 6. Fast No-Match Fallback Configuration

To prevent AnythingLLM from hallucinating or stalling when information is absent from policy documents:
1. In **Workspace Settings → Chat Settings → Workspace System Prompt**, configure:
   > *"Given the following context, answer the user query strictly using the provided documents. If the information is not explicitly found in the retrieved documents, reply immediately with 'NO_POLICY_MATCH: Information not found in policy documents.' Do not attempt to guess or hallucinate."*
2. In `server/tools/search_knowledge.py`, VigilDesk parses this token to trigger graceful fallbacks or Human-in-the-Loop escalation.
