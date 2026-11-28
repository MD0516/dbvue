import type { FastifyPluginAsync } from "fastify";
import { ConnectionRepository } from "../modules/connections/repositories/connection.repository.js";
import { ConnectionService } from "../modules/connections/services/connection.service.js";
import { ConnectionController } from "../modules/connections/controllers/connection.controller.js";
import { ConnectionManager } from "../modules/connections/domain/connection-manager.js";
import { AdapterRegistry } from "../modules/connections/adapters/adapter-registry.js";
import { MongoDBAdapter, MysqlAdapter, PostgresAdapter } from "../modules/connections/adapters/index.js";
import { ConnectionTestService } from "../modules/connections/services/connection-test.service.js";
import { ConnectionTestController } from "../modules/connections/controllers/connection-test.controller.js";

/**
 * Registers HTTP endpoints for saved database connection management.
 *
 * Creates the repository, service and controller once when the
 * route plugin is registered.
 */
const connections: FastifyPluginAsync = async (fastify) => {
    const repository = new ConnectionRepository(fastify.db)

    const adapters = new AdapterRegistry({
        mysql: new MysqlAdapter(),
        postgres: new PostgresAdapter(),
        mongodb: new MongoDBAdapter(),
    })
    const connectionManager = new ConnectionManager(repository, adapters)

    const connectionTestService = new ConnectionTestService(adapters);

    const connectionTestController = new ConnectionTestController(
        connectionTestService,
    );

    fastify.addHook('onClose', async () => {
        await connectionManager.disconnectAll()
    })

    const service = new ConnectionService(repository, connectionManager)
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

    fastify.post<{ Params: { id: string } }>(
        '/connections/:id/connect',
        controller.connect,
    )

    fastify.post<{ Params: { id: string } }>(
        '/connections/:id/disconnect',
        controller.disconnect,
    )

    fastify.post(
        '/connections/status',
        controller.getConnectionStatus,
    )

    fastify.post(
        '/connections/test', {
        handler: connectionTestController.test.bind(connectionTestController),
    })

    fastify.get(
        '/connections/summary',
        controller.getSummary,
    )
}

export default connections;