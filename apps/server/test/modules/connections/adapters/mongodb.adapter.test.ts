
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

import {
    MongoClient,
    type MongoClientOptions,
} from 'mongodb'

import {
    MongoConnectionConfigSchema,
    type MongoConnectionConfig,
} from '@dbvue/shared'

import {
    createMongoClientOptions,
    createMongoConnectionUri,
    MongoDBAdapter,
} from '../../../../dist/modules/connections/adapters/mongodb/mongodb.adapter.js'

type MongoConfigOverrides =
    Omit<Partial<MongoConnectionConfig>, 'options' | 'pool'> & {
        options?: Partial<MongoConnectionConfig['options']>
        pool?: Partial<MongoConnectionConfig['pool']>
    }

function createConfig(
    overrides: MongoConfigOverrides = {},
): MongoConnectionConfig {
    return MongoConnectionConfigSchema.parse({
        engine: 'mongodb',
        address: {
            type: 'seed-list',
            hosts: [
                { host: '127.0.0.1', port: 27017 },
            ],
        },
        ...overrides,
    })
}

function createMockClient(version = '8.0.0') {
    const commands: Array<{
        database: string
        command: Record<string, unknown>
    }> = []

    let connectCalled = false
    let closeCalled = false

    const client = {
        connect: async () => {
            connectCalled = true
            return client
        },

        close: async () => {
            closeCalled = true
        },

        db: (database: string) => ({
            command: async (command: Record<string, unknown>) => {
                commands.push({ database, command })

                if ('buildInfo' in command) {
                    return { version }
                }

                return { ok: 1 }
            },
        }),
    } as unknown as MongoClient

    return {
        client,
        commands,
        isConnected: () => connectCalled,
        isClosed: () => closeCalled,
    }
}

