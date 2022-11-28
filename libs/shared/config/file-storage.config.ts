import * as dotenv from 'dotenv';

dotenv.config();


if (!process.env['STORAGE_CONTAINER'] || !process.env['STORAGE_ACCOUNT'] || !process.env['STORAGE_KEY'] || !process.env['STORAGE_BASE_URL']) {
  console.error('File storage configurations undefined. Please, make sure environment variables are in place!');
}


export const FILE_STORAGE_CONFIG = Object.freeze({
  // just failsafe to strip leading slash
  storageContainer: process.env['STORAGE_CONTAINER']?.replace(/^\//, '') ?? '',
  storageAccount: process.env['STORAGE_ACCOUNT'] ?? '',
  storageKey: process.env['STORAGE_KEY'] ?? '',
  storageBaseUrl: process.env['STORAGE_BASE_URL'] ?? ''
});
