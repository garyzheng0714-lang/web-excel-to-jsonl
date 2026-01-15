
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface WorkerMessage {
  type: 'file';
  file: File;
  shouldSplit: boolean;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file, shouldSplit } = e.data;
  
  try {
    const fileName = file.name;
    // Extract base name without extension
    const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    // Parse CSV
    Papa.parse(file, {
      header: false, // We need the array of arrays to handle header manually
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[][];
          if (rows.length === 0) {
            throw new Error('CSV文件为空');
          }

          const header = rows[0];
          const dataRows = rows.slice(1);
          
          // Report row count early
          postMessage({ 
            type: 'fileInfo', 
            rowCount: dataRows.length 
          });

          const zipFiles: { name: string, blob: Blob }[] = [];

          if (shouldSplit) {
            // Chunk size: 20000 lines max per file (including header and 2 empty lines)
            // So data rows per chunk = 20000 - 1 (header) - 2 (empty lines) = 19997
            const MAX_ROWS_PER_FILE = 20000;
            const HEADER_ROWS_COUNT = 3; // 1 header + 2 empty
            const DATA_ROWS_PER_CHUNK = MAX_ROWS_PER_FILE - HEADER_ROWS_COUNT;
  
            const totalChunks = Math.ceil(dataRows.length / DATA_ROWS_PER_CHUNK);
  
            for (let i = 0; i < totalChunks; i++) {
              const start = i * DATA_ROWS_PER_CHUNK;
              const end = start + DATA_ROWS_PER_CHUNK;
              const chunkData = dataRows.slice(start, end);
  
              // Construct new sheet data: Header, Empty, Empty, ...Data
              const newSheetData = [
                header,
                [], // Empty row 1
                [], // Empty row 2
                ...chunkData
              ];
  
              // Create Workbook
              const wb = XLSX.utils.book_new();
              const ws = XLSX.utils.aoa_to_sheet(newSheetData);
              XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
              // Generate XLSX Buffer
              const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
              // Create Zip
              const zip = new JSZip();
              // The file inside zip should be named "产品榜导入信息.xlsx"
              zip.file("产品榜导入信息.xlsx", xlsxBuffer);
  
              // Generate Zip Blob
              const zipBlob = await zip.generateAsync({ type: 'blob' });
              
              // Zip filename: {OriginalName}_拆分{i+1}.zip
              const zipName = `${baseName}_拆分${i + 1}.zip`;
  
              zipFiles.push({
                name: zipName,
                blob: zipBlob
              });
  
              // Debug info
              const firstRow = chunkData.length > 0 && chunkData[0].length > 0 ? String(chunkData[0][0]).substring(0, 20) : "N/A";
              const lastRow = chunkData.length > 0 && chunkData[chunkData.length-1].length > 0 ? String(chunkData[chunkData.length-1][0]).substring(0, 20) : "N/A";
  
              // Report progress
              postMessage({ 
                type: 'progress', 
                processed: i + 1, 
                total: totalChunks,
                debug: {
                    chunkIndex: i,
                    startLine: start + 1,
                    endLine: end,
                    firstVal: firstRow,
                    lastVal: lastRow
                }
              });
            }
          } else {
             // No Split Mode
             // Construct new sheet data: Header, Empty, Empty, ...AllData
             const newSheetData = [
                header,
                [], // Empty row 1
                [], // Empty row 2
                ...dataRows
             ];

             // Create Workbook
             const wb = XLSX.utils.book_new();
             const ws = XLSX.utils.aoa_to_sheet(newSheetData);
             XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

             // Generate XLSX Buffer
             const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

             // Create Zip
             const zip = new JSZip();
             // The file inside zip should be named "产品榜导入信息.xlsx"
             zip.file("产品榜导入信息.xlsx", xlsxBuffer);

             // Generate Zip Blob
             const zipBlob = await zip.generateAsync({ type: 'blob' });
             
             // Zip filename: {OriginalName}.zip (Same as original filename but .zip)
             const zipName = `${baseName}.zip`;

             zipFiles.push({
                name: zipName,
                blob: zipBlob
             });

             // Report progress (just 1 step)
             postMessage({ 
                type: 'progress', 
                processed: 1, 
                total: 1,
                debug: {
                    chunkIndex: 0,
                    startLine: 1,
                    endLine: dataRows.length,
                    firstVal: dataRows.length > 0 && dataRows[0].length > 0 ? String(dataRows[0][0]).substring(0, 20) : "N/A",
                    lastVal: dataRows.length > 0 && dataRows[dataRows.length-1].length > 0 ? String(dataRows[dataRows.length-1][0]).substring(0, 20) : "N/A"
                }
             });
          }

          postMessage({ 
            type: 'complete', 
            files: zipFiles 
          });

        } catch (err: any) {
          postMessage({ type: 'error', error: err.message });
        }
      },
      error: (err) => {
        postMessage({ type: 'error', error: err.message });
      }
    });
  } catch (err: any) {
    postMessage({ type: 'error', error: err.message });
  }
};
