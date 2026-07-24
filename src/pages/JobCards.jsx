import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatusPill, Plate } from "@/components/app/ui";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { key: "checked_in", label: "Checked In" },
  { key: "in_progress", label: "In Progress" },
  { key: "ready", label: "Ready for Test Drive" },
  { key: "invoiced", label: "Invoiced" },
];

const SCRATCH_ZONES = [
  "Front Fender",
  "Head Light",
  "Tank Left",
  "Tank Right",
  "Seat",
  "Rear Panel",
  "Silencer",
  "Rear Tyre",
  "Front Tyre",
];

const emptyForm = {
  vehicle_number: "",
  model_name: "",
  customer_name: "",
  phone: "",
  fuel_level: 50,
  scratch_notes: "",
  scratch_map: [],
  assigned_mechanic_id: "",
  complaints: "",
};

export default function JobCards() {
  const [cards, setCards] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [c, s] = await Promise.all([api.get("/jobcards"), api.get("/staff")]);
    setCards(c.data);
    setStaff(s.data);
  };
  useEffect(() => {
    load();
  }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/jobcards", {
        ...form,
        assigned_mechanic_id: form.assigned_mechanic_id || null,
      });
      toast.success(`Job card created for ${form.vehicle_number.toUpperCase()}`);
      setForm(emptyForm);
      setOpen(false);
      load();
    } catch (err) {
      toast.error("Failed to create job card");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/jobcards/${id}/status`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this job card?")) return;
    await api.delete(`/jobcards/${id}`);
    load();
  };

  const whatsapp = (jc) => {
    const lines = [
      `Hi ${jc.customer_name},`,
      `Estimate for your ${jc.model_name} (${jc.vehicle_number}):`,
      ``,
      `Complaints noted: ${jc.complaints || "General service"}`,
      `Mechanic: ${jc.assigned_mechanic_name || "—"}`,
      `Status: ${jc.status.replace("_", " ").toUpperCase()}`,
      ``,
      `We will update you as soon as work is complete.`,
      `— Ranchi Motors Workshop`,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    const phone = jc.phone.replace(/\D/g, "");
    const url = `https://wa.me/91${phone}?text=${text}`;
    window.open(url, "_blank");
    navigator.clipboard?.writeText(decodeURIComponent(text));
    toast.success("Estimate copied + WhatsApp opened");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        eyebrow="Service Workflow"
        title="Job Cards"
        actions={
          <button
            data-testid="new-jobcard-btn"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm font-bold uppercase tracking-wider text-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> {open ? "Close" : "New Job Card"}
          </button>
        }
      />

      {open && (
        <form
          onSubmit={submit}
          className="bg-white border border-slate-300 rounded-sm p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="new-jobcard-form"
        >
          <Field label="Vehicle Plate" required>
            <input
              data-testid="jc-plate"
              value={form.vehicle_number}
              onChange={(e) => setF("vehicle_number", e.target.value.toUpperCase())}
              className="input font-mono-tab uppercase tracking-widest"
              placeholder="JH01AB1234"
              required
            />
          </Field>
          <Field label="Model Name" required>
            <input
              data-testid="jc-model"
              value={form.model_name}
              onChange={(e) => setF("model_name", e.target.value)}
              className="input"
              placeholder="Hero Splendor Plus"
              required
            />
          </Field>
          <Field label="Customer Name" required>
            <input
              data-testid="jc-customer"
              value={form.customer_name}
              onChange={(e) => setF("customer_name", e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Phone Number" required>
            <input
              data-testid="jc-phone"
              value={form.phone}
              onChange={(e) => setF("phone", e.target.value)}
              className="input font-mono-tab"
              placeholder="98765 43210"
              required
            />
          </Field>
          <Field label={`Fuel Level: ${form.fuel_level}%`}>
            <input
              data-testid="jc-fuel"
              type="range"
              min="0"
              max="100"
              value={form.fuel_level}
              onChange={(e) => setF("fuel_level", Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </Field>
          <Field label="Assigned Mechanic">
            <select
              data-testid="jc-mechanic"
              value={form.assigned_mechanic_id}
              onChange={(e) => setF("assigned_mechanic_id", e.target.value)}
              className="input"
            >
              <option value="">— Unassigned —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Complaints / Symptoms" className="sm:col-span-2 lg:col-span-3">
            <textarea
              data-testid="jc-complaints"
              value={form.complaints}
              onChange={(e) => setF("complaints", e.target.value)}
              className="input min-h-[72px]"
              placeholder="Engine noise from clutch, oil leak near sump…"
            />
          </Field>
          <Field label="Scratch Map (tap zones with damage)" className="sm:col-span-2 lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {SCRATCH_ZONES.map((z) => {
                const active = form.scratch_map.includes(z);
                return (
                  <button
                    type="button"
                    key={z}
                    onClick={() =>
                      setF(
                        "scratch_map",
                        active
                          ? form.scratch_map.filter((x) => x !== z)
                          : [...form.scratch_map, z],
                      )
                    }
                    className={`text-[11px] px-2 py-2 border rounded-sm uppercase font-bold tracking-wider transition-colors ${
                      active
                        ? "bg-red-50 border-red-400 text-red-700"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {z}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Scratch Notes">
            <textarea
              value={form.scratch_notes}
              onChange={(e) => setF("scratch_notes", e.target.value)}
              className="input min-h-[72px]"
              placeholder="Dents / paint chip details…"
            />
          </Field>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="border border-slate-900 text-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="jc-save"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Job Card"}
            </button>
          </div>

          <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:2px;background:white;padding:8px 10px;color:#0f172a;outline:none;transition:border-color .1s}.input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a}`}</style>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="jc-kanban">
        {STATUSES.map((col) => {
          const list = cards.filter((c) => c.status === col.key);
          return (
            <div
              key={col.key}
              className="bg-white border border-slate-300 rounded-sm flex flex-col min-h-[300px] sm:min-h-[400px]"
              data-testid={`kanban-col-${col.key}`}
            >
              <div className="px-3 py-2 border-b border-slate-300 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {col.label}
                </div>
                <span className="font-mono-tab text-xs text-slate-500">
                  {list.length}
                </span>
              </div>
              <div className="kanban-col flex-1 p-2 space-y-2 overflow-auto max-h-[560px]">
                {list.map((jc) => (
                  <div
                    key={jc.id}
                    className="border border-slate-300 rounded-sm p-3 bg-slate-50"
                    data-testid={`jc-card-${jc.id}`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <Plate>{jc.vehicle_number}</Plate>
                      <StatusPill status={jc.status} />
                    </div>
                    <div className="font-semibold text-sm text-slate-900 mt-1">
                      {jc.model_name}
                    </div>
                    <div className="text-xs text-slate-600">
                      {jc.customer_name} · {jc.phone}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {jc.complaints}
                    </div>
                    <div className="text-[11px] font-mono-tab text-slate-500 mt-2">
                      MECH: {jc.assigned_mechanic_name || "—"} · FUEL {jc.fuel_level}%
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      <select
                        value={jc.status}
                        onChange={(e) => updateStatus(jc.id, e.target.value)}
                        data-testid={`jc-status-${jc.id}`}
                        className="text-[11px] border border-slate-300 rounded-sm px-1.5 py-1 bg-white focus:outline-none focus:border-slate-900"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => whatsapp(jc)}
                        data-testid={`jc-wa-${jc.id}`}
                        className="inline-flex items-center gap-1 text-[11px] border border-green-600 text-green-700 hover:bg-green-50 rounded-sm px-2 py-1 font-bold uppercase tracking-wider"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </button>
                      <button
                        onClick={() => remove(jc.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-red-600 border border-red-300 hover:bg-red-50 rounded-sm px-1.5 py-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {list.length === 0 && (
                  <div className="text-center text-[11px] text-slate-400 py-6 font-mono-tab uppercase">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children, required, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
