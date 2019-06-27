import { Writable } from 'stream'

import { Pipe, Source } from '~/src/index'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

class WritableBuffer extends Writable {
  buff: string[]
  constructor() {
    super()
    this.buff = []
  }

  _write(chunk, encoding, callback) {
    this.buff.push(chunk.toString())
    callback()
  }

  get buffer() {
    return this.buff.join('')
  }
}

describe.only('testing streams', () => {
  test('forEach', async (done) => {
    const s = new Pipe<number>()

    s.forEach(async (n) => {
      console.log(n)
    })

    await s.push(1)
    await s.push(2)

    await delay(1000)

    done()
  })
  test("custom pipe's pump", async (done) => {
    const h = new Pipe<string>().map(async (val) => {
      return `##### ${val}`
    })

    const p = new Pipe<number>()

    const writer1 = new WritableBuffer()
    const writer2 = new WritableBuffer()

    const p1 = p
      .map(async (n) => {
        return `hello ${n}`
      })
      .pipe(h)

    p1.pipe(writer1).on('error', () => {})
    p1.map(async (val) => {
      return `haha ${val}`
    })
      .pipe(writer2)
      .on('end', () => console.log('finish'))
      .on('error', () => {})

    await p.push(1)
    await p.push(1)
    await p.push(1)
    await delay(2000)

    console.log(writer1.buff)
    console.log(writer2.buff)

    done()
  })
})
