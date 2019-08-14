import { createPushPipe } from '~/src/index'

describe('testing pipe', () => {
  it('should work', async (done) => {
    const p = createPushPipe<number>()

    p.map(async (v) => {
      return v + 1
    }).forEach(async (val) => console.log(val))

    await p.push(1)

    done()
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
})
