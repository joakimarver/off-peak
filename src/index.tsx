import { createRoot } from 'react-dom/client'

import { Provider } from 'react-redux'
import { store } from './lib/store'

import * as Sentry from '@sentry/react'

import './index.css'

import App from './App'

Sentry.init({
  dsn: 'https://200ae0bf60bb4072839f935c5afc1920@o198594.ingest.sentry.io/4504493028605952',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // 0 to 1, higher sampling is more resource intensive
  tracesSampleRate: 0.5,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_RELEASE,
})

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
  <Provider store={store}>
    <App />
  </Provider>
)
