import { env } from 'process';

import { TestsHelper } from './libs/shared/tests/tests.helper';

export default async (): Promise<void> => {
  console.log('Running tests helper setup');

  // See hack info in jest.setup.ts
  // Faking the resolved type as the entityDataType (this is exported as a POJO for jest but builder methods are expecting entities)
  const completeScenarioData = await (await new TestsHelper().init()).createCompleteScenario();
  env['completeScenarioData'] = JSON.stringify(completeScenarioData);

  env['CLIENT_WEB_BASE_URL'] = 'http://localhost:4200';
};
