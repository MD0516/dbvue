import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper.js'

test('health endpoint reports server status', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/api/health',
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), { status: 'ok' })
})

test('unknown API routes do not return the frontend document', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/api/not-found',
  })

  assert.equal(res.statusCode, 404)
  assert.doesNotMatch(res.payload, /<!doctype html>/i)
})

test('frontend routes serve the SPA entry point', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/databases',
  })

  assert.equal(res.statusCode, 200)
  assert.match(res.headers['content-type'] ?? '', /text\/html/)
  assert.match(res.payload, /id="root"/)
})
