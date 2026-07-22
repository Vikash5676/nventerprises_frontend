export function PageHeader({ eyebrow, title, actions }) {
  return (
    <div className="flex items-end justify-between border-b border-slate-300 pb-4 mb-6">
      <div>
        <div className="text-[11px] font-mono-tab uppercase tracking-widest text-slate-500 mb-1">
          {eyebrow}
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight text-slate-900">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    checked_in: ["Checked In", "bg-slate-100 text-slate-800 border-slate-300"],
    in_progress: ["In Progress", "bg-amber-50 text-amber-800 border-amber-300"],
    ready: ["Ready", "bg-emerald-50 text-emerald-800 border-emerald-300"],
    invoiced: ["Invoiced", "bg-blue-50 text-blue-800 border-blue-300"],
  };
  const [label, cls] = map[status] || [status, "bg-slate-100 text-slate-800 border-slate-300"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-sm ${cls}`}
    >
      {label}
    </span>
  );
}

export function Plate({ children }) {
  return (
    <span className="font-mono-tab font-bold text-slate-900 bg-yellow-100 border border-slate-900 px-1.5 py-0.5 text-xs tracking-widest">
      {children}
    </span>
  );
}
