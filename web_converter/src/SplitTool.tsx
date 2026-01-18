import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileDown, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';
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
      setError('Please upload a CSV file');
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
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="space-y-1">
                <label className="text-label">拆分模式</label>
                <div className="flex gap-4 p-4 border border-slate-200 bg-white">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input 
                            type="radio" 
                            name="splitMode"
                            checked={shouldSplit} 
                            onChange={() => setShouldSplit(true)}
                            className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                        />
                        <span className="text-sm font-mono text-slate-900">20K 行 / 块</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input 
                            type="radio" 
                            name="splitMode"
                            checked={!shouldSplit} 
                            onChange={() => setShouldSplit(false)}
                            className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                        />
                        <span className="text-sm font-mono text-slate-900">不拆分 (仅格式化)</span>
                    </label>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-label">上传 CSV</label>
                <div
                    className={cn(
                    "group relative w-full h-48 border-2 border-dashed border-slate-300 hover:border-slate-900 transition-colors bg-white flex flex-col items-center justify-center cursor-pointer",
                    isDragOver && "border-slate-900 bg-slate-50"
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
                    
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-4 group-hover:text-slate-900 transition-colors" />
                    <p className="font-mono text-sm font-bold text-slate-900">
                    {isDragOver ? '释放以上传' : '拖放 CSV 至此'}
                    </p>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            {fileRowCount !== null && (
                <div className="p-4 border border-blue-200 bg-blue-50 text-blue-800 font-mono text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    检测到 {fileRowCount.toLocaleString()} 行
                </div>
            )}

            {isProcessing && (
                <div className="p-6 border border-slate-200 bg-slate-50 text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                    <p className="font-mono text-sm font-bold">处理中...</p>
                    {totalChunks > 0 && (
                        <p className="font-mono text-xs text-slate-500">正在生成块 {progress} / {totalChunks}</p>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 border-2 border-red-500 bg-red-50 text-red-600 font-mono text-sm">
                    <p className="font-bold">错误：</p>
                    <p>{error}</p>
                </div>
            )}

            {generatedFiles.length > 0 && (
                <div className="border-2 border-emerald-500 bg-emerald-50">
                    <div className="p-4 border-b border-emerald-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="font-mono font-bold text-sm text-emerald-800">完成 ({generatedFiles.length} 文件)</span>
                        </div>
                    </div>
                    <div className="divide-y divide-emerald-100 max-h-[300px] overflow-y-auto">
                        {generatedFiles.map((file, index) => (
                            <div key={index} className="p-3 hover:bg-emerald-100/50 flex items-center justify-between group transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs font-bold text-emerald-900 truncate">{file.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDownload(file)}
                                    className="p-2 hover:bg-emerald-200 text-emerald-700 transition-colors"
                                    title="Download"
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
        <div className="mt-8 border-t-2 border-slate-100 pt-6">
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">调试信息</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                    <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="py-2 pr-4">块</th>
                            <th className="py-2 pr-4">范围</th>
                            <th className="py-2 pr-4">首值</th>
                            <th className="py-2">末值</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {debugInfo.map((info, idx) => (
                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="py-2 pr-4 font-bold">{info.chunkIndex + 1}</td>
                                <td className="py-2 pr-4">{info.startLine}-{info.endLine}</td>
                                <td className="py-2 pr-4 max-w-[200px] truncate" title={info.firstVal}>{info.firstVal}</td>
                                <td className="py-2 max-w-[200px] truncate" title={info.lastVal}>{info.lastVal}</td>
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
