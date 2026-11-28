import { z } from 'zod';
import {
    ConnectionConfigSchema,
    type ConnectionConfig,
    type DatabaseEngine,
} from '@dbvue/shared'

/**
 * Matches canonical Base64-encoded binary data
 */
const Base64Schema = z.string().regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    'Invalid Base64 value',
)

/**
 * Represents an encrypted secret using AES-256-GCM.
 *
 * Binary values are Base64-encoded for JSON serialization.
 */
export const EncryptedSecretSchema = z.object({
    /** Version of the encrypted-secret format. */
    version: z.literal(1),

    /** Encryption algorithm used. */
    algorithm: z.literal('aes-256-gcm'),

    /** Base64-encoded 12-byte initialization vector (nonce). */
    iv: Base64Schema.length(16),

    /** Base64-encoded GCM authentication tag. */
    authTag: Base64Schema.length(24),

    /** Base64-encoded encrypted secret. */
    cipherText: Base64Schema,
})

export type EncryptedSecret = z.infer<typeof EncryptedSecretSchema>

/**
 * Contains encrypted database credentials associated with a connection.
 *
 * Only supplied secrets are included.
 */
export const EncryptedConnectionCredentialsSchema = z.object({
    password: EncryptedSecretSchema.optional(),
    tlsPrivateKeyPassphrase: EncryptedSecretSchema.optional(),
})
export type EncryptedConnectionCredentials = z.infer<typeof EncryptedConnectionCredentialsSchema>

/**
 * Complete payload serialized into the connections.config_json column.
 *
 * Contains the normalized connection configuration and encrypted credentials.
 */
export const StoredConnectionPayloadSchema = z.object({
    config: ConnectionConfigSchema,
    credentials: EncryptedConnectionCredentialsSchema.nullable(),
})
export type StoredConnectionPayload = z.infer<typeof StoredConnectionPayloadSchema>

/**
 * Represents a connection row returned by SQLite.
 *
 * Column aliases use camelCase, and configJson contains serialized JSON.
 */
export interface ConnectionSqliteRow {
    id: string
    name: string
    engine: DatabaseEngine

    // Serialized, validated ConnectionConfig.
    configJson: string

    createdAt: string
    updatedAt: string
    lastConnectedAt: string | null
    lastOpenedAt: string | null
}

/**
 * Represents a normalized connection record used by backend services.
 *
 * Unlike the SQLite row, its configuration is represented as typed data.
 */
export interface ConnectionRecord {
    id: string
    name: string
    config: ConnectionConfig
    encryptedCredentials: EncryptedConnectionCredentials | null
    
    createdAt: string
    updatedAt: string
    lastConnectedAt: string | null
    lastOpenedAt: string | null
}