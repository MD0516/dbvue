
import {
    MongoClient,
    type MongoClientOptions,
} from 'mongodb'

import type {
    ConnectionConfigByEngine,
    ConnectionCredentialsByEngine,
} from '@dbvue/shared'

import type { DatabaseAdapter } from '../contracts/database-adapter.js'

type MongoConfig = ConnectionConfigByEngine['mongodb']
type MongoCredentials = ConnectionCredentialsByEngine['mongodb']

/**
 * Formats a hostname for use in a MongoDB connection URI.
 * IPv6 addresses must be enclosed in square brackets.
 */
function formatMongoHost(host: string): string {
    if (host.startsWith('[') && host.endsWith(']')) {
        return host
    }

    return host.includes(':') ? `[${host}]` : host
}

/**
 * Builds a MongoDB connection URI from dbvue's address configuration.
 *
 * Credentials and connection options are deliberately excluded.
 */
export function createMongoConnectionUri(config: MongoConfig): string {
    let authority: string

    switch (config.address.type) {
        case 'seed-list':
            authority = config.address.hosts
                .map(({ host, port }) =>
                    `${formatMongoHost(host)}:${port}`,
                )
                .join(',')
            break

        case 'srv':
            authority = config.address.hostname
            break
    }

    const scheme = config.address.type === 'srv'
        ? 'mongodb+srv'
        : 'mongodb'

    const database = config.database
        ? `/${encodeURIComponent(config.database)}`
        : ''

    return `${scheme}://${authority}${database}`
}

/**
 * Converts dbvue's TLS configuration into MongoDB driver options.
 *
 * Custom certificate references are rejected until the certificate
 * material resolver is implemented.
 */
function createTlsOptions(
    config: MongoConfig,
    credentials?: MongoCredentials,
): Pick<
    MongoClientOptions,
    | 'tls'
    | 'tlsAllowInvalidCertificates'
    | 'tlsAllowInvalidHostnames'
> {
    const tls = config.tls

    if (!tls) {
        if (credentials?.tlsPrivateKeyPassphrase !== undefined) {
            throw new Error(
                'A TLS private-key passphrase requires a configured client certificate and private key.',
            )
        }

        // Explicitly disable TLS when no TLS configuration is supplied.
        return { tls: false }
    }

    if (
        tls.caCertificateId ||
        tls.clientCertificateId ||
        tls.clientPrivateKeyId
    ) {
        throw new Error(
            'Referenced TLS certificates are not yet supported by the MongoDB adapter.',
        )
    }

    if (credentials?.tlsPrivateKeyPassphrase !== undefined) {
        throw new Error(
            'A TLS private-key passphrase cannot be used until TLS certificate material is supported.',
        )
    }

    switch (tls.mode) {
        case 'required':
            return {
                tls: true,
                tlsAllowInvalidCertificates: true,
                tlsAllowInvalidHostnames: true,
            }

        case 'verify-ca':
            return {
                tls: true,
                tlsAllowInvalidHostnames: true,
            }

        case 'verify-full':
            return {
                tls: true,
            }
    }
}

/**
 * Maps dbvue's MongoDB configuration into native MongoClient options.
 */
export function createMongoClientOptions(
    config: MongoConfig,
    credentials?: MongoCredentials,
): MongoClientOptions {
    if (credentials?.password !== undefined && !config.username) {
        throw new Error(
            'A MongoDB password requires a configured username.',
        )
    }

    if (
        config.address.type === 'seed-list' &&
        config.address.hosts.length > 1 &&
        config.options.directConnection === true
    ) {
        throw new Error(
            'MongoDB directConnection cannot be enabled with multiple seed-list hosts.',
        )
    }

    const options: MongoClientOptions = {
        // Application identification
        ...(config.options.appName
            ? { appName: config.options.appName }
            : {}),

        // Authentication
        ...(config.username
            ? {
                auth: {
                    username: config.username,
                    ...(credentials?.password !== undefined
                        ? { password: credentials.password }
                        : {}),
                },

                authSource:
                    config.options.authSource ??
                    config.database ??
                    'admin',
            }
            : {}),

        ...(config.options.authMechanism
            ? {
                authMechanism: config.options.authMechanism as NonNullable<
                    MongoClientOptions['authMechanism']
                >,
            }
            : {}),

        // Replica set and connection behavior
        ...(config.options.replicaSet
            ? { replicaSet: config.options.replicaSet }
            : {}),

        ...(config.options.directConnection !== undefined
            ? { directConnection: config.options.directConnection }
            : {}),

        retryReads: config.options.retryReads,
        retryWrites: config.options.retryWrites,

        // Timeouts
        connectTimeoutMS: config.options.connectTimeoutMs,
        serverSelectionTimeoutMS:
            config.options.serverSelectionTimeoutMs,
        socketTimeoutMS: config.options.socketTimeoutMs,

        // Read behavior
        readPreference: config.options.readPreference,

        ...(config.options.readConcernLevel
            ? { readConcernLevel: config.options.readConcernLevel }
            : {}),

        // Write behavior
        ...(config.options.writeConcern
            ? {
                writeConcern: {
                    ...(config.options.writeConcern.w !== undefined
                        ? {
                            w: config.options.writeConcern.w as number | 'majority',
                        }
                        : {}),

                    ...(config.options.writeConcern.journal !== undefined
                        ? { journal: config.options.writeConcern.journal }
                        : {}),

                    ...(config.options.writeConcern.timeoutMs !== undefined
                        ? {
                            wtimeoutMS: config.options.writeConcern.timeoutMs,
                        }
                        : {}),
                },
            }
            : {}),

        // Connection pool
        maxPoolSize: config.pool.maxPoolSize,
        minPoolSize: config.pool.minPoolSize,
        maxConnecting: config.pool.maxConnecting,
        maxIdleTimeMS: config.pool.maxIdleTimeMs,
        waitQueueTimeoutMS: config.pool.waitQueueTimeoutMs,

        // TLS
        ...createTlsOptions(config, credentials),
    }

    return options
}

type MongoClientFactory = (
    uri: string,
    options: MongoClientOptions,
) => MongoClient

/**
 * MongoDB adapter backed by the official MongoDB Node.js driver.
 */
export class MongoDBAdapter implements DatabaseAdapter<'mongodb', MongoClient> {
    readonly engine = 'mongodb' as const

    constructor(
        private readonly clientFactory: MongoClientFactory = (uri, options) =>
            new MongoClient(uri, options),
    ) { }

    /**
     * Creates and connects a MongoDB client.
     *
     * MongoClient manages its own connection pool.
     */
    async connect(
        config: MongoConfig,
        credentials?: MongoCredentials,
    ): Promise<MongoClient> {
        const uri = createMongoConnectionUri(config)
        const options = createMongoClientOptions(config, credentials)

        const client = this.clientFactory(uri, options)

        try {
            await client.connect()
            return client
        } catch (error) {
            await client.close().catch(() => undefined)
            throw error
        }
    }

    /**
     * Verifies that the MongoDB deployment is reachable.
     */
    async ping(client: MongoClient): Promise<void> {
        await client.db('admin').command({ ping: 1 })
    }

    /**
     * Retrieves the MongoDB server version.
     */
    async getServerVersion(client: MongoClient): Promise<string> {
        const result = await client.db('admin').command({
            buildInfo: 1,
        })

        const version: unknown = result.version

        if (typeof version !== 'string') {
            throw new Error(
                'Unable to retrieve the MongoDB server version.',
            )
        }

        return version
    }

    /**
     * Closes the MongoDB client and releases its resources.
     */
    async close(client: MongoClient): Promise<void> {
        await client.close()
    }
}
