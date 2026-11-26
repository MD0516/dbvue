import { useEffect, useState, type ReactNode } from "react"
import { Monitor } from "lucide-react"

const DESKTOP_QUERY = "(min-width: 1024px)"

interface DesktopOnlyGateProps {
    children: ReactNode
}

export function DesktopOnlyGate({
    children,
}: DesktopOnlyGateProps) {
    const [isDesktop, setIsDesktop] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia(DESKTOP_QUERY).matches,
    )

    useEffect(() => {
        const mediaQuery = window.matchMedia(DESKTOP_QUERY)

        const handleChange = (event: MediaQueryListEvent) => {
            setIsDesktop(event.matches)
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsDesktop(mediaQuery.matches)
        mediaQuery.addEventListener("change", handleChange)

        return () => {
            mediaQuery.removeEventListener("change", handleChange)
        }
    }, [])

    if (!isDesktop) {
        return (
            <main className="
                flex min-h-dvh items-center justify-center
                bg-background px-6 py-12 text-foreground
            ">
                <div className="flex w-full max-w-sm flex-col items-center text-center">
                    <div className="
                        mb-6 flex size-16 items-center justify-center
                        rounded-2xl border border-border bg-muted
                    ">
                        <Monitor className="size-8 text-muted-foreground" />
                    </div>

                    <h1 className="text-xl font-semibold tracking-tight">
                        Desktop required
                    </h1>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        dbvue is designed for larger screens. The database
                        explorer, query editor and data grid need more
                        workspace to function comfortably.
                    </p>

                    <p className="mt-5 text-xs text-muted-foreground">
                        Please use a desktop browser or resize your
                        browser window to continue.
                    </p>
                </div>
            </main>
        )
    }

    return <>{children}</>
}