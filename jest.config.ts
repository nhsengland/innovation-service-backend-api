import type { Config } from 'jest';

const jestBaseConfig: Config = {
  preset: 'ts-jest',
  roots: ['<rootDir>/apps', '<rootDir>/libs'],
  testEnvironment: 'node',
  // 'setupFilesAfterEnv': ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '@admin/shared/(.*)': '<rootDir>/apps/admin/.symlinks/shared/$1',
    '@innovations/shared/(.*)': '<rootDir>/apps/innovations/.symlinks/shared/$1',
    '@notifications/shared/(.*)': '<rootDir>/apps/notifications/.symlinks/shared/$1',
    '@users/shared/(.*)': '<rootDir>/apps/innovations/.symlinks/shared/$1'
  },
  // Enable these if you want to run tests in parallel. Don't forget to remove the afterAll database cleanups
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  globalSetup: '<rootDir>/jest.global-setup.ts',
  globalTeardown: '<rootDir>/jest.global-teardown.ts',
  coverageReporters: ['text', 'cobertura'],
  testTimeout: 15000
};

export default jestBaseConfig;
