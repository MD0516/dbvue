
import type {
    FastifyReply,
    FastifyRequest,
} from 'fastify'

import {
    CreateConnectionRequestSchema,
    UpdateConnectionRequestSchema,
    type ConnectionDto,
} from '@dbvue/shared'

import {
    ConnectionEngineChangeError,
    type ConnectionService,
} from '../services/connection.service.js'

/**
 * Handles HTTP requests for saved database connections.
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
            connection = this.service.update(
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
        const deleted = this.service.delete(request.params.id)

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
}
