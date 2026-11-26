import type { SqliteDatabase } from '../database.js'
import { initialSchemaMigration } from './001_initial_schema.js'

interface Migration {
    version: number
    name: string
    up(database: SqliteDatabase): void
}

interface AppliedMigration {
    version: number
    name: string
}

const migrations: Migration[] = [
    initialSchemaMigration,
]

/**
 * Applies pending database migrations in version order.
 *
 * Each migration and its history record are committed in one transaction.
 */
export function runMigrations(database: SqliteDatabase): void {
    // Validate migration definitions.
    for (let index = 0; index < migrations.length; index++) {
        const migration = migrations[index]

        if (
            !migration ||
            !Number.isInteger(migration.version) ||
            migration.version < 1 ||
            !migration.name
        ) {
            throw new Error(`Invalid migration at index ${index}`)
        }

        if (
            index > 0 &&
            migration.version <= migrations[index - 1]!.version
        ) {
            throw new Error('Migration versions must be unique and increasing')
        }
    }

    // Create the migration tracking table.
    database.exec(`
        CREATE TABLE IF NOT EXISTS dbvue_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `)

    const appliedRows = database
        .prepare(`
            SELECT version, name
            FROM dbvue_migrations
            ORDER BY version ASC
        `)
        .all() as AppliedMigration[]

    const appliedByVersion = new Map(
        appliedRows.map((row) => [row.version, row]),
    )

    const knownVersions = new Map(
        migrations.map((migration) => [migration.version, migration]),
    )

    // Detect unknown or modified migrations.
    for (const applied of appliedRows) {
        const known = knownVersions.get(applied.version)

        if (!known) {
            throw new Error(
                `Database contains unknown migration version ${applied.version}`,
            )
        }

        if (known.name !== applied.name) {
            throw new Error(
                `Migration ${applied.version} name does not match database history`,
            )
        }
    }

    let encounteredPendingMigration = false

    for (const migration of migrations) {
        const applied = appliedByVersion.get(migration.version)

        if (applied) {
            if (encounteredPendingMigration) {
                throw new Error(
                    `Migration history is incomplete before version ${migration.version}`,
                )
            }

            continue
        }

        encounteredPendingMigration = true

        const applyMigration = database.transaction(() => {
            migration.up(database)

            database
                .prepare(`
                    INSERT INTO dbvue_migrations (
                        version,
                        name,
                        applied_at
                    )
                    VALUES (?, ?, ?)
                `)
                .run(
                    migration.version,
                    migration.name,
                    new Date().toISOString(),
                )
        })

        applyMigration.immediate()
    }
}