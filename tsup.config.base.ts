import type { Options } from 'tsup'
import fs from 'fs'

interface ConfigOptions {
  name: string
  entry: string
}

export const defaultConfig = (
  { name, entry }: ConfigOptions,
  options: Options
): Options[] => {
  const commonOptions: Partial<Options> = {
    entry: {
      [name]: entry,
    },
    sourcemap: true,
    ...options,
  }

  const productionOptions = {
    minify: true,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  }

  return (
    [
      // ESM, standard bundler dev, embedded `process` references
      {
        ...commonOptions,
        format: ['esm'],
        dts: true,
        sourcemap: true,
      },
      // ESM, Webpack 4 support. Target ES2018 syntax to compile away optional chaining and spreads
      {
        ...commonOptions,
        entry: {
          [`${name}.legacy-esm`]: entry,
        },
        // ESBuild outputs `'.mjs'` by default for the 'esm' format. Force '.js'
        outExtension: () => ({ js: '.js' }),
        target: 'es2017',
        format: ['esm'],
        sourcemap: true,
      },
      // ESM for use in browsers. Minified, with `process` compiled away
      {
        ...commonOptions,
        ...productionOptions,
        entry: {
          [`${name}.production`]: entry,
        },
        format: ['esm'],
        outExtension: () => ({ js: '.mjs' }),
      },
      // CJS development
      {
        ...commonOptions,
        entry: {
          [`${name}.cjs.development`]: entry,
        },
        format: 'cjs',
        outDir: './dist/cjs/',
      },
      // CJS production
      {
        ...commonOptions,
        ...productionOptions,
        entry: {
          [`${name}.cjs.production`]: entry,
        },
        format: 'cjs',
        outDir: './dist/cjs/',
        onSuccess: async () => {
          // Write the CJS index file
          fs.writeFileSync(
            'dist/cjs/index.js',
            `
'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${name}.cjs.production.min.js')
} else {
  module.exports = require('./${name}.cjs.development.js')
}`
          )
        },
      },
    ] as Options[]
  ).map(config => ({
    ...config,
    clean: !options.watch,
    external: [
      'react',
      'react-dom',
      'react-native',
      '@react-three/fiber',
      'three',
      'react-konva',
      'konva',
      'react-zdog',
      'zdog',
    ],
  }))
}
