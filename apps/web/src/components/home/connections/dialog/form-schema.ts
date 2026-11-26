import { z } from "zod"

import {
    DatabaseEngineSchema,
    parseConnectionUri,
} from "@dbvue/shared"

export const ConnectionFormSchema = z.object({
    name: z.string()
        .trim()
        .min(1, "Connection name is required.")
        .max(100, "Connection name cannot exceed 100 characters."),

    engine: DatabaseEngineSchema,

    inputMode: z.enum(["host", "uri"]),

    host: z.string(),
    port: z.string(),
    database: z.string(),
    username: z.string(),
    password: z.string(),

    uri: z.string(),

    tlsMode: z.enum([
        "disabled",
        "required",
        "verify-ca",
        "verify-full",
    ]),

    connectionTimeoutMs: z.string(),

    // Internal form state, not API properties.
    addressEditable: z.boolean(),
    removeSavedCredentials: z.boolean(),
}).superRefine((values, ctx) => {
    if (values.inputMode === "uri") {
        if (!values.uri.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["uri"],
                message: "Connection URI is required.",
            })
            return
        }

        const result = parseConnectionUri({
            engine: values.engine,
            uri: values.uri,
        })

        if (!result.success) {
            for (const issue of result.issues) {
                ctx.addIssue({
                    code: "custom",
                    path: ["uri"],
                    message: issue.message,
                })
            }
        }

        return
    }

    // Some existing address types are preserved but not editable yet.
    if (values.addressEditable) {
        if (!values.host.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["host"],
                message: "Hostname is required.",
            })
        } else if (values.host.trim().length > 253) {
            ctx.addIssue({
                code: "custom",
                path: ["host"],
                message: "Hostname cannot exceed 253 characters.",
            })
        }

        const port = values.port.trim()

        if (!/^\d+$/.test(port)) {
            ctx.addIssue({
                code: "custom",
                path: ["port"],
                message: "Enter a valid port.",
            })
        } else {
            const parsedPort = Number(port)

            if (
                !Number.isSafeInteger(parsedPort) ||
                parsedPort < 1 ||
                parsedPort > 65535
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["port"],
                    message: "Port must be between 1 and 65535.",
                })
            }
        }
    }

    if (
        values.engine !== "mongodb" &&
        !values.username.trim()
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["username"],
            message: "Username is required.",
        })
    }

    if (
        values.engine === "mongodb" &&
        values.password.length > 0 &&
        !values.username.trim()
    ) {
        ctx.addIssue({
            code: "custom",
            path: ["password"],
            message: "A username is required when a password is supplied.",
        })
    }

    if (values.username.length > 256) {
        ctx.addIssue({
            code: "custom",
            path: ["username"],
            message: "Username cannot exceed 256 characters.",
        })
    }

    if (values.database.trim().length > 256) {
        ctx.addIssue({
            code: "custom",
            path: ["database"],
            message: "Database name cannot exceed 256 characters.",
        })
    }

    const timeout = values.connectionTimeoutMs.trim()

    if (!/^\d+$/.test(timeout)) {
        ctx.addIssue({
            code: "custom",
            path: ["connectionTimeoutMs"],
            message: "Enter a valid timeout.",
        })
    } else {
        const parsedTimeout = Number(timeout)

        if (
            !Number.isSafeInteger(parsedTimeout) ||
            parsedTimeout > 600000
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["connectionTimeoutMs"],
                message: "Timeout must be between 0 and 600000 ms.",
            })
        }
    }

    if (values.removeSavedCredentials && values.password.length > 0) {
        ctx.addIssue({
            code: "custom",
            path: ["password"],
            message: "Choose either a new password or credential removal.",
        })
    }
})

export type ConnectionFormValues = z.infer<
    typeof ConnectionFormSchema
>