import { type ReactNode } from 'react'
import { AppContextProvider } from './context/app-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
})

const AppProvider = ({ children }: { children: ReactNode }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <AppContextProvider>
                {children}
            </AppContextProvider>
            <Toaster position='top-right' richColors />
            {
                import.meta.env.DEV &&
                <ReactQueryDevtools position='bottom' buttonPosition='bottom-left' />
            }
        </QueryClientProvider>
    )
}

export default AppProvider