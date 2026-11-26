import { z } from 'zod'

/**
 * Supported database engines managed by dbvue.
 */
export const DATABASE_ENGINES = [
    'mysql',
    'postgres',
    'mongodb',
] as const

/**
 * Validates supported database engine identifiers.
 */
export const DatabaseEngineSchema = z.enum(DATABASE_ENGINES)

/**
 * Represents a supported database engine.
 */
export type DatabaseEngine = z.infer<typeof DatabaseEngineSchema>

/**
 * Common primitives
 */
const HostSchema = z.string().trim().min(1).max(253)
const PortSchema = z.number().int().min(1).max(65535)
const TimeoutSchema = z.number().int().min(0).max(600_000)
const IdSchema = z.string().trim().min(1).max(128)

/**
 * TLS material references point to files managed by dbvue.
 * Certificate contents and private keys are never stored in SQLite.
 */
export const TlsConfigSchema = z.object({
    mode: z.enum([
        'required',
        'verify-ca',
        'verify-full',
    ]),

    caCertificateId: IdSchema.optional(),
    clientCertificateId: IdSchema.optional(),
    clientPrivateKeyId: IdSchema.optional(),
}).strict().superRefine((value, ctx) => {
    if (
        Boolean(value.clientCertificateId) !==
        Boolean(value.clientPrivateKeyId)
    ) {
        ctx.addIssue({
            code: 'custom',
            path: ['clientCertificateId'],
            message: 'Client certificate and private key must be provided together.',
        })
    }
})

export type TlsConfig = z.infer<typeof TlsConfigSchema>

/**
 * MySQL
 */
const MysqlAddressSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('tcp'),
        host: HostSchema,
        port: PortSchema.default(3306),
    }).strict(),

    z.object({
        type: z.literal('socket'),
        socketPath: z.string().trim().min(1).max(1024),
    }).strict(),
])

const MysqlOptionsSchema = z.object({
    connectTimeoutMs: TimeoutSchema.default(10_000),

    charset: z.string().trim().min(1).max(64).default('utf8mb4'),
    timezone: z.string().trim().min(1).max(64).default('local'),

    enableKeepAlive: z.boolean().default(true),
    keepAliveInitialDelayMs: TimeoutSchema.default(0),

    supportBigNumbers: z.boolean().default(true),
    bigNumberStrings: z.boolean().default(true),
    decimalNumbers: z.boolean().default(false),

    dateStrings: z.union([
        z.boolean(),
        z.array(z.enum(['DATE', 'DATETIME', 'TIMESTAMP'])),
    ]).default(true),

    namedPlaceholders: z.boolean().default(false),
    multipleStatements: z.boolean().default(false),
}).strict()

const MysqlPoolSchema = z.object({
    connectionLimit: z.number().int().min(1).max(1000).default(10),
    maxIdle: z.number().int().min(0).max(1000).default(10),
    idleTimeoutMs: TimeoutSchema.default(60_000),

    waitForConnections: z.boolean().default(true),
    queueLimit: z.number().int().min(0).max(100_000).default(0),
}).strict().superRefine((value, ctx) => {
    if (value.maxIdle > value.connectionLimit) {
        ctx.addIssue({
            code: 'custom',
            path: ['maxIdle'],
            message: 'Maximum idle connections cannot exceed the connection limit.',
        })
    }
})

export const MysqlConnectionConfigSchema = z.object({
    engine: z.literal('mysql'),

    address: MysqlAddressSchema,
    username: z.string().trim().min(1).max(256),
    database: z.string().trim().min(1).max(256).optional(),

    tls: TlsConfigSchema.optional(),

    options: MysqlOptionsSchema.prefault({}),
    pool: MysqlPoolSchema.prefault({}),
}).strict()

export type MysqlConnectionConfig = z.infer<
    typeof MysqlConnectionConfigSchema
>

/**
 * PostgreSQL
 */
const PostgresAddressSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('tcp'),
        host: HostSchema,
        port: PortSchema.default(5432),
    }).strict(),

    z.object({
        type: z.literal('socket'),
        socketPath: z.string().trim().min(1).max(1024),
    }).strict(),
])

const PostgresOptionsSchema = z.object({
    applicationName: z.string().trim().min(1).max(128).optional(),

    keepAlive: z.boolean().default(true),
    keepAliveInitialDelayMs: TimeoutSchema.default(0),

    statementTimeoutMs: TimeoutSchema.optional(),
    queryTimeoutMs: TimeoutSchema.optional(),
    lockTimeoutMs: TimeoutSchema.optional(),
    idleInTransactionSessionTimeoutMs: TimeoutSchema.optional(),

    clientEncoding: z.string().trim().min(1).max(64).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
}).strict()

