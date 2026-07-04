import React, { useState, useRef } from 'react';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  FileDown, 
  FileUp, 
  Filter, 
  X, 
  Edit, 
  Check, 
  ChevronDown, 
  Info,
  ChevronUp,
  AlertCircle,
  Printer
} from 'lucide-react';
import Papa from 'papaparse';
import { Member, Branch, CellGroup } from '../types.js';
import ConfirmModal from './ConfirmModal.js';

interface AdminMembersProps {
  members: Member[];
  branches: Branch[];
  cellGroups: CellGroup[];
  onRefresh: () => void;
  onAddMember: (member: Partial<Member>) => Promise<any>;
  onUpdateMember: (id: number, member: Partial<Member>) => Promise<any>;
  onDeleteMember: (id: number) => Promise<any>;
  onBulkDeleteMembers: (ids: number[]) => Promise<any>;
  onBulkUpdateMembersStatus: (ids: number[], status: string) => Promise<any>;
  onImportMembers: (list: Partial<Member>[]) => Promise<any>;
}

export default function AdminMembers({
  members,
  branches,
  cellGroups,
  onRefresh,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onBulkDeleteMembers,
  onBulkUpdateMembersStatus,
  onImportMembers
}: AdminMembersProps) {
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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Table Sorting State
  const [sortField, setSortField] = useState<keyof Member>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formJoinDate, setFormJoinDate] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formGender, setFormGender] = useState('Male');
  const [formFamilyRole, setFormFamilyRole] = useState('Single');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formCellGroupId, setFormCellGroupId] = useState<string>('');

  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAddModal = () => {
    setEditingMember(null);
    setFormName('');
    setFormContact('');
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Active');
    setFormGender('Male');
    setFormFamilyRole('Single');
    setFormBirthDate('');
    setFormBranchId(branches[0]?.id?.toString() || '');
    setFormCellGroupId('');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormContact(member.contact);
    setFormJoinDate(member.join_date);
    setFormStatus(member.status);
    setFormGender(member.gender);
    setFormFamilyRole(member.family_role);
    setFormBirthDate(member.birth_date);
    setFormBranchId(member.branch_id?.toString() || '');
    setFormCellGroupId(member.cell_group_id?.toString() || '');
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContact.trim()) {
      setFormError('Name and Contact number are required.');
      return;
    }

    const payload: Partial<Member> = {
      name: formName,
      contact: formContact,
      join_date: formJoinDate || new Date().toISOString().split('T')[0],
      status: formStatus,
      gender: formGender,
      family_role: formFamilyRole,
      birth_date: formBirthDate,
      branch_id: formBranchId ? parseInt(formBranchId, 10) : null,
      cell_group_id: formCellGroupId ? parseInt(formCellGroupId, 10) : null
    };

    try {
      if (editingMember) {
        await onUpdateMember(editingMember.id, payload);
      } else {
        await onAddMember(payload);
      }
      setIsFormModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Error saving member details.');
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member',
      message: 'Are you sure you want to permanently delete this member from the register?',
      onConfirm: async () => {
        try {
          await onDeleteMember(id);
          setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting member.');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Members',
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected members?`,
      onConfirm: async () => {
        try {
          await onBulkDeleteMembers(selectedIds);
          setSelectedIds([]);
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error during bulk deletion.');
        }
      }
    });
  };

  // CSV Export
  const exportCSV = () => {
    const dataToExport = filteredMembers.map(m => ({
      'Name': m.name,
      'Contact': m.contact,
      'Join Date': m.join_date,
      'Status': m.status,
      'Gender': m.gender,
      'Family Role': m.family_role,
      'Birth Date': m.birth_date,
      'Branch': m.branch_name || '',
      'Cell Group': m.cell_group_name || ''
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'GIMK_Members_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleCSVImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedRows = results.data as any[];
        if (parsedRows.length === 0) {
          alert('No records found in CSV');
          return;
        }

        // Map header columns to match database
        const mappedList: Partial<Member>[] = parsedRows.map(row => {
          // Attempt to find branch by name, else use first branch
          const branchNameLower = (row.Branch || row.branch || '').toLowerCase();
          const matchedBranch = branches.find(b => b.name.toLowerCase().includes(branchNameLower));
          
          const cellNameLower = (row['Cell Group'] || row.cell_group || '').toLowerCase();
          const matchedCell = cellGroups.find(c => c.name.toLowerCase().includes(cellNameLower));

          return {
            name: row.Name || row.name || 'Imported Member',
            contact: row.Contact || row.contact || '',
            join_date: row['Join Date'] || row.join_date || new Date().toISOString().split('T')[0],
            status: row.Status || row.status || 'Active',
            gender: row.Gender || row.gender || 'Male',
            family_role: row['Family Role'] || row.family_role || 'Single',
            birth_date: row['Birth Date'] || row.birth_date || '',
            branch_id: matchedBranch ? matchedBranch.id : (branches[0]?.id || null),
            cell_group_id: matchedCell ? matchedCell.id : null
          };
        });

        try {
          await onImportMembers(mappedList);
          alert(`Successfully imported ${mappedList.length} members!`);
          onRefresh();
        } catch (err: any) {
          alert(`Failed to import: ${err.message}`);
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sorting logic
  const handleSort = (field: keyof Member) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Member) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-slate-300 ml-1 inline" />;
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-blue-600 ml-1 inline" /> 
      : <ChevronDown size={14} className="text-blue-600 ml-1 inline" />;
  };

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredMembers.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Filter & Search Implementation
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.branch_name && member.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.cell_group_name && member.cell_group_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || member.status === statusFilter;
    const matchesBranch = branchFilter === 'All' || member.branch_id?.toString() === branchFilter;
    const matchesGender = genderFilter === 'All' || member.gender === genderFilter;
    const matchesRole = roleFilter === 'All' || member.family_role === roleFilter;

    return matchesSearch && matchesStatus && matchesBranch && matchesGender && matchesRole;
  }).sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div>
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">Congregant Directory</h2>
          <p className="text-xs text-slate-500">Manage GIMK church membership registry</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCSVFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={handleCSVImportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <FileUp size={14} />
            <span>Import CSV</span>
          </button>
          <button 
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <FileDown size={14} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer select-none"
          >
            <Printer size={14} />
            <span>Print Directory</span>
          </button>
          <button 
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-1 sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, phone, or cell group..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Visitor">Visitor</option>
            </select>
          </div>

          {/* Branch filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="py-2 px-3 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs text-slate-700"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="py-2 px-3 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs text-slate-700"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Role filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-2 px-3 w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs text-slate-700"
            >
              <option value="All">All Family Roles</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Youth">Youth</option>
              <option value="Child">Child</option>
              <option value="Single">Single</option>
            </select>
          </div>
        </div>

        {/* Sticky selection toolbar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
            <span className="text-xs font-semibold whitespace-nowrap bg-blue-950 px-3 py-1.5 rounded-full border border-blue-900 text-blue-300">
              {selectedIds.length} selected
            </span>
            
            <div className="h-5 w-px bg-slate-800 hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap hidden sm:inline">Set Status:</span>
              <select
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  try {
                    await onBulkUpdateMembersStatus(selectedIds, val);
                    setSelectedIds([]);
                    onRefresh();
                  } catch (err: any) {
                    alert(err.message || 'Error updating status');
                  }
                }}
                defaultValue=""
                className="bg-slate-950 border border-slate-800 text-xs rounded-full px-3 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">-- Change Status --</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="h-5 w-px bg-slate-800" />

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shadow-md shrink-0"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-4 w-12 text-center">
                  <input 
                    type="checkbox"
                    checked={filteredMembers.length > 0 && selectedIds.length === filteredMembers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-4 px-4 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('name')}>
                  Name {getSortIcon('name')}
                </th>
                <th className="py-4 px-4">Contact</th>
                <th className="py-4 px-4 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('join_date')}>
                  Join Date {getSortIcon('join_date')}
                </th>
                <th className="py-4 px-4">Branch</th>
                <th className="py-4 px-4">Cell Group</th>
                <th className="py-4 px-4">Family Role</th>
                <th className="py-4 px-4 cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </th>
                <th className="py-4 px-4 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 px-4 text-center text-slate-400">
                    No congregants match the filters or search term
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(member.id)}
                        onChange={(e) => handleSelectOne(member.id, e.target.checked)}
                        className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{member.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{member.contact}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(member.join_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-600">{member.branch_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{member.cell_group_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{member.family_role}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        member.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : member.status === 'Inactive'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1 hover:text-blue-600 text-slate-400 rounded-sm transition cursor-pointer"
                          title="Edit congregant details"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-1 hover:text-rose-600 text-slate-400 rounded-sm transition cursor-pointer"
                          title="Delete congregant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-800">
                {editingMember ? 'Edit Congregant Profile' : 'Register New Congregant'}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Full name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Full Name *</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Elder Moses Okwany"
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  />
                </div>

                {/* Contact phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Contact Phone *</label>
                  <input 
                    type="text" 
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    required
                    placeholder="+254..."
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs font-mono text-slate-800"
                  />
                </div>

                {/* Date registered */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Join Date</label>
                  <input 
                    type="date" 
                    value={formJoinDate}
                    onChange={(e) => setFormJoinDate(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* Family role */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Family/Church Role</label>
                  <select
                    value={formFamilyRole}
                    onChange={(e) => setFormFamilyRole(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Youth">Youth</option>
                    <option value="Child">Child</option>
                    <option value="Single">Single</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Member Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Visitor">Visitor</option>
                  </select>
                </div>

                {/* Birth date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Birth Date</label>
                  <input 
                    type="date" 
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  />
                </div>

                {/* Branch affiliation */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Branch Affiliation</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  >
                    <option value="">No branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cell Group fellowship */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Cell Fellowship Group</label>
                  <select
                    value={formCellGroupId}
                    onChange={(e) => setFormCellGroupId(e.target.value)}
                    className="w-full border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg p-2.5 text-xs text-slate-800"
                  >
                    <option value="">No Cell Fellowship</option>
                    {cellGroups
                      .filter(cg => !formBranchId || cg.branch_id === parseInt(formBranchId, 10))
                      .map(cg => (
                        <option key={cg.id} value={cg.id}>{cg.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Check size={14} />
                  <span>{editingMember ? 'Apply Changes' : 'Save Record'}</span>
                </button>
              </div>
            </form>
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
