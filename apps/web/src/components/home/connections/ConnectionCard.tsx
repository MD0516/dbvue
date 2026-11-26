import { ArrowRight } from "lucide-react"
import { Link } from "react-router"

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card"

import type { ConnectionDto } from "@dbvue/shared"

import { ConnectionActionsMenu } from "./ConnectionActionsMenu"

import {
    ENGINE_META,
    formatRelativeTime,
    getConnectionWorkspacePath,
} from "./connection-display"

import { cn } from "@/lib/utils"

function isLocalHost(host: string): boolean {
    const normalized = host
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, "")

    if (
        normalized === "localhost" ||
        normalized.endsWith(".localhost") ||
        normalized === "::1"
    ) {
        return true
    }

    const octets = normalized.split(".")

    if (octets.length !== 4) return false

    const values = octets.map(Number)

    return (
        octets.every((part) => /^\d+$/.test(part)) &&
        values.every((value) => value >= 0 && value <= 255) &&
        values[0] === 127
    )
}

function getEndpointInfo(connection: ConnectionDto) {
    const address = connection.config.address

    switch (address.type) {
        case "tcp":
            return {
                value: `${address.host}:${address.port}`,
                label: isLocalHost(address.host) ? "Local" : "TCP",
            }

        case "socket":
            return {
                value: address.socketPath,
                label: "Local",
            }

        case "seed-list": {
            const isLocal = address.hosts.every(({ host }) =>
                isLocalHost(host),
            )

            return {
                value: address.hosts
                    .map(({ host, port }) => `${host}:${port}`)
                    .join(", "),
                label: isLocal ? "Local" : "Seed list",
            }
        }

        case "srv":
            return {
                value: address.hostname,
                label: "SRV",
            }
    }
}

export function ConnectionCard({
    connection, openEditDialog, openDeleteDialog
}: {
    connection: ConnectionDto
    openEditDialog: () => void
    openDeleteDialog: () => void
}) {
    const engine = connection.config.engine
    const meta = ENGINE_META[engine]
    const Icon = meta.icon

    const endpoint = getEndpointInfo(connection)
    const database = connection.config.database

    return (
        <Card
            className="
                group relative min-w-0 gap-0 overflow-hidden
                border-border bg-card p-0
                transition-all duration-200
                hover:-translate-y-0.5
                hover:border-primary/30
                hover:bg-muted dark:hover:bg-muted/40
                hover:shadow-md
            "
        >
            {/* Actions */}
            <div className="absolute right-2 top-2.5 z-10">
                <ConnectionActionsMenu openEditDialog={openEditDialog} openDeleteDialog={openDeleteDialog} />
            </div>

            <Link
                to={getConnectionWorkspacePath(connection)}
                aria-label={`Open ${connection.name} workspace`}
                className="
                    block min-w-0 rounded-xl
                    outline-none
                    focus-visible:ring-2
                    focus-visible:ring-inset
                    focus-visible:ring-ring
                "
            >
                {/* Header */}
                <CardHeader className="px-3.5 pb-2 pt-3">
                    <div className="flex min-w-0 items-center gap-2.5 pr-8">
                        <div
                            className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-md border",
                                meta.background,
                            )}
                        >
                            <Icon className={cn("size-5", meta.color)} />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
                                {connection.name}
                            </h3>

                            <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
                                <span className="text-muted-foreground">
                                    {meta.label}
                                </span>

                                {connection.hasCredentials && (
                                    <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <span className="text-muted-foreground">
                                            Credentials saved
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>

                {/* Connection information */}
                <CardContent className="space-y-1 px-3.5 pb-3">
                    {/* Endpoint */}
                    <div className="flex min-w-0 items-center gap-2">
                        <span
                            className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-foreground"
                            title={endpoint.value}
                        >
                            {endpoint.value}
                        </span>

                        <span className="
                            shrink-0 rounded border border-border
                            bg-background/60 px-1.5 py-0.5
                            text-[9px] font-medium text-muted-foreground
                        ">
                            {endpoint.label}
                        </span>
                    </div>

                    {/* Database */}
                    <div className="flex min-w-0 items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                            Database:
                        </span>

                        <span
                            className="min-w-0 truncate text-[10px] font-medium text-foreground"
                            title={database || "No default database"}
                        >
                            {database || "Not selected"}
                        </span>
                    </div>
                </CardContent>

                {/* Footer */}
                <CardFooter
                    className="
                        flex items-center justify-between
                        border-t border-border/70
                        px-3.5 py-2.5
                        text-[10px] text-muted-foreground
                    "
                >
                    <span>
                        Last opened{" "}
                        <span className="font-medium text-foreground">
                            {formatRelativeTime(connection.lastOpenedAt)}
                        </span>
                    </span>

                    <ArrowRight
                        className="
                            size-3.5 shrink-0
                            text-muted-foreground
                            transition-all duration-200
                            group-hover:translate-x-0.5
                            group-hover:text-primary
                        "
                    />
                </CardFooter>
            </Link>
        </Card>
    )
}