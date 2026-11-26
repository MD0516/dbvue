import { chmodSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'

export type SqliteDatabase = InstanceType<typeof Database>

/**
 * Returns the project-local directory used for dbvue application data.
 *
 * The directory is located at <project-root>/.dbvue/data.
 */
const moduleDirectory = dirname(fileURLToPath(import.meta.url))
export function getAppDataDirectory(): string {
    const projectDirectory = resolve(
        moduleDirectory,
        '../../../../../'
    )

    return join(projectDirectory, '.dbvue', 'data');
}

/**
 * Opens and configures dbvue's internal SQLite database.
 *
 * @returns An open SQLite database instance.
 */
export function createAppDatabase(): SqliteDatabase {
    const dataDirectory = getAppDataDirectory()

    // Ensure the application data directory exists.
    mkdirSync(dataDirectory, {
        recursive: true,
        mode: 0o700,
    })

    const databasePath = join(dataDirectory, 'dbvue.sqlite')

    const database = new Database(databasePath)

    try {
        // Restrict database file permissions on Unix-like systems.
        if (process.platform !== 'win32') {
            chmodSync(databasePath, 0o600)
        }

        // Enable foreign key constraints.
        database.pragma('foreign_keys = ON')

        // Enable write-ahead logging.
        database.pragma('journal_mode = WAL')

        // Balance durability and write performance.
        database.pragma('synchronous = NORMAL')

        // Wait up to 5 seconds when another connection holds a lock.
        database.pragma('busy_timeout = 5000')

        return database
    } catch (error) {
        database.close()
        throw error
    }
}