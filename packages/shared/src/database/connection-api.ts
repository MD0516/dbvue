import { z } from 'zod'

import {
    MysqlConnectionConfigSchema,
    PostgresConnectionConfigSchema,
    MongoConnectionConfigSchema,
    ConnectionConfigSchema,
} from './connection-config.js'

import {
    MysqlCredentialsSchema,
    PostgresCredentialsSchema,
    MongoCredentialsSchema,
    ConnectionCredentialsUpdateSchema,
} from './connection-credentials.js'

import { ConnectionDraftSchema } from './connection-uri.js'

/**
 *  Common schemas
 */
const ConnectionNameSchema = z.string().trim().min(1).max(100)
const TimestampSchema = z.iso.datetime()

/**
 * Validates requests to create a saved database connection.
 *
 * The configuration and credential schemas are selected according
 * to the specified database engine.
 *
 * Credentials are accepted as plaintext API input and must be
 * encrypted before being persisted by the server.
 */
export const CreateConnectionRequestSchema = z.union([
    z.object({
        name: ConnectionNameSchema,
        config: MysqlConnectionConfigSchema,
        credentials: MysqlCredentialsSchema.optional(),
    }).strict(),

    z.object({
        name: ConnectionNameSchema,
        config: PostgresConnectionConfigSchema,
        credentials: PostgresCredentialsSchema.optional(),
    }).strict(),

    z.object({
        name: ConnectionNameSchema,
        config: MongoConnectionConfigSchema,
        credentials: MongoCredentialsSchema.optional(),
    }).strict(),
])

/**
 * Represents the raw input accepted when creating a connection.
 *
 * Defaulted configuration options may be omitted.
 */
export type CreateConnectionRequest = z.input<
    typeof CreateConnectionRequestSchema
>

/**
 * Represents a validated and normalized connection creation request.
 *
 * Defaulted configuration options have been applied by Zod.
 */
export type ParsedCreateConnectionRequest = z.output<
    typeof CreateConnectionRequestSchema
>

/**
 * Validates partial updates to an existing connection.
 *
 * At least one update field must be provided.
 *
 * Credential update semantics:
 * - Omitted credentials preserve existing values.
 * - String values replace the corresponding credentials.
 * - Null values remove the corresponding credentials.
 *
 * Changing the database engine of an existing connection is not allowed.
 * This rule is enforced by the connection service.
 */
export const UpdateConnectionRequestSchema = z.object({
    name: ConnectionNameSchema.optional(),
    config: ConnectionConfigSchema.optional(),
    credentials: ConnectionCredentialsUpdateSchema.optional(),
}).strict().refine(
    value =>
        value.name !== undefined ||
        value.config !== undefined ||
        value.credentials !== undefined,
    {
        message: 'At least one field must be provided.',
    },
)

/**
 * Represents raw input accepted when updating a saved connection.
 */
export type UpdateConnectionRequest = z.input<
    typeof UpdateConnectionRequestSchema
>

/**
 * Represents a validated and normalized connection update request.
 */
export type ParsedUpdateConnectionRequest = z.output<
    typeof UpdateConnectionRequestSchema
>

/**
 * Validates the public representation of a saved database connection.
 *
 * Includes connection configuration and metadata, but never exposes
 * plaintext or encrypted credentials.
 *
 * `hasCredentials` indicates whether saved credentials are available.
 */
export const ConnectionDtoSchema = z.object({
    id: z.string().min(1),
    name: ConnectionNameSchema,
    config: ConnectionConfigSchema,

    hasCredentials: z.boolean(),

    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,

    lastConnectedAt: TimestampSchema.nullable(),
    lastOpenedAt: TimestampSchema.nullable(),
}).strict()

/**
 * Represents a saved connection returned by the API.
 */
export type ConnectionDto = z.infer<
    typeof ConnectionDtoSchema
>

/**
 * Defines the possible runtime states of a database connection.
 *
 * - idle: No active connection has been established.
 * - connecting: A connection attempt is in progress.
 * - connected: The database connection is active.
 * - disconnecting: The active connection is being closed.
 * - disconnected: No active database connection exists.
 * - error: The latest connection operation failed.
 */
export const ConnectionRuntimeStatusSchema = z.enum([
    'idle',
    'connecting',
    'connected',
    'disconnecting',
    'disconnected',
    'error',
])

/**
 * Represents the current runtime state of a database connection.
 */
export type ConnectionRuntimeStatus = z.infer<
    typeof ConnectionRuntimeStatusSchema
>

/**
 * Defines stable error codes used to classify database connection failures.
 *
 * These codes allow clients to handle errors without depending on
 * database-driver-specific error messages.
 */
export const ConnectionErrorCodeSchema = z.enum([
    'AUTHENTICATION_FAILED',
    'CONNECTION_REFUSED',
    'HOST_UNREACHABLE',
    'CONNECTION_TIMEOUT',
    'TLS_ERROR',
    'INVALID_CONFIGURATION',
    'UNKNOWN',
])

/**
 * Represents a standardized database connection error category.
 */
export type ConnectionErrorCode = z.infer<
    typeof ConnectionErrorCodeSchema
>

/**
 * Validates a connection error returned by the API.
 *
 * Includes a human-readable message and indicates whether retrying
 * the failed operation may succeed.
 */
export const ConnectionErrorDtoSchema = z.object({
    code: ConnectionErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
}).strict()

/**
 * Represents a standardized connection error returned by the API.
 */
export type ConnectionErrorDto = z.infer<
    typeof ConnectionErrorDtoSchema
>

/**
 * Validates a connection draft submitted for testing before it is saved.
 *
 * Contains the database configuration and optional plaintext credentials.
 */
export const TestConnectionRequestSchema = ConnectionDraftSchema

/**
 * Represents raw input accepted when testing a connection.
 */
export type TestConnectionRequest = z.input<
    typeof TestConnectionRequestSchema
>

/**
 * Represents a validated connection draft used for testing.
 */
export type ParsedTestConnectionRequest = z.output<
    typeof TestConnectionRequestSchema
>

/**
 * Validates the outcome of a database connection test.
 *
 * The result is discriminated by `success`:
 * - Successful results contain latency and optional server-version information.
 * - Failed results contain a standardized connection error.
 */

export const TestConnectionResultSchema = z.discriminatedUnion('success', [
    z.object({
        success: z.literal(true),
        latencyMs: z.number().nonnegative(),
        serverVersion: z.string().optional(),
    }).strict(),

    z.object({
        success: z.literal(false),
        error: ConnectionErrorDtoSchema,
    }).strict(),
])

/**
 * Represents the outcome of a database connection test.
 */
export type TestConnectionResult = z.infer<
    typeof TestConnectionResultSchema
>