import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import fastifyStatic from '@fastify/static'
import { type FastifyPluginAsync, type FastifyServerOptions } from 'fastify'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const appDirectory = dirname(fileURLToPath(import.meta.url))
const frontendDirectory = resolve(appDirectory, '../../web/dist')

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  await fastify.register(AutoLoad, {
    dir: join(appDirectory, 'plugins'),
    options: opts,
  })

  await fastify.register(AutoLoad, {
    dir: join(appDirectory, 'routes'),
    options: { ...opts, prefix: '/api' },
  })

  if (existsSync(frontendDirectory)) {
    await fastify.register(fastifyStatic, {
      root: frontendDirectory,
      wildcard: false,
      index: false,
      dotfiles: 'ignore',
    })

    fastify.setNotFoundHandler((request, reply) => {
      const requestPath = new URL(request.url, 'http://127.0.0.1').pathname
      const isApiRequest = requestPath === '/api' || requestPath.startsWith('/api/')

      if (isApiRequest || (request.method !== 'GET' && request.method !== 'HEAD')) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Route ${request.method}:${request.url} not found`,
        })
      }

      return reply.sendFile('index.html')
    })
  } else {
    fastify.log.warn(
      { frontendDirectory },
      'Frontend build not found; static serving is disabled',
    )
  }
}

export default app
export { app, options }
