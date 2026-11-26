import { ConnectionConfigSchema } from '@dbvue/shared'

import type { SqliteDatabase } from '../../storage/database.js'
import {
    StoredConnectionPayloadSchema,
    type ConnectionRecord,
    type ConnectionSqliteRow,
} from '../domain/connection-record.js'

function mapRow(row: ConnectionSqliteRow): ConnectionRecord {
    const payload = StoredConnectionPayloadSchema.parse(
        JSON.parse(row.configJson),
    )

    const config = payload.config

    if (config.engine !== row.engine) {
        throw new Error(
            `Connection ${row.id} has an inconsistent database engine`,
        )
    }

    return {
        id: row.id,
        name: row.name,
        config,
        encryptedCredentials: payload.credentials,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastConnectedAt: row.lastConnectedAt,
        lastOpenedAt: row.lastOpenedAt,
    }
}

/**
 * Handles persistence and retrieval of saved connection records in SQLite.
 */
export class ConnectionRepository {
    constructor(private readonly database: SqliteDatabase) { }

    create(record: ConnectionRecord): void {
        this.database
            .prepare(`
                INSERT INTO connections (
                    id,
                    name,
                    engine,
                    config_json,
                    created_at,
                    updated_at,
                    last_connected_at,
                    last_opened_at
                )
                VALUES (
                    @id,
                    @name,
                    @engine,
                    @configJson,
                    @createdAt,
                    @updatedAt,
                    @lastConnectedAt,
                    @lastOpenedAt
                )
            `)
            .run({
                id: record.id,
                name: record.name,
                engine: record.config.engine,
                configJson: JSON.stringify({
                    config: record.config,
                    credentials: record.encryptedCredentials,
                }),
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                lastConnectedAt: record.lastConnectedAt,
                lastOpenedAt: record.lastOpenedAt,
            })
    }

    findById(id: string): ConnectionRecord | null {
        const row = this.database
            .prepare(`
                SELECT
                    id,
                    name,
                    engine,
                    config_json AS configJson,
                    created_at AS createdAt,
                    updated_at AS updatedAt,
                    last_connected_at AS lastConnectedAt,
                    last_opened_at AS lastOpenedAt
                FROM connections
                WHERE id = ?
            `)
            .get(id) as ConnectionSqliteRow | undefined

        return row ? mapRow(row) : null
    }

    findAll(): ConnectionRecord[] {
        const rows = this.database
            .prepare(`
                SELECT
                    id,
                    name,
                    engine,
                    config_json AS configJson,
                    created_at AS createdAt,
                    updated_at AS updatedAt,
                    last_connected_at AS lastConnectedAt,
                    last_opened_at AS lastOpenedAt
                FROM connections
                ORDER BY
                    last_opened_at DESC,
                    created_at DESC
            `)
            .all() as ConnectionSqliteRow[]

        return rows.map(mapRow)
    }

    update(record: ConnectionRecord): boolean {
        const result = this.database
            .prepare(`
                UPDATE connections
                SET
                    name = @name,
                    engine = @engine,
                    config_json = @configJson,
                    updated_at = @updatedAt,
                    last_connected_at = @lastConnectedAt,
                    last_opened_at = @lastOpenedAt
                WHERE id = @id
            `)
            .run({
                id: record.id,
                name: record.name,
                engine: record.config.engine,
                configJson: JSON.stringify({
                    config: record.config,
                    credentials: record.encryptedCredentials,
                }),
                updatedAt: record.updatedAt,
                lastConnectedAt: record.lastConnectedAt,
                lastOpenedAt: record.lastOpenedAt,
            })

        return result.changes > 0
    }

    deleteById(id: string): boolean {
        const result = this.database
            .prepare('DELETE FROM connections WHERE id = ?')
            .run(id)

        return result.changes > 0
    }
}