import React, { useState, useEffect, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import Cookies from 'js-cookie';
import { useToast } from '~/components/ui/use-toast';

/**
 * API key editor for provider cards in the Settings → Providers tabs.
 *
 * Writes to the same `apiKeys` cookie used by the chat's APIKeyManager, so
 * keys entered here flow through the server's getProviderBaseUrlAndKey
 * (apiKeys?.[providerName] → apiKey). Also reports whether a key is set via
 * the UI, via environment variables, or not at all.
 */
interface ProviderApiKeyInputProps {
  providerName: string;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
}

const providerEnvKeyStatusCache: Record<string, boolean> = {};

export function ProviderApiKeyInput({ providerName, getApiKeyLink, labelForGetApiKey }: ProviderApiKeyInputProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);

  const getCurrentKey = useCallback((): string => {
    try {
      const storedApiKeys = Cookies.get('apiKeys');
      const parsed = storedApiKeys ? (JSON.parse(storedApiKeys) as Record<string, string>) : {};

      return parsed[providerName] || '';
    } catch {
      return '';
    }
  }, [providerName]);

  // Load the saved key for this provider when the provider changes
  useEffect(() => {
    const savedKey = getCurrentKey();
    setApiKey(savedKey);
    setTempKey(savedKey);
    setIsEditing(false);
  }, [providerName, getCurrentKey]);

  // Check whether the provider's API key is configured via environment variables
  const checkEnvApiKey = useCallback(async () => {
    if (providerEnvKeyStatusCache[providerName] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[providerName]);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(providerName)}`);
      const data = (await response.json()) as { isSet: boolean };
      providerEnvKeyStatusCache[providerName] = data.isSet;
      setIsEnvKeySet(data.isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [providerName]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  const handleSave = () => {
    const currentKeys = (() => {
      try {
        return JSON.parse(Cookies.get('apiKeys') || '{}') as Record<string, string>;
      } catch {
        return {};
      }
    })();

    const newKeys = { ...currentKeys, [providerName]: tempKey.trim() };
    Cookies.set('apiKeys', JSON.stringify(newKeys));
    setApiKey(newKeys[providerName]);
    setIsEditing(false);
    toast(`${providerName} API key saved`);
  };

  const handleClear = () => {
    const currentKeys = (() => {
      try {
        return JSON.parse(Cookies.get('apiKeys') || '{}') as Record<string, string>;
      } catch {
        return {};
      }
    })();

    const newKeys = { ...currentKeys };
    delete newKeys[providerName];
    Cookies.set('apiKeys', JSON.stringify(newKeys));
    setApiKey('');
    setTempKey('');
    setIsEditing(false);
    toast(`${providerName} API key cleared`);
  };

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-bolt-elements-textSecondary">API Key</span>
        <div className="flex items-center gap-1.5 text-xs">
          {apiKey ? (
            <>
              <div className="i-ph:check-circle-fill text-green-500 w-3.5 h-3.5" />
              <span className="text-green-500">Set via UI</span>
            </>
          ) : isEnvKeySet ? (
            <>
              <div className="i-ph:check-circle-fill text-green-500 w-3.5 h-3.5" />
              <span className="text-green-500">Set via environment variable</span>
            </>
          ) : (
            <>
              <div className="i-ph:x-circle-fill text-red-500 w-3.5 h-3.5" />
              <span className="text-red-500">Not set</span>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="password"
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            placeholder={`Enter ${providerName} API key`}
            autoFocus
            className={classNames(
              'flex-1 px-3 py-1.5 rounded-lg text-sm font-mono',
              'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
              'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'transition-all duration-200',
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setTempKey(apiKey);
              }
            }}
          />
          <button
            onClick={handleSave}
            title="Save API key"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setTempKey(apiKey);
            }}
            title="Cancel"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setTempKey(apiKey);
              setIsEditing(true);
            }}
            className="flex-1 text-left px-3 py-1.5 rounded-lg text-sm bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor hover:border-purple-500/30 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-all duration-200"
          >
            <span className="font-mono truncate block">
              {apiKey ? `${apiKey.slice(0, 3)}••••••${apiKey.slice(-4)}` : 'Click to set API key'}
            </span>
          </button>
          {getApiKeyLink && (
            <button
              onClick={() => window.open(getApiKeyLink, '_blank')}
              title={labelForGetApiKey || 'Get API key'}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 transition-colors whitespace-nowrap"
            >
              Get Key
            </button>
          )}
          {apiKey && (
            <button
              onClick={handleClear}
              title="Clear API key"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
