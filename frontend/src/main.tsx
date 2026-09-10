import React from 'react'
import ReactDOM from 'react-dom/client'
import { applySkin } from '@shehandon/vcs-ui'
import '@shehandon/vcs-ui/style.css'
import App from './App'
import './styles/global.css'

// #9a7b3b is the site's gold accent. Radius is forced to 0 via
// --radius-base in global.css (vcs-ui's own "sharp" preset isn't fully
// square), so it isn't set here.
applySkin({ skin: 'gilded', mode: 'light', accent: '#9a7b3b' })
// vcs-ui's SkinName type is stale (missing "ledger"/"sage", which do ship
// real CSS) — set the attribute directly rather than fight the type with `as`.
document.documentElement.setAttribute('data-skin', 'gilded')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
