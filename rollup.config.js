import typescript from 'rollup-plugin-typescript2';
import { dts } from 'rollup-plugin-dts';
const config = [
  {
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
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.cts' }, { file: 'dist/index.d.ts' }],
    plugins: [dts()],
  },
];

export default config;
