
import type { DatabaseEngine } from '@dbvue/shared'

import type { Pool as MysqlPool } from 'mysql2/promise'
import type { Pool as PostgresPool } from 'pg'
import type { MongoClient } from 'mongodb'

import type { DatabaseAdapter } from '../adapters/contracts/database-adapter.js'

/**
 * Common metadata shared by all active database sessions.
 *
 * Sessions represent established runtime connections.
 * They are not persisted in SQLite.
 *
 * @typeParam E - Database engine associated with the session.
 */
export interface ConnectionSessionBase<E extends DatabaseEngine> {
    /** ID of the saved connection associated with this session. */
    readonly connectionId: string

    /** Database engine handled by this session. */
    readonly engine: E

    /** Time when the active session was established. */
    readonly connectedAt: Date

    /** Time when the session was last used. */
    lastUsedAt: Date
}

/**
 * Active MySQL connection session.
 */
export interface MysqlConnectionSession
    extends ConnectionSessionBase<'mysql'> {
    readonly adapter: DatabaseAdapter<'mysql', MysqlPool>
    readonly client: MysqlPool
}

/**
 * Active PostgreSQL connection session.
 */
export interface PostgresConnectionSession
    extends ConnectionSessionBase<'postgres'> {
    readonly adapter: DatabaseAdapter<'postgres', PostgresPool>
    readonly client: PostgresPool
}

/**
 * Active MongoDB connection session.
 */
export interface MongoConnectionSession
    extends ConnectionSessionBase<'mongodb'> {
    readonly adapter: DatabaseAdapter<'mongodb', MongoClient>
    readonly client: MongoClient
}

/**
 * Maps each supported database engine to its session type.
 */
export interface ConnectionSessionByEngine {
    mysql: MysqlConnectionSession
    postgres: PostgresConnectionSession
    mongodb: MongoConnectionSession
}

/**
 * Represents an active session for any supported database engine.
 *
 * The engine property discriminates the native client and adapter types.
 */
export type ConnectionSession =
    ConnectionSessionByEngine[DatabaseEngine]
