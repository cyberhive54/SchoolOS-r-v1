'use strict';

// rootDir = backend/src
// Types and config are local: backend/src/types and backend/src/config
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@schoolos/types$': '<rootDir>/types',
    '^@schoolos/config$': '<rootDir>/config',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../tsconfig.test.json',
    },
  },
};
