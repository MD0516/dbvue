import Fastify, { type FastifyInstance } from 'fastify'
import * as test from 'node:test'
import app from '../dist/app.js'

export type TestContext = {
  after: typeof test.after
}

async function build(t: TestContext): Promise<FastifyInstance> {
  const server = Fastify()
  await server.register(app)
  await server.ready()
  t.after(() => server.close())
  return server
}

export { build }
