import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { RequireOnboarding } from './components/layout/RequireOnboarding'
import { AppDataProvider } from './context/AppDataContext'
import { AuthProvider } from './context/AuthContext'
import { AddCommitment } from './routes/AddCommitment'
import { Balancer } from './routes/Balancer'
import { CheckIn } from './routes/CheckIn'
import { ForgotPassword } from './routes/ForgotPassword'
import { Home } from './routes/Home'
import { ImportSchedule } from './routes/ImportSchedule'
import { Login } from './routes/Login'
import { Onboarding } from './routes/Onboarding'
import { ResetPassword } from './routes/ResetPassword'
import { Schedule } from './routes/Schedule'
import { Settings } from './routes/Settings'
import { Trends } from './routes/Trends'

export function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<RequireOnboarding />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/import-schedule" element={<ImportSchedule />} />
                <Route path="/add" element={<AddCommitment />} />
                <Route path="/balancer" element={<Balancer />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppDataProvider>
    </AuthProvider>
  )
}
