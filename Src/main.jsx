import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

const basename = (() => {
  try {
    const path = window.location.pathname || '/'
    const first = path.split('/').filter(Boolean)[0]
    return first ? `/${first}` : '/'
  } catch {
    return '/'
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
)