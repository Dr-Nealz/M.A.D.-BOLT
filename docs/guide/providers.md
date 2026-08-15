# Providers

M.A.D. BOLT-REMIX supports **19+ LLM providers** through the Vercel AI SDK. Each provider is a toggleable module; configure API keys either in the UI settings or via environment variables.

## How to Configure

### In the UI (recommended)

1. Open the **settings** panel.
2. Under the **Providers** tab, toggle on the provider you want.
3. Paste your **API key** into the provider's card.
4. Optionally adjust the **base URL** and **model list** for OpenAI-compatible providers.

### Via environment variables

Copy `.env.example` to `.env.local` and fill in the keys for the providers you use:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
MISTRAL_API_KEY=...
OLLAMA_API_BASE_URL=http://localhost:11434
```

## Supported Providers

| Provider | Module | Notes |
| --- | --- | --- |
| OpenAI | `@ai-sdk/openai` | GPT-4o, o-series, etc. |
| Anthropic | `@ai-sdk/anthropic` | Claude 3.5 / 3 Opus, Sonnet, Haiku |
| Google | `@ai-sdk/google` | Gemini Pro, Flash |
| Mistral | `@ai-sdk/mistral` | Mistral Large, Small |
| NVIDIA | `@ai-sdk/openai`-compatible | Direct access to **NVIDIA's LLM models** (Llama Nemotron series, Mistral) — a M.A.D. mod |
| 9router | `@ai-sdk/openai`-compatible | **Unified routing** across multiple providers through a single interface — a M.A.D. mod |
| OpenRouter | `@openrouter/ai-sdk-provider` | 100+ models |
| Ollama | `ollama-ai-provider` | Local models via Ollama |
| LM Studio | OpenAI-compatible | Local models via LM Studio |
| Together AI | OpenAI-compatible | Mixtral, Llama, etc. |
| Bedrock | `@ai-sdk/amazon-bedrock` | Claude models on AWS Bedrock |
| Cohere | `@ai-sdk/cohere` | Command models |
| Cerebras | `@ai-sdk/cerebras` | Llama on Cerebras hardware |
| DeepSeek | `@ai-sdk/deepseek` | DeepSeek V3, R1 |
| Fireworks | `@ai-sdk/fireworks` | Fast inference |
| Groq | OpenAI-compatible | Ultra-fast Llama, Mixtral |
| Perplexity | OpenAI-compatible | Sonar models |
| Google Vertex | OpenAI-compatible | Gemini via Vertex |

> **New in M.A.D.:** the **NVIDIA** provider gives direct access to NVIDIA's hosted LLMs (Llama Nemotron series, Mistral), and **9router** lets you route requests across providers through one key.

## Model Selection

After enabling a provider, choose a model from the **model dropdown** in the composer. Some providers expose context-window hints so M.A.D. can size prompts appropriately.

## Env Vars for M.A.D. Mods

- `NVIDIA_API_KEY` — for the NVIDIA provider.
- `9ROUTER_API_KEY` — for the 9router provider.

See the [README](https://github.com/Dr-Nealz/M.A.D.-BOLT#readme) for the full provider list and configuration details.
