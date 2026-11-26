import Navbar from "@/components/home/Navbar"
import Header from "@/components/home/Header"
import Connections from "@/components/home/Connections"
import Footer from "@/components/home/Footer"
import { useState } from "react"
import type { ConnectionDto } from "@dbvue/shared"
import { ConnectionDialog } from "@/components/home/connections/dialog"
import type { ConnectionDialogMode } from "@/components/home/connections/dialog/ConnectionDialog"

const Home = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] =
        useState<ConnectionDialogMode>("create")

    const [selectedConnection, setSelectedConnection] =
        useState<ConnectionDto | undefined>()

    function openCreateDialog() {
        setSelectedConnection(undefined)
        setDialogMode("create")
        setDialogOpen(true)
    }

    function openEditDialog(connection: ConnectionDto) {
        setSelectedConnection(connection)
        setDialogMode("edit")
        setDialogOpen(true)
    }

    function handleDialogOpenChange(open: boolean) {
        setDialogOpen(open)

        if (!open) {
            setSelectedConnection(undefined)
        }
    }
    return (
        <main className="relative flex h-dvh flex-col overflow-hidden">
            <Navbar />
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="pt-14 pb-10">
                    <Header
                        onCreateConnection={openCreateDialog}
                    />
                    <Connections
                        onCreateConnection={openCreateDialog}
                        onEditConnection={openEditDialog}
                    />
                </div>
            </div>
            <Footer />

            <ConnectionDialog
                open={dialogOpen}
                onOpenChange={handleDialogOpenChange}
                mode={dialogMode}
                connection={selectedConnection}
            />
        </main>
    )
}

export default Home