import React, { useState } from 'react';
import { 
  CheckSquare, 
  UserCheck, 
  Clock, 
  MapPin, 
  Plus, 
  Calendar, 
  Search, 
  Award, 
  Check, 
  X, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Member, Branch, AttendanceSession } from '../types.js';

interface UsherDashboardProps {
  sessions: AttendanceSession[];
  branches: Branch[];
  members: Member[];
  onRefresh: () => void;
  onAddSession: (data: { date: string; service_name: string; branch_id: number; records: { member_id: number; status: string }[] }) => Promise<any>;
}

export default function UsherDashboard({
  sessions,
  branches,
  members,
  onRefresh,
  onAddSession
}: UsherDashboardProps) {
  // Config state
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [serviceName, setServiceName] = useState('Sunday Morning Main Service');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Roll call roster state (map member_id to 'Present' or 'Absent')
  const [roster, setRoster] = useState<Record<number, 'Present' | 'Absent'>>({});
  
  // Search state to filter list
  const [searchTerm, setSearchTerm] = useState('');

  // Status logs
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When branch is selected, initialize roster with all branch members as 'Absent' by default
  const handleSelectBranch = (branchIdStr: string) => {
    setSelectedBranchId(branchIdStr);
    setSuccessMsg('');
    setErrorMsg('');
    if (!branchIdStr) {
      setRoster({});
      return;
    }

    const branchId = parseInt(branchIdStr, 10);
    const branchMembers = members.filter(m => m.branch_id === branchId);
    
    const initialRoster: Record<number, 'Present' | 'Absent'> = {};
    branchMembers.forEach(m => {
      initialRoster[m.id] = 'Absent'; // default
    });
    setRoster(initialRoster);
  };

  const branchIdVal = selectedBranchId ? parseInt(selectedBranchId, 10) : null;
  const branchMembers = members.filter(m => m.branch_id === branchIdVal);

  // Toggle present vs absent
  const handleToggleStatus = (memberId: number, status: 'Present' | 'Absent') => {
    setRoster(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  // Submit session
  const handleSubmitRollCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedBranchId) {
      setErrorMsg('Please select a branch / parish location first.');
      return;
    }
    if (!serviceName.trim()) {
      setErrorMsg('Service name cannot be empty.');
      return;
    }

    // Format records
    const records = Object.entries(roster).map(([memberIdStr, status]) => ({
      member_id: parseInt(memberIdStr, 10),
      status: status as string
    }));

    if (records.length === 0) {
      setErrorMsg('No members are registered in this parish to log attendance.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddSession({
        date: serviceDate,
        service_name: serviceName,
        branch_id: parseInt(selectedBranchId, 10),
        records: records
      });

      const totalPresent = records.filter(r => r.status === 'Present').length;
      setSuccessMsg(`Successfully submitted Roll Call! Logged ${totalPresent} present out of ${records.length} members.`);
      
      // Clear branch selection
      setSelectedBranchId('');
      setServiceName('Sunday Morning Main Service');
      setRoster({});
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit attendance session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter roster by name search
  const filteredBranchMembers = branchMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="usher-dashboard-workspace">
      {/* Usher Header Banner */}
      <div className="relative bg-gradient-to-r from-blue-950 to-slate-900 p-6 rounded-2xl border border-blue-900/40 text-white shadow-md overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6 select-none pointer-events-none">
          <CheckSquare size={180} className="text-blue-500" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
              <Sparkles size={11} />
              <span>Ushering Desk</span>
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-1.5 font-sans">Roster Roll Call Desk</h2>
            <p className="text-xs text-slate-300 font-medium">Quick digital attendance roll call logs for GIMK Sunday worship & Midweek meetings.</p>
          </div>
        </div>
      </div>

      {/* Main Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roll Call Form pane */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px]">
          <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Active Attendance Logging</h3>
              <p className="text-[10px] text-slate-400">Select location and mark present members</p>
            </div>

            {selectedBranchId && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border px-2.5 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Roster loaded: {branchMembers.length} names</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitRollCall} className="flex-1 flex flex-col min-h-0">
            {/* Header selection row */}
            <div className="p-4 border-b border-slate-150 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 bg-slate-50/20">
              {/* Branch Selector */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Choose Parish / Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => handleSelectBranch(e.target.value)}
                  className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs w-full bg-white focus:outline-hidden text-slate-700 font-bold"
                >
                  <option value="">Select location...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Service name */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Worship Service Title</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs w-full bg-white focus:outline-hidden"
                  placeholder="Sunday Main Service"
                />
              </div>

              {/* Service date */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Service Date</label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs w-full bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {selectedBranchId ? (
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                {/* Search in active list */}
                <div className="p-3 border-b border-slate-100 shrink-0 flex items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter members by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-full bg-slate-50 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Checklist scrollable items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                  {filteredBranchMembers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                      No matching names in this Parish directory.
                    </div>
                  ) : (
                    filteredBranchMembers.map(m => {
                      const mStatus = roster[m.id] || 'Absent';
                      
                      return (
                        <div key={m.id} className="p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-150 flex items-center justify-between gap-4 transition">
                          <div className="truncate">
                            <h4 className="text-xs font-black text-slate-800 truncate">{m.name}</h4>
                            <span className="text-[9px] font-mono text-slate-400">ID: GIMK-{m.id} • {m.family_role || 'Member'}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(m.id, 'Present')}
                              className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition cursor-pointer select-none border ${mStatus === 'Present' ? 'bg-green-600 border-green-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(m.id, 'Absent')}
                              className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition cursor-pointer select-none border ${mStatus === 'Absent' ? 'bg-red-500 border-red-500 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sticky submit button row */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
                  <div>
                    {successMsg && <p className="text-[11px] font-bold text-green-700">{successMsg}</p>}
                    {errorMsg && <p className="text-[11px] font-bold text-red-600">{errorMsg}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer select-none flex items-center gap-1"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="animate-spin" size={12} />
                    ) : (
                      <Check size={12} />
                    )}
                    <span>Submit Roll Call</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <UserCheck size={36} className="text-slate-300 mb-2.5 animate-bounce" />
                <p className="text-xs font-semibold">Select a Parish location above</p>
                <p className="text-[10px] text-slate-400 max-w-[240px] mt-0.5">Usher workspaces are tied to Parish registers. Once loaded, you can record attendance checklists and submit logs instantly.</p>
              </div>
            )}
          </form>
        </div>

        {/* Attendance logs timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px]">
          <div className="p-4 bg-slate-50 border-b border-slate-150">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Recent Attendance Logs</h3>
            <p className="text-[10px] text-slate-400">Historical records of recent services checklists</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-semibold text-xs">
                No recent sessions found.
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="p-4 space-y-2 hover:bg-slate-50/40">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase">
                    <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">SESSION-{s.id}</span>
                    <span className="text-slate-400 font-mono">{s.date}</span>
                  </div>

                  <h4 className="text-xs font-black text-slate-800">{s.service_name}</h4>
                  
                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400" />
                      <span>{s.branch_name}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Award size={11} className="text-blue-500" />
                      <span>{s.present_count || 0} Present</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
