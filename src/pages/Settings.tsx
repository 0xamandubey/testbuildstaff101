import { useState } from 'react';
import { store, checkStorageSupport } from '../database/db';
import { useForceUpdate } from '../hooks/useForceUpdate';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import {
  Download,
  Upload,
  Building2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function Settings() {
  const refresh = useForceUpdate();
  const settings = store.getSettings();
  const [bName, setBName] = useState(settings.businessName);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const storageStatus = checkStorageSupport();

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveBusinessName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim()) return;
    store.updateSettings({ businessName: bName.trim() });
    showToast('Business name updated!');
    refresh();
  };

  const handleExportBackup = () => {
    try {
      const backup = store.exportAll();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `staff_attendance_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Backup exported successfully!');
    } catch (err) {
      showToast('Failed to export: ' + (err as Error).message, 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        if (!data.employees || !data.attendance) {
          showToast('Invalid backup file.', 'error');
          return;
        }

        store.importAll({
          employees: data.employees,
          attendance: data.attendance,
          payments: data.salaryPayments || data.payments || [],
          settings: data.settings || { businessName: 'Staff Attendance' },
        });

        showToast('Backup imported successfully!');
        refresh();
      } catch (err) {
        showToast('Import failed: ' + (err as Error).message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    store.clearAll();
    setIsResetConfirmOpen(false);
    setBName('Staff Attendance');
    showToast('All data cleared.');
    refresh();
  };

  return (
    <Layout>
      <div className="space-y-6 text-brand-lightGray">
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
        {/* Toast */}
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold uppercase tracking-wider z-50 flex items-center space-x-2 ${
              toastMessage.type === 'success'
                ? 'bg-green-950/60 border-green-900 text-brand-success'
                : 'bg-red-950/60 border-red-900 text-brand-danger'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Building2 className="w-4 h-4 text-brand-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-brand-danger" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Business Settings */}
        <div className="bg-brand-darkGray p-5 rounded-2xl border border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-zinc-700 pb-3">
            <Building2 className="w-5 h-5 text-zinc-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Business Profile</h2>
          </div>

          <form onSubmit={handleSaveBusinessName} className="space-y-3">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Business Name</label>
              <input
                type="text"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-3 py-2 bg-brand-black border border-zinc-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-yellow h-[44px] text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-brand-yellow text-brand-black font-extrabold uppercase rounded-xl text-xs tracking-wider active:scale-[0.98] transition-transform shadow-md"
            >
              Update Name
            </button>
          </form>
        </div>

        {/* Backup */}
        <div className="bg-brand-darkGray p-5 rounded-2xl border border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-zinc-700 pb-3">
            <Info className="w-5 h-5 text-zinc-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Backup & Recovery</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportBackup}
              className="flex flex-col items-center justify-center p-4 bg-brand-black border border-zinc-800 rounded-xl active:scale-[0.97] transition-all hover:bg-zinc-800 shadow-sm text-center"
            >
              <Download className="w-5 h-5 mb-1.5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Export Backup</span>
            </button>

            <label className="flex flex-col items-center justify-center p-4 bg-brand-black border border-zinc-800 rounded-xl active:scale-[0.97] transition-all hover:bg-zinc-800 shadow-sm text-center cursor-pointer">
              <Upload className="w-5 h-5 mb-1.5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Import Backup</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-brand-darkGray p-5 rounded-2xl border border-red-950/40 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-red-950/20 pb-3">
            <AlertTriangle className="w-5 h-5 text-brand-danger" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-danger">Danger Zone</h2>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Wiping the data will permanently delete all staff profiles, attendance logs, and payment records.
          </p>
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-3 bg-red-950/20 hover:bg-red-950/30 text-brand-danger font-bold uppercase border border-red-900/60 rounded-xl active:scale-[0.98] transition-transform text-xs tracking-wider"
          >
            Reset All Data
          </button>
        </div>
      </div>

      <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} title="Wipe Database">
        <div className="space-y-4 text-brand-lightGray">
          <div className="flex items-center space-x-2 text-brand-danger bg-red-950/30 p-3 rounded-lg border border-red-900">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Destructive Option</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Are you sure you want to wipe all records? This <strong>cannot be undone</strong>.
          </p>
          <div className="flex space-x-3 pt-2">
            <button onClick={() => setIsResetConfirmOpen(false)} className="flex-1 py-3 bg-zinc-800 text-brand-lightGray font-semibold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Cancel</button>
            <button onClick={handleResetData} className="flex-1 py-3 bg-brand-danger text-white font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] transition-transform">Reset Data</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
