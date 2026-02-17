import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider as UI5ThemeProvider } from '@ui5/webcomponents-react'
import '@ui5/webcomponents-react/dist/Assets.js'
import { ThemeProvider } from './context/ThemeContext'
import './ui5'; // Import UI5 Web Components registry
import App from './App.tsx'
import './index.css'
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js";

// Enforce Horizon Theme as per AGENT_REQUIRED_READING.md
setTheme("sap_horizon");

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <UI5ThemeProvider>
        <App />
      </UI5ThemeProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
