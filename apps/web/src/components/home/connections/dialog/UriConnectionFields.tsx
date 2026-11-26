import { useMemo } from "react"
import { useFormContext, useWatch } from "react-hook-form"

import {
    CheckCircle2,
    LockKeyhole,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    parseConnectionUri,
    type ConnectionDraft,
    type DatabaseEngine,
} from "@dbvue/shared"

import { URI_PLACEHOLDERS } from "./constants"
import type { ConnectionFormValues } from "./form-schema"

function getConnectionTarget(draft: ConnectionDraft): string {
    const address = draft.config.address

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
            return address.hostname
    }
}

export function UriConnectionFields({
    engine,
}: {
    engine: DatabaseEngine
}) {
    const {
        register,
        control,
        formState: { errors },
    } = useFormContext<ConnectionFormValues>()

    const uri = useWatch({
        control,
        name: "uri",
    })

    const result = useMemo(() => {
        if (!uri.trim()) return null

        return parseConnectionUri({
            engine,
            uri,
        })
    }, [engine, uri])

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label htmlFor="connection-uri">Connection URI</Label>

                <Input
                    id="connection-uri"
                    placeholder={URI_PLACEHOLDERS[engine]}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="h-11 font-mono text-xs"
                    aria-invalid={Boolean(errors.uri)}
                    {...register("uri")}
                />

                {errors.uri?.message && !result?.success && (
                    <p className="text-xs text-destructive">
                        {errors.uri.message}
                    </p>
                )}
            </div>

            {result?.success && (
                <div className="flex min-w-0 items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                    <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs font-medium text-foreground">
                            Connection details recognized
                        </p>

                        <p className="break-all font-mono text-xs text-muted-foreground">
                            {getConnectionTarget(result.draft)}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />

                <p>
                    Credentials are extracted separately from the URI.
                    Passwords are never included in the saved connection configuration.
                </p>
            </div>
        </div>
    )
}