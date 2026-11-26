/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import {
    FormProvider,
    useForm,
    useWatch,
    type SubmitHandler,
} from "react-hook-form"

import { zodResolver } from "@hookform/resolvers/zod"

import {
    AlertCircle,
    Activity,
    Loader2,
} from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useCreateConnectionMutation, useUpdateConnectionMutation } from "@/api/queries/connections"


import { buildCreateConnectionRequest, buildUpdateConnectionRequest, getConnectionFormValues } from "./form-utils"

import { EngineSelector } from "./EngineSelector"
import {
    ConnectionModeToggle,
    type ConnectionInputMode,
} from "./ConnectionModeToggle"

import { HostConnectionFields } from "./HostConnectionFields"
import { UriConnectionFields } from "./UriConnectionFields"
import { AdvancedConfiguration } from "./AdvancedConfiguration"
import type { ConnectionDto } from "@dbvue/shared"
import { ConnectionFormSchema, type ConnectionFormValues } from "./form-schema"
import { DEFAULT_CONNECTION_FORM_VALUES } from "./constants"
import { getConnectionAddress } from "../connection-display"

export type ConnectionDialogMode = "create" | "edit"

interface ConnectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: ConnectionDialogMode
    connection?: ConnectionDto
}

export function ConnectionDialog({
    open,
    onOpenChange,
    mode,
    connection
}: ConnectionDialogProps) {
    const [buildError, setBuildError] = useState<string | null>(null)

    const createMutation = useCreateConnectionMutation()
    const updateMutation = useUpdateConnectionMutation()

    const isPending =
        createMutation.isPending || updateMutation.isPending

    const isEditMode = mode === "edit"

    const form = useForm<ConnectionFormValues>({
        resolver: zodResolver(ConnectionFormSchema),
        defaultValues: DEFAULT_CONNECTION_FORM_VALUES,
        mode: "onChange",
        reValidateMode: "onChange",
        shouldUnregister: false,
    })

    const {
        register,
        control,
        setValue,
        reset,
        clearErrors,
        handleSubmit,
        formState: { errors },
    } = form

    const engine = useWatch({
        control,
        name: "engine",
    })

    const inputMode = useWatch({
        control,
        name: "inputMode",
    })

    const addressEditable = useWatch({
        control,
        name: "addressEditable",
    })

    useEffect(() => {
        if (!open) return

        reset(getConnectionFormValues(
            isEditMode ? connection : undefined,
        ))

        setBuildError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        open,
        isEditMode,
        connection?.id,
        connection?.updatedAt,
        reset,
    ])

    function handleDialogChange(nextOpen: boolean) {
        if (!nextOpen) {
            reset(DEFAULT_CONNECTION_FORM_VALUES)
            setBuildError(null)
        }

        onOpenChange(nextOpen)
    }

    function handleInputModeChange(nextMode: ConnectionInputMode) {
        setValue("inputMode", nextMode, {
            shouldDirty: true,
            shouldValidate: true,
        })

        clearErrors()
        setBuildError(null)
    }

    const onSubmit: SubmitHandler<ConnectionFormValues> = (values) => {
        setBuildError(null)

        if (mode === "create") {
            const result = buildCreateConnectionRequest(values)

            if (!result.success) {
                setBuildError(result.message)
                return
            }

            createMutation.mutate(result.payload, {
                onSuccess: () => {
                    reset(DEFAULT_CONNECTION_FORM_VALUES)
                    onOpenChange(false)
                },
            })

            return
        }

        if (!connection) {
            setBuildError("No connection was selected for editing.")
            return
        }

        const result = buildUpdateConnectionRequest(
            values,
            connection,
        )

        if (!result.success) {
            setBuildError(result.message)
            return
        }

        // Use the exact variable shape exposed by your existing
        // useUpdateConnectionMutation hook.
        updateMutation.mutate(
            {
                id: connection.id,
                data: result.payload,
            },
            {
                onSuccess: () => {
                    reset(DEFAULT_CONNECTION_FORM_VALUES)
                    onOpenChange(false)
                },
            },
        )
    }

    return (
        <FormProvider {...form}>
            <Dialog
                open={open}
                onOpenChange={handleDialogChange}
            >
                <DialogContent
                    className="flex flex-col gap-0 overflow-hidden p-0 w-[calc(100%-1rem)] max-w-190 sm:w-full sm:max-w-190 max-h-[90dvh]"
                >
                    <form
                        noValidate
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        {/* Header */}
                        <DialogHeader className="shrink-0 border-b border-border px-4 py-5 text-left sm:px-6">
                            <DialogTitle>
                                {isEditMode ? "Edit connection" : "New connection"}
                            </DialogTitle>

                            <DialogDescription>
                                {isEditMode
                                    ? "Update your saved database connection settings."
                                    : "Connect to a database and save it to your workspace."}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Form body */}
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                            {/* Engine */}
                            <section className="space-y-3">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">
                                        Database engine
                                    </h3>

                                    <p className="text-xs text-muted-foreground">
                                        Select the database you want to connect to.
                                    </p>
                                </div>

                                <EngineSelector disabled={isEditMode} />
                            </section>

                            {/* Connection details */}
                            <section className="space-y-4">
                                <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold">
                                            Connection details
                                        </h3>

                                        <p className="text-xs text-muted-foreground">
                                            Enter your database connection information.
                                        </p>
                                    </div>

                                    {!isEditMode && <ConnectionModeToggle
                                        value={inputMode}
                                        onChange={handleInputModeChange}
                                    />}
                                </div>

                                {/* Connection name */}
                                <div className="space-y-2">
                                    <Label htmlFor="connection-name">
                                        Connection name
                                    </Label>

                                    <Input
                                        id="connection-name"
                                        placeholder="e.g. Production database"
                                        maxLength={100}
                                        autoComplete="off"
                                        className="h-10"
                                        aria-invalid={Boolean(errors.name)}
                                        {...register("name")}
                                    />

                                    {errors.name?.message && (
                                        <p className="text-xs text-destructive">
                                            {errors.name.message}
                                        </p>
                                    )}
                                </div>

                                {inputMode === "uri" && !isEditMode ? (
                                    <UriConnectionFields engine={engine} />
                                ) : (
                                    <HostConnectionFields
                                        engine={engine}
                                        addressEditable={addressEditable}
                                        addressDisplay={
                                            connection ? getConnectionAddress(connection) : ""
                                        }
                                        isEditMode={isEditMode}
                                        hasCredentials={connection?.hasCredentials ?? false}
                                    />
                                )}

                            </section>

                            {/* Advanced settings */}
                            {inputMode === "host" ? (
                                <AdvancedConfiguration engine={engine} />
                            ) : (
                                <div className="rounded-lg border border-border bg-muted/30 p-3">
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        TLS, authentication and driver options are
                                        read from your connection URI. dbvue will
                                        preserve the parsed configuration.
                                    </p>
                                </div>
                            )}

                            {/* Payload validation error */}
                            {buildError && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
                                >
                                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                    <span>{buildError}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <DialogFooter
                            className="mx-0 mb-0 mt-0 w-full shrink-0 flex-col gap-3 rounded-none border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="default"
                                disabled
                                title="Connection testing is not available yet."
                                className="cursor-not-allowed"
                            >
                                <Activity className="mr-2 size-4" />
                                Test connection
                            </Button>

                            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size='lg'
                                    onClick={() => handleDialogChange(false)}
                                    className="w-full cursor-pointer"
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={isPending || (isEditMode && !connection)}
                                    size="lg"
                                    className="w-full cursor-pointer"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            {isEditMode ? "Saving changes..." : "Saving..."}
                                        </>
                                    ) : (
                                        isEditMode ? "Save changes" : "Save connection"
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </FormProvider>
    )
}