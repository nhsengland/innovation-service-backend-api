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
  coverageProvider: 'v8',
  coverageReporters: ['text', 'cobertura'],
  coveragePathIgnorePatterns: [
    '.config.ts',
    '.interfaces.ts',
    '.schemas.ts',
    '.types.ts',
    '.entity.ts',
    '.dtos?.ts',
    // This is mostly datatype and previous versions aren't "used"
    'libs/shared/schemas/innovation-record',
    // This is for migrations
    'libs/data-access',
    // These are just used for development and testing
    'libs/shared/tests',
    'libs/shared/builders',
    'node_modules'
  ],
  testTimeout: 60000,
  workerIdleMemoryLimit: '1Gb'
};

export default jestBaseConfig;
