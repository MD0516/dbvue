import { useState } from "react"
import { Controller, useFormContext } from "react-hook-form"

import {
    ChevronDown,
    SlidersHorizontal,
} from "lucide-react"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { cn } from "@/lib/utils"

import type { DatabaseEngine } from "@dbvue/shared"
import type { ConnectionFormValues } from "./form-schema"

export function AdvancedConfiguration({
    engine,
}: {
    engine: DatabaseEngine
}) {
    const [open, setOpen] = useState(false)

    const {
        control,
        register,
        formState: { errors },
    } = useFormContext<ConnectionFormValues>()

    const timeoutDescriptions: Record<DatabaseEngine, string> = {
        mysql: "MySQL connection timeout.",
        postgres: "PostgreSQL pool connection timeout.",
        mongodb: "MongoDB connection timeout.",
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className="border-t border-border pt-4">
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg py-1 text-left text-muted-foreground hover:text-foreground transition-all duration-200"
                        aria-expanded={open}
                    >
                        <span className="flex items-center gap-2">
                            <SlidersHorizontal className="size-4" />

                            <span className="text-sm font-semibold">
                                Advanced configuration
                            </span>
                        </span>

                        <ChevronDown
                            className={cn(
                                "size-4 transition-transform duration-200",
                                open && "rotate-180",
                            )}
                        />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-4">
                    <div className="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2">
                        <div className="min-w-0 space-y-2">
                            <Label htmlFor="connection-tls">
                                SSL / TLS mode
                            </Label>

                            <Controller
                                name="tlsMode"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger
                                            id="connection-tls"
                                            className="h-10 w-full cursor-pointer"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="disabled" className="cursor-pointer">
                                                Disabled
                                            </SelectItem>

                                            <SelectItem value="required" className="cursor-pointer">
                                                Required
                                            </SelectItem>

                                            <SelectItem value="verify-ca" className="cursor-pointer">
                                                Verify CA
                                            </SelectItem>

                                            <SelectItem value="verify-full" className="cursor-pointer">
                                                Verify full
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="min-w-0 space-y-2">
                            <Label htmlFor="connection-timeout">
                                Connection timeout
                            </Label>

                            <div className="relative">
                                <Input
                                    id="connection-timeout"
                                    type="number"
                                    min={0}
                                    max={600000}
                                    step={1}
                                    className="h-10 pr-12"
                                    aria-invalid={Boolean(errors.connectionTimeoutMs)}
                                    {...register("connectionTimeoutMs")}
                                />

                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    ms
                                </span>
                            </div>

                            {errors.connectionTimeoutMs?.message ? (
                                <p className="text-xs text-destructive">
                                    {errors.connectionTimeoutMs.message}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {timeoutDescriptions[engine]}
                                </p>
                            )}
                        </div>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        Additional engine-specific options can be configured
                        through the connection URI. Parsed URI settings are preserved.
                    </p>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}