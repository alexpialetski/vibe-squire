/** @type {import('lint-staged').Configuration} */
export default {
  /**
   * Run full-repo `format`, `lint`, and `typecheck` when TS sources are staged.
   * Function form avoids lint-staged appending filenames (which breaks `npm run typecheck`).
   */
  '**/*.{ts,mts,cts}': () => [
    'npm run format',
    'npm run lint',
    'npm run typecheck',
  ],
};
