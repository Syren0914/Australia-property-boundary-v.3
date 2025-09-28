import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/enhanced-ui.css'
import App from './App.tsx'

// Do not toggle global dark class; UI remains light. Map theme handled via state.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
