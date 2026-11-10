import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.angular/**', '**/coverage/**', '**/test-results/**', '**/playwright-report/**'] },
  { files: ['apps/**/*.ts'], extends: [tseslint.configs.recommended] },
);
