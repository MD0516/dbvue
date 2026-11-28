
import { Pool, type PoolConfig } from 'pg'
import type { ConnectionOptions } from 'node:tls'

import type {
    ConnectionConfigByEngine,
    ConnectionCredentialsByEngine,
} from '@dbvue/shared'

import type { DatabaseAdapter } from '../contracts/database-adapter.js'

type PostgresConfig = ConnectionConfigByEngine['postgres']
type PostgresCredentials = ConnectionCredentialsByEngine['postgres']

/**
 * Converts dbvue's TLS configuration into Node.js TLS options.
 *
 * Custom certificate references are rejected until the
 * certificate material resolver is implemented.
 */
function createTlsOptions(
    config: PostgresConfig,
    credentials?: PostgresCredentials,
): ConnectionOptions | false {
    const tls = config.tls

    if (!tls) {
        if (credentials?.tlsPrivateKeyPassphrase !== undefined) {
            throw new Error(
                'A TLS private-key passphrase requires a configured client certificate and private key.',
            )
        }

        return false
    }

    if (
        tls.caCertificateId ||
        tls.clientCertificateId ||
        tls.clientPrivateKeyId
    ) {
        throw new Error(
            'Referenced TLS certificates are not yet supported by the PostgreSQL adapter.',
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
                rejectUnauthorized: false,
            }

        case 'verify-ca':
            return {
                rejectUnauthorized: true,

                // Verify the certificate chain without hostname verification.
                checkServerIdentity: () => undefined,
            }

        case 'verify-full':
            return {
                rejectUnauthorized: true,
            }
    }
}

/**
 * Maps dbvue's PostgreSQL configuration to native pg pool options.
 */
export function createPostgresPoolOptions(
    config: PostgresConfig,
    credentials?: PostgresCredentials,
): PoolConfig {
    const options: PoolConfig = {
        // Connection address
        host: config.address.type === 'tcp'
            ? config.address.host
            : config.address.socketPath,

        port: config.address.type === 'tcp'
            ? config.address.port
            : 5432,

        // Authentication
        user: config.username,

        // Avoid unintentionally inheriting PGPASSWORD.
        // An empty password still permits trust/peer authentication.
        password: credentials?.password ?? (() => ''),

        // Avoid unintentionally inheriting PGDATABASE.
        database: config.database ?? config.username,

        // TLS
        ssl: createTlsOptions(config, credentials),

        // Client options
        application_name: config.options.applicationName,
        keepAlive: config.options.keepAlive,
        keepAliveInitialDelayMillis:
            config.options.keepAliveInitialDelayMs,

        statement_timeout: config.options.statementTimeoutMs,
        query_timeout: config.options.queryTimeoutMs,
        lock_timeout: config.options.lockTimeoutMs,
        idle_in_transaction_session_timeout:
            config.options.idleInTransactionSessionTimeoutMs,

        client_encoding: config.options.clientEncoding,

        // Pool configuration
        max: config.pool.max,
        min: config.pool.min,
        idleTimeoutMillis: config.pool.idleTimeoutMs,
        connectionTimeoutMillis: config.pool.connectionTimeoutMs,
        maxLifetimeSeconds: config.pool.maxLifetimeSeconds,
        maxUses: config.pool.maxUses,

        // Apply timezone to every newly created pool client.
        ...(config.options.timezone
            ? {
                onConnect: async (client) => {
                    await client.query(
                        'SELECT set_config($1, $2, false)',
                        ['TimeZone', config.options.timezone],
                    )
                },
            }
            : {}),
    }

    return options
}

type PostgresPoolFactory = (options: PoolConfig) => Pool

/**
 * PostgreSQL database adapter backed by node-postgres connection pools.
 */
export class PostgresAdapter implements DatabaseAdapter<'postgres', Pool> {
    readonly engine = 'postgres' as const

    constructor(
        private readonly poolFactory: PostgresPoolFactory = (options) =>
            new Pool(options),
    ) { }

    /**
     * Creates a PostgreSQL connection pool.
     *
     * The pool establishes connections lazily.
     * The connection manager should call ping() immediately
     * after creating it to verify connectivity.
     */
    async connect(
        config: PostgresConfig,
        credentials?: PostgresCredentials,
    ): Promise<Pool> {
        return this.poolFactory(
            createPostgresPoolOptions(config, credentials),
        )
    }

    /**
     * Verifies that PostgreSQL is reachable and responsive.
     */
    async ping(client: Pool): Promise<void> {
        await client.query('SELECT 1')
    }

    /**
     * Retrieves the PostgreSQL server version.
     */
    async getServerVersion(client: Pool): Promise<string> {
        const result = await client.query(
            'SHOW server_version',
        )

        const version: unknown = result.rows[0]?.server_version

        if (typeof version !== 'string') {
            throw new Error(
                'Unable to retrieve the PostgreSQL server version.',
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
