import type { Config } from 'jest';

const jestBaseConfig: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // 'setupFilesAfterEnv': ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '@admin/shared/(.*)': '<rootDir>/apps/admin/.symlinks/shared/$1',
    '@innovations/shared/(.*)': '<rootDir>/apps/innovations/.symlinks/shared/$1',
    '@notifications/shared/(.*)': '<rootDir>/apps/notifications/.symlinks/shared/$1',
    '@users/shared/(.*)': '<rootDir>/apps/innovations/.symlinks/shared/$1'
  }
};

export default jestBaseConfig;
