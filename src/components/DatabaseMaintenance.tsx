import React, { useState, useEffect } from 'react';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  Info, 
  ShieldAlert,
  Server
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api.js';

interface DatabaseMaintenanceProps {
  onRefresh: () => Promise<void>;
  showToast: (msg: string) => void;
}

export default function DatabaseMaintenance({ onRefresh, showToast }: DatabaseMaintenanceProps) {
  const [status, setStatus] = useState<{ type: string; persistent: boolean; details: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getDatabaseStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to get database status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReset = async () => {
    if (confirmText !== 'RESET') {
      showToast('Error: Please type RESET to confirm.');
      return;
    }

    try {
      setIsResetting(true);
      const res = await api.resetDatabase();
      if (res.success) {
        showToast('Success: All demo transactions and records have been cleared.');
        setConfirmText('');
        setShowConfirmModal(false);
        await onRefresh();
      }
    } catch (err: any) {
      showToast(`Error resetting database: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4" id="db-maintenance-container">
      {/* Title block */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <Database size={24} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">Database Administration</h2>
          <p className="text-xs text-slate-500">Monitor storage engines, persistence guarantees, and perform system purging.</p>
        </div>
      </div>

      {/* Database engine status card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Server size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Active Storage Engine</h3>
          </div>
          <button 
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-500 cursor-pointer transition flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-2.5 text-slate-400">
              <RefreshCw className="animate-spin text-blue-600" size={24} />
              <span className="text-xs font-semibold">Analyzing active database server...</span>
            </div>
          ) : status ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Status Graphic */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
                {status.persistent ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100 shadow-xs">
                      <CheckCircle2 size={32} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                      Fully Persistent
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-100 shadow-xs">
                      <AlertTriangle size={32} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-200/50">
                      Ephemeral Storage
                    </span>
                  </>
                )}
                <span className="text-xs font-extrabold text-slate-700 mt-3">{status.type.toUpperCase()}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-1">Region: Europe-West2</span>
              </div>

              {/* Status Description */}
              <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 block">Connection details</span>
                  <p className="text-sm font-bold text-slate-800">{status.details}</p>
                  
                  {status.persistent ? (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Your application is successfully linked to the high-performance, cloud-hosted relational database. All registered congregants, donations, financial ledgers, and sermon events are written directly to safe disk arrays in London (europe-west2), guaranteeing zero data loss even if the server container restarts or the browser cache is emptied.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The application is running in <span className="font-semibold text-amber-600">ephemeral fallback mode</span> using a local SQLite file. Any entries, modifications, or deletions you make will be lost if the server container restarts or undergoes regular maintenance cycles.
                    </p>
                  )}
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-900">
                  <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-bold block text-blue-950">How persistence works</span>
                    Whenever you launch this app, it automatically attempts to secure a persistent tunnel to the Europe-West2 Cloud SQL instance. If credentials are missing or wrong, it uses SQLite as a temporary safety valve. Our latest patch ensures database connection attempts never fail completely on startup.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-semibold">
              Could not fetch database information.
            </div>
          )}
        </div>
      </div>

      {/* Dangerous/Purge Section */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-rose-100 bg-rose-50/30 flex items-center gap-2.5">
          <ShieldAlert size={18} className="text-rose-600" />
          <h3 className="font-bold text-rose-800 text-xs uppercase tracking-wider">Danger Zone & Ledgers Purge</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-sm">Purge All Ledger Transactions</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every time the church portal initializes for a new workspace session, the system automatically runs schema migrations and seeds standard demonstration templates (such as pre-filled branch locations, demo tithes, mock expenditures, and test cell groups) to assist with visual layout configuration.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              If you have successfully configured persistent production storage and wish to delete these pre-filled items to begin typing your real church statistics without overlapping big values, use this purge function.
            </p>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-rose-900">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold block text-rose-950">What will be deleted:</span>
              <ul className="list-disc list-inside space-y-0.5 mt-1 font-medium text-rose-800">
                <li>All congregant and member records</li>
                <li>All tithing lists and financial ledger logs</li>
                <li>All regional branches and home cell fellowships</li>
                <li>All attendance sessions, logs, sermons, and hymns</li>
              </ul>
              <span className="font-bold block mt-2 text-rose-950">What will NOT be deleted:</span>
              <p className="text-slate-600">The primary administrative login accounts (including your current admin profile) are safely preserved so you remain authenticated and do not get locked out of GIMK Portal.</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              <Trash2 size={14} />
              <span>Purge Demo Ledgers & Start Fresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full border border-rose-100">
                <ShieldAlert size={22} />
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Confirm Ledger Purge</h3>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                This operation is <span className="font-bold text-rose-600">permanent and irreversible</span>. All custom or seeded donations, members, and sessions on the active <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">{status?.type.toUpperCase()}</span> database will be erased.
              </p>
              <p className="text-xs font-semibold text-slate-700">
                To confirm this operation, please type <span className="font-mono bg-slate-100 px-1.5 py-0.5 text-rose-600 border border-slate-200 rounded">RESET</span> in the box below:
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET here"
              className="w-full p-2.5 border rounded-lg text-xs font-mono text-center focus:ring-1 focus:ring-rose-500 bg-slate-50 focus:bg-white transition"
            />

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => { setShowConfirmModal(false); setConfirmText(''); }}
                className="flex-1 py-2 rounded-lg border hover:bg-slate-50 text-slate-500 text-xs font-bold transition cursor-pointer"
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={confirmText !== 'RESET' || isResetting}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{isResetting ? 'Purging...' : 'Confirm Purge'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
