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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Input Form */}
        <div className="space-y-6">
            <div className="space-y-1">
                <label className="text-label">火山引擎 API KEY</label>
                <div className="flex gap-2">
                    <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="swiss-input"
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="btn-swiss-outline px-3" aria-label="Toggle Visibility">
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <div className="flex gap-2 mt-2 justify-end">
                    <button onClick={copyApiKey} disabled={!apiKey} className="text-xs font-mono text-slate-400 hover:text-slate-900 uppercase">复制</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={cutApiKey} disabled={!apiKey} className="text-xs font-mono text-slate-400 hover:text-slate-900 uppercase">剪切</button>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-label">模型选择</label>
                <div className="flex gap-2 items-center">
                    {!useCustomModel ? (
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="swiss-input bg-transparent"
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
                        className="swiss-input"
                    />
                    )}
                    <button
                        onClick={() => setUseCustomModel(!useCustomModel)}
                        className="text-xs font-mono underline decoration-slate-300 hover:decoration-slate-900 text-slate-500 whitespace-nowrap ml-2"
                    >
                        {useCustomModel ? '使用预设' : '自定义'}
                    </button>
                </div>
                {selectedPriceInfo && (
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                        存储费: {selectedPriceInfo.storagePricePerKTokensPerHourText} · 命中费: {selectedPriceInfo.hitPricePerKTokensText}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-label">思考模式</label>
                    <select
                        value={thinkingType}
                        onChange={(e) => setThinkingType(e.target.value as ThinkingType | 'none')}
                        className="swiss-input bg-transparent"
                    >
                        <option value="disabled">禁用</option>
                        <option value="enabled">启用</option>
                        <option value="auto">自动</option>
                        <option value="none">无</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-label">TTL (秒)</label>
                    <input
                        type="number"
                        value={ttl}
                        onChange={(e) => setTtl(Number(e.target.value))}
                        min={3600}
                        max={259200}
                        className="swiss-input"
                    />
                    <p className="text-[10px] font-mono text-slate-400 mt-1">3600 - 259200</p>
                </div>
            </div>
        </div>

        {/* Right Column: Content & Action */}
        <div className="space-y-6 flex flex-col h-full">
            <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-label">系统提示内容</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="输入上下文内容..."
                    className="swiss-input flex-1 min-h-[200px] resize-none border-2 border-slate-200 focus:border-slate-900 p-4 text-sm font-mono leading-relaxed"
                />
            </div>
            
            <button
                onClick={handleCreate}
                disabled={status === 'loading'}
                className="btn-swiss-primary w-full"
            >
                {status === 'loading' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                {status === 'loading' ? '创建中...' : '生成上下文缓存'}
            </button>
        </div>
      </div>

      {/* Result Area */}
      {status === 'error' && (
        <div className="p-4 border-2 border-red-500 bg-red-50 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="font-mono text-sm text-red-700 font-bold">{errorMsg}</div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="border-2 border-emerald-500 bg-emerald-50 p-6 mt-8">
          <div className="flex items-center justify-between mb-6 border-b border-emerald-200 pb-4">
            <h3 className="font-mono font-bold text-lg text-emerald-800">缓存创建成功</h3>
            <div className="px-2 py-1 bg-emerald-200 text-emerald-900 font-mono text-xs font-bold">200 OK</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="group">
                    <label className="text-[10px] font-mono font-bold text-emerald-700 uppercase mb-1 block">响应 ID</label>
                    <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-white px-2 py-1 border border-emerald-200 flex-1 truncate select-all">
                            {result.id}
                        </code>
                        <button onClick={() => copyToClipboard(result.id)} className="text-emerald-600 hover:text-emerald-900">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-mono font-bold text-emerald-700 uppercase mb-1 block">模型</label>
                        <p className="font-mono text-sm text-emerald-900">{result.model}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-mono font-bold text-emerald-700 uppercase mb-1 block">过期时间</label>
                        <p className="font-mono text-sm text-emerald-900">{result.expire_at ?? '-'}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {result.usage && (
                    <div>
                        <label className="text-[10px] font-mono font-bold text-emerald-700 uppercase mb-1 block">Token 使用量</label>
                        <div className="grid grid-cols-3 gap-2 font-mono text-xs text-emerald-800">
                            <div className="bg-white/50 p-2 border border-emerald-100">
                                <span className="block text-emerald-500 text-[10px]">输入</span>
                                {result.usage.input_tokens ?? '-'}
                            </div>
                            <div className="bg-white/50 p-2 border border-emerald-100">
                                <span className="block text-emerald-500 text-[10px]">输出</span>
                                {result.usage.output_tokens ?? '-'}
                            </div>
                            <div className="bg-white/50 p-2 border border-emerald-100 font-bold">
                                <span className="block text-emerald-500 text-[10px]">总计</span>
                                {result.usage.total_tokens ?? '-'}
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-emerald-200">
                    <button
                        onClick={deleteCache}
                        disabled={!responseId || isDeleting}
                        className="text-xs font-mono font-bold text-red-500 hover:text-red-700 flex items-center gap-2"
                    >
                        {isDeleting ? <Loader2 className="animate-spin h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                        停止 / 删除缓存
                    </button>
                    {deleteMsg && <p className="text-xs font-mono text-slate-500 mt-1">{deleteMsg}</p>}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
