import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env['ES_INNOVATION_INDEX_NAME']) {
  console.error('ES_INNOVATION_INDEX_NAME is not defined, using the default index "ir-documents".');
}

export const ENV = Object.freeze({
  esInnovationIndexName: process.env['ES_INNOVATION_INDEX_NAME'] ?? 'ir-documents'
});
