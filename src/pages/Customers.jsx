import { useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader, Plate } from "@/components/app/ui";
import { Users, MessageCircle, X, Search } from "lucide-react";
import { toast } from "sonner";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState(null);

  const load = async () => {
    const { data } = await api.get("/customers");
    setCustomers(data);
  };
  useEffect(() => {
    load();
  }, []);

  const open = async (c) => {
    setSelected(c);
    if (!c.phone) return;
    const { data } = await api.get(`/customers/${encodeURIComponent(c.phone)}/ledger`);
    setLedger(data);
  };

  const remind = (c) => {
    const msg = `Namaste ${c.name},%0AApka Ranchi Motors ka udhaar ${formatINR(
      c.total_udhaar,
    )} pending hai. Please clear soon. Dhanyavaad!`;
    const phone = (c.phone || "").replace(/\D/g, "");
    if (!phone) return toast.error("No phone number");
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  };

  const filtered = customers.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(s) ||
      (c.phone || "").includes(q) ||
      c.vehicle_numbers.some((v) => v.toLowerCase().includes(s))
    );
  });

  const totalUdhaar = customers.reduce((s, c) => s + c.total_udhaar, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        eyebrow={`${customers.length} customers · ${formatINR(totalUdhaar)} pending udhaar`}
        title="Customer Ledger"
        actions={null}
      />

      <div className="bg-white border border-slate-300 rounded-sm p-3 mb-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="cust-search"
          placeholder="Search by name, phone, or plate…"
          className="flex-1 bg-transparent focus:outline-none font-mono-tab tracking-wide text-slate-900 min-w-0"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-slate-500 hover:text-slate-900 shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="sharp text-sm" data-testid="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="hidden sm:table-cell">Phone</th>
                  <th>Vehicles</th>
                  <th className="text-right">Visits</th>
                  <th className="text-right">Billed</th>
                  <th className="text-right">Udhaar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr
                    key={idx}
                    className={`cursor-pointer ${selected?.phone === c.phone ? "bg-slate-100" : ""}`}
                    onClick={() => open(c)}
                    data-testid={`cust-row-${idx}`}
                  >
                    <td className="font-semibold text-slate-900">
                      {c.name || "—"}
                      <span className="block text-[10px] text-slate-500 sm:hidden font-mono-tab">
                        {c.phone || "—"}
                      </span>
                    </td>
                    <td className="font-mono-tab hidden sm:table-cell">{c.phone || "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.vehicle_numbers.slice(0, 2).map((v) => (
                          <Plate key={v}>{v}</Plate>
                        ))}
                        {c.vehicle_numbers.length > 2 && (
                          <span className="text-[10px] text-slate-500">+{c.vehicle_numbers.length - 2}</span>
                        )}
                        {c.vehicle_numbers.length === 0 && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="text-right font-mono-tab">{c.invoice_count}</td>
                    <td className="text-right font-mono-tab font-bold">
                      {formatINR(c.total_billed)}
                    </td>
                    <td
                      className={`text-right font-mono-tab font-bold ${
                        c.total_udhaar > 0 ? "text-red-700" : "text-slate-500"
                      }`}
                    >
                      {formatINR(c.total_udhaar)}
                    </td>
                    <td>
                      {c.total_udhaar > 0 && c.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            remind(c);
                          }}
                          data-testid={`cust-remind-${idx}`}
                          className="inline-flex items-center gap-1 text-[11px] border border-green-600 text-green-700 hover:bg-green-50 rounded-sm px-2 py-1 font-bold uppercase tracking-wider"
                        >
                          <MessageCircle className="w-3 h-3" /> <span className="hidden sm:inline">Remind</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-500">
                      <Users className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between">
            <div className="font-display font-bold uppercase text-slate-900 tracking-tight text-sm">
              Ledger
            </div>
            {selected && (
              <button
                onClick={() => {
                  setSelected(null);
                  setLedger(null);
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {!selected && (
            <div className="p-6 text-slate-500 text-sm">Select a customer to view invoices & job history.</div>
          )}
          {selected && (
            <div className="p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-mono-tab">
                {selected.phone}
              </div>
              <div className="font-display font-black text-lg sm:text-xl text-slate-900 uppercase">
                {selected.name || "—"}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
                <StatBox label="Billed" value={formatINR(selected.total_billed)} />
                <StatBox
                  label="Udhaar"
                  value={formatINR(selected.total_udhaar)}
                  tone={selected.total_udhaar > 0 ? "red" : "slate"}
                />
              </div>
              {ledger && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mt-4 mb-2">
                    Invoices
                  </div>
                  <div className="space-y-1 max-h-56 overflow-auto">
                    {ledger.invoices.map((inv) => (
                      <div key={inv.id} className="border border-slate-200 rounded-sm p-2 text-xs">
                        <div className="flex justify-between">
                          <span className="font-mono-tab">{inv.invoice_no}</span>
                          <span className="font-mono-tab font-bold">
                            {formatINR(inv.grand_total)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono-tab">
                          {inv.created_at.slice(0, 10)} · {inv.vehicle_number || "—"}
                          {inv.udhaar_amount > 0 && (
                            <span className="text-red-700 ml-2">
                              Udhaar {formatINR(inv.udhaar_amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {ledger.invoices.length === 0 && (
                      <div className="text-xs text-slate-500">No invoices yet.</div>
                    )}
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mt-4 mb-2">
                    Job Cards
                  </div>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {ledger.job_cards.map((jc) => (
                      <div key={jc.id} className="border border-slate-200 rounded-sm p-2 text-xs">
                        <div className="flex justify-between items-center">
                          <Plate>{jc.vehicle_number}</Plate>
                          <span className="text-[10px] uppercase tracking-widest text-slate-500">
                            {jc.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{jc.model_name}</div>
                      </div>
                    ))}
                    {ledger.job_cards.length === 0 && (
                      <div className="text-xs text-slate-500">No job cards.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const StatBox = ({ label, value, tone = "slate" }) => (
  <div className="border border-slate-300 rounded-sm p-2">
    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono-tab">
      {label}
    </div>
    <div
      className={`font-display font-black text-base sm:text-lg ${
        tone === "red" ? "text-red-700" : "text-slate-900"
      }`}
    >
      {value}
    </div>
  </div>
);
