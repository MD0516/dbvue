import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type {
    FastifyReply,
    FastifyRequest,
} from 'fastify'

import { ConnectionController } from '../../../../dist/modules/connections/controllers/connection.controller.js'
import type { ConnectionService } from '../../../../dist/modules/connections/services/connection.service.js'

interface MockReply {
    statusCode: number | undefined
    payload: unknown
    code(statusCode: number): MockReply
    send(payload: unknown): MockReply
}

function createMockReply(): MockReply {
    return {
        statusCode: undefined,
        payload: undefined,

        code(statusCode) {
            this.statusCode = statusCode
            return this
        },

        send(payload) {
            this.payload = payload
            return this
        },
    }
}

function createController(
    connectMock: () => Promise<unknown>,
    statusMock: (id: string) => boolean | null = () => null,
) {
    const service = {
        connect: connectMock,
        getConnectionStatus: statusMock,
    } as unknown as ConnectionService

    return new ConnectionController(service)
}

function createRequest(id = 'connection-123') {
    return {
        params: { id },
    } as FastifyRequest<{ Params: { id: string } }>
}

function createStatusRequest(ids: string[]) {
    return {
        body: ids,
    } as FastifyRequest
}

describe('ConnectionController - connect', () => {
    it('returns 502 with CONNECTION_REFUSED for a refused connection', async () => {
        const error = Object.assign(
            new Error('Sensitive internal database details'),
            { code: 'ECONNREFUSED' },
        )

        const controller = createController(async () => {
            throw error
        })

        const reply = createMockReply()

        await controller.connect(
            createRequest(),
            reply as unknown as FastifyReply,
        )

        assert.equal(reply.statusCode, 502)

        assert.deepEqual(reply.payload, {
            statusCode: 502,
            error: 'Bad Gateway',
            message: 'Failed to establish database connection',
            connectionError: {
                code: 'CONNECTION_REFUSED',
                message:
                    'The database server refused the connection. Check that the server is running and accepting connections.',
                retryable: true,
            },
        })
    })

    it('returns 502 with AUTHENTICATION_FAILED for authentication errors', async () => {
        const error = Object.assign(
            new Error('Access denied for user admin'),
            { code: 'ER_ACCESS_DENIED_ERROR' },
        )

        const controller = createController(async () => {
            throw error
        })

        const reply = createMockReply()

        await controller.connect(
            createRequest(),
            reply as unknown as FastifyReply,
        )

        assert.equal(reply.statusCode, 502)

        assert.deepEqual(reply.payload, {
            statusCode: 502,
            error: 'Bad Gateway',
            message: 'Failed to establish database connection',
            connectionError: {
                code: 'AUTHENTICATION_FAILED',
                message:
                    'Database authentication failed. Check the username, password and authentication settings.',
                retryable: false,
            },
        })
    })

    it('does not expose raw driver error messages', async () => {
        const rawMessage =
            'Access denied for user admin at internal-db.example.com'

        const error = Object.assign(
            new Error(rawMessage),
            { code: 'ER_ACCESS_DENIED_ERROR' },
        )

        const controller = createController(async () => {
            throw error
        })

        const reply = createMockReply()

        await controller.connect(
            createRequest(),
            reply as unknown as FastifyReply,
        )

        const response = JSON.stringify(reply.payload)

        assert.ok(!response.includes(rawMessage))
        assert.ok(!response.includes('internal-db.example.com'))
        assert.ok(response.includes('AUTHENTICATION_FAILED'))
    })

    it('returns 404 when the connection does not exist', async () => {
        const controller = createController(async () => null)

        const reply = createMockReply()

        await controller.connect(
            createRequest('missing-connection'),
            reply as unknown as FastifyReply,
        )

        assert.equal(reply.statusCode, 404)

        assert.deepEqual(reply.payload, {
            statusCode: 404,
            error: 'Not Found',
            message: 'Connection not found',
        })
    })

    it('returns 200 when the connection is established', async () => {
        const connectedAt = new Date('2026-01-01T10:00:00.000Z')

        const session = {
            connectionId: 'connection-123',
            engine: 'mysql',
            connectedAt,
        }

        const controller = createController(async () => session)

        const reply = createMockReply()

        await controller.connect(
            createRequest(),
            reply as unknown as FastifyReply,
        )

        assert.equal(reply.statusCode, 200)

        assert.deepEqual(reply.payload, {
            message: 'Connection established successfully',
            data: {
                connectionId: 'connection-123',
                engine: 'mysql',
                connected: true,
                connectedAt,
            },
        })
    })

    describe('ConnectionController - getConnectionStatus', () => {
        it('returns mixed connection statuses in a batch', async () => {
            const controller = createController(
                async () => null,
                (id) => {
                    if (id === 'connected-1') return true
                    if (id === 'disconnected-1') return false
                    return null
                },
            )

            const reply = createMockReply()

            await controller.getConnectionStatus(
                createStatusRequest([
                    'connected-1',
                    'disconnected-1',
                    'missing-1',
                ]),
                reply as unknown as FastifyReply,
            )

            assert.equal(reply.statusCode, 200)

            assert.deepEqual(reply.payload, {
                message: 'Connection statuses retrieved successfully',
                data: [
                    {
                        connectionId: 'connected-1',
                        connected: true,
                    },
                    {
                        connectionId: 'disconnected-1',
                        connected: false,
                    },
                    {
                        connectionId: 'missing-1',
                        statusCode: 404,
                        error: 'Not Found',
                        message: 'Connection not found',
                    },
                ],
            })
        })

        it('rejects an empty array of connection IDs', async () => {
            const controller = createController(
                async () => null,
                () => null,
            )

            const reply = createMockReply()

            await assert.rejects(
                () =>
                    controller.getConnectionStatus(
                        createStatusRequest([]),
                        reply as unknown as FastifyReply,
                    ),
            )
        })

        it('rejects invalid request input', async () => {
            const controller = createController(
                async () => null,
                () => null,
            )

            const request = {
                body: 'connection-123',
            } as unknown as FastifyRequest

            const reply = createMockReply()

            await assert.rejects(
                () =>
                    controller.getConnectionStatus(
                        request,
                        reply as unknown as FastifyReply,
                    ),
            )
        })
    })
})