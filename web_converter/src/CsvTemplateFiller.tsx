import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Play, Download, Loader2, Plus, FileCheck } from 'lucide-react';
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

  const readOpfsFile = async (filename: string): Promise<File> => {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename);
    return await fileHandle.getFile();
  };

  const saveFileToDisk = async (opfsFile: File, outputName: string) => {
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
              setHeaders(Object.keys(results.data[0] as any));
            }
          }
        });
      } else {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className={cn(
        "upload-zone group",
        file && "has-file"
      )}>
        {!file ? (
          <>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-app-subtle group-hover:bg-accent group-hover:scale-110 transition-all">
              <Upload className="w-7 h-7 text-fg-muted group-hover:text-white transition-colors" />
            </div>
            <p className="text-headline text-center">点击上传 CSV / Excel 文件</p>
            <p className="text-caption mt-2">支持 .csv, .xlsx, .xls</p>
          </>
        ) : (
          <div className="w-full flex items-center gap-5 p-2">
            <div className="w-14 h-14 rounded-xl bg-success-soft flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-headline truncate">{file.name}</p>
              <p className="text-caption mt-1">{formatFileSize(file.size)}</p>
            </div>
            <button onClick={handleRemoveFile} className="btn-ghost w-10 h-10 p-0 rounded-lg flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-headline">模板编辑</label>
              <span className="text-caption">支持变量引用</span>
            </div>
            <textarea
              ref={textareaRef}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="请输入模板内容，例如：你好，我是{{姓名}}，今年{{年龄}}岁。"
              className="input w-full h-64 resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-headline">可用变量</label>
              <span className="text-caption">点击插入</span>
            </div>
            <div className="surface p-4 h-64 overflow-y-auto rounded-xl flex flex-wrap gap-2 content-start">
              {headers.length > 0 ? (
                headers.map(h => (
                  <button
                    key={h}
                    onClick={() => insertVariable(h)}
                    className="chip hover:bg-accent-soft hover:text-accent transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    {h}
                  </button>
                ))
              ) : (
                <p className="text-caption">未检测到表头</p>
              )}
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={startProcessing}
              disabled={status === 'processing' || !template}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              开始生成
            </button>
            
            {status === 'completed' && (
              <button
                onClick={handleDownload}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                下载结果 CSV
              </button>
            )}
          </div>

          {status === 'processing' && (
            <div className="space-y-3">
              <div className="progress-bar">
                <div className="progress-bar-fill"></div>
              </div>
              <p className="text-caption text-center">已处理: {progress} 行</p>
            </div>
          )}

          {status === 'completed' && (
            <div className="p-4 rounded-xl bg-success-soft border border-success/20 text-success flex items-center gap-3">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-body font-medium">处理完成！共生成 {progress} 行数据。</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 rounded-xl bg-danger-soft border border-danger/20 text-danger">
              <p className="text-label text-danger mb-1">错误</p>
              <p className="text-body">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
