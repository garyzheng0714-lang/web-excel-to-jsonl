import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileType, X, Loader2, Download, Trash2, FileSpreadsheet, FileJson, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import streamSaver from 'streamsaver';

type HistoryItem = {
  id: string;
  createdAt: number;
  inputName: string;
  outputName: string;
  opfsFilename: string;
  processedCount: number;
  warnings: string[];
  sizeBytes?: number;
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

async function readOpfsFile(opfsFilename: string): Promise<File> {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(opfsFilename);
  return await fileHandle.getFile();
}

async function deleteOpfsFile(opfsFilename: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(opfsFilename);
}

async function saveFileToDisk(opfsFile: File, outputName: string) {
    const anyWindow = window as any;
    if (typeof anyWindow.showSaveFilePicker === 'function') {
      try {
        const lower = outputName.toLowerCase();
        const isXlsx = lower.endsWith('.xlsx');
        const isCsv = lower.endsWith('.csv');
        
        const types = [];
        if (isXlsx) {
            types.push({ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } });
        } else if (isCsv) {
            types.push({ description: 'CSV', accept: { 'text/csv': ['.csv'] } });
        } else {
            types.push({ description: 'JSONL', accept: { 'application/jsonlines': ['.jsonl'] } });
        }

        const handle = await anyWindow.showSaveFilePicker({
          suggestedName: outputName,
          types: types,
        });
        const writable = await handle.createWritable();
        await opfsFile.stream().pipeTo(writable);
        return;
      } catch (err: any) {
        const name = err?.name ? String(err.name) : '';
        if (name === 'AbortError') {
          return;
        }
        throw err;
      }
    }

    const fileStream = streamSaver.createWriteStream(outputName, { size: opfsFile.size });
    await opfsFile.stream().pipeTo(fileStream);
  }

