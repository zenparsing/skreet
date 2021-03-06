const { resolve } = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { rollup } = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');

function $(p) {
  return resolve(__dirname, '../', p);
}

function trap(err) {
  console.log(err);
  process.exit(1);
}

function selfhostPlugin() {
  const { compile } = require('./out/compiler.js');
  return {
    name: 'selfhost',
    transform(code, id) {
      let result = compile(code, {
        location: id,
        module: true,
        sourceMap: true,
      });

      return {
        code: result.output,
        map: result.sourceMap,
      };
    },
  };
}

function smokeTest() {
  return new Promise((resolve, reject) => {
    let child = spawn('node', [
      $('bin/skertc.js'),
      $('packages/parser/src/Parser.js'),
    ], {
      cwd: __dirname,
      env: process.env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });

    child.on('exit', code => {
      if (code !== 0) {
        reject(new Error('Smoke test failed'));
      } else {
        resolve();
      }
    });
  });
}

function saveCurrent() {
  let files = ['cli.js', 'compiler.js', 'parser.js'];
  let stored = new Map();

  function store() {
    if (!fs.existsSync($('build/lkg'))) {
      fs.mkdirSync($('build/lkg'));
    }
    let dir = $(`build/lkg/${ Date.now() }`);
    fs.mkdirSync(dir);
    for (let file of files) {
      fs.writeFileSync(`${ dir }/${ file }`, stored.get(file), 'utf8');
    }
  }

  function restore() {
    for (let file of files) {
      fs.writeFileSync(`build/out/${ file }`, stored.get(file), 'utf8');
    }
  }

  try {
    for (let file of files) {
      stored.set(file, fs.readFileSync($(`build/out/${ file }`), 'utf8'));
    }
  } catch (e) {
    trap(
      new Error('Build files not found - run build/bootstrap to generate initial builds.')
    );
  }

  return { store, restore };
}

async function bundle(options) {
  let bundle = await rollup({
    input: options.input,
    plugins: [selfhostPlugin(), nodeResolve()],
    external: options.external,
  });

  await bundle.write({
    file: $(`build/out/${ options.output }`),
    format: 'cjs',
    paths: options.paths,
  });

  if (options.web) {
    await bundle.write({
      file:  $(`build/out/web/${ options.output }`),
      format: 'esm',
      paths: options.paths,
    });
  }
}

async function main() {
  let current;

  try {
    current = await saveCurrent();

    let start = Date.now();

    await bundle({
      input: $('packages/parser/src/index.js'),
      output: 'parser.js',
      web: true,
    });

    await bundle({
      input: $('packages/compiler/src/index.js'),
      output: 'compiler.js',
      web: true,
      external: [$('packages/compiler/src/Parser.js')],
      paths: {
        [$('packages/compiler/src/Parser.js')]: './parser.js',
      },
    });

    await bundle({
      input: $('packages/cli/src/index.js'),
      output: 'cli.js',
      web: false,
      external: ['path', 'fs', 'module', $('packages/cli/src/Compiler.js')],
      paths: {
        [$('packages/cli/src/Compiler.js')]: './compiler.js',
      },
    });

    console.log(`Bundling completed in ${ ((Date.now() - start) / 1000).toFixed(2) }s`);

    await smokeTest();

    await current.store();

  } catch (e) {
    if (current) {
      console.log('Restoring previous build output')
      await current.restore();
    }
    trap(e);
  }
}

main();
