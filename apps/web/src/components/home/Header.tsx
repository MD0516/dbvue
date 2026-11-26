import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type StatusTone = "success" | "warning" | "destructive"

const toneDot: Record<StatusTone, string> = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
}

const StatusChip = ({
    tone,
    count,
    label,
}: {
    tone: StatusTone
    count: number
    label: string
}) => (
    <Badge variant="outline" className="gap-1.5 border-border bg-card text-muted-foreground">
        <span className={`size-1.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
        <span className="font-semibold tabular-nums text-foreground">{count}</span>
        <span>{label}</span>
    </Badge>
)

interface Props {
    onCreateConnection: () => void
}

const Header = ({ onCreateConnection }: Props) => {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"

    return (
        <div className="flex flex-col gap-5 px-4 py-7 sm:px-8 lg:px-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Good {greeting}
                    </p>
                    <h1 className="pt-1 text-2xl font-semibold tracking-tight text-foreground">
                        Your connections
                    </h1>
                    <p className="pt-1 text-sm text-muted-foreground">
                        Manage and access all your databases from one workspace.
                    </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 self-start lg:items-end lg:self-auto">
                    <div
                        className="flex flex-wrap items-center gap-2"
                        role="status"
                        aria-label="Connection status"
                    >
                        <StatusChip tone="success" count={3} label="Connected" />
                        <StatusChip tone="warning" count={1} label="Idle" />
                        <StatusChip tone="destructive" count={1} label="Error" />
                    </div>
                    <Button size='lg' onClick={onCreateConnection}>
                        <Plus className="size-4" />
                        New connection
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default Header