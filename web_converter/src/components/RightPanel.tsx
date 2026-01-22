import React, { useState } from 'react';
import { ArrowUpRight, Download, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

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
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (isToday) return `今天 ${time}`;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${time}`;
}

function formatBytes(bytes?: number) {
  if (bytes === undefined) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
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
  const olderItems = history.slice(3);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className="space-y-6">
      <div className="surface-elevated p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-headline">最近结果</h3>
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="btn-ghost px-2 py-1 text-caption hover:text-danger"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-app-subtle flex items-center justify-center">
              <Download className="w-5 h-5 text-fg-faint" />
            </div>
            <p className="text-caption">暂无转换结果</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <div 
                key={item.id} 
                className="group p-4 rounded-lg bg-app-subtle hover:bg-app-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium truncate">{item.outputName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-caption">{formatTime(item.createdAt)}</span>
                      <span className="text-fg-faint">•</span>
                      <span className="text-caption">{formatBytes(item.sizeBytes)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview(item)}
                    className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    预览
                  </button>
                  <button
                    onClick={() => onDownload(item)}
                    className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    保存
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {olderItems.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border-subtle">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-caption hover:text-fg-secondary transition-colors"
            >
              <span>{olderItems.length} 条更早记录</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {isExpanded && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {olderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-app-subtle transition-colors cursor-pointer group"
                    onClick={() => onPreview(item)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body truncate">{item.outputName}</p>
                      <p className="text-caption">{formatTime(item.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(item);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost p-2"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="surface p-5">
        <h3 className="text-label mb-4">快速链接</h3>
        <div className="space-y-2">
          <a
            href="https://console.volcengine.com/tos/bucket"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-app-subtle transition-colors text-body"
          >
            <ExternalLink className="w-4 h-4 text-fg-muted" />
            火山引擎对象存储
          </a>
          <a
            href="https://console.volcengine.com/ark/region:ark+cn-beijing/batchInference"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg hover:bg-app-subtle transition-colors text-body"
          >
            <ExternalLink className="w-4 h-4 text-fg-muted" />
            批量推理控制台
          </a>
        </div>
      </div>
    </aside>
  );
}