// Virtual Table Component
const VirtualTable = ({ data }: { data: any[][] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  useEffect(() => {
    if (parentRef.current) {
      setContainerHeight(parentRef.current.clientHeight);
      const resizeObserver = new ResizeObserver(() => {
        if (parentRef.current) setContainerHeight(parentRef.current.clientHeight);
      });
      resizeObserver.observe(parentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const ROW_HEIGHT = 40; // Increased for better readability
  const totalRows = data.length - 1; // Exclude header
  const header = data[0];
  const bodyData = data.slice(1);

  // Virtualization math
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 10;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  
  const visibleRows = bodyData.slice(startIndex, endIndex);
  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = (totalRows - endIndex) * ROW_HEIGHT;

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (!data || data.length === 0) return <div className="p-10 text-center text-[#8f959e]">无数据</div>;

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto border border-[#e5e6eb] bg-white rounded relative"
      onScroll={onScroll}
    >
      <table className="w-full text-sm text-left border-collapse min-w-max">
        <thead className="sticky top-0 z-10 shadow-sm bg-[#f0f2f6]">
          <tr className="border-b border-[#e5e6eb]">
            {header.map((h: any, i: number) => (
              <th key={i} className="px-4 py-3 font-semibold text-[#1f2329] border-r border-[#e5e6eb] last:border-r-0 whitespace-nowrap bg-[#f0f2f6] h-[40px] box-border">
                {h || `Col ${i+1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td colSpan={header.length} style={{ height: paddingTop, padding: 0, border: 0 }}></td>
            </tr>
          )}
          {visibleRows.map((row: any[], i: number) => (
            <tr key={startIndex + i} className="border-b border-[#e5e6eb] last:border-b-0 hover:bg-[#f7f8fa] transition-colors h-[40px] box-border">
              {row.map((cell: any, j: number) => (
                <td key={j} className="px-4 py-2 text-[#43474e] border-r border-[#e5e6eb] last:border-r-0 whitespace-nowrap" title={String(cell)}>
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
          {paddingBottom > 0 && (
            <tr>
              <td colSpan={header.length} style={{ height: paddingBottom, padding: 0, border: 0 }}></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Virtual Text Component (for JSONL/Text)
const VirtualText = ({ content }: { content: string }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  const lines = useMemo(() => content.split('\n'), [content]);
  
  useEffect(() => {
    if (parentRef.current) {
      setContainerHeight(parentRef.current.clientHeight);
      const resizeObserver = new ResizeObserver(() => {
         if (parentRef.current) setContainerHeight(parentRef.current.clientHeight);
      });
      resizeObserver.observe(parentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const LINE_HEIGHT = 24; // Approx height for text line
  const totalLines = lines.length;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 5);
  const visibleCount = Math.ceil(containerHeight / LINE_HEIGHT) + 10;
  const endIndex = Math.min(totalLines, startIndex + visibleCount);
  
  const visibleLines = lines.slice(startIndex, endIndex);
  const paddingTop = startIndex * LINE_HEIGHT;
  const paddingBottom = (totalLines - endIndex) * LINE_HEIGHT;

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div 
      ref={parentRef}
      className="flex-1 overflow-auto border border-[#e5e6eb] bg-white rounded p-0"
      onScroll={onScroll}
    >
      <div className="font-mono text-sm whitespace-pre px-4" style={{ paddingTop, paddingBottom, minHeight: '100%' }}>
         {visibleLines.join('\n')}
      </div>
    </div>
  );
};

const ProgressRing = () => (
  <div className="relative w-4 h-4 flex items-center justify-center">
    <svg className="transform -rotate-90 w-4 h-4" viewBox="0 0 24 24">
      <circle
        className="text-[#e5e6eb]"
        strokeWidth="4"
        stroke="currentColor"
        fill="transparent"
        r="10"
        cx="12"
        cy="12"
      />
      <circle
        className="text-[#00b365]"
        strokeWidth="4"
        strokeDasharray={2 * Math.PI * 10}
        strokeDashoffset={0}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r="10"
        cx="12"
        cy="12"
      />
    </svg>
  </div>
);

function App() {
  const [activeModule, setActiveModule] = useState<'excel_to_jsonl' | 'json_to_excel'>('excel_to_jsonl');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [processedCount, setProcessedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tempFilename, setTempFilename] = useState<string>('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonStatus, setJsonStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [jsonProcessedCount, setJsonProcessedCount] = useState(0);
  const [jsonErrorMessage, setJsonErrorMessage] = useState<string>('');
  const [jsonStage, setJsonStage] = useState<string>('');
  const [jsonTempFilename, setJsonTempFilename] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
  const [previewContent, setPreviewContent] = useState<{ type: 'text' | 'table', content: any } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const jsonWorkerRef = useRef<Worker | null>(null);
  const historyRef = useRef<HistoryItem[]>([]);
  const tempFilenameRef = useRef<string>('');
  const jsonTempFilenameRef = useRef<string>('');

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    tempFilenameRef.current = tempFilename;
  }, [tempFilename]);

  useEffect(() => {
    jsonTempFilenameRef.current = jsonTempFilename;
  }, [jsonTempFilename]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      for (const item of historyRef.current) {
        deleteOpfsFile(item.opfsFilename).catch(() => undefined);
      }
      if (tempFilenameRef.current) {
        deleteOpfsFile(tempFilenameRef.current).catch(() => undefined);
      }
      if (jsonTempFilenameRef.current) {
        deleteOpfsFile(jsonTempFilenameRef.current).catch(() => undefined);
      }
      workerRef.current?.terminate();
      jsonWorkerRef.current?.terminate();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      resetState();
    }
  };

  const resetState = () => {
      setStatus('idle');
      setErrorMessage('');
      setWarnings([]);
      setProcessedCount(0);
      setTempFilename('');
      setIsDownloading(false);
      setDownloadError('');
  }

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setJsonFile(e.target.files[0]);
      resetJsonState();
    }
  };

  const resetJsonState = () => {
    // Only delete the previous temp file if it exists and is not in history
    // But since we can't easily check if it's in history by filename here (without iterating),
    // and we generally want to clean up the 'current' slot when resetting:
    // Actually, if we reset, we are clearing the UI.
    // If the user hasn't saved it to history (which happens automatically on complete), it might be lost.
    // But on complete, it IS saved to history.
    // So if we reset, we just clear the reference.
    // We should NOT delete the file because it might be in history.
    
    setJsonStatus('idle');
    setJsonErrorMessage('');
    setJsonProcessedCount(0);
    setJsonStage('');
    setJsonTempFilename('');
    setIsDownloading(false);
    setDownloadError('');
  };

  const handleRemoveFile = () => {
      setFile(null);
      resetState();
  }

  const handleRemoveJsonFile = () => {
    setJsonFile(null);
    resetJsonState();
  }

  const startConversion = async () => {
    if (!file) return;

    setStatus('processing');
    setErrorMessage('');
    setWarnings([]);
    setProcessedCount(0);
    setTempFilename('');
    setDownloadError('');

    setTimeout(() => {
      try {
        if (workerRef.current) workerRef.current.terminate();

        workerRef.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        
        workerRef.current.onerror = () => {
            setStatus('error');
            setErrorMessage("Worker 启动失败");
            workerRef.current?.terminate();
        };

        workerRef.current.onmessage = async (e) => {
          const { type, processed, errors: workerErrors, tempFilename: workerTempFile, error } = e.data;

          if (type === 'progress') {
             setProcessedCount(processed);
          } else if (type === 'complete') {
            setStatus('completed');
            setProcessedCount(processed);
            if (workerErrors && workerErrors.length > 0) {
                setWarnings(workerErrors);
            }
            if (workerTempFile) {
                setTempFilename(workerTempFile);
            }

            const inputName = file.name;
            const outputName = file.name.replace(/\.[^/.]+$/, "") + ".jsonl";
            const historyId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const createdAt = Date.now();
            const warningsList = Array.isArray(workerErrors) ? workerErrors.slice(0, 10) : [];
            let sizeBytes: number | undefined = undefined;

            if (typeof workerTempFile === 'string' && workerTempFile) {
              try {
                const opfsFile = await readOpfsFile(workerTempFile);
                sizeBytes = opfsFile.size;
              } catch {
                sizeBytes = undefined;
              }

              const newItem: HistoryItem = {
                id: historyId,
                createdAt,
                inputName,
                outputName,
                opfsFilename: workerTempFile,
                processedCount: processed,
                warnings: warningsList,
                sizeBytes,
              };
              setHistory((prev) => [newItem, ...prev].slice(0, 50));
            }

            workerRef.current?.terminate();
          } else if (type === 'error') {
            setStatus('error');
            setErrorMessage(error || "Unknown error occurred");
            workerRef.current?.terminate();
          }
        };

        workerRef.current.postMessage({ file });

      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || "Failed to initialize conversion");
        if (workerRef.current) workerRef.current.terminate();
      }
    }, 50);
  };

  const startJsonToExcel = async () => {
    if (!jsonFile) return;
    if (jsonStatus === 'processing') return;

    setJsonStatus('processing');
    setJsonErrorMessage('');
    setJsonProcessedCount(0);
    setJsonStage('准备中');
    // Do not delete previous file here immediately, just clear the pointer.
    setJsonTempFilename('');
    setDownloadError('');

    setTimeout(() => {
      try {
        if (jsonWorkerRef.current) jsonWorkerRef.current.terminate();

        jsonWorkerRef.current = new Worker(new URL('./jsonToExcelWorker.ts', import.meta.url), { type: 'module' });

        jsonWorkerRef.current.onerror = () => {
          setJsonStatus('error');
          setJsonErrorMessage('Worker 启动失败');
          jsonWorkerRef.current?.terminate();
        };

        jsonWorkerRef.current.onmessage = async (e) => {
          const { type, processed, tempFilename: workerTempFile, error, stage } = e.data;

          if (type === 'stage') {
            setJsonStage(typeof stage === 'string' ? stage : '');
            return;
          }

          if (type === 'progress') {
            setJsonProcessedCount(processed);
            return;
          }

          if (type === 'complete') {
            setJsonStatus('completed');
            setJsonProcessedCount(processed);
            setJsonStage('完成');
            if (workerTempFile) {
              setJsonTempFilename(workerTempFile);
            }

            if (typeof workerTempFile === 'string' && workerTempFile) {
              const outputName = jsonFile.name.replace(/\.[^/.]+$/, "") + ".csv";
              const historyId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
              const createdAt = Date.now();
              let sizeBytes: number | undefined = undefined;

              try {
                const opfs = await readOpfsFile(workerTempFile);
                sizeBytes = opfs.size;
              } catch {
                sizeBytes = undefined;
              }

              const newItem: HistoryItem = {
                id: historyId,
                createdAt,
                inputName: jsonFile.name,
                outputName,
                opfsFilename: workerTempFile,
                processedCount: processed,
                warnings: [],
                sizeBytes,
              };

              setHistory((prev) => [newItem, ...prev].slice(0, 50));
            }

            jsonWorkerRef.current?.terminate();
            return;
          }

          if (type === 'error') {
            setJsonStatus('error');
            setJsonErrorMessage(error || 'Unknown error occurred');
            setJsonStage('');
            jsonWorkerRef.current?.terminate();
          }
        };

        jsonWorkerRef.current.postMessage({ file: jsonFile });
      } catch (err: any) {
        setJsonStatus('error');
        setJsonErrorMessage(err.message || 'Failed to initialize conversion');
        jsonWorkerRef.current?.terminate();
      }
    }, 50);
  };

  const downloadCurrent = async () => {
    if (!tempFilename || !file) return;
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError('');
    try {
      const opfsFile = await readOpfsFile(tempFilename);
      const outputName = file.name.replace(/\.[^/.]+$/, "") + ".jsonl";
      await saveFileToDisk(opfsFile, outputName);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setDownloadError(err?.message ? String(err.message) : '下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadFromHistory = async (item: HistoryItem) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError('');
    try {
      const opfsFile = await readOpfsFile(item.opfsFilename);
      await saveFileToDisk(opfsFile, item.outputName);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setDownloadError(err?.message ? String(err.message) : '下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  const removeHistoryItem = async (item: HistoryItem) => {
    setHistory((prev) => prev.filter((x) => x.id !== item.id));
    try {
      await deleteOpfsFile(item.opfsFilename);
    } catch {
    }
  };

  const clearHistory = async () => {
    const snapshot = history;
    setHistory([]);
    for (const item of snapshot) {
      try {
        await deleteOpfsFile(item.opfsFilename);
      } catch {
      }
    }
  };

  const handlePreview = async (item: HistoryItem) => {
    setPreviewItem(item);
    setIsPreviewLoading(true);
    setPreviewContent(null);
    
    try {
      const file = await readOpfsFile(item.opfsFilename);
      const name = item.outputName.toLowerCase();
      const isJsonl = name.endsWith('.jsonl') || name.endsWith('.json');
      const isCsv = name.endsWith('.csv');
      
      if (isJsonl) {
        // Read full content for virtual preview
        const text = await file.text();
        setPreviewContent({ type: 'text', content: text });
      } else if (isCsv) {
        // Use PapaParse for CSV - read all data
        await new Promise<void>((resolve, reject) => {
            Papa.parse(file, {
                header: false, // We want array of arrays
                skipEmptyLines: true,
                worker: true, // Run in worker to avoid freezing UI
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                         setPreviewContent({ type: 'table', content: results.data });
                    } else {
                         setPreviewContent({ type: 'text', content: '文件为空或无法解析 CSV 数据' });
                    }
                    resolve();
                },
                error: (err: any) => {
                     setPreviewContent({ type: 'text', content: `CSV 解析失败: ${err.message}` });
                     reject(err);
                }
            });
        });
      } else {
        // Excel (XLSX/XLS)
        // Use XLSX to read full file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Read all rows (no slice)
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (jsonData.length === 0) {
             setPreviewContent({ type: 'text', content: '文件为空或无法解析表格数据' });
        } else {
             setPreviewContent({ type: 'table', content: jsonData });
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewContent({ type: 'text', content: `预览失败：${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewContent(null);
  };

  const downloadDisabled = status !== 'completed' || !tempFilename || isDownloading;
  const jsonDownloadDisabled = jsonStatus !== 'completed' || !jsonTempFilename || isDownloading;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#1f2329] font-sans">
      <main className="max-w-[736px] mx-auto px-6 py-6">
        <div className="bg-white border border-[#e5e6eb] rounded-[8px] p-6 shadow-sm space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-[#1f2329] leading-[28px]">火山方舟-批量推理文件转换工具</h1>
            <div className="mt-4 text-[14px] leading-[22px] text-[#43474e] space-y-4">
              <p>
              上传 <strong>CSV</strong> 或 <strong>Excel</strong> 文件，自动转换为批量推理专用的 <code className="bg-[#f0f2f6] px-1.5 py-0.5 rounded text-[#3370ff] font-mono text-sm">jsonl</code> 格式并校验。详细规范参考 <a
                href="https://www.volcengine.com/docs/82379/1305505?lang=zh"
                target="_blank"
                rel="noreferrer"
                className="text-[#3370ff] hover:text-[#2957cc] transition-colors duration-200"
              >
                官方文档
              </a>。
              </p>

              <div className="space-y-2 text-[#43474e]">
                <div className="flex items-center space-x-2">
                   <span className="font-medium text-[#1f2329]">文件要求：</span>
                   <span className="text-sm">必须包含表头 <code className="bg-[#f0f2f6] px-1.5 py-0.5 rounded text-[#3370ff] font-mono text-xs">custom_id</code> 和 <code className="bg-[#f0f2f6] px-1.5 py-0.5 rounded text-[#3370ff] font-mono text-xs">content</code></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-[4px] border border-[#e5e6eb] overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveModule('excel_to_jsonl')}
                className={`h-8 px-4 text-[14px] leading-[20px] font-medium transition-colors duration-200 ${
                  activeModule === 'excel_to_jsonl' ? 'bg-[#e1eaff] text-[#3370ff]' : 'bg-white text-[#43474e] hover:bg-[#f7f8fa]'
                }`}
              >
                Excel/CSV 转 JSONL
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('json_to_excel')}
                className={`h-8 px-4 text-[14px] leading-[20px] font-medium transition-colors duration-200 border-l border-[#e5e6eb] ${
                  activeModule === 'json_to_excel' ? 'bg-[#e1eaff] text-[#3370ff]' : 'bg-white text-[#43474e] hover:bg-[#f7f8fa]'
                }`}
              >
                JSON 转 Excel/CSV
              </button>
            </div>
          </div>
          
          {activeModule === 'excel_to_jsonl' && (
          <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[14px] font-normal text-[#43474e] leading-[22px]">选择文件</label>
            <div className="relative">
              {!file ? (
                <div className="relative border border-[#e5e6eb] bg-white rounded-[8px] p-6 text-center hover:border-[#3370ff] transition-colors duration-200 cursor-pointer group shadow-sm">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-[#8f959e] mb-2 group-hover:text-[#3370ff] transition-colors duration-200" />
                    <span className="text-[14px] text-[#43474e] leading-[22px]">拖拽文件到此处</span>
                    <span className="text-xs text-[#8f959e] mt-1 leading-[20px]">单文件最大 5GB • 支持 CSV、XLSX、XLS</span>
                  </div>
                  <button className="absolute bottom-4 right-4 bg-[#f0f4ff] border border-[#e1eaff] text-[#3370ff] text-[14px] font-medium h-8 px-4 rounded-[4px] leading-[20px] transition-colors duration-200 hover:bg-[#e1eaff]">
                    选择文件
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between border border-[#e5e6eb] bg-white rounded-[8px] px-4 py-3">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <FileType className="w-5 h-5 text-[#43474e] flex-shrink-0" />
                        <span className="text-[14px] text-[#1f2329] leading-[22px] truncate">{file.name}</span>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                           <span className="text-xs text-[#8f959e] leading-[20px]">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                           <ProgressRing />
                        </div>
                    </div>
                    <button onClick={handleRemoveFile} className="text-[#8f959e] hover:text-[#3370ff] transition-colors duration-200 p-1 rounded-[4px] hover:bg-[#f0f4ff]">
                        <X className="w-4 h-4" />
                    </button>
                </div>
              )}
            </div>
          </div>

          {file && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={startConversion}
                disabled={status === 'processing' || isDownloading}
                className={`
                  inline-flex items-center justify-center h-8 px-4 rounded-[4px] text-[14px] font-medium leading-[20px] transition-colors duration-200 w-full
                  ${status === 'processing' || isDownloading ? 'bg-[#e5e6eb] text-[#c9cdd4] cursor-not-allowed' : 'bg-[#3370ff] text-white hover:bg-[#2957cc] active:bg-[#2046a6]'}
                `}
              >
                {status === 'processing' ? '正在处理中...' : '开始转换 & 检查'}
              </button>

              <button
                onClick={downloadCurrent}
                disabled={downloadDisabled}
                className={`
                  inline-flex items-center justify-center h-8 px-4 rounded-[4px] text-[14px] font-medium leading-[20px] transition-all duration-200 w-full border
                  ${downloadDisabled ? 'bg-[#e5e6eb] text-[#c9cdd4] border-[#e5e6eb] cursor-not-allowed' : 'bg-white text-[#3370ff] border-[#3370ff] hover:bg-[#f0f4ff] active:bg-[#e1eaff]'}
                `}
              >
                <span className="flex items-center space-x-2">
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#3370ff]" />
                  ) : (
                    <Download className="h-4 w-4 text-[#3370ff]" />
                  )}
                  <span>{isDownloading ? '正在下载...' : '下载 JSONL'}</span>
                </span>
              </button>
            </div>
          )}

          {status === 'processing' && (
             <div className="flex flex-col space-y-2">
                 <div className="flex items-center space-x-2 text-[#43474e] text-[14px] leading-[22px] bg-[#f7f8fa] p-3 rounded-[8px] border border-[#e5e6eb]">
                     <Loader2 className="animate-spin h-4 w-4 text-[#3370ff]" />
                     <span>正在转换... 已处理 {processedCount} 条数据</span>
                 </div>
                 <div className="w-full bg-[#e5e6eb] rounded-full h-2.5">
                     <div className="bg-[#3370ff] h-2.5 rounded-full transition-all duration-200" style={{ width: '100%' }}>
                         <div className="animate-pulse w-full h-full bg-white/30"></div>
                     </div>
                 </div>
                 <p className="text-[12px] text-[#8f959e] leading-[20px] text-center">正在处理大文件，请勿关闭页面...</p>
             </div>
          )}

          {status === 'error' && (
            <div className="bg-[#ffdede] border border-[#fccaca] rounded-lg p-4 text-[#9c2b2e] text-sm flex items-start">
                <span className="mr-2">🚨</span>
                <div>
                    <p className="font-bold mb-1">处理失败</p>
                    <p>{errorMessage}</p>
                </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`rounded-lg p-4 text-sm flex items-start border ${warnings.length > 0 ? 'bg-[#fff8dd] border-[#fcefb4] text-[#856404]' : 'bg-[#dff0d8] border-[#c3e6cb] text-[#155724]'}`}>
                    <span className="mr-2">{warnings.length > 0 ? '⚠️' : '✅'}</span>
                    <div className="flex-1">
                        <p className="font-bold mb-1">
                            {warnings.length > 0 ? '格式检查通过，但存在警告' : '格式检查通过！'}
                        </p>
                        <p>有效行数: {processedCount}</p>
                        
                        {warnings.length > 0 && (
                            <div className="mt-3">
                                <p className="font-semibold mb-1">错误详情（前10条）：</p>
                                <ul className="list-disc list-inside space-y-1 text-xs opacity-90 font-mono bg-[rgba(255,255,255,0.5)] p-2 rounded">
                                    {warnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-xs">注意：错误行已被跳过，未写入最终文件。</p>
                            </div>
                        )}
                        {downloadError && (
                          <p className="mt-2 text-xs text-[#9c2b2e]">下载错误：{downloadError}</p>
                        )}
                    </div>
                </div>
                <p className="text-xs text-[#808495] text-center">转换完成后，点击上方“下载 JSONL”按钮保存到本地。</p>
            </div>
          )}
          </div>
          )}

          {activeModule === 'json_to_excel' && (
          <div className="space-y-6">
            <div className="text-[14px] leading-[22px] text-[#43474e]">
              支持 <span className="font-medium text-[#1f2329]">.json</span>（数组或单对象）与 <span className="font-medium text-[#1f2329]">.jsonl</span>（每行一个 JSON 对象），输出为 <span className="font-medium text-[#1f2329]">.csv</span>（Excel 可打开）。
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-normal text-[#43474e] leading-[22px]">选择 JSON 文件</label>
              <div className="relative">
                {!jsonFile ? (
                  <div className="relative border border-[#e5e6eb] bg-white rounded-[8px] p-6 text-center hover:border-[#3370ff] transition-colors duration-200 cursor-pointer group shadow-sm">
                    <input
                      type="file"
                      accept=".json,.jsonl"
                      onChange={handleJsonFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-[#8f959e] mb-2 group-hover:text-[#3370ff] transition-colors duration-200" />
                      <span className="text-[14px] text-[#43474e] leading-[22px]">拖拽文件到此处</span>
                      <span className="text-xs text-[#8f959e] mt-1 leading-[20px]">支持 JSON、JSONL</span>
                    </div>
                    <button className="absolute bottom-4 right-4 bg-[#f0f4ff] border border-[#e1eaff] text-[#3370ff] text-[14px] font-medium h-8 px-4 rounded-[4px] leading-[20px] transition-colors duration-200 hover:bg-[#e1eaff]">
                      选择文件
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border border-[#e5e6eb] bg-white rounded-[8px] px-4 py-3">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <FileType className="w-5 h-5 text-[#43474e] flex-shrink-0" />
                      <span className="text-[14px] text-[#1f2329] leading-[22px] truncate">{jsonFile.name}</span>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                         <span className="text-xs text-[#8f959e] leading-[20px]">{(jsonFile.size / (1024 * 1024)).toFixed(1)}MB</span>
                         <ProgressRing />
                      </div>
                    </div>
                    <button onClick={handleRemoveJsonFile} className="text-[#8f959e] hover:text-[#3370ff] transition-colors duration-200 p-1 rounded-[4px] hover:bg-[#f0f4ff]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {jsonFile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={startJsonToExcel}
                  disabled={jsonStatus === 'processing' || isDownloading}
                  className={`
                    inline-flex items-center justify-center h-8 px-4 rounded-[4px] text-[14px] font-medium leading-[20px] transition-colors duration-200 w-full
                    ${jsonStatus === 'processing' || isDownloading ? 'bg-[#e5e6eb] text-[#c9cdd4] cursor-not-allowed' : 'bg-[#3370ff] text-white hover:bg-[#2957cc] active:bg-[#2046a6]'}
                  `}
                >
                  {jsonStatus === 'processing' ? '正在处理中...' : '开始转换'}
                </button>

                <button
                  onClick={async () => {
                    if (!jsonTempFilename || !jsonFile || isDownloading) return;
                    setIsDownloading(true);
                    setDownloadError('');
                    try {
                      const opfsFile = await readOpfsFile(jsonTempFilename);
                      const outputName = jsonFile.name.replace(/\.[^/.]+$/, "") + ".csv";
                      await saveFileToDisk(opfsFile, outputName);
                    } catch (err: any) {
                      const name = err?.name ? String(err.name) : '';
                      if (name !== 'AbortError') {
                        setDownloadError(err?.message ? String(err.message) : '下载失败');
                      }
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={jsonDownloadDisabled}
                  className={`
                    inline-flex items-center justify-center h-8 px-4 rounded-[4px] text-[14px] font-medium leading-[20px] transition-all duration-200 w-full border
                    ${jsonDownloadDisabled ? 'bg-[#e5e6eb] text-[#c9cdd4] border-[#e5e6eb] cursor-not-allowed' : 'bg-white text-[#3370ff] border-[#3370ff] hover:bg-[#f0f4ff] active:bg-[#e1eaff]'}
                  `}
                >
                  <span className="flex items-center space-x-2">
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#3370ff]" />
                    ) : (
                      <Download className="h-4 w-4 text-[#3370ff]" />
                    )}
                    <span>{isDownloading ? '正在下载...' : '下载 Excel (CSV)'}</span>
                  </span>
                </button>
              </div>
            )}

            {jsonStatus === 'processing' && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 text-[#43474e] text-[14px] leading-[22px] bg-[#f7f8fa] p-3 rounded-[8px] border border-[#e5e6eb]">
                  <Loader2 className="animate-spin h-4 w-4 text-[#3370ff]" />
                  <span>正在转换{jsonStage ? `（${jsonStage}）` : ''}... 已处理 {jsonProcessedCount} 条</span>
                </div>
                <div className="w-full bg-[#e5e6eb] rounded-full h-2.5">
                  <div className="bg-[#3370ff] h-2.5 rounded-full transition-all duration-200 w-full">
                    <div className="animate-pulse w-full h-full bg-white/30"></div>
                  </div>
                </div>
                <p className="text-[12px] text-[#8f959e] leading-[20px] text-center">正在处理文件，请勿关闭页面...</p>
              </div>
            )}

            {jsonStatus === 'error' && (
              <div className="bg-[#ffdede] border border-[#fccaca] rounded-[8px] p-4 text-[#9c2b2e] text-[14px] leading-[22px] flex items-start">
                <span className="mr-2">🚨</span>
                <div>
                  <p className="font-bold mb-1">处理失败</p>
                  <p>{jsonErrorMessage}</p>
                </div>
              </div>
            )}

            {jsonStatus === 'completed' && (
              <div className="bg-[#dff0d8] border border-[#c3e6cb] rounded-[8px] p-4 text-[#155724] text-[14px] leading-[22px] flex items-start">
                <span className="mr-2">✅</span>
                <div>
                  <p className="font-bold mb-1">转换完成</p>
                  <p>已生成 {jsonProcessedCount} 行数据的 CSV 文件</p>
                  {downloadError && <p className="mt-2 text-[12px] leading-[20px] text-[#9c2b2e]">下载错误：{downloadError}</p>}
                </div>
              </div>
            )}
          </div>
          )}

          <div className="border-t border-[#f0f2f6] pt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">转换记录</h2>
              <button
                onClick={clearHistory}
                disabled={history.length === 0}
                className={`inline-flex items-center space-x-2 text-[14px] leading-[20px] h-8 px-4 rounded-[4px] border transition-colors duration-200 ${
                  history.length === 0 ? 'text-[#c9cdd4] border-[#e5e6eb] bg-[#e5e6eb] cursor-not-allowed' : 'text-[#3370ff] border-[#3370ff] bg-white hover:bg-[#f0f4ff] active:bg-[#e1eaff]'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>清空</span>
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-sm text-[#808495] bg-[#f9f9f9] border border-[#e6e6e6] rounded p-4">暂无历史记录</div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => {
                   const isJsonl = item.outputName.endsWith('.jsonl');
                   return (
                  <div key={item.id} className="border border-[#e6e6e6] rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`flex-shrink-0 mt-1 ${isJsonl ? 'text-[#3370ff]' : 'text-[#155724]'}`}>
                           {isJsonl ? <FileJson className="w-8 h-8" /> : <FileSpreadsheet className="w-8 h-8" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[#31333F] break-all line-clamp-2" title={item.outputName}>
                                {item.outputName}
                            </div>
                            <div className="text-xs text-[#808495] mt-1 flex flex-wrap gap-2">
                              <span>{formatTime(item.createdAt)}</span>
                              <span>·</span>
                              <span>{item.processedCount} 行</span>
                              <span>·</span>
                              <span>{formatBytes(item.sizeBytes)}</span>
                            </div>
                            {item.warnings?.length ? (
                              <div className="text-xs mt-2 text-[#856404] bg-[#fff8dd] border border-[#fcefb4] rounded px-2 py-1 inline-block">
                                警告 {item.warnings.length} 条
                              </div>
                            ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-center">
                        <button
                          onClick={() => handlePreview(item)}
                          disabled={isDownloading}
                          className="inline-flex items-center space-x-2 text-[14px] leading-[20px] h-8 px-4 rounded-[4px] border border-[#3370ff] bg-white text-[#3370ff] hover:bg-[#f0f4ff] active:bg-[#e1eaff] transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4" />
                          <span>预览</span>
                        </button>

                        <button
                          onClick={() => downloadFromHistory(item)}
                          disabled={isDownloading}
                          className={`inline-flex items-center space-x-2 text-[14px] leading-[20px] h-8 px-4 rounded-[4px] border transition-colors duration-200 ${
                            isDownloading ? 'text-[#c9cdd4] border-[#e5e6eb] bg-[#e5e6eb] cursor-not-allowed' : 'text-[#3370ff] border-[#3370ff] bg-white hover:bg-[#f0f4ff] active:bg-[#e1eaff]'
                          }`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#3370ff]" />
                          ) : (
                            <Download className="w-4 h-4 text-[#3370ff]" />
                          )}
                          <span>下载</span>
                        </button>

                        <button
                          onClick={() => removeHistoryItem(item)}
                          className="inline-flex items-center space-x-2 text-[14px] leading-[20px] h-8 px-4 rounded-[4px] border border-[#3370ff] bg-white text-[#3370ff] hover:bg-[#f0f4ff] active:bg-[#e1eaff] transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>删除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
                {downloadError && <div className="text-xs text-[#9c2b2e]">下载错误：{downloadError}</div>}
              </div>
            )}
          </div>

          <div className="border-t border-[#e5e6eb] pt-6">
            <div className="text-[16px] font-medium text-[#1f2329] leading-[24px] mb-4">相关入口</div>
            <div className="flex flex-col sm:flex-row gap-6">
              <a
                href="https://console.volcengine.com/tos/bucket/setting?id=feishu-base&region=cn-beijing&type=objects&dirPrefix=%E6%89%B9%E9%87%8F%E6%8E%A8%E7%90%86%E8%BE%93%E5%85%A5%2F"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-[#3370ff] hover:bg-[#2957cc] active:bg-[#2046a6] text-white h-8 px-4 rounded-[4px] text-[14px] leading-[20px] font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#3370ff] focus:ring-offset-2"
              >
                火山引擎对象存储
              </a>
              <a
                href="https://console.volcengine.com/ark/region:ark+cn-beijing/batchInference"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-[#3370ff] hover:bg-[#2957cc] active:bg-[#2046a6] text-white h-8 px-4 rounded-[4px] text-[14px] leading-[20px] font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#3370ff] focus:ring-offset-2"
              >
                火山方舟批量推理
              </a>
            </div>
          </div>
        </div>
      </main>

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e6eb]">
              <h3 className="text-lg font-semibold text-[#1f2329] truncate max-w-[80%] flex items-center">
                <span className="truncate">预览: {previewItem.outputName}</span>
                {previewContent && previewContent.type === 'table' && Array.isArray(previewContent.content) && (
                    <span className="ml-2 text-sm font-normal text-[#8f959e] flex-shrink-0">
                        ({previewContent.content.length > 1 ? previewContent.content.length - 1 : 0} 行)
                    </span>
                )}
                {previewContent && previewContent.type === 'text' && typeof previewContent.content === 'string' && (
                    <span className="ml-2 text-sm font-normal text-[#8f959e] flex-shrink-0">
                        ({previewContent.content.split('\n').length} 行)
                    </span>
                )}
              </h3>
              <button
                onClick={closePreview}
                className="text-[#8f959e] hover:text-[#3370ff] p-1 rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden p-4 bg-[#f7f8fa] flex flex-col">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-[#3370ff]" />
                  <span className="ml-2 text-[#43474e]">加载中...</span>
                </div>
              ) : previewContent ? (
                previewContent.type === 'text' ? (
                  <VirtualText content={previewContent.content} />
                ) : (
                  <VirtualTable data={previewContent.content} />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-[#8f959e]">
                  无法预览此文件
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-[#e5e6eb] flex justify-end">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-white border border-[#e5e6eb] text-[#1f2329] rounded hover:bg-[#f7f8fa] transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
