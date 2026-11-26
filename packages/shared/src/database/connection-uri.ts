import { z } from 'zod'
import {
    MysqlConnectionConfigSchema,
    PostgresConnectionConfigSchema,
    MongoConnectionConfigSchema,
} from './connection-config.js'

import {
    MysqlCredentialsSchema,
    PostgresCredentialsSchema,
    MongoCredentialsSchema,
} from './connection-credentials.js'

/**
 * Validates input used to parse a database connection URI.
 *
 * The engine identifies the database type, and the URI contains
 * the connection details supplied by the user.
 */
export const ConnectionUriInputSchema = z.object({
    engine: z.enum(['mysql', 'postgres', 'mongodb']),
    uri: z.string().trim().min(1).max(8192),
}).strict()

/**
 * Represents the input required to parse a database connection URI.
 */
export type ConnectionUriInput = z.infer<
    typeof ConnectionUriInputSchema
>

/**
 * Validates a database connection draft before it is persisted.
 *
 * Contains an engine-specific connection configuration and optional
 * plaintext credentials.
 *
 * Unlike a saved connection, a draft does not contain a persistent ID
 * or connection lifecycle metadata.
 */
export const ConnectionDraftSchema = z.union([
    z.object({
        config: MysqlConnectionConfigSchema,
        credentials: MysqlCredentialsSchema.optional(),
    }).strict(),

    z.object({
        config: PostgresConnectionConfigSchema,
        credentials: PostgresCredentialsSchema.optional(),
    }).strict(),

    z.object({
        config: MongoConnectionConfigSchema,
        credentials: MongoCredentialsSchema.optional(),
    }).strict(),
])

/**
 * Represents a validated database connection draft.
 */
export type ConnectionDraft = z.infer<
    typeof ConnectionDraftSchema
>

/**
 * Represents a structured issue encountered while parsing
 * a database connection URI.
 *
 * The optional parameter identifies the URI option associated
 * with the issue.
 */
export interface ConnectionUriParseIssue {
    code: 'INVALID_URI' | 'UNSUPPORTED_OPTION' | 'INVALID_VALUE'
    message: string
    parameter?: string
}