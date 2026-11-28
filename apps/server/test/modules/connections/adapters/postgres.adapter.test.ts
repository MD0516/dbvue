
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

import type { Pool, PoolConfig } from 'pg'

import {
    PostgresConnectionConfigSchema,
    type PostgresConnectionConfig,
} from '@dbvue/shared'

import {
    createPostgresPoolOptions,
    PostgresAdapter,
} from '../../../../dist/modules/connections/adapters/postgres/postgres.adapter.js'

function createConfig(
    overrides: Partial<PostgresConnectionConfig> = {},
): PostgresConnectionConfig {
    return PostgresConnectionConfigSchema.parse({
        engine: 'postgres',
        address: {
            type: 'tcp',
            host: '127.0.0.1',
            port: 5432,
        },
        username: 'postgres',
        ...overrides,
    })
}

function createMockPool(version = '17.0') {
    const queries: Array<{
        text: string
        values?: unknown[]
    }> = []

    let endCalled = false

    const pool = {
        query: async (text: string, values?: unknown[]) => {
            queries.push({ text, values })

            if (text === 'SHOW server_version') {
                return {
                    rows: [{ server_version: version }],
                }
            }

            return {
                rows: [{ result: 1 }],
            }
        },

        end: async () => {
            endCalled = true
        },
    } as unknown as Pool

    return {
        pool,
        queries,
        isEnded: () => endCalled,
    }
}

