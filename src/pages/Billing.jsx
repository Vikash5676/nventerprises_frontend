import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { useShop } from "@/context/ShopContext";
import { PageHeader, Plate } from "@/components/app/ui";
import { Search, Trash2, Printer, Save, Loader2, Percent } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [lines, setLines] = useState([]);
  const [customer, setCustomer] = useState({
    customer_name: "",
    customer_phone: "",
    customer_state: "Jharkhand",
    customer_gstin: "",
    vehicle_number: "",
    job_card_id: "",
  });
  const [split, setSplit] = useState({ cash: 0, upi: 0, udhaar: 0 });
  const [discount, setDiscount] = useState({ type: "", value: 0 }); // "" | "amount" | "percent"
  const [jobCards, setJobCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // saved invoice for print
  const { shop } = useShop();
  const searchRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [inv, jc] = await Promise.all([
        api.get("/inventory"),
        api.get("/jobcards"),
      ]);
      setItems(inv.data);
      setJobCards(jc.data.filter((c) => c.status !== "invoiced"));
    })();
    searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return [];
    const s = q.toLowerCase();
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          (i.barcode && i.barcode === q) ||
          (i.hsn_sac || "").toLowerCase().includes(s),
      )
      .slice(0, 8);
  }, [q, items]);

  // Exact barcode auto-add (scanner sends full code fast; then presses Enter which we handle via onKeyDown).
  // Additionally auto-add if the typed value exactly matches a barcode and length >= 6 (scanner suffix behavior).
  useEffect(() => {
    if (!q || q.length < 6) return;
    const exact = items.find((i) => i.barcode === q);
    if (exact) {
      const t = setTimeout(() => addLine(exact), 40);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [q]);

  const addLine = (it) => {
    setLines((L) => {
      const idx = L.findIndex((l) => l.item_id === it.id);
      if (idx >= 0) {
        const copy = [...L];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...L,
        {
          item_id: it.id,
          name: it.name,
          item_type: it.item_type,
          hsn_sac: it.hsn_sac,
          qty: 1,
          unit_price: it.unit_price,
          gst_rate: it.gst_rate,
        },
      ];
    });
    setQ("");
    setHighlight(0);
    searchRef.current?.focus();
  };

  const onSearchKey = (e) => {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addLine(filtered[highlight]);
    }
  };

  const updateLine = (i, patch) => {
    setLines((L) => {
      const c = [...L];
      c[i] = { ...c[i], ...patch };
      return c;
    });
  };

  const removeLine = (i) => setLines((L) => L.filter((_, idx) => idx !== i));

  // Live totals (mirror backend compute_invoice_totals: apply discount pre-tax proportionally)
  const totals = useMemo(() => {
    const same = (customer.customer_state || "").toLowerCase() === (shop.state || "").toLowerCase();
    const grossSubtotal = lines.reduce(
      (s, l) => s + Number(l.qty) * Number(l.unit_price),
      0,
    );
    let discountTotal = 0;
    if (discount.type === "percent") {
      const pct = Math.min(Math.max(Number(discount.value) || 0, 0), 100);
      discountTotal = +(grossSubtotal * pct / 100).toFixed(2);
    } else if (discount.type === "amount") {
      discountTotal = Math.min(Math.max(Number(discount.value) || 0, 0), grossSubtotal);
    }
    const ratio = grossSubtotal === 0 ? 0 : discountTotal / grossSubtotal;

    let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
    const computed = lines.map((l) => {
      const effPrice = Number(l.unit_price) * (1 - ratio);
      const taxable = +(l.qty * effPrice).toFixed(2);
      const gst = Number(l.gst_rate || 0);
      let c = 0, s = 0, i = 0;
      if (same) {
        c = +((taxable * (gst / 2)) / 100).toFixed(2);
        s = +((taxable * (gst / 2)) / 100).toFixed(2);
      } else {
        i = +((taxable * gst) / 100).toFixed(2);
      }
      subtotal += taxable;
      cgst += c;
      sgst += s;
      igst += i;
      return { ...l, taxable, cgst: c, sgst: s, igst: i, total: +(taxable + c + s + i).toFixed(2) };
    });
    const grand = +(subtotal + cgst + sgst + igst).toFixed(2);
    return {
      lines: computed,
      gross_subtotal: +grossSubtotal.toFixed(2),
      discount_total: +discountTotal.toFixed(2),
      subtotal: +subtotal.toFixed(2),
      cgst: +cgst.toFixed(2),
      sgst: +sgst.toFixed(2),
      igst: +igst.toFixed(2),
      grand,
      same_state: same,
    };
  }, [lines, customer.customer_state, shop.state, discount.type, discount.value]);

  const paidTotal = Number(split.cash) + Number(split.upi) + Number(split.udhaar);
  const paymentDiff = +(totals.grand - paidTotal).toFixed(2);

  const applyJobCard = (jcId) => {
    setCustomer((c) => ({ ...c, job_card_id: jcId }));
    const jc = jobCards.find((j) => j.id === jcId);
    if (!jc) return;
    setCustomer((c) => ({
      ...c,
      job_card_id: jcId,
      customer_name: jc.customer_name,
      customer_phone: jc.phone,
      vehicle_number: jc.vehicle_number,
    }));
  };

  const save = async () => {
    if (!customer.customer_name || lines.length === 0) {
      toast.error("Customer name and at least one line required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...customer,
        job_card_id: customer.job_card_id || null,
        lines,
        cash_amount: Number(split.cash),
        upi_amount: Number(split.upi),
        udhaar_amount: Number(split.udhaar),
        discount_type: discount.type,
        discount_value: Number(discount.value) || 0,
      };
      const { data } = await api.post("/invoices", payload);
      toast.success(`Invoice ${data.invoice_no} saved`);
      setSaved(data);
    } catch (e) {
      toast.error("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const newInvoice = () => {
    setSaved(null);
    setLines([]);
    setSplit({ cash: 0, upi: 0, udhaar: 0 });
    setDiscount({ type: "", value: 0 });
    setCustomer({
      customer_name: "",
      customer_phone: "",
      customer_state: "Jharkhand",
      customer_gstin: "",
      vehicle_number: "",
      job_card_id: "",
    });
    searchRef.current?.focus();
  };

  if (saved) return <PrintPreview invoice={saved} shop={shop} onNew={newInvoice} />;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Keyboard-First · Live GST"
        title="Billing Counter"
        actions={
          <div className="flex gap-2">
            <button
              onClick={newInvoice}
              className="border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
            >
              Clear
            </button>
            <button
              onClick={save}
              disabled={saving || lines.length === 0}
              data-testid="save-invoice-btn"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Print
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: search + line entry */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-300 rounded-sm p-3 relative">
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                ref={searchRef}
                autoFocus
                data-testid="bill-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onSearchKey}
                placeholder="Scan barcode or search part / labor…  (Enter to add)"
                className="flex-1 bg-transparent focus:outline-none font-mono-tab tracking-wide text-slate-900"
              />
              <span className="text-[10px] font-mono-tab uppercase text-slate-500">↵ Enter · ↑↓ Nav</span>
            </div>
            {filtered.length > 0 && (
              <div className="mt-2 border-t border-slate-200 divide-y divide-slate-100">
                {filtered.map((it, i) => (
                  <button
                    key={it.id}
                    onClick={() => addLine(it)}
                    className={`w-full text-left px-2 py-2 text-sm flex items-center justify-between ${
                      i === highlight ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono-tab">
                        {it.item_type === "labor" ? "LABOR" : "PART"} · HSN {it.hsn_sac || "—"} · GST {it.gst_rate}% · Stock{" "}
                        {it.item_type === "labor" ? "—" : it.stock}
                      </div>
                    </div>
                    <div className="font-mono-tab font-bold">{formatINR(it.unit_price)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-300 rounded-sm">
            <div className="px-4 py-2 border-b border-slate-300 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Invoice Lines
              </div>
              <div className="text-[11px] text-slate-500 font-mono-tab">
                {totals.same_state ? "CGST + SGST" : "IGST"} applied
              </div>
            </div>
            <div className="overflow-auto max-h-[440px]">
              <table className="sharp text-sm" data-testid="bill-lines">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>HSN</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">GST</th>
                    <th className="text-right">Tax</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {totals.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="font-semibold">
                        {l.name}
                        <span className="ml-2 text-[10px] uppercase text-slate-500">
                          {l.item_type}
                        </span>
                      </td>
                      <td className="font-mono-tab text-slate-600">{l.hsn_sac || "—"}</td>
                      <td className="text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={l.qty}
                          onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                          className="w-16 text-right border border-slate-300 rounded-sm px-1.5 py-1 font-mono-tab"
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={l.unit_price}
                          onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })}
                          className="w-20 text-right border border-slate-300 rounded-sm px-1.5 py-1 font-mono-tab"
                        />
                      </td>
                      <td className="text-right font-mono-tab">{l.gst_rate}%</td>
                      <td className="text-right font-mono-tab text-slate-700">
                        {formatINR(l.cgst + l.sgst + l.igst)}
                      </td>
                      <td className="text-right font-mono-tab font-bold">
                        {formatINR(l.total)}
                      </td>
                      <td>
                        <button
                          onClick={() => removeLine(i)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-slate-500 font-mono-tab uppercase text-xs">
                        Scan or search a part to begin
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: draft */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-300 rounded-sm p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-3">
              Customer
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Job Card" span="col-span-2">
                <select
                  className="input"
                  value={customer.job_card_id}
                  onChange={(e) => applyJobCard(e.target.value)}
                >
                  <option value="">— None —</option>
                  {jobCards.map((jc) => (
                    <option key={jc.id} value={jc.id}>
                      {jc.vehicle_number} · {jc.customer_name}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Customer Name" span="col-span-2">
                <input
                  data-testid="bill-customer-name"
                  className="input"
                  value={customer.customer_name}
                  onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                />
              </F>
              <F label="Phone">
                <input className="input font-mono-tab" value={customer.customer_phone} onChange={(e) => setCustomer({ ...customer, customer_phone: e.target.value })} />
              </F>
              <F label="Vehicle">
                <input className="input font-mono-tab uppercase" value={customer.vehicle_number} onChange={(e) => setCustomer({ ...customer, vehicle_number: e.target.value.toUpperCase() })} />
              </F>
              <F label="State">
                <input className="input" value={customer.customer_state} onChange={(e) => setCustomer({ ...customer, customer_state: e.target.value })} />
              </F>
              <F label="GSTIN">
                <input className="input font-mono-tab" value={customer.customer_gstin} onChange={(e) => setCustomer({ ...customer, customer_gstin: e.target.value })} />
              </F>
            </div>
          </div>

          <div className="bg-white border border-slate-300 rounded-sm p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
              <Percent className="w-3.5 h-3.5" /> Discount
            </div>
            <div className="flex border border-slate-300 rounded-sm overflow-hidden mb-2" data-testid="bill-discount-toggle">
              {[
                ["", "None"],
                ["amount", "₹ Amount"],
                ["percent", "% Percent"],
              ].map(([k, label]) => (
                <button
                  type="button"
                  key={k || "none"}
                  onClick={() => setDiscount({ type: k, value: 0 })}
                  data-testid={`bill-disc-${k || "none"}`}
                  className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    discount.type === k
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {discount.type && (
              <div className="flex items-center gap-2">
                <input
                  data-testid="bill-discount-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount.value}
                  onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                  className="flex-1 border border-slate-300 rounded-sm px-3 py-2 font-mono-tab focus:outline-none focus:border-slate-900"
                  placeholder={discount.type === "percent" ? "10" : "50.00"}
                />
                <span className="font-mono-tab font-bold text-slate-500">
                  {discount.type === "percent" ? "%" : "₹"}
                </span>
              </div>
            )}
            {totals.discount_total > 0 && (
              <div className="mt-2 text-[11px] font-mono-tab uppercase tracking-widest text-emerald-700" data-testid="bill-discount-savings">
                You save {formatINR(totals.discount_total)}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-300 rounded-sm p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-3">
              GST Breakdown
            </div>
            {totals.discount_total > 0 && (
              <>
                <Row label="Gross" value={formatINR(totals.gross_subtotal)} />
                <Row label={`Discount ${discount.type === "percent" ? `(${discount.value}%)` : ""}`} value={`− ${formatINR(totals.discount_total)}`} tone="red" />
              </>
            )}
            <Row label="Subtotal (Taxable)" value={formatINR(totals.subtotal)} />
            {totals.same_state ? (
              <>
                <Row label={`CGST`} value={formatINR(totals.cgst)} />
                <Row label={`SGST`} value={formatINR(totals.sgst)} />
              </>
            ) : (
              <Row label="IGST" value={formatINR(totals.igst)} />
            )}
            <div className="border-t border-slate-300 my-2" />
            <div className="flex justify-between items-center">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Grand Total
              </div>
              <div className="font-display font-black text-2xl text-slate-900" data-testid="bill-grand-total">
                {formatINR(totals.grand)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-300 rounded-sm p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-3">
              Split Payment
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["cash", "Cash"],
                ["upi", "UPI"],
                ["udhaar", "Udhaar"],
              ].map(([k, label]) => (
                <F key={k} label={label}>
                  <input
                    data-testid={`bill-split-${k}`}
                    type="number"
                    step="0.01"
                    className="input font-mono-tab"
                    value={split[k]}
                    onChange={(e) => setSplit({ ...split, [k]: Number(e.target.value) })}
                  />
                </F>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSplit({ cash: totals.grand, upi: 0, udhaar: 0 })}
              className="mt-3 text-[11px] font-bold uppercase tracking-widest border border-slate-900 rounded-sm px-2 py-1 hover:bg-slate-100"
            >
              Full Cash
            </button>
            <div
              className={`mt-3 text-xs font-mono-tab ${
                Math.abs(paymentDiff) < 0.01
                  ? "text-emerald-700"
                  : paymentDiff > 0
                  ? "text-amber-700"
                  : "text-red-700"
              }`}
            >
              {Math.abs(paymentDiff) < 0.01
                ? "PAYMENT MATCHES GRAND TOTAL"
                : paymentDiff > 0
                ? `DUE ${formatINR(paymentDiff)}`
                : `OVER-PAID ${formatINR(-paymentDiff)}`}
            </div>
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:2px;background:white;padding:6px 8px;color:#0f172a;outline:none;font-size:13px}.input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a}`}</style>
    </div>
  );
}

const F = ({ label, span = "", children }) => (
  <label className={`block ${span}`}>
    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-1">
      {label}
    </span>
    {children}
  </label>
);

const Row = ({ label, value, tone = "slate" }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-slate-600 font-mono-tab uppercase text-xs tracking-widest">{label}</span>
    <span className={`font-mono-tab font-bold ${tone === "red" ? "text-red-700" : "text-slate-900"}`}>{value}</span>
  </div>
);

function PrintPreview({ invoice, shop, onNew }) {
  useEffect(() => {
    // Auto trigger print
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="p-6 md:p-8">
      <div className="no-print flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500">
            Invoice Saved
          </div>
          <h1 className="font-display font-black text-3xl text-slate-900 uppercase tracking-tight">
            {invoice.invoice_no}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print (80mm)
          </button>
          <button
            onClick={onNew}
            className="border border-slate-900 text-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
          >
            New Invoice
          </button>
        </div>
      </div>

      <div className="print-area flex justify-center">
        <div className="thermal-receipt">
          <div style={{ textAlign: "center" }}>
            {shop.logo_base64 && (
              <img
                src={shop.logo_base64}
                alt=""
                style={{ maxHeight: 48, maxWidth: 120, display: "block", margin: "0 auto 4px" }}
              />
            )}
            <div style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>
              {shop.name}
            </div>
            {shop.tagline && <div style={{ fontSize: 10 }}>{shop.tagline}</div>}
            <div>{shop.address}</div>
            <div>Ph: {shop.phone}</div>
            <div>GSTIN: {shop.gstin}</div>
          </div>
          <hr />
          <div>
            <div>Invoice: {invoice.invoice_no}</div>
            <div>Date: {new Date(invoice.created_at).toLocaleString("en-IN")}</div>
            {invoice.vehicle_number && <div>Vehicle: {invoice.vehicle_number}</div>}
            <div>Customer: {invoice.customer_name}</div>
            {invoice.customer_phone && <div>Ph: {invoice.customer_phone}</div>}
            {invoice.customer_gstin && <div>GSTIN: {invoice.customer_gstin}</div>}
          </div>
          <hr />
          <div style={{ display: "flex", fontWeight: 700 }}>
            <div style={{ flex: 3 }}>ITEM</div>
            <div style={{ flex: 1, textAlign: "right" }}>QTY</div>
            <div style={{ flex: 1.2, textAlign: "right" }}>AMT</div>
          </div>
          <hr />
          {invoice.lines.map((l, i) => (
            <div key={i}>
              <div style={{ display: "flex" }}>
                <div style={{ flex: 3 }}>{l.name}</div>
                <div style={{ flex: 1, textAlign: "right" }}>{l.qty}</div>
                <div style={{ flex: 1.2, textAlign: "right" }}>
                  {l.taxable.toFixed(2)}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>
                HSN {l.hsn_sac || "-"} · GST {l.gst_rate}% ·{" "}
                {l.igst > 0
                  ? `IGST ${l.igst.toFixed(2)}`
                  : `C/S ${l.cgst.toFixed(2)}/${l.sgst.toFixed(2)}`}
              </div>
            </div>
          ))}
          <hr />
          {invoice.discount_total > 0 && (
            <>
              <Line l="Gross" v={invoice.gross_subtotal || invoice.subtotal + invoice.discount_total} />
              <Line l={`Discount${invoice.discount_type === "percent" ? ` (${invoice.discount_value}%)` : ""}`} v={-invoice.discount_total} />
            </>
          )}
          <Line l="Subtotal" v={invoice.subtotal} />
          {invoice.cgst_total > 0 && <Line l="CGST" v={invoice.cgst_total} />}
          {invoice.sgst_total > 0 && <Line l="SGST" v={invoice.sgst_total} />}
          {invoice.igst_total > 0 && <Line l="IGST" v={invoice.igst_total} />}
          <hr />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <span>GRAND TOTAL</span>
            <span>₹ {invoice.grand_total.toFixed(2)}</span>
          </div>
          <hr />
          {invoice.cash_amount > 0 && <Line l="Cash" v={invoice.cash_amount} />}
          {invoice.upi_amount > 0 && <Line l="UPI" v={invoice.upi_amount} />}
          {invoice.udhaar_amount > 0 && <Line l="Udhaar" v={invoice.udhaar_amount} />}
          <hr />
          <div style={{ textAlign: "center", marginTop: 6 }}>Thank you! Ride Safe.</div>
        </div>
      </div>
    </div>
  );
}
const Line = ({ l, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span>{l}</span>
    <span>₹ {v.toFixed(2)}</span>
  </div>
);
