import type { RedisClientOptions } from 'redis';

// This converts the azure redis connection string into a format that the redis client can use
// Currently only using the url, ssl and password
const [url, ...parameters] = (process.env['REDIS_CACHE_CONNECTIONSTRING'] || '').split(',');
const dict = parameters.map(s => s.match('([^=]+)=(.*)'))
  .reduce((acc, m) => {
    if(m && m[1] && m[2]) {
      acc[m[1]] = m[2];
    }
    return acc
  }, {} as Record<string, string>);

export const REDIS_DEFAULT_CONNECTION: RedisClientOptions = Object.freeze<RedisClientOptions>({
  url: `redis${dict['ssl']==='True' ? 's' : ''}://${url}`,
  ...dict['password'] && { password: dict['password'] },
});