describe('MongoDB Adapter', () => {
    test('creates a connection URI for a single seed-list host', () => {
        const uri = createMongoConnectionUri(createConfig())

        assert.equal(
            uri,
            'mongodb://127.0.0.1:27017',
        )
    })

    test('creates a connection URI for multiple seed-list hosts', () => {
        const uri = createMongoConnectionUri(
            createConfig({
                address: {
                    type: 'seed-list',
                    hosts: [
                        { host: 'mongo-a', port: 27017 },
                        { host: 'mongo-b', port: 27018 },
                    ],
                },
                database: 'orders',
            }),
        )

        assert.equal(
            uri,
            'mongodb://mongo-a:27017,mongo-b:27018/orders',
        )
    })

    test('creates an SRV connection URI', () => {
        const uri = createMongoConnectionUri(
            createConfig({
                address: {
                    type: 'srv',
                    hostname: 'cluster.example.com',
                },
                database: 'orders',
            }),
        )

        assert.equal(
            uri,
            'mongodb+srv://cluster.example.com/orders',
        )
    })

    test('creates an SRV URI without a database', () => {
        const uri = createMongoConnectionUri(
            createConfig({
                address: {
                    type: 'srv',
                    hostname: 'cluster.example.com',
                },
            }),
        )

        assert.equal(
            uri,
            'mongodb+srv://cluster.example.com',
        )
    })

    test('encodes database names in the connection URI', () => {
        const uri = createMongoConnectionUri(
            createConfig({
                database: 'sales archive',
            }),
        )

        assert.equal(
            uri,
            'mongodb://127.0.0.1:27017/sales%20archive',
        )
    })

    test('formats IPv6 seed-list hosts correctly', () => {
        const uri = createMongoConnectionUri(
            createConfig({
                address: {
                    type: 'seed-list',
                    hosts: [
                        { host: '::1', port: 27017 },
                    ],
                },
            }),
        )

        assert.equal(uri, 'mongodb://[::1]:27017')
    })

    test('maps authentication options correctly', () => {
        const options = createMongoClientOptions(
            createConfig({
                username: 'dbvue',
                database: 'orders',
                options: {
                    authSource: 'admin',
                },
            }),
            {
                password: 'secret',
            },
        )

        assert.deepEqual(options.auth, {
            username: 'dbvue',
            password: 'secret',
        })

        assert.equal(options.authSource, 'admin')
    })

    test('uses the database name as the default authentication source', () => {
        const options = createMongoClientOptions(
            createConfig({
                username: 'dbvue',
                database: 'orders',
            }),
            {
                password: 'secret',
            },
        )

        assert.equal(options.authSource, 'orders')
    })

    test('defaults authentication source to admin when database is omitted', () => {
        const options = createMongoClientOptions(
            createConfig({
                username: 'dbvue',
            }),
            {
                password: 'secret',
            },
        )

        assert.equal(options.authSource, 'admin')
    })

    test('does not add authentication options without a username', () => {
        const options = createMongoClientOptions(createConfig())

        assert.equal(options.auth, undefined)
        assert.equal(options.authSource, undefined)
    })

    test('rejects a password without a username', () => {
        assert.throws(
            () => createMongoClientOptions(
                createConfig(),
                { password: 'secret' },
            ),
            /requires a configured username/,
        )
    })

    test('maps MongoDB driver options correctly', () => {
        const options = createMongoClientOptions(
            createConfig({
                options: {
                    appName: 'dbvue',
                    authSource: 'admin',
                    authMechanism: 'SCRAM-SHA-256',
                    replicaSet: 'rs0',
                    directConnection: false,
                    retryReads: false,
                    retryWrites: false,
                    connectTimeoutMs: 5000,
                    serverSelectionTimeoutMs: 8000,
                    socketTimeoutMs: 10_000,
                    readPreference: 'secondaryPreferred',
                    readConcernLevel: 'majority',
                    writeConcern: {
                        w: 'majority',
                        journal: true,
                        timeoutMs: 5000,
                    },
                },
                username: 'dbvue',
            }),
        )

        assert.equal(options.appName, 'dbvue')
        assert.equal(options.authSource, 'admin')
        assert.equal(options.authMechanism, 'SCRAM-SHA-256')
        assert.equal(options.replicaSet, 'rs0')
        assert.equal(options.directConnection, false)

        assert.equal(options.retryReads, false)
        assert.equal(options.retryWrites, false)

        assert.equal(options.connectTimeoutMS, 5000)
        assert.equal(options.serverSelectionTimeoutMS, 8000)
        assert.equal(options.socketTimeoutMS, 10_000)

        assert.equal(options.readPreference, 'secondaryPreferred')
        assert.equal(options.readConcernLevel, 'majority')

        assert.deepEqual(options.writeConcern, {
            w: 'majority',
            journal: true,
            wtimeoutMS: 5000,
        })
    })

    test('maps custom write concern values', () => {
        const options = createMongoClientOptions(
            createConfig({
                options: {
                    writeConcern: {
                        w: 'dc-east',
                    },
                },
            }),
        )

        assert.equal(
            (options.writeConcern as { w?: unknown }).w,
            'dc-east',
        )
    })

    test('maps numeric write concern values', () => {
        const options = createMongoClientOptions(
            createConfig({
                options: {
                    writeConcern: {
                        w: 2,
                        journal: true,
                    },
                },
            }),
        )

        assert.deepEqual(options.writeConcern, {
            w: 2,
            journal: true,
        })
    })

    test('maps MongoDB pool settings correctly', () => {
        const options = createMongoClientOptions(
            createConfig({
                pool: {
                    maxPoolSize: 50,
                    minPoolSize: 5,
                    maxConnecting: 4,
                    maxIdleTimeMs: 30_000,
                    waitQueueTimeoutMs: 8000,
                },
            }),
        )

        assert.equal(options.maxPoolSize, 50)
        assert.equal(options.minPoolSize, 5)
        assert.equal(options.maxConnecting, 4)
        assert.equal(options.maxIdleTimeMS, 30_000)
        assert.equal(options.waitQueueTimeoutMS, 8000)
    })

    test('disables TLS when no TLS configuration is supplied', () => {
        const options = createMongoClientOptions(createConfig())

        assert.equal(options.tls, false)
    })

    test('configures TLS required mode without certificate verification', () => {
        const options = createMongoClientOptions(
            createConfig({
                tls: { mode: 'required' },
            }),
        )

        assert.equal(options.tls, true)
        assert.equal(options.tlsAllowInvalidCertificates, true)
        assert.equal(options.tlsAllowInvalidHostnames, true)
    })

    test('configures TLS verify-ca mode without hostname verification', () => {
        const options = createMongoClientOptions(
            createConfig({
                tls: { mode: 'verify-ca' },
            }),
        )

        assert.equal(options.tls, true)
        assert.equal(options.tlsAllowInvalidCertificates, undefined)
        assert.equal(options.tlsAllowInvalidHostnames, true)
    })

    test('configures TLS verify-full mode', () => {
        const options = createMongoClientOptions(
            createConfig({
                tls: { mode: 'verify-full' },
            }),
        )

        assert.equal(options.tls, true)
        assert.equal(options.tlsAllowInvalidCertificates, undefined)
        assert.equal(options.tlsAllowInvalidHostnames, undefined)
    })

    test('rejects unsupported custom certificate references', () => {
        assert.throws(
            () => createMongoClientOptions(
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
            () => createMongoClientOptions(
                createConfig(),
                { tlsPrivateKeyPassphrase: 'secret' },
            ),
            /requires a configured client certificate/,
        )
    })

    test('rejects directConnection with multiple seed-list hosts', () => {
        assert.throws(
            () => createMongoClientOptions(
                createConfig({
                    address: {
                        type: 'seed-list',
                        hosts: [
                            { host: 'mongo-a', port: 27017 },
                            { host: 'mongo-b', port: 27018 },
                        ],
                    },
                    options: {
                        directConnection: true,
                    },
                }),
            ),
            /cannot be enabled with multiple seed-list hosts/,
        )
    })

    test('connects using the injected MongoDB client factory', async () => {
        let capturedUri = ''
        let capturedOptions: MongoClientOptions | undefined

        const mock = createMockClient()
        const adapter = new MongoDBAdapter((uri, options) => {
            capturedUri = uri
            capturedOptions = options
            return mock.client
        })

        const client = await adapter.connect(
            createConfig({
                database: 'orders',
                username: 'dbvue',
            }),
            { password: 'secret' },
        )

        assert.equal(client, mock.client)
        assert.equal(
            capturedUri,
            'mongodb://127.0.0.1:27017/orders',
        )
        assert.equal(capturedOptions?.auth?.password, 'secret')
        assert.equal(mock.isConnected(), true)
    })

    test('closes the client when connection initialization fails', async () => {
        const mock = createMockClient()

        const brokenClient = {
            connect: async () => {
                throw new Error('Connection refused')
            },
            close: async () => {
                await mock.client.close()
            },
        } as unknown as MongoClient

        const adapter = new MongoDBAdapter(() => brokenClient)

        await assert.rejects(
            adapter.connect(createConfig()),
            /Connection refused/,
        )

        assert.equal(mock.isClosed(), true)
    })

    test('ping executes the MongoDB ping command against admin', async () => {
        const mock = createMockClient()
        const adapter = new MongoDBAdapter()

        await adapter.ping(mock.client)

        assert.deepEqual(mock.commands, [
            {
                database: 'admin',
                command: { ping: 1 },
            },
        ])
    })

    test('retrieves the MongoDB server version', async () => {
        const mock = createMockClient('8.2.0')
        const adapter = new MongoDBAdapter()

        const version = await adapter.getServerVersion(mock.client)

        assert.equal(version, '8.2.0')
        assert.deepEqual(mock.commands, [
            {
                database: 'admin',
                command: { buildInfo: 1 },
            },
        ])
    })

    test('rejects an unavailable MongoDB server version', async () => {
        const client = {
            db: () => ({
                command: async () => ({}),
            }),
        } as unknown as MongoClient

        const adapter = new MongoDBAdapter()

        await assert.rejects(
            adapter.getServerVersion(client),
            /Unable to retrieve the MongoDB server version/,
        )
    })

    test('closes the MongoDB client', async () => {
        const mock = createMockClient()
        const adapter = new MongoDBAdapter()

        await adapter.close(mock.client)

        assert.equal(mock.isClosed(), true)
    })
})
