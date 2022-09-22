import type { Config } from 'jest';

const jestBaseConfig: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // 'setupFilesAfterEnv': ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '@innovations/shared/(.*)': '<rootDir>/apps/innovations/.symlinks/shared/$1',
    '@users/shared/(.*)': '<rootDir>/apps/innovations/.symlinks/shared/$1'
  }
};

export default jestBaseConfig;
