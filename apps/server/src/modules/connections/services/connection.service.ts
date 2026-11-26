
import {
    ConnectionConfigSchema,
    ConnectionDtoSchema,
    type ConnectionCredentialsUpdate,
    type ParsedCreateConnectionRequest,
    type UpdateConnectionRequest,
} from '@dbvue/shared'

import { randomUUID } from 'node:crypto'

import type { ConnectionRecord, EncryptedConnectionCredentials } from '../domain/connection-record.js'
import type { ConnectionRepository } from '../repositories/connection.repository.js'
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
        return null;
    }

    const encrypted: EncryptedConnectionCredentials = {}

    if (credentials.password !== undefined) {
        encrypted.password = encryptSecret(credentials.password)
    }

    if (credentials.tlsPrivateKeyPassphrase !== undefined) {
        encrypted.tlsPrivateKeyPassphrase = encryptSecret(
            credentials.tlsPrivateKeyPassphrase
        )
    }

    return Object.keys(encrypted).length > 0 ? encrypted : null;
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
 * Manages saved connections and enforces connection-management rules.
 */
export class ConnectionService {
    constructor(
        private readonly repository: ConnectionRepository,
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

    update(id: string, input: UpdateConnectionRequest) {
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

        return this.toDto(updated)
    }

    delete(id: string): boolean {
        return this.repository.deleteById(id)
    }

    private toDto(record: ConnectionRecord) {
        return ConnectionDtoSchema.parse({
            id: record.id,
            name: record.name,
            config: record.config,
            hasCredentials: record.encryptedCredentials !== null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastConnectedAt: record.lastConnectedAt,
            lastOpenedAt: record.lastOpenedAt,
        })
    }
}
