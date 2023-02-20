import { env } from 'process';
import { resolveNestedPromises } from './libs/shared/helpers/misc.helper';
import { TestsHelper } from './libs/shared/tests/tests.helper';

export default async (): Promise<void> => {

  console.log('Running tests helper setup');

  await TestsHelper.init();

  // See hack info in jest.setup.ts
  // (global as any).sampleData = await TestsHelper.createSampleData();
  // Faking the resolved type as the entityDataType (this is exported as a POJO for jest but builder methods are expecting entities)
  const data = await TestsHelper.createSampleData();
  env['sampleData'] = JSON.stringify(await resolveNestedPromises(data));

};
