import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class NVIDIAProvider extends BaseProvider {
  name = 'NVIDIA';
  getApiKeyLink = 'https://integrate.api.nvidia.com/v1';

  config = {
    baseUrlKey: 'NVIDIA_BASE_URL',
    apiTokenKey: 'NVIDIA_API_KEY',
  };

  staticModels: ModelInfo[] = [
    /*
     * NVIDIA's flagship models
     */
    {
      name: 'nvidia/llama-3.1-nemotron-70b-instruct',
      label: 'Llama 3.1 Nemotron 70B',
      provider: 'NVIDIA',
      maxTokenAllowed: 128000,
      maxCompletionTokens: 4096,
    },
    {
      name: 'nvidia/llama-3.1-nemotron-8b-instruct',
      label: 'Llama 3.1 Nemotron 8B',
      provider: 'NVIDIA',
      maxTokenAllowed: 32000,
      maxCompletionTokens: 4096,
    },
    {
      name: 'nvidia/mistral-7b-instruct-v0.1',
      label: 'Mistral 7B Instruct v0.1',
      provider: 'NVIDIA',
      maxTokenAllowed: 8192,
      maxCompletionTokens: 4096,
    },
    {
      name: 'nvidia/gpt-neox-20b',
      label: 'GPT-NeoX 20B',
      provider: 'NVIDIA',
      maxTokenAllowed: 2048,
      maxCompletionTokens: 1024,
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
        defaultBaseUrlKey: 'NVIDIA_BASE_URL',
        defaultApiTokenKey: 'NVIDIA_API_KEY',
      });

      /*
       * NVIDIA's model discovery endpoint.
       * baseUrl.baseUrl already includes the /v1 suffix (e.g.
       * https://integrate.api.nvidia.com/v1), so strip it before appending
       * `/v1/models` to avoid a double /v1/v1 404.
       */
      const modelsBase = (baseUrl.baseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
      const apiBase = modelsBase.endsWith('/v1') ? modelsBase.slice(0, -3) : modelsBase;
      const response = await fetch(`${apiBase}/v1/models`, {
        headers: {
          'Content-Type': 'application/json',
          ...(baseUrl.apiKey && { Authorization: `Bearer ${baseUrl.apiKey}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`NVIDIA API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const models = Array.isArray(data.data) ? data.data : data.models || [];

      return models
        .filter((model: any) => model.id?.startsWith('nvidia/'))
        .map((model: any) => ({
          name: model.id,
          label: model.name || model.id || `${model.id} (NVIDIA)`,
          provider: this.name,
          maxTokenAllowed: model.context_length || model.max_tokens || model.maxSequenceLength || 32000,
          maxCompletionTokens: model.max_completion_tokens || model.maxOutputTokens || 4096,
        }));
    } catch (error) {
      console.error('Error fetching NVIDIA models:', error);

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
      defaultBaseUrlKey: 'NVIDIA_BASE_URL',
      defaultApiTokenKey: 'NVIDIA_API_KEY',
    });

    const modelApiKey = apiKey || process.env.NVIDIA_API_KEY;

    if (!modelApiKey) {
      throw new Error(`Missing NVIDIA API key. Set ${this.config.apiTokenKey} in environment variables.`);
    }

    /*
     * `createOpenAI` appends `/chat/completions` to the base URL, so the base
     * must include the `/v1` suffix (e.g. https://integrate.api.nvidia.com/v1).
     */
    const nvidiaBase = (baseUrl || 'https://integrate.api.nvidia.com/v1').trim().replace(/\/+$/, '');

    const openai = createOpenAI({
      baseURL: nvidiaBase,
      apiKey: modelApiKey,
    });

    return openai(model);
  }
}
