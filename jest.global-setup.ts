import { env } from 'process';

import { resolveNestedPromises } from './libs/shared/helpers/misc.helper';
import { TestsLegacyHelper } from './libs/shared/tests/tests-legacy.helper';
import { TestsHelper } from './libs/shared/tests/tests.helper';

export default async (): Promise<void> => {
  console.log('Running tests helper setup');

  // See hack info in jest.setup.ts
  // (global as any).sampleData = await TestsLegacyHelper.createSampleData();
  // Faking the resolved type as the entityDataType (this is exported as a POJO for jest but builder methods are expecting entities)
  await TestsLegacyHelper.init();
  const data = await TestsLegacyHelper.createSampleData();
  env['sampleData'] = JSON.stringify(await resolveNestedPromises(data));

  const completeScenarioData = await (await new TestsHelper().init()).createCompleteScenario();
  env['completeScenarioData'] = JSON.stringify(completeScenarioData);

  env['CLIENT_WEB_BASE_URL'] = 'http://localhost:4200';
};
