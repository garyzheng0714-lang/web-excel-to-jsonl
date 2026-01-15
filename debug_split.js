
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

const filePath = "/Users/simba/Library/Mobile Documents/com~apple~CloudDocs/Trae/网页开发/web-excel-to-jsonl/debug_sample.csv";

// Create a sample CSV
const sampleData = [];
// Header
sampleData.push("Col1,Col2");
// 30000 rows
for (let i = 0; i < 30000; i++) {
    sampleData.push(`Data_${i}_A,Data_${i}_B`);
}
fs.writeFileSync(filePath, sampleData.join('\n'));


const fileContent = fs.readFileSync(filePath, 'utf8');

Papa.parse(fileContent, {
  header: false,
  skipEmptyLines: true,
  complete: (results) => {
    const rows = results.data;
    console.log(`Total rows: ${rows.length}`);
    
    if (rows.length === 0) return;

    const header = rows[0];
    const dataRows = rows.slice(1);
    
    // Simulate chunking
    const MAX_ROWS_PER_FILE = 10000;
    const HEADER_ROWS_COUNT = 3; // 1 header + 2 empty
    const DATA_ROWS_PER_CHUNK = MAX_ROWS_PER_FILE - HEADER_ROWS_COUNT; // 9997

    console.log(`Data rows: ${dataRows.length}`);
    console.log(`Rows per chunk: ${DATA_ROWS_PER_CHUNK}`);
    
    const totalChunks = Math.ceil(dataRows.length / DATA_ROWS_PER_CHUNK);
    console.log(`Total chunks: ${totalChunks}`);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * DATA_ROWS_PER_CHUNK;
      const end = start + DATA_ROWS_PER_CHUNK;
      const chunkData = dataRows.slice(start, end);
      
      console.log(`\n--- Chunk ${i + 1} ---`);
      console.log(`Start index: ${start}, End index: ${end}`);
      console.log(`Chunk size: ${chunkData.length}`);
      if (chunkData.length > 0) {
        console.log(`First row data (first col): ${chunkData[0][0]}`);
        console.log(`Last row data (first col): ${chunkData[chunkData.length - 1][0]}`);
      }
    }
  }
});
