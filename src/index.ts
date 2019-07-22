import { Readable, Transform, Duplex, Writable } from 'stream'
import through2 from 'through2'

export class Pipe<Value> {
  src: Duplex | Transform

  constructor(src?: Transform | Duplex) {
    this.src =
      src ||
      new Duplex({
        objectMode: true,
        read: () => {},
        write: function(a, b, c) {
          this.push(a)
          c()
        },
      })
  }

  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Pipe<NewValue> {
    const src = this.src.pipe(
      through2.obj(async function(data, _, callback) {
        const result = await fn(data)
        this.push(result)
        callback()
      }),
    )

    return new Pipe(src)
  }

  filter(fn: (val: Value) => Promise<boolean>): Pipe<Value> {
    const src = this.src.pipe(
      through2.obj(async function(data, _, callback) {
        const result = await fn(data)
        if (result) {
          this.push(data)
        }
        callback()
      }),
    )

    return new Pipe(src)
  }

  pipe<T extends Pipe<any> | Transform | Duplex | Writable>(p: T): T {
    if (p instanceof Transform) {
      return this.src.pipe(p) as any
    } else if (p instanceof Duplex) {
      return this.src.pipe(p) as any
    } else if (p instanceof Writable) {
      return this.src.pipe(p) as any
    } else if (p instanceof Pipe) {
      return new Pipe(this.src.pipe(p.src)) as any
    }

    throw new Error('unknow type pass to pipe')
  }

  forEach(fn: (val: Value) => Promise<void>) {
    this.src.pipe(
      through2.obj(async function(data, enc, callback) {
        await fn(data)
        callback()
      }),
    )
  }

  push = (val: Value): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.src.write(val, (err: Error) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
}

export class Source<T> {
  src: Readable

  constructor(src: Readable) {
    this.src = src
  }

  map<NewT>(fn: (val: T) => Promise<NewT>): Source<NewT> {
    const src = this.src.pipe(
      through2.obj(async function(data, enc, callback) {
        const result = await fn(data)
        this.push(result)
        callback()
      }),
    )

    return new Source(src)
  }

  filter(fn: (val: T) => Promise<boolean>): Source<T> {
    const src = this.src.pipe(
      through2.obj(async function(data, _, callback) {
        const result = await fn(data)
        if (result) {
          this.push(data)
        }
        callback()
      }),
    )

    return new Source(src)
  }

  pipe<T extends Pipe<any> | Transform | Duplex | Writable>(p: T): T {
    if (p instanceof Transform) {
      return this.src.pipe(p) as any
    } else if (p instanceof Duplex) {
      return this.src.pipe(p) as any
    } else if (p instanceof Writable) {
      return this.src.pipe(p) as any
    } else if (p instanceof Pipe) {
      return new Pipe(this.src.pipe(p.src)) as any
    }

    throw new Error('unknow type pass to pipe')
  }

  forEach(fn: (val: T) => Promise<void>) {
    this.src.pipe(
      through2.obj(async function(data, enc, callback) {
        await fn(data)
        callback()
      }),
    )
  }
}
