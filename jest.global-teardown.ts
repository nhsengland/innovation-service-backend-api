import { TestsLegacyHelper } from './libs/shared/tests/tests-legacy.helper';

export default async (): Promise<void> => {

  console.log('Tests completed. Cleaning up...');

  // Comment these if you want to check database the tests
  await TestsLegacyHelper.init();
  await TestsLegacyHelper.cleanUp();

};
