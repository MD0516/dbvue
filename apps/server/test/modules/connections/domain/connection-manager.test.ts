
import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { ConnectionManager } from '../../../../dist/modules/connections/domain/connection-manager.js'


function createMockAdapter() {
    let connectCalls = 0
    let closeCalls = 0
    let pingCalls = 0
    let versionCalls = 0
    let shouldFailConnect = false
    let shouldFailPing = false

    const client = { mock: true }

    const adapter = {
        engine: 'mysql',

        async connect() {
            connectCalls++

            if (shouldFailConnect) {
                throw new Error('connect failed')
            }

            return client
        },

        async close() {
            closeCalls++
        },

        async ping() {
            pingCalls++

            if (shouldFailPing) {
                throw new Error('ping failed')
            }
        },

        async getServerVersion() {
            versionCalls++
            return 'mock-version'
        },
    }

    return {
        adapter,
        client,
        get connectCalls() {
            return connectCalls
        },
        get closeCalls() {
            return closeCalls
        },
        get pingCalls() {
            return pingCalls
        },
        get versionCalls() {
            return versionCalls
        },
        setConnectFailure(value: boolean) {
            shouldFailConnect = value
        },
        setPingFailure(value: boolean) {
            shouldFailPing = value
        },
    }
}

function createMockRepository(record?: unknown) {
    let currentRecord: unknown | null = record ?? null

    return {
        findById() {
            return currentRecord
        },
        setRecord(value: unknown) {
            currentRecord = value
        },
    }
}

