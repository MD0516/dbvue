import type { FastifyPluginAsync } from "fastify";
import { ConnectionRepository } from "../modules/connections/repositories/connection.repository.js";
import { ConnectionService } from "../modules/connections/services/connection.service.js";
import { ConnectionController } from "../modules/connections/controllers/connection.controller.js";

/**
 * Registers HTTP endpoints for saved database connection management.
 *
 * Creates the repository, service and controller once when the
 * route plugin is registered.
 */
const connections: FastifyPluginAsync = async (fastify) => {
    const repository = new ConnectionRepository(fastify.db)
    const service = new ConnectionService(repository)
    const controller = new ConnectionController(service)

    fastify.get('/connections', controller.findAll)

    fastify.get<{ Params: { id: string } }>(
        '/connections/:id',
        controller.findById,
    )

    fastify.post('/connections', controller.create)

    fastify.patch<{ Params: { id: string } }>(
        '/connections/:id',
        controller.update,
    )

    fastify.delete<{ Params: { id: string } }>(
        '/connections/:id',
        controller.delete,
    )
}

export default connections;