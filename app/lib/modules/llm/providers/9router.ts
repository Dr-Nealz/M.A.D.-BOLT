import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Default 9router gateway endpoint (OpenAI-compatible root, with /v1).
 * 9router is a local/remote AI gateway (OpenAI-compatible) that routes to
 * many upstream providers (NVIDIA, OpenRouter, Groq, Gemini, ...) behind one
 * endpoint + one API key. The local gateway listens on 20128 by default
 * (NOT 3000) and exposes the OpenAI-compatible API at <host>/v1.
 * A remote/cloud instance can be set via NINEROUTER_BASE_URL.
 */
const DEFAULT_ROUTER_URL = 'http://localhost:20128/v1';

/**
 * Normalize a 9router base URL to the OpenAI-compatible root (with /v1).
 * Accepts both "http://host:20128" and "http://host:20128/v1".
 */
function toApiRoot(baseUrl: string): string {
  const url = baseUrl.trim().replace(/\/+$/, '');

  if (!url.endsWith('/v1')) {
    return `${url}/v1`;
  }

  return url;
}

export default class NineRouterProvider extends BaseProvider {
  name = '9router';
  getApiKeyLink = 'https://9router.com/';

  config = {
    baseUrlKey: 'NINEROUTER_BASE_URL',
    apiTokenKey: 'NINEROUTER_API_KEY',
  };

  staticModels: ModelInfo[] = [
    /*
     * Common model mappings through 9router.
     * IDs must match what the 9router gateway actually routes (model `id`
     * from `GET /v1/models`). These are the most useful, working entries.
     */
    // NVIDIA models via 9router
    {
      name: 'kc/nvidia/nemotron-3-ultra-550b-a55b:free',
      label: 'Nemotron 3 Ultra 550B (free, via NVIDIA)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'kc/nvidia/nemotron-3-super-120b-a12b:free',
      label: 'Nemotron 3 Super 120B (free, via NVIDIA)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'nvidia/nemotron-3-ultra-550b-a55b',
      label: 'Nemotron 3 Ultra 550B (NVIDIA)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'nvidia/deepseek-ai/deepseek-v4-flash',
      label: 'DeepSeek V4 Flash (NVIDIA)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'nvidia/z-ai/glm-5.2',
      label: 'GLM 5.2 (NVIDIA)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },

    // Anthropic/Claude via 9router (combo + KiloCode)
    {
      name: 'claude-Claude',
      label: 'Claude (9router combo)',
      provider: '9router',
      maxTokenAllowed: 200000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'kr/claude-sonnet-4',
      label: 'Claude Sonnet 4 (via 9router)',
      provider: '9router',
      maxTokenAllowed: 200000,
      maxCompletionTokens: 8192,
    },

    // Google/Gemini via 9router
    {
      name: 'gemini/gemini-3.7-flash',
      label: 'Gemini 3.7 Flash (via 9router)',
      provider: '9router',
      maxTokenAllowed: 1000000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'gemini/gemini-3.1-pro-preview',
      label: 'Gemini 3.1 Pro (via 9router)',
      provider: '9router',
      maxTokenAllowed: 1000000,
      maxCompletionTokens: 8192,
    },

    // Groq / Cerebras / OpenAI-compatible via 9router
    {
      name: 'groq/llama-3.3-70b-versatile',
      label: 'Llama 3.3 70B (via Groq/9router)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'cerebras/gpt-oss-120b',
      label: 'GPT-OSS 120B (via Cerebras/9router)',
      provider: '9router',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 8192,
    },
  ];

  async getDynamicModels(
    _apiKeys?: Record<string, string>,
    _settings?: IProviderSetting,
    _serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    try {
      const baseUrl = this.getProviderBaseUrlAndKey({
        apiKeys: _apiKeys,
        providerSettings: _settings,
        serverEnv: _serverEnv,
        defaultBaseUrlKey: 'NINEROUTER_BASE_URL',
        defaultApiTokenKey: 'NINEROUTER_API_KEY',
      });

      const routerUrl = baseUrl.baseUrl ? toApiRoot(baseUrl.baseUrl) : DEFAULT_ROUTER_URL;
      const apiKey = baseUrl.apiKey;

      // Fetch available models from 9router (OpenAI-compatible: <root>/v1/models)
      const response = await fetch(`${routerUrl}/models`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
      });

      if (!response.ok) {
        console.warn(`9router API error: ${response.status} ${response.statusText}. Using static models.`);
        return this.staticModels;
      }

      const data = (await response.json()) as any;
      const models = Array.isArray(data.data) ? data.data : data.models || [];

      return models
        .map((model: any) => {
          /*
           * 9router returns OpenAI-style objects: { id, object, created, owned_by }
           * The `id` is the full routable string (e.g. "kc/nvidia/nemotron-...:free").
           */
          const id: string = model.id || model.name || '';
          const owner: string = model.owned_by || '9router';

          // Calculate token limits based on model info (fall back to defaults)
          const contextLength = model.context_length || model.max_tokens || model.maxSequenceLength || 32000;
          const maxCompletion = model.max_completion_tokens || model.maxOutputTokens || model.maxNewTokens || 4096;

          // Human-friendly label from the routable id
          const label = id
            .replace(/:free$/, ' (free)')
            .replace(/_/g, ' ')
            .replace(/\//g, ' · ')
            .trim();

          return {
            name: id,
            label,
            provider: '9router',
            ownedBy: owner,
            maxTokenAllowed: contextLength,
            maxCompletionTokens: maxCompletion,
          };
        })
        .filter((m: ModelInfo) => !!m.name);
    } catch (error) {
      console.error('Error fetching 9router models:', error);

      // Return static models as fallback
      return this.staticModels;
    }
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'NINEROUTER_BASE_URL',
      defaultApiTokenKey: 'NINEROUTER_API_KEY',
    });

    const routerUrl = baseUrl ? toApiRoot(baseUrl) : DEFAULT_ROUTER_URL;
    const modelApiKey = apiKey || process.env.NINEROUTER_API_KEY || process.env.OPENAI_LIKE_API_KEY;

    if (!modelApiKey) {
      throw new Error(`Missing 9router API key. Set ${this.config.apiTokenKey} in environment variables.`);
    }

    // 9router acts as an OpenAI-compatible endpoint
    const openai = createOpenAI({
      baseURL: routerUrl,
      apiKey: modelApiKey,
    });

    return openai(model);
  }
}
