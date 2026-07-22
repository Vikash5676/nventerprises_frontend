import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useShop } from "@/context/ShopContext";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, login } = useAuth();
  const { shop } = useShop();
  const [email, setEmail] = useState("owner@garage.in");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Signed in");
      navigate("/");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="flex items-center gap-3">
          {shop.logo_base64 ? (
            <img
              src={shop.logo_base64}
              alt="logo"
              className="w-12 h-12 object-contain bg-white p-1 rounded-sm"
            />
          ) : (
            <div className="w-10 h-10 border border-white/30 flex items-center justify-center">
              <Wrench className="w-5 h-5" strokeWidth={2.5} />
            </div>
          )}
          <div>
            <div className="font-display font-black text-lg tracking-tight uppercase" data-testid="login-shop-name">
              {shop.name}
            </div>
            <div className="text-xs text-slate-400 font-mono-tab">
              {shop.tagline || "Two-Wheeler Repair ERP"}
            </div>
          </div>
        </div>

        <div>
          <div className="font-mono-tab text-xs text-slate-400 uppercase mb-2">
            Built for the counter
          </div>
          <h1 className="font-display font-black text-5xl leading-none tracking-tight uppercase mb-6">
            Job cards.
            <br />
            Billing.
            <br />
            <span className="text-blue-400">GST. Done.</span>
          </h1>
          <p className="text-slate-300 max-w-md text-sm">
            Keyboard-first billing, live GST engine, and a print-ready 80mm
            thermal invoice — engineered for a busy Indian workshop.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
          {[
            ["09", "Modules"],
            ["₹ INR", "Live GST"],
            ["80mm", "Thermal print"],
          ].map(([a, b]) => (
            <div key={b}>
              <div className="font-display font-black text-2xl">{a}</div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-mono-tab">
                {b}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form
          onSubmit={submit}
          className="w-full max-w-md bg-white border border-slate-300 p-8 rounded-sm"
          data-testid="login-form"
        >
          <div className="lg:hidden flex items-center gap-2 mb-6">
            {shop.logo_base64 ? (
              <img src={shop.logo_base64} alt="logo" className="w-8 h-8 object-contain" />
            ) : (
              <Wrench className="w-6 h-6" />
            )}
            <div className="font-display font-black uppercase tracking-tight">
              {shop.name}
            </div>
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-mono-tab mb-1">
            Sign In
          </div>
          <h2 className="font-display font-black text-3xl text-slate-900 mb-8 uppercase tracking-tight">
            Owner Console
          </h2>

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Email
          </label>
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-sm px-3 py-2 mb-4 font-mono-tab focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            autoFocus
            required
          />

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Password
          </label>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-sm px-3 py-2 mb-6 font-mono-tab focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            required
          />

          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-display font-bold uppercase tracking-wider py-3 rounded-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Enter Shop"}
          </button>

          <div className="mt-6 text-xs text-slate-500 border-t border-slate-200 pt-4 font-mono-tab">
            Default → <span className="text-slate-900">owner@garage.in</span> /{" "}
            <span className="text-slate-900">admin123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
