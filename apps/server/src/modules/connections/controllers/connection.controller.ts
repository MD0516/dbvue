
import type {
    FastifyReply,
    FastifyRequest,
} from 'fastify'

import {
    ConnectionStatusSchema,
    CreateConnectionRequestSchema,
    UpdateConnectionRequestSchema,
    type ConnectionDto,
    type ConnectionStatusDto,
    type ConnectionStatuses,
    type ConnectionStatusResult,
} from '@dbvue/shared'

import {
    ConnectionEngineChangeError,
    type ConnectionService,
} from '../services/connection.service.js'
import { toConnectionErrorDto } from '../domain/connection-errors.js'

/**
 * Handles HTTP requests for saved database connections
 * and their runtime lifecycle.
 *
 * Validates incoming requests and translates service results
 * into standardized API responses.
 */
export class ConnectionController {
    constructor(
        private readonly service: ConnectionService,
    ) { }

    /**
     * Returns all saved connections.
     */
    findAll = async (
        _request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const data = this.service.findAll()

        return reply.code(200).send({
            message: 'Connections retrieved successfully',
            data,
        })
    }

    /**
     * Returns a saved connection by its ID.
     */
    findById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        const connection = this.service.findById(request.params.id)

        if (!connection) {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Connection not found',
            })
        }

        return reply.code(200).send({
            message: 'Connection retrieved successfully',
            data: connection,
        })
    }

    /**
     * Creates a saved database connection.
     */
    create = async (
        request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const result = CreateConnectionRequestSchema.safeParse(
            request.body,
        )

        if (!result.success) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid connection configuration',
                issues: result.error.issues,
            })
        }

        const connection = this.service.create(result.data)

        return reply.code(201).send({
            message: 'Connection created successfully',
            data: connection,
        })
    }

    /**
     * Updates an existing database connection.
     */
    update = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        const result = UpdateConnectionRequestSchema.safeParse(
            request.body,
        )

        if (!result.success) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Invalid connection update',
                issues: result.error.issues,
            })
        }

        let connection: ConnectionDto | null

        try {
            connection = await this.service.update(
                request.params.id,
                result.data,
            )
        } catch (error) {
            if (error instanceof ConnectionEngineChangeError) {
                return reply.code(400).send({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: error.message,
                })
            }

            throw error
        }

        if (!connection) {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Connection not found',
            })
        }

        return reply.code(200).send({
            message: 'Connection updated successfully',
            data: connection,
        })
    }

    /**
     * Deletes a saved database connection.
     */
    delete = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        const deleted = await this.service.delete(request.params.id)

        if (!deleted) {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Connection not found',
            })
        }

        return reply.code(200).send({
            message: 'Connection deleted successfully',
        })
    }

    /**
     * Establishes a live database session.
     */
    connect = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const session = await this.service.connect(request.params.id)

            if (!session) {
                return reply.code(404).send({
                    statusCode: 404,
                    error: 'Not Found',
                    message: 'Connection not found',
                })
            }

            return reply.code(200).send({
                message: 'Connection established successfully',
                data: {
                    connectionId: session.connectionId,
                    engine: session.engine,
                    connected: true,
                    connectedAt: session.connectedAt,
                },
            })
        } catch (error) {
            const connectionError = toConnectionErrorDto(error)

            return reply.code(502).send({
                statusCode: 502,
                error: 'Bad Gateway',
                message: 'Failed to establish database connection',
                connectionError,
            })
        }
    }

    /**
     * Closes a live database session.
     */
    disconnect = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        const disconnected = await this.service.disconnect(
            request.params.id,
        )

        if (!disconnected) {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Connection not found',
            })
        }

        return reply.code(200).send({
            message: 'Connection disconnected successfully',
        })
    }

    /**
     * Returns the current connection status.
     */
    getConnectionStatus = async (
        request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const connectionIds = ConnectionStatusSchema.parse(
            request.body,
        )

        let connectionStatuses: ConnectionStatuses = []

        for (const id of connectionIds) {
            let status: ConnectionStatusResult;

            const isConnected = this.service.getConnectionStatus(
                id,
            )
            if (isConnected === null) {
                status = {
                    connectionId: id,
                    statusCode: 404,
                    error: 'Not Found',
                    message: 'Connection not found',
                }
            } else {
                status = {
                    connectionId: id,
                    connected: isConnected,
                }
            }
            connectionStatuses.push(status)
        }


        return reply.code(200).send({
            message: 'Connection statuses retrieved successfully',
            data: connectionStatuses,
        })
    }

    getSummary = async (
        _request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const summary = this.service.getSummary()

        reply.code(200).send({
            message: "Connection summary retrieved successfully",
            data: summary,
        })
    }
}
