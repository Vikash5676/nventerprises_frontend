import { useEffect, useState } from "react";
import { api, formatINR, todayISO, monthISO } from "@/lib/api";
import { PageHeader } from "@/components/app/ui";
import { Plus, Trash2, FileText, Download } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Rent", "Electricity", "Tea/Snacks", "Tools", "Internet", "Salary Advance", "Other"];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: "Rent", amount: 0, date: todayISO(), note: "" });
  const [month, setMonth] = useState(monthISO());
  const [gstr1, setGstr1] = useState(null);
  const [gstr3b, setGstr3b] = useState(null);
  const [tab, setTab] = useState("expenses");

  const load = async () => {
    const { data } = await api.get("/expenses");
    setExpenses(data);
  };
  useEffect(() => {
    load();
  }, []);

  const loadReports = async () => {
    const [r1, r3] = await Promise.all([
      api.get("/reports/gstr1", { params: { month } }),
      api.get("/reports/gstr3b", { params: { month } }),
    ]);
    setGstr1(r1.data);
    setGstr3b(r3.data);
  };
  useEffect(() => {
    if (tab === "gst") loadReports();
    // eslint-disable-next-line
  }, [tab, month]);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/expenses", form);
    toast.success("Expense recorded");
    setForm({ category: "Rent", amount: 0, date: todayISO(), note: "" });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete expense?")) return;
    await api.delete(`/expenses/${id}`);
    load();
  };

  const monthTotal = expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);

  const csvExport = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","));
    const csv = [headers.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Expenses · GST Reports"
        title="Books & Compliance"
        actions={
          <div className="flex gap-2">
            {["expenses", "gst"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                data-testid={`tab-${t}`}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                  tab === t
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-900 border-slate-900 hover:bg-slate-100"
                }`}
              >
                {t === "expenses" ? "Expenses" : "GST Reports"}
              </button>
            ))}
          </div>
        }
      />

      {tab === "expenses" && (
        <>
          <form
            onSubmit={submit}
            data-testid="expense-form"
            className="bg-white border border-slate-300 rounded-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <F label="Category">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </F>
            <F label="Amount (₹)">
              <input required data-testid="exp-amount" type="number" step="0.01" className="input font-mono-tab" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </F>
            <F label="Date">
              <input type="date" className="input font-mono-tab" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </F>
            <F label="Note" span="md:col-span-2">
              <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </F>
            <div className="md:col-span-5 flex justify-between items-center">
              <div className="text-xs font-mono-tab uppercase tracking-widest text-slate-600">
                {month} Total: <span className="text-slate-900 font-black">{formatINR(monthTotal)}</span>
              </div>
              <button data-testid="exp-save" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm">
                <Plus className="w-3.5 h-3.5" /> Log Expense
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-300 rounded-sm">
            <div className="px-4 py-3 border-b border-slate-300 font-display font-bold uppercase text-slate-900 tracking-tight">
              Recent Expenses
            </div>
            <table className="sharp text-sm" data-testid="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th>Source</th>
                  <th className="text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono-tab">{e.date}</td>
                    <td className="font-semibold">{e.category}</td>
                    <td className="text-slate-600">{e.note}</td>
                    <td className="text-[10px] uppercase tracking-widest text-slate-500">{e.source}</td>
                    <td className="text-right font-mono-tab font-bold">{formatINR(e.amount)}</td>
                    <td>
                      <button onClick={() => remove(e.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-500 py-6">
                      No expenses recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "gst" && (
        <div>
          <div className="bg-white border border-slate-300 rounded-sm p-4 mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
                Reporting Month
              </div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                data-testid="gst-month"
                className="border border-slate-300 rounded-sm px-3 py-2 font-mono-tab focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!gstr1) return;
                  try {
                    const { data } = await api.get("/reports/gstr1.json", { params: { month } });
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `GSTR1-${month}.json`;
                    a.click();
                    toast.success("Portal JSON downloaded");
                  } catch {
                    toast.error("JSON export failed");
                  }
                }}
                data-testid="export-gstr1-json"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm"
              >
                <Download className="w-3.5 h-3.5" /> GSTR-1 Portal JSON
              </button>
              <button
                onClick={() => gstr1 && csvExport(gstr1.rows, `GSTR1-${month}.csv`)}
                data-testid="export-gstr1"
                className="inline-flex items-center gap-2 border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" /> GSTR-1 CSV
              </button>
              <button
                onClick={() =>
                  gstr3b && csvExport([gstr3b.outward_supplies], `GSTR3B-${month}.csv`)
                }
                data-testid="export-gstr3b"
                className="inline-flex items-center gap-2 border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" /> Export GSTR-3B CSV
              </button>
            </div>
          </div>

          {gstr1 && (
            <div className="bg-white border border-slate-300 rounded-sm mb-4" data-testid="gstr1-panel">
              <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between">
                <div className="font-display font-bold uppercase text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4" /> GSTR-1 · Outward Supplies
                </div>
                <span className="font-mono-tab text-xs text-slate-500">{gstr1.rows.length} invoices</span>
              </div>
              <table className="sharp text-sm">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>GSTIN</th>
                    <th>State</th>
                    <th className="text-right">Taxable</th>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                    <th className="text-right">IGST</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr1.rows.map((r) => (
                    <tr key={r.invoice_no}>
                      <td className="font-mono-tab">{r.invoice_no}</td>
                      <td className="font-mono-tab">{r.date}</td>
                      <td className="font-semibold">{r.customer_name}</td>
                      <td className="font-mono-tab">{r.customer_gstin || "—"}</td>
                      <td>{r.customer_state}</td>
                      <td className="text-right font-mono-tab">{formatINR(r.taxable)}</td>
                      <td className="text-right font-mono-tab">{formatINR(r.cgst)}</td>
                      <td className="text-right font-mono-tab">{formatINR(r.sgst)}</td>
                      <td className="text-right font-mono-tab">{formatINR(r.igst)}</td>
                      <td className="text-right font-mono-tab font-bold">{formatINR(r.total)}</td>
                    </tr>
                  ))}
                  {gstr1.rows.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center text-slate-500 py-6">
                        No invoices in this month.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan="5" className="text-right font-bold uppercase tracking-widest text-xs">
                      Totals
                    </td>
                    <td className="text-right font-mono-tab font-black">{formatINR(gstr1.totals.taxable)}</td>
                    <td className="text-right font-mono-tab font-black">{formatINR(gstr1.totals.cgst)}</td>
                    <td className="text-right font-mono-tab font-black">{formatINR(gstr1.totals.sgst)}</td>
                    <td className="text-right font-mono-tab font-black">{formatINR(gstr1.totals.igst)}</td>
                    <td className="text-right font-mono-tab font-black">{formatINR(gstr1.totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {gstr3b && (
            <div className="bg-white border border-slate-300 rounded-sm" data-testid="gstr3b-panel">
              <div className="px-4 py-3 border-b border-slate-300 font-display font-bold uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4" /> GSTR-3B · Summary
              </div>
              <table className="sharp text-sm">
                <thead>
                  <tr>
                    <th>Nature</th>
                    <th className="text-right">Taxable</th>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                    <th className="text-right">IGST</th>
                    <th className="text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">Outward Taxable Supplies</td>
                    <td className="text-right font-mono-tab">{formatINR(gstr3b.outward_supplies.taxable)}</td>
                    <td className="text-right font-mono-tab">{formatINR(gstr3b.outward_supplies.cgst)}</td>
                    <td className="text-right font-mono-tab">{formatINR(gstr3b.outward_supplies.sgst)}</td>
                    <td className="text-right font-mono-tab">{formatINR(gstr3b.outward_supplies.igst)}</td>
                    <td className="text-right font-mono-tab font-bold">{formatINR(gstr3b.outward_supplies.total_tax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const F = ({ label, span = "", children }) => (
  <label className={`block ${span}`}>
    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">{label}</span>
    {children}
    <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:2px;background:white;padding:6px 8px;color:#0f172a;outline:none;font-size:13px}.input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a}`}</style>
  </label>
);
