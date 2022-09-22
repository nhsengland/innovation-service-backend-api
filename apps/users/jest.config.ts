
import jestBaseConfig from '../../jest.config';

import type { Config } from 'jest';


const config: Config = {
  ...jestBaseConfig,
  coverageDirectory: '../../coverage/users',
  testMatch: ['**/*.spec.ts']
};

export default config;
