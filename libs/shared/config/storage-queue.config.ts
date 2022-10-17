import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env['AZURE_STORAGE_CONNECTIONSTRING']) {
  console.error('Storage Queue configurations undefined. Please, make sure environment variables are in place!');
}

export const STORAGE_QUEUE_CONFIG = Object.freeze({
  storageConnectionString: process.env['AZURE_STORAGE_CONNECTIONSTRING'] || ''
});
