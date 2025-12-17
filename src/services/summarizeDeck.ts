import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlobServiceClient } from "@azure/storage-blob";
import { config } from '../config';
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CONTAINER_NAME = "investment-evaluation";

// Renamed argument to 'basePath' to match what is actually passed
export async function summarizeDeck(
  basePath: string 
): Promise<string | void> {
  try {
    console.log("🔍 [summarizeDeck] Starting");
    console.log("📦 Storage Account:", process.env.AZURE_STORAGE_ACCOUNT);
    console.log("📦 Container:", CONTAINER_NAME);
    console.log("📂 Base Path:", basePath); // Logging path instead of ID

    // -----------------------------------------------------------
    // 1. Connect to Azure Blob Storage
    // -----------------------------------------------------------
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING!
    );

    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);

    // -----------------------------------------------------------
    // 2. Build blob path
    // -----------------------------------------------------------
    // FIX: Removed the hardcoded "requests/" prefix because basePath includes it
    const deckTextBlobName = `${basePath}/deck_text.json`; 

    console.log("📄 Loading blob:", deckTextBlobName);

    const blobClient = containerClient.getBlobClient(deckTextBlobName);

    console.log(
      "🧪 Blob exists?",
      await blobClient.exists()
    );

    // -----------------------------------------------------------
    // 3. Download extracted text
    // -----------------------------------------------------------
    const downloadResponse = await blobClient.download();
    const downloaded = await streamToString(
      downloadResponse.readableStreamBody!
    );

    const parsed = JSON.parse(downloaded);
    const extractedText: string = parsed.text;

    console.log(
      "📏 Extracted text length:",
      extractedText?.length ?? 0
    );

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("deck_text.json contains no extracted text");
    }

    // -----------------------------------------------------------
    // 4. Gemini Summarization
    // -----------------------------------------------------------
    const model = genAI.getGenerativeModel({
      model: config.model
    });

    const prompt = `
You are summarizing text extracted from a pitch deck.

Produce:
- a concise executive summary
- key themes
- important facts
- the purpose of the deck

Do NOT add assumptions.

Deck text:
${extractedText}
`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    console.log("🧠 Summary generated");

    // -----------------------------------------------------------
    // 5. Save summary
    // -----------------------------------------------------------
    // FIX: Removed hardcoded "requests/" prefix here as well
    const summaryBlobName = `${basePath}/deck_summary.json`;
    const summaryBlob =
      containerClient.getBlockBlobClient(summaryBlobName);

    const payload = {
      summary,
      created_at: new Date().toISOString(),
    };

    await summaryBlob.upload(
      JSON.stringify(payload, null, 2),
      Buffer.byteLength(JSON.stringify(payload))
    );

    console.log("✅ deck_summary.json saved:", summaryBlobName);

    return summary;
  } catch (err) {
    console.error("❌ [summarizeDeck] Failed:", err);
  }
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------
async function streamToString(
  readableStream: NodeJS.ReadableStream
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    readableStream.on("data", (d) => chunks.push(d.toString()));
    readableStream.on("end", () => resolve(chunks.join("")));
    readableStream.on("error", reject);
  });
}