import { Route, Routes } from "react-router-dom"
import { Suspense, lazy } from "react"
import { Toaster } from "./components/ui/toaster"
import { ThemeProvider } from "./components/ThemeProvider"
import { MainLayout } from "./components/layouts/MainLayout"
import { useTranslation } from "react-i18next"

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"))
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage").then(module => ({ default: module.SubscriptionsPage })))
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(module => ({ default: module.SettingsPage })))
const ExpenseReportsPage = lazy(() => import("./pages/ExpenseReportsPage").then(module => ({ default: module.ExpenseReportsPage })))


function App() {
  const { t } = useTranslation()
  
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <MainLayout>
        <Suspense fallback={<div className="flex items-center justify-center h-64">{t('loading')}</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/expense-reports" element={<ExpenseReportsPage />} />

            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </MainLayout>
      <Toaster />
    </ThemeProvider>
  )
}

export default App