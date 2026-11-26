import type { DatabaseEngine } from "@dbvue/shared"
import type { ConnectionFormValues } from "./form-schema"

export const DEFAULT_PORTS: Record<DatabaseEngine, number> = {
    mysql: 3306,
    postgres: 5432,
    mongodb: 27017,
}

export const DEFAULT_CONNECTION_FORM_VALUES: ConnectionFormValues = {
    name: "",
    engine: "mysql",
    inputMode: "host",

    host: "localhost",
    port: "3306",
    database: "",
    username: "",
    password: "",

    uri: "",

    tlsMode: "disabled",
    connectionTimeoutMs: "10000",

    addressEditable: true,
    removeSavedCredentials: false,
}

export const URI_PLACEHOLDERS: Record<DatabaseEngine, string> = {
    mysql: "mysql://user:password@localhost:3306/database",
    postgres: "postgresql://user:password@localhost:5432/database",
    mongodb: "mongodb://user:password@localhost:27017/database",
}