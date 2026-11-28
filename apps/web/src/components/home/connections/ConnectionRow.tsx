import {
    ShieldCheck,
} from "lucide-react"

import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"

import type { ConnectionDto } from "@dbvue/shared"

import { ConnectionActionsMenu } from "./ConnectionActionsMenu"

import {
    ENGINE_META,
    formatRelativeTime,
    getConnectionAddress,
    getConnectionWorkspacePath,
} from "./connection-display"

import { cn } from "@/lib/utils"

export function ConnectionRow({
    connection,
    openEditDialog,
    openDeleteDialog,
    connect
}: {
    connection: ConnectionDto
    openEditDialog: () => void
    openDeleteDialog: () => void
    connect: () => void
}) {
    const engine = connection.config.engine
    const meta = ENGINE_META[engine]
    const Icon = meta.icon

    const address = getConnectionAddress(connection)
    const database = connection.config.database

    return (
        <div
            className="
                group flex min-w-0 items-center gap-3
                border border-border bg-card rounded-xl
                px-3 py-3
                transition-colors hover:bg-muted dark:hover:bg-muted/40
                sm:px-4
            "
        >
            {/* Main clickable content */}
            <Link
                to={getConnectionWorkspacePath(connection)}
                aria-label={`Open ${connection.name} workspace`}
                className="
                    flex min-w-0 flex-1 items-center gap-3
                    rounded-md outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                "
            >
                {/* Engine icon */}
                <div
                    className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                        meta.background,
                    )}
                >
                    <Icon className={cn("size-4.5", meta.color)} />
                </div>

                {/* Name and connection information */}
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {connection.name}
                        </span>

                        <span className="text-xs text-muted-foreground">
                            {meta.label}
                        </span>

                        {connection.config.tls && (
                            <Badge
                                variant="outline"
                                className="h-4 gap-1 px-1 text-[9px]"
                            >
                                <ShieldCheck className="size-2.5" />
                                TLS
                            </Badge>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span
                            className="max-w-full truncate font-mono"
                            title={address}
                        >
                            {address}
                        </span>

                        {database && (
                            <>
                                <span className="shrink-0 opacity-80">·</span>

                                <span className="flex min-w-0 items-center gap-1">
                                    <span className="shrink-0">db:</span>
                                    <span className="truncate font-mono">
                                        {database}
                                    </span>
                                </span>
                            </>
                        )}

                        {connection.hasCredentials && (
                            <>
                                <span className="shrink-0 opacity-80">·</span>

                                <span className="text-muted-foreground truncate font-mono">
                                    Credentials saved
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Last opened */}
                <span className="min-w-12 text-right text-[10px] text-muted-foreground">
                    {formatRelativeTime(connection.lastOpenedAt)}
                </span>
            </Link>

            {/* Actions menu is not inside the link */}
            <div className="shrink-0">
                <ConnectionActionsMenu
                    openEditDialog={openEditDialog}
                    openDeleteDialog={openDeleteDialog}
                    connect={connect}
                />
            </div>
        </div>
    )
}