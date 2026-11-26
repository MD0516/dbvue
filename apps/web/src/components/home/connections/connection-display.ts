import type { ConnectionDto, DatabaseEngine } from "@dbvue/shared"

import {
    Mongodb,
    Mysql,
    Postgres,
} from "@/components/icons/engine-icons"

import type { LucideIcon } from "lucide-react"

export const ENGINE_META: Record<
    DatabaseEngine,
    {
        label: string
        icon: LucideIcon
        color: string
        background: string
    }
> = {
    mysql: {
        label: "MySQL",
        icon: Mysql,
        color: "text-engine-mysql",
        background: "bg-engine-mysql/10 border-engine-mysql/20",
    },
    postgres: {
        label: "PostgreSQL",
        icon: Postgres,
        color: "text-engine-postgres",
        background: "bg-engine-postgres/10 border-engine-postgres/20",
    },
    mongodb: {
        label: "MongoDB",
        icon: Mongodb,
        color: "text-engine-mongodb",
        background: "bg-engine-mongodb/10 border-engine-mongodb/20",
    },
}

export function getConnectionAddress(
    connection: ConnectionDto,
): string {
    const address = connection.config.address

    switch (address.type) {
        case "tcp":
            return `${address.host}:${address.port}`

        case "socket":
            return address.socketPath

        case "seed-list": {
            const first = address.hosts[0]

            if (!first) return "No hosts configured"

            const primary = `${first.host}:${first.port}`

            return address.hosts.length > 1
                ? `${primary} +${address.hosts.length - 1} more`
                : primary
        }

        case "srv":
            return address.hostname
    }
}

export function getFullConnectionAddress(
    connection: ConnectionDto,
): string {
    const address = connection.config.address

    switch (address.type) {
        case "tcp":
            return `${address.host}:${address.port}`

        case "socket":
            return address.socketPath

        case "seed-list":
            return address.hosts
                .map(({ host, port }) => `${host}:${port}`)
                .join(", ")

        case "srv":
            return `${address.hostname} (SRV)`
    }
}

export function getAddressType(
    connection: ConnectionDto,
): string {
    switch (connection.config.address.type) {
        case "tcp":
            return "TCP"

        case "socket":
            return "Socket"

        case "seed-list":
            return "Seed list"

        case "srv":
            return "SRV"
    }
}

export function formatRelativeTime(
    value: string | null,
): string {
    if (!value) return "Never opened"

    const timestamp = new Date(value).getTime()

    if (!Number.isFinite(timestamp)) return "Unknown"

    const difference = timestamp - Date.now()

    const units = [
        { limit: 60_000, divisor: 1000, unit: "second" as const },
        { limit: 3_600_000, divisor: 60_000, unit: "minute" as const },
        { limit: 86_400_000, divisor: 3_600_000, unit: "hour" as const },
        { limit: 2_592_000_000, divisor: 86_400_000, unit: "day" as const },
        { limit: 31_536_000_000, divisor: 2_592_000_000, unit: "month" as const },
        { limit: Infinity, divisor: 31_536_000_000, unit: "year" as const },
    ]

    const selected = units.find(
        ({ limit }) => Math.abs(difference) < limit,
    )!

    const amount = Math.round(difference / selected.divisor)

    return new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
        style: "short",
    }).format(amount, selected.unit)
}

export function getConnectionWorkspacePath(
    connection: ConnectionDto,
): string {
    return `/connections/${encodeURIComponent(connection.id)}`
}