import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppBootstrap } from './components/AppBootstrap'
import { SettingsProvider } from './context/SettingsContext'
import { LibraryPage } from './pages/LibraryPage'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
  return (
    <SettingsProvider>
      <AppBootstrap>
        <HashRouter>
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/story/:storyId" element={<WorkspacePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AppBootstrap>
    </SettingsProvider>
  )
}
