import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { router } from './router.tsx'
import { RouterProvider } from 'react-router'
import AppProvider from './providers.tsx'
import { DesktopOnlyGate } from './components/layout/DesktopOnlyGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <DesktopOnlyGate>
        <RouterProvider router={router} />
      </DesktopOnlyGate>
    </AppProvider>
  </StrictMode>,
)
