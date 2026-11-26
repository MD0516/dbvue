import { useAppContext } from '@/context/app-context'
import { Moon, Sun } from 'lucide-react'
import {cn} from "@/lib/utils"
import { iconButtonVariants } from '../ui/button'

export function ThemeToggler() {
    const { theme, toggleTheme } = useAppContext()

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className={cn(iconButtonVariants({size: 'lg'}))}
        >
            {theme === 'light' ? (
                <Moon className="size-4.5" />
            ) : (
                <Sun className="size-4.5" />
            )}
        </button>
    )
}

export default ThemeToggler