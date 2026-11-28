
import {
    createPool,
    type Pool,
    type PoolOptions,
    type RowDataPacket,
} from 'mysql2/promise'

import type {
    ConnectionConfigByEngine,
    ConnectionCredentialsByEngine,
} from '@dbvue/shared'

import type { DatabaseAdapter } from '../contracts/database-adapter.js'

type MysqlConfig = ConnectionConfigByEngine['mysql']
type MysqlCredentials = ConnectionCredentialsByEngine['mysql']

/**
 * Converts dbvue's TLS configuration into mysql2 SSL options.
 *
 * Certificate references are rejected until the certificate
 * material resolver is implemented.
 */
function createTlsOptions(
    config: MysqlConfig,
    credentials?: MysqlCredentials,
): NonNullable<PoolOptions['ssl']> | undefined {
    const tls = config.tls

    if (!tls) {
        if (credentials?.tlsPrivateKeyPassphrase !== undefined) {
            throw new Error(
                'A TLS private-key passphrase requires a configured client certificate and private key.',
            )
        }

        return undefined
    }

    if (
        tls.caCertificateId ||
        tls.clientCertificateId ||
        tls.clientPrivateKeyId
    ) {
        throw new Error(
            'Referenced TLS certificates are not yet supported by the MySQL adapter.',
        )
    }

    if (credentials?.tlsPrivateKeyPassphrase !== undefined) {
        throw new Error(
            'A TLS private-key passphrase cannot be used until TLS certificate material is supported.',
        )
    }

    return {
        // "required" encrypts without verifying the server certificate.
        rejectUnauthorized: tls.mode !== 'required',

        // verify-ca checks the certificate chain.
        // verify-full additionally checks the server hostname.
        verifyIdentity: tls.mode === 'verify-full',
    }
}

export function createMysqlPoolOptions(
    config: MysqlConfig,
    credentials?: MysqlCredentials,
): PoolOptions {
    const ssl = createTlsOptions(config, credentials)

    return {
        ...(config.address.type === 'tcp'
            ? {
                host: config.address.host,
                port: config.address.port,
            }
            : {
                socketPath: config.address.socketPath,
            }),

        user: config.username,

        ...(credentials?.password !== undefined
            ? { password: credentials.password }
            : {}),

        ...(config.database
            ? { database: config.database }
            : {}),

        connectTimeout: config.options.connectTimeoutMs,
        charset: config.options.charset,
        timezone: config.options.timezone,

        enableKeepAlive: config.options.enableKeepAlive,
        keepAliveInitialDelay: config.options.keepAliveInitialDelayMs,

        supportBigNumbers: config.options.supportBigNumbers,
        bigNumberStrings: config.options.bigNumberStrings,
        decimalNumbers: config.options.decimalNumbers,
        dateStrings: config.options.dateStrings,

        namedPlaceholders: config.options.namedPlaceholders,
        multipleStatements: config.options.multipleStatements,

        connectionLimit: config.pool.connectionLimit,
        maxIdle: config.pool.maxIdle,
        idleTimeout: config.pool.idleTimeoutMs,
        waitForConnections: config.pool.waitForConnections,
        queueLimit: config.pool.queueLimit,

        ...(ssl ? { ssl } : {}),
    }
}

type MysqlPoolFactory = (options: PoolOptions) => Pool

/**
 * MySQL database adapter backed by mysql2 connection pools.
 */
export class MysqlAdapter implements DatabaseAdapter<'mysql', Pool> {
    readonly engine = 'mysql' as const

    constructor(
        private readonly poolFactory: MysqlPoolFactory = createPool,
    ) { }

    /**
     * Creates a MySQL connection pool.
     *
     * The pool opens network connections lazily. The connection
     * manager should call ping() immediately after creating it
     * to verify connectivity.
     */
    async connect(
        config: MysqlConfig,
        credentials?: MysqlCredentials,
    ): Promise<Pool> {
        return this.poolFactory(
            createMysqlPoolOptions(config, credentials),
        )
    }

    /**
     * Verifies that the MySQL server is reachable and responsive.
     */
    async ping(client: Pool): Promise<void> {
        await client.query('SELECT 1')
    }

    /**
     * Retrieves the MySQL server version.
     */
    async getServerVersion(client: Pool): Promise<string> {
        const [rows] = await client.query<RowDataPacket[]>(
            'SELECT VERSION() AS version',
        )

        const version = rows[0]?.version

        if (typeof version !== 'string') {
            throw new Error(
                'Unable to retrieve the MySQL server version.',
            )
        }

        return version
    }

    /**
     * Closes the connection pool and releases its resources.
     */
    async close(client: Pool): Promise<void> {
        await client.end()
    }
}
