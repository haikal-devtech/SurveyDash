import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', '.data/**', 'test-results/**', 'node_modules/**', 'next-env.d.ts']),
  {
    files: ['src/components/slide-renderer.tsx', 'src/components/presentation-editor.tsx'],
    rules: { '@next/next/no-img-element': 'off' },
  },
]);
