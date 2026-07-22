import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, StatusPill, Plate } from "@/components/app/ui";
import { TrendingUp, TrendingDown, Bike, Wallet2, RefreshCw, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const KPI = ({ label, value, icon: Icon, tone = "slate", testid }) => (
  <div
    className="bg-white border border-slate-300 rounded-sm p-5 flex flex-col justify-between min-h-[130px]"
    data-testid={testid}
  >
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <Icon className={`w-4 h-4 text-${tone}-600`} strokeWidth={2.25} />
    </div>
    <div className="font-display font-black text-slate-900 text-3xl md:text-4xl tracking-tight break-all">
      {value}
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const load = async () => {
    const { data } = await api.get("/dashboard");
    setData(data);
  };
  useEffect(() => {
    load();
  }, []);

  if (!data)
    return (
      <div className="p-8 text-slate-500 font-mono-tab">Loading dashboard…</div>
    );

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Overview · Today"
        title="Shop Command Deck"
        actions={
          <button
            data-testid="dash-refresh"
            onClick={load}
            className="flex items-center gap-2 border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-900 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Today's Sales"
          value={formatINR(data.sales_today)}
          icon={TrendingUp}
          tone="emerald"
          testid="kpi-sales"
        />
        <KPI
          label="Today's Expenses"
          value={formatINR(data.expenses_today)}
          icon={TrendingDown}
          tone="red"
          testid="kpi-expenses"
        />
        <KPI
          label="Active Bikes in Garage"
          value={String(data.active_bikes).padStart(2, "0")}
          icon={Bike}
          tone="amber"
          testid="kpi-bikes"
        />
        <KPI
          label="Pending Udhaar"
          value={formatINR(data.pending_udhaar)}
          icon={Wallet2}
          tone="blue"
          testid="kpi-udhaar"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-sm p-4" data-testid="sales-trend">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500">
                Last 7 Days
              </div>
              <h2 className="font-display font-bold uppercase tracking-tight text-slate-900">
                Sales Trend
              </h2>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono-tab uppercase text-slate-500">
                7-Day Total
              </div>
              <div className="font-display font-black text-lg text-slate-900">
                {formatINR(data.sales_trend.reduce((s, d) => s + d.sales, 0))}
              </div>
            </div>
          </div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.sales_trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    background: "white",
                    border: "1px solid #cbd5e1",
                    borderRadius: 2,
                    fontFamily: "JetBrains Mono",
                    fontSize: 11,
                  }}
                  formatter={(v) => [formatINR(v), "Sales"]}
                />
                <Bar dataKey="sales" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-4" data-testid="low-stock-heatmap">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500">
                Reorder Now
              </div>
              <h2 className="font-display font-bold uppercase tracking-tight text-slate-900">
                Low-Stock Heatmap
              </h2>
            </div>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="space-y-1.5 max-h-52 overflow-auto">
            {data.low_stock.length === 0 && (
              <div className="text-xs text-slate-500 py-4 text-center">
                All parts above threshold ✓
              </div>
            )}
            {data.low_stock.map((it) => {
              const ratio = it.low_stock_threshold > 0 ? Math.min(1, it.stock / it.low_stock_threshold) : 0;
              const bg = ratio < 0.34 ? "bg-red-600" : ratio < 0.67 ? "bg-amber-500" : "bg-yellow-400";
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-2 text-xs"
                  data-testid={`low-stock-${it.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{it.name}</div>
                    <div className="text-[10px] font-mono-tab text-slate-500">
                      {it.rack_location || "—"}
                    </div>
                  </div>
                  <div className="w-20 bg-slate-100 h-2 rounded-sm overflow-hidden">
                    <div className={`h-full ${bg}`} style={{ width: `${Math.max(6, ratio * 100)}%` }} />
                  </div>
                  <div className="font-mono-tab font-bold text-slate-900 text-right w-14">
                    {it.stock}/{it.low_stock_threshold}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-300 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between">
            <h2 className="font-display font-bold uppercase tracking-tight text-slate-900">
              Active Vehicles in Shop
            </h2>
            <span className="font-mono-tab text-xs text-slate-500">
              {data.active_vehicles.length} bikes
            </span>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="sharp text-sm" data-testid="active-vehicles-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Customer</th>
                  <th>Mechanic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.active_vehicles.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-slate-500 py-8">
                      No bikes currently in shop.
                    </td>
                  </tr>
                )}
                {data.active_vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Plate>{v.vehicle_number}</Plate>
                    </td>
                    <td className="font-medium text-slate-900">{v.model_name}</td>
                    <td className="text-slate-700">{v.customer_name}</td>
                    <td className="text-slate-700">
                      {v.assigned_mechanic_name || "—"}
                    </td>
                    <td>
                      <StatusPill status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between">
            <h2 className="font-display font-bold uppercase tracking-tight text-slate-900">
              Recent Transactions
            </h2>
            <span className="font-mono-tab text-xs text-slate-500">
              {data.recent_invoices.length} invoices
            </span>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="sharp text-sm" data-testid="recent-transactions-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Plate</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_invoices.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center text-slate-500 py-8">
                      No invoices yet — head to the Billing Counter.
                    </td>
                  </tr>
                )}
                {data.recent_invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono-tab text-slate-900">
                      {inv.invoice_no}
                    </td>
                    <td className="text-slate-700">{inv.customer_name}</td>
                    <td>
                      {inv.vehicle_number ? <Plate>{inv.vehicle_number}</Plate> : "—"}
                    </td>
                    <td className="text-right font-mono-tab font-bold text-slate-900">
                      {formatINR(inv.grand_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
