
import assert from 'node:assert/strict'
import {
    afterEach,
    beforeEach,
    describe,
    it,
} from 'node:test'

import { ConnectionConfigSchema } from '@dbvue/shared'

import {
    ConnectionRepository,
} from '../../../../dist/modules/connections/repositories/connection.repository.js'

import {
    decryptSecret,
    encryptSecret,
} from '../../../../dist/modules/connections/services/credential-crypto.js'

import type {
    ConnectionRecord,
} from '../../../../dist/modules/connections/domain/connection-record.js'

import type {
    SqliteDatabase,
} from '../../../../dist/modules/storage/database.js'

import { createTestDatabase } from '../test-database.js'

const TEST_KEY = 'a'.repeat(64)
const TEST_PASSWORD = 'MyDatabasePassword@123'

const originalKey = process.env.DBVUE_ENCRYPTION_KEY

let database: SqliteDatabase
let repository: ConnectionRepository

function createRecord(
    id: string,
    overrides: Partial<ConnectionRecord> = {},
): ConnectionRecord {
    const now = '2026-01-01T10:00:00.000Z'

    return {
        id,
        name: 'Local MySQL',
        config: ConnectionConfigSchema.parse({
            engine: 'mysql',
            address: {
                type: 'tcp',
                host: '127.0.0.1',
                port: 3306,
            },
            username: 'dbvue',
            database: 'sample',
        }),
        encryptedCredentials: {
            password: encryptSecret(TEST_PASSWORD),
        },
        createdAt: now,
        updatedAt: now,
        lastConnectedAt: now,
        lastOpenedAt: now,
        ...overrides,
    }
}

describe('ConnectionRepository', () => {
    beforeEach(() => {
        process.env.DBVUE_ENCRYPTION_KEY = TEST_KEY

        database = createTestDatabase()
        repository = new ConnectionRepository(database)
    })

    afterEach(() => {
        database.close()

        if (originalKey === undefined) {
            delete process.env.DBVUE_ENCRYPTION_KEY
        } else {
            process.env.DBVUE_ENCRYPTION_KEY = originalKey
        }
    })

    it('should create and retrieve a connection', () => {
        const record = createRecord('connection-1')

        repository.create(record)

        const retrieved = repository.findById(record.id)

        assert.deepEqual(retrieved, record)
    })

    it('should persist encrypted credentials without plaintext secrets', () => {
        const record = createRecord('connection-2')

        repository.create(record)

        const row = database
            .prepare(`
                SELECT config_json AS configJson
                FROM connections
                WHERE id = ?
            `)
            .get(record.id) as { configJson: string } | undefined

        assert.ok(row)

        assert.equal(
            row.configJson.includes(TEST_PASSWORD),
            false,
        )

        const retrieved = repository.findById(record.id)

        assert.ok(retrieved?.encryptedCredentials?.password)

        assert.equal(
            decryptSecret(retrieved.encryptedCredentials.password),
            TEST_PASSWORD,
        )
    })

    it('should return null when a connection does not exist', () => {
        assert.equal(
            repository.findById('missing-connection'),
            null,
        )
    })

    it('should return all connections ordered by last opened date', () => {
        repository.create(
            createRecord('connection-a', {
                lastOpenedAt: '2026-01-01T10:00:00.000Z',
            }),
        )

        repository.create(
            createRecord('connection-b', {
                lastOpenedAt: '2026-01-03T10:00:00.000Z',
            }),
        )

        repository.create(
            createRecord('connection-c', {
                lastOpenedAt: null,
            }),
        )

        const connections = repository.findAll()

        assert.deepEqual(
            connections.map((connection) => connection.id),
            [
                'connection-b',
                'connection-a',
                'connection-c',
            ],
        )
    })

    it('should return an empty array when no connections exist', () => {
        assert.deepEqual(repository.findAll(), [])
    })

    it('should update an existing connection', () => {
        const record = createRecord('connection-3')

        repository.create(record)

        const updated: ConnectionRecord = {
            ...record,
            name: 'Updated MySQL',
            updatedAt: '2026-01-02T10:00:00.000Z',
        }

        assert.equal(repository.update(updated), true)

        const retrieved = repository.findById(record.id)

        assert.equal(retrieved?.name, 'Updated MySQL')
        assert.equal(retrieved?.updatedAt, updated.updatedAt)

        assert.deepEqual(
            retrieved?.encryptedCredentials,
            record.encryptedCredentials,
        )
    })

    it('should return false when updating a missing connection', () => {
        const record = createRecord('missing-connection')

        assert.equal(repository.update(record), false)
    })

    it('should delete an existing connection', () => {
        const record = createRecord('connection-4')

        repository.create(record)

        assert.equal(repository.deleteById(record.id), true)
        assert.equal(repository.findById(record.id), null)
    })

    it('should return false when deleting a missing connection', () => {
        assert.equal(
            repository.deleteById('missing-connection'),
            false,
        )
    })

    it('should reject a stored payload with missing credentials', () => {
        const record = createRecord('connection-invalid-1')

        repository.create(record);

        const row = database
            .prepare(`
                SELECT config_json AS configJson
                FROM connections
                WHERE id = ?
            `)
            .get(record.id) as { configJson: string }

        const payload = JSON.parse(row.configJson);

        delete payload.credentials

        database
            .prepare('UPDATE connections SET config_json = ? WHERE id = ?')
            .run(JSON.stringify(payload), record.id)

        assert.throws(
            () => repository.findById(record.id)
        )
    })


    it('should reject malformed encrypted credentials', () => {
        const record = createRecord('connection-invalid-2')

        repository.create(record)

        const row = database
            .prepare(`
                SELECT config_json AS configJson
                FROM connections
                WHERE id = ?
            `)
            .get(record.id) as { configJson: string }

        const payload = JSON.parse(row.configJson)

        payload.credentials.password.iv = 'invalid-iv'

        database
            .prepare('UPDATE connections SET config_json = ? WHERE id = ?')
            .run(JSON.stringify(payload), record.id)

        assert.throws(
            () => repository.findById(record.id),
        )
    })

    it('should reject a connection with an inconsistent engine', () => {
        const record = createRecord('connection-invalid-3')

        repository.create(record)

        // The stored configuration is MySQL, but the row says PostgreSQL.
        database
            .prepare('UPDATE connections SET engine = ? WHERE id = ?')
            .run('postgres', record.id)

        assert.throws(
            () => repository.findById(record.id),
            /inconsistent database engine/,
        )
    })
})
