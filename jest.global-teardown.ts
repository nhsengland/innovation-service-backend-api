import { TestsHelper } from './libs/shared/tests/tests.helper';

export default async (): Promise<void> => {

  console.log('Tests completed. Cleaning up...');

  // Comment these if you want to check database the tests
  await TestsHelper.init();
  await TestsHelper.cleanUp();

};
