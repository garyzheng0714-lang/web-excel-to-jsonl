import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, Play, Download, Loader2, Plus } from 'lucide-react';
import { cn } from './lib/utils';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import CsvTemplateWorker from './csvTemplateWorker?worker';
import streamSaver from 'streamsaver';

export function CsvTemplateFiller() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [template, setTemplate] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [tempFilename, setTempFilename] = useState('');
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to read OPFS file
  const readOpfsFile = async (filename: string): Promise<File> => {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename);
    return await fileHandle.getFile();
  };

  // Helper to save file
  const saveFileToDisk = async (opfsFile: File, outputName: string) => {
    // Try native file system API
    const anyWindow = window as any;
    if (typeof anyWindow.showSaveFilePicker === 'function') {
      try {
        const handle = await anyWindow.showSaveFilePicker({
          suggestedName: outputName,
          types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }],
        });
        const writable = await handle.createWritable();
        await opfsFile.stream().pipeTo(writable);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // Fallback to streamSaver
      }
    }

    const fileStream = streamSaver.createWriteStream(outputName, { size: opfsFile.size });
    await opfsFile.stream().pipeTo(fileStream);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus('idle');
    setProgress(0);
    setTempFilename('');
    setError('');
    
    // Parse headers
    try {
        if (f.name.endsWith('.csv')) {
            Papa.parse(f, {
                preview: 1,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.meta.fields) {
                        setHeaders(results.meta.fields);
                    } else if (results.data.length > 0) {
                        // Fallback if no header found but data exists
                        setHeaders(Object.keys(results.data[0] as any));
                    }
                }
            });
        } else {
            // Excel
            const buffer = await f.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (json.length > 0) {
                setHeaders(json[0] as string[]);
            }
        }
    } catch (err) {
        console.error("Error reading headers:", err);
        setError("无法读取文件表头，请检查文件格式。");
    }
  };

  const insertVariable = (header: string) => {
      const tag = `{{${header}}}`;
      if (textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          const text = template;
          const newText = text.substring(0, start) + tag + text.substring(end);
          setTemplate(newText);
          // Restore focus and cursor
          setTimeout(() => {
              textareaRef.current?.focus();
              textareaRef.current?.setSelectionRange(start + tag.length, start + tag.length);
          }, 0);
      } else {
          setTemplate(prev => prev + tag);
      }
  };

  const startProcessing = () => {
      if (!file) return;
      setStatus('processing');
      setProgress(0);
      setError('');
      
      workerRef.current = new CsvTemplateWorker();
      workerRef.current.onmessage = (e) => {
          const { type, processed, tempFilename, error } = e.data;
          if (type === 'progress') {
              setProgress(processed);
          } else if (type === 'complete') {
              setStatus('completed');
              setProgress(processed);
              setTempFilename(tempFilename);
              workerRef.current?.terminate();
          } else if (type === 'error') {
              setStatus('error');
              setError(error);
              workerRef.current?.terminate();
          }
      };
      
      workerRef.current.postMessage({ file, template });
  };

  const handleDownload = async () => {
      if (!tempFilename || !file) return;
      try {
          const opfsFile = await readOpfsFile(tempFilename);
          const outputName = file.name.replace(/\.[^/.]+$/, "") + "_filled.csv";
          await saveFileToDisk(opfsFile, outputName);
      } catch (err: any) {
          setError("下载失败: " + err.message);
      }
  };

  const handleRemoveFile = () => {
      setFile(null);
      setHeaders([]);
      setStatus('idle');
      setTemplate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        {/* Upload Area */}
        <div className="group relative w-full h-48 border-2 border-dashed border-slate-300 hover:border-slate-900 transition-colors bg-white flex flex-col items-center justify-center cursor-pointer">
            {!file ? (
            <>
                <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-12 h-12 text-slate-300 mb-4 group-hover:text-slate-900 transition-colors" />
                <p className="font-mono text-sm font-bold text-slate-900">点击上传 CSV / Excel 文件</p>
            </>
            ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 relative">
                <button onClick={handleRemoveFile} className="absolute top-4 right-4 p-2 hover:bg-slate-200 rounded-none transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <FileSpreadsheet className="w-12 h-12 text-slate-900 mb-4" />
                <p className="font-mono text-lg font-bold text-slate-900">{file.name}</p>
                <p className="font-mono text-sm text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            )}
        </div>

        {file && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Template Editor */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="font-mono font-bold text-lg">模板编辑</label>
                        <span className="text-xs text-slate-500 font-mono">支持变量引用</span>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        placeholder="请输入模板内容，例如：你好，我是{{姓名}}，今年{{年龄}}岁。"
                        className="w-full h-64 p-4 border-2 border-slate-200 focus:border-slate-900 outline-none font-mono text-sm resize-none"
                    />
                </div>

                {/* Variables List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="font-mono font-bold text-lg">可用变量</label>
                        <span className="text-xs text-slate-500 font-mono">点击插入</span>
                    </div>
                    <div className="bg-slate-50 p-4 h-64 overflow-y-auto border-2 border-slate-200 content-start flex flex-wrap gap-2">
                        {headers.length > 0 ? (
                            headers.map(h => (
                                <button
                                    key={h}
                                    onClick={() => insertVariable(h)}
                                    className="px-3 py-1 bg-white border border-slate-300 hover:border-slate-900 hover:bg-slate-100 text-sm font-mono transition-colors flex items-center gap-1 group"
                                >
                                    <Plus className="w-3 h-3 text-slate-400 group-hover:text-slate-900" />
                                    {h}
                                </button>
                            ))
                        ) : (
                            <p className="text-slate-400 font-mono text-sm">未检测到表头</p>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Action Bar */}
        {file && (
            <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                    <button
                        onClick={startProcessing}
                        disabled={status === 'processing' || !template}
                        className={cn(
                            "flex-1 btn-swiss-primary flex items-center justify-center gap-2",
                            (status === 'processing' || !template) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        开始生成
                    </button>
                    
                    {status === 'completed' && (
                        <button
                            onClick={handleDownload}
                            className="flex-1 btn-swiss-outline flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            下载结果 CSV
                        </button>
                    )}
                </div>

                {/* Status Display */}
                {status === 'processing' && (
                    <div className="w-full bg-slate-100 h-2 overflow-hidden relative">
                         <div className="absolute inset-0 bg-slate-200"></div>
                         <div 
                            className="h-full bg-[#ff4d00] transition-all duration-300"
                            style={{ width: `${Math.min(100, (progress / 100) * 10)}%` }} // Fake percentage or need total rows
                         ></div>
                         {/* Since we don't know total rows easily without full parse, we show processed count */}
                         <p className="absolute top-4 left-0 font-mono text-xs text-slate-500">已处理: {progress} 行</p>
                    </div>
                )}

                {status === 'completed' && (
                    <div className="p-4 bg-[#f0fff4] border border-[#22c55e] text-[#15803d] font-mono text-sm flex items-center gap-2">
                         <div className="w-2 h-2 bg-[#22c55e] rounded-full"></div>
                         处理完成！共生成 {progress} 行数据。
                    </div>
                )}

                {status === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-500 text-red-600 font-mono text-sm">
                        错误: {error}
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
