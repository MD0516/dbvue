import Database from 'better-sqlite3'

import type { SqliteDatabase } from '../../../dist/modules/storage/database.js'
import { runMigrations } from '../../../dist/modules/storage/migrations/runner.js'

/**
 * Creates an isolated in-memory SQLite database with the
 * application's current schema.
 */
export function createTestDatabase(): SqliteDatabase {
    const database = new Database(':memory:')

    try {
        database.pragma('foreign_keys = ON')

        runMigrations(database)

        return database
    } catch (error) {
        database.close()
        throw error
    }
}