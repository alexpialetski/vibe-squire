/** @type {import('lint-staged').Configuration} */
export default {
  /**
   * Run full-repo `format`, `lint`, and `typecheck` when TS sources are staged.
   * Function form avoids lint-staged appending filenames (which breaks `pnpm run typecheck`).
   */
  '**/*.{ts,mts,cts,tsx}': () => [
    'pnpm run format',
    'pnpm run lint',
    'pnpm run typecheck',
  ],
};
