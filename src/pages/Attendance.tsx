import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../database/db';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import { format, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Phone, Search, Save, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Attendance() {
  const navigate = useNavigate();
  const refresh = useForceUpdate();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pending attendance selections in memory
  const [pendingAttendance, setPendingAttendance] = useState<Map<number, number>>(new Map());
  const [pendingInitDate, setPendingInitDate] = useState<string>('');

  // Read current data from localStorage
  const employees = store.getEmployees();
  const dbAttendance = store.getAttendanceByDate(selectedDate);

  // Initialize pending map when date changes
  if (pendingInitDate !== selectedDate) {
    const initialMap = new Map<number, number>();
    dbAttendance.forEach(record => {
      initialMap.set(record.employeeId, record.value);
    });
    setPendingAttendance(initialMap);
    setPendingInitDate(selectedDate);
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (showArchived) return true;
    return emp.status === 'active';
  });

  const handleDateChange = (daysOffset: number) => {
    const date = parseISO(selectedDate);
    const newDate = addDays(date, daysOffset);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const handleMarkAttendance = (employeeId: number, value: 0 | 0.5 | 1 | 1.5 | 2) => {
    setPendingAttendance(prev => {
      const newMap = new Map(prev);
      newMap.set(employeeId, value);
      return newMap;
    });
  };

  // Check if pending differs from saved
  const hasChanges = (() => {
    const dbMap = new Map<number, number>();
    dbAttendance.forEach(a => dbMap.set(a.employeeId, a.value));

    for (const [empId, val] of pendingAttendance.entries()) {
      if (dbMap.get(empId) !== val) return true;
    }
    return false;
  })();

  const handleSaveAll = () => {
    for (const [empId, value] of pendingAttendance.entries()) {
      const emp = employees.find(e => e.id === empId);
      if (!emp) continue;

      const existing = dbAttendance.find(a => a.employeeId === empId);

      if (existing) {
        if (existing.value !== value) {
          store.updateAttendance(existing.id, { value: value as 0 | 0.5 | 1 | 1.5 | 2 });
        }
      } else {
        store.addAttendance({
          employeeId: empId,
          date: selectedDate,
          value: value as 0 | 0.5 | 1 | 1.5 | 2,
          dailyWage: emp.dailyWage,
        });
      }
    }

    // Force re-init from fresh localStorage
    setPendingInitDate('');
    refresh();

    setToastMessage('Attendance saved!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const options: { label: string; value: 0 | 0.5 | 1 | 1.5 | 2; activeColor: string }[] = [
    { label: 'Absent', value: 0, activeColor: 'bg-brand-danger text-white border-brand-danger' },
    { label: 'Half', value: 0.5, activeColor: 'bg-amber-500 text-brand-black border-amber-550' },
    { label: 'Present', value: 1, activeColor: 'bg-brand-success text-brand-black border-brand-success' },
    { label: 'OT 1.5', value: 1.5, activeColor: 'bg-indigo-500 text-white border-indigo-500' },
    { label: 'OT 2.0', value: 2, activeColor: 'bg-purple-600 text-white border-purple-600' },
  ];

  return (
    <Layout>
      <div className="space-y-4 pb-20">
        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg border bg-green-950/60 border-green-900 text-brand-success text-xs font-bold uppercase tracking-wider z-50 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date Selector */}
        <div className="bg-brand-darkGray text-white p-3 rounded-2xl flex items-center justify-between border border-zinc-800 shadow-md">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 hover:text-brand-yellow active:scale-90 transition-transform flex items-center justify-center rounded-xl bg-brand-black border border-zinc-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-yellow">Attendance Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-sm text-center border-none focus:outline-none focus:ring-0 cursor-pointer text-white"
            />
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-2 hover:text-brand-yellow active:scale-90 transition-transform flex items-center justify-center rounded-xl bg-brand-black border border-zinc-800"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search staff by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-brand-darkGray border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm font-medium shadow-sm h-[44px] text-white placeholder-zinc-550"
            />
          </div>

          <div className="flex items-center justify-between bg-brand-darkGray px-4 py-3 rounded-xl border border-zinc-800 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Show Archived Staff</span>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                showArchived ? 'bg-brand-yellow' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  showArchived ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-3 pb-16">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const empId = emp.id;
              const selectedValue = pendingAttendance.get(empId);
              const isArchived = emp.status === 'archived';
              const dbRecord = dbAttendance.find(a => a.employeeId === empId);
              const isUnsaved = selectedValue !== undefined && selectedValue !== dbRecord?.value;

              return (
                <div
                  key={empId}
                  className={`bg-brand-darkGray p-4 rounded-2xl border shadow-sm relative overflow-hidden transition-colors ${
                    isArchived ? 'border-zinc-900 opacity-60' : 'border-zinc-800'
                  }`}
                >
                  {isUnsaved && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-yellow animate-pulse" title="Unsaved" />
                  )}

                  <div className="flex justify-between items-start mb-3">
                    {/* Make this header area clickable to go to Profile/Delete details */}
                    <div 
                      onClick={() => navigate(`/employee/${empId}`)}
                      className="cursor-pointer group flex-1"
                      title="View Staff Profile / Actions"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white group-hover:text-brand-yellow transition-colors flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-zinc-500 group-hover:text-brand-yellow transition-colors" />
                          {emp.name}
                        </span>
                        {isArchived && (
                          <span className="text-[9px] font-extrabold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Archived</span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-zinc-400 mt-0.5 space-x-2">
                        <span>Wage: ₹{emp.dailyWage}</span>
                        <span className="text-[10px] text-zinc-650">(Tap name to open profile)</span>
                      </div>
                    </div>

                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} className="flex items-center text-zinc-405 hover:text-brand-yellow transition-colors p-1" title="Call Staff">
                        <Phone className="w-4 h-4 text-zinc-500" />
                      </a>
                    )}
                  </div>

                  {isArchived ? (
                    <div className="bg-brand-black p-2.5 rounded-xl border border-zinc-700 text-center text-xs text-zinc-500 font-bold uppercase tracking-wider">
                      {selectedValue !== undefined
                        ? `Archived - ${options.find(o => o.value === selectedValue)?.label}`
                        : 'Archived - Cannot Mark'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1">
                      {options.map((opt) => {
                        const isActive = selectedValue === opt.value;
                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleMarkAttendance(empId, opt.value)}
                            className={`py-2.5 px-1 text-[10px] font-bold rounded-lg border transition-all text-center flex items-center justify-center uppercase select-none ${
                              isActive
                                ? opt.activeColor + ' shadow-inner scale-[0.98]'
                                : 'bg-brand-black text-zinc-400 border-zinc-700 hover:bg-zinc-900 active:scale-[0.97]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-brand-darkGray p-8 rounded-2xl border border-zinc-800 text-center text-sm text-zinc-500">
              {searchQuery ? 'No staff matching search.' : 'No active staff added yet.'}
            </div>
          )}
        </div>

        {/* Floating Save Button */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-16 left-0 right-0 p-4 bg-brand-black/95 backdrop-blur border-t border-zinc-800 z-40 max-w-md mx-auto shadow-2xl flex items-center justify-center rounded-t-xl"
            >
              <button
                onClick={handleSaveAll}
                className="w-full py-3.5 bg-brand-yellow hover:bg-yellow-400 text-brand-black font-extrabold uppercase rounded-xl active:scale-[0.98] transition-all text-sm tracking-wider shadow-md flex items-center justify-center space-x-2 h-[48px]"
              >
                <Save className="w-5 h-5" />
                <span>Save Attendance</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
