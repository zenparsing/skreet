# SkertJS

*JavaScript-to-JavaScript compiler tools for holistic language design.*

- [About](#about)
- [Features](#features)
- [Install](#install)
- [CLI](#cli)
- [API](#api)
- [Online REPL](https://zenparsing.github.io/skert/repl/)

## About

SkertJS reimagines the future of JavaScript with simple features that address common problems and work well together.

## Features

### Top-Level Await

Top-level await allows the programmer to use use `await` expressions from the top level of a module body.

```js
let response = await fetch(url);
let text = await response.text();
console.log(text);
```

*NOTE: Currently, top-level await is not supported in modules with export declarations.*

### Call-With Operator

The call-with binary operator (`->`) allows the programmer to call a function as if it were a method.

```js
function sayHello(obj, timeOfDay) {
  console.log(`Good ${ timeOfDay }, I'm ${ obj.name }.`);
}

let me = { name: '@zenparsing' };

me->sayHello('morning'); // "Good morning, I'm @zenparsing."
```

### Method Extraction Operator

The method extraction prefix operator (`&`) allows the programmer to extract a method from an object. The extracted method is bound to the object.

```js
let me = {
  name: '@zenparsing',
  hello() { return `Hello, I'm ${ this.name }.`; }
};

let hello = &me.hello;

console.log(hello); // "Hello, I'm @zenparsing."

// Method extraction is idempotent
console.log(hello === &me.hello); // true
```

### Null Coalescing Operator

The null coalescing binary operator (`??`) allows the programmer to specify a default value when applied to `null` or `undefined`.

```js
let obj = { x: 0, y: null };

console.log(obj.x ?? 1); // 0
console.log(obj.y ?? 1); // 1
console.log(obj.z ?? 1); // 1
```

### Symbol Names

Symbol names allow the programmer to effectively use symbols that are local to a module or script.

```js
let obj = {
  @foo: 1
};

console.log(obj.@foo); // 1
console.log(Reflect.ownKeys(obj)); // [Symbol('@foo')]
```

### Build-Time Macros

Macros give the user the ability to transform the program structure at build-time.

```js
import { deprecated } from './macros/deprecated.js';

#[deprecated]
function dontUseMeAnymore() {
  eval('You wrote a bad song Petey!');
}
```

```js
import { templates } from 'ast-helpers';

export function deprecated(ast) {
  ast.body.statements.unshift(templates.statement`
    console.warn('This function is deprecated');
  `);
  return ast;
}
```

### Class Mixins

Class mixins allow the programmer to copy additional methods from another class.

```js
class A {
  a() { return 'a' }
}

class B {
  b() { return 'b' }
}

class C with A, B {}

const c = new C();

c.a(); // 'a'
c.b(); // 'b'
```

### Class Initializer Blocks

Class initializer blocks allow the programmer to execute code when a class is defined.

```js
class Widget extends HTMLElement {
  static {
    window.customElements.define('acme-widget', this);
  }
}
```

## Install

```
npm install @zenparsing/skert
```

## CLI

```
skertc [input_path] ...options
```

### Options

- `--output [output_path]`, `-o [output_path]`: Specifies the output file or directory
- `--script`: Parse the input file or files as scripts instead of modules
- `--cjs`: Output CommonJS-formatted modules
- `--sourcemaps`, `-s`: Output source maps

## API

### `compile(code, options = {})`

Compiles the specified input string and returns a `CompileResult` object.

#### Options

- `module` (boolean): If `true`, the input is parsed as a module instead of a script.
- `transformModules` (boolean): If `true`, modules are translated into CommonJS format.
- `context` (Map): A map containing state which can be persisted between calls.
- `location` (string): The path associated with `code`.
- `sourceMap` (boolean | `'inline'`): If, `true` a source map will be generated and attached to the result object. If `'inline'`, the source map will be added to the output code.

#### Example

```js
import { compile } from '@zenparsing/skert';

let result = compile('export const x = 1;', {
  module: true,
});

console.log(result.output);
```

### `CompileResult`

#### Properties

- `output` (string): The compiled output
- `mappings` (Array): A list of input-to-output source code mappings
- `sourceMap` (`null` | JSON): A source map JSON object
- `context` (Map): A Map representing compiler state
