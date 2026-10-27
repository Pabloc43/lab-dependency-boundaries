import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/lab-dependency-boundaries/',
  test: { include: ['tests/**/*.test.ts'] },
});
