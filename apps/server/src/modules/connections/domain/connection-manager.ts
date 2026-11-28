import type { DatabaseEngine } from '@dbvue/shared'

import type { ConnectionRepository } from '../repositories/connection.repository.js'
import type { AdapterRegistry } from '../adapters/adapter-registry.js'
import type { ConnectionSession } from './connection-session.js'

import { decryptCredentials } from '../services/credential-crypto.js'

export class ConnectionManager {
    private readonly sessions = new Map<string, ConnectionSession>()

    private readonly pendingConnections = new Map<
        string,
        Promise<ConnectionSession>
    >()

    private readonly connectionGenerations = new Map<string, number>()

    private readonly failedConnections = new Set<string>()

    constructor(
        private readonly repository: ConnectionRepository,
        private readonly adapters: AdapterRegistry<any>,
    ) { }

    async connect(id: string): Promise<ConnectionSession> {
        const existingSession = this.sessions.get(id)

        if (existingSession) {
            existingSession.lastUsedAt = new Date()
            this.failedConnections.delete(id)
            return existingSession
        }

        const pendingConnection = this.pendingConnections.get(id)

        if (pendingConnection) {
            return pendingConnection
        }

        const generation = this.connectionGenerations.get(id) ?? 0

        const connectionPromise = this.createSession(id, generation)

        this.pendingConnections.set(id, connectionPromise)

        try {
            const session = await connectionPromise

            this.failedConnections.delete(id)

            return session
        } catch (error) {
            // Don't record invalidation races as connection failures.
            const currentGeneration = this.connectionGenerations.get(id) ?? 0

            if (currentGeneration === generation) {
                this.failedConnections.add(id)
            }

            throw error
        } finally {
            if (this.pendingConnections.get(id) === connectionPromise) {
                this.pendingConnections.delete(id)
            }
        }
    }

    getSession(id: string): ConnectionSession | null {
        const session = this.sessions.get(id) ?? null

        if (session) {
            session.lastUsedAt = new Date()
        }

        return session
    }

    isConnected(id: string): boolean {
        return this.sessions.has(id)
    }

    isFailed(id: string): boolean {
        return this.failedConnections.has(id)
    }

    async disconnect(id: string): Promise<void> {
        const session = this.sessions.get(id)

        if (!session) {
            this.failedConnections.delete(id)
            return
        }

        try {
            await this.closeSession(session)
        } finally {
            this.sessions.delete(id)
            this.failedConnections.delete(id)
        }
    }

    async disconnectAll(): Promise<void> {
        const sessions = [...this.sessions.values()]

        const results = await Promise.allSettled(
            sessions.map((session) => this.closeSession(session)),
        )

        this.sessions.clear()

        const failures = results.filter(
            (result) => result.status === 'rejected',
        )

        if (failures.length > 0) {
            throw new AggregateError(
                failures.map((result) =>
                    result.status === 'rejected' ? result.reason : undefined,
                ),
                `Failed to close ${failures.length} connection session(s).`,
            )
        }
    }

    async invalidate(id: string): Promise<void> {
        const currentGeneration = this.connectionGenerations.get(id) ?? 0

        this.connectionGenerations.set(id, currentGeneration + 1)
        this.failedConnections.delete(id)

        await this.disconnect(id)
    }

    private async closeSession(
        session: ConnectionSession,
    ): Promise<void> {
        switch (session.engine) {
            case 'mysql':
                return session.adapter.close(session.client)

            case 'postgres':
                return session.adapter.close(session.client)

            case 'mongodb':
                return session.adapter.close(session.client)

            default: {
                const _exhaustiveCheck: never = session
                throw new Error('Unsupported connection session.')
            }
        }
    }

    private async createSession(
        id: string,
        generation: number,
    ): Promise<ConnectionSession> {
        const record = this.repository.findById(id)

        if (!record) {
            throw new Error(`Connection "${id}" not found.`)
        }

        const decryptedCredentials = decryptCredentials(
            record.encryptedCredentials,
        )

        switch (record.config.engine) {
            case 'mysql': {
                const adapter = this.adapters.get('mysql')

                const client = await adapter.connect(
                    record.config,
                    decryptedCredentials,
                )

                try {
                    await adapter.ping(client)

                    if ((this.connectionGenerations.get(id) ?? 0) !== generation) {
                        throw new Error(`Connection "${id}" was invalidated.`)
                    }

                    const session: ConnectionSession = {
                        connectionId: id,
                        engine: 'mysql',
                        adapter,
                        client,
                        connectedAt: new Date(),
                        lastUsedAt: new Date(),
                    }

                    this.sessions.set(id, session)

                    return session
                } catch (error) {
                    await adapter.close(client)
                    throw error
                }
            }

            case 'postgres': {
                const adapter = this.adapters.get('postgres')

                const client = await adapter.connect(
                    record.config,
                    decryptedCredentials,
                )

                try {
                    await adapter.ping(client)

                    if ((this.connectionGenerations.get(id) ?? 0) !== generation) {
                        throw new Error(`Connection "${id}" was invalidated.`)
                    }

                    const session: ConnectionSession = {
                        connectionId: id,
                        engine: 'postgres',
                        adapter,
                        client,
                        connectedAt: new Date(),
                        lastUsedAt: new Date(),
                    }

                    this.sessions.set(id, session)

                    return session
                } catch (error) {
                    await adapter.close(client)
                    throw error
                }
            }

            case 'mongodb': {
                const adapter = this.adapters.get('mongodb')

                const client = await adapter.connect(
                    record.config,
                    decryptedCredentials,
                )

                try {
                    await adapter.ping(client)

                    if ((this.connectionGenerations.get(id) ?? 0) !== generation) {
                        throw new Error(`Connection "${id}" was invalidated.`)
                    }

                    const session: ConnectionSession = {
                        connectionId: id,
                        engine: 'mongodb',
                        adapter,
                        client,
                        connectedAt: new Date(),
                        lastUsedAt: new Date(),
                    }

                    this.sessions.set(id, session)

                    return session
                } catch (error) {
                    await adapter.close(client)
                    throw error
                }
            }
            default: {
                const _exhaustiveCheck: never = record.config

                throw new Error('Unsupported database engine.')
            }
        }
    }
}