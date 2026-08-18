import { useEffect, useRef, useState } from "react";
import { api, formatINR } from "@/lib/api";
import { PageHeader } from "@/components/app/ui";
import {
  Search,
  Plus,
  Save,
  X,
  TriangleAlert as AlertTriangle,
  Trash2,
  PackagePlus,
  Upload,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

const empty = {
  name: "",
  item_type: "part",
  hsn_sac: "",
  stock: 0,
  unit_price: 0,
  low_stock_threshold: 5,
  rack_location: "",
  gst_rate: 18,
  barcode: "",
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const searchRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/inventory", { params: q ? { q } : {} });
    setItems(data);
  };

  useEffect(() => {
    load();
    searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (item) => {
    setEditId(item.id);
    setForm({ ...empty, ...item });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/inventory/${editId}`, form);
        toast.success(`Updated ${form.name}`);
      } else {
        await api.post("/inventory", form);
        toast.success(`Added ${form.name}`);
      }
      setForm(empty);
      setEditId(null);
      setShowForm(false);
      load();
    } catch {
      toast.error("Save failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await api.delete(`/inventory/${id}`);
    load();
  };

  const lowCount = items.filter(
    (i) => i.item_type === "part" && i.stock <= i.low_stock_threshold,
  ).length;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        eyebrow={`Parts & Services · ${items.length} items · ${lowCount} low stock`}
        title="Inventory"
        actions={
          <div className="flex gap-2 flex-wrap">
            <label
              data-testid="csv-import-btn"
              className="cursor-pointer inline-flex items-center gap-2 border border-slate-900 text-slate-900 px-3 py-2 rounded-sm font-bold uppercase tracking-wider text-xs hover:bg-slate-100 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const lines = text.split(/\r?\n/).filter((l) => l.trim());
                  if (lines.length < 2) return toast.error("CSV appears empty");
                  const headers = lines[0]
                    .split(",")
                    .map((h) => h.trim().toLowerCase());
                  const rows = lines
                    .slice(1)
                    .map((line) => {
                      const cols = line.split(",").map((c) => c.trim());
                      const obj = {};
                      headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
                      return {
                        name: obj.name || obj["part name"] || "",
                        item_type: obj.item_type || "part",
                        hsn_sac: obj.hsn_sac || obj.hsn || "",
                        stock: Number(obj.stock || 0),
                        unit_price: Number(obj.unit_price || obj.price || 0),
                        low_stock_threshold: Number(
                          obj.low_stock_threshold || obj.threshold || 5,
                        ),
                        rack_location: obj.rack_location || obj.rack || "",
                        gst_rate: Number(obj.gst_rate || obj.gst || 18),
                        barcode: obj.barcode || null,
                      };
                    })
                    .filter((r) => r.name);
                  try {
                    const { data } = await api.post("/inventory/bulk_import", {
                      rows,
                      upsert_by_barcode: true,
                    });
                    toast.success(
                      `Imported: ${data.created} created, ${data.updated} updated`,
                    );
                    load();
                  } catch {
                    toast.error("Import failed");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <button
              data-testid="new-item-btn"
              onClick={() => {
                setForm(empty);
                setEditId(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm font-bold uppercase tracking-wider text-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        }
      />

      <div className="bg-white border border-slate-300 rounded-sm p-3 mb-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          ref={searchRef}
          autoFocus
          data-testid="inv-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Scan barcode or search part name / HSN…"
          className="flex-1 bg-transparent focus:outline-none font-mono-tab tracking-wide text-slate-900 min-w-0"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-slate-500 hover:text-slate-900 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          data-testid="inv-form"
          className="bg-white border border-slate-300 rounded-sm p-4 sm:p-5 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <F label="Name" span="sm:col-span-2">
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
              data-testid="inv-name"
            />
          </F>
          <F label="Item Type">
            <div className="flex border border-slate-300 rounded-sm overflow-hidden">
              {["part", "labor"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF("item_type", t)}
                  className={`flex-1 py-2 text-xs font-bold uppercase ${form.item_type === t ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
                >
                  {t === "part" ? "Part / Goods" : "Labor / Service"}
                </button>
              ))}
            </div>
          </F>
          <F label="HSN / SAC">
            <input
              className="input font-mono-tab"
              value={form.hsn_sac}
              onChange={(e) => setF("hsn_sac", e.target.value)}
            />
          </F>
          {form.item_type === "part" && (
            <>
              <F label="Stock">
                <input
                  type="number"
                  className="input font-mono-tab"
                  value={form.stock}
                  onChange={(e) => setF("stock", Number(e.target.value))}
                />
              </F>
              <F label="Low-Stock Threshold">
                <input
                  type="number"
                  className="input font-mono-tab"
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setF("low_stock_threshold", Number(e.target.value))
                  }
                />
              </F>
              <F label="Rack / Shelf">
                <input
                  className="input font-mono-tab"
                  placeholder="Rack A, Shelf 2"
                  value={form.rack_location}
                  onChange={(e) => setF("rack_location", e.target.value)}
                />
              </F>
              <F label="Barcode">
                <input
                  className="input font-mono-tab"
                  value={form.barcode || ""}
                  onChange={(e) => setF("barcode", e.target.value)}
                />
              </F>
            </>
          )}
          <F label="Unit Price (₹)">
            <input
              type="number"
              step="0.01"
              className="input font-mono-tab"
              value={form.unit_price}
              onChange={(e) => setF("unit_price", Number(e.target.value))}
            />
          </F>
          <F label="GST Rate (%)">
            <select
              className="input font-mono-tab"
              value={form.gst_rate}
              onChange={(e) => setF("gst_rate", Number(e.target.value))}
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </F>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-slate-900 text-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              data-testid="inv-save"
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> {editId ? "Update" : "Save"} Item
            </button>
          </div>
          <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:2px;background:white;padding:8px 10px;color:#0f172a;outline:none}.input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a}`}</style>
        </form>
      )}

      <div className="bg-white border border-slate-300 rounded-sm">
        <div className="overflow-auto">
          <table className="sharp text-sm" data-testid="inv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th className="text-right">Stock</th>
                <th className="text-right hidden sm:table-cell">Threshold</th>
                <th className="hidden md:table-cell">Rack</th>
                <th className="text-right">Price</th>
                <th className="text-right hidden sm:table-cell">GST</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low =
                  i.item_type === "part" && i.stock <= i.low_stock_threshold;
                return (
                  <tr
                    key={i.id}
                    className={low ? "bg-red-50" : ""}
                    data-testid={`inv-row-${i.id}`}
                  >
                    <td
                      className="font-semibold text-slate-900 cursor-pointer"
                      onClick={() => startEdit(i)}
                    >
                      {i.name}
                      <span className="block text-[10px] text-slate-500 sm:hidden">
                        {i.rack_location || "—"} · {i.gst_rate}% GST
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-sm border ${i.item_type === "labor" ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-300 bg-slate-100 text-slate-700"}`}
                      >
                        {i.item_type === "labor" ? "Labor" : "Part"}
                      </span>
                    </td>
                    <td className="text-right font-mono-tab font-bold text-slate-900">
                      {i.item_type === "labor" ? "—" : i.stock}
                    </td>
                    <td className="text-right font-mono-tab text-slate-600 hidden sm:table-cell">
                      {i.item_type === "labor" ? "—" : i.low_stock_threshold}
                    </td>
                    <td className="font-mono-tab text-slate-700 hidden md:table-cell">
                      {i.rack_location || "—"}
                    </td>
                    <td className="text-right font-mono-tab font-bold text-slate-900">
                      {formatINR(i.unit_price)}
                    </td>
                    <td className="text-right font-mono-tab text-slate-700 hidden sm:table-cell">
                      {i.gst_rate}%
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {low && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-700">
                            <AlertTriangle className="w-3 h-3" /> Low
                          </span>
                        )}
                        <button
                          onClick={() => startEdit(i)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit item"
                          data-testid={`inv-edit-${i.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => remove(i.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">
                    <PackagePlus className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    No items found.
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

function F({ label, span = "", children }) {
  return (
    <label className={`block ${span}`}>
      <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