describe("PostgreSQL Adapter", () => {
    test('creates pool options for a TCP connection', () => {
        const options = createPostgresPoolOptions(createConfig())

        assert.equal(options.host, '127.0.0.1')
        assert.equal(options.port, 5432)
        assert.equal(options.user, 'postgres')
        assert.equal(options.database, 'postgres')
    })

    test('creates pool options for a Unix socket connection', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                address: {
                    type: 'socket',
                    socketPath: '/var/run/postgresql',
                },
            }),
        )

        assert.equal(options.host, '/var/run/postgresql')
        assert.equal(options.port, 5432)
    })

    test('maps credentials and database correctly', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                database: 'dbvue_test',
            }),
            {
                password: 'secret',
            },
        )

        assert.equal(options.user, 'postgres')
        assert.equal(options.password, 'secret')
        assert.equal(options.database, 'dbvue_test')
    })

    test('uses an explicit empty password when credentials are omitted', async () => {
        const options = createPostgresPoolOptions(createConfig())

        assert.equal(typeof options.password, 'function')

        const password = options.password

        if (typeof password === 'function') {
            assert.equal(await password(), '')
        }
    })

    test('maps PostgreSQL driver options correctly', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                options: {
                    applicationName: 'dbvue',
                    keepAlive: true,
                    keepAliveInitialDelayMs: 1000,
                    statementTimeoutMs: 5000,
                    queryTimeoutMs: 6000,
                    lockTimeoutMs: 2000,
                    idleInTransactionSessionTimeoutMs: 10_000,
                    clientEncoding: 'UTF8',
                    timezone: 'UTC',
                },
            }),
        )

        assert.equal(options.application_name, 'dbvue')
        assert.equal(options.keepAlive, true)
        assert.equal(options.keepAliveInitialDelayMillis, 1000)

        assert.equal(options.statement_timeout, 5000)
        assert.equal(options.query_timeout, 6000)
        assert.equal(options.lock_timeout, 2000)
        assert.equal(options.idle_in_transaction_session_timeout, 10_000)

        assert.equal(options.client_encoding, 'UTF8')
    })

    test('maps PostgreSQL pool settings correctly', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                pool: {
                    max: 20,
                    min: 5,
                    idleTimeoutMs: 30_000,
                    connectionTimeoutMs: 8000,
                    maxLifetimeSeconds: 300,
                    maxUses: 1000,
                },
            }),
        )

        assert.equal(options.max, 20)
        assert.equal(options.min, 5)
        assert.equal(options.idleTimeoutMillis, 30_000)
        assert.equal(options.connectionTimeoutMillis, 8000)
        assert.equal(options.maxLifetimeSeconds, 300)
        assert.equal(options.maxUses, 1000)
    })

    test('disables TLS when no TLS configuration is supplied', () => {
        const options = createPostgresPoolOptions(createConfig())

        assert.equal(options.ssl, false)
    })

    test('configures TLS required mode without certificate verification', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                tls: { mode: 'required' },
            }),
        )

        const ssl = options.ssl
        assert.ok(ssl && typeof ssl === 'object')
        assert.equal(ssl.rejectUnauthorized, false)
    })

    test('configures TLS verify-ca mode without hostname verification', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                tls: { mode: 'verify-ca' },
            }),
        )

        const ssl = options.ssl

        assert.ok(ssl && typeof ssl === 'object')
        assert.equal(ssl.rejectUnauthorized, true)

        assert.equal(
            ssl.checkServerIdentity?.('localhost', {} as never),
            undefined,
        )
    })

    test('configures TLS verify-full mode', () => {
        const options = createPostgresPoolOptions(
            createConfig({
                tls: { mode: 'verify-full' },
            }),
        )

        const ssl = options.ssl

        assert.ok(ssl && typeof ssl === 'object')
        assert.equal(ssl.rejectUnauthorized, true)
        assert.equal(ssl.checkServerIdentity, undefined)
    })

    test('rejects unsupported custom certificate references', () => {
        assert.throws(
            () => createPostgresPoolOptions(
                createConfig({
                    tls: {
                        mode: 'verify-ca',
                        caCertificateId: 'ca-certificate-1',
                    },
                }),
            ),
            /Referenced TLS certificates are not yet supported/,
        )
    })

    test('rejects a TLS private-key passphrase without TLS', () => {
        assert.throws(
            () => createPostgresPoolOptions(
                createConfig(),
                { tlsPrivateKeyPassphrase: 'secret' },
            ),
            /requires a configured client certificate/,
        )
    })

    test('configures timezone initialization for each new pool client', async () => {
        const options = createPostgresPoolOptions(
            createConfig({
                options: {
                    keepAlive: true,
                    keepAliveInitialDelayMs: 0,
                    timezone: 'UTC',
                },
            }),
        )

        assert.equal(typeof options.onConnect, 'function')

        const mock = createMockPool()

        await options.onConnect?.(mock.pool as never)

        assert.deepEqual(mock.queries[0], {
            text: 'SELECT set_config($1, $2, false)',
            values: ['TimeZone', 'UTC'],
        })
    })

    test('does not configure timezone initialization when timezone is omitted', () => {
        const options = createPostgresPoolOptions(createConfig())

        assert.equal(options.onConnect, undefined)
    })

    test('connect delegates pool creation to the injected factory', async () => {
        let capturedOptions: PoolConfig | undefined

        const mock = createMockPool()

        const adapter = new PostgresAdapter((options) => {
            capturedOptions = options
            return mock.pool
        })

        const client = await adapter.connect(
            createConfig(),
            { password: 'secret' },
        )

        assert.equal(client, mock.pool)
        assert.equal(capturedOptions?.host, '127.0.0.1')
        assert.equal(capturedOptions?.password, 'secret')
    })

    test('ping executes SELECT 1', async () => {
        const mock = createMockPool()
        const adapter = new PostgresAdapter()

        await adapter.ping(mock.pool)

        assert.deepEqual(mock.queries, [
            { text: 'SELECT 1', values: undefined },
        ])
    })

    test('retrieves the PostgreSQL server version', async () => {
        const mock = createMockPool('18.1')
        const adapter = new PostgresAdapter()

        const version = await adapter.getServerVersion(mock.pool)

        assert.equal(version, '18.1')
        assert.equal(mock.queries[0]?.text, 'SHOW server_version')
    })

    test('rejects an unavailable server version', async () => {
        const mock = createMockPool()
        const adapter = new PostgresAdapter()

        const client = {
            query: async () => ({ rows: [] }),
            end: async () => { },
        } as unknown as Pool

        await assert.rejects(
            adapter.getServerVersion(client),
            /Unable to retrieve the PostgreSQL server version/,
        )
    })

    test('closes the PostgreSQL connection pool', async () => {
        const mock = createMockPool()
        const adapter = new PostgresAdapter()

        await adapter.close(mock.pool)

        assert.equal(mock.isEnded(), true)
    })
})