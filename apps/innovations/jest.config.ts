
import type { Config } from 'jest';
import jestBaseConfig from '../../jest.config';


const config: Config = {
  ...jestBaseConfig,
  coverageDirectory: '../../coverage/innovations',
  testMatch: ['**/*.spec.ts']
};

export default config;
