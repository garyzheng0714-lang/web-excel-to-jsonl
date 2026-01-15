
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
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CSV 拆分工具（产品榜导入专用）</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          自动将 CSV 转换为 XLSX，插入空行，并可选按 10000 行拆分打包
        </p>
      </div>

      {/* Options */}
      <div className="flex justify-center items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input 
                  type="radio" 
                  name="splitMode"
                  checked={shouldSplit} 
                  onChange={() => setShouldSplit(true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700 font-medium">按 10000 行拆分</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input 
                  type="radio" 
                  name="splitMode"
                  checked={!shouldSplit} 
                  onChange={() => setShouldSplit(false)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-gray-700 font-medium">不拆分 (仅按产品榜上传格式规范修改)</span>
          </label>
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          "relative group cursor-pointer",
          "border-3 border-dashed rounded-3xl transition-all duration-300 ease-out",
          "flex flex-col items-center justify-center p-12 text-center",
          "bg-white shadow-sm hover:shadow-md",
          isDragOver 
            ? "border-blue-500 bg-blue-50 scale-[1.01]" 
            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
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
        
        <div className={cn(
          "p-6 rounded-full mb-6 transition-all duration-300",
          isDragOver ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
        )}>
          <FileSpreadsheet className="w-12 h-12" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isDragOver ? '释放文件以开始' : '点击或拖拽 CSV 文件'}
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          支持 .csv 格式，将自动拆分并打包下载
        </p>
      </div>

      {fileRowCount !== null && (
        <div className="text-center animate-in fade-in slide-in-from-top-2">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium text-sm">
                <span className="mr-2">📊</span>
                检测到 {fileRowCount.toLocaleString()} 行数据
            </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-mono overflow-auto max-h-60">
              <h3 className="font-bold mb-2">调试信息 (请检查首尾数据是否重复)</h3>
              <table className="w-full text-left">
                  <thead>
                      <tr>
                          <th className="p-1">Chunk</th>
                          <th className="p-1">Range</th>
                          <th className="p-1">First Row (Col 1)</th>
                          <th className="p-1">Last Row (Col 1)</th>
                      </tr>
                  </thead>
                  <tbody>
                      {debugInfo.map((info, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                              <td className="p-1">{info.chunkIndex + 1}</td>
                              <td className="p-1">{info.startLine}-{info.endLine}</td>
                              <td className="p-1">{info.firstVal}</td>
                              <td className="p-1">{info.lastVal}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* Status & Results */}
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isProcessing && (
          <div className="p-8 bg-white border border-gray-100 rounded-xl shadow-sm space-y-4 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <div>
              <p className="font-medium text-gray-900">正在处理...</p>
              {totalChunks > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  正在生成第 {progress} / {totalChunks} 个分卷
                </p>
              )}
            </div>
          </div>
        )}

        {generatedFiles.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                处理完成 ({generatedFiles.length} 个文件)
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {generatedFiles.map((file, index) => (
                <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        包含 "产品榜导入信息.xlsx"
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(file)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                  >
                    <FileDown className="w-4 h-4" />
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
