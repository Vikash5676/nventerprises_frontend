import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useShop } from "@/context/ShopContext";
import { LayoutDashboard, ClipboardList, Package, Receipt, ShoppingCart, Users, CircleUser as UserCircle, Wallet, Settings as SettingsIcon, LogOut, Wrench, Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard", end: true },
  { to: "/jobcards", label: "Job Cards", icon: ClipboardList, testid: "nav-jobcards" },
  { to: "/inventory", label: "Inventory", icon: Package, testid: "nav-inventory" },
  { to: "/billing", label: "Billing Counter", icon: Receipt, testid: "nav-billing" },
  { to: "/customers", label: "Customers", icon: UserCircle, testid: "nav-customers" },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart, testid: "nav-purchases" },
  { to: "/staff", label: "Staff / Payroll", icon: Users, testid: "nav-staff" },
  { to: "/expenses", label: "Expenses & GST", icon: Wallet, testid: "nav-expenses" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { shop } = useShop();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className="px-4 sm:px-5 py-4 sm:py-5 border-b border-slate-300 flex items-center gap-3">
        {shop.logo_base64 ? (
          <img
            src={shop.logo_base64}
            alt="logo"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain border border-slate-200 rounded-sm bg-white"
            data-testid="sidebar-logo"
          />
        ) : (
          <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center rounded-sm">
            <Wrench className="w-4 h-4" strokeWidth={2.5} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            className="font-display font-black text-sm sm:text-base tracking-tight uppercase leading-tight truncate"
            data-testid="sidebar-shop-name"
          >
            {shop.name}
          </div>
          <div className="text-[10px] font-mono-tab uppercase tracking-widest text-slate-500 mt-0.5 truncate">
            {shop.tagline || "Two-Wheeler Repair"}
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-500 hover:text-slate-900 p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, testid, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm font-semibold border-l-2 transition-colors ${
                isActive
                  ? "bg-slate-100 border-slate-900 text-slate-900"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2.25} />
            <span className="uppercase tracking-wide text-[12px] sm:text-[13px]">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-300">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono-tab mb-1">
          Signed in as
        </div>
        <div className="text-sm font-semibold text-slate-900 truncate">
          {user?.name || user?.email}
        </div>
        <button
          data-testid="logout-btn"
          onClick={async () => {
            await logout();
            nav("/login");
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 border border-slate-900 text-slate-900 py-2 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className="no-print hidden lg:flex w-64 shrink-0 border-r border-slate-300 bg-white flex-col fixed lg:relative inset-y-0 left-0 z-30"
        data-testid="sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white flex flex-col shadow-xl"
            data-testid="sidebar"
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 lg:ml-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-300 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Menu className="w-5 h-5" />
            <span className="font-display font-bold text-sm uppercase tracking-tight">
              {shop.name}
            </span>
          </button>
          <div className="flex items-center gap-2">
            {shop.logo_base64 ? (
              <img src={shop.logo_base64} alt="logo" className="w-7 h-7 object-contain" />
            ) : (
              <div className="w-7 h-7 bg-slate-900 text-white flex items-center justify-center rounded-sm">
                <Wrench className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
            )}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
