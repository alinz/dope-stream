# dope-stream

A simple and chain-able library to work with streams. It supports back-pressure by default by enforcing function as async.

### Usage

There are 2 different pipes in this library. 

#### 1: Pipe 

this is a fundamental building block which dictates 3 main functions, `map`, `filter` and `forEach`. 

```ts
interface Pipe<Value> {
  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Pipe<NewValue>
  filter(fn: (val: Value) => Promise<boolean>): Pipe<Value>
  forEach(fn: (val: Value) => Promise<void>): void
}
```

#### 2: PushPipe

this is an extended version of `Pipe` but with the ability to push values into the pipe. 

```ts
export interface PushPipe<Value> extends Pipe<Value> {
  push(val: Value): Promise<void>
}
```

`push` method is a promised method. One interesting feature of `push` is that if any method inside pipe throws an exception you can catch it.

```ts
import { createPushPipe } from 'dope-stream'

const pipe = createPushPipe<number>()

pipe.map(async (val) => {
  if (n === 0) {
    throw "value should not be zero"
  }

  return 1/n
}).forEach(async (val) => {
  console.log(`the value is: ${val}`)
})


try {
  await pipe.push(1) // this is OK
  await pipe.push(2) // this is OK
  await pipe.push(0) // this will catch the error
} catch (e) {
  //
}

```

There is a special case of PushPipe which works with Readable streams

```ts
import { Readable } from 'stream'
import { createSourcePipe } from 'dope-stream'

class DummyReadable extends Readable {
  constructor() {
    super({
      objectMode: true,
      read: () => {
        this.push({ data: new Date() })
      },
      highWaterMark: 10,
    })
  }
}

const source = new DummyReadable()
source.pause() // pause the stream

// create a pipe out of source which is a Readable stream
const pipe = createSourcePipe(source)

pipe.map(async (msg) => {
  return msg
}).forEach(async (msg) => {
  console.log(msg)
})
```

> Note: Because each function in pipe is an async function, the back-pressure automatically created for you behind the scene. So once the `forEach` returns, then the next message will extract from source and pass down through pipe.