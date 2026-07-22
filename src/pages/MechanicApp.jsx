import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Wrench, LogOut, CheckCircle2, Play, Flag } from "lucide-react";
import { toast } from "sonner";

const STATUS_FLOW = [
  { key: "checked_in", label: "Checked In", icon: Flag, next: "in_progress", nextLabel: "Start Work" },
  { key: "in_progress", label: "In Progress", icon: Play, next: "ready", nextLabel: "Mark Ready" },
  { key: "ready", label: "Ready", icon: CheckCircle2, next: null, nextLabel: null },
  { key: "invoiced", label: "Invoiced", icon: CheckCircle2, next: null, nextLabel: null },
];

export default function MechanicApp() {
  const [token, setToken] = useState(localStorage.getItem("mech_token") || "");
  const [pin, setPin] = useState("");
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/mechanic/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(data.me);
      setJobs(data.jobs);
    } catch (e) {
      // Invalid token → clear
      localStorage.removeItem("mech_token");
      setToken("");
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line
  }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/mechanic/login", { pin });
      localStorage.setItem("mech_token", data.token);
      setToken(data.token);
      toast.success(`Welcome, ${data.staff.name.split(" ")[0]}!`);
    } catch {
      toast.error("Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("mech_token");
    setToken("");
    setMe(null);
    setJobs([]);
    setPin("");
  };

  const advance = async (jc) => {
    const st = STATUS_FLOW.find((s) => s.key === jc.status);
    if (!st?.next) return;
    await api.post(
      `/mechanic/jobs/${jc.id}/status`,
      { status: st.next },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    toast.success(`Marked ${st.nextLabel}`);
    load();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 border border-white/30 flex items-center justify-center">
            <Wrench className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-black text-xl tracking-tight uppercase">
              Garage OS
            </div>
            <div className="text-xs font-mono-tab text-slate-400 uppercase tracking-widest">
              Mechanic App
            </div>
          </div>
        </div>
        <form onSubmit={login} className="w-full max-w-xs" data-testid="mech-login-form">
          <div className="text-[11px] uppercase font-bold tracking-widest text-slate-400 mb-2 text-center">
            Enter your 4-digit PIN
          </div>
          <input
            data-testid="mech-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength="4"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full text-center bg-white/10 border border-white/30 rounded-sm px-4 py-4 text-3xl font-mono-tab tracking-[0.5em] focus:outline-none focus:border-blue-400"
            placeholder="••••"
          />
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            data-testid="mech-login-btn"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 font-bold uppercase tracking-wider rounded-sm disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Enter Workshop"}
          </button>
        </form>
        <a href="/" className="mt-8 text-xs text-slate-400 underline">
          Owner login →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono-tab uppercase tracking-widest text-slate-400">
            My Jobs
          </div>
          <div className="font-display font-black text-lg uppercase tracking-tight">
            {me?.name}
          </div>
        </div>
        <button
          onClick={logout}
          data-testid="mech-logout"
          className="inline-flex items-center gap-1 border border-white/40 text-white/90 px-2 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-white/10"
        >
          <LogOut className="w-3 h-3" /> Exit
        </button>
      </header>

      <div className="p-4 space-y-3" data-testid="mech-jobs">
        {jobs.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <div className="text-sm font-bold">No jobs assigned right now.</div>
            <div className="text-xs">Enjoy the chai break ☕</div>
          </div>
        )}
        {jobs.map((jc) => {
          const st = STATUS_FLOW.find((s) => s.key === jc.status);
          return (
            <div
              key={jc.id}
              className="bg-white border border-slate-300 rounded-sm p-4"
              data-testid={`mech-job-${jc.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-tab font-bold bg-yellow-100 border border-slate-900 px-2 py-1 text-sm tracking-widest">
                  {jc.vehicle_number}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 border border-slate-300 bg-slate-100 rounded-sm">
                  {st?.label || jc.status}
                </span>
              </div>
              <div className="font-display font-bold text-lg text-slate-900">
                {jc.model_name}
              </div>
              <div className="text-sm text-slate-700">
                {jc.customer_name} · {jc.phone}
              </div>
              {jc.complaints && (
                <div className="mt-2 text-sm text-slate-600 border-l-2 border-slate-300 pl-2">
                  {jc.complaints}
                </div>
              )}
              <div className="mt-2 flex items-center gap-3 text-[11px] font-mono-tab uppercase tracking-wider text-slate-500">
                FUEL {jc.fuel_level}%
              </div>
              {st?.next && (
                <button
                  onClick={() => advance(jc)}
                  data-testid={`mech-advance-${jc.id}`}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-sm font-bold uppercase tracking-wider text-sm"
                >
                  {st.nextLabel} →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
