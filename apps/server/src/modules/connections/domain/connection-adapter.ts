import type {
    ConnectionConfigByEngine,
    ConnectionCredentialsByEngine,
} from '@dbvue/shared'

/**
 * Defines the common operations required by a database-engine adapter.
 *
 * @typeParam E - Database engine handled by the adapter.
 * @typeParam TClient - Native database client or connection pool type.
 */
export interface DatabaseAdapter<
    E extends keyof ConnectionConfigByEngine &
    keyof ConnectionCredentialsByEngine,
    TClient,
> {
    readonly engine: E

    /** Establishes a connection using supplied configuration and credentials */
    connect(
        config: ConnectionConfigByEngine[E],
        credentials?: ConnectionCredentialsByEngine[E],
    ): Promise<TClient>

    /** Closes the client and releases its resources */
    close(client: TClient): Promise<void>

    /** Checks whether the established connection is alive */
    ping(client: TClient): Promise<void>

    /** Retrieves the database server version */
    getServerVersion(client: TClient): Promise<string>
}