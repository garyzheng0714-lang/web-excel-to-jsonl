import Papa from 'papaparse';

type FileSystemSyncAccessHandle = {
  write: (buffer: ArrayBufferView) => number;
  truncate: (newSize: number) => void;
  flush?: () => void;
  close: () => void;
};

type MergeItem =
  | { type: 'file'; file: File; name: string }
  | { type: 'opfs'; filename: string; name: string };

type WorkerMessage = {
  items: MergeItem[];
};

async function getFileFromItem(item: MergeItem): Promise<File> {
  if (item.type === 'file') {
    return item.file;
  } else {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(item.filename);
    return await fileHandle.getFile();
  }
}

function toCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { items } = e.data;
  let accessHandle: FileSystemSyncAccessHandle | null = null;
  let tempFilename = '';

  try {
    if (!items || items.length === 0) {
      throw new Error('没有选择文件');
    }

    postMessage({ type: 'stage', stage: '分析表头' });

    // Pass 1: Collect all headers
    const allHeaders = new Set<string>();
    
    // We need to preserve order as much as possible, but also handle new columns.
    // Let's use a Set to collect unique headers.
    
    for (const item of items) {
      const file = await getFileFromItem(item);
      
      await new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          preview: 1, // Read only the first row to get headers (if header: true, meta.fields has headers)
          step: (results, parser) => {
             // We only need the first row's fields (headers)
             if (results.meta.fields) {
               results.meta.fields.forEach(h => allHeaders.add(h));
             }
             parser.abort();
             resolve();
          },
          complete: () => {
             // In case file is empty or something
             resolve();
          },
          error: (err) => {
             reject(err);
          }
        });
      });
    }

    if (allHeaders.size === 0) {
      throw new Error('未找到任何有效的表头字段');
    }

    const headers = Array.from(allHeaders);
    
    // Create output file
    tempFilename = `merge_temp_${Date.now()}.csv`;
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(tempFilename, { create: true });
    // @ts-ignore
    accessHandle = await fileHandle.createSyncAccessHandle();

    // Write BOM
    accessHandle!.write(new Uint8Array([0xEF, 0xBB, 0xBF]));

    const encoder = new TextEncoder();
    
    // Write Header
    const headerLine = headers.map(toCsvCell).join(',') + '\r\n';
    accessHandle!.write(encoder.encode(headerLine));

    // Pass 2: Write Data
    postMessage({ type: 'stage', stage: '合并数据' });
    let processed = 0;
    const YIELD_EVERY = 100;
    let lastYieldAt = 0;

    for (const item of items) {
       const file = await getFileFromItem(item);
       
       await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
             header: true,
             skipEmptyLines: true,
             chunk: async (results, parser) => {
                parser.pause();
                
                const rowsStr = results.data.map((row: any) => {
                   return headers.map(header => {
                      const val = row[header];
                      return toCsvCell(val);
                   }).join(',');
                }).join('\r\n') + '\r\n';
                
                accessHandle!.write(encoder.encode(rowsStr));
                processed += results.data.length;
                
                if (processed - lastYieldAt >= YIELD_EVERY) {
                    lastYieldAt = processed;
                    postMessage({ type: 'progress', processed });
                    await new Promise(r => setTimeout(r, 0));
                }
                
                parser.resume();
             },
             complete: () => {
                resolve();
             },
             error: (err) => {
                reject(err);
             }
          });
       });
    }

    accessHandle!.flush?.();
    accessHandle!.close();
    accessHandle = null;

    postMessage({ type: 'complete', processed, tempFilename });

  } catch (err: any) {
    if (accessHandle) {
      try { accessHandle.close(); } catch {}
    }
    postMessage({ type: 'error', error: err?.message ? String(err.message) : String(err) });
  }
};
