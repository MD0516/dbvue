
import assert from 'node:assert/strict'
import {
    afterEach,
    describe,
    it,
} from 'node:test'

import type { FastifyInstance } from 'fastify'

import { build } from '../helper.js'
import type { TestContext } from '../helper.js'

import { createTestDatabase } from '../modules/connections/test-database.js'
import type { SqliteDatabase } from '../../dist/modules/storage/database.js'

const TEST_KEY = 'a'.repeat(64)
const TEST_PASSWORD = 'MyDatabasePassword@123'

const originalKey = process.env.DBVUE_ENCRYPTION_KEY

const mysqlConnection = {
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
    credentials: {
        password: TEST_PASSWORD,
    },
}

async function createTestServer(t: TestContext): Promise<{
    server: FastifyInstance
    database: SqliteDatabase
}> {
    process.env.DBVUE_ENCRYPTION_KEY = TEST_KEY

    const database = createTestDatabase()
    const server = await build(t, database)

    return { server, database }
}

afterEach(() => {
    if (originalKey === undefined) {
        delete process.env.DBVUE_ENCRYPTION_KEY
    } else {
        process.env.DBVUE_ENCRYPTION_KEY = originalKey
    }
})

describe('Connection API', () => {
    it('should create a connection', async (t) => {
        const { server } = await createTestServer(t)

        const response = await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: mysqlConnection,
        })

        assert.equal(response.statusCode, 201)

        const body = response.json()

        assert.equal(
            body.message,
            'Connection created successfully',
        )

        const connection = body.data

        assert.ok(connection.id)
        assert.equal(connection.name, 'Local MySQL')
        assert.equal(connection.config.engine, 'mysql')
        assert.equal(connection.hasCredentials, true)

        assert.equal(
            JSON.stringify(body).includes(TEST_PASSWORD),
            false,
        )

        assert.equal('encryptedCredentials' in connection, false)
    })

    it('should reject an invalid connection request', async (t) => {
        const { server } = await createTestServer(t)

        const response = await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: {
                name: '',
                config: {},
            },
        })

        assert.equal(response.statusCode, 400)
        assert.equal(
            response.json().message,
            'Invalid connection configuration',
        )
    })

    it('should return all saved connections', async (t) => {
        const { server } = await createTestServer(t)

        await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: mysqlConnection,
        })

        await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: {
                ...mysqlConnection,
                name: 'Another MySQL',
                credentials: undefined,
            },
        })

        const response = await server.inject({
            method: 'GET',
            url: '/api/connections',
        })

        assert.equal(response.statusCode, 200)

        const body = response.json()

        assert.equal(
            body.message,
            'Connections retrieved successfully',
        )

        const connections = body.data

        assert.equal(connections.length, 2)

        assert.ok(
            connections.every(
                (connection: { hasCredentials: boolean }) =>
                    typeof connection.hasCredentials === 'boolean',
            ),
        )

        assert.ok(
            connections.every(
                (connection: Record<string, unknown>) =>
                    !('encryptedCredentials' in connection),
            ),
        )

        assert.equal(
            JSON.stringify(body).includes(TEST_PASSWORD),
            false,
        )
    })

    it('should retrieve a connection by ID', async (t) => {
        const { server } = await createTestServer(t)

        const created = await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: mysqlConnection,
        })

        const connectionId = created.json().data.id

        const response = await server.inject({
            method: 'GET',
            url: `/api/connections/${connectionId}`,
        })

        assert.equal(response.statusCode, 200)

        const body = response.json()

        assert.equal(
            body.message,
            'Connection retrieved successfully',
        )

        assert.equal(body.data.id, connectionId)
        assert.equal(body.data.hasCredentials, true)

        assert.equal(
            JSON.stringify(body).includes(TEST_PASSWORD),
            false,
        )
    })

    it('should return 404 for a missing connection', async (t) => {
        const { server } = await createTestServer(t)

        const response = await server.inject({
            method: 'GET',
            url: '/api/connections/missing-connection',
        })

        assert.equal(response.statusCode, 404)
        assert.equal(response.json().message, 'Connection not found')
    })

    it('should update a connection and its credentials', async (t) => {
        const { server, database } = await createTestServer(t)

        const created = await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: mysqlConnection,
        })

        const connectionId = created.json().data.id
        const newPassword = 'UpdatedDatabasePassword@456'

        const response = await server.inject({
            method: 'PATCH',
            url: `/api/connections/${connectionId}`,
            payload: {
                name: 'Updated MySQL',
                credentials: {
                    password: newPassword,
                },
            },
        })

        assert.equal(response.statusCode, 200)

        const body = response.json()

        assert.equal(
            body.message,
            'Connection updated successfully',
        )

        const updated = body.data

        assert.equal(updated.name, 'Updated MySQL')
        assert.equal(updated.hasCredentials, true)

        assert.equal(
            JSON.stringify(body).includes(newPassword),
            false,
        )

        assert.equal(
            JSON.stringify(body).includes(TEST_PASSWORD),
            false,
        )

        assert.equal('encryptedCredentials' in updated, false)

        const row = database
            .prepare(`
                SELECT config_json AS configJson
                FROM connections
                WHERE id = ?
            `)
            .get(connectionId) as { configJson: string }

        assert.equal(row.configJson.includes(newPassword), false)
        assert.equal(row.configJson.includes(TEST_PASSWORD), false)
    })

    it('should reject attempts to change the database engine', async (t) => {
        const { server } = await createTestServer(t)

        const created = await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: mysqlConnection,
        })

        const connectionId = created.json().data.id

        const response = await server.inject({
            method: 'PATCH',
            url: `/api/connections/${connectionId}`,
            payload: {
                config: {
                    engine: 'postgres',
                    address: {
                        type: 'tcp',
                        host: '127.0.0.1',
                        port: 5432,
                    },
                    username: 'dbvue',
                },
            },
        })

        assert.equal(response.statusCode, 400)
        assert.match(
            response.json().message,
            /Changing the database engine/,
        )
    })

    it('should return 404 when updating a missing connection', async (t) => {
        const { server } = await createTestServer(t)

        const response = await server.inject({
            method: 'PATCH',
            url: '/api/connections/missing-connection',
            payload: {
                name: 'Updated connection',
            },
        })

        assert.equal(response.statusCode, 404)
        assert.equal(response.json().message, 'Connection not found')
    })

    it('should delete a connection and return a success message', async (t) => {
        const { server } = await createTestServer(t)

        const created = await server.inject({
            method: 'POST',
            url: '/api/connections',
            payload: mysqlConnection,
        })

        const connectionId = created.json().data.id

        const response = await server.inject({
            method: 'DELETE',
            url: `/api/connections/${connectionId}`,
        })

        assert.equal(response.statusCode, 200)

        assert.deepEqual(response.json(), {
            message: 'Connection deleted successfully',
        })

        const retrieved = await server.inject({
            method: 'GET',
            url: `/api/connections/${connectionId}`,
        })

        assert.equal(retrieved.statusCode, 404)
    })

    it('should return 404 when deleting a missing connection', async (t) => {
        const { server } = await createTestServer(t)

        const response = await server.inject({
            method: 'DELETE',
            url: '/api/connections/missing-connection',
        })

        assert.equal(response.statusCode, 404)
        assert.equal(response.json().message, 'Connection not found')
    })

    describe("Connection Lifecycle Endpoints", () => {
        it('should return 404 when connecting a missing connection', async (t) => {
            const { server } = await createTestServer(t)

            const response = await server.inject({
                method: 'POST',
                url: '/api/connections/missing-connection/connect',
            })

            assert.equal(response.statusCode, 404)
            assert.equal(response.json().message, 'Connection not found')
        })

        it('should return 404 when disconnecting a missing connection', async (t) => {
            const { server } = await createTestServer(t)

            const response = await server.inject({
                method: 'POST',
                url: '/api/connections/missing-connection/disconnect',
            })

            assert.equal(response.statusCode, 404)
            assert.equal(response.json().message, 'Connection not found')
        })

        it('should disconnect an existing connection without an active session', async (t) => {
            const { server } = await createTestServer(t)

            const created = await server.inject({
                method: 'POST',
                url: '/api/connections',
                payload: mysqlConnection,
            })

            const connectionId = created.json().data.id

            const response = await server.inject({
                method: 'POST',
                url: `/api/connections/${connectionId}/disconnect`,
            })

            assert.equal(response.statusCode, 200)

            assert.deepEqual(response.json(), {
                message: 'Connection disconnected successfully',
            })
        })

        it('should return batch statuses for existing and missing connections', async (t) => {
            const { server } = await createTestServer(t)

            const firstCreated = await server.inject({
                method: 'POST',
                url: '/api/connections',
                payload: mysqlConnection,
            })

            const secondCreated = await server.inject({
                method: 'POST',
                url: '/api/connections',
                payload: {
                    ...mysqlConnection,
                    name: 'Another MySQL',
                },
            })

            const firstId = firstCreated.json().data.id
            const secondId = secondCreated.json().data.id

            const response = await server.inject({
                method: 'POST',
                url: '/api/connections/status',
                payload: [
                    firstId,
                    secondId,
                    'missing-connection',
                ],
            })

            assert.equal(response.statusCode, 200)

            assert.deepEqual(response.json(), {
                message: 'Connection statuses retrieved successfully',
                data: [
                    {
                        connectionId: firstId,
                        connected: false,
                    },
                    {
                        connectionId: secondId,
                        connected: false,
                    },
                    {
                        connectionId: 'missing-connection',
                        statusCode: 404,
                        error: 'Not Found',
                        message: 'Connection not found',
                    },
                ],
            })
        })

        it('should reject an empty batch of connection IDs', async (t) => {
            const { server } = await createTestServer(t)

            const response = await server.inject({
                method: 'POST',
                url: '/api/connections/status',
                payload: [],
            })

            assert.equal(response.statusCode, 400)
        })

        it('should reject an invalid batch status request', async (t) => {
            const { server } = await createTestServer(t)

            const response = await server.inject({
                method: 'POST',
                url: '/api/connections/status',
                headers: {
                    'content-type': 'application/json',
                },
                payload: JSON.stringify('connection-123'),
            })

            assert.equal(response.statusCode, 400)
        })
    })

    describe("Test Connection Endpoint", () => {
        it("should reject an invalid test connection request", async (t) => {
            const { server } = await createTestServer(t);

            const response = await server.inject({
                method: "POST",
                url: "/api/connections/test",
                payload: {
                    config: {},
                },
            });

            assert.equal(response.statusCode, 400);
        });

        it("should test an unsaved connection without persisting it", async (t) => {
            const { server } = await createTestServer(t);

            const response = await server.inject({
                method: "POST",
                url: "/api/connections/test",
                payload: {
                    config: {
                        engine: "mysql",
                        address: {
                            type: "tcp",
                            host: "127.0.0.1",
                            port: 1,
                        },
                        username: "test",
                        database: "test",
                    },
                    credentials: {
                        password: "test",
                    },
                },
            });

            // Port 1 should fail to establish a database connection.
            assert.equal(response.statusCode, 502);

            const body = response.json();

            assert.equal(body.message, "Connection test failed");
            assert.ok(body.connectionError);

            // Testing a draft must not save it.
            const savedConnections = await server.inject({
                method: "GET",
                url: "/api/connections",
            });

            assert.equal(savedConnections.statusCode, 200);
            assert.equal(savedConnections.json().data.length, 0);
        });
    });
})
