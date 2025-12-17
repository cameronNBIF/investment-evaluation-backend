import 'dotenv/config';

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  model: process.env.MODEL_NAME || 'gemini-2.5-flash',
  port: Number(process.env.PORT || 3000),
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  azureStorageContainerKey: process.env.AZURE_STORAGE_CONTAINER_KEY,
  azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER,
  azureStorageAccount: process.env.AZURE_STORAGE_ACCOUNT
};
