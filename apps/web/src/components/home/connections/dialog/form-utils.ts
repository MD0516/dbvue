
import {
    CreateConnectionRequestSchema,
    UpdateConnectionRequestSchema,
    parseConnectionUri,
    type ConnectionConfig,
    type ConnectionDto,
    type CreateConnectionRequest,
    type UpdateConnectionRequest,
} from "@dbvue/shared"

import type { ConnectionFormValues } from "./form-schema"

import {
    DEFAULT_CONNECTION_FORM_VALUES,
    DEFAULT_PORTS,
} from "./constants"

// -----------------------------------------------------------------------------
// Create payload
// -----------------------------------------------------------------------------
export type BuildPayloadResult =
    | {
        success: true
        payload: CreateConnectionRequest
    }
    | {
        success: false
        message: string
    }

function validateCreatePayload(
    payload: CreateConnectionRequest,
): BuildPayloadResult {
    const result = CreateConnectionRequestSchema.safeParse(payload)

    if (!result.success) {
        return {
            success: false,
            message: result.error.issues
                .map((issue) => issue.message)
                .join(" "),
        }
    }

    return {
        success: true,
        payload: result.data,
    }
}

export function buildCreateConnectionRequest(
    values: ConnectionFormValues,
): BuildPayloadResult {
    const name = values.name.trim()

    // URI mode
    if (values.inputMode === "uri") {
        const result = parseConnectionUri({
            engine: values.engine,
            uri: values.uri,
        })

        if (!result.success) {
            return {
                success: false,
                message: result.issues
                    .map((issue) => issue.message)
                    .join(" "),
            }
        }

        const payload = {
            name,
            ...result.draft,
        } satisfies CreateConnectionRequest

        return validateCreatePayload(payload)
    }

    const host = values.host.trim()
    const port = Number(values.port)
    const database = values.database.trim()
    const username = values.username.trim()
    const timeout = Number(values.connectionTimeoutMs)

    const tls = values.tlsMode === "disabled"
        ? undefined
        : { mode: values.tlsMode }

    const credentials = values.password
        ? { password: values.password }
        : undefined

    const optionalFields = {
        ...(database ? { database } : {}),
        ...(tls ? { tls } : {}),
    }

    switch (values.engine) {
        case "mysql": {
            const payload = {
                name,
                config: {
                    engine: "mysql",
                    address: {
                        type: "tcp",
                        host,
                        port,
                    },
                    username,
                    ...optionalFields,
                    options: {
                        connectTimeoutMs: timeout,
                    },
                },
                ...(credentials ? { credentials } : {}),
            } satisfies CreateConnectionRequest

            return validateCreatePayload(payload)
        }

        case "postgres": {
            const payload = {
                name,
                config: {
                    engine: "postgres",
                    address: {
                        type: "tcp",
                        host,
                        port,
                    },
                    username,
                    ...optionalFields,
                    pool: {
                        connectionTimeoutMs: timeout,
                    },
                },
                ...(credentials ? { credentials } : {}),
            } satisfies CreateConnectionRequest

            return validateCreatePayload(payload)
        }

        case "mongodb": {
            const payload = {
                name,
                config: {
                    engine: "mongodb",
                    address: {
                        type: "seed-list",
                        hosts: [{ host, port }],
                    },
                    ...(username ? { username } : {}),
                    ...optionalFields,
                    options: {
                        connectTimeoutMs: timeout,
                    },
                },
                ...(credentials ? { credentials } : {}),
            } satisfies CreateConnectionRequest

            return validateCreatePayload(payload)
        }
    }
}

// -----------------------------------------------------------------------------
// Edit form initialization
// -----------------------------------------------------------------------------
export function getConnectionFormValues(
    connection?: ConnectionDto,
): ConnectionFormValues {
    if (!connection) {
        return { ...DEFAULT_CONNECTION_FORM_VALUES }
    }

    const config = connection.config
    const address = config.address

    let host = ""
    let port = String(DEFAULT_PORTS[config.engine])
    let addressEditable = false

    switch (address.type) {
        case "tcp":
            host = address.host
            port = String(address.port)
            addressEditable = true
            break

        case "socket":
            host = address.socketPath
            break

        case "seed-list": {
            const first = address.hosts[0]

            if (first) {
                host = first.host
                port = String(first.port)
            }

            // Only a single-host seed-list can be edited using
            // the current Host / Port fields.
            addressEditable = address.hosts.length === 1
            break
        }

        case "srv":
            host = address.hostname
            break
    }

    const connectionTimeoutMs =
        config.engine === "postgres"
            ? config.pool.connectionTimeoutMs
            : config.options.connectTimeoutMs

    return {
        ...DEFAULT_CONNECTION_FORM_VALUES,

        name: connection.name,
        engine: config.engine,
        inputMode: "host",

        host,
        port,

        database: config.database ?? "",
        username: config.username ?? "",

        // Never populate secrets from ConnectionDto.
        password: "",
        uri: "",

        tlsMode: config.tls?.mode ?? "disabled",
        connectionTimeoutMs: String(connectionTimeoutMs),

        addressEditable,
        removeSavedCredentials: false,
    }
}

