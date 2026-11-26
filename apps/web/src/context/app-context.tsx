/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

const AppContext = createContext<ThemeContextValue | null>(null)

export function AppContextProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light'

        return localStorage.getItem('dbvue-theme') === 'dark'
            ? 'dark'
            : 'light'
    })

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        document.documentElement.style.colorScheme = theme
        localStorage.setItem('dbvue-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((current) => current === 'light' ? 'dark' : 'light')
    }

    return (
        <AppContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </AppContext.Provider>
    )
}

export function useAppContext() {
    const context = useContext(AppContext)

    if (!context) {
        throw new Error('useAppContext must be used within AppContextProvider')
    }

    return context
}