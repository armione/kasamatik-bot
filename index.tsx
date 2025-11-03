import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './src/App.tsx'
import './src/index.css'
import 'flatpickr/dist/themes/dark.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
