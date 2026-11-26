import { Link } from "react-router"
import { DbvueLogoWithText } from "../brand"
import ThemeToggler from "../brand/ThemeToggler"
import { BookOpen, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { iconButtonVariants } from "../ui/button"

const Navbar = () => {
    return (
        <header className="absolute inset-x-0 top-0 z-50 h-14 border-b border-border bg-sidebar/80 backdrop-blur">
            <nav className="flex h-14 items-center justify-between gap-4 px-20">
                <Link to='/'>
                    <DbvueLogoWithText size={30} />
                </Link>
                <div>
                    <Link to='/docs' className={cn(iconButtonVariants({ size: 'lg' }))}>
                        <BookOpen className="size-4.5" />
                    </Link>
                    <ThemeToggler />
                    <Link to='/settings' className={cn(iconButtonVariants({ size: 'lg' }))}>
                        <Settings className="size-4.5" />
                    </Link>
                </div>
            </nav>
        </header>
    )
}

export default Navbar