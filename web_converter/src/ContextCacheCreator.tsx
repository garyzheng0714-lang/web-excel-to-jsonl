import React, { useMemo, useState } from 'react';
import { Loader2, Copy, Check, AlertCircle, Eye, EyeOff, Scissors, Trash2 } from 'lucide-react';

interface ContextCacheCreatorProps {
  onBack?: () => void;
}

const PRESET_MODELS = [
  { id: 'doubao-seed-1-8-251228', name: 'Doubao Seed 1.8' },
  { id: 'doubao-seed-1-6-251015', name: 'Doubao Seed 1.6' },
  { id: 'doubao-seed-1-6-lite-251015', name: 'Doubao Seed 1.6 Lite' },
  { id: 'doubao-seed-1-6-flash-250828', name: 'Doubao Seed 1.6 Flash' },
  { id: 'Doubao-Seed-1.6-thinking', name: 'Doubao Seed 1.6 Thinking' },
];

type PriceInfo = {
  storagePricePerKTokensPerHourText: string;
  hitPricePerKTokensText: string;
};

type ThinkingType = 'enabled' | 'disabled' | 'auto';

const MODEL_PRICE_BY_ID_LOWER: Record<string, PriceInfo> = {
  'doubao-seed-1-8-251228': {
    storagePricePerKTokensPerHourText: '0.000017 元/千tokens/小时',
    hitPricePerKTokensText: '0.00016 元/千tokens',
  },
  'doubao-seed-1-6-251015': {
    storagePricePerKTokensPerHourText: '0.000017 元/千tokens/小时',
    hitPricePerKTokensText: '0.00016 元/千tokens',
  },
  'doubao-seed-1-6-lite-251015': {
    storagePricePerKTokensPerHourText: '0.000017 元/千tokens/小时',
    hitPricePerKTokensText: '0.00006 元/千tokens',
  },
  'doubao-seed-1-6-flash-250828': {
    storagePricePerKTokensPerHourText: '0.000017 元/千tokens/小时',
    hitPricePerKTokensText: '0.00003 元/千tokens',
  },
  'doubao-seed-1.6-thinking': {
    storagePricePerKTokensPerHourText: '0.000017 元/千tokens/小时',
    hitPricePerKTokensText: '0.00016 元/千tokens',
  },
};

