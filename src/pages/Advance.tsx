import { useState } from 'react';
import { store } from '../database/db';
import type { Advance as AdvanceType } from '../database/db';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import { Plus, Phone, RotateCcw, Trash2, Search, Banknote, CheckCircle2, History, Calendar } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Advance() {
  const refresh = useForceUpdate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceType | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'returned'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for adding new advance
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Return form state
  const [returnAmount, setReturnAmount] = useState('');
  const [returnDate, setReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const advances = store.getAdvances();

  // Filter and sort advances
  const filteredAdvances = advances
    .filter(a => a.status === activeTab)
    .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.id - a.id);

  // Tally actual pending balance (total amount - paidBack)
  const totalPending = advances
    .filter(a => a.status === 'pending')
    .reduce((sum, a) => sum + (a.amount - (a.paidBack || 0)), 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormAmount('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleAddAdvance = () => {
    const name = formName.trim();
    const amount = Number(formAmount);
    if (!name || !amount || amount <= 0) return;

    store.addAdvance({
      name,
      phone: formPhone.trim() || undefined,
      amount,
      dateGiven: formDate,
    });

    resetForm();
    setIsAddOpen(false);
    showToast('Advance given!');
    refresh();
  };

  const handleReceiveBack = () => {
    if (!selectedAdvance) return;
    const amount = Number(returnAmount);
    const remaining = selectedAdvance.amount - (selectedAdvance.paidBack || 0);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (amount > remaining) {
      alert(`Cannot receive more than the pending amount (₹${remaining}).`);
      return;
    }

    store.receiveAdvancePayment(selectedAdvance.id, amount, returnDate);
    setIsReturnOpen(false);
    setSelectedAdvance(null);
    showToast(amount === remaining ? 'Advance fully returned!' : `Received ₹${amount} back!`);
    refresh();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this advance record?')) {
      store.deleteAdvance(id);
      showToast('Advance deleted.');
      refresh();
    }
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
              className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg border bg-green-950/60 border-green-900 text-brand-success text-xs font-bold uppercase tracking-wider z-50 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Card */}
        <div className="bg-brand-yellow p-4 rounded-2xl border border-brand-yellow shadow-md text-brand-black">
          <div className="text-[10px] font-bold uppercase tracking-wider text-brand-black/70">Total Pending Advance</div>
          <div className="text-2xl font-black mt-1">₹ {totalPending.toLocaleString('en-IN')}</div>
        </div>

        {/* Tabs */}
        <div className="flex bg-brand-darkGray p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => { setActiveTab('pending'); setSearchQuery(''); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'pending' ? 'bg-brand-black text-brand-yellow font-extrabold' : 'text-zinc-400 active:bg-zinc-800'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Pending</span>
          </button>
          <button
            onClick={() => { setActiveTab('returned'); setSearchQuery(''); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'returned' ? 'bg-brand-black text-brand-yellow font-extrabold' : 'text-zinc-400 active:bg-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Returned</span>
          </button>
        </div>

        {/* Search + Add */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name..."
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
            <span>Give</span>
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredAdvances.length > 0 ? (
            filteredAdvances.map((adv) => {
              const remaining = adv.amount - (adv.paidBack || 0);
              return (
                <div key={adv.id} className="bg-brand-darkGray p-4 rounded-2xl border border-zinc-800 shadow-sm space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-white">{adv.name}</h3>
                      <div className="flex items-center text-xs text-zinc-400 mt-0.5 space-x-2">
                        <span>Given: {adv.dateGiven}</span>
                        {adv.phone && (
                          <>
                            <span>•</span>
                            <a href={`tel:${adv.phone}`} className="flex items-center text-zinc-400 hover:text-brand-yellow transition-colors">
                              <Phone className="w-3 h-3 mr-0.5 text-zinc-500" />
                              <span>{adv.phone}</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-white block">
                        ₹ {remaining.toLocaleString('en-IN')}
                      </span>
                      {adv.paidBack > 0 && (
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          of ₹ {adv.amount.toLocaleString('en-IN')} total
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment History Log (Collapsible or small list) */}
                  {adv.returns && adv.returns.length > 0 && (
                    <div className="bg-brand-black/40 p-2.5 rounded-xl border border-zinc-850 space-y-1.5">
                      <div className="flex items-center space-x-1 text-[9px] font-extrabold uppercase tracking-wider text-zinc-500">
                        <History className="w-3.5 h-3.5" />
                        <span>Return History</span>
                      </div>
                      <div className="divide-y divide-zinc-850 max-h-[100px] overflow-y-auto no-scrollbar">
                        {adv.returns.map((r, i) => (
                          <div key={i} className="flex justify-between items-center py-1 text-[10px] text-zinc-300">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>{r.date}</span>
                            </span>
                            <span className="font-bold text-brand-success">+ ₹{r.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  {adv.status === 'returned' && adv.dateReturned && (
                    <div className="text-[9px] font-extrabold uppercase px-2 py-1 rounded border text-brand-success bg-green-950/30 border-green-900 w-fit">
                      Fully Settled on {adv.dateReturned}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-1">
                    {adv.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedAdvance(adv);
                          setReturnAmount(remaining.toString());
                          setReturnDate(format(new Date(), 'yyyy-MM-dd'));
                          setIsReturnOpen(true);
                        }}
                        className="flex-1 py-2.5 bg-brand-success/15 hover:bg-brand-success/25 text-brand-success font-bold uppercase rounded-xl border border-green-900/60 active:scale-[0.98] transition-all text-[10px] tracking-wider flex items-center justify-center space-x-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Receive Back</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(adv.id)}
                      className={`py-2.5 bg-red-955/20 hover:bg-red-955/35 text-brand-danger font-bold uppercase rounded-xl border border-red-900/60 active:scale-[0.98] transition-all text-[10px] tracking-wider flex items-center justify-center space-x-1.5 ${
                        adv.status === 'pending' ? 'px-4' : 'flex-1'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-brand-darkGray p-8 rounded-2xl border border-zinc-800 text-center text-sm text-zinc-500">
              {searchQuery
                ? 'No advances matching search.'
                : activeTab === 'pending'
                ? 'No pending advances.'
                : 'No returned advances.'}
            </div>
          )}
        </div>
      </div>

      {/* Add Advance Modal */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Give Advance">
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Person's name"
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone (Optional)</label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount (₹) *</label>
            <input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date Given</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => e.target.value && setFormDate(e.target.value)}
              className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="flex-1 py-3 bg-zinc-800 text-brand-lightGray font-semibold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAdvance}
              className="flex-1 py-3 bg-brand-yellow text-brand-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform shadow-md"
            >
              Give Advance
            </button>
          </div>
        </div>
      </Modal>

      {/* Receive Back Modal */}
      <Modal isOpen={isReturnOpen} onClose={() => { setIsReturnOpen(false); setSelectedAdvance(null); }} title="Receive Advance Back">
        {selectedAdvance && (
          <div className="space-y-4">
            <div className="bg-brand-black p-3 rounded-xl border border-zinc-700 space-y-1">
              <div className="text-xs font-bold text-white">{selectedAdvance.name}</div>
              <div className="text-lg font-black text-brand-yellow">
                ₹ {(selectedAdvance.amount - (selectedAdvance.paidBack || 0)).toLocaleString('en-IN')} pending
              </div>
              <div className="text-[9px] text-zinc-405 uppercase tracking-wider">
                Total Given: ₹ {selectedAdvance.amount.toLocaleString('en-IN')} on {selectedAdvance.dateGiven}
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount to Receive Back (₹) *</label>
              <input
                type="number"
                value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={selectedAdvance.amount - (selectedAdvance.paidBack || 0)}
                className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date Received</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => e.target.value && setReturnDate(e.target.value)}
                className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => { setIsReturnOpen(false); setSelectedAdvance(null); }}
                className="flex-1 py-3 bg-zinc-800 text-brand-lightGray font-semibold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleReceiveBack}
                className="flex-1 py-3 bg-brand-success text-brand-black font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform shadow-md"
              >
                Confirm Return
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
