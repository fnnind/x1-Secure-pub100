import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce UUIDv7 only via lib/utils/id.ts (no direct uuid v7 imports elsewhere).
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'uuid',
              importNames: ['v7'],
              message:
                "Use generateId() from '@/lib/utils/id' instead of importing uuid v7 directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['lib/utils/id.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
