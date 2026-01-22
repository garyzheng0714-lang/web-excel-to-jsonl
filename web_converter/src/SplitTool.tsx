import React, { useState, useRef, useEffect } from 'react';
import { FileDown, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';
import { cn } from './lib/utils';
import SplitWorker from './splitWorker?worker';

interface ZipFile {
  name: string;
  blob: Blob;
}

export function SplitTool() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldSplit, setShouldSplit] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<ZipFile[]>([]);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [fileRowCount, setFileRowCount] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new SplitWorker();
    
    workerRef.current.onmessage = (e) => {
      const { type, processed, total, files, error: workerError, debug, rowCount } = e.data;
      
      if (type === 'fileInfo') {
        setFileRowCount(rowCount);
      } else if (type === 'progress') {
        setProgress(processed);
        setTotalChunks(total);
        if (debug) {
            setDebugInfo(prev => [...prev, debug]);
        }
      } else if (type === 'complete') {
        setGeneratedFiles(files);
        setIsProcessing(false);
        setProgress(0);
        setTotalChunks(0);
      } else if (type === 'error') {
        setError(workerError);
        setIsProcessing(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('请上传 CSV 文件');
      return;
    }

    setError(null);
    setGeneratedFiles([]);
    setDebugInfo([]);
    setFileRowCount(null);
    setIsProcessing(true);
    setProgress(0);
    setTotalChunks(0);
    
    workerRef.current?.postMessage({ type: 'file', file, shouldSplit });
  };

  const handleDownload = (file: ZipFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-label">拆分模式</label>
            <div className="flex gap-4 p-4 surface-elevated rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="splitMode"
                  checked={shouldSplit} 
                  onChange={() => setShouldSplit(true)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-body">20K 行 / 块</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="splitMode"
                  checked={!shouldSplit} 
                  onChange={() => setShouldSplit(false)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-body">不拆分 (仅格式化)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-label">上传 CSV</label>
            <div
              className={cn(
                "upload-zone group",
                isDragOver && "drag-over"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('split-file-upload')?.click()}
            >
              <input
                id="split-file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <div className="w-14 h-14 rounded-xl bg-app-subtle group-hover:bg-accent flex items-center justify-center mb-4 transition-all group-hover:scale-110">
                <FileSpreadsheet className="w-6 h-6 text-fg-muted group-hover:text-white transition-colors" />
              </div>
              <p className="text-headline">
                {isDragOver ? '释放以上传' : '拖放 CSV 至此'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {fileRowCount !== null && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-soft text-accent">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
              <span className="text-body font-medium">检测到 {fileRowCount.toLocaleString()} 行</span>
            </div>
          )}

          {isProcessing && (
            <div className="surface-elevated p-6 rounded-xl text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-accent" />
              <p className="text-headline">处理中...</p>
              {totalChunks > 0 && (
                <p className="text-caption">正在生成块 {progress} / {totalChunks}</p>
              )}
              <div className="progress-bar">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-danger-soft border border-danger/20 text-danger">
              <p className="text-label text-danger mb-1">错误</p>
              <p className="text-body">{error}</p>
            </div>
          )}

          {generatedFiles.length > 0 && (
            <div className="surface-elevated rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-success-soft">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-headline font-medium">完成 ({generatedFiles.length} 文件)</span>
                </div>
              </div>
              <div className="divide-y divide-border-subtle max-h-[300px] overflow-y-auto">
                {generatedFiles.map((file, index) => (
                  <div key={index} className="p-4 hover:bg-app-subtle flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileSpreadsheet className="w-5 h-5 text-success flex-shrink-0" />
                      <p className="text-body font-medium truncate">{file.name}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(file)}
                      className="btn-ghost p-2 rounded-lg"
                      title="下载"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {debugInfo.length > 0 && (
        <div className="pt-6 border-t border-border-subtle">
          <h3 className="text-label mb-4">调试信息</h3>
          <div className="overflow-x-auto surface rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-subtle text-fg-muted">
                <tr>
                  <th className="p-3">块</th>
                  <th className="p-3">范围</th>
                  <th className="p-3">首值</th>
                  <th className="p-3">末值</th>
                </tr>
              </thead>
              <tbody className="text-fg-secondary">
                {debugInfo.map((info, idx) => (
                  <tr key={idx} className="border-b border-border-subtle last:border-0 hover:bg-app-subtle">
                    <td className="p-3 font-medium">{info.chunkIndex + 1}</td>
                    <td className="p-3 text-mono">{info.startLine}-{info.endLine}</td>
                    <td className="p-3 max-w-[200px] truncate text-mono" title={info.firstVal}>{info.firstVal}</td>
                    <td className="p-3 max-w-[200px] truncate text-mono" title={info.lastVal}>{info.lastVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
