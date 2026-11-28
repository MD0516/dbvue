import type { FastifyReply, FastifyRequest } from "fastify";
import {
    TestConnectionRequestSchema,
} from "@dbvue/shared";

import { ConnectionTestService } from "../services/connection-test.service.js";
import { toConnectionErrorDto } from "../domain/connection-errors.js";

export class ConnectionTestController {
    constructor(
        private readonly connectionTestService: ConnectionTestService,
    ) { }

    async test(request: FastifyRequest, reply: FastifyReply) {
        const parsed = TestConnectionRequestSchema.parse(request.body);

        const { config, credentials } = parsed;

        try {
            const result = await this.connectionTestService.testConnection(
                config.engine,
                config as any,
                credentials as any,
            );

            return reply.status(200).send({
                message: "Connection test successful",
                data: result,
            });
        } catch (error) {
            return reply.status(502).send({
                statusCode: 502,
                error: "Bad Gateway",
                message: "Connection test failed",
                connectionError: toConnectionErrorDto(error),
            });
        }
    }
}