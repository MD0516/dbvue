import { useConnectionsQuery, useDeleteConnectionMutation } from "@/api/queries/connections"
import { useState, useMemo } from "react"
import { ConnectionsToolbar, type ConnectionSort, type EngineFilter } from "./connections/ConnectionToolbar"
import { ConnectionCard } from "./connections/ConnectionCard"
import { ConnectionRow } from "./connections/ConnectionRow"
import { Button } from "@/components/ui/button"
import { AlertCircle, DatabaseIcon, Plus, RefreshCw } from "lucide-react"
import type { ConnectionDto } from "@dbvue/shared"
import { DeleteConnectionDialog } from "./connections/dialog/DeleteConnectionDialog"

const ConnectionSkeleton = ({ view }: { view: 'grid' | 'list' }) => {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <div className="space-y-2 py-2">
              <div className="h-3 w-48 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
              <div className="size-4 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg border border-border overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-border bg-card p-4 last:border-0">
          <div className="flex items-center gap-4">
            <div className="size-8 animate-pulse rounded-md bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-12 animate-pulse rounded-md bg-muted" />
            <div className="size-8 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  onCreateConnection: () => void
  onEditConnection: (connection: ConnectionDto) => void
}

const Connections = ({ onCreateConnection, onEditConnection }: Props) => {
  const { data: connections = [], isLoading, isError, refetch } = useConnectionsQuery()
  const deleteMutation = useDeleteConnectionMutation()

  const [search, setSearch] = useState("")
  const [engine, setEngine] = useState<EngineFilter>("all")
  const [sortBy, setSortBy] = useState<ConnectionSort>("lastOpened")
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const [connectionToDelete, setConnectionToDelete] = useState<ConnectionDto | null>(null)

  const filteredConnections = useMemo(() => {
    const query = search.trim().toLowerCase()

    const result = connections.filter((connection) => {
      const matchesSearch =
        connection.name.toLowerCase().includes(query) ||
        connection.config.database?.toLowerCase().includes(query)

      const matchesEngine =
        engine === "all" || connection.config.engine === engine

      return matchesSearch && matchesEngine
    })

    return result.sort((a, b) => {
      switch (sortBy) {
        case "lastOpened":
          return (
            new Date(b.lastOpenedAt ?? 0).getTime() -
            new Date(a.lastOpenedAt ?? 0).getTime()
          )
        case "createdAt":
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          )
        case "name":
          return a.name.localeCompare(b.name)
      }
    })
  }, [connections, search, engine, sortBy])

  function openDeleteDialog(connection: ConnectionDto) {
    setConnectionToDelete(connection)
  }

  const handleDeleteConfirm = () => {
    if (!connectionToDelete) return

    deleteMutation.mutate(connectionToDelete.id, {
      onSuccess: () => {
        setConnectionToDelete(null)
      },
    })
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center sm:px-8 lg:px-20">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Failed to load connections</h3>
          <p className="text-sm text-muted-foreground">
            There was a problem connecting to the database.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-8 lg:px-20">
      <ConnectionsToolbar
        search={search}
        onSearchChange={setSearch}
        activeEngine={engine}
        onEngineChange={setEngine}
        view={view}
        onViewChange={setView}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {isLoading ? (
        <ConnectionSkeleton view={view} />
      ) : filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <DatabaseIcon className="size-6" />
          </div>
          <h3 className="text-sm font-semibold">
            {connections.length === 0 ? "No connections yet" : "No results found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {connections.length === 0
              ? "Create your first connection to get started."
              : "Try adjusting your search or filters."}
          </p>
          {connections.length === 0 && (
            <Button size="lg" onClick={onCreateConnection}>
              <Plus className="mr-2 size-4" />
              New connection
            </Button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              openEditDialog={() => onEditConnection(c)}
              openDeleteDialog={() => openDeleteDialog(c)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg overflow-hidden">
          {filteredConnections.map((c) => (
            <ConnectionRow
              key={c.id}
              connection={c}
              openEditDialog={() => onEditConnection(c)}
              openDeleteDialog={() => openDeleteDialog(c)}
            />
          ))}
        </div>
      )}

      <DeleteConnectionDialog
        open={Boolean(connectionToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setConnectionToDelete(null)
          }
        }}
        connectionName={connectionToDelete?.name ?? ""}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}

export default Connections