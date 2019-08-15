import through2 from 'through2'
import { Readable } from 'stream'

import { createPushPipe, createSourcePipe } from '~/src/index'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

describe('testing pipe', () => {
  it('should work', async (done) => {
    const p = createPushPipe<number>()

    p.map(async (v) => {
      return v + 1
    }).forEach(async (val) => console.log(val))

    await p.push(1)

    done()
  })

  it('should work separate call', async (done) => {
    const p = createPushPipe<number>()

    p.map(async (val) => val + 1)
    p.map(async (val) => val + 2)

    p.forEach(async (val) => {
      expect(val).toBe(4)
      done()
    })

    await p.push(1)
  })

  it('should work as chain', async (done) => {
    const p1 = createPushPipe<string>()

    p1.map(async (v) => {
      return `p1: ${v}`
    })

    const p2 = createPushPipe<string>(p1)
    p2.forEach(async (val) => {
      console.log('received value from', val)
    })

    await p1.push('1')
    await p2.push('2')

    done()
  })

  it('should capture fail mapper', async (done) => {
    const badMapper = async (msg) => {
      throw 'bad mapper'
    }

    const p = createPushPipe<number>()

    p
      //
      .map(async (v) => {
        return v + 1
      })
      .map(badMapper)
      .forEach(async (val) => console.log(val))

    let err

    try {
      await p.push(1)
    } catch (e) {
      err = e
    }

    expect(err).toBe('bad mapper')

    done()
  })

  it('should pass back exception to caller', async (done) => {
    const badMapper = async (val: number) => {
      throw 'bad mapper'
    }

    const p1 = createPushPipe<number>()

    p1.map(badMapper)
    p1.forEach(async (val) => console.log(val))

    let err
    try {
      await p1.push(1)
    } catch (e) {
      err = e
    }

    expect(err).toBe('bad mapper')

    done()
  })

  it('should read readable stream', async (done) => {
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
    source.pause()

    let count = 0

    const p = createSourcePipe(source)
    p.map(async (msg) => {
      return msg
    }).forEach(async (msg) => {
      await delay(400)
      if (count === 10) {
        done()
        return
      }
      count++
      console.log(msg)
    })
  })
})
