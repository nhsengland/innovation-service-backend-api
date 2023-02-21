import * as dotenv from 'dotenv';

dotenv.config();


if (!process.env['CLIENT_WEB_BASE_URL']) {
  console.error('Notifications app undefined variables. Please, make sure environment variables are in place');
}


export const ENV = Object.freeze({
  webBaseUrl: process.env['CLIENT_WEB_BASE_URL'] || '',
  webBaseTransactionalUrl: new URL('transactional', process.env['CLIENT_WEB_BASE_URL'] || '').toString() // TODO: Find best way to join URLs.
});
