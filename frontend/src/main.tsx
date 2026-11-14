import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { AuthProvider } from '@/features/auth/auth-provider'
import { AppProviders } from '@/providers/app-providers'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppProviders>
  </StrictMode>,
)