function createRecord(id = 'connection-1') {
    return {
        id,
        name: 'Test connection',
        config: {
            engine: 'mysql',
            host: 'localhost',
            port: 3306,
            database: 'test',
        },
        encryptedCredentials: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
}

function createManager(record?: unknown) {
    const mockAdapter = createMockAdapter()
    const repository = createMockRepository(record ?? createRecord())

    const registry = {
        get() {
            return mockAdapter.adapter
        },
    }

    // Mock dependency types are intentionally cast at the test boundary.
    const manager = new ConnectionManager(
        repository as never,
        registry as never,
    )

    return {
        manager,
        repository,
        mockAdapter,
    }
}

describe('ConnectionManager', () => {
    describe('connect', () => {
        it('connects and registers a session', async () => {
            const { manager, mockAdapter } = createManager()

            const session = await manager.connect('connection-1')

            assert.ok(session)
            assert.equal(session.connectionId, 'connection-1')
            assert.equal(session.engine, 'mysql')
            assert.equal(mockAdapter.connectCalls, 1)
            assert.equal(mockAdapter.pingCalls, 1)
            assert.equal(manager.isConnected('connection-1'), true)
        })

        it('reuses an existing session', async () => {
            const { manager, mockAdapter } = createManager()

            const first = await manager.connect('connection-1')
            const second = await manager.connect('connection-1')

            assert.equal(first, second)
            assert.equal(mockAdapter.connectCalls, 1)
            assert.equal(mockAdapter.pingCalls, 1)
        })

        it('shares concurrent connection attempts', async () => {
            const { manager, mockAdapter } = createManager()

            const [first, second, third] = await Promise.all([
                manager.connect('connection-1'),
                manager.connect('connection-1'),
                manager.connect('connection-1'),
            ])

            assert.equal(first, second)
            assert.equal(second, third)
            assert.equal(mockAdapter.connectCalls, 1)
            assert.equal(mockAdapter.pingCalls, 1)
            assert.equal(manager.isConnected('connection-1'), true)
        })

        it('throws when the connection record does not exist', async () => {
            const { manager, repository, mockAdapter } = createManager()

            repository.setRecord(null)

            await assert.rejects(
                manager.connect('missing-connection'),
            )

            assert.equal(mockAdapter.connectCalls, 0)
            assert.equal(manager.isConnected('missing-connection'), false)
        })

        it('closes the client when ping fails', async () => {
            const { manager, mockAdapter } = createManager()

            mockAdapter.setPingFailure(true)

            await assert.rejects(
                manager.connect('connection-1'),
                /ping failed/,
            )

            assert.equal(mockAdapter.connectCalls, 1)
            assert.equal(mockAdapter.pingCalls, 1)
            assert.equal(mockAdapter.closeCalls, 1)
            assert.equal(manager.isConnected('connection-1'), false)
        })

        it('does not register a session when connect fails', async () => {
            const { manager, mockAdapter } = createManager()

            mockAdapter.setConnectFailure(true)

            await assert.rejects(
                manager.connect('connection-1'),
                /connect failed/,
            )

            assert.equal(mockAdapter.connectCalls, 1)
            assert.equal(mockAdapter.closeCalls, 0)
            assert.equal(manager.isConnected('connection-1'), false)
        })
    })

    describe('getSession', () => {
        it('returns the registered session', async () => {
            const { manager } = createManager()

            const connected = await manager.connect('connection-1')
            const session = manager.getSession('connection-1')

            assert.equal(session, connected)
        })

        it('returns undefined for an unknown session', () => {
            const { manager } = createManager()

            assert.equal(manager.getSession('unknown'), null)
        })
    })

    describe('disconnect', () => {
        it('closes and removes the session', async () => {
            const { manager, mockAdapter } = createManager()

            await manager.connect('connection-1')
            await manager.disconnect('connection-1')

            assert.equal(mockAdapter.closeCalls, 1)
            assert.equal(manager.isConnected('connection-1'), false)
            assert.equal(manager.getSession('connection-1'), null)
        })

        it('does nothing for an unknown session', async () => {
            const { manager, mockAdapter } = createManager()

            await manager.disconnect('unknown')

            assert.equal(mockAdapter.closeCalls, 0)
            assert.equal(manager.isConnected('unknown'), false)
        })
    })

    describe('disconnectAll', () => {
        it('closes all active sessions', async () => {
            const mockAdapter1 = createMockAdapter()
            const mockAdapter2 = createMockAdapter()

            const repository = {
                findById(id: string) {
                    return id === 'connection-1'
                        ? createRecord('connection-1')
                        : createRecord('connection-2')
                },
            }

            const registry = {
                get() {
                    // Both connections use the same mock adapter in this test.
                    return mockAdapter1.adapter
                },
            }

            const manager = new ConnectionManager(
                repository as never,
                registry as never,
            )

            await manager.connect('connection-1')
            await manager.connect('connection-2')

            await manager.disconnectAll()

            assert.equal(mockAdapter1.closeCalls, 2)
            assert.equal(manager.isConnected('connection-1'), false)
            assert.equal(manager.isConnected('connection-2'), false)

            // Kept to make the second mock explicit in the setup.
            assert.equal(mockAdapter2.closeCalls, 0)
        })
    })

    describe('invalidate', () => {
        it('removes and closes an active session', async () => {
            const { manager, mockAdapter } = createManager()

            await manager.connect('connection-1')
            await manager.invalidate('connection-1')

            assert.equal(mockAdapter.closeCalls, 1)
            assert.equal(manager.isConnected('connection-1'), false)
            assert.equal(manager.getSession('connection-1'), null)
        })

        it('does not register a session if invalidated while connect is pending', async () => {
            let resolveConnect!: (client: { mock: boolean }) => void

            const connectGate = new Promise<{ mock: boolean }>((resolve) => {
                resolveConnect = resolve
            })

            let connectStarted!: () => void

            const started = new Promise<void>((resolve) => {
                connectStarted = resolve
            })

            let closeCalls = 0

            const client = { mock: true }

            const adapter = {
                engine: 'mysql',

                async connect() {
                    connectStarted()
                    return connectGate
                },

                async close() {
                    closeCalls++
                },

                async ping() { },
                async getServerVersion() {
                    return 'mock-version'
                },
            }

            const repository = createMockRepository(createRecord())

            const registry = {
                get() {
                    return adapter
                },
            }

            const manager = new ConnectionManager(
                repository as never,
                registry as never,
            )

            const pendingConnect = manager.connect('connection-1')

            // Wait until the adapter's connect method has actually started.
            await started

            // Invalidate while the connection is still pending.
            await manager.invalidate('connection-1')

            // Allow the connection attempt to finish.
            resolveConnect(client)

            await assert.rejects(
                pendingConnect,
                /invalidated/,
            )

            assert.equal(manager.isConnected('connection-1'), false)
            assert.equal(manager.getSession('connection-1'), null)
            assert.equal(closeCalls, 1)
        })
    })
})
