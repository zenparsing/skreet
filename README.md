# SkertJS

*JavaScript-to-JavaScript compiler tools for holistic language design.*

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

### Annotations

Annotations allow the programmer to attach metadata to various language constructs.

Classes:

```js
#[deprecated]
class C {}
```

Functions:

```js
#[deprecated]
function f() {}
```

*SkertJS currently discards annotations, but we plan on exposing them at runtime using a reflection API.*
