import { Loader2, Trash2 } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteConnectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectionName: string
    onConfirm: () => void
    isDeleting?: boolean
}

export function DeleteConnectionDialog({
    open,
    onOpenChange,
    connectionName,
    onConfirm,
    isDeleting = false,
}: DeleteConnectionDialogProps) {
    return (
        <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && isDeleting) return
                onOpenChange(nextOpen)
            }}
        >
            <AlertDialogContent className="sm:max-w-105">
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <Trash2 className="size-5" />
                    </AlertDialogMedia>

                    <AlertDialogTitle>Delete connection?</AlertDialogTitle>

                    <AlertDialogDescription>
                        <span className="font-semibold text-foreground">
                            {connectionName}
                        </span>{" "}
                        will be permanently removed from dbvue, along with its
                        stored credentials. The database and its data will not be
                        affected.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={(event) => {
                            // Prevent Radix from auto-closing on click.
                            // The parent closes the dialog after the mutation resolves.
                            event.preventDefault()
                            onConfirm()
                        }}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 size-4" />
                                Delete connection
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}