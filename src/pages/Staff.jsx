import { useEffect, useState } from "react";
import { api, formatINR, todayISO, monthISO } from "@/lib/api";
import { PageHeader } from "@/components/app/ui";
import { Plus, Trash2, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [showStaff, setShowStaff] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  
  // Track editing state
  const [editingId, setEditingId] = useState(null);
  const [staffForm, setStaffForm] = useState({ 
    name: "", 
    role: "Mechanic", 
    phone: "", 
    base_salary: 0, 
    commission_pct: 0, 
    pin: "" 
  });
  const [advForm, setAdvForm] = useState({ staff_id: "", amount: 0, date: todayISO(), note: "" });

  const loadAll = async () => {
    const [s, a, adv, pr] = await Promise.all([
      api.get("/staff"),
      api.get("/attendance", { params: { date } }),
      api.get("/advances"),
      api.get("/payroll", { params: { month } }),
    ]);
    setStaff(s.data);
    setAttendance(a.data);
    setAdvances(adv.data);
    setPayroll(pr.data);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, [date, month]);

  const isPresent = (sid) => attendance.find((a) => a.staff_id === sid)?.present ?? false;

  const toggleAttendance = async (sid) => {
    const present = !isPresent(sid);
    await api.post("/attendance/toggle", { staff_id: sid, date, present });
    loadAll();
  };

  const resetStaffForm = () => {
    setStaffForm({ name: "", role: "Mechanic", phone: "", base_salary: 0, commission_pct: 0, pin: "" });
    setEditingId(null);
    setShowStaff(false);
  };

  const handleEdit = (member) => {
    setEditingId(member.id);
    setStaffForm({
      name: member.name || "",
      role: member.role || "Mechanic",
      phone: member.phone || "",
      base_salary: member.base_salary || 0,
      commission_pct: member.commission_pct || 0,
      pin: member.pin || "",
    });
    setShowStaff(true);
  };

  const saveStaff = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/staff/${editingId}`, staffForm);
      toast.success("Staff updated");
    } else {
      await api.post("/staff", staffForm);
      toast.success("Staff added");
    }
    resetStaffForm();
    loadAll();
  };

  const addAdvance = async (e) => {
    e.preventDefault();
    if (!advForm.staff_id) return toast.error("Select staff");
    await api.post("/advances", advForm);
    setAdvForm({ staff_id: "", amount: 0, date: todayISO(), note: "" });
    setShowAdv(false);
    toast.success("Advance recorded");
    loadAll();
  };

  const removeStaff = async (id) => {
    if (!window.confirm("Delete staff member?")) return;
    await api.delete(`/staff/${id}`);
    loadAll();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader
        eyebrow="Attendance · Commissions · Payroll"
        title="Staff & Payroll"
        actions={
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setShowAdv((v) => !v)} 
              className="border border-slate-900 text-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-100" 
              data-testid="new-adv-btn"
            >
              <Plus className="inline w-3 h-3 mr-1" /> Advance
            </button>
            <button 
              onClick={() => {
                if (showStaff && editingId) {
                  resetStaffForm();
                } else {
                  resetStaffForm();
                  setShowStaff((v) => !v);
                }
              }} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors" 
              data-testid="new-staff-btn"
            >
              <UserPlus className="inline w-3.5 h-3.5 mr-1" /> {showStaff && editingId ? "Add Staff" : "Add Staff"}
            </button>
          </div>
        }
      />

      {showStaff && (
        <form onSubmit={saveStaff} data-testid="staff-form" className="bg-white border border-slate-300 rounded-sm p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <F label="Name" span="sm:col-span-2">
            <input required data-testid="staff-name" className="input" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
          </F>
          <F label="Role">
            <input className="input" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} />
          </F>
          <F label="Phone">
            <input className="input font-mono-tab" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
          </F>
          <F label="Base Salary">
            <input type="number" step="0.01" className="input font-mono-tab" value={staffForm.base_salary} onChange={(e) => setStaffForm({ ...staffForm, base_salary: Number(e.target.value) })} />
          </F>
          <F label="Commission %">
            <input type="number" step="1" className="input font-mono-tab" value={staffForm.commission_pct} onChange={(e) => setStaffForm({ ...staffForm, commission_pct: Number(e.target.value) })} />
          </F>
          <F label="Mobile PIN (4-digit)">
            <input maxLength="4" pattern="[0-9]{4}" data-testid="staff-pin" className="input font-mono-tab tracking-widest" placeholder="1005" value={staffForm.pin} onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value.replace(/\D/g, "") })} />
          </F>
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2">
            <button type="button" onClick={resetStaffForm} className="border border-slate-300 text-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-slate-50">
              Cancel
            </button>
            <button data-testid="staff-save" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm">
              {editingId ? "Update Staff" : "Save Staff"}
            </button>
          </div>
        </form>
      )}

      {showAdv && (
        <form onSubmit={addAdvance} className="bg-white border border-slate-300 rounded-sm p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <F label="Staff" span="sm:col-span-2">
            <select className="input" value={advForm.staff_id} onChange={(e) => setAdvForm({ ...advForm, staff_id: e.target.value })}>
              <option value="">— Pick staff —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </F>
          <F label="Amount">
            <input type="number" step="0.01" className="input font-mono-tab" value={advForm.amount} onChange={(e) => setAdvForm({ ...advForm, amount: Number(e.target.value) })} />
          </F>
          <F label="Date">
            <input type="date" className="input font-mono-tab" value={advForm.date} onChange={(e) => setAdvForm({ ...advForm, date: e.target.value })} />
          </F>
          <F label="Note">
            <input className="input" value={advForm.note} onChange={(e) => setAdvForm({ ...advForm, note: e.target.value })} />
          </F>
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-sm">
              Save Advance
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-300 rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between gap-2">
            <div className="font-display font-bold uppercase text-slate-900 tracking-tight text-sm">Attendance</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-sm px-2 py-1 text-xs font-mono-tab shrink-0" />
          </div>
          <div className="overflow-auto">
            <table className="sharp text-sm" data-testid="attendance-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hidden sm:table-cell">Role</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const present = isPresent(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="font-semibold">
                        {s.name}
                        <span className="block text-[10px] text-slate-500 sm:hidden">{s.role}</span>
                      </td>
                      <td className="text-slate-700 hidden sm:table-cell">{s.role}</td>
                      <td className="text-right">
                        <button
                          onClick={() => toggleAttendance(s.id)}
                          data-testid={`attn-${s.id}`}
                          className={`px-3 py-1 text-[11px] font-bold uppercase tracking-widest border rounded-sm transition-colors ${
                            present
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                              : "bg-red-50 border-red-300 text-red-700"
                          }`}
                        >
                          {present ? "Present" : "Absent"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center text-slate-500 py-6">
                      No staff yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-300 flex items-center justify-between gap-2">
            <div className="font-display font-bold uppercase text-slate-900 tracking-tight text-sm">Monthly Payroll</div>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-slate-300 rounded-sm px-2 py-1 text-xs font-mono-tab shrink-0" data-testid="payroll-month" />
          </div>
          <div className="overflow-auto">
            <table className="sharp text-sm" data-testid="payroll-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="text-right">Days</th>
                  <th className="text-right hidden sm:table-cell">Base</th>
                  <th className="text-right hidden sm:table-cell">Comm.</th>
                  <th className="text-right hidden sm:table-cell">Adv.</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((p) => (
                  <tr key={p.staff_id}>
                    <td>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">{p.role}</div>
                    </td>
                    <td className="text-right font-mono-tab">{p.present_days}</td>
                    <td className="text-right font-mono-tab hidden sm:table-cell">{formatINR(p.prorated_base)}</td>
                    <td className="text-right font-mono-tab text-emerald-700 hidden sm:table-cell">+{formatINR(p.commission)}</td>
                    <td className="text-right font-mono-tab text-red-700 hidden sm:table-cell">−{formatINR(p.advances)}</td>
                    <td className="text-right font-mono-tab font-black text-slate-900">
                      {formatINR(p.net_payable)}
                    </td>
                  </tr>
                ))}
                {payroll.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-500 py-6">
                      No payroll data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-sm mt-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-300 font-display font-bold uppercase text-slate-900 tracking-tight text-sm">
          Staff Directory
        </div>
        <div className="overflow-auto">
          <table className="sharp text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden sm:table-cell">Role</th>
                <th className="hidden md:table-cell">Phone</th>
                <th className="text-right">Base</th>
                <th className="text-right hidden sm:table-cell">Comm. %</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">
                    {s.name}
                    <span className="block text-[10px] text-slate-500 sm:hidden">{s.role} · {s.phone || "—"}</span>
                  </td>
                  <td className="hidden sm:table-cell">{s.role}</td>
                  <td className="font-mono-tab hidden md:table-cell">{s.phone || "—"}</td>
                  <td className="text-right font-mono-tab">{formatINR(s.base_salary)}</td>
                  <td className="text-right font-mono-tab hidden sm:table-cell">{s.commission_pct}%</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(s)} className="text-slate-400 hover:text-blue-600" title="Edit Staff">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeStaff(s.id)} className="text-slate-400 hover:text-red-600" title="Delete Staff">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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