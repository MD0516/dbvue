import type { SqliteDatabase } from "../database.js";

export const initialSchemaMigration = {
    version: 1,
    name: 'initial-schema',

    up(database: SqliteDatabase): void {
        database.exec(`
            CREATE TABLE connections (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL CHECK (length(trim(name)) > 0),
                engine TEXT NOT NULL CHECK (
                    engine IN ('mysql', 'postgres', 'mongodb')
                ),
                config_json TEXT NOT NULL CHECK (json_valid(config_json)),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_connected_at TEXT,
                last_opened_at TEXT
            )
        `)
    }
}