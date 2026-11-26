
import assert from 'node:assert/strict'
import {
    afterEach,
    beforeEach,
    describe,
    it,
} from 'node:test'

import {
    CreateConnectionRequestSchema,
    ConnectionConfigSchema,
    UpdateConnectionRequestSchema,
} from '@dbvue/shared'

import {
    ConnectionRepository,
} from '../../../../dist/modules/connections/repositories/connection.repository.js'

import {
    ConnectionService,
} from '../../../../dist/modules/connections/services/connection.service.js'

import {
    decryptSecret,
} from '../../../../dist/modules/connections/services/credential-crypto.js'

import type {
    SqliteDatabase,
} from '../../../../dist/modules/storage/database.js'

import { createTestDatabase } from '../test-database.js'

const TEST_KEY = 'a'.repeat(64)
const TEST_PASSWORD = 'MyDatabasePassword@123'

const NEW_PASSWORD = 'UpdatedPassword@456'
const TEST_PASSPHRASE = 'MyPrivateKeyPassphrase'
const NEW_PASSPHRASE = 'UpdatedPrivateKeyPassphrase'

const originalKey = process.env.DBVUE_ENCRYPTION_KEY

let database: SqliteDatabase
let repository: ConnectionRepository
let service: ConnectionService

function createMysqlInput(withCredentials = true) {
    return CreateConnectionRequestSchema.parse({
        name: 'Local MySQL',

        config: {
            engine: 'mysql',
            address: {
                type: 'tcp',
                host: '127.0.0.1',
                port: 3306,
            },
            username: 'dbvue',
            database: 'sample',
        },

        ...(withCredentials
            ? {
                credentials: {
                    password: TEST_PASSWORD,
                },
            }
            : {}),
    })
}

function createMysqlInputWithCredentials(credentials: {
    password?: string
    tlsPrivateKeyPassphrase?: string
}) {
    return CreateConnectionRequestSchema.parse({
        name: 'Local MySQL',
        config: {
            engine: 'mysql',
            address: {
                type: 'tcp',
                host: '127.0.0.1',
                port: 3306,
            },
            username: 'dbvue',
            database: 'sample',
        },
        credentials,
    })
}

