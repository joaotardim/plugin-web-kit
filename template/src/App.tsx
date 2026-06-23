import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard, PermissionsProvider, Protected } from './auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Telas from './pages/Telas'
import Grupos from './pages/Grupos'
import Forbidden from './pages/Forbidden'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <PermissionsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"      element={<Login />} />
          <Route path="/"           element={<Protected><Home /></Protected>} />
          <Route path="/usuarios"   element={<Protected><Usuarios /></Protected>} />
          <Route path="/telas"      element={<Protected><Telas /></Protected>} />
          <Route path="/grupos"     element={<Protected><Grupos /></Protected>} />
          <Route path="/sem-acesso" element={<AuthGuard><Forbidden /></AuthGuard>} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </PermissionsProvider>
  )
}
