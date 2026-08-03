import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, formatDateDisplay, checkStorageSupport } from '../database/db';
import type { Employee } from '../database/db';
import { useAllSalaries } from '../hooks/useSalary';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import EmployeeForm from '../components/EmployeeForm';
import { format } from 'date-fns';
import { UserPlus, CalendarCheck, Wallet, ChevronRight, Activity, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const refresh = useForceUpdate();
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const { globalTotalDue } = useAllSalaries();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const storageStatus = checkStorageSupport();

  // Get stats
  const allEmployees = store.getEmployees();
  const activeEmployees = allEmployees.filter(e => e.status === 'active');
  const todayAttendance = store.getAttendanceByDate(todayStr);

  const activeIds = activeEmployees.map(e => e.id);
  const activeTodayAttendance = todayAttendance.filter(a => activeIds.includes(a.employeeId));

  const presentCount = activeTodayAttendance.filter(a => a.value > 0).length;
  const absentCount = activeTodayAttendance.filter(a => a.value === 0).length;
  const unmarkedCount = activeEmployees.length - activeTodayAttendance.length;

  // Employee map for name lookups
  const employeeMap = new Map<number, Employee>();
  allEmployees.forEach(e => employeeMap.set(e.id, e));

  // Recent 5 attendance logs (sorted by id desc)
  const allAttendance = store.getAttendance();
  const recentAttendance = [...allAttendance]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
    .map(r => ({
      ...r,
      employeeName: employeeMap.get(r.employeeId)?.name || 'Unknown Staff',
    }));

  // Recent 5 payments
  const allPayments = store.getPayments();
  const recentPayments = [...allPayments]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
    .map(p => ({
      ...p,
      employeeName: employeeMap.get(p.employeeId)?.name || 'Unknown Staff',
    }));

  const handleAddStaff = (data: { name: string; phone?: string; dailyWage: number; joiningDate: string; status: 'active' | 'archived' }) => {
    try {
      store.addEmployee({
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        dailyWage: Number(data.dailyWage),
        joiningDate: data.joiningDate,
        status: 'active',
      });
      setIsAddStaffOpen(false);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to add employee: ' + (err as Error).message);
    }
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
    if (val === 0) return 'text-brand-danger bg-red-950/30 border-red-900';
    if (val === 0.5) return 'text-amber-500 bg-amber-950/30 border-amber-900';
    if (val === 1) return 'text-brand-success bg-green-950/30 border-green-900';
    if (val === 1.5) return 'text-indigo-400 bg-indigo-950/30 border-indigo-900';
    if (val === 2) return 'text-purple-400 bg-purple-950/30 border-purple-900';
    return 'text-zinc-400 bg-zinc-950/30 border-zinc-900';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Storage Diagnostics Alert */}
        {!storageStatus.persistent && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 p-4 rounded-2xl flex flex-col space-y-2 shadow-sm text-brand-lightGray">
            <div className="flex items-center space-x-2 text-brand-danger font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Data Loss Risk Detected</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {storageStatus.reason === 'blocked' ? (
                <>Your browser is currently blocking local storage. Any registered staff or records will be <strong>erased completely</strong> when you close or refresh this tab. Please enable cookies and local storage in your browser settings to keep your data.</>
              ) : (
                <>You have opened this app directly from a local folder (<code>file://</code> protocol). Modern web browsers <strong>do not save data</strong> across sessions in this mode. Please run the app using a local development server (like <code>npm run dev</code>) or host it on a web server to save your records.</>
              )}
            </p>
          </div>
        )}
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col justify-between h-[100px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Staff</span>
            <span className="text-3xl font-extrabold text-white">{activeEmployees.length}</span>
          </div>

          <div className="bg-brand-yellow p-4 rounded-2xl border border-brand-yellow shadow-md flex flex-col justify-between h-[100px] text-brand-black">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-black/70">Salary Due</span>
            <span className="text-2xl font-black">₹ {(globalTotalDue || 0).toFixed(0)}</span>
          </div>

          <div className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col justify-between h-[100px]">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Present</span>
              {unmarkedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" title="Some staff unmarked" />
              )}
            </div>
            <span className="text-3xl font-extrabold text-brand-success">{presentCount}</span>
          </div>

          <div className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col justify-between h-[100px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Absent</span>
            <span className="text-3xl font-extrabold text-brand-danger">{absentCount}</span>
          </div>
        </div>

        {/* Quick Access Actions */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-550 px-1">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/attendance')}
              className="flex flex-col items-center justify-center p-3 bg-brand-darkGray border border-zinc-800 rounded-xl active:scale-[0.97] transition-all hover:bg-zinc-800 shadow-sm text-center text-brand-lightGray"
            >
              <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow mb-1.5">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold">Attendance</span>
            </button>

            <button
              onClick={() => navigate('/history')}
              className="flex flex-col items-center justify-center p-3 bg-brand-darkGray border border-zinc-800 rounded-xl active:scale-[0.97] transition-all hover:bg-zinc-800 shadow-sm text-center text-brand-lightGray"
            >
              <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow mb-1.5">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold">Pay Salary</span>
            </button>

            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="flex flex-col items-center justify-center p-3 bg-brand-darkGray border border-zinc-800 rounded-xl active:scale-[0.97] transition-all hover:bg-zinc-800 shadow-sm text-center text-brand-lightGray"
            >
              <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow mb-1.5">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold">Add Staff</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recent Activity</h2>
          </div>

          <div className="bg-brand-darkGray rounded-2xl border border-zinc-800 shadow-sm divide-y divide-zinc-800 overflow-hidden">
            <div className="p-3 bg-brand-black flex justify-between items-center border-b border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date</span>
              <span className="text-xs font-bold text-zinc-300">{format(new Date(), 'dd/MM/yyyy')}</span>
            </div>

            {recentAttendance.length > 0 ? (
              recentAttendance.map((log) => (
                <div
                  key={`att-${log.id}`}
                  onClick={() => navigate(`/employee/${log.employeeId}`)}
                  className="p-3 flex items-center justify-between active:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{log.employeeName}</div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">
                      Marked on {formatDateDisplay(log.date)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${attendanceColorClass(log.value)}`}>
                      {attendanceLabel(log.value)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-zinc-500">No attendance marked yet.</div>
            )}
          </div>

          {/* Payment Logs */}
          <div className="bg-brand-darkGray rounded-2xl border border-zinc-800 shadow-sm divide-y divide-zinc-800 overflow-hidden">
            <div className="p-3 bg-brand-black flex justify-between items-center border-b border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Recent Payments</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Wages</span>
            </div>

            {recentPayments.length > 0 ? (
              recentPayments.map((pay) => (
                <div
                  key={`pay-${pay.id}`}
                  onClick={() => navigate(`/employee/${pay.employeeId}`)}
                  className="p-3 flex items-center justify-between active:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{pay.employeeName}</div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">
                      {formatDateDisplay(pay.paymentDate)} • {pay.paymentMethod} {pay.remarks ? `• ${pay.remarks}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-black text-brand-success bg-green-950/30 border border-green-900 px-2 py-0.5 rounded">
                      ₹ {pay.amount}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-zinc-500">No salary payments yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Add New Staff">
        <EmployeeForm onSubmit={handleAddStaff} onCancel={() => setIsAddStaffOpen(false)} />
      </Modal>
    </Layout>
  );
}