const PostgresPoolSchema = z.object({
    max: z.number().int().min(1).max(1000).default(10),
    min: z.number().int().min(0).max(1000).default(0),

    idleTimeoutMs: TimeoutSchema.default(10_000),
    connectionTimeoutMs: TimeoutSchema.default(10_000),

    maxLifetimeSeconds: z.number().int().min(0).optional(),
    maxUses: z.number().int().min(1).optional(),
}).strict().superRefine((value, ctx) => {
    if (value.min > value.max) {
        ctx.addIssue({
            code: 'custom',
            path: ['min'],
            message: 'Minimum pool size cannot exceed maximum pool size.',
        })
    }
})

export const PostgresConnectionConfigSchema = z.object({
    engine: z.literal('postgres'),

    address: PostgresAddressSchema,
    username: z.string().trim().min(1).max(256),
    database: z.string().trim().min(1).max(256).optional(),

    tls: TlsConfigSchema.optional(),

    options: PostgresOptionsSchema.prefault({}),
    pool: PostgresPoolSchema.prefault({}),
}).strict()

export type PostgresConnectionConfig = z.infer<
    typeof PostgresConnectionConfigSchema
>

/**
 * MongoDB
 */
const MongoHostSchema = z.object({
    host: HostSchema,
    port: PortSchema.default(27017),
}).strict()

const MongoAddressSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('seed-list'),
        hosts: z.array(MongoHostSchema).min(1).max(50),
    }).strict(),

    z.object({
        type: z.literal('srv'),
        hostname: HostSchema,
    }).strict(),
])

const MongoOptionsSchema = z.object({
    appName: z.string().trim().min(1).max(128).optional(),

    authSource: z.string().trim().min(1).max(256).optional(),
    authMechanism: z.string().trim().min(1).max(64).optional(),

    replicaSet: z.string().trim().min(1).max(256).optional(),
    directConnection: z.boolean().optional(),

    retryReads: z.boolean().default(true),
    retryWrites: z.boolean().default(true),

    connectTimeoutMs: TimeoutSchema.default(30_000),
    serverSelectionTimeoutMs: TimeoutSchema.default(30_000),
    socketTimeoutMs: TimeoutSchema.default(0),

    readPreference: z.enum([
        'primary',
        'primaryPreferred',
        'secondary',
        'secondaryPreferred',
        'nearest',
    ]).default('primary'),

    readConcernLevel: z.enum([
        'local',
        'available',
        'majority',
        'linearizable',
        'snapshot',
    ]).optional(),

    writeConcern: z.object({
        w: z.union([
            z.number().int().min(0),
            z.string().trim().min(1).max(128),
        ]).optional(),

        journal: z.boolean().optional(),
        timeoutMs: TimeoutSchema.optional(),
    }).strict().optional(),
}).strict()

const MongoPoolSchema = z.object({
    maxPoolSize: z.number().int().min(1).max(1000).default(100),
    minPoolSize: z.number().int().min(0).max(1000).default(0),

    maxConnecting: z.number().int().min(1).max(100).default(2),
    maxIdleTimeMs: TimeoutSchema.default(0),
    waitQueueTimeoutMs: TimeoutSchema.default(0),
}).strict().superRefine((value, ctx) => {
    if (value.minPoolSize > value.maxPoolSize) {
        ctx.addIssue({
            code: 'custom',
            path: ['minPoolSize'],
            message: 'Minimum pool size cannot exceed maximum pool size.',
        })
    }
})

export const MongoConnectionConfigSchema = z.object({
    engine: z.literal('mongodb'),

    address: MongoAddressSchema,
    database: z.string().trim().min(1).max(256).optional(),
    username: z.string().trim().min(1).max(256).optional(),

    tls: TlsConfigSchema.optional(),

    options: MongoOptionsSchema.prefault({}),
    pool: MongoPoolSchema.prefault({}),
}).strict()

export type MongoConnectionConfig = z.infer<
    typeof MongoConnectionConfigSchema
>
/**
 * Unified types
 */
export const ConnectionConfigSchema = z.discriminatedUnion('engine', [
    MysqlConnectionConfigSchema,
    PostgresConnectionConfigSchema,
    MongoConnectionConfigSchema,
])

export type ConnectionConfig = z.infer<
    typeof ConnectionConfigSchema
>

export interface ConnectionConfigByEngine {
    mysql: MysqlConnectionConfig
    postgres: PostgresConnectionConfig
    mongodb: MongoConnectionConfig
}