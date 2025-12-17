// src/services/pdfExtractor.ts
import { PDFParse } from 'pdf-parse';
import { getBlobBuffer, putJSON } from './blobStore';

export async function extractPdfText(pdfPath: string): Promise<string> {
  console.log(`📄 [extractPdfText] Starting extraction for: ${pdfPath}`);

  // 1 — Load PDF data
  let buffer: Buffer;
  try {
    buffer = await getBlobBuffer(pdfPath);
    console.log(`📄 [extractPdfText] Loaded PDF buffer (${buffer.length} bytes)`);
  } catch (err: any) {
    console.error(`❌ [extractPdfText] Failed to load PDF blob: ${err.message}`);
    throw err;
  }

  // 2 — Initialize parser
  let parser: PDFParse;
  try {
    parser = new PDFParse({ data: buffer });
    console.log(`📄 [extractPdfText] PDFParse instance created`);
  } catch (err: any) {
    console.error(`❌ [extractPdfText] Failed creating PDFParse instance: ${err.message}`);
    throw err;
  }

  // 3 — Extract text
  try {
    const result = await parser.getText();
    console.log(`📄 [extractPdfText] Extracted text length: ${result.text?.length ?? 0}`);

    await parser.destroy();
    return result.text || "";
  } catch (err: any) {
    console.error(`❌ [extractPdfText] Failed extracting text: ${err.message}`);
    throw err;
  }
}

export async function extractAndStoreDeckText(basePath: string) {
  console.log(`📄 [extractAndStoreDeckText] Called for basePath=${basePath}`);

  const pdfKey = `${basePath}/raw_deck.pdf`;
  const textKey = `${basePath}/deck_text.json`;

  try {
    const text = await extractPdfText(pdfKey);

    await putJSON(textKey, { 
      extracted_at: new Date().toISOString(),
      length: text.length,
      text
    });

    console.log(`✔ [extractAndStoreDeckText] Saved → ${textKey}`);
    return textKey;
  } catch (err: any) {
    console.error(`❌ [extractAndStoreDeckText] FAILED to extract text for ${pdfKey}`, err);
    throw err;
  }
}

// Safe version that won't kill the entire scoring route
export async function extractAndStoreDeckTextSafe(basePath: string) {
  try {
    return await extractAndStoreDeckText(basePath);
  } catch (err) {
    console.error(`⚠ [extractAndStoreDeckTextSafe] Non-fatal error extracting PDF text`, err);
    return null;
  }
}
