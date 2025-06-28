import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testMatch: [
      '**/__tests__/**/*.js',
      '**/?(*.)+(spec|test).js'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'server.js',
        'services/**/*.js',
        'middleware/**/*.js',
        'database.js',
        'routes/**/*.js',
        'config/**/*.js'
      ]
    }
  }
});