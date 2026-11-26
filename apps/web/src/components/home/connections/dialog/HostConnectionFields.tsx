
import { useState } from "react"
import { Eye, EyeOff, LockKeyhole } from "lucide-react"
import { useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { DatabaseEngine } from "@dbvue/shared"
import type { ConnectionFormValues } from "./form-schema"

function FieldError({ message }: { message?: string }) {
    if (!message) return null

    return (
        <p className="text-xs text-destructive">
            {message}
        </p>
    )
}

interface HostConnectionFieldsProps {
    engine: DatabaseEngine
    addressEditable: boolean
    addressDisplay: string
    isEditMode: boolean
    hasCredentials: boolean
}

export function HostConnectionFields({
    engine,
    addressEditable,
    addressDisplay,
    isEditMode,
    hasCredentials,
}: HostConnectionFieldsProps) {
    const {
        register,
        formState: { errors },
    } = useFormContext<ConnectionFormValues>()

    const [showPassword, setShowPassword] = useState(false)

    const isMongo = engine === "mongodb"

    return (
        <div className="space-y-4">

            {/* Host and Port / Read-only address */}
            {addressEditable ? (
                <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">

                    {/* Host */}
                    <div className="min-w-0 space-y-2">
                        <Label htmlFor="connection-host">
                            Hostname
                        </Label>

                        <Input
                            id="connection-host"
                            placeholder="localhost"
                            autoComplete="off"
                            maxLength={253}
                            aria-invalid={Boolean(errors.host)}
                            className="h-10"
                            {...register("host")}
                        />

                        <FieldError message={errors.host?.message} />
                    </div>

                    {/* Port */}
                    <div className="space-y-2">
                        <Label htmlFor="connection-port">
                            Port
                        </Label>

                        <Input
                            id="connection-port"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={65535}
                            step={1}
                            className="h-10"
                            aria-invalid={Boolean(errors.port)}
                            {...register("port")}
                        />

                        <FieldError message={errors.port?.message} />
                    </div>
                </div>
            ) : (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <Label>Connection address</Label>

                    <div className="flex min-w-0 items-start gap-2">
                        <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />

                        <p className="min-w-0 break-all font-mono text-xs text-foreground">
                            {addressDisplay}
                        </p>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                        This address type is preserved. Editing this address
                        is not yet supported.
                    </p>
                </div>
            )}

            {/* Database name - always editable */}
            <div className="space-y-2">
                <Label htmlFor="connection-database">
                    Database name

                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        Optional
                    </span>
                </Label>

                <Input
                    id="connection-database"
                    placeholder="e.g. customer_data"
                    autoComplete="off"
                    maxLength={256}
                    className="h-10"
                    aria-invalid={Boolean(errors.database)}
                    {...register("database")}
                />

                <FieldError message={errors.database?.message} />
            </div>

            {/* Username and Password - always editable */}
            <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">

                {/* Username */}
                <div className="min-w-0 space-y-2">
                    <Label htmlFor="connection-username">
                        Username

                        {isMongo && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                Optional
                            </span>
                        )}
                    </Label>

                    <Input
                        id="connection-username"
                        placeholder={isMongo ? "Optional" : "root"}
                        autoComplete="off"
                        maxLength={256}
                        className="h-10"
                        aria-invalid={Boolean(errors.username)}
                        {...register("username")}
                    />

                    <FieldError message={errors.username?.message} />
                </div>

                {/* Password */}
                <div className="min-w-0 space-y-2">
                    <Label htmlFor="connection-password">
                        Password
                    </Label>

                    <div className="relative">
                        <Input
                            id="connection-password"
                            type={showPassword ? "text" : "password"}
                            placeholder={
                                isEditMode && hasCredentials
                                    ? "Leave blank to keep saved credentials"
                                    : "Enter password"
                            }
                            autoComplete="new-password"
                            className="h-10 pr-10"
                            aria-invalid={Boolean(errors.password)}
                            {...register("password")}
                        />

                        <button
                            type="button"
                            onClick={() =>
                                setShowPassword((current) => !current)
                            }
                            aria-label={
                                showPassword
                                    ? "Hide password"
                                    : "Show password"
                            }
                            className="
                                absolute right-0 top-0
                                flex size-10 cursor-pointer
                                items-center justify-center
                                text-muted-foreground
                                transition-colors
                                hover:text-foreground
                            "
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" />
                            ) : (
                                <Eye className="size-4" />
                            )}
                        </button>
                    </div>

                    {/* Remove existing credentials */}
                    {isEditMode && hasCredentials && (
                        <label className="
                            flex cursor-pointer items-center gap-2
                            text-xs text-muted-foreground
                            transition-colors hover:text-foreground
                        ">
                            <input
                                type="checkbox"
                                {...register("removeSavedCredentials")}
                                className="size-3.5 cursor-pointer accent-primary"
                            />

                            Remove saved credentials
                        </label>
                    )}

                    <FieldError message={errors.password?.message} />
                </div>
            </div>
        </div>
    )
}
