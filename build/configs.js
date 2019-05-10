const path = require('path')
const buble = require('rollup-plugin-buble')
const flow = require('rollup-plugin-flow-no-whitespace')
const typescript = require('rollup-plugin-typescript')
const cjs = require('rollup-plugin-commonjs')
const node = require('rollup-plugin-node-resolve')
const babel = require('rollup-plugin-babel')
const replace = require('rollup-plugin-replace')
const version = process.env.VERSION || require('../package.json').version
const banner =
`/**
  * vue-socket v${version}
  * @author youngpan
  * (c) ${new Date().getFullYear()}
  */`

const resolve = _path => path.resolve(__dirname, '../', _path)

module.exports = [
  // browser dev
  {
    file: resolve('dist/vue-socket.js'),
    format: 'umd',
    env: 'development'
  },
  {
    file: resolve('dist/vue-socket.min.js'),
    format: 'umd',
    env: 'production'
  },
  {
    file: resolve('dist/vue-socket.common.js'),
    format: 'cjs'
  },
  {
    file: resolve('dist/vue-socket.esm.js'),
    format: 'es'
  }
].map(genConfig)

function genConfig (opts) {
  const config = {
    input: {
      input: resolve('src/index.js'),
      plugins: [
        typescript({lib: ["es5", "es6", "dom"], target: "es5"}),
        flow(),
        node(),
        babel({
            exclude: 'node_modules/**', // only transpile our source code
            runtimeHelpers: true 
        }),
        cjs(),
        replace({
          __VERSION__: version
        }),
        buble()
      ]
    },
    output: {
      file: opts.file,
      format: opts.format,
      banner,
      name: 'VueSocket'
    }
  }

  if (opts.env) {
    config.input.plugins.unshift(replace({
      'process.env.NODE_ENV': JSON.stringify(opts.env)
    }))
  }

  return config
}
