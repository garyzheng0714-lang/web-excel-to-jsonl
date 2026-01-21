import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Define the FileSystemSyncAccessHandle interface as it might not be in all TS libs yet
type FileSystemSyncAccessHandle = {
  write: (buffer: ArrayBufferView) => number;
  truncate: (newSize: number) => void;
  flush?: () => void;
  close: () => void;
};

interface WorkerMessage {
  file: File;
  template: string;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file, template } = e.data;
  const fileName = file.name;
  const isCsv = fileName.toLowerCase().endsWith('.csv');

  let processedCount = 0;
  let lastProgressReport = 0;
  
  // OPFS setup
  const tempFilename = `filled_${Date.now()}_${Math.random().toString(16).slice(2)}.csv`;
  let accessHandle: FileSystemSyncAccessHandle | null = null;
  let root: FileSystemDirectoryHandle;
  let fileHandle: FileSystemFileHandle;

  try {
    root = await navigator.storage.getDirectory();
    fileHandle = await root.getFileHandle(tempFilename, { create: true });
    // @ts-ignore - createSyncAccessHandle is not yet in standard types for all envs
    accessHandle = await fileHandle.createSyncAccessHandle();
    
    if (!accessHandle) {
      throw new Error('无法创建本地临时文件写入句柄 (OPFS access handle failed)');
    }
    accessHandle.truncate(0);

    const encoder = new TextEncoder();
    const writeBuffer = (str: string) => {
      const encoded = encoder.encode(str + '\n');
      accessHandle?.write(encoded);
    };

    const reportProgress = (count: number, force = false) => {
      const now = Date.now();
      if (force || (now - lastProgressReport > 500) || (count % 500 === 0)) {
        postMessage({ type: 'progress', processed: count });
        lastProgressReport = now;
      }
    };

    // Helper to render template
    const renderTemplate = (tpl: string, row: any) => {
      return tpl.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        const k = key.trim();
        return row[k] !== undefined && row[k] !== null ? String(row[k]) : match;
      });
    };

    let headers: string[] = [];
    let isFirstRow = true;

    // Handler for processing a single row object
    const processSingleRow = (row: any) => {
      // 1. Render content
      const content = renderTemplate(template, row);
      
      // 2. Prepare output object
      // We want to preserve original order if possible, and add content at the end
      if (isFirstRow) {
        headers = Object.keys(row);
        // Ensure 'content' is not already in headers (or overwrite if it is?)
        // Requirement says "Add new column content". 
        // If 'content' exists, we might overwrite or append. Let's overwrite/use it.
        if (!headers.includes('content')) {
            headers.push('content');
        }
        // Write header row
        const headerString = Papa.unparse([headers], { quotes: true, quoteChar: '"' });
        writeBuffer(headerString);
        isFirstRow = false;
      }

      // Construct row array based on headers
      const rowValues = headers.map(h => {
          if (h === 'content') return content;
          return row[h];
      });

      // Write data row
      const rowString = Papa.unparse([rowValues], { quotes: true, quoteChar: '"', header: false });
      writeBuffer(rowString);
      processedCount++;
      reportProgress(processedCount);
    };

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        step: (results) => {
            const row = results.data as any;
            // Skip empty objects that PapaParse sometimes yields at end
            if (Object.keys(row).length === 0) return;
            processSingleRow(row);
        },
        complete: () => {
          reportProgress(processedCount, true);
          accessHandle?.flush?.();
          accessHandle?.close();
          postMessage({ type: 'complete', processed: processedCount, tempFilename });
        },
        error: (err) => {
          accessHandle?.close();
          postMessage({ type: 'error', error: err.message });
        }
      });
    } else {
      // Excel handling - Read full file (XLSX limitation in browser often implies full read)
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      for (const row of jsonData) {
          processSingleRow(row);
      }
      
      reportProgress(processedCount, true);
      accessHandle?.flush?.();
      accessHandle?.close();
      postMessage({ type: 'complete', processed: processedCount, tempFilename });
    }

  } catch (err: any) {
    if (accessHandle) accessHandle.close();
    postMessage({ type: 'error', error: err.message || 'Unknown error in worker' });
  }
};
