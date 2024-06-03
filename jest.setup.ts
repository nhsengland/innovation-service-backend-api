import type { RedisService } from '@notifications/shared/services';
import { env } from 'process';
import { container } from './libs/shared/config/inversify.config';
import type { SQLConnectionService } from './libs/shared/services';
import SHARED_SYMBOLS from './libs/shared/services/symbols';

// Disable console.log in tests
// global.console.log = jest.fn();

// This is such an ugly hack to support running in parallel
// runInBand works with the global, run in parallel does not
// an alternative could be export to a file on setup then read it here instead of using the env
(global as any).completeScenarioData =
  (global as any).completeScenarioData || JSON.parse(env['completeScenarioData'] as string);

afterAll(async () => {
  if (global.gc) global.gc();
  (global as any).completeScenarioData = undefined;
  await container.get<RedisService>(SHARED_SYMBOLS.RedisService)?.destroy();
  await container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService)?.destroy();
});
