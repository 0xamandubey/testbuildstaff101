import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../database/db';
import type { Employee } from '../database/db';
import { useEmployeeSalary } from '../hooks/useSalary';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { Search, CreditCard, ClipboardCheck, Plus, CheckCircle2, User, Wallet } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type FilterType = 'today' | 'week' | 'month' | 'custom-date' | 'custom-range';

export default function HistoryPage() {
  const navigate = useNavigate();
  const refresh = useForceUpdate();
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments'>('attendance');
  const [filter, setFilter] = useState<FilterType>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Selected staff checklist state
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [lastEmpCount, setLastEmpCount] = useState(0);

  // Payment Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payEmployeeId, setPayEmployeeId] = useState<number | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [payRemarks, setPayRemarks] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getBounds = (): { start: string; end: string } => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    switch (filter) {
      case 'today': return { start: todayStr, end: todayStr };
      case 'week': return {
        start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
      case 'month': return {
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
      case 'custom-date': return { start: customDate, end: customDate }; // fallback, overridden below
      case 'custom-range': return { start: fromDate, end: toDate };
    }
  };

  const bounds = getBounds();

  // Build employee list and map
  const employees = store.getEmployees();
  const employeeMap = new Map<number, Employee>();
  employees.forEach(e => employeeMap.set(e.id, e));

  // Auto-select all staff on initial load or counts changes
  if (employees.length > 0 && lastEmpCount !== employees.length) {
    setSelectedStaffIds(new Set(employees.map(e => e.id)));
    setLastEmpCount(employees.length);
  }

  // Determine date ranges per employee for 'custom-date'
  const getEmployeePeriod = (emp: Employee, customDateStr: string): { start: string; end: string } => {
    const payments = store.getPaymentsByEmployee(emp.id)
      .filter(p => p.paymentDate <= customDateStr)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const start = payments[0]?.paymentDate || emp.joiningDate;
    return { start, end: customDateStr };
  };

  // Fetch attendance and payments depending on filter type
  const getPeriodData = () => {
    let attendanceRecords: ReturnType<typeof store.getAttendance> = [];
    let paymentRecords: ReturnType<typeof store.getPayments> = [];

    if (filter === 'custom-date') {
      employees.forEach(emp => {
        const range = getEmployeePeriod(emp, customDate);
        const empAttendance = store.getAttendanceByEmployee(emp.id)
          .filter(a => a.date >= range.start && a.date <= range.end);
        attendanceRecords.push(...empAttendance);

        const empPayments = store.getPaymentsByEmployee(emp.id)
          .filter(p => p.paymentDate >= range.start && p.paymentDate <= range.end);
        paymentRecords.push(...empPayments);
      });
    } else {
      attendanceRecords = store.getAttendanceInRange(bounds.start, bounds.end);
      paymentRecords = store.getPaymentsInRange(bounds.start, bounds.end);
    }

    return { attendanceRecords, paymentRecords };
  };

  const { attendanceRecords, paymentRecords } = getPeriodData();

  // Calculate salary details for the selected period
  const periodEarned = attendanceRecords.reduce((sum, r) => sum + r.value * r.dailyWage, 0);
  const periodPaid = paymentRecords.reduce((sum, p) => sum + p.amount, 0);
  const periodNet = periodEarned - periodPaid;

  // Aggregate stats per employee for the period
  const aggregatedEmployees = employees.map(emp => {
    const empAttendance = attendanceRecords.filter(a => a.employeeId === emp.id);
    const totalDays = empAttendance.reduce((sum, a) => sum + a.value, 0);
    const totalSalary = empAttendance.reduce((sum, a) => sum + (a.value * a.dailyWage), 0);

    const empPayments = paymentRecords.filter(p => p.employeeId === emp.id);
    const paymentReceived = empPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      id: emp.id,
      name: emp.name,
      dailyWage: emp.dailyWage,
      status: emp.status,
      totalDays,
      totalSalary,
      paymentReceived,
      calculatedSalary: totalSalary - paymentReceived,
    };
  });

  // Filter logs for list display
  let filteredLogs: Array<Record<string, any>> = [];

  if (activeTab === 'attendance') {
    filteredLogs = aggregatedEmployees.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (item.status === 'active') return true;
      return item.totalDays > 0 || item.paymentReceived > 0; // Show archived only if active in period
    });
  } else {
    const sortedPayments = [...paymentRecords].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.id - a.id);
    filteredLogs = sortedPayments.map(p => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: employeeMap.get(p.employeeId)?.name || 'Deleted Employee',
      paymentDate: p.paymentDate,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      remarks: p.remarks,
    }));

    if (searchQuery) {
      filteredLogs = filteredLogs.filter(log =>
        (log.employeeName as string).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }

  // Handle Select / Deselect actions
  const handleToggleSelect = (empId: number) => {
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const visibleIds = activeTab === 'attendance' ? filteredLogs.map(item => item.id) : [];
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStaffIds.has(id));

  const handleToggleAll = () => {
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Calculate sum of dues for selected staff
  const totalDuesForSelected = aggregatedEmployees
    .filter(item => selectedStaffIds.has(item.id))
    .reduce((sum, item) => sum + item.calculatedSalary, 0);

  // Get details for currently selected payee in modal
  const selectedPayeeSalary = useEmployeeSalary(payEmployeeId !== '' ? payEmployeeId : undefined);

  const handlePayeeChange = (empId: number | '') => {
    setPayEmployeeId(empId);
    if (empId !== '') {
      const summary = store.getAttendanceByEmployee(empId).reduce((sum, r) => sum + (r.value * r.dailyWage), 0) -
                      store.getPaymentsByEmployee(empId).reduce((sum, p) => sum + p.amount, 0);
      setPayAmount(summary > 0 ? summary.toString() : '');
    } else {
      setPayAmount('');
    }
  };

  const handlePaymentSubmit = () => {
    if (payEmployeeId === '') {
      alert('Please select an employee.');
      return;
    }
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    store.addPayment({
      employeeId: payEmployeeId,
      amount,
      paymentDate: payDate,
      paymentMethod: payMethod,
      remarks: payRemarks.trim() || undefined,
    });

    setIsPaymentOpen(false);
    setPayEmployeeId('');
    setPayAmount('');
    setPayRemarks('');
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setPayMethod('Cash');

    setToastMessage('Payment logged successfully!');
    setTimeout(() => setToastMessage(null), 2500);
    refresh();
  };

  return (
    <Layout>
      <div className="space-y-4 pb-16">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg border bg-green-955/60 border-green-900 text-brand-success text-xs font-bold uppercase tracking-wider z-50 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Calculated Salary Metrics */}
        <div className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block px-0.5">
            Salary Summary for Selected Period
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-brand-black p-2.5 rounded-xl border border-zinc-850">
              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Earned</div>
              <div className="text-sm font-black text-white mt-1">₹ {periodEarned.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-brand-black p-2.5 rounded-xl border border-zinc-850">
              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Paid</div>
              <div className="text-sm font-black text-brand-success mt-1">₹ {periodPaid.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-brand-black p-2.5 rounded-xl border border-zinc-850">
              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Net Due</div>
              <div className={`text-sm font-black mt-1 ${periodNet > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
                ₹ {periodNet.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-brand-darkGray p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => { setActiveTab('attendance'); setSearchQuery(''); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'attendance' ? 'bg-brand-black text-brand-yellow font-extrabold' : 'text-zinc-400 active:bg-zinc-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Attendance Summary</span>
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'payments' ? 'bg-brand-black text-brand-yellow font-extrabold' : 'text-zinc-400 active:bg-zinc-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Receipts</span>
          </button>
        </div>

        {/* Date Filters */}
        <div className="bg-brand-darkGray p-3 rounded-2xl border border-zinc-800 shadow-sm space-y-3">
          <div className="grid grid-cols-5 gap-1">
            {(['today', 'week', 'month', 'custom-date', 'custom-range'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg border text-center transition-all ${
                  filter === type
                    ? 'bg-brand-yellow border-brand-yellow text-brand-black font-extrabold'
                    : 'bg-brand-black border-zinc-700 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                {type.replace('-', ' ')}
              </button>
            ))}
          </div>

          {filter === 'custom-date' && (
            <div className="flex flex-col space-y-1 pt-1.5 border-t border-zinc-800">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Target Date</label>
                <span className="text-[9px] text-zinc-500 font-semibold uppercase">(Logs from last payment to date)</span>
              </div>
              <input
                type="date"
                value={customDate}
                onChange={(e) => e.target.value && setCustomDate(e.target.value)}
                className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[40px] text-white"
              />
            </div>
          )}

          {filter === 'custom-range' && (
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-800">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => e.target.value && setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[40px] text-white"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => e.target.value && setToDate(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[40px] text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search + Action */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-555" />
            <input
              type="text"
              placeholder="Search staff name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-brand-darkGray border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm font-medium h-[44px] text-white placeholder-zinc-500"
            />
          </div>
          <button
            onClick={() => setIsPaymentOpen(true)}
            className="h-[44px] px-4 bg-brand-yellow text-brand-black font-extrabold uppercase rounded-xl active:scale-[0.98] transition-all text-xs tracking-wider shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Pay Salary</span>
          </button>
        </div>

        {/* Inline Toggle All Control */}
        {activeTab === 'attendance' && filteredLogs.length > 0 && (
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff Summary</span>
            <button
              onClick={handleToggleAll}
              className="text-[9px] font-extrabold text-brand-yellow hover:text-yellow-400 uppercase tracking-wider bg-brand-black px-2.5 py-1 rounded border border-zinc-800 transition-colors"
            >
              {allVisibleSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}

        {/* List Logs container */}
        <div className="space-y-2.5">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              if (activeTab === 'attendance') {
                const isSelected = selectedStaffIds.has(log.id);
                return (
                  <div
                    key={`emp-${log.id}`}
                    onClick={() => handleToggleSelect(log.id)}
                    className={`p-3 rounded-xl border shadow-sm transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-brand-yellow/50 opacity-100 bg-brand-darkGray'
                        : 'border-zinc-900 opacity-40 hover:opacity-50 bg-brand-darkGray/60'
                    }`}
                  >
                    {/* Small Checkmark Indicator in top right */}
                    <div className="absolute top-3 right-3">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-brand-yellow border-brand-yellow text-brand-black'
                          : 'border-zinc-700'
                      }`}>
                        {isSelected && (
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center pr-6">
                        <span
                          onClick={(e) => {
                            e.stopPropagation(); // Navigate without toggling selection
                            navigate(`/employee/${log.id}`);
                          }}
                          className="font-bold text-xs text-white hover:text-brand-yellow transition-colors flex items-center"
                          title="View Profile / Logs"
                        >
                          <User className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                          {log.name}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-bold">₹{log.dailyWage}/day</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
                        <div>
                          <span className="text-zinc-550 block uppercase text-[8px] font-bold tracking-wider">Days</span>
                          <span className="text-zinc-300 font-bold">{log.totalDays}</span>
                        </div>
                        <div>
                          <span className="text-zinc-555 block uppercase text-[8px] font-bold tracking-wider">Earned</span>
                          <span className="text-zinc-300 font-bold">₹{log.totalSalary.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-zinc-555 block uppercase text-[8px] font-bold tracking-wider">Paid</span>
                          <span className="text-zinc-300 font-bold">₹{log.paymentReceived.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-555 block uppercase text-[8px] font-bold tracking-wider">Due</span>
                          <span className={`font-black ${log.calculatedSalary > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
                            ₹{log.calculatedSalary.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={`pay-${log.id}`} className="bg-brand-darkGray px-4 py-3 rounded-xl border border-zinc-800 shadow-sm flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-xs text-white truncate">{log.employeeName}</h4>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mt-0.5">
                        {log.paymentDate} • {log.paymentMethod} {log.remarks ? `• ${log.remarks}` : ''}
                      </span>
                    </div>
                    <span className="text-xs font-black text-brand-success bg-green-955/30 border border-green-900 px-2 py-0.5 rounded flex-shrink-0">
                      ₹ {log.amount}
                    </span>
                  </div>
                );
              }
            })
          ) : (
            <div className="bg-brand-darkGray p-8 rounded-2xl border border-zinc-800 text-center text-sm text-zinc-500">
              No matching records found.
            </div>
          )}
        </div>

        {/* Selected Staff Dues Summary Banner */}
        {activeTab === 'attendance' && filteredLogs.length > 0 && (
          <div className="bg-brand-yellow p-4 rounded-2xl border border-brand-yellow shadow-md text-brand-black flex justify-between items-center mt-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-brand-black/70">
                Selected Staff Dues ({selectedStaffIds.size} selected)
              </span>
              <div className="text-xl font-black mt-0.5">
                ₹ {totalDuesForSelected.toLocaleString('en-IN')}
              </div>
            </div>
            {totalDuesForSelected > 0 && (
              <button
                onClick={() => {
                  const firstWithDues = filteredLogs.find(item => selectedStaffIds.has(item.id) && item.calculatedSalary > 0);
                  if (firstWithDues) {
                    handlePayeeChange(firstWithDues.id);
                  }
                  setIsPaymentOpen(true);
                }}
                className="px-4 py-2 bg-brand-black text-white font-extrabold uppercase rounded-xl active:scale-[0.98] transition-all text-[10px] tracking-wider shadow flex items-center space-x-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Pay Dues</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pay Salary Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Record Salary Payment">
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest">Select Staff Member *</label>
            <select
              value={payEmployeeId}
              onChange={(e) => handlePayeeChange(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            >
              <option value="">-- Choose Staff --</option>
              {employees.filter(e => e.status === 'active').map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {payEmployeeId !== '' && (
            <div className="bg-brand-black p-3 rounded-xl border border-zinc-800 space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Outstanding Ledger Balance</span>
              <div className={`text-base font-extrabold ${selectedPayeeSalary.remainingDue > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
                ₹ {selectedPayeeSalary.remainingDue.toLocaleString('en-IN')} Due
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest">Amount (₹) *</label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest">Payment Date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => e.target.value && setPayDate(e.target.value)}
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'UPI', 'Bank'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayMethod(method)}
                  className={`py-2 text-xs font-bold uppercase rounded-lg border text-center transition-all ${
                    payMethod === method
                      ? 'bg-brand-yellow border-brand-yellow text-brand-black font-extrabold'
                      : 'bg-brand-black border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-555 uppercase tracking-widest">Remarks (Optional)</label>
            <input
              type="text"
              value={payRemarks}
              onChange={(e) => setPayRemarks(e.target.value)}
              placeholder="e.g. July final payment"
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => {
                setIsPaymentOpen(false);
                setPayEmployeeId('');
                setPayAmount('');
                setPayRemarks('');
              }}
              className="flex-1 py-3 bg-zinc-800 text-brand-lightGray font-semibold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
            >
              Cancel
            </button>
            <button
              onClick={handlePaymentSubmit}
              className="flex-1 py-3 bg-brand-yellow text-brand-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform shadow-md"
            >
              Record Payment
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
