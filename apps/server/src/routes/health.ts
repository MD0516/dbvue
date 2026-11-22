import { type FastifyPluginAsync } from 'fastify'

const health: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/health', async () => ({ status: 'ok' }))
}

export default health