// -----------------------------------------------------------------------------
// Update payload
// -----------------------------------------------------------------------------
export type BuildUpdatePayloadResult =
    | {
        success: true
        payload: UpdateConnectionRequest
    }
    | {
        success: false
        message: string
    }

/**
 * Preserve the original TLS certificate references when TLS stays enabled.
 * Explicitly omitting the tls property disables TLS and removes those refs.
 */
function getUpdatedTls(
    originalTls: NonNullable<ConnectionConfig["tls"]> | undefined,
    mode: ConnectionFormValues["tlsMode"],
): NonNullable<ConnectionConfig["tls"]> | undefined {
    if (mode === "disabled") {
        return undefined
    }

    return {
        ...originalTls,
        mode,
    }
}

export function buildUpdateConnectionRequest(
    values: ConnectionFormValues,
    connection: ConnectionDto,
): BuildUpdatePayloadResult {
    const timeout = Number(values.connectionTimeoutMs)

    const database = values.database.trim() || undefined
    const username = values.username.trim()

    const host = values.host.trim()
    const port = Number(values.port)

    let config: ConnectionConfig

    switch (connection.config.engine) {
        case "mysql": {
            const original = connection.config
            const { tls: originalTls, ...originalConfig } = original

            const tls = getUpdatedTls(
                originalTls,
                values.tlsMode,
            )

            config = {
                ...originalConfig,

                address:
                    values.addressEditable && original.address.type === "tcp"
                        ? {
                            type: "tcp",
                            host,
                            port,
                        }
                        : original.address,

                username,
                database,

                ...(tls ? { tls } : {}),

                // Preserve every other driver option and pool setting.
                options: {
                    ...original.options,
                    connectTimeoutMs: timeout,
                },
            }

            break
        }

        case "postgres": {
            const original = connection.config
            const { tls: originalTls, ...originalConfig } = original

            const tls = getUpdatedTls(
                originalTls,
                values.tlsMode,
            )

            config = {
                ...originalConfig,

                address:
                    values.addressEditable && original.address.type === "tcp"
                        ? {
                            type: "tcp",
                            host,
                            port,
                        }
                        : original.address,

                username,
                database,

                ...(tls ? { tls } : {}),

                // Preserve existing PostgreSQL options.
                options: {
                    ...original.options,
                },

                // Update only the timeout while retaining pool settings.
                pool: {
                    ...original.pool,
                    connectionTimeoutMs: timeout,
                },
            }

            break
        }

        case "mongodb": {
            const original = connection.config
            const { tls: originalTls, ...originalConfig } = original

            const tls = getUpdatedTls(
                originalTls,
                values.tlsMode,
            )

            const nextAddress =
                values.addressEditable &&
                    original.address.type === "seed-list"
                    ? {
                        type: "seed-list" as const,
                        hosts: original.address.hosts.map((item, index) =>
                            index === 0
                                ? { host, port }
                                : item,
                        ),
                    }
                    : original.address

            config = {
                ...originalConfig,

                address: nextAddress,

                username: username || undefined,
                database,

                ...(tls ? { tls } : {}),

                // Preserve all other MongoDB options and settings.
                options: {
                    ...original.options,
                    connectTimeoutMs: timeout,
                },
            }

            break
        }
    }

    // Omitted credentials preserve existing secrets.
    // null explicitly removes the saved credentials.
    // A string replaces the saved password.
    const credentials = values.removeSavedCredentials
        ? {
            password: null,
            tlsPrivateKeyPassphrase: null,
        }
        : values.password.length > 0
            ? { password: values.password }
            : undefined

    const payload = {
        name: values.name.trim(),
        config,
        ...(credentials ? { credentials } : {}),
    } satisfies UpdateConnectionRequest

    const result = UpdateConnectionRequestSchema.safeParse(payload)

    if (!result.success) {
        return {
            success: false,
            message: result.error.issues
                .map((issue) => issue.message)
                .join(" "),
        }
    }

    return {
        success: true,
        payload: result.data,
    }
}
