import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type FileSystemSyncAccessHandle = {
  write: (buffer: ArrayBufferView) => number;
  truncate: (newSize: number) => void;
  flush?: () => void;
  close: () => void;
};

interface WorkerMessage {
  type: 'file';
  file: File;
}

const MAX_ERRORS = 10;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file } = e.data;
  const fileName = file.name;
  const isCsv = fileName.toLowerCase().endsWith('.csv');
  
  const customIdSet = new Set<string>();
  let processedCount = 0;
  let totalLines = 0;
  let lastProgressReport = 0;
  const errors: string[] = [];

  let accessHandle: FileSystemSyncAccessHandle | null = null;
  let root: FileSystemDirectoryHandle;
  let fileHandle: FileSystemFileHandle;
  const tempFilename = `conversion_${Date.now()}_${Math.random().toString(16).slice(2)}.jsonl`;

  try {
    root = await navigator.storage.getDirectory();
    fileHandle = await root.getFileHandle(tempFilename, { create: true });
    accessHandle = await (fileHandle as any).createSyncAccessHandle();
    if (!accessHandle) {
      throw new Error('无法创建本地临时文件写入句柄');
    }
    accessHandle.truncate(0);

    const encoder = new TextEncoder();

    const writeBuffer = (str: string) => {
        const encoded = encoder.encode(str + '\n');
        accessHandle?.write(encoded);
    };

    const reportProgress = (count: number, force = false) => {
        const now = Date.now();
        if (force || (now - lastProgressReport > 500) || (count % 2000 === 0)) {
            postMessage({ type: 'progress', processed: count });
            lastProgressReport = now;
        }
    };

    const handleRowError = (msg: string) => {
      if (errors.length < MAX_ERRORS) {
          errors.push(msg);
      } else if (errors.length === MAX_ERRORS) {
          errors.push("错误过多，停止检查...");
      }
    };

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        step: (results) => {
          totalLines++;
          try {
            const row = results.data as any;
            const result = processRow(row, customIdSet, totalLines);
            
            if (result.success && result.data) {
              writeBuffer(result.data);
              processedCount++;
              reportProgress(processedCount);
            } else if (!result.success && result.error) {
              handleRowError(result.error);
            }
          } catch (err: any) {
            handleRowError(`Line ${totalLines}: Unexpected error ${err.message}`);
          }
        },
        complete: () => {
          reportProgress(processedCount, true);
          accessHandle?.flush?.();
          accessHandle?.close();
          postMessage({ type: 'complete', processed: processedCount, errors, tempFilename: tempFilename });
        },
        error: (err) => {
          accessHandle?.close();
          postMessage({ type: 'error', error: err.message || String(err) });
        }
      });
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet);
      
      if (rows.length > 0) {
        const firstRow = rows[0] as any;
        if (!('custom_id' in firstRow) || !('content' in firstRow)) {
           throw new Error(`文件必须包含 'custom_id' 和 'content' 列。当前列: ${Object.keys(firstRow).join(', ')}`);
        }
      }

      for (const row of rows) {
        totalLines++;
        const result = processRow(row as any, customIdSet, totalLines);
        
        if (result.success && result.data) {
          writeBuffer(result.data);
          processedCount++;
          reportProgress(processedCount);
        } else if (!result.success && result.error) {
           handleRowError(result.error);
        }
        
        if (processedCount % 5000 === 0) {
             await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      reportProgress(processedCount, true);
      accessHandle?.flush?.();
      accessHandle?.close();
      postMessage({ type: 'complete', processed: processedCount, errors, tempFilename: tempFilename });
    }
  } catch (err: any) {
    try { 
        accessHandle?.close(); 
    } catch (e) {}
    postMessage({ type: 'error', error: err.message });
  }
};

function processRow(row: any, customIdSet: Set<string>, lineNum: number): { success: boolean, data?: string, error?: string } {
  // 1. Check custom_id
  const customIdRaw = row.custom_id;
  if (!customIdRaw && customIdRaw !== 0) { // allow 0 as ID
     return { success: false, error: `第${lineNum}行custom_id不存在` };
  }
  
  const customId = String(customIdRaw);
  
  // Note: The original Python script checks if custom_id is string. 
  // In JS, almost everything from CSV/Excel is string or number, which we convert to string.
  // So strict type check "isinstance(custom_id, str)" might be redundant after String() conversion,
  // but let's assume empty string is invalid if that was the intent.
  if (customId.trim() === "") {
      return { success: false, error: `第${lineNum}行custom_id为空` };
  }

  if (customIdSet.has(customId)) {
    return { success: false, error: `custom_id=${customId}存在重复` };
  }
  customIdSet.add(customId);

  // 2. Check content
  // Python script: checks if 'content' column exists in dataframe validation.
  // Here we check if it is missing from row object (undefined).
  if (row.content === undefined) {
      // It might be acceptable to have empty content, but the column must exist.
      // In CSV/Excel, if column exists, it will be at least empty string or null.
      // If it's undefined, it implies column issue or sparse data.
      // But let's follow standard behavior: treat as empty string if missing?
      // Re-reading app.py: "文件必须包含 'custom_id' 和 'content' 列"
      // If a row doesn't have it, it's an issue.
      // However, PapaParse/XLSX might not set key if cell is empty.
      // Let's assume empty string.
  }
  const content = row.content !== undefined && row.content !== null ? String(row.content) : "";

  // 3. Construct JSON object
  let messageContent: any = content;
  
  // Check image_url
  if (row.image_url) {
    const imageUrl = String(row.image_url).trim();
    if (imageUrl) {
      messageContent = [
        {
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        },
        {
          type: "text",
          text: content
        }
      ];
    }
  }

  const jsonObj = {
    custom_id: customId,
    body: {
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ],
      max_tokens: 4096,
      top_p: 1,
      temperature: 0.7
    }
  };

  return { success: true, data: JSON.stringify(jsonObj) };
}
