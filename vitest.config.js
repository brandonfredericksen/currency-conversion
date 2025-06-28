import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testMatch: [
      '**/src/__tests__/**/*.ts',
      '**/src/**/?(*.)+(spec|test).ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/__tests__/**',
        'src/types/**'
      ]
    }
  }
});