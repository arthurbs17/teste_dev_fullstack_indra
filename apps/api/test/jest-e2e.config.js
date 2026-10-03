/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/support/global-setup.ts',
  globalTeardown: '<rootDir>/support/global-teardown.ts',
  // Um único banco compartilhado: os arquivos rodam em sequência para que as
  // fixtures de um não interfiram nas asserções de outro.
  maxWorkers: 1,
  testTimeout: 30_000,
};
