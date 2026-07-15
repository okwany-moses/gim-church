import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  User, 
  Calendar, 
  Users, 
  Info, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  GitBranch,
  Home
} from 'lucide-react';
import { Branch, CellGroup } from '../types.js';
import ConfirmModal from './ConfirmModal.js';

interface AdminBranchesProps {
  branches: Branch[];
  cellGroups: CellGroup[];
  onRefresh: () => void;
  onAddBranch: (branch: Partial<Branch>) => Promise<any>;
  onUpdateBranch: (id: number, branch: Partial<Branch>) => Promise<any>;
  onDeleteBranch: (id: number) => Promise<any>;
  onBulkDeleteBranches: (ids: number[]) => Promise<any>;
  onAddCellGroup: (cg: Partial<CellGroup>) => Promise<any>;
  onUpdateCellGroup: (id: number, cg: Partial<CellGroup>) => Promise<any>;
  onDeleteCellGroup: (id: number) => Promise<any>;
  onBulkDeleteCellGroups: (ids: number[]) => Promise<any>;
}

export default function AdminBranches({
  branches,
  cellGroups,
  onRefresh,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  onBulkDeleteBranches,
  onAddCellGroup,
  onUpdateCellGroup,
  onDeleteCellGroup,
  onBulkDeleteCellGroups
}: AdminBranchesProps) {
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

  const [activeTab, setActiveTab] = useState<'branches' | 'cell_groups'>('branches');

  // Selection States
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [selectedCellIds, setSelectedCellIds] = useState<number[]>([]);
  const [cellBranchFilter, setCellBranchFilter] = useState<string>('All');

  // Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<CellGroup | null>(null);

  // Branch Form fields
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchPastor, setBranchPastor] = useState('');
  const [branchDate, setBranchDate] = useState('');
  const [branchError, setBranchError] = useState('');

  // Cell Group Form fields
  const [cellName, setCellName] = useState('');
  const [cellLeader, setCellLeader] = useState('');
  const [cellMeeting, setCellMeeting] = useState('');
  const [cellBranchId, setCellBranchId] = useState('');
  const [cellError, setCellError] = useState('');

  // Open Handlers
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchLocation('');
    setBranchPastor('');
    setBranchDate(new Date().toISOString().split('T')[0]);
    setBranchError('');
    setIsBranchModalOpen(true);
  };

  const openEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchName(b.name);
    setBranchLocation(b.location);
    setBranchPastor(b.pastor);
    setBranchDate(b.date_opened);
    setBranchError('');
    setIsBranchModalOpen(true);
  };

  const openAddCell = () => {
    setEditingCell(null);
    setCellName('');
    setCellLeader('');
    setCellMeeting('');
    setCellBranchId(branches[0]?.id?.toString() || '');
    setCellError('');
    setIsCellModalOpen(true);
  };

  const openEditCell = (c: CellGroup) => {
    setEditingCell(c);
    setCellName(c.name);
    setCellLeader(c.leader);
    setCellMeeting(c.meeting_details);
    setCellBranchId(c.branch_id?.toString() || '');
    setCellError('');
    setIsCellModalOpen(true);
  };

  // Submit Handlers
  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchLocation.trim() || !branchPastor.trim()) {
      setBranchError('Please complete all required fields.');
      return;
    }

    const payload: Partial<Branch> = {
      name: branchName,
      location: branchLocation,
      pastor: branchPastor,
      date_opened: branchDate || new Date().toISOString().split('T')[0]
    };

    try {
      if (editingBranch) {
        await onUpdateBranch(editingBranch.id, payload);
      } else {
        await onAddBranch(payload);
      }
      setIsBranchModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setBranchError(err.message || 'Error saving branch details.');
    }
  };

  const handleCellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellName.trim() || !cellLeader.trim() || !cellMeeting.trim()) {
      setCellError('Please complete all required fields.');
      return;
    }

    const payload: Partial<CellGroup> = {
      name: cellName,
      leader: cellLeader,
      meeting_details: cellMeeting,
      branch_id: cellBranchId ? parseInt(cellBranchId, 10) : null
    };

    try {
      if (editingCell) {
        await onUpdateCellGroup(editingCell.id, payload);
      } else {
        await onAddCellGroup(payload);
      }
      setIsCellModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setCellError(err.message || 'Error saving cell group details.');
    }
  };

  const handleDeleteBranch = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Branch',
      message: 'Deleting this branch will unlink any associated cell groups and members. Are you sure you want to proceed?',
      onConfirm: async () => {
        try {
          await onDeleteBranch(id);
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting branch');
        }
      }
    });
  };

  const handleDeleteCell = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Cell Fellowship',
      message: 'Are you sure you want to permanently delete this cell fellowship group?',
      onConfirm: async () => {
        try {
          await onDeleteCellGroup(id);
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting cell group');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation Headers and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex bg-slate-50 border border-slate-200/60 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'branches' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <GitBranch size={13} />
            <span>Regional Branches ({branches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cell_groups')}
            className={`px-4 py-2 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${activeTab === 'cell_groups' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Home size={13} />
            <span>Home Cell Fellowships ({cellGroups.length})</span>
          </button>
        </div>

        <button
          onClick={activeTab === 'branches' ? openAddBranch : openAddCell}
          className="inline-flex items-center gap-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-semibold hover:bg-blue-700 shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>{activeTab === 'branches' ? 'Add New Branch' : 'Add Cell Fellowship'}</span>
        </button>
      </div>

      {/* BRANCHES GRID */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
              <input
                type="checkbox"
                checked={branches.length > 0 && selectedBranchIds.length === branches.length}
                onChange={(e) => {
                  if (e.target.checked) setSelectedBranchIds(branches.map(x => x.id));
                  else setSelectedBranchIds([]);
                }}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Select All Branches ({branches.length})</span>
            </label>
            {selectedBranchIds.length > 0 && (
              <span className="font-bold text-blue-700">{selectedBranchIds.length} selected</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(b => {
              const branchCellsCount = cellGroups.filter(cg => cg.branch_id === b.id).length;
              const isSelected = selectedBranchIds.includes(b.id);

              return (
                <div key={b.id} className={`bg-white rounded-xl border transition duration-200 p-6 space-y-4 flex flex-col justify-between ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md'}`}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedBranchIds(prev => [...prev, b.id]);
                            else setSelectedBranchIds(prev => prev.filter(x => x !== b.id));
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                        />
                        <div>
                          <h3 className="text-md font-extrabold text-blue-900 tracking-tight">{b.name}</h3>
                          <p className="text-xs text-blue-600 font-medium">Regional GIMK Branch</p>
                        </div>
                      </div>
                      <span className="bg-blue-50 text-blue-800 font-semibold text-[10px] py-1 px-2.5 rounded-full border border-blue-100 flex items-center gap-1">
                        <Users size={11} />
                        <span>{branchCellsCount} Cells</span>
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs text-slate-600 pl-6">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span>{b.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400 shrink-0" />
                        <span>Lead Pastor: <strong>{b.pastor}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>Founded: {new Date(b.date_opened).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-4 border-t border-slate-50 mt-4 pl-6">
                    <button 
                      onClick={() => openEditBranch(b)}
                      className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-blue-600 transition cursor-pointer"
                      title="Edit Branch"
                    >
                      <Edit size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBranch(b.id)}
                      className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                      title="Delete Branch"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky selection toolbar for Branches */}
          {selectedBranchIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-xs font-semibold whitespace-nowrap bg-blue-950 px-3 py-1.5 rounded-full border border-blue-900 text-blue-300">
                {selectedBranchIds.length} selected
              </span>
              
              <div className="h-5 w-px bg-slate-800" />

              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Bulk Delete Branches',
                    message: `Are you sure you want to permanently delete these ${selectedBranchIds.length} selected branches? This will cascade-delete linked cell groups and records.`,
                    onConfirm: async () => {
                      try {
                        await onBulkDeleteBranches(selectedBranchIds);
                        setSelectedBranchIds([]);
                        onRefresh();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      } catch (err: any) {
                        alert(err.message || 'Error deleting branches');
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
        </div>
      )}

      {/* CELL GROUPS GRID */}
      {activeTab === 'cell_groups' && (() => {
        const filteredCellGroups = cellGroups.filter(cg => {
          if (cellBranchFilter === 'All') return true;
          if (cellBranchFilter === 'None') return !cg.branch_id;
          return cg.branch_id === parseInt(cellBranchFilter, 10);
        });

        return (
          <>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={filteredCellGroups.length > 0 && filteredCellGroups.every(cg => selectedCellIds.includes(cg.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCellIds(prev => {
                        const union = new Set([...prev, ...filteredCellGroups.map(x => x.id)]);
                        return Array.from(union);
                      });
                      else setSelectedCellIds(prev => prev.filter(id => !filteredCellGroups.some(cg => cg.id === id)));
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Select All Filtered ({filteredCellGroups.length})</span>
                </label>

                {/* Branch Filter dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Filter by Branch:</span>
                  <select
                    value={cellBranchFilter}
                    onChange={(e) => setCellBranchFilter(e.target.value)}
                    className="py-1 px-2.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Branches / HQs</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                    <option value="None">Independent / No Branch</option>
                  </select>
                </div>

                {selectedCellIds.length > 0 && (
                  <span className="font-bold text-blue-700">{selectedCellIds.length} selected</span>
                )}
              </div>

              {filteredCellGroups.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No home cell fellowships found for this branch.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCellGroups.map(cg => {
                    const isSelected = selectedCellIds.includes(cg.id);

                    return (
                      <div key={cg.id} className={`bg-white rounded-xl border transition duration-200 p-5 space-y-3 flex flex-col justify-between ${isSelected ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/5' : 'border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-md'}`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              <input
                               type="checkbox"
                               checked={isSelected}
                               onChange={(e) => {
                                 if (e.target.checked) setSelectedCellIds(prev => [...prev, cg.id]);
                                 else setSelectedCellIds(prev => prev.filter(x => x !== cg.id));
                               }}
                               className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                             />
                             <div>
                               <h3 className="text-sm font-extrabold text-blue-900 tracking-tight">{cg.name}</h3>
                               <span className="text-[10px] text-slate-400">Linked branch: {cg.branch_name || 'No Branch'}</span>
                             </div>
                           </div>
                         </div>

                         <div className="space-y-1.5 text-xs text-slate-600 pl-5">
                           <div className="flex items-center gap-2">
                             <User size={13} className="text-slate-400 shrink-0" />
                             <span>Host / Leader: <strong>{cg.leader}</strong></span>
                           </div>
                           <div className="flex items-center gap-2">
                             <Info size={13} className="text-slate-400 shrink-0" />
                             <span>Schedule: <strong className="text-slate-700">{cg.meeting_details}</strong></span>
                           </div>
                         </div>
                       </div>

                       <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-50 mt-3 pl-5">
                         <button 
                           onClick={() => openEditCell(cg)}
                           className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-blue-600 transition cursor-pointer"
                           title="Edit Cell"
                         >
                           <Edit size={13} />
                         </button>
                         <button 
                           onClick={() => handleDeleteCell(cg.id)}
                           className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                           title="Delete Cell"
                         >
                           <Trash2 size={13} />
                         </button>
                       </div>
                     </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky selection toolbar for Cell Groups */}
            {selectedCellIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
                <span className="text-xs font-semibold whitespace-nowrap bg-blue-950 px-3 py-1.5 rounded-full border border-blue-900 text-blue-300">
                  {selectedCellIds.length} selected
                </span>
                
                <div className="h-5 w-px bg-slate-800" />

                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Bulk Delete Cell Groups',
                      message: `Are you sure you want to permanently delete these ${selectedCellIds.length} selected cell groups?`,
                      onConfirm: async () => {
                        try {
                          await onBulkDeleteCellGroups(selectedCellIds);
                          setSelectedCellIds([]);
                          onRefresh();
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        } catch (err: any) {
                          alert(err.message || 'Error deleting cell groups');
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
          </>
        );
      })()}

      {/* ---------------- BRANCH MODAL ---------------- */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingBranch ? 'Modify Branch Registry' : 'Establish New Regional Branch'}
              </h3>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} className="p-5 space-y-4">
              {branchError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-lg text-xs">
                  {branchError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Branch Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. GIMK Kisumu Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Location Details *</label>
                <input 
                  type="text"
                  placeholder="e.g. Nyalenda, Kisumu County"
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Lead Pastor Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Pastor Mary Atieno"
                  value={branchPastor}
                  onChange={(e) => setBranchPastor(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Date Opened</label>
                <input 
                  type="date"
                  value={branchDate}
                  onChange={(e) => setBranchDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingBranch ? 'Apply Changes' : 'Register Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- CELL GROUP MODAL ---------------- */}
      {isCellModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingCell ? 'Modify Fellowship details' : 'Inaugurate Home Cell Fellowship'}
              </h3>
              <button onClick={() => setIsCellModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCellSubmit} className="p-5 space-y-4">
              {cellError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-lg text-xs">
                  {cellError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Cell Fellowship Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Kabondo Light Fellowship"
                  value={cellName}
                  onChange={(e) => setCellName(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fellowship Host / Leader *</label>
                <input 
                  type="text"
                  placeholder="e.g. Deaconess Jane Awuor"
                  value={cellLeader}
                  onChange={(e) => setCellLeader(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Meeting Details (Schedule / Location) *</label>
                <input 
                  type="text"
                  placeholder="e.g. Thursdays 6:00 PM - Kabondo Center"
                  value={cellMeeting}
                  onChange={(e) => setCellMeeting(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Affiliated Regional Branch *</label>
                <select
                  value={cellBranchId}
                  onChange={(e) => setCellBranchId(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700 bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsCellModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingCell ? 'Apply Changes' : 'Establish Fellowship'}</span>
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
