
import Fastify, { type FastifyInstance } from 'fastify'
import * as test from 'node:test'

import app from '../dist/app.js'
import type { SqliteDatabase } from '../dist/modules/storage/database.js'

export type TestContext = {
  after: typeof test.after
}

/**
 * Builds the Fastify application for integration testing.
 *
 * An optional SQLite database can be injected to isolate test data
 * from the application's persistent database.
 */
async function build(
  t: TestContext,
  database?: SqliteDatabase,
): Promise<FastifyInstance> {
  const server = Fastify()

  await server.register(app, { database })
  await server.ready()

  t.after(() => server.close())

  return server
}

export { build }