export const ContextCacheCreator: React.FC<ContextCacheCreatorProps> = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState(PRESET_MODELS[0].id);
  const [customModel, setCustomModel] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [thinkingType, setThinkingType] = useState<ThinkingType | 'none'>('disabled');
  const [ttl, setTtl] = useState(3600);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [apiKeyCut, setApiKeyCut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  const responseId: string | null = useMemo(() => {
    if (status !== 'success' || !result?.id) return null;
    return String(result.id);
  }, [result?.id, status]);

  const selectedModelId = useMemo(() => (useCustomModel ? customModel : model).trim(), [customModel, model, useCustomModel]);

  const selectedPriceInfo = useMemo(() => {
    if (!selectedModelId) return null;
    return MODEL_PRICE_BY_ID_LOWER[selectedModelId.toLowerCase()] ?? null;
  }, [selectedModelId]);

  const resultPriceInfo = useMemo(() => {
    if (!result?.model) return null;
    const id = String(result.model).toLowerCase();
    return MODEL_PRICE_BY_ID_LOWER[id] ?? null;
  }, [result?.model]);

  const handleCreate = async () => {
    if (!apiKey) {
      setErrorMsg('请输入 API Key');
      setStatus('error');
      return;
    }
    if (!content) {
      setErrorMsg('请输入缓存内容');
      setStatus('error');
      return;
    }

    if (!selectedModelId) {
      setErrorMsg('请选择或输入模型 ID');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setResult(null);

    try {
      const expireAt = Math.floor(Date.now() / 1000) + ttl;

      const requestBody: any = {
        model: selectedModelId,
        input: [{ role: 'system', content }],
        caching: { type: 'enabled', prefix: true },
        expire_at: expireAt,
      };

      // 仅当用户未选择 "none" 时，才添加 thinking 字段
      if (thinkingType !== 'none') {
        requestBody.thinking = { type: thinkingType };
      }

      const response = await fetch('/ark/api/v3/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody)
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (data?.error?.message) {
          throw new Error(data.error.message);
        }
        if (response.status === 405) {
          throw new Error('请求失败：405。当前环境可能未启用 /ark 代理（例如 vite preview 或静态部署）。请使用 npm run dev，或在部署环境为 /ark 配置反向代理。');
        }
        if (response.status === 502 || response.status === 504) {
          throw new Error(`请求失败：${response.status}。通常是因为请求内容过长导致 Vercel/网关超时。建议：\n1. 尝试使用本地开发模式 (npm run dev) 运行，本地代理无严格超时限制。\n2. 稍后重试或减少单次缓存内容。`);
        }
        throw new Error(`请求失败：${response.status} ${response.statusText}`);
      }

      setResult(data);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message === 'Failed to fetch' 
        ? '请求失败，可能是跨域(CORS)限制或网络问题。请检查控制台了解详情。' 
        : (err.message || '请求失败'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const cutApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setApiKey('');
    setApiKeyCut(true);
    setTimeout(() => setApiKeyCut(false), 2000);
  };

  const deleteCache = async () => {
    if (!responseId) return;
    if (!apiKey) {
      setDeleteMsg('请先输入 API Key');
      return;
    }

    setIsDeleting(true);
    setDeleteMsg('');
    try {
      const response = await fetch(`/ark/api/v3/responses/${encodeURIComponent(responseId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (data?.error?.message) {
          throw new Error(data.error.message);
        }
        throw new Error(`删除失败：${response.status} ${response.statusText}`);
      }

      setDeleteMsg('已停止（删除）该缓存');
    } catch (err: any) {
      console.error(err);
      setDeleteMsg(err?.message || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入您的火山引擎 API Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="inline-flex items-center justify-center w-10 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50"
              aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={copyApiKey}
              disabled={!apiKey}
              className="inline-flex items-center justify-center w-10 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="复制 API Key"
            >
              {apiKeyCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={cutApiKey}
              disabled={!apiKey}
              className="inline-flex items-center justify-center w-10 border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="剪切 API Key"
            >
              {apiKeyCut ? <Check className="h-4 w-4 text-green-600" /> : <Scissors className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
          <div className="flex gap-2">
            {!useCustomModel ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {PRESET_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="输入自定义模型 ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
            <button
              onClick={() => setUseCustomModel(!useCustomModel)}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              {useCustomModel ? '选择预设' : '自定义'}
            </button>
          </div>
          {selectedPriceInfo && (
            <div className="mt-2 text-xs text-gray-600">
              <div>存储：{selectedPriceInfo.storagePricePerKTokensPerHourText}</div>
              <div>命中：{selectedPriceInfo.hitPricePerKTokensText}</div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            thinking.type
            <span className="text-xs text-gray-500 ml-2">enabled / disabled / auto</span>
          </label>
          <select
            value={thinkingType}
            onChange={(e) => setThinkingType(e.target.value as ThinkingType | 'none')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="disabled">disabled：关闭思考模式（直接回答）</option>
            <option value="enabled">enabled：开启思考模式（一定先思考后回答）</option>
            <option value="auto">auto：自动思考（模型自主判断）</option>
            <option value="none">无 (默认)：不传该字段 (兼容不支持 thinking 的模型)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            过期时间 (秒)
            <span className="text-xs text-gray-500 ml-2">范围: 3600 - 259200 (1小时 - 3天)</span>
          </label>
          <input
            type="number"
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            min={3600}
            max={259200}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">缓存内容 (System Message)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入您想要缓存的前缀内容，例如角色设定、背景知识等..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={status === 'loading'}
          className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${status === 'loading' ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
        >
          {status === 'loading' && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
          创建前缀缓存
        </button>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-red-700">{errorMsg}</div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-green-900">创建成功</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-green-800 uppercase tracking-wider">响应 ID</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  readOnly
                  value={result.id}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => copyToClipboard(result.id)}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-green-800 uppercase tracking-wider">模型</label>
                <div className="mt-1 text-sm text-gray-900">{result.model}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-green-800 uppercase tracking-wider">过期时间戳</label>
                <div className="mt-1 text-sm text-gray-900">{result.expire_at ?? '-'}</div>
              </div>
            </div>

            {resultPriceInfo && (
              <div className="border-t border-green-200 pt-3 mt-3">
                <label className="text-xs font-medium text-green-800 uppercase tracking-wider">价格（缓存）</label>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>存储：{resultPriceInfo.storagePricePerKTokensPerHourText}</div>
                  <div>命中：{resultPriceInfo.hitPricePerKTokensText}</div>
                </div>
              </div>
            )}

            {result.usage && (
              <div className="border-t border-green-200 pt-3 mt-3">
                <label className="text-xs font-medium text-green-800 uppercase tracking-wider">用量</label>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>输入：{result.usage.input_tokens ?? '-'}</div>
                  <div>输出：{result.usage.output_tokens ?? '-'}</div>
                  <div>合计：{result.usage.total_tokens ?? '-'}</div>
                </div>
              </div>
            )}

            <div className="border-t border-green-200 pt-3 mt-3 space-y-2">
              <button
                type="button"
                onClick={deleteCache}
                disabled={!responseId || isDeleting}
                className="inline-flex items-center justify-center w-full px-4 py-2 border border-red-200 rounded-md bg-white text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> : <Trash2 className="-ml-1 mr-2 h-4 w-4" />}
                停止（删除）缓存
              </button>
              {deleteMsg && <div className="text-xs text-gray-700">{deleteMsg}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
