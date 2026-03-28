import typescript from 'rollup-plugin-typescript2';
export default {
  input: 'src/index.ts',
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
    }),
  ],
  output: [
    {
      file: 'dist/youtube-transcript-plus.mjs',
      format: 'esm',
    },
    {
      file: 'dist/youtube-transcript-plus.cjs',
      format: 'cjs',
    },
  ],
  external: ['node:fs/promises', 'node:path'],
};
