import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Plus, 
  Calendar, 
  ChevronRight, 
  X, 
  Check, 
  Building,
  Activity,
  UserCheck,
  UserX,
  Clock,
  Trash2
} from 'lucide-react';
import { AttendanceSession, AttendanceRecord, Member, Branch } from '../types.js';
import ConfirmModal from './ConfirmModal.js';

interface AdminAttendanceProps {
  sessions: AttendanceSession[];
  branches: Branch[];
  members: Member[];
  onRefresh: () => void;
  onAddSession: (data: { date: string; service_name: string; branch_id: number; records: { member_id: number; status: string }[] }) => Promise<any>;
  onUpdateRecords: (sessionId: number, records: { member_id: number; status: string }[]) => Promise<any>;
  onGetSessionRecords: (sessionId: number) => Promise<AttendanceRecord[]>;
  onDeleteSession: (id: number) => Promise<any>;
  onBulkDeleteSessions: (ids: number[]) => Promise<any>;
}

export default function AdminAttendance({
  sessions,
  branches,
  members,
  onRefresh,
  onAddSession,
  onUpdateRecords,
  onGetSessionRecords,
  onDeleteSession,
  onBulkDeleteSessions
}: AdminAttendanceProps) {
  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [viewState, setViewState] = useState<'list' | 'create' | 'details'>('list');
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);

  // New Session Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formServiceName, setFormServiceName] = useState('Sunday Main Service');
  const [formBranchId, setFormBranchId] = useState('');
  const [formRecords, setFormRecords] = useState<{ member_id: number; status: 'Present' | 'Absent'; name: string }[]>([]);
  const [formError, setFormError] = useState('');

  // Selected Session Details State
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Initialize New Attendance Form
  const initNewSession = () => {
    const defaultBranchId = branches[0]?.id?.toString() || '';
    setFormBranchId(defaultBranchId);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormServiceName('Sunday Main Service');
    setFormError('');

    // Load branch members
    const bId = defaultBranchId ? parseInt(defaultBranchId, 10) : null;
    const branchMembers = members.filter(m => m.branch_id === bId);
    setFormRecords(branchMembers.map(m => ({
      member_id: m.id,
      status: 'Present', // Default to Present
      name: m.name
    })));

    setViewState('create');
  };

  const handleBranchChange = (branchIdStr: string) => {
    setFormBranchId(branchIdStr);
    const bId = branchIdStr ? parseInt(branchIdStr, 10) : null;
    // Load members for this specific branch
    const branchMembers = members.filter(m => m.branch_id === bId);
    setFormRecords(branchMembers.map(m => ({
      member_id: m.id,
      status: 'Present',
      name: m.name
    })));
  };

  const toggleFormRecordStatus = (index: number) => {
    setFormRecords(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        status: item.status === 'Present' ? 'Absent' : 'Present'
      };
    }));
  };

  const handleSubmitNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBranchId) {
      setFormError('Please select a regional branch.');
      return;
    }
    if (formRecords.length === 0) {
      setFormError('No registered congregants found in this branch to track.');
      return;
    }

    try {
      const payload = {
        date: formDate,
        service_name: formServiceName,
        branch_id: parseInt(formBranchId, 10),
        records: formRecords.map(r => ({
          member_id: r.member_id,
          status: r.status
        }))
      };

      await onAddSession(payload);
      setViewState('list');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Error recording attendance session.');
    }
  };

  // Inspect Session Details
  const inspectSession = async (session: AttendanceSession) => {
    setSelectedSession(session);
    setIsLoadingRecords(true);
    setIsEditingDetails(false);
    setViewState('details');

    try {
      const records = await onGetSessionRecords(session.id);
      setSessionRecords(records);
    } catch (err: any) {
      alert(`Error loading session detail: ${err.message}`);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const toggleDetailRecordStatus = (recordId: number) => {
    setSessionRecords(prev => prev.map(rec => {
      if (rec.id !== recordId) return rec;
      return {
        ...rec,
        status: rec.status === 'Present' ? 'Absent' : 'Present'
      };
    }));
  };

  const handleDeleteSession = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Attendance Session',
      message: 'Are you sure you want to permanently delete this attendance session and all its records? This cannot be undone.',
      onConfirm: async () => {
        try {
          await onDeleteSession(id);
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting attendance session');
        }
      }
    });
  };

  const handleUpdateSessionRecords = async () => {
    if (!selectedSession) return;
    try {
      const payload = sessionRecords.map(r => ({
        member_id: r.member_id,
        status: r.status
      }));

      await onUpdateRecords(selectedSession.id, payload);
      setIsEditingDetails(false);
      onRefresh();
      // Re-fetch updated totals
      const updatedRecords = await onGetSessionRecords(selectedSession.id);
      setSessionRecords(updatedRecords);
    } catch (err: any) {
      alert(`Error updating session database: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* List View */}
      {viewState === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div>
              <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">Attendance Manager</h2>
              <p className="text-xs text-slate-500">Track GIMK Sabbath & mid-week service attendances</p>
            </div>
            <button
              onClick={initNewSession}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Record Service Attendance</span>
            </button>
          </div>

          {/* Sticky selection toolbar for Attendance Sessions */}
          {selectedSessionIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-xs font-semibold whitespace-nowrap bg-blue-950 px-3 py-1.5 rounded-full border border-blue-900 text-blue-300">
                {selectedSessionIds.length} selected
              </span>
              
              <div className="h-5 w-px bg-slate-800" />

              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Bulk Delete Sessions',
                    message: `Are you sure you want to permanently delete these ${selectedSessionIds.length} selected attendance sessions? This will delete all records under these services.`,
                    onConfirm: async () => {
                      try {
                        await onBulkDeleteSessions(selectedSessionIds);
                        setSelectedSessionIds([]);
                        onRefresh();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      } catch (err: any) {
                        alert(err.message || 'Error deleting sessions');
                      }
                    }
                  });
                }}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shadow-md shrink-0"
              >
                <Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={sessions.length > 0 && selectedSessionIds.length === sessions.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSessionIds(sessions.map(x => x.id));
                          else setSelectedSessionIds([]);
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Service Date</th>
                    <th className="py-3 px-4">Service / Meeting</th>
                    <th className="py-3 px-4">Parish Branch</th>
                    <th className="py-3 px-4">Congregation size</th>
                    <th className="py-3 px-4">Present Members</th>
                    <th className="py-3 px-4">Attendance Rate</th>
                    <th className="py-3 px-4 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                        No service attendance lists created yet
                      </td>
                    </tr>
                  ) : (
                    sessions.map(s => {
                      const total = s.total_members || 0;
                      const present = s.present_count || 0;
                      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-4 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedSessionIds.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedSessionIds(prev => [...prev, s.id]);
                                else setSelectedSessionIds(prev => prev.filter(x => x !== s.id));
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                            {new Date(s.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{s.service_name}</td>
                          <td className="py-2.5 px-4 text-slate-600">{s.branch_name}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono">{total} verified</td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-600 font-mono">{present} present</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full" style={{ width: `${rate}%` }}></div>
                              </div>
                              <span className="font-bold text-slate-700 font-mono">{rate}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => inspectSession(s)}
                                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 text-[11px] cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(s.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                title="Delete session"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Attendance View */}
      {viewState === 'create' && (
        <form onSubmit={handleSubmitNewSession} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-md font-bold text-blue-900 tracking-tight">New Attendance Sheet</h2>
              <p className="text-xs text-slate-500">Roll call registered branch congregants</p>
            </div>
            <button 
              type="button" 
              onClick={() => setViewState('list')}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2.5 rounded-lg text-xs">
              {formError}
            </div>
          )}

          {/* Top Form Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Regional Branch Affiliation</label>
              <select
                value={formBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                required
                className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs text-slate-700"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Service/Meeting Name</label>
              <select
                value={formServiceName}
                onChange={(e) => setFormServiceName(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs text-slate-700"
              >
                <option value="Sunday Main Service">Sunday Main Service</option>
                <option value="Mid-Week Prayer Meeting">Mid-Week Prayer Meeting</option>
                <option value="Youth Fellowship Event">Youth Fellowship Event</option>
                <option value="Sisters Association Meeting">Sisters Association Meeting</option>
                <option value="Crusade / Revival Assembly">Crusade / Revival Assembly</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Date</label>
              <input 
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {/* Members Roll Call */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Members Checklist ({formRecords.length})</h3>
            
            {formRecords.length === 0 ? (
              <p className="bg-slate-50 text-slate-500 border border-slate-100 p-4 text-xs text-center rounded-lg">
                No congregants currently registered under this branch. Establish or move members to this branch to list them here.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {formRecords.map((item, index) => (
                  <div 
                    key={item.member_id}
                    onClick={() => toggleFormRecordStatus(index)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer select-none transition ${
                      item.status === 'Present' 
                        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900' 
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">{item.name}</p>
                      <span className="text-[10px] text-slate-400">ID Link: {item.member_id}</span>
                    </div>

                    <div>
                      {item.status === 'Present' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white rounded-full p-1 text-[10px] font-semibold">
                          <Check size={12} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 rounded-full p-1 text-[10px] font-semibold">
                          <X size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setViewState('list')}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formRecords.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>Submit Attendance</span>
            </button>
          </div>
        </form>
      )}

      {/* Details View */}
      {viewState === 'details' && selectedSession && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-md font-bold text-slate-800">{selectedSession.service_name} Logs</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(selectedSession.date).toLocaleDateString()}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Building size={13} /> {selectedSession.branch_name}</span>
              </div>
            </div>
            <button 
              onClick={() => setViewState('list')}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {isLoadingRecords ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Clock className="animate-spin" size={24} />
              <span className="text-xs">Querying SQLite records...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                <div className="flex gap-6 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center gap-1">
                    <Activity size={14} className="text-slate-400" />
                    <span>Total Registered: {sessionRecords.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck size={14} className="text-emerald-500" />
                    <span>Present: {sessionRecords.filter(r => r.status === 'Present').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserX size={14} className="text-rose-500" />
                    <span>Absent: {sessionRecords.filter(r => r.status === 'Absent').length}</span>
                  </div>
                </div>

                {!isEditingDetails ? (
                  <button
                    onClick={() => setIsEditingDetails(true)}
                    className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Edit Records
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setIsEditingDetails(false)}
                      className="border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateSessionRecords}
                      className="bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Save Updates
                    </button>
                  </div>
                )}
              </div>

              {/* Attendance Listing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sessionRecords.map(record => (
                  <div
                    key={record.id}
                    onClick={() => isEditingDetails && toggleDetailRecordStatus(record.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      isEditingDetails ? 'cursor-pointer hover:border-blue-300' : ''
                    } ${
                      record.status === 'Present' 
                        ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' 
                        : 'bg-rose-50/40 border-rose-100 text-rose-900'
                    }`}
                  >
                    <span className="text-xs font-semibold">{record.member_name}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold py-0.5 px-2 rounded-full border ${
                      record.status === 'Present' 
                        ? 'bg-emerald-600 border-transparent text-white' 
                        : 'bg-rose-600 border-transparent text-white'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
