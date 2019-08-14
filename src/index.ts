import { Readable } from 'stream'
import through2 from 'through2'

export interface Pipe<Value> {
  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Pipe<NewValue>
  filter(fn: (val: Value) => Promise<boolean>): Pipe<Value>
  forEach(fn: (val: Value) => Promise<void>): void
}

export interface PushPipe<Value> extends Pipe<Value> {
  push(val: Value): Promise<void>
}

enum ChainType {
  MAP,
  FILTER,
  FOREACH,
}

interface ChainBase {
  type: ChainType
}

interface MapChain extends ChainBase {
  type: ChainType.MAP
  fn: (val: any) => Promise<any>
}

interface FilterChain extends ChainBase {
  type: ChainType.FILTER
  fn: (val: any) => Promise<boolean>
}

interface ForEachChain extends ChainBase {
  type: ChainType.FOREACH
  fn: (val: any) => Promise<void>
}

type Chain = MapChain | FilterChain | ForEachChain

class PipeImpl<V> implements Pipe<V> {
  chains: Chain[]
  parent: PipeImpl<any>

  constructor(parent: PipeImpl<any>) {
    this.chains = []
    this.parent = parent
  }

  get lastChain() {
    const len = this.chains.length
    if (len > 0) {
      return this.chains[len - 1]
    }
    return null
  }

  addChain(chain: Chain): boolean {
    const lastChain = this.lastChain
    if (lastChain && lastChain.type === ChainType.FOREACH) {
      return false
    }

    this.chains.push(chain)
    if (this.parent) {
      this.parent.addChain(chain)
    }

    return true
  }

  map<NewValue>(fn: (val: V) => Promise<NewValue>): Pipe<NewValue> {
    const chain: MapChain = {
      type: ChainType.MAP,
      fn: fn,
    }

    const pipe = new PipeImpl<NewValue>(this)

    pipe.addChain(chain)

    return pipe
  }

  filter(fn: (val: V) => Promise<boolean>): Pipe<V> {
    const chain: FilterChain = {
      type: ChainType.FILTER,
      fn: fn,
    }

    const pipe = new PipeImpl<V>(this)

    pipe.addChain(chain)

    return pipe
  }

  forEach(fn: (val: V) => Promise<void>): void {
    const chain: ForEachChain = {
      type: ChainType.FOREACH,
      fn: fn,
    }

    this.addChain(chain)
  }

  async process(val: V) {
    let v: any = val

    for (const chain of this.chains) {
      switch (chain.type) {
        case ChainType.MAP:
          v = await chain.fn(v)
          break
        case ChainType.FILTER:
          const ok = await chain.fn(v)
          if (!ok) {
            return
          }
          break
        case ChainType.FOREACH:
          await chain.fn(v)
          return
      }
    }
  }
}

class PushPipeImpl<Value> extends PipeImpl<Value> implements PushPipe<Value> {
  constructor(parent: PipeImpl<Value>) {
    super(parent)
  }

  async push(val: Value): Promise<void> {
    const lastChain = this.lastChain

    // check to make sure that last chain is FOREACH, otherwise
    // there is no point of processing the data
    if (!lastChain || lastChain.type !== ChainType.FOREACH) {
      return
    }

    await this.process(val)
  }
}

class SourceImpl<Value> extends PipeImpl<Value> {
  readable: Readable

  constructor(readable: Readable) {
    super(null)
    this.readable = readable
    this.readable.pause()
  }

  pump() {
    this.readable.pipe(
      through2.obj(async (data, _, callback) => {
        // using pause here to apply back pressure
        this.readable.pause()
        // process the data
        await this.process(data)
        // the resume the data again
        this.readable.resume()
        callback()
      }),
    )

    this.readable.resume()
  }

  forEach(fn: (val: Value) => Promise<void>): void {
    const chain: ForEachChain = {
      type: ChainType.FOREACH,
      fn: fn,
    }

    if (this.addChain(chain)) {
      this.pump()
    }
  }
}

export const createPipe = <V>(): Pipe<V> => {
  return new PipeImpl<V>(null)
}

export const createSourcePipe = <V>(readable: Readable): Pipe<V> => {
  return new SourceImpl<V>(readable)
}

export const createPushPipe = <V>(parent: Pipe<V> = null): PushPipe<V> => {
  return new PushPipeImpl<V>(parent as PipeImpl<V>)
}
