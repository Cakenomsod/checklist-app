import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App/App.jsx'
import { registerServiceWorker } from './App/function/notificationService'

if ('serviceWorker' in navigator) {
  registerServiceWorker().catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)