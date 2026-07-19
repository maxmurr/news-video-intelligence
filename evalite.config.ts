import { fileURLToPath } from 'node:url';

import { defineConfig } from 'evalite/config';

export default defineConfig({
  // Judge scores are the raw 1-5 rating divided by 5, so 3/5 (the old pass
  // threshold) maps to 0.6. Below this average, `evalite run` exits non-zero.
  scoreThreshold: 60,
  // A single stage runs an LLM call (transcribe/segment/etc.) over a full
  // broadcast plus an ffmpeg pass; the 30s default times out immediately.
  testTimeout: 600_000,
  viteConfig: {
    resolve: {
      alias: {
        // The DI container's infrastructure imports reach server-only modules;
        // stub them so the container is importable outside Next, matching
        // vitest.config.ts.
        'server-only': fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
  },
});
