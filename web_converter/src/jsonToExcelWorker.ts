

type FileSystemSyncAccessHandle = {
  write: (buffer: ArrayBufferView) => number;
  truncate: (newSize: number) => void;
  flush?: () => void;
  close: () => void;
};

type WorkerMessage = { file: File };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function toRowObject(value: unknown): Record<string, unknown> {
  if (isPlainObject(value)) {
    return flattenRow(value);
  }
  return { value };
}

function flattenRow(original: Record<string, any>): Record<string, any> {
  let result: Record<string, any> = { ...original };
  
  // 1. Unwrap 'body' if it exists
  if (isPlainObject(result.body)) {
    const body = result.body;
    // We keep the original 'body' key? No, user wants flattened columns.
    // But to be safe, maybe we should keep it if there are conflicts?
    // Let's assume no conflicts for now or just overwrite.
    delete result.body;
    result = { ...result, ...body };
  }
  
  // 2. Extract content from messages if available
  if (Array.isArray(result.messages)) {
    // Try to find user message
    const userMsg = result.messages.find((m: any) => m?.role === 'user');
    if (userMsg?.content && !result.content) {
      result.content = userMsg.content;
    }
    
    // Try to find assistant message (for results)
    const assistantMsg = result.messages.find((m: any) => m?.role === 'assistant');
    if (assistantMsg?.content && !result.output) {
      result.output = assistantMsg.content;
    }
  }
  
  // 3. Handle 'response' object (common in batch inference output)
  if (isPlainObject(result.response) && isPlainObject(result.response.body)) {
     const respBody = result.response.body as any;
     if (Array.isArray(respBody.choices)) {
         const choice = respBody.choices[0];
         if (choice?.message?.content && !result.output) {
             result.output = choice.message.content;
         }
     }
  }

  return result;
}

function toCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file } = e.data;
  const tempFilename = `json_to_excel_${Date.now()}_${Math.random().toString(16).slice(2)}.csv`;
  let accessHandle: FileSystemSyncAccessHandle | null = null;

  try {
    postMessage({ type: 'stage', stage: '准备中' });
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(tempFilename, { create: true });
    accessHandle = await (fileHandle as any).createSyncAccessHandle();
    if (!accessHandle) {
      throw new Error('无法创建本地临时文件写入句柄');
    }
    accessHandle.truncate(0);

    const isJsonl = file.name.toLowerCase().endsWith('.jsonl');
    const PROGRESS_EVERY = 500;
    const YIELD_EVERY = 2000;

    const header = new Set<string>();
    let processed = 0;
    let lastYieldAt = 0;

    // --- 第一遍扫描：确定表头 ---
    postMessage({ type: 'stage', stage: '扫描字段中' });

    const scanRow = (rowObj: Record<string, unknown>) => {
      for (const key of Object.keys(rowObj)) {
        header.add(key);
      }
      processed++;
      if (processed % PROGRESS_EVERY === 0) {
        postMessage({ type: 'progress', processed });
      }
    };

    if (!isJsonl) {
      const text = await file.text();
      const trimmed = text.trim();
      let parsed: unknown = undefined;
      if (trimmed) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          parsed = undefined;
        }
      }

      if (parsed !== undefined) {
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            scanRow(toRowObject(item));
            if (processed - lastYieldAt >= YIELD_EVERY) {
              lastYieldAt = processed;
              await new Promise((r) => setTimeout(r, 0));
            }
          }
        } else {
          scanRow(toRowObject(parsed));
        }
      } else {
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          const l = line.trim();
          if (!l) continue;
          let obj: any;
          try {
            obj = JSON.parse(l);
          } catch {
            // Ignore parse errors in scan phase or handle consistently
          }
          if (obj) scanRow(toRowObject(obj));
          if (processed - lastYieldAt >= YIELD_EVERY) {
            lastYieldAt = processed;
            await new Promise((r) => setTimeout(r, 0));
          }
        }
      }
    } else {
      const reader = file.stream().getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = buffer.indexOf('\n');
        while (idx !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) {
            let obj: any;
            try {
              obj = JSON.parse(line);
            } catch {
              // Ignore
            }
            if (obj) scanRow(toRowObject(obj));
          }
          idx = buffer.indexOf('\n');
        }
        if (processed - lastYieldAt >= YIELD_EVERY) {
          lastYieldAt = processed;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      buffer += decoder.decode();
      const lines = buffer.split(/\r?\n/);
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        let obj: any;
        try {
          obj = JSON.parse(line);
        } catch {
          // Ignore
        }
        if (obj) scanRow(toRowObject(obj));
      }
    }

    if (processed === 0) {
      throw new Error('未解析到有效数据');
    }

    // --- 写入表头 ---
    const headerArray = Array.from(header);
    const encoder = new TextEncoder();
    // Write BOM for Excel UTF-8 compatibility
    accessHandle.write(new Uint8Array([0xEF, 0xBB, 0xBF]));
    
    const headerLine = headerArray.map(toCsvCell).join(',') + '\r\n';
    accessHandle.write(encoder.encode(headerLine));

    // --- 第二遍扫描：写入数据 ---
    processed = 0;
    lastYieldAt = 0;
    postMessage({ type: 'stage', stage: '生成表格中' });

    const writeRow = (rowObj: Record<string, unknown>) => {
      const row = headerArray.map(key => {
        const val = rowObj[key];
        return toCsvCell(normalizeCellValue(val));
      }).join(',');
      accessHandle!.write(encoder.encode(row + '\r\n'));
      
      processed++;
      if (processed % PROGRESS_EVERY === 0) {
        postMessage({ type: 'progress', processed });
      }
    };

    if (!isJsonl) {
      // For small non-jsonl files, we already read text. Re-parsing is fast enough.
      // But for memory safety with large files, we should ideally re-read or cache if small.
      // Given the "freeze" issue is mostly large JSONL, let's just re-parse logic.
      // Optimisation: if we kept `text` in memory for small files, use it.
      // But `file.text()` might be large. Let's re-read to be safe on memory.
      // Actually `file.text()` loads everything. If we are here, we loaded it once.
      // Let's assume non-jsonl files are manageable or we would have crashed in pass 1.
      // To be safe and consistent, let's just re-execute the logic.
      const text = await file.text();
      const trimmed = text.trim();
      let parsed: unknown = undefined;
      if (trimmed) {
        try { parsed = JSON.parse(trimmed); } catch {}
      }
      
      if (parsed !== undefined) {
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            writeRow(toRowObject(item));
            if (processed - lastYieldAt >= YIELD_EVERY) {
              lastYieldAt = processed;
              await new Promise((r) => setTimeout(r, 0));
            }
          }
        } else {
          writeRow(toRowObject(parsed));
        }
      } else {
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          const l = line.trim();
          if (!l) continue;
          let obj: any;
          try { obj = JSON.parse(l); } catch { continue; }
          writeRow(toRowObject(obj));
          if (processed - lastYieldAt >= YIELD_EVERY) {
            lastYieldAt = processed;
            await new Promise((r) => setTimeout(r, 0));
          }
        }
      }
    } else {
      // JSONL: Re-stream from file
      const reader = file.stream().getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = buffer.indexOf('\n');
        while (idx !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) {
            let obj: any;
            try { obj = JSON.parse(line); } catch { continue; }
            writeRow(toRowObject(obj));
          }
          idx = buffer.indexOf('\n');
        }
        if (processed - lastYieldAt >= YIELD_EVERY) {
          lastYieldAt = processed;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      buffer += decoder.decode();
      const lines = buffer.split(/\r?\n/);
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        let obj: any;
        try { obj = JSON.parse(line); } catch { continue; }
        writeRow(toRowObject(obj));
      }
    }

    accessHandle.flush?.();
    accessHandle.close();

    postMessage({ type: 'complete', processed, tempFilename });
  } catch (err: any) {
    try {
      accessHandle?.close();
    } catch {
    }
    postMessage({ type: 'error', error: err?.message ? String(err.message) : String(err) });
  }
};
