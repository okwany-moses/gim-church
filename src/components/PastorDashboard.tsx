import React, { useState } from 'react';
import { 
  Heart, 
  Send, 
  Users, 
  FileDown, 
  UserPlus, 
  MessageSquare, 
  Sparkles, 
  Check, 
  Trash2, 
  Search, 
  MapPin, 
  TrendingUp, 
  ShieldAlert, 
  Database,
  Grid
} from 'lucide-react';
import Papa from 'papaparse';
import { Member, Branch, CellGroup, PrayerRequest, BulkSms } from '../types.js';
import ConfirmModal from './ConfirmModal.js';

interface PastorDashboardProps {
  members: Member[];
  branches: Branch[];
  cellGroups: CellGroup[];
  prayerRequests: PrayerRequest[];
  bulkSmsLogs: BulkSms[];
  onRefresh: () => void;
  onAddMember: (member: Partial<Member>) => Promise<any>;
  onSendBulkSms: (sms: { sender: string; message: string; recipients: string }) => Promise<any>;
  onUpdatePrayerRequestStatus: (id: number, status: string) => Promise<any>;
  onDeletePrayerRequest: (id: number) => Promise<any>;
}

export default function PastorDashboard({
  members,
  branches,
  cellGroups,
  prayerRequests,
  bulkSmsLogs,
  onRefresh,
  onAddMember,
  onSendBulkSms,
  onUpdatePrayerRequestStatus,
  onDeletePrayerRequest
}: PastorDashboardProps) {
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

  const [activeTab, setActiveTab] = useState<'roster' | 'care' | 'sms'>('roster');

  // Roster Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');

  // Enroll Form fields
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollContact, setEnrollContact] = useState('');
  const [enrollGender, setEnrollGender] = useState('Male');
  const [enrollRole, setEnrollRole] = useState('Single');
  const [enrollBranch, setEnrollBranch] = useState('');
  const [enrollCellGroup, setEnrollCellGroup] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');
  const [enrollError, setEnrollError] = useState('');

  // Bulk SMS fields
  const [smsSender, setSmsSender] = useState('Senior Pastor GIMK');
  const [smsTargetGroup, setSmsTargetGroup] = useState('All');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSuccess, setSmsSuccess] = useState('');
  const [smsError, setSmsError] = useState('');

  // Calculations
  const activeMembersCount = members.filter(m => m.status === 'Active').length;
  const pendingPrayers = prayerRequests.filter(p => p.status === 'Pending').length;

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.cell_group_name && m.cell_group_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesBranch = selectedBranch === 'All' || m.branch_id?.toString() === selectedBranch;

    return matchesSearch && matchesBranch;
  });

  // Export Member roster to Excel-compatible CSV format
  const handleDownloadRosterExcel = () => {
    const excelData = filteredMembers.map(m => ({
      'Congregant ID': `GIMK-${m.id}`,
      'Full Name': m.name,
      'Phone Number': m.contact,
      'Parish / Branch': m.branch_name || 'N/A',
      'Fellowship / Cell Group': m.cell_group_name || 'N/A',
      'Gender': m.gender,
      'Family Role': m.family_role,
      'Registration Date': m.join_date,
      'Activity Status': m.status
    }));

    const csv = Papa.unparse(excelData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'GIMK_Official_Congregant_Roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Enroll Member Form
  const handleEnrollMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError('');
    setEnrollSuccess('');

    if (!enrollName.trim() || !enrollContact.trim()) {
      setEnrollError('Congregant Full Name and Contact Phone are required.');
      return;
    }

    try {
      const payload: Partial<Member> = {
        name: enrollName,
        contact: enrollContact,
        gender: enrollGender,
        family_role: enrollRole,
        branch_id: enrollBranch ? parseInt(enrollBranch, 10) : (branches[0]?.id || null),
        cell_group_id: enrollCellGroup ? parseInt(enrollCellGroup, 10) : null,
        status: 'Active',
        join_date: new Date().toISOString().split('T')[0]
      };

      await onAddMember(payload);
      setEnrollSuccess(`Successfully registered and enrolled ${enrollName}!`);
      
      // Reset form fields
      setEnrollName('');
      setEnrollContact('');
      setEnrollGender('Male');
      setEnrollRole('Single');
      setEnrollBranch('');
      setEnrollCellGroup('');
      onRefresh();
    } catch (err: any) {
      setEnrollError(err.message || 'Failed to enroll member.');
    }
  };

  // Broadcast Bulk SMS
  const handleBroadcastSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsError('');
    setSmsSuccess('');

    if (!smsMessage.trim()) {
      setSmsError('Please write a message content before sending.');
      return;
    }

    try {
      // Determine targets
      let targetContacts = '';
      if (smsTargetGroup === 'All') {
        targetContacts = members.map(m => m.contact).filter(Boolean).join(', ');
      } else {
        // filter by branch
        targetContacts = members
          .filter(m => m.branch_id?.toString() === smsTargetGroup)
          .map(m => m.contact)
          .filter(Boolean)
          .join(', ');
      }

      await onSendBulkSms({
        sender: smsSender,
        message: smsMessage,
        recipients: targetContacts
      });

      setSmsSuccess(`Bulk SMS broadcast submitted to network! Sent message successfully.`);
      setSmsMessage('');
      onRefresh();
    } catch (err: any) {
      setSmsError(err.message || 'Broadcast failed.');
    }
  };

  return (
    <div className="space-y-6" id="pastor-dashboard-workspace">
      {/* Pastor Header Banner */}
      <div className="relative bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl border border-blue-800 text-white shadow-md overflow-hidden">
        <div className="absolute right-0 top-0 opacity-15 transform translate-x-12 -translate-y-6 select-none pointer-events-none">
          <Heart size={200} className="text-amber-400" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
              <Sparkles size={11} />
              <span>Pastoral Workspace</span>
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-1.5">GIMK Shepherd's Console</h2>
            <p className="text-xs text-blue-200/90 font-medium">Equipping pastors to lead Parishes, care for souls, and guide cell fellowships.</p>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${activeTab === 'roster' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              Roster & Enrollment
            </button>
            <button
              onClick={() => setActiveTab('care')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition relative cursor-pointer select-none ${activeTab === 'care' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              <span>Pastoral Care</span>
              {pendingPrayers > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 animate-pulse border border-blue-900">
                  {pendingPrayers}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${activeTab === 'sms' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              Bulk SMS Gateway
            </button>
          </div>
        </div>
      </div>

      {/* Pastoral Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Congregants</span>
            <p className="text-xl font-black text-slate-900">{members.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-50 text-green-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Active Members</span>
            <p className="text-xl font-black text-slate-900">{activeMembersCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Heart size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Prayer Requests</span>
            <p className="text-xl font-black text-slate-900">{prayerRequests.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <MessageSquare size={20} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">SMS Broadcasts</span>
            <p className="text-xl font-black text-slate-900">{bulkSmsLogs.length}</p>
          </div>
        </div>
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Quick Enroller Collapsible Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowEnrollForm(prev => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition font-bold text-slate-800 text-sm border-b border-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <UserPlus size={16} className="text-blue-600" />
                <span>Pastor's Member Enrollment Form</span>
              </span>
              <span className="text-xs text-blue-600 hover:underline">
                {showEnrollForm ? 'Hide Form' : 'Show Enroll Form'}
              </span>
            </button>

            {showEnrollForm && (
              <form onSubmit={handleEnrollMemberSubmit} className="p-5 space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Congregant Full Name</label>
                    <input
                      type="text"
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                      placeholder="e.g., Pastor David Otieno"
                      className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50"
                    />
                  </div>

                  {/* Contact */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                    <input
                      type="text"
                      value={enrollContact}
                      onChange={(e) => setEnrollContact(e.target.value)}
                      placeholder="e.g., +254 712 345678"
                      className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                    <select
                      value={enrollGender}
                      onChange={(e) => setEnrollGender(e.target.value)}
                      className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Family Role */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Family Role</label>
                    <select
                      value={enrollRole}
                      onChange={(e) => setEnrollRole(e.target.value)}
                      className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Youth">Youth</option>
                    </select>
                  </div>

                  {/* Parish / Branch */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Assign Parish / Branch</label>
                    <select
                      value={enrollBranch}
                      onChange={(e) => setEnrollBranch(e.target.value)}
                      className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                    >
                      <option value="">Select Branch...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cell Group */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Assign Fellowship / Cell Group</label>
                    <select
                      value={enrollCellGroup}
                      onChange={(e) => setEnrollCellGroup(e.target.value)}
                      className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                    >
                      <option value="">None / Not Assigned</option>
                      {cellGroups.map(cg => (
                        <option key={cg.id} value={cg.id}>{cg.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {enrollError && (
                  <p className="text-[11px] font-bold text-red-600 bg-red-55 p-2 rounded-md">{enrollError}</p>
                )}

                {enrollSuccess && (
                  <p className="text-[11px] font-bold text-green-700 bg-green-55 p-2 rounded-md">{enrollSuccess}</p>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs"
                >
                  Confirm Registration
                </button>
              </form>
            )}
          </div>

          {/* Roster Sheet Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Church Directory</h3>
                <p className="text-[10px] text-slate-400">Search member details and download master sheet files</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, contact, cell..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden"
                  />
                </div>

                {/* Branch filter */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="py-2 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden text-slate-700"
                >
                  <option value="All">All Parishes</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                {/* Excel download trigger */}
                <button
                  onClick={handleDownloadRosterExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer select-none"
                >
                  <FileDown size={14} />
                  <span>Download Excel Sheet</span>
                </button>
              </div>
            </div>

            {/* Table display */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                    <th className="p-3">Ref</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Parish / Branch</th>
                    <th className="p-3">Cell Group</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">Join Date</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        No members match search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/40">
                        <td className="p-3 text-slate-400 font-mono">GIMK-{m.id}</td>
                        <td className="p-3 font-bold text-slate-900">{m.name}</td>
                        <td className="p-3 text-slate-500 font-mono">{m.contact}</td>
                        <td className="p-3 text-slate-600">{m.branch_name || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{m.cell_group_name || 'N/A'}</td>
                        <td className="p-3 text-slate-500">{m.gender}</td>
                        <td className="p-3 text-slate-400">{m.join_date}</td>
                        <td className="p-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'care' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-150">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Pastoral Care & Intercession Board</h3>
            <p className="text-[10px] text-slate-400">View and respond to prayer requests submitted by church members.</p>
          </div>

          <div className="divide-y divide-slate-150">
            {prayerRequests.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-semibold">
                No prayer requests submitted yet.
              </div>
            ) : (
              prayerRequests.map(req => (
                <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {req.date}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${req.is_anonymous === 1 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {req.is_anonymous === 1 ? 'Anonymous Request' : `From: ${req.requestor_name || 'Congregant'}`}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 animate-pulse' : req.status === 'Prayed For' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed italic pr-4">
                      "{req.content}"
                    </p>
                  </div>

                  <div className="flex flex-row md:flex-col items-center gap-1.5 shrink-0 pt-2 md:pt-0">
                    {req.status === 'Pending' && (
                      <button
                        onClick={async () => {
                          await onUpdatePrayerRequestStatus(req.id, 'Prayed For');
                          onRefresh();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition select-none"
                      >
                        <Check size={12} />
                        <span>Mark Prayed For</span>
                      </button>
                    )}
                    {req.status !== 'Addressed' && (
                      <button
                        onClick={async () => {
                          await onUpdatePrayerRequestStatus(req.id, 'Addressed');
                          onRefresh();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition select-none"
                      >
                        <Check size={12} />
                        <span>Mark Addressed</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Prayer Request',
                          message: 'Are you sure you want to permanently delete this prayer request?',
                          onConfirm: async () => {
                            await onDeletePrayerRequest(req.id);
                            onRefresh();
                          }
                        });
                      }}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                      title="Delete request"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send SMS Gateway pane */}
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bulk SMS Broadcaster</h3>
              <p className="text-[10px] text-slate-400">Compose and send SMS messages instantly to GIMK members</p>
            </div>

            <form onSubmit={handleBroadcastSms} className="space-y-4">
              {/* Sender ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Sender Mask/Name</label>
                <input
                  type="text"
                  value={smsSender}
                  onChange={(e) => setSmsSender(e.target.value)}
                  className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50"
                  placeholder="e.g. GIMK PASTOR"
                />
              </div>

              {/* Target Group */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Recipient Audience</label>
                <select
                  value={smsTargetGroup}
                  onChange={(e) => setSmsTargetGroup(e.target.value)}
                  className="px-3 py-1.5 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-hidden"
                >
                  <option value="All">All Registered Members ({members.length})</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>Parish: {b.name}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">SMS Message Content</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={5}
                  placeholder="Type spiritual announcements or reminders here..."
                  className="px-3 py-2 text-xs w-full border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-hidden"
                />
                <span className="text-[9px] font-bold text-slate-400 block text-right">
                  {smsMessage.length} characters (approx. {Math.ceil(smsMessage.length / 160)} SMS units)
                </span>
              </div>

              {smsError && (
                <p className="text-[11px] font-bold text-red-600 bg-red-55 p-2 rounded-md">{smsError}</p>
              )}

              {smsSuccess && (
                <p className="text-[11px] font-bold text-green-700 bg-green-55 p-2 rounded-md">{smsSuccess}</p>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-xs transition cursor-pointer"
              >
                <Send size={13} />
                <span>Transmit Broadcast</span>
              </button>
            </form>
          </div>

          {/* SMS Broadcast logs history pane */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-150">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Broadcast Transmission Logs</h3>
              <p className="text-[10px] text-slate-400">History of spiritual announcements sent out via bulk SMS</p>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[480px]">
              {bulkSmsLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-semibold text-xs">
                  No SMS logs recorded. Send your first broadcast broadcast on the left panel.
                </div>
              ) : (
                bulkSmsLogs.map(log => (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-slate-50/30">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">GIMK-SMS-{log.id}</span>
                        <span>•</span>
                        <span>Sender: {log.sender}</span>
                      </div>
                      <span className="text-slate-400 font-mono">{log.date}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-150/40">
                      "{log.message}"
                    </p>
                    <div className="text-[9px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Database size={11} className="text-blue-500" />
                      <span>Transmitted to {log.recipient_count} verified numbers</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