describe('ConnectionService', () => {
    beforeEach(() => {
        process.env.DBVUE_ENCRYPTION_KEY = TEST_KEY

        database = createTestDatabase()
        repository = new ConnectionRepository(database)
        service = new ConnectionService(repository)
    })

    afterEach(() => {
        database.close()

        if (originalKey === undefined) {
            delete process.env.DBVUE_ENCRYPTION_KEY
        } else {
            process.env.DBVUE_ENCRYPTION_KEY = originalKey
        }
    })

    it('should create a connection and encrypt its credentials', () => {
        const dto = service.create(createMysqlInput())

        assert.ok(dto.id)
        assert.match(
            dto.id,
            /^[0-9a-f-]{36}$/i,
        )

        assert.equal(dto.name, 'Local MySQL')
        assert.equal(dto.hasCredentials, true)

        const record = repository.findById(dto.id)

        assert.ok(record?.encryptedCredentials?.password)

        assert.equal(
            decryptSecret(record.encryptedCredentials.password),
            TEST_PASSWORD,
        )
    })

    it('should never expose credentials in the returned DTO', () => {
        const dto = service.create(createMysqlInput())

        const serializedDto = JSON.stringify(dto)

        assert.equal(serializedDto.includes(TEST_PASSWORD), false)
        assert.equal(serializedDto.includes('cipherText'), false)
        assert.equal('encryptedCredentials' in dto, false)
        assert.equal(dto.hasCredentials, true)
    })

    it('should create a connection without credentials', () => {
        const dto = service.create(createMysqlInput(false))

        assert.equal(dto.hasCredentials, false)

        const record = repository.findById(dto.id)

        assert.equal(record?.encryptedCredentials, null)
    })

    it('should find a connection by ID', () => {
        const created = service.create(createMysqlInput())

        const retrieved = service.findById(created.id)

        assert.ok(retrieved)
        assert.equal(retrieved.id, created.id)
        assert.equal(retrieved.name, created.name)
        assert.equal(retrieved.hasCredentials, true)
    })

    it('should return null when finding a missing connection', () => {
        assert.equal(
            service.findById('missing-connection'),
            null,
        )
    })

    it('should return all saved connections', () => {
        service.create(createMysqlInput())
        service.create(createMysqlInput(false))

        const connections = service.findAll()

        assert.equal(connections.length, 2)

        assert.deepEqual(
            connections.map((connection) => connection.name),
            ['Local MySQL', 'Local MySQL'],
        )

        assert.ok(
            connections.every(
                (connection) => !('encryptedCredentials' in connection),
            ),
        )
    })

    it('should update a connection while preserving its credentials', () => {
        const created = service.create(createMysqlInput())

        const beforeUpdate = repository.findById(created.id)

        assert.ok(beforeUpdate?.encryptedCredentials)

        const updated = service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                name: 'Updated MySQL',
            }),
        )

        assert.ok(updated)
        assert.equal(updated.name, 'Updated MySQL')
        assert.equal(updated.hasCredentials, true)

        const afterUpdate = repository.findById(created.id)

        assert.deepEqual(
            afterUpdate?.encryptedCredentials,
            beforeUpdate.encryptedCredentials,
        )

        assert.equal(
            decryptSecret(afterUpdate!.encryptedCredentials!.password!),
            TEST_PASSWORD,
        )
    })

    it('should reject changing the database engine', () => {
        const created = service.create(createMysqlInput())

        const postgresConfig = ConnectionConfigSchema.parse({
            engine: 'postgres',
            address: {
                type: 'tcp',
                host: '127.0.0.1',
                port: 5432,
            },
            username: 'dbvue',
            database: 'sample',
        })

        const updateInput = UpdateConnectionRequestSchema.parse({
            config: postgresConfig,
        })

        assert.throws(
            () => service.update(created.id, updateInput),
            /Changing the database engine/,
        )

        const unchanged = repository.findById(created.id)

        assert.equal(unchanged?.config.engine, 'mysql')
    })

    it('should return null when updating a missing connection', () => {
        const updated = service.update(
            'missing-connection',
            UpdateConnectionRequestSchema.parse({
                name: 'Updated MySQL',
            }),
        )

        assert.equal(updated, null)
    })

    it('should delete an existing connection', () => {
        const created = service.create(createMysqlInput())

        assert.equal(service.delete(created.id), true)
        assert.equal(service.findById(created.id), null)
    })

    it('should return false when deleting a missing connection', () => {
        assert.equal(
            service.delete('missing-connection'),
            false,
        )
    })

    it('should replace an existing password', () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
            }),
        )

        const updated = service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                credentials: {
                    password: NEW_PASSWORD,
                },
            }),
        )

        assert.ok(updated)
        assert.equal(updated.hasCredentials, true)

        const record = repository.findById(created.id)

        assert.ok(record?.encryptedCredentials?.password)

        assert.equal(
            decryptSecret(record.encryptedCredentials.password),
            NEW_PASSWORD,
        )
    })

    it('should remove a password without removing the passphrase', () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
                tlsPrivateKeyPassphrase: TEST_PASSPHRASE,
            }),
        )

        const updated = service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                credentials: {
                    password: null,
                },
            }),
        )

        assert.ok(updated)
        assert.equal(updated.hasCredentials, true)

        const record = repository.findById(created.id)

        assert.ok(record?.encryptedCredentials)
        assert.equal(record.encryptedCredentials.password, undefined)

        assert.ok(record.encryptedCredentials.tlsPrivateKeyPassphrase)

        assert.equal(
            decryptSecret(
                record.encryptedCredentials.tlsPrivateKeyPassphrase,
            ),
            TEST_PASSPHRASE,
        )
    })

    it('should preserve omitted credentials during partial updates', () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
                tlsPrivateKeyPassphrase: TEST_PASSPHRASE,
            }),
        )

        const updated = service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                credentials: {
                    password: NEW_PASSWORD,
                },
            }),
        )

        assert.ok(updated)

        const record = repository.findById(created.id)

        assert.ok(record?.encryptedCredentials?.password)
        assert.ok(record.encryptedCredentials.tlsPrivateKeyPassphrase)

        assert.equal(
            decryptSecret(record.encryptedCredentials.password),
            NEW_PASSWORD,
        )

        assert.equal(
            decryptSecret(record.encryptedCredentials.tlsPrivateKeyPassphrase),
            TEST_PASSPHRASE,
        )
    })

    it('should update both credentials independently', () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
                tlsPrivateKeyPassphrase: TEST_PASSPHRASE,
            }),
        )

        const updated = service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                credentials: {
                    password: NEW_PASSWORD,
                    tlsPrivateKeyPassphrase: NEW_PASSPHRASE,
                },
            }),
        )

        assert.ok(updated)

        const record = repository.findById(created.id)

        assert.ok(record?.encryptedCredentials?.password)
        assert.ok(record.encryptedCredentials.tlsPrivateKeyPassphrase)

        assert.equal(
            decryptSecret(record.encryptedCredentials.password),
            NEW_PASSWORD,
        )

        assert.equal(
            decryptSecret(record.encryptedCredentials.tlsPrivateKeyPassphrase),
            NEW_PASSPHRASE,
        )
    })

    it('should clear stored credentials when all secrets are removed', () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
                tlsPrivateKeyPassphrase: TEST_PASSPHRASE,
            }),
        )

        const updated = service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                credentials: {
                    password: null,
                    tlsPrivateKeyPassphrase: null,
                },
            }),
        )

        assert.ok(updated)
        assert.equal(updated.hasCredentials, false)

        const record = repository.findById(created.id)

        assert.equal(record?.encryptedCredentials, null)
    })

})
