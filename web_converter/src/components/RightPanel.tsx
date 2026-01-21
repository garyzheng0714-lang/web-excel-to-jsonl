import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

type HistoryItem = {
  id: string;
  createdAt: number;
  outputName: string;
  processedCount: number;
  sizeBytes?: number;
};

type RightPanelProps = {
  history: HistoryItem[];
  onPreview: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem) => void;
  onClear: () => void;
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatBytes(bytes?: number) {
  if (bytes === undefined) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function RightPanel({ history, onPreview, onDownload, onClear }: RightPanelProps) {
  const recentItems = history.slice(0, 3);
  const historyItems = history.slice(3);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  return (
    <aside className="space-y-8">
      <div className="swiss-card p-6 space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider">最近结果</h3>
            <p className="text-xs text-slate-400">最近 3 条记录</p>
          </div>
          <button
            onClick={onClear}
            className="text-xs font-mono underline decoration-slate-300 hover:decoration-slate-900 text-slate-500"
          >
            清空
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center border-t border-b border-slate-100">
            <p className="font-mono text-xs text-slate-400">无活动</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recentItems.map((item) => (
              <div key={item.id} className="border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] text-slate-400 mb-1">{formatTime(item.createdAt)}</p>
                    <p className="font-medium text-sm text-slate-900 leading-tight break-all">{item.outputName}</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-500">
                    <p>{item.processedCount} rows</p>
                    <p>{formatBytes(item.sizeBytes)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => onPreview(item)}
                    className="text-[10px] font-mono font-bold text-slate-500 hover:text-[#ff4d00] uppercase flex items-center gap-1"
                  >
                    查看 <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDownload(item)}
                    className="text-[10px] font-mono font-bold text-slate-500 hover:text-[#ff4d00] uppercase"
                  >
                    保存
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs uppercase tracking-wider text-slate-400">历史记录</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-slate-400">{historyItems.length} 条</span>
              <button
                onClick={() => setIsHistoryCollapsed((prev) => !prev)}
                className="text-[10px] font-mono font-bold text-slate-500 hover:text-[#ff4d00] uppercase"
              >
                {isHistoryCollapsed ? '展开' : '收起'}
              </button>
            </div>
          </div>
          {!isHistoryCollapsed && (
            historyItems.length === 0 ? (
              <div className="py-4 text-center font-mono text-[10px] text-slate-400">暂无更多记录</div>
            ) : (
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative border-l-2 border-slate-200 pl-4 py-1 hover:border-slate-900 transition-colors"
                  >
                    <p className="font-mono text-[10px] text-slate-400 mb-1">{formatTime(item.createdAt)}</p>
                    <p className="font-medium text-sm text-slate-900 leading-tight mb-2 break-all">{item.outputName}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onPreview(item)}
                        className="text-[10px] font-mono font-bold text-slate-500 hover:text-[#ff4d00] uppercase flex items-center gap-1"
                      >
                        查看 <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDownload(item)}
                        className="text-[10px] font-mono font-bold text-slate-500 hover:text-[#ff4d00] uppercase"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-900 text-white">
        <h3 className="font-mono font-bold text-sm uppercase tracking-wider mb-4 text-slate-400">快速链接</h3>
        <div className="space-y-3 font-mono text-xs">
          <a
            href="https://console.volcengine.com/tos/bucket"
            target="_blank"
            className="block hover:text-[#ff4d00] transition-colors"
          >
            → 火山引擎对象存储
          </a>
          <a
            href="https://console.volcengine.com/ark/region:ark+cn-beijing/batchInference"
            target="_blank"
            className="block hover:text-[#ff4d00] transition-colors"
          >
            → 批量推理
          </a>
        </div>
      </div>
    </aside>
  );
}
