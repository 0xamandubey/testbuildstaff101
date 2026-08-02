import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, formatDateDisplay } from '../database/db';
import type { Employee } from '../database/db';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import EmployeeForm from '../components/EmployeeForm';
import { Plus, Search, User, Phone, Edit2, Archive, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Staff() {
  const navigate = useNavigate();
  const refresh = useForceUpdate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const employees = store.getEmployees();

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (showArchived) return true;
    return emp.status === 'active';
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddSubmit = (data: {
    name: string;
    phone?: string;
    dailyWage: number;
    joiningDate: string;
    status: 'active' | 'archived';
  }) => {
    try {
      store.addEmployee({
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        dailyWage: Number(data.dailyWage),
        joiningDate: data.joiningDate,
        status: 'active',
      });
      setIsAddOpen(false);
      showToast('Staff added successfully!');
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to add employee: ' + (err as Error).message);
    }
  };

  const handleEditSubmit = (data: {
    name: string;
    phone?: string;
    dailyWage: number;
    joiningDate: string;
    status: 'active' | 'archived';
  }) => {
    if (!editingEmployee) return;
    try {
      store.updateEmployee(editingEmployee.id, {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        dailyWage: Number(data.dailyWage),
        joiningDate: data.joiningDate,
        status: data.status,
      });
      setEditingEmployee(null);
      showToast('Staff profile updated!');
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update employee: ' + (err as Error).message);
    }
  };

  const handleToggleArchive = (emp: Employee) => {
    const nextStatus = emp.status === 'active' ? 'archived' : 'active';
    store.updateEmployee(emp.id, { status: nextStatus });
    showToast(nextStatus === 'archived' ? 'Staff archived' : 'Staff restored');
    refresh();
  };

  const handlePermanentDelete = () => {
    if (!deletingEmployee) return;
    store.deleteEmployee(deletingEmployee.id);
    setDeletingEmployee(null);
    showToast('Staff deleted permanently.');
    refresh();
  };

  return (
    <Layout>
      <div className="space-y-4">
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

        {/* Stats banner */}
        <div className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm flex justify-between items-center text-white">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Active Staff</span>
            <span className="text-2xl font-black mt-0.5">{employees.filter(e => e.status === 'active').length}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Archived</span>
            <span className="text-2xl font-black mt-0.5">{employees.filter(e => e.status === 'archived').length}</span>
          </div>
        </div>

        {/* Search and Toggles */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search staff by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-brand-darkGray border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm font-medium shadow-sm h-[44px] text-white placeholder-zinc-500"
            />
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="h-[44px] px-4 bg-brand-yellow text-brand-black font-extrabold uppercase rounded-xl active:scale-[0.98] transition-all text-xs tracking-wider shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>

        {/* Show Archived Toggle */}
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

        {/* Staff List */}
        <div className="space-y-3 pb-10">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const isArchived = emp.status === 'archived';
              return (
                <div
                  key={emp.id}
                  className={`bg-brand-darkGray p-4 rounded-2xl border shadow-sm relative overflow-hidden transition-colors ${
                    isArchived ? 'border-zinc-900 opacity-60' : 'border-zinc-800'
                  }`}
                >
                  {/* Card info */}
                  <div className="flex justify-between items-start mb-3">
                    <div 
                      onClick={() => navigate(`/employee/${emp.id}`)}
                      className="cursor-pointer group flex-1"
                      title="View logs / profile details"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white group-hover:text-brand-yellow transition-colors flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-zinc-500 group-hover:text-brand-yellow transition-colors" />
                          {emp.name}
                        </span>
                        {isArchived && (
                          <span className="text-[9px] font-extrabold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col text-xs text-zinc-400 mt-1 space-y-0.5">
                        <span>Wage: ₹{emp.dailyWage}/day</span>
                        <span>Joined: {formatDateDisplay(emp.joiningDate)}</span>
                      </div>
                    </div>

                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} className="flex items-center text-zinc-400 hover:text-brand-yellow transition-colors p-1" title="Call staff">
                        <Phone className="w-4 h-4 text-zinc-555" />
                      </a>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-1 border-t border-zinc-800/40">
                    <button
                      onClick={() => setEditingEmployee(emp)}
                      className="flex-1 py-2 bg-brand-black hover:bg-zinc-800 text-zinc-300 font-bold uppercase rounded-lg border border-zinc-700 active:scale-[0.98] transition-all text-[10px] tracking-wider flex items-center justify-center space-x-1"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleToggleArchive(emp)}
                      className="flex-1 py-2 bg-brand-black hover:bg-zinc-800 text-zinc-300 font-bold uppercase rounded-lg border border-zinc-700 active:scale-[0.98] transition-all text-[10px] tracking-wider flex items-center justify-center space-x-1"
                      title={isArchived ? 'Restore Staff' : 'Archive Staff'}
                    >
                      <Archive className="w-3 h-3" />
                      <span>{isArchived ? 'Restore' : 'Archive'}</span>
                    </button>

                    <button
                      onClick={() => setDeletingEmployee(emp)}
                      className="py-2 px-3 bg-red-955/20 hover:bg-red-955/35 text-brand-danger font-bold uppercase rounded-lg border border-red-900/60 active:scale-[0.98] transition-all text-[10px] tracking-wider flex items-center justify-center space-x-1"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-brand-darkGray p-8 rounded-2xl border border-zinc-800 text-center text-sm text-zinc-500">
              {searchQuery ? 'No staff matching search query.' : 'No staff members registered.'}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Staff">
        <EmployeeForm onSubmit={handleAddSubmit} onCancel={() => setIsAddOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Edit Staff Profile">
        {editingEmployee && (
          <EmployeeForm
            initialData={editingEmployee}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingEmployee(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingEmployee} onClose={() => setDeletingEmployee(null)} title="Confirm Deletion">
        {deletingEmployee && (
          <div className="space-y-4 text-brand-lightGray">
            <div className="flex items-center space-x-2 text-brand-danger bg-red-950/30 p-3 rounded-lg border border-red-900">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Destructive Action</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete <strong>{deletingEmployee.name}</strong>? This will wipe all attendance history and payment logs. This <strong>cannot be undone</strong>.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setDeletingEmployee(null)}
                className="flex-1 py-3 bg-zinc-800 text-brand-lightGray font-semibold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                className="flex-1 py-3 bg-brand-danger text-white font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
