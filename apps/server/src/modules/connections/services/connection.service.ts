import {
    ConnectionConfigSchema,
    ConnectionDtoSchema,
    type ConnectionCredentialsUpdate,
    type ConnectionSummary,
    type ParsedCreateConnectionRequest,
    type UpdateConnectionRequest,
} from '@dbvue/shared'

import { randomUUID } from 'node:crypto'

import type { ConnectionRecord, EncryptedConnectionCredentials } from '../domain/connection-record.js'
import type { ConnectionRepository } from '../repositories/connection.repository.js'
import type { ConnectionManager } from '../domain/connection-manager.js'

import { encryptSecret } from './credential-crypto.js'

/**
 * Indicates that an update attempted to change an existing
 * connection's database engine.
 */
export class ConnectionEngineChangeError extends Error {
    constructor() {
        super(
            'Changing the database engine of an existing connection is not allowed',
        )

        this.name = 'ConnectionEngineChangeError'
    }
}

/**
 * Encrypts supplied connection credentials before persistence.
 *
 * Returns null when no secrets are provided.
 */
function encryptCredentials(
    credentials?: {
        password?: string
        tlsPrivateKeyPassphrase?: string
    },
): EncryptedConnectionCredentials | null {
    if (!credentials) {
        return null
    }

    const encrypted: EncryptedConnectionCredentials = {}

    if (credentials.password !== undefined) {
        encrypted.password = encryptSecret(credentials.password)
    }

    if (credentials.tlsPrivateKeyPassphrase !== undefined) {
        encrypted.tlsPrivateKeyPassphrase = encryptSecret(
            credentials.tlsPrivateKeyPassphrase,
        )
    }

    return Object.keys(encrypted).length > 0 ? encrypted : null
}

/**
 * Applies partial credential updates to existing encrypted credentials.
 *
 * Omitted fields preserve existing values.
 * String values are encrypted and replace existing values.
 * Null values remove existing values.
 *
 * Returns null when no credentials remain.
 */
function updateEncryptedCredentials(
    existing: EncryptedConnectionCredentials | null,
    updates?: ConnectionCredentialsUpdate,
): EncryptedConnectionCredentials | null {
    if (!updates) {
        return existing
    }

    const encrypted: EncryptedConnectionCredentials = {
        ...existing,
    }

    if (updates.password !== undefined) {
        if (updates.password === null) {
            delete encrypted.password
        } else {
            encrypted.password = encryptSecret(updates.password)
        }
    }

    if (updates.tlsPrivateKeyPassphrase !== undefined) {
        if (updates.tlsPrivateKeyPassphrase === null) {
            delete encrypted.tlsPrivateKeyPassphrase
        } else {
            encrypted.tlsPrivateKeyPassphrase = encryptSecret(
                updates.tlsPrivateKeyPassphrase,
            )
        }
    }

    return Object.keys(encrypted).length > 0
        ? encrypted
        : null
}

/**
 * Manages saved database connections and orchestrates
 * their connection lifecycle.
 */
export class ConnectionService {
    constructor(
        private readonly repository: ConnectionRepository,
        private readonly connectionManager: ConnectionManager,
    ) { }

    create(input: ParsedCreateConnectionRequest) {
        const id = randomUUID()
        const now = new Date().toISOString()

        const config = ConnectionConfigSchema.parse(input.config)

        const record: ConnectionRecord = {
            id,
            name: input.name,
            config,
            encryptedCredentials: encryptCredentials(input.credentials),
            createdAt: now,
            updatedAt: now,
            lastConnectedAt: null,
            lastOpenedAt: null,
        }

        this.repository.create(record)

        return this.toDto(record)
    }

    findAll() {
        return this.repository.findAll().map(
            (record) => this.toDto(record),
        )
    }

    findById(id: string) {
        const record = this.repository.findById(id)

        return record ? this.toDto(record) : null
    }

    async update(id: string, input: UpdateConnectionRequest) {
        const existing = this.repository.findById(id)

        if (!existing) {
            return null
        }

        const config = input.config
            ? ConnectionConfigSchema.parse(input.config)
            : existing.config

        if (config.engine !== existing.config.engine) {
            throw new ConnectionEngineChangeError()
        }

        const updated: ConnectionRecord = {
            ...existing,
            name: input.name ?? existing.name,
            config,
            encryptedCredentials: updateEncryptedCredentials(
                existing.encryptedCredentials,
                input.credentials,
            ),
            updatedAt: new Date().toISOString(),
        }

        if (!this.repository.update(updated)) {
            return null
        }

        await this.connectionManager.invalidate(id)

        return this.toDto(updated)
    }

    async delete(id: string): Promise<boolean> {
        const existing = this.repository.findById(id)

        if (!existing) {
            return false
        }

        await this.connectionManager.invalidate(id)

        return this.repository.deleteById(id)
    }

    /**
     * Establishes a live connection to a saved database.
     */
    async connect(id: string) {
        const existing = this.repository.findById(id)

        if (!existing) {
            return null
        }

        const session = await this.connectionManager.connect(id)

        const latest = this.repository.findById(id)

        if (latest) {
            this.repository.update({
                ...latest,
                lastConnectedAt: session.connectedAt.toISOString(),
            })
        }

        return session
    }

    /**
     * Closes a live database connection.
     */
    async disconnect(id: string) {
        const existing = this.repository.findById(id)

        if (!existing) {
            return false
        }

        await this.connectionManager.disconnect(id)

        return true
    }

    /**
     * Returns whether a saved connection currently has an active session.
     */
    getConnectionStatus(id: string) {
        const existing = this.repository.findById(id)

        if (!existing) {
            return null
        }

        return this.connectionManager.isConnected(id)
    }

    getSummary() {
        const connections = this.repository.findAll()

        let connected = 0
        let failed = 0

        for (const connection of connections) {
            if (this.connectionManager.isConnected(connection.id)) {
                connected++
            } else if (this.connectionManager.isFailed(connection.id)) {
                failed++
            }
        }

        return {
            total: connections.length,
            connected,
            failed,
            idle: connections.length - connected - failed,
        }
    }

    private toDto(record: ConnectionRecord) {
        return ConnectionDtoSchema.parse({
            id: record.id,
            name: record.name,
            config: record.config,
            hasCredentials: record.encryptedCredentials !== null,
            connected: this.connectionManager.isConnected(record.id),
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastConnectedAt: record.lastConnectedAt,
            lastOpenedAt: record.lastOpenedAt,
        })
    }
}