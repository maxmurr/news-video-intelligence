import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // The DI container's infrastructure imports reach server-only modules
      // (files-sdk storage, workflow engine). Tests bind mocks for those
      // services, so the real modules just need to be importable.
      'server-only': fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
