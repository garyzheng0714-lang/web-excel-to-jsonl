import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Loader2, FileSpreadsheet, FileJson, Layers, Scissors, BoxSelect, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import streamSaver from 'streamsaver';
import { cn } from './lib/utils';
import { AppShell } from './components/AppShell';
import { TopBar } from './components/TopBar';
import { ModuleHeader } from './components/ModuleHeader';
import { SideNav } from './components/SideNav';
import { RightPanel } from './components/RightPanel';
import { UploadCard } from './components/UploadCard';
import { ResultCard } from './components/ResultCard';
import { StatusPanel, type StatusVariant } from './components/StatusPanel';
import { ContextCacheCreator } from './ContextCacheCreator';
import { SplitTool } from './SplitTool';
import { CsvTemplateFiller } from './CsvTemplateFiller';

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

  const ROW_HEIGHT = 44; 
  const totalRows = data.length - 1; 
  const header = data[0];
  const bodyData = data.slice(1);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 10;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  
  const visibleRows = bodyData.slice(startIndex, endIndex);
  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = (totalRows - endIndex) * ROW_HEIGHT;

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (!data || data.length === 0) return <div className="p-10 text-center text-mono text-fg-muted">暂无数据</div>;

  return (
    <div
      ref={parentRef}
      className="relative flex-1 overflow-auto bg-app-elevated rounded-lg border border-border-subtle"
      onScroll={onScroll}
    >
      <table className="min-w-max w-full border-collapse text-left text-sm font-mono">
        <thead className="sticky top-0 z-10 bg-app-surface border-b border-border-strong">
          <tr>
            {header.map((h: any, i: number) => (
              <th
                key={i}
                className="h-11 whitespace-nowrap border-r border-border-subtle px-4 font-medium text-fg-primary last:border-r-0"
              >
                {h || `COL_${i+1}`}
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
            <tr
              key={startIndex + i}
              className="h-[44px] border-b border-border-subtle hover:bg-app-subtle transition-colors"
            >
              {row.map((cell: any, j: number) => (
                <td
                  key={j}
                  className="whitespace-nowrap border-r border-border-subtle px-4 text-fg-secondary last:border-r-0"
                  title={String(cell)}
                >
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

  const LINE_HEIGHT = 24; 
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
      className="flex-1 overflow-auto bg-app-elevated rounded-lg border border-border-subtle font-mono text-sm"
      onScroll={onScroll}
    >
      <div
        className="whitespace-pre px-4 py-2 text-fg-secondary"
        style={{ paddingTop, paddingBottom, minHeight: '100%' }}
      >
        {visibleLines.join('\n')}
      </div>
    </div>
  );
};

type ModuleId = 'excel_to_jsonl' | 'json_to_excel' | 'merge_csv' | 'context_cache' | 'split_tool' | 'csv_template_filler';

const MODULES: Array<{
  id: ModuleId;
  label: string;
  summary: string;
  description: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'excel_to_jsonl',
    label: 'EXCEL 转 JSONL',
    summary: '批量推理准备',
    icon: FileSpreadsheet,
    description: (
      <p>
        将 <strong>CSV/Excel</strong> 转换为 <strong>JSONL</strong> 以进行批量推理。
        <br />
        <span className="text-xs text-slate-500 mt-2 block font-mono">
          必需表头：'custom_id', 'content'。可选：'image_url'（多模态）。
        </span>
      </p>
    ),
  },
  {
    id: 'csv_template_filler',
    label: 'CSV 模板填充',
    summary: '批量内容生成',
    icon: FileText,
    description: <p>使用自定义模板和 CSV 数据批量生成文本内容。</p>,
  },
  {
    id: 'json_to_excel',
    label: 'JSON 转 EXCEL',
    summary: '数据可视化',
    icon: FileJson,
    description: (
      <p>
        将 <strong>JSON/JSONL</strong> 结构转换为扁平化的 <strong>CSV</strong> 表格。
        <br />
        <span className="text-xs text-slate-500 mt-2 block font-mono">
          支持嵌套对象和数组。适合人工审查。
        </span>
      </p>
    ),
  },
  {
    id: 'merge_csv',
    label: '合并 CSV',
    summary: '统一数据集',
    icon: Layers,
    description: <p>合并多个 CSV 文件。自动对齐表头并合并数据集。</p>,
  },
  {
    id: 'context_cache',
    label: '上下文缓存',
    summary: '系统提示生成',
    icon: BoxSelect,
    description: <p>根据系统提示和用户内容生成上下文缓存 JSONL。</p>,
  },
  {
    id: 'split_tool',
    label: '拆分 CSV',
    summary: '商品排序工具',
    icon: Scissors,
    description: <p>插入格式化的空行并将大型 CSV 拆分为 20k 行的块。</p>,
  },
];

function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('excel_to_jsonl');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [processedCount, setProcessedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tempFilename, setTempFilename] = useState<string>('');
  
  // JSON to Excel state
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonStatus, setJsonStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [jsonProcessedCount, setJsonProcessedCount] = useState(0);
  const [jsonErrorMessage, setJsonErrorMessage] = useState<string>('');
  const [jsonStage, setJsonStage] = useState<string>('');
  const [jsonTempFilename, setJsonTempFilename] = useState<string>('');
  
  // Merge state
  const [mergeFiles, setMergeFiles] = useState<{ id: string; name: string; type: 'history' | 'upload'; file?: File; historyItem?: HistoryItem }[]>([]);
  const [mergeStatus, setMergeStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [mergeProcessedCount, setMergeProcessedCount] = useState(0);
  const [mergeErrorMessage, setMergeErrorMessage] = useState('');
  const [mergeTempFilename, setMergeTempFilename] = useState('');
  const [mergeStage, setMergeStage] = useState('');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
  const [previewContent, setPreviewContent] = useState<{ type: 'text' | 'table', content: any } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);
  const jsonWorkerRef = useRef<Worker | null>(null);
  const mergeWorkerRef = useRef<Worker | null>(null);
  
  const historyRef = useRef<HistoryItem[]>([]);
  const tempFilenameRef = useRef<string>('');
  const jsonTempFilenameRef = useRef<string>('');
  const mergeTempFilenameRef = useRef<string>('');

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
    mergeTempFilenameRef.current = mergeTempFilename;
  }, [mergeTempFilename]);

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
      if (mergeTempFilenameRef.current) {
        deleteOpfsFile(mergeTempFilenameRef.current).catch(() => undefined);
      }
      workerRef.current?.terminate();
      jsonWorkerRef.current?.terminate();
      mergeWorkerRef.current?.terminate();
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
    setJsonStatus('idle');
    setJsonErrorMessage('');
    setJsonProcessedCount(0);
    setJsonStage('');
    setJsonTempFilename('');
    setIsDownloading(false);
    setDownloadError('');
  };
  
  // Merge functions
  const handleMergeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files).map(f => ({
           id: `upload_${Date.now()}_${Math.random()}`,
           name: f.name,
           type: 'upload' as const,
           file: f
        }));
        setMergeFiles(prev => [...prev, ...newFiles]);
        resetMergeState();
     }
  };

  const toggleHistorySelection = (item: HistoryItem) => {
     const exists = mergeFiles.find(f => f.id === item.id);
     if (exists) {
        setMergeFiles(prev => prev.filter(f => f.id !== item.id));
     } else {
        setMergeFiles(prev => [...prev, {
           id: item.id,
           name: item.outputName,
           type: 'history',
           historyItem: item
        }]);
     }
     resetMergeState();
  };
  
  const removeMergeFile = (id: string) => {
     setMergeFiles(prev => prev.filter(f => f.id !== id));
     resetMergeState();
  }

  const resetMergeState = () => {
     setMergeStatus('idle');
     setMergeErrorMessage('');
     setMergeProcessedCount(0);
     setMergeStage('');
     setMergeTempFilename('');
     setIsDownloading(false);
     setDownloadError('');
  }
  
  const startMerge = async () => {
     if (mergeFiles.length === 0) return;
     if (mergeStatus === 'processing') return;

     setMergeStatus('processing');
     setMergeErrorMessage('');
     setMergeProcessedCount(0);
     setMergeStage('准备中');
     setMergeTempFilename('');
     setDownloadError('');

     // Prepare items for worker
     const workerItems = mergeFiles.map(f => {
        if (f.type === 'upload' && f.file) {
           return { type: 'file', file: f.file, name: f.name };
        } else if (f.type === 'history' && f.historyItem) {
           return { type: 'opfs', filename: f.historyItem.opfsFilename, name: f.name };
        }
        return null;
     }).filter(Boolean);

     setTimeout(() => {
        try {
           if (mergeWorkerRef.current) mergeWorkerRef.current.terminate();
           mergeWorkerRef.current = new Worker(new URL('./mergeWorker.ts', import.meta.url), { type: 'module' });
           
           mergeWorkerRef.current.onerror = (e) => {
              const msg = e instanceof ErrorEvent ? e.message : '脚本加载错误';
              setMergeStatus('error');
              setMergeErrorMessage(`Worker 启动失败: ${msg}`);
              mergeWorkerRef.current?.terminate();
           };

           mergeWorkerRef.current.onmessage = async (e) => {
              const { type, processed, tempFilename, error, stage } = e.data;
              
              if (type === 'stage') {
                 setMergeStage(stage);
                 return;
              }
              if (type === 'progress') {
                 setMergeProcessedCount(processed);
                 return;
              }
              if (type === 'complete') {
                 setMergeStatus('completed');
                 setMergeProcessedCount(processed);
                 setMergeStage('完成');
                 if (tempFilename) setMergeTempFilename(tempFilename);

                 // Add to history
                 const outputName = `merged_${Date.now()}.csv`;
                 const historyId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
                 
                 let sizeBytes = undefined;
                 try {
                    const f = await readOpfsFile(tempFilename);
                    sizeBytes = f.size;
                 } catch {}

                 const newItem: HistoryItem = {
                    id: historyId,
                    createdAt: Date.now(),
                    inputName: `${mergeFiles.length} 个文件`,
                    outputName,
                    opfsFilename: tempFilename,
                    processedCount: processed,
                    warnings: [],
                    sizeBytes
                 };
                 setHistory(prev => [newItem, ...prev].slice(0, 50));
                 
                 mergeWorkerRef.current?.terminate();
                 return;
              }
              if (type === 'error') {
                 setMergeStatus('error');
                 setMergeErrorMessage(error || 'Unknown error');
                 mergeWorkerRef.current?.terminate();
              }
           };

           mergeWorkerRef.current.postMessage({ items: workerItems });

        } catch (err: any) {
           setMergeStatus('error');
           setMergeErrorMessage(err.message);
        }
     }, 50);
  }

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
        
        workerRef.current.onerror = (e) => {
            const msg = e instanceof ErrorEvent ? e.message : '脚本加载错误';
            setStatus('error');
            setErrorMessage(`Worker 启动失败: ${msg}`);
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

        jsonWorkerRef.current.onerror = (e) => {
          const msg = e instanceof ErrorEvent ? e.message : '脚本加载错误';
          setJsonStatus('error');
          setJsonErrorMessage(`Worker 启动失败: ${msg}`);
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
  const mergeDownloadDisabled = mergeStatus !== 'completed' || !mergeTempFilename || isDownloading;
  const activeModuleMeta = MODULES.find((module) => module.id === activeModule);
  const ActiveModuleIcon = activeModuleMeta?.icon;
  const isProcessing = status === 'processing' || jsonStatus === 'processing' || mergeStatus === 'processing';
  const moduleStatusText = isProcessing ? '处理中' : '就绪';
  const moduleMetaChips = [
    { label: '环境', value: '本地浏览器' },
    { label: '记录', value: `${history.length} 条` },
    {
      label: '状态',
      value: (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
            )}
          ></span>
          <span className="uppercase">{moduleStatusText}</span>
        </div>
      )
    }
  ];
  const statusLabels: Record<StatusVariant, string> = {
    idle: '待机',
    processing: '处理中',
    success: '完成',
    warning: '有警告',
    error: '错误',
  };
  const excelStatusVariant: StatusVariant = status === 'completed'
    ? warnings.length > 0
      ? 'warning'
      : 'success'
    : status === 'processing'
      ? 'processing'
      : status === 'error'
        ? 'error'
        : 'idle';
  const excelStatusMessage = status === 'processing'
    ? `Processing ${processedCount} rows.`
    : status === 'completed'
      ? `${processedCount} rows processed.`
      : status === 'error'
        ? errorMessage || 'Conversion failed.'
        : '';
  const jsonStatusVariant: StatusVariant = jsonStatus === 'completed'
    ? 'success'
    : jsonStatus === 'processing'
      ? 'processing'
      : jsonStatus === 'error'
        ? 'error'
        : 'idle';
  const jsonStatusMessage = jsonStatus === 'processing'
    ? `Processing ${jsonProcessedCount} rows.`
    : jsonStatus === 'completed'
      ? `${jsonProcessedCount} rows processed.`
      : jsonStatus === 'error'
        ? jsonErrorMessage || 'Conversion failed.'
        : '';
  const jsonStatusDetails = jsonStage ? [`Stage: ${jsonStage}`] : [];
  const mergeStatusVariant: StatusVariant = mergeStatus === 'completed'
    ? 'success'
    : mergeStatus === 'processing'
      ? 'processing'
      : mergeStatus === 'error'
        ? 'error'
        : 'idle';
  const mergeStatusMessage = mergeStatus === 'processing'
    ? `Processing ${mergeProcessedCount} rows.`
    : mergeStatus === 'completed'
      ? `${mergeProcessedCount} rows processed.`
      : mergeStatus === 'error'
        ? mergeErrorMessage || 'Merge failed.'
        : '';
  const mergeStatusDetails = mergeStage ? [`Stage: ${mergeStage}`] : [];

  return (
    <AppShell
      topBar={(
        <TopBar
          label="GARY的数据工作台"
          title={activeModuleMeta?.label ?? '数据工具'}
        />
      )}
      sideNav={<SideNav modules={MODULES} activeModule={activeModule} onSelect={setActiveModule} />}
      rightPanel={(
        <RightPanel
          history={history}
          onPreview={handlePreview}
          onDownload={downloadFromHistory}
          onClear={clearHistory}
        />
      )}
    >
      <>
        <div className="space-y-12">
          <ModuleHeader
            summary={activeModuleMeta?.summary ?? 'MODULE'}
            title={activeModuleMeta?.label ?? '数据工具'}
            description={activeModuleMeta?.description ?? null}
            metaChips={moduleMetaChips}
          />

          {activeModule === 'split_tool' && <SplitTool />}
          {activeModule === 'context_cache' && <ContextCacheCreator />}
          {activeModule === 'csv_template_filler' && <CsvTemplateFiller />}

          {activeModule === 'excel_to_jsonl' && (
            <div className="space-y-8">
              <UploadCard
                file={file}
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                onRemove={handleRemoveFile}
                idleTitle="拖放文件至此"
                idleSubtitle="支持 CSV, XLSX (最大 5GB)"
                fileIcon={<FileSpreadsheet className="w-16 h-16 text-slate-900" />}
                inputLabel="Upload CSV or Excel file"
              />

              {file && (
                <ResultCard
                  title="JSONL 输出"
                  description="运行转换后下载 JSONL 文件"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={startConversion}
                      disabled={status === 'processing' || isDownloading}
                      className="btn-primary"
                    >
                      {status === 'processing' ? '处理中...' : '开始转换'}
                    </button>
                    <button onClick={downloadCurrent} disabled={downloadDisabled} className="btn-secondary">
                      下载 JSONL
                    </button>
                  </div>
                </ResultCard>
              )}

              {status !== 'idle' && (
                <StatusPanel
                  status={excelStatusVariant}
                  title={statusLabels[excelStatusVariant]}
                  message={excelStatusMessage || undefined}
                  warnings={warnings.length > 0 ? warnings : undefined}
                  warningsTitle="Warnings"
                  showProgress={status === 'processing'}
                />
              )}
            </div>
          )}

          {activeModule === 'json_to_excel' && (
            <div className="space-y-8">
              <UploadCard
                file={jsonFile}
                accept=".json,.jsonl"
                onChange={handleJsonFileChange}
                onRemove={handleRemoveJsonFile}
                idleTitle="拖放 JSON 文件"
                idleSubtitle="支持 JSON, JSONL"
                fileIcon={<FileJson className="w-16 h-16 text-slate-900" />}
                inputLabel="Upload JSON file"
              />

              {jsonFile && (
                <ResultCard
                  title="CSV 输出"
                  description="运行转换后下载 CSV 文件"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={startJsonToExcel}
                      disabled={jsonStatus === 'processing' || isDownloading}
                      className="btn-primary"
                    >
                      转换为 EXCEL
                    </button>
                    <button
                      onClick={async () => {
                        if (!jsonTempFilename || !jsonFile || isDownloading) return;
                        setIsDownloading(true);
                        setDownloadError('');
                        try {
                          const opfsFile = await readOpfsFile(jsonTempFilename);
                          const outputName = jsonFile.name.replace(/\.[^/.]+$/, '') + '.csv';
                          await saveFileToDisk(opfsFile, outputName);
                        } catch (err: any) {
                          if (err?.name !== 'AbortError') setDownloadError(err?.message || 'Download failed');
                        } finally {
                          setIsDownloading(false);
                        }
                      }}
                      disabled={jsonDownloadDisabled}
                      className="btn-secondary"
                    >
                      下载 CSV
                    </button>
                  </div>
                </ResultCard>
              )}

              {jsonStatus !== 'idle' && (
                <StatusPanel
                  status={jsonStatusVariant}
                  title={statusLabels[jsonStatusVariant]}
                  message={jsonStatusMessage || undefined}
                  details={jsonStatusDetails.length > 0 ? jsonStatusDetails : undefined}
                  showProgress={jsonStatus === 'processing'}
                />
              )}
            </div>
          )}

          {activeModule === 'merge_csv' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="surface-elevated p-5 min-h-[300px]">
                  <h3 className="text-label mb-5 pb-3 border-b border-border-subtle">源文件</h3>
                  <div className="space-y-4">
                    <div className="relative border border-dashed border-border-strong rounded-lg p-4 text-center hover:bg-app-subtle transition-colors cursor-pointer group">
                      <input
                        type="file"
                        accept=".csv"
                        multiple
                        onChange={handleMergeUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-caption font-medium group-hover:text-fg-primary">+ 添加本地 CSV</span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {history.filter(h => h.outputName.endsWith('.csv')).map(item => {
                        const isSelected = mergeFiles.some(f => f.id === item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleHistorySelection(item)}
                            className={cn(
                              'p-3 rounded-lg cursor-pointer transition-all text-mono text-sm flex items-center gap-3',
                              isSelected
                                ? 'bg-accent text-white'
                                : 'bg-app-subtle text-fg-secondary hover:bg-app-hover'
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center',
                              isSelected ? 'border-white bg-white' : 'border-fg-faint'
                            )}>
                              {isSelected && <span className="text-accent text-xs">✓</span>}
                            </div>
                            <div className="truncate flex-1">{item.outputName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="surface-elevated p-5 flex flex-col">
                  <div className="flex justify-between items-center pb-3 mb-5 border-b border-border-subtle">
                    <h3 className="text-label">合并队列</h3>
                    <span className="chip">{mergeFiles.length} 文件</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 mb-5">
                    {mergeFiles.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-fg-faint text-body">
                        队列为空
                      </div>
                    ) : (
                      mergeFiles.map(f => (
                        <div key={f.id} className="flex justify-between items-center p-3 rounded-lg bg-app-subtle text-mono text-sm">
                          <span className="truncate text-fg-secondary">{f.name}</span>
                          <button onClick={() => removeMergeFile(f.id)} className="text-fg-faint hover:text-danger transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <ResultCard
                title="合并输出"
                description="合并文件后下载结果 CSV"
              >
                <button
                  onClick={startMerge}
                  disabled={mergeFiles.length < 2 || mergeStatus === 'processing' || isDownloading}
                  className="btn-primary w-full"
                >
                  合并文件
                </button>
                {mergeTempFilename ? (
                  <button
                    onClick={async () => {
                      if (!mergeTempFilename) return;
                      try {
                        const opfsFile = await readOpfsFile(mergeTempFilename);
                        const outputName = `merged_${Date.now()}.csv`;
                        await saveFileToDisk(opfsFile, outputName);
                      } catch {}
                    }}
                    disabled={mergeDownloadDisabled}
                    className="btn-secondary w-full"
                  >
                    下载结果
                  </button>
                ) : null}
              </ResultCard>

              {mergeStatus !== 'idle' && (
                <StatusPanel
                  status={mergeStatusVariant}
                  title={statusLabels[mergeStatusVariant]}
                  message={mergeStatusMessage || undefined}
                  details={mergeStatusDetails.length > 0 ? mergeStatusDetails : undefined}
                  showProgress={mergeStatus === 'processing'}
                />
              )}
            </div>
          )}
        </div>

        {previewItem && (
          <div className="modal-overlay flex items-center justify-center p-6 md:p-12">
            <div className="modal w-full h-full max-w-6xl flex flex-col animate-slide-up">
              <div className="flex items-center justify-between p-5 border-b border-border-subtle">
                <div>
                  <p className="text-label mb-1">预览</p>
                  <h2 className="text-title truncate max-w-xl">{previewItem.outputName}</h2>
                </div>
                <button
                  onClick={closePreview}
                  className="btn-ghost w-10 h-10 p-0 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-4 relative">
                {isPreviewLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-fg-faint" />
                  </div>
                ) : previewContent ? (
                  previewContent.type === 'text' ? (
                    <VirtualText content={previewContent.content} />
                  ) : (
                    <VirtualTable data={previewContent.content} />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-body text-fg-muted">无法预览</div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    </AppShell>
  );
}

export default App;
