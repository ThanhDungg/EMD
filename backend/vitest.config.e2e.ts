import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // E2E gọi HTTP thật (nhiều round-trip tới DB) nên cần timeout rộng hơn mặc định.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
