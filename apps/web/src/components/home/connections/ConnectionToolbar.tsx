import { Search, LayoutGrid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { IconButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConnectionDto } from "@dbvue/shared"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type EngineFilter = "all" | ConnectionDto["config"]["engine"]

const ENGINES: { label: string; value: EngineFilter }[] = [
    { label: "All", value: "all" },
    { label: "MySQL", value: "mysql" },
    { label: "PostgreSQL", value: "postgres" },
    { label: "MongoDB", value: "mongodb" },
]

export type ConnectionSort = "lastOpened" | "createdAt" | "name"

const SORT_OPTIONS: { value: ConnectionSort; label: string }[] = [
    { value: "lastOpened", label: "Last opened" },
    { value: "createdAt", label: "Date created" },
    { value: "name", label: "Name (A-Z)" },
]


type ConnectionsToolbarProps = {
    search: string
    onSearchChange: (value: string) => void
    activeEngine: EngineFilter
    onEngineChange: (value: EngineFilter) => void
    view: "grid" | "list"
    onViewChange: (view: "grid" | "list") => void
    sortBy: ConnectionSort
    onSortChange: (sort: ConnectionSort) => void
}

export function ConnectionsToolbar({
    search, onSearchChange, activeEngine, onEngineChange, view, onViewChange, sortBy, onSortChange
}: ConnectionsToolbarProps) {
    return (
        <div className="flex flex-row items-center justify-between gap-4">
            {/* Search - takes up remaining space */}
            <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search connections..."
                    className="pl-8 pr-12"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Right side controls - natural width */}
            <div className="flex shrink-0 items-center gap-3">
                {/* Engine Filters */}
                <div className="flex items-center gap-1 rounded-md bg-muted p-1 border border-border">
                    {ENGINES.map((engine) => (
                        <button
                            key={engine.value}
                            onClick={() => onEngineChange(engine.value)}
                            className={cn(
                                "rounded-sm px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                                activeEngine === engine.value
                                    ? "bg-primary/80 text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {engine.label}
                        </button>
                    ))}
                </div>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(v) => onSortChange(v as ConnectionSort)}>
                    <SelectTrigger className="cursor-pointer">
                        <span className="text-muted-foreground">Sort: </span>
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent position="popper" align="end">
                        {SORT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="cursor-pointer">
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex gap-1 items-center rounded-md border border-border bg-background p-0.5 px-1">
                    <IconButton
                        variant={view === 'grid' ? 'primary' : 'ghost'}
                        size="sm"
                        shape="default"
                        onClick={() => onViewChange('grid')}
                        aria-label="Grid view"
                    >
                        <LayoutGrid />
                    </IconButton>
                    <IconButton
                        variant={view === 'list' ? 'primary' : 'ghost'}
                        size="sm"
                        shape="default"
                        onClick={() => onViewChange('list')}
                        aria-label="List view"
                    >
                        <List />
                    </IconButton>
                </div>
            </div>
        </div>
    )
}