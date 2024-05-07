import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env['CLIENT_WEB_BASE_URL']) {
  console.error('Admin app undefined variables. Please, make sure environment variables are in place');
}

export const ENV = Object.freeze({
  webBaseUrl: process.env['CLIENT_WEB_BASE_URL'] || '',
  webBaseTransactionalUrl: new URL('transactional', process.env['CLIENT_WEB_BASE_URL'] || '').toString(),
  esInnovationIndexName: process.env['ES_INNOVATION_INDEX_NAME'] ?? 'ir-documents'
});
