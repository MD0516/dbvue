import { Github } from "../icons/github-icon"
import { cn } from '@/lib/utils'
import { buttonVariants } from "../ui/button"
import { version } from "../../../../../package.json"

const Footer = () => {
    return (
        <footer className="absolute inset-x-0 bottom-0 z-50 h-10 border-t border-border bg-sidebar/80 backdrop-blur px-20 flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <p>
                dbvue · unified view of all your databases
            </p>
            <a
                href="https://github.com/MD0516/dbvue"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    buttonVariants({ variant: 'link', size: "sm" }),
                    'text-muted-foreground'
                )}
            >
                <Github size={14} />
                v{version}
            </a>
        </footer>
    )
}

export default Footer