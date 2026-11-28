import { MoreHorizontal, Pencil, Activity, Trash2 } from "lucide-react"
import { IconButton } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ConnectionActionsMenu({
    openEditDialog, openDeleteDialog, connect
}: {
    openEditDialog: () => void
    openDeleteDialog: () => void
    connect: () => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <IconButton variant="ghost" size="sm" className="text-muted-foreground bg-muted">
                    <MoreHorizontal />
                </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={openEditDialog}>
                    <Pencil className="mr-2 size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={connect}>
                    <Activity className="mr-2 size-4" />
                    Connect
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={openDeleteDialog}>
                    <Trash2 className="mr-2 size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}