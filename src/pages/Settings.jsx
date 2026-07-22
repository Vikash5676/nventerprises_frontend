import { useEffect, useRef, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { PageHeader } from "@/components/app/ui";
import { Save, Upload, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { shop, save } = useShop();
  const [form, setForm] = useState(shop);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm(shop);
  }, [shop]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) {
      toast.error("Logo must be under 400 KB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setF("logo_base64", reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save(form);
      toast.success("Shop settings updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Shop Identity · Branding"
        title="Settings"
        actions={null}
      />

      <form
        onSubmit={submit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        data-testid="settings-form"
      >
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-sm p-6 space-y-4">
          <div>
            <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500 mb-1">
              Branding
            </div>
            <h2 className="font-display font-bold text-xl uppercase tracking-tight text-slate-900">
              Shop Identity
            </h2>
          </div>

          <F label="Shop Name">
            <input
              data-testid="set-name"
              required
              className="input"
              value={form.name || ""}
              onChange={(e) => setF("name", e.target.value)}
            />
          </F>
          <F label="Tagline">
            <input
              data-testid="set-tagline"
              className="input"
              value={form.tagline || ""}
              onChange={(e) => setF("tagline", e.target.value)}
              placeholder="e.g. Trusted since 1998"
            />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Phone">
              <input
                className="input font-mono-tab"
                value={form.phone || ""}
                onChange={(e) => setF("phone", e.target.value)}
              />
            </F>
            <F label="State (GST)">
              <input
                className="input"
                value={form.state || ""}
                onChange={(e) => setF("state", e.target.value)}
              />
            </F>
          </div>
          <F label="GSTIN">
            <input
              className="input font-mono-tab"
              value={form.gstin || ""}
              onChange={(e) => setF("gstin", e.target.value)}
            />
          </F>
          <F label="Address">
            <textarea
              className="input min-h-[68px]"
              value={form.address || ""}
              onChange={(e) => setF("address", e.target.value)}
            />
          </F>

          <button
            type="submit"
            disabled={saving}
            data-testid="set-save"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-6">
          <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500 mb-1">
            Logo
          </div>
          <h2 className="font-display font-bold text-xl uppercase tracking-tight text-slate-900 mb-4">
            Shop Logo
          </h2>

          <div className="aspect-square border border-dashed border-slate-300 rounded-sm flex items-center justify-center bg-slate-50 overflow-hidden mb-3">
            {form.logo_base64 ? (
              <img
                src={form.logo_base64}
                alt="Shop logo preview"
                className="max-w-full max-h-full object-contain"
                data-testid="set-logo-preview"
              />
            ) : (
              <div className="text-center p-6">
                <Store className="w-10 h-10 mx-auto text-slate-400" strokeWidth={1.5} />
                <div className="mt-2 text-xs font-mono-tab uppercase tracking-widest text-slate-500">
                  No logo uploaded
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onLogo}
            data-testid="set-logo-input"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              data-testid="set-logo-upload"
              className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-900 text-slate-900 py-2 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            {form.logo_base64 && (
              <button
                type="button"
                onClick={() => setF("logo_base64", "")}
                className="inline-flex items-center gap-1 border border-red-300 text-red-700 hover:bg-red-50 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="mt-3 text-[10px] font-mono-tab uppercase tracking-widest text-slate-500">
            Recommended: PNG · 200×200 · max 400 KB
          </div>
        </div>
      </form>

      <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:2px;background:white;padding:8px 10px;color:#0f172a;outline:none;font-size:14px}.input:focus{border-color:#0f172a;box-shadow:0 0 0 1px #0f172a}`}</style>
    </div>
  );
}

const F = ({ label, children }) => (
  <label className="block">
    <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 mb-1">
      {label}
    </span>
    {children}
  </label>
);
