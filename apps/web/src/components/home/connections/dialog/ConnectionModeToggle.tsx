import { Link2, PanelsTopLeft } from "lucide-react"

import { cn } from "@/lib/utils"

export type ConnectionInputMode  = "host" | "uri"

interface ConnectionModeToggleProps {
    value: ConnectionInputMode 
    onChange: (value: ConnectionInputMode ) => void
}

export function ConnectionModeToggle({
    value,
    onChange,
}: ConnectionModeToggleProps) {
    return (
        <div
            role="group"
            aria-label="Connection mode"
            className="flex w-full items-center rounded-lg border border-border bg-muted/60 p-1 sm:w-auto"
        >
            <button
                type="button"
                aria-pressed={value === "host"}
                onClick={() => onChange("host")}
                className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none",
                    value === "host"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                <PanelsTopLeft className="size-3.5" />
                Host / Port
            </button>

            <button
                type="button"
                aria-pressed={value === "uri"}
                onClick={() => onChange("uri")}
                className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none",
                    value === "uri"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                <Link2 className="size-3.5" />
                Connection URI
            </button>
        </div>
    )
}