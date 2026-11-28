
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

import type { Pool, PoolOptions } from 'mysql2/promise'

import {
    MysqlConnectionConfigSchema,
    type MysqlConnectionConfig,
} from '@dbvue/shared'

import {
    createMysqlPoolOptions,
    MysqlAdapter,
} from '../../../../dist/modules/connections/adapters/mysql/mysql.adapter.js'

function createConfig(
    overrides: Partial<MysqlConnectionConfig> = {},
): MysqlConnectionConfig {
    return MysqlConnectionConfigSchema.parse({
        engine: 'mysql',
        address: {
            type: 'tcp',
            host: '127.0.0.1',
            port: 3306,
        },
        username: 'root',
        ...overrides,
    })
}

function createMockPool() {
    const queries: string[] = []
    let endCalled = false

    const pool = {
        query: async (sql: string) => {
            queries.push(sql)

            if (sql === 'SELECT VERSION() AS version') {
                return [[{ version: '8.4.0' }], []]
            }

            return [[{ result: 1 }], []]
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

describe("MySQL Adapter", () => {
    test('creates pool options for a TCP connection', () => {
        const config = createConfig()

        const options = createMysqlPoolOptions(config, {
            password: 'secret',
        })

        assert.equal(options.host, '127.0.0.1')
        assert.equal(options.port, 3306)
        assert.equal(options.user, 'root')
        assert.equal(options.password, 'secret')
    })

    test('creates pool options for a Unix socket connection', () => {
        const config = createConfig({
            address: {
                type: 'socket',
                socketPath: '/var/run/mysqld/mysqld.sock',
            },
        })

        const options = createMysqlPoolOptions(config)

        assert.equal(
            options.socketPath,
            '/var/run/mysqld/mysqld.sock',
        )

        assert.equal(options.host, undefined)
        assert.equal(options.port, undefined)
    })

    test('maps database and driver options correctly', () => {
        const config = createConfig({
            database: 'dbvue_test',

            options: {
                connectTimeoutMs: 5000,
                charset: 'utf8mb4',
                timezone: '+00:00',
                enableKeepAlive: true,
                keepAliveInitialDelayMs: 1000,
                supportBigNumbers: true,
                bigNumberStrings: true,
                decimalNumbers: false,
                dateStrings: true,
                namedPlaceholders: true,
                multipleStatements: false,
            },

            pool: {
                connectionLimit: 20,
                maxIdle: 10,
                idleTimeoutMs: 30_000,
                waitForConnections: true,
                queueLimit: 100,
            },
        })

        const options = createMysqlPoolOptions(config)

        assert.equal(options.database, 'dbvue_test')
        assert.equal(options.connectTimeout, 5000)
        assert.equal(options.charset, 'utf8mb4')
        assert.equal(options.timezone, '+00:00')

        assert.equal(options.enableKeepAlive, true)
        assert.equal(options.keepAliveInitialDelay, 1000)

        assert.equal(options.supportBigNumbers, true)
        assert.equal(options.bigNumberStrings, true)
        assert.equal(options.decimalNumbers, false)
        assert.equal(options.dateStrings, true)

        assert.equal(options.namedPlaceholders, true)
        assert.equal(options.multipleStatements, false)

        assert.equal(options.connectionLimit, 20)
        assert.equal(options.maxIdle, 10)
        assert.equal(options.idleTimeout, 30_000)
        assert.equal(options.waitForConnections, true)
        assert.equal(options.queueLimit, 100)
    })

    test('omits an unspecified password and database', () => {
        const options = createMysqlPoolOptions(createConfig())

        assert.equal(options.password, undefined)
        assert.equal(options.database, undefined)
    })

    test('configures TLS required mode without certificate verification', () => {
        const options = createMysqlPoolOptions(
            createConfig({
                tls: { mode: 'required' },
            }),
        )

        assert.deepEqual(options.ssl, {
            rejectUnauthorized: false,
            verifyIdentity: false,
        })
    })

    test('configures TLS verify-ca mode', () => {
        const options = createMysqlPoolOptions(
            createConfig({
                tls: { mode: 'verify-ca' },
            }),
        )

        assert.deepEqual(options.ssl, {
            rejectUnauthorized: true,
            verifyIdentity: false,
        })
    })

    test('configures TLS verify-full mode', () => {
        const options = createMysqlPoolOptions(
            createConfig({
                tls: { mode: 'verify-full' },
            }),
        )

        assert.deepEqual(options.ssl, {
            rejectUnauthorized: true,
            verifyIdentity: true,
        })
    })

    test('rejects unsupported custom CA certificate references', () => {
        assert.throws(
            () => createMysqlPoolOptions(
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
            () => createMysqlPoolOptions(
                createConfig(),
                { tlsPrivateKeyPassphrase: 'secret' },
            ),
            /requires a configured client certificate/,
        )
    })

    test('connect delegates pool creation to the injected factory', async () => {
        let capturedOptions: PoolOptions | undefined

        const mock = createMockPool()

        const adapter = new MysqlAdapter((options) => {
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
        const adapter = new MysqlAdapter()

        await adapter.ping(mock.pool)

        assert.deepEqual(mock.queries, ['SELECT 1'])
    })

    test('retrieves the MySQL server version', async () => {
        const mock = createMockPool()
        const adapter = new MysqlAdapter()

        const version = await adapter.getServerVersion(mock.pool)

        assert.equal(version, '8.4.0')
        assert.deepEqual(
            mock.queries,
            ['SELECT VERSION() AS version'],
        )
    })

    test('rejects an unavailable server version', async () => {
        const pool = {
            query: async () => [[], []],
            end: async () => { },
        } as unknown as Pool

        const adapter = new MysqlAdapter()

        await assert.rejects(
            adapter.getServerVersion(pool),
            /Unable to retrieve the MySQL server version/,
        )
    })

    test('closes the MySQL connection pool', async () => {
        const mock = createMockPool()
        const adapter = new MysqlAdapter()

        await adapter.close(mock.pool)

        assert.equal(mock.isEnded(), true)
    })
})