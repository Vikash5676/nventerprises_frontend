import { useEffect, useState } from "react";
import { api, formatINR, todayISO } from "@/lib/api";
import { PageHeader } from "@/components/app/ui";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function Purchases() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [items, setItems] = useState([]);
  const [showSupplier, setShowSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", gstin: "", phone: "", address: "" });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: "",
    invoice_no: "",
    lines: [],
    paid_amount: 0,
    notes: "",
  });
  const [showPurchase, setShowPurchase] = useState(false);

  const load = async () => {
    const [s, p, i] = await Promise.all([
      api.get("/suppliers"),
      api.get("/purchases"),
      api.get("/inventory"),
    ]);
    setSuppliers(s.data);
    setPurchases(p.data);
    setItems(i.data.filter((x) => x.item_type === "part"));
  };
  useEffect(() => {
    load();
  }, []);

  const addSupplier = async (e) => {
    e.preventDefault();
    await api.post("/suppliers", supplierForm);
    setSupplierForm({ name: "", gstin: "", phone: "", address: "" });
    setShowSupplier(false);
    toast.success("Supplier added");
    load();
  };

  const removeSupplier = async (id) => {
    if (!window.confirm("Delete supplier?")) return;
    await api.delete(`/suppliers/${id}`);
    load();
  };

  const addLine = () =>
    setPurchaseForm((f) => ({
      ...f,
      lines: [...f.lines, { item_id: "", name: "", hsn_sac: "", qty: 1, unit_cost: 0 }],
    }));

  const updateLine = (i, patch) =>
    setPurchaseForm((f) => {
      const c = [...f.lines];
      c[i] = { ...c[i], ...patch };
      return { ...f, lines: c };
    });

  const removeLine = (i) =>
    setPurchaseForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const totalPurchase = purchaseForm.lines.reduce(
    (s, l) => s + Number(l.qty) * Number(l.unit_cost),
    0,
  );

  const submitPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplier_id || purchaseForm.lines.length === 0) {
      toast.error("Pick supplier and at least one line");
      return;
    }
    await api.post("/purchases", purchaseForm);
    toast.success("Purchase logged, stock updated, expense recorded");
    setPurchaseForm({ supplier_id: "", invoice_no: "", lines: [], paid_amount: 0, notes: "" });
    setShowPurchase(false);
    load();
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Suppliers · Bulk Stock"
        title="Purchases"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowSupplier((v) => !v)}
              className="border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
              data-testid="new-supplier-btn"
            >
              <Plus className="inline w-3 h-3 mr-1" /> Supplier
            </button>
            <button
              onClick={() => setShowPurchase((v) => !v)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
              data-testid="new-purchase-btn"
            >
              <Plus className="inline w-3 h-3 mr-1" /> Log Purchase Invoice
            </button>
          </div>
        }
      />

      {showSupplier && (
        <form
          onSubmit={addSupplier}
          className="bg-white border border-slate-300 rounded-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <F label="Name" span="md:col-span-2">
            <input required data-testid="sup-name" className="input" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
          </F>
          <F label="GSTIN">
            <input className="input font-mono-tab" value={supplierForm.gstin} onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })} />
          </F>
          <F label="Phone">
            <input className="input font-mono-tab" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
          </F>
          <F label="Address" span="md:col-span-4">
            <input className="input" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
          </F>
          <div className="md:col-span-4 flex justify-end">
            <button data-testid="sup-save" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm">
              Save Supplier
            </button>
          </div>
        </form>
      )}

      {showPurchase && (
        <form
          onSubmit={submitPurchase}
          data-testid="purchase-form"
          className="bg-white border border-slate-300 rounded-sm p-4 mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <F label="Supplier" span="md:col-span-2">
              <select
                required
                className="input"
                value={purchaseForm.supplier_id}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                data-testid="purchase-supplier"
              >
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </F>
            <F label="Bill / Invoice No">
              <input className="input font-mono-tab" value={purchaseForm.invoice_no} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_no: e.target.value })} />
            </F>
            <F label="Paid Amount">
              <input type="number" step="0.01" className="input font-mono-tab" value={purchaseForm.paid_amount} onChange={(e) => setPurchaseForm({ ...purchaseForm, paid_amount: Number(e.target.value) })} />
            </F>
          </div>

          <div className="border border-slate-300 rounded-sm">
            <table className="sharp text-sm">
              <thead>
                <tr>
                  <th>Part (from Inventory)</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Cost (₹)</th>
                  <th className="text-right">Line Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {purchaseForm.lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <select
                        className="input"
                        value={l.item_id}
                        onChange={(e) => {
                          const item = items.find((x) => x.id === e.target.value);
                          updateLine(i, {
                            item_id: e.target.value,
                            name: item?.name || "",
                            hsn_sac: item?.hsn_sac || "",
                          });
                        }}
                      >
                        <option value="">— Select part —</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <input type="number" min="0" step="0.5" className="input text-right font-mono-tab" value={l.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} />
                    </td>
                    <td className="text-right">
                      <input type="number" step="0.01" className="input text-right font-mono-tab" value={l.unit_cost} onChange={(e) => updateLine(i, { unit_cost: Number(e.target.value) })} />
                    </td>
                    <td className="text-right font-mono-tab font-bold">
                      {formatINR(l.qty * l.unit_cost)}
                    </td>
                    <td>
                      <button type="button" onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="text-right font-bold uppercase text-xs tracking-widest">
                    Total
                  </td>
                  <td className="text-right font-mono-tab font-black text-slate-900">
                    {formatINR(totalPurchase)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-center mt-3">
            <button type="button" onClick={addLine} className="border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100">
              <Plus className="inline w-3 h-3 mr-1" /> Add Line
            </button>
            <button data-testid="purchase-save" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-sm">
              Save Purchase
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-300 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-300 font-display font-bold uppercase text-slate-900 tracking-tight">
            Supplier Directory
          </div>
          <table className="sharp text-sm" data-testid="suppliers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>GSTIN</th>
                <th className="text-right">Payable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="font-mono-tab">{s.gstin || "—"}</td>
                  <td className={`text-right font-mono-tab font-bold ${s.payable_balance > 0 ? "text-red-700" : "text-slate-900"}`}>
                    {formatINR(s.payable_balance)}
                  </td>
                  <td>
                    <button onClick={() => removeSupplier(s.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-slate-500 py-6">
                    <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                    No suppliers added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-300 font-display font-bold uppercase text-slate-900 tracking-tight">
            Purchase History
          </div>
          <table className="sharp text-sm" data-testid="purchases-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Bill #</th>
                <th className="text-right">Total</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono-tab">{p.created_at.slice(0, 10)}</td>
                  <td>{p.supplier_name}</td>
                  <td className="font-mono-tab">{p.invoice_no || "—"}</td>
                  <td className="text-right font-mono-tab font-bold">{formatINR(p.total)}</td>
                  <td className={`text-right font-mono-tab ${p.balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {formatINR(p.balance)}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-slate-500 py-6">
                    No purchases logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const F = ({ label, span = "", children }) => (
  <label className={`block ${span}`}>
    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
      {label}
    </span>
    {children}
    <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:2px;background:white;padding:6px 8px;color:#0f172a;outline:none;font-size:13px}.input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a}`}</style>
  </label>
);
