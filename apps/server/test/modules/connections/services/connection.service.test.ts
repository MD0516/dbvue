
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

let invalidatedConnectionIds: string[] = []
let shouldFailInvalidation = false
let recordsFoundAtInvalidation: boolean[] = []

let connectedConnectionIds = new Set<string>()

let connectCalls: string[] = []
let disconnectCalls: string[] = []

let shouldFailConnect = false

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

function createMockConnectionManager() {
    return {
        async invalidate(id: string) {
            invalidatedConnectionIds.push(id)

            recordsFoundAtInvalidation.push(
                repository.findById(id) !== null,
            )

            if (shouldFailInvalidation) {
                throw new Error('invalidation failed')
            }

            connectedConnectionIds.delete(id)
        },

        async connect(id: string) {
            connectCalls.push(id)

            if (shouldFailConnect) {
                throw new Error('Connection failed')
            }

            connectedConnectionIds.add(id)

            return {
                connectionId: id,
                engine: 'mysql',
                connectedAt: new Date('2026-11-26T10:30:00.000Z'),
            }
        },

        async disconnect(id: string) {
            disconnectCalls.push(id)

            connectedConnectionIds.delete(id)
        },

        isConnected(id: string) {
            return connectedConnectionIds.has(id)
        },
    }
}

describe('ConnectionService', () => {
    beforeEach(() => {
        process.env.DBVUE_ENCRYPTION_KEY = TEST_KEY
        database = createTestDatabase()
        repository = new ConnectionRepository(database)

        invalidatedConnectionIds = []
        shouldFailInvalidation = false
        recordsFoundAtInvalidation = []
        connectedConnectionIds = new Set<string>()

        connectCalls = []
        disconnectCalls = []

        shouldFailConnect = false

        const manager = createMockConnectionManager()
        service = new ConnectionService(repository, manager as never)
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

    it('should update a connection while preserving its credentials', async () => {
        const created = service.create(createMysqlInput())

        const beforeUpdate = repository.findById(created.id)

        assert.ok(beforeUpdate?.encryptedCredentials)

        const updated = await service.update(
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

    it('should reject changing the database engine', async () => {
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

        await assert.rejects(
            service.update(created.id, updateInput),
            /Changing the database engine/,
        )

        const unchanged = repository.findById(created.id)

        assert.equal(unchanged?.config.engine, 'mysql')
    })

    it('should return null when updating a missing connection', async () => {
        const updated = await service.update(
            'missing-connection',
            UpdateConnectionRequestSchema.parse({
                name: 'Updated MySQL',
            }),
        )

        assert.equal(updated, null)
    })

    it('should delete an existing connection', async () => {
        const created = service.create(createMysqlInput())

        assert.equal(await service.delete(created.id), true)
        assert.equal(service.findById(created.id), null)
    })

    it('should return false when deleting a missing connection', async () => {
        assert.equal(
            await service.delete('missing-connection'),
            false,
        )
    })

    it('should replace an existing password', async () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
            }),
        )

        const updated = await service.update(
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

    it('should remove a password without removing the passphrase', async () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
                tlsPrivateKeyPassphrase: TEST_PASSPHRASE,
            }),
        )

        const updated = await service.update(
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

    it('should clear stored credentials when all secrets are removed', async () => {
        const created = service.create(
            createMysqlInputWithCredentials({
                password: TEST_PASSWORD,
                tlsPrivateKeyPassphrase: TEST_PASSPHRASE,
            }),
        )

        const updated = await service.update(
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

    it('should invalidate the session after a successful update', async () => {
        const created = service.create(createMysqlInput())

        const updated = await service.update(
            created.id,
            UpdateConnectionRequestSchema.parse({
                name: 'Updated MySQL',
            }),
        )

        assert.ok(updated)
        assert.deepEqual(invalidatedConnectionIds, [created.id])
    })

    it('should not invalidate when updating a missing connection', async () => {
        const updated = await service.update(
            'missing-connection',
            UpdateConnectionRequestSchema.parse({
                name: 'Updated MySQL',
            }),
        )

        assert.equal(updated, null)
        assert.deepEqual(invalidatedConnectionIds, [])
    })

    it('should propagate invalidation failure after an update', async () => {
        const created = service.create(createMysqlInput())

        shouldFailInvalidation = true

        await assert.rejects(
            service.update(
                created.id,
                UpdateConnectionRequestSchema.parse({
                    name: 'Updated MySQL',
                }),
            ),
            /invalidation failed/,
        )

        const record = repository.findById(created.id)

        // The update was persisted before invalidation failed.
        assert.equal(record?.name, 'Updated MySQL')
        assert.deepEqual(invalidatedConnectionIds, [created.id])
    })

    it('should invalidate before deleting a connection', async () => {
        const created = service.create(createMysqlInput())

        const deleted = await service.delete(created.id)

        assert.equal(deleted, true)
        assert.deepEqual(invalidatedConnectionIds, [created.id])
        assert.equal(repository.findById(created.id), null)
        assert.deepEqual(recordsFoundAtInvalidation, [true])
    })

    it('should not invalidate when deleting a missing connection', async () => {
        const deleted = await service.delete('missing-connection')

        assert.equal(deleted, false)
        assert.deepEqual(invalidatedConnectionIds, [])
    })

    it('should not delete a connection when invalidation fails', async () => {
        const created = service.create(createMysqlInput())

        shouldFailInvalidation = true

        await assert.rejects(
            service.delete(created.id),
            /invalidation failed/,
        )

        assert.ok(repository.findById(created.id))
        assert.deepEqual(invalidatedConnectionIds, [created.id])
    })

    describe("Connection Lifecycle", async () => {
        it('should connect an existing saved connection', async () => {
            const created = service.create(createMysqlInput())

            const session = await service.connect(created.id)

            assert.ok(session)
            assert.equal(session.connectionId, created.id)
            assert.deepEqual(connectCalls, [created.id])
        })

        it('should return null when connecting a missing connection', async () => {
            const session = await service.connect('missing-connection')

            assert.equal(session, null)
            assert.deepEqual(connectCalls, [])
        })

        it('should disconnect an existing saved connection', async () => {
            const created = service.create(createMysqlInput())

            connectedConnectionIds.add(created.id)

            const disconnected = await service.disconnect(created.id)

            assert.equal(disconnected, true)
            assert.deepEqual(disconnectCalls, [created.id])
            assert.equal(connectedConnectionIds.has(created.id), false)
        })

        it('should return false when disconnecting a missing connection', async () => {
            const disconnected = await service.disconnect(
                'missing-connection',
            )

            assert.equal(disconnected, false)
            assert.deepEqual(disconnectCalls, [])
        })

        it('should return true when a connection is connected', () => {
            const created = service.create(createMysqlInput())

            connectedConnectionIds.add(created.id)

            assert.equal(
                service.getConnectionStatus(created.id),
                true,
            )
        })

        it('should return false when a connection is disconnected', () => {
            const created = service.create(createMysqlInput())

            assert.equal(
                service.getConnectionStatus(created.id),
                false,
            )
        })

        it('should return null when checking status of a missing connection', () => {
            assert.equal(
                service.getConnectionStatus('missing-connection'),
                null,
            )
        })

        it('should connect an existing saved connection and update lastConnectedAt', async () => {
            const created = service.create(createMysqlInput())

            const session = await service.connect(created.id)

            assert.ok(session)
            assert.equal(session.connectionId, created.id)
            assert.deepEqual(connectCalls, [created.id])

            const updatedRecord = repository.findById(created.id)

            assert.equal(
                updatedRecord?.lastConnectedAt,
                '2026-11-26T10:30:00.000Z',
            )
        })

        it('should not update lastConnectedAt when connection fails', async () => {
            const created = service.create(createMysqlInput())

            shouldFailConnect = true

            await assert.rejects(
                service.connect(created.id),
                /Connection failed/,
            )

            const record = repository.findById(created.id)

            assert.equal(record?.lastConnectedAt, null)
            assert.deepEqual(connectCalls, [created.id])
        })
    })
})
