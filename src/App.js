import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ShopProvider } from "@/context/ShopContext";
import Login from "@/pages/Login";
import Layout from "@/components/app/Layout";
import Dashboard from "@/pages/Dashboard";
import JobCards from "@/pages/JobCards";
import Inventory from "@/pages/Inventory";
import Billing from "@/pages/Billing";
import Purchases from "@/pages/Purchases";
import Staff from "@/pages/Staff";
import Expenses from "@/pages/Expenses";
import Customers from "@/pages/Customers";
import Settings from "@/pages/Settings";
import MechanicApp from "@/pages/MechanicApp";
import { Toaster } from "@/components/ui/sonner";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-mono-tab">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/mechanic" element={<MechanicApp />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="jobcards" element={<JobCards />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="billing" element={<Billing />} />
        <Route path="customers" element={<Customers />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="staff" element={<Staff />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ShopProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </ShopProvider>
      </AuthProvider>
    </div>
  );
}
