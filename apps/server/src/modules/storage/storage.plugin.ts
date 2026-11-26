import fp from 'fastify-plugin'
import { type FastifyPluginAsync } from 'fastify';
import { createAppDatabase, type SqliteDatabase } from './database.js';
import { runMigrations } from './migrations/runner.js';

interface StoragePluginOptions {
    database?: SqliteDatabase
}

declare module 'fastify' {
    interface FastifyInstance {
        db: SqliteDatabase
    }
}

/**
 * Initializes SQLite, applies migrations and exposes the database
 * instance through the Fastify `db` decorator.
 *
 * Accepts an optional database instance for isolated testing.
 * Creates the persistent application database when none is supplied.
 */
const storagePlugin: FastifyPluginAsync<StoragePluginOptions> = async (fastify, options) => {
    const database = options.database ?? createAppDatabase()

    try {
        runMigrations(database)
    } catch (error) {
        database.close();
        throw error
    }

    fastify.decorate('db', database);
    fastify.addHook("onClose", async () => {
        database.close();
    })
}

export default fp(storagePlugin, {
    name: 'dbvue-storage'
})