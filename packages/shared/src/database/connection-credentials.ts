import { z } from 'zod'

/**
 * Validates plaintext credentials supplied for a MySQL connection.
 */
export const MysqlCredentialsSchema = z.object({
    password: z.string().optional(),
    tlsPrivateKeyPassphrase: z.string().optional(),
}).strict()

/**
 * Validates plaintext credentials supplied for a PostgreSQL connection.
 */
export const PostgresCredentialsSchema = z.object({
    password: z.string().optional(),
    tlsPrivateKeyPassphrase: z.string().optional(),
}).strict()

/**
 * Validates plaintext credentials supplied for a MongoDB connection.
 */
export const MongoCredentialsSchema = z.object({
    password: z.string().optional(),
    tlsPrivateKeyPassphrase: z.string().optional(),
}).strict()

export type MysqlCredentials = z.infer<typeof MysqlCredentialsSchema>
export type PostgresCredentials = z.infer<typeof PostgresCredentialsSchema>
export type MongoCredentials = z.infer<typeof MongoCredentialsSchema>

export interface ConnectionCredentialsByEngine {
    mysql: MysqlCredentials
    postgres: PostgresCredentials
    mongodb: MongoCredentials
}

/**
 * Validates partial updates to stored connection credentials.
 *
 * Each credential can independently be replaced or removed.
 *
 * - Omitted fields leave existing credentials unchanged.
 * - String values replace existing credentials.
 * - Null values explicitly remove existing credentials.
 *
 * At least one credential field must be provided.
 */
export const ConnectionCredentialsUpdateSchema = z.object({
    password: z.string().nullable().optional(),
    tlsPrivateKeyPassphrase: z.string().nullable().optional(),
}).strict().refine(
    value =>
        value.password !== undefined ||
        value.tlsPrivateKeyPassphrase !== undefined,
    {
        message: 'At least one credential field must be provided.',
    },
)

/**
 * Represents validated credential update input.
 *
 * Null explicitly indicates credential removal, while an omitted
 * property indicates that the existing credential must be preserved.
 */
export type ConnectionCredentialsUpdate = z.infer<
    typeof ConnectionCredentialsUpdateSchema
>