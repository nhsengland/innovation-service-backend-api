import { env } from 'process';

// Disable console.log in tests
// global.console.log = jest.fn();

// This is such an ugly hack to support running in parallel
// runInBand works with the global, run in parallel does not
// an alternative could be export to a file on setup then read it here instead of using the env
(global as any).sampleData = (global as any).sampleData || JSON.parse(env['sampleData'] as string);