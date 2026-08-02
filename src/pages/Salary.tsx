import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../database/db';
import type { Employee } from '../database/db';
import { useAllSalaries } from '../hooks/useSalary';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import PaymentForm from '../components/PaymentForm';
import { Search, User } from 'lucide-react';

export default function Salary() {
  const navigate = useNavigate();
  const refresh = useForceUpdate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  const { salaryMap } = useAllSalaries();
  const employees = store.getEmployees().filter(e => e.status === 'active');

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePaymentSubmit = (data: {
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank';
    remarks?: string;
  }) => {
    if (!selectedEmp) return;

    store.addPayment({
      employeeId: selectedEmp.id,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      remarks: data.remarks || undefined,
    });

    setIsPaymentOpen(false);
    setSelectedEmp(null);
    refresh();
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search active staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-brand-darkGray border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm font-medium shadow-sm h-[44px] text-white placeholder-zinc-550"
          />
        </div>

        <div className="space-y-3">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const summary = salaryMap[emp.id] || { totalEarned: 0, totalPaid: 0, remainingDue: 0 };

              return (
                <div key={emp.id} className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col justify-between">
                  {/* Clickable Header Info Block */}
                  <div className="flex justify-between items-start border-b border-zinc-700 pb-3 mb-3">
                    <div 
                      onClick={() => navigate(`/employee/${emp.id}`)}
                      className="cursor-pointer group flex-1"
                      title="View Staff Profile / Actions"
                    >
                      <h3 className="font-bold text-sm text-white group-hover:text-brand-yellow transition-colors flex items-center">
                        <User className="w-3.5 h-3.5 mr-1 text-zinc-500 group-hover:text-brand-yellow transition-colors" />
                        {emp.name}
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mt-0.5">
                        Wage: ₹{emp.dailyWage}/day <span className="text-zinc-650 ml-1">(Tap to open profile)</span>
                      </span>
                    </div>
                    <span className={`text-sm font-black ${summary.remainingDue > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
                      ₹ {summary.remainingDue.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Total Paid</span>
                      <span className="text-xs font-bold text-zinc-300">₹ {summary.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Earned to Date</span>
                      <span className="text-xs font-bold text-zinc-300">₹ {summary.totalEarned.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEmp(emp);
                      setIsPaymentOpen(true);
                    }}
                    className="w-full py-3 bg-brand-yellow hover:bg-yellow-400 text-brand-black font-extrabold uppercase rounded-xl active:scale-[0.98] transition-all text-sm tracking-wide flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <span>Pay Salary</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="bg-brand-darkGray p-8 rounded-2xl border border-zinc-800 text-center text-sm text-zinc-500">
              {searchQuery ? 'No staff matching search query.' : 'No active staff added yet.'}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isPaymentOpen}
        onClose={() => { setIsPaymentOpen(false); setSelectedEmp(null); }}
        title="Pay Staff Salary"
      >
        {selectedEmp && (
          <PaymentForm
            employeeName={selectedEmp.name}
            currentDue={salaryMap[selectedEmp.id]?.remainingDue || 0}
            onSubmit={handlePaymentSubmit}
            onCancel={() => { setIsPaymentOpen(false); setSelectedEmp(null); }}
          />
        )}
      </Modal>
    </Layout>
  );
}
