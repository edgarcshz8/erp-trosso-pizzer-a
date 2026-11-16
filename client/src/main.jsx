import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1A1A1A',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
        },
        success: {
          iconTheme: { primary: '#10B981', secondary: '#fff' }
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: '#fff' }
        }
      }}
    />
  </React.StrictMode>
)
