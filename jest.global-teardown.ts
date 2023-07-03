import { TestsHelper } from './libs/shared/tests';

export default async (): Promise<void> => {
  console.log('Tests completed. Cleaning up...');

  // Comment these if you want to check database the tests
  const testsHelper = new TestsHelper();
  await testsHelper.init();
  await testsHelper.cleanUp();
};
