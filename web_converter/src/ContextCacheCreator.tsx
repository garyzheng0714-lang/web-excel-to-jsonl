import React, { useMemo, useState } from 'react';
import { Loader2, Copy, Check, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from './lib/utils';

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
          throw new Error('请求失败：405。当前环境可能未启用 /ark 代理。');
        }
        if (response.status === 502 || response.status === 504) {
          throw new Error(`请求失败：${response.status}。建议使用本地开发模式。`);
        }
        throw new Error(`请求失败：${response.status} ${response.statusText}`);
      }

      setResult(data);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message === 'Failed to fetch' 
        ? '请求失败，可能是网络问题。' 
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

      setDeleteMsg('已停止该缓存');
    } catch (err: any) {
      console.error(err);
      setDeleteMsg(err?.message || '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-label">火山引擎 API KEY</label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="input flex-1"
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="btn-secondary px-3">
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-3 mt-2 justify-end">
              <button onClick={copyApiKey} disabled={!apiKey} className="text-caption hover:text-fg-primary transition-colors">
                {apiKeyCopied ? '已复制' : '复制'}
              </button>
              <span className="text-fg-faint">|</span>
              <button onClick={cutApiKey} disabled={!apiKey} className="text-caption hover:text-fg-primary transition-colors">
                {apiKeyCut ? '已剪切' : '剪切'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-label">模型选择</label>
            <div className="flex gap-2 items-center">
              {!useCustomModel ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input flex-1"
                >
                  {PRESET_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="ep-..."
                  className="input flex-1"
                />
              )}
              <button
                onClick={() => setUseCustomModel(!useCustomModel)}
                className="text-caption hover:text-accent transition-colors whitespace-nowrap"
              >
                {useCustomModel ? '使用预设' : '自定义'}
              </button>
            </div>
            {selectedPriceInfo && (
              <p className="text-caption mt-1">
                存储: {selectedPriceInfo.storagePricePerKTokensPerHourText} · 命中: {selectedPriceInfo.hitPricePerKTokensText}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-label">思考模式</label>
              <select
                value={thinkingType}
                onChange={(e) => setThinkingType(e.target.value as ThinkingType | 'none')}
                className="input"
              >
                <option value="disabled">禁用</option>
                <option value="enabled">启用</option>
                <option value="auto">自动</option>
                <option value="none">无</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-label">TTL (秒)</label>
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                min={3600}
                max={259200}
                className="input"
              />
              <p className="text-caption">3600 - 259200</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-label">系统提示内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入上下文内容..."
              className="input flex-1 min-h-[200px] resize-none"
            />
          </div>
          
          <button
            onClick={handleCreate}
            disabled={status === 'loading'}
            className="btn-primary w-full"
          >
            {status === 'loading' && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {status === 'loading' ? '创建中...' : '生成上下文缓存'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="p-4 rounded-xl bg-danger-soft border border-danger/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-body text-danger">{errorMsg}</p>
        </div>
      )}

      {status === 'success' && result && (
        <div className="surface-elevated rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-success-soft">
            <h3 className="text-headline text-success">缓存创建成功</h3>
            <span className="chip bg-success text-white">200 OK</span>
          </div>
          
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-label mb-2 block">响应 ID</label>
                <div className="flex items-center gap-2">
                  <code className="text-mono bg-app-subtle px-3 py-2 rounded-lg flex-1 truncate select-all">
                    {result.id}
                  </code>
                  <button onClick={() => copyToClipboard(result.id)} className="btn-ghost p-2">
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label mb-1 block">模型</label>
                  <p className="text-body">{result.model}</p>
                </div>
                <div>
                  <label className="text-label mb-1 block">过期时间</label>
                  <p className="text-mono">{result.expire_at ?? '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {result.usage && (
                <div>
                  <label className="text-label mb-2 block">Token 使用量</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="surface p-3 rounded-lg text-center">
                      <span className="text-caption block mb-1">输入</span>
                      <span className="text-mono font-medium">{result.usage.input_tokens ?? '-'}</span>
                    </div>
                    <div className="surface p-3 rounded-lg text-center">
                      <span className="text-caption block mb-1">输出</span>
                      <span className="text-mono font-medium">{result.usage.output_tokens ?? '-'}</span>
                    </div>
                    <div className="surface p-3 rounded-lg text-center">
                      <span className="text-caption block mb-1">总计</span>
                      <span className="text-mono font-semibold">{result.usage.total_tokens ?? '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border-subtle">
                <button
                  onClick={deleteCache}
                  disabled={!responseId || isDeleting}
                  className="text-caption text-danger hover:text-danger/80 flex items-center gap-2 transition-colors"
                >
                  {isDeleting ? <Loader2 className="animate-spin h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                  停止 / 删除缓存
                </button>
                {deleteMsg && <p className="text-caption mt-2">{deleteMsg}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
