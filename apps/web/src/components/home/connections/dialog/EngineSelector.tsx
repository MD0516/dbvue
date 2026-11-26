import type { LucideIcon } from "lucide-react"
import type { DatabaseEngine } from "@dbvue/shared"
import { useFormContext, useWatch } from "react-hook-form"

import { cn } from "@/lib/utils"

import { DEFAULT_PORTS } from "./constants"
import type { ConnectionFormValues } from "./form-schema"

import {
    Mongodb,
    Mysql,
    Postgres,
} from "@/components/icons/engine-icons"

interface EngineOption {
    id: DatabaseEngine
    label: string
    description: string
    icon: LucideIcon
    color: string
    background: string
    selected: string
}

const ENGINES: EngineOption[] = [
    {
        id: "mysql",
        label: "MySQL",
        description: "Relational",
        icon: Mysql,
        color: "text-engine-mysql",
        background: "bg-engine-mysql/10",
        selected: "border-engine-mysql/50 bg-engine-mysql/[0.06]",
    },
    {
        id: "postgres",
        label: "PostgreSQL",
        description: "Relational",
        icon: Postgres,
        color: "text-engine-postgres",
        background: "bg-engine-postgres/10",
        selected: "border-engine-postgres/50 bg-engine-postgres/[0.06]",
    },
    {
        id: "mongodb",
        label: "MongoDB",
        description: "Document",
        icon: Mongodb,
        color: "text-engine-mongodb",
        background: "bg-engine-mongodb/10",
        selected: "border-engine-mongodb/50 bg-engine-mongodb/[0.06]",
    },
]

interface EngineSelectorProps {
    disabled?: boolean
}

export function EngineSelector({
    disabled = false,
}: EngineSelectorProps) {
    const { control, setValue, clearErrors } =
        useFormContext<ConnectionFormValues>()

    const selectedEngine = useWatch({
        control,
        name: "engine",
    })

    function selectEngine(engine: DatabaseEngine) {
        if (engine === selectedEngine) return

        setValue("engine", engine, {
            shouldDirty: true,
            shouldValidate: true,
        })

        setValue("port", String(DEFAULT_PORTS[engine]), {
            shouldDirty: true,
            shouldValidate: true,
        })

        // Never reuse a URI parsed for another database engine.
        setValue("uri", "", {
            shouldDirty: true,
            shouldValidate: true,
        })

        clearErrors()
    }

    return (
        <div
            role="group"
            aria-label="Select database engine"
            className="grid grid-cols-3 gap-2.5"
        >
            {ENGINES.map((engine) => {
                const active = selectedEngine === engine.id
                const Icon = engine.icon

                return (
                    <button
                        key={engine.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectEngine(engine.id)}
                        disabled={disabled}
                        className={cn(
                            "group relative flex min-w-0 flex-col items-center gap-2.5 rounded-xl border p-3 text-center transition-all duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            active
                                ? engine.selected
                                : "border-border bg-card",
                            // Only apply hover and cursor if NOT disabled
                            !disabled && !active && "hover:border-muted-foreground/40 hover:bg-accent/40 cursor-pointer",
                            // Apply disabled styling if disabled
                            disabled && "cursor-not-allowed opacity-70",
                        )}
                    >
                        {/* Brand icon */}
                        <span
                            className={cn(
                                "flex size-10 items-center justify-center rounded-xl transition-transform duration-200",
                                engine.background,
                                active && !disabled && "scale-105",
                            )}
                        >
                            <Icon
                                className={cn("size-6", engine.color)}
                            />
                        </span>

                        {/* Engine information */}
                        <span className="flex min-w-0 flex-col items-center gap-0.5">
                            <span
                                className={cn(
                                    "max-w-full wrap-break-word text-[11px] font-semibold leading-tight sm:text-sm transition-colors duration-200",
                                    active
                                        ? "text-foreground"
                                        : "text-muted-foreground",
                                    // Only apply group-hover text color if NOT disabled
                                    !disabled && !active && "group-hover:text-foreground",
                                )}
                            >
                                {engine.label}
                            </span>

                            <span className="text-[10px] text-muted-foreground">
                                {engine.description}
                            </span>
                        </span>
                    </button>
                )
            })}
        </div>
    )
}