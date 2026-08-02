import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store, formatDateDisplay } from '../database/db';
import { useEmployeeSalary } from '../hooks/useSalary';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import EmployeeForm from '../components/EmployeeForm';
import PaymentForm from '../components/PaymentForm';
import {
  Phone,
  Calendar,
  AlertTriangle,
  Trash2,
  Archive,
  RotateCcw,
  Edit2,
  CalendarDays,
  CreditCard
} from 'lucide-react';

export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const refresh = useForceUpdate();
  const empId = id ? Number(id) : undefined;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const employee = empId !== undefined ? store.getEmployee(empId) : undefined;
  const salary = useEmployeeSalary(empId);

  if (!employee || empId === undefined) {
    return (
      <Layout title="Staff Details" showBack>
        <div className="bg-brand-darkGray p-8 rounded-2xl border border-zinc-800 text-center text-sm text-zinc-400">
          Staff member not found.
        </div>
      </Layout>
    );
  }

  const attendance = store.getAttendanceByEmployee(empId);
  const payments = store.getPaymentsByEmployee(empId);

  // Sort descending
  attendance.sort((a, b) => b.date.localeCompare(a.date));
  payments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const stats = {
    present: attendance.filter(a => a.value === 1).length,
    halfDay: attendance.filter(a => a.value === 0.5).length,
    absent: attendance.filter(a => a.value === 0).length,
    ot15: attendance.filter(a => a.value === 1.5).length,
    ot20: attendance.filter(a => a.value === 2).length,
  };

  const handleEditSubmit = (data: {
    name: string;
    phone?: string;
    dailyWage: number;
    joiningDate: string;
    status: 'active' | 'archived';
  }) => {
    store.updateEmployee(empId, {
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      dailyWage: Number(data.dailyWage),
      joiningDate: data.joiningDate,
      status: data.status,
    });
    setIsEditOpen(false);
    refresh();
  };

  const handlePaymentSubmit = (data: {
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank';
    remarks?: string;
  }) => {
    store.addPayment({
      employeeId: empId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      remarks: data.remarks || undefined,
    });
    setIsPaymentOpen(false);
    refresh();
  };

  const handleToggleArchive = () => {
    const nextStatus = employee.status === 'active' ? 'archived' : 'active';
    store.updateEmployee(empId, { status: nextStatus });
    refresh();
  };

  const handlePermanentDelete = () => {
    store.deleteEmployee(empId);
    setIsDeleteConfirmOpen(false);
    navigate('/');
  };

  const attendanceLabel = (val: number) => {
    if (val === 0) return 'Absent';
    if (val === 0.5) return 'Half Day';
    if (val === 1) return 'Present';
    if (val === 1.5) return 'OT 1.5';
    if (val === 2) return 'OT 2.0';
    return '';
  };

  const attendanceColorClass = (val: number) => {
    if (val === 0) return 'text-brand-danger bg-red-955/30 border-red-900';
    if (val === 0.5) return 'text-amber-500 bg-amber-955/30 border-amber-900';
    if (val === 1) return 'text-brand-success bg-green-955/30 border-green-900';
    if (val === 1.5) return 'text-indigo-400 bg-indigo-955/30 border-indigo-905';
    if (val === 2) return 'text-purple-400 bg-purple-955/30 border-purple-900';
    return 'text-zinc-400 bg-zinc-955/30 border-zinc-900';
  };

  return (
    <Layout title={employee.name} showBack>
      <div className="space-y-6">
        {/* Employee Card */}
        <div className="bg-brand-darkGray p-5 rounded-2xl border border-zinc-800 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">{employee.name}</h2>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  employee.status === 'active'
                    ? 'text-brand-success bg-green-950/30 border-green-900'
                    : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                }`}>
                  {employee.status}
                </span>
              </div>
              <div className="flex items-center text-xs text-zinc-400 mt-1 space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Joined {formatDateDisplay(employee.joiningDate)}</span>
              </div>
            </div>
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 border border-zinc-800 rounded-xl hover:bg-zinc-800 active:scale-95 transition-all text-zinc-400"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {employee.phone && (
            <a
              href={`tel:${employee.phone}`}
              className="flex items-center space-x-2 text-xs font-bold text-zinc-300 bg-brand-black p-2.5 rounded-xl border border-zinc-700 active:scale-[0.98] transition-transform w-fit"
            >
              <Phone className="w-4 h-4 text-zinc-500" />
              <span>Call: {employee.phone}</span>
            </a>
          )}
        </div>

        {/* Salary Ledger */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">Salary Ledger</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-brand-yellow p-3 rounded-xl border border-brand-yellow text-brand-black">
              <div className="text-[8px] font-bold uppercase tracking-widest text-brand-black/75">Due</div>
              <div className="text-base font-extrabold mt-1 truncate">₹{salary.remainingDue.toFixed(0)}</div>
            </div>
            <div className="bg-brand-darkGray p-3 rounded-xl border border-zinc-800">
              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Paid</div>
              <div className="text-base font-extrabold text-brand-success mt-1 truncate">₹{salary.totalPaid.toFixed(0)}</div>
            </div>
            <div className="bg-brand-darkGray p-3 rounded-xl border border-zinc-800">
              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Earned</div>
              <div className="text-base font-extrabold text-zinc-300 mt-1 truncate">₹{salary.totalEarned.toFixed(0)}</div>
            </div>
          </div>
          <button
            onClick={() => setIsPaymentOpen(true)}
            className="w-full mt-2 py-3.5 bg-brand-yellow hover:bg-yellow-400 text-brand-black font-extrabold uppercase rounded-xl active:scale-[0.98] transition-all text-xs tracking-wider flex items-center justify-center space-x-1.5 shadow-md"
          >
            <CreditCard className="w-4.5 h-4.5 mr-1" />
            <span>Pay Salary</span>
          </button>
        </div>

        {/* Attendance Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">Attendance Breakdown</h3>
          <div className="grid grid-cols-5 gap-1">
            <div className="bg-brand-darkGray py-2 px-1 rounded-lg border border-zinc-800 text-center">
              <div className="text-[9px] font-bold text-brand-success uppercase">Present</div>
              <div className="text-base font-black text-white mt-0.5">{stats.present}</div>
            </div>
            <div className="bg-brand-darkGray py-2 px-1 rounded-lg border border-zinc-800 text-center">
              <div className="text-[9px] font-bold text-amber-500 uppercase">Half</div>
              <div className="text-base font-black text-white mt-0.5">{stats.halfDay}</div>
            </div>
            <div className="bg-brand-darkGray py-2 px-1 rounded-lg border border-zinc-800 text-center">
              <div className="text-[9px] font-bold text-indigo-400 uppercase">OT 1.5</div>
              <div className="text-base font-black text-white mt-0.5">{stats.ot15}</div>
            </div>
            <div className="bg-brand-darkGray py-2 px-1 rounded-lg border border-zinc-800 text-center">
              <div className="text-[9px] font-bold text-purple-400 uppercase">OT 2.0</div>
              <div className="text-base font-black text-white mt-0.5">{stats.ot20}</div>
            </div>
            <div className="bg-brand-darkGray py-2 px-1 rounded-lg border border-zinc-800 text-center">
              <div className="text-[9px] font-bold text-brand-danger uppercase">Absent</div>
              <div className="text-base font-black text-white mt-0.5">{stats.absent}</div>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-1 px-1">
              <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Attendance Log</h3>
            </div>
            <div className="bg-brand-darkGray border border-zinc-800 rounded-xl max-h-[220px] overflow-y-auto divide-y divide-zinc-700 shadow-sm no-scrollbar">
              {attendance.length > 0 ? (
                attendance.map((att) => (
                  <div key={att.id} className="p-2.5 flex flex-col justify-between space-y-1">
                    <span className="text-[10px] font-extrabold text-white">{formatDateDisplay(att.date)}</span>
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${attendanceColorClass(att.value)}`}>
                        {attendanceLabel(att.value)}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">₹{(att.value * att.dailyWage).toFixed(0)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-[11px] text-zinc-500">No attendance marked.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-1 px-1">
              <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Payment Log</h3>
            </div>
            <div className="bg-brand-darkGray border border-zinc-800 rounded-xl max-h-[220px] overflow-y-auto divide-y divide-zinc-700 shadow-sm no-scrollbar">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <div key={p.id} className="p-2.5 flex flex-col justify-between space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-white">{formatDateDisplay(p.paymentDate)}</span>
                      <span className="text-[10px] font-extrabold text-brand-success">₹{p.amount}</span>
                    </div>
                    <div className="text-[8px] font-bold text-zinc-500 truncate uppercase">
                      {p.paymentMethod} {p.remarks ? `• ${p.remarks}` : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-[11px] text-zinc-500">No payouts logged.</div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <button
            onClick={handleToggleArchive}
            className="w-full py-3 bg-brand-black hover:bg-zinc-800 text-white font-bold uppercase rounded-xl border border-zinc-700 active:scale-[0.98] transition-all text-xs tracking-wider flex items-center justify-center space-x-2"
          >
            {employee.status === 'active' ? (
              <><Archive className="w-4 h-4 text-zinc-400" /><span>Archive Staff</span></>
            ) : (
              <><RotateCcw className="w-4 h-4 text-zinc-400" /><span>Restore Staff</span></>
            )}
          </button>

          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="w-full py-3 bg-red-950/20 hover:bg-red-950/30 text-brand-danger font-bold uppercase rounded-xl border border-red-900/60 active:scale-[0.98] transition-all text-xs tracking-wider flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" /><span>Delete Permanently</span>
          </button>
        </div>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Staff Profile">
        <EmployeeForm initialData={employee} onSubmit={handleEditSubmit} onCancel={() => setIsEditOpen(false)} />
      </Modal>

      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Pay Staff Salary">
        <PaymentForm
          employeeName={employee.name}
          currentDue={salary.remainingDue}
          onSubmit={handlePaymentSubmit}
          onCancel={() => setIsPaymentOpen(false)}
        />
      </Modal>

      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
        <div className="space-y-4 text-brand-lightGray">
          <div className="flex items-center space-x-2 text-brand-danger bg-red-950/30 p-3 rounded-lg border border-red-900">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Destructive Action</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Are you sure you want to permanently delete <strong>{employee.name}</strong>? This will delete all attendance and payment logs. This <strong>cannot be undone</strong>.
          </p>
          <div className="flex space-x-3 pt-2">
            <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 bg-zinc-800 text-brand-lightGray font-semibold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Cancel</button>
            <button onClick={handlePermanentDelete} className="flex-1 py-3 bg-brand-danger text-white font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Delete</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
