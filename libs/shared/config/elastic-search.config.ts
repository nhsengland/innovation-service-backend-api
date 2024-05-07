import type { ClientOptions } from '@elastic/elasticsearch';

if (!process.env['ES_API_URL']) {
  console.error('ElasticSearch configurations undefined. Please, make sure environment variables are in place!');
}

export const ES_CONNECTION_CONFIG = Object.freeze<ClientOptions>({
  node: process.env['ES_API_URL'] ?? 'http://127.0.0.1:9200',
  auth: process.env['ES_API_KEY'] ? { apiKey: process.env['ES_API_KEY'] } : undefined
});
