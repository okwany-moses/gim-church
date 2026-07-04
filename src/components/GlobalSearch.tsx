import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Users, 
  Heart, 
  DollarSign, 
  ArrowRight, 
  Calendar, 
  User, 
  Phone, 
  Info, 
  Briefcase, 
  Tag, 
  CheckCircle,
  Hash,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, PrayerRequest, Contribution } from '../types.js';

interface GlobalSearchProps {
  members: Member[];
  prayerRequests: PrayerRequest[];
  contributions: Contribution[];
  onNavigateToTab?: (tabId: string) => void;
}

export default function GlobalSearch({ 
  members, 
  prayerRequests, 
  contributions,
  onNavigateToTab 
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'member' | 'prayer' | 'contribution';
    data: any;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search results dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut to focus search bar (Press '/')
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        // Prevent default browser behavior of typing the slash if not already focused
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          inputRef.current?.focus();
          setIsOpen(true);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();

  // Filter logic
  const searchResults = (() => {
    if (!trimmedQuery) {
      return { members: [], prayerRequests: [], contributions: [] };
    }

    const filteredMembers = members.filter(m => 
      m.name.toLowerCase().includes(trimmedQuery) ||
      m.contact.toLowerCase().includes(trimmedQuery) ||
      m.status.toLowerCase().includes(trimmedQuery) ||
      m.family_role.toLowerCase().includes(trimmedQuery) ||
      (m.branch_name && m.branch_name.toLowerCase().includes(trimmedQuery)) ||
      (m.cell_group_name && m.cell_group_name.toLowerCase().includes(trimmedQuery))
    );

    const filteredPrayerRequests = prayerRequests.filter(p => 
      (p.requestor_name && p.requestor_name.toLowerCase().includes(trimmedQuery)) ||
      p.content.toLowerCase().includes(trimmedQuery) ||
      p.status.toLowerCase().includes(trimmedQuery) ||
      (p.is_anonymous ? 'anonymous' : '').includes(trimmedQuery)
    );

    const filteredContributions = contributions.filter(c => 
      c.member_name.toLowerCase().includes(trimmedQuery) ||
      c.type.toLowerCase().includes(trimmedQuery) ||
      c.payment_method.toLowerCase().includes(trimmedQuery) ||
      String(c.amount).includes(trimmedQuery) ||
      (c.branch_name && c.branch_name.toLowerCase().includes(trimmedQuery))
    );

    return {
      members: filteredMembers.slice(0, 5),
      prayerRequests: filteredPrayerRequests.slice(0, 5),
      contributions: filteredContributions.slice(0, 5),
      totalMatches: filteredMembers.length + filteredPrayerRequests.length + filteredContributions.length
    };
  })();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const handleSelectItem = (type: 'member' | 'prayer' | 'contribution', data: any) => {
    setSelectedItem({ type, data });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm md:max-w-md" id="global-search-container">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search members, prayer requests, ledger... (Press '/')"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-slate-950/50 text-slate-100 placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-2.5 border border-blue-900/40 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
        />
        {query ? (
          <button 
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="absolute right-3 top-3 hidden sm:inline-flex items-center text-[9px] font-mono text-slate-500 font-bold bg-slate-900 px-1 rounded border border-slate-800 select-none pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {/* Dropdown Results list */}
      <AnimatePresence>
        {isOpen && trimmedQuery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full max-h-[420px] overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 divide-y divide-slate-800 font-sans"
          >
            {searchResults.totalMatches === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                <Search className="mx-auto h-5 w-5 text-slate-600 mb-1" />
                <p className="font-bold">No results found for "{query}"</p>
                <p className="text-[10px] text-slate-500">Check spelling or try searching another keyword</p>
              </div>
            ) : (
              <>
                {/* MATCHED MEMBERS */}
                {searchResults.members.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <Users size={12} className="text-blue-400" />
                      <span>Church Members ({searchResults.members.length})</span>
                    </div>
                    <div className="space-y-1">
                      {searchResults.members.map(member => (
                        <button
                          key={`member-${member.id}`}
                          onClick={() => handleSelectItem('member', member)}
                          className="w-full text-left p-2 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer flex items-center justify-between group text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{member.name}</span>
                            <span className="text-[10px] text-slate-400 block">{member.contact || 'No contact'} • {member.family_role}</span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                            member.status === 'Active' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : member.status === 'Inactive'
                              ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {member.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MATCHED PRAYER REQUESTS */}
                {searchResults.prayerRequests.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <Heart size={12} className="text-rose-400" />
                      <span>Prayer Requests ({searchResults.prayerRequests.length})</span>
                    </div>
                    <div className="space-y-1">
                      {searchResults.prayerRequests.map(prayer => (
                        <button
                          key={`prayer-${prayer.id}`}
                          onClick={() => handleSelectItem('prayer', prayer)}
                          className="w-full text-left p-2 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer flex flex-col gap-0.5 group text-xs"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-slate-200 group-hover:text-white transition-colors">
                              {prayer.is_anonymous ? 'Anonymous Partner' : prayer.requestor_name}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1 rounded border ${
                              prayer.status === 'Prayed For' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                              {prayer.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic">"{prayer.content}"</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MATCHED CONTRIBUTIONS */}
                {searchResults.contributions.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <DollarSign size={12} className="text-emerald-400" />
                      <span>Financial Ledger ({searchResults.contributions.length})</span>
                    </div>
                    <div className="space-y-1">
                      {searchResults.contributions.map(contrib => (
                        <button
                          key={`contrib-${contrib.id}`}
                          onClick={() => handleSelectItem('contribution', contrib)}
                          className="w-full text-left p-2 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer flex items-center justify-between group text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{contrib.member_name}</span>
                            <span className="text-[10px] text-slate-400 block">{contrib.type} • via {contrib.payment_method}</span>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-emerald-400">
                            +{formatCurrency(contrib.amount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-2 bg-slate-950/30 text-center">
                  <span className="text-[9px] text-slate-500 font-semibold tracking-wider">
                    Showing top matching records. Press Esc to close.
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* detail profile overlay modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden font-sans"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {selectedItem.type === 'member' && <Users className="text-blue-400 h-5 w-5" />}
                  {selectedItem.type === 'prayer' && <Heart className="text-rose-400 h-5 w-5" />}
                  {selectedItem.type === 'contribution' && <DollarSign className="text-emerald-400 h-5 w-5" />}
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    {selectedItem.type === 'member' ? 'Member Profile' : selectedItem.type === 'prayer' ? 'Prayer Request Details' : 'Financial Receipt'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-5 text-xs text-slate-700">
                {selectedItem.type === 'member' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-blue-950 leading-tight">{selectedItem.data.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black px-1.5 rounded uppercase ${
                            selectedItem.data.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}>
                            {selectedItem.data.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">• Joining Date: {new Date(selectedItem.data.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gender & Role</span>
                        <span className="font-bold text-slate-800 block">{selectedItem.data.gender} • {selectedItem.data.family_role}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Birth Date</span>
                        <span className="font-bold text-slate-800 block">{selectedItem.data.birth_date ? new Date(selectedItem.data.birth_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Registered'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Contact Information</span>
                        <div className="flex items-center gap-1 text-slate-800 font-bold">
                          <Phone size={12} className="text-slate-400" />
                          <span>{selectedItem.data.contact || 'No contact registered'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Parish Location</span>
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{selectedItem.data.branch_name || 'Main Cathedral'}</span>
                        </div>
                      </div>
                    </div>

                    {selectedItem.data.cell_group_name && (
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-extrabold text-blue-900 uppercase tracking-wider block">Home Cell Fellowship</span>
                          <span className="font-bold text-blue-950 text-sm">{selectedItem.data.cell_group_name}</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-100/40 px-2 py-0.5 rounded-md">Weekly Cell</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        onNavigateToTab?.('members');
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span>View in Members Registry</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {selectedItem.type === 'prayer' && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Prayer Requestor</span>
                        <h4 className="text-base font-extrabold text-blue-950">
                          {selectedItem.data.is_anonymous ? 'Anonymous Partner' : selectedItem.data.requestor_name || 'Anonymous'}
                        </h4>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded border ${
                        selectedItem.data.status === 'Prayed For' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {selectedItem.data.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-serif text-[13px] leading-relaxed italic text-slate-700">
                      "{selectedItem.data.content}"
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={13} />
                        <span>Submitted on {new Date(selectedItem.data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                        <Tag size={13} />
                        <span>Sabbath Intercession</span>
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-rose-800 text-[11px] leading-snug flex gap-2">
                      <Info size={16} className="shrink-0 text-rose-500 mt-0.5" />
                      <span>This petition is automatically delivered to the Pastor and Intercessors for dedicated prayer.</span>
                    </div>
                  </div>
                )}

                {selectedItem.type === 'contribution' && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Contribution Ledger Receipts</span>
                      <div className="text-3xl font-black text-emerald-600 font-mono">
                        {formatCurrency(selectedItem.data.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-block font-bold">
                        GIMK-TXN-#{selectedItem.data.id}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-semibold">Contributor</span>
                        <span className="font-extrabold text-slate-800">{selectedItem.data.member_name}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-semibold">Offering Type</span>
                        <span className="font-extrabold text-blue-900">{selectedItem.data.type}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-semibold">Payment Gateway</span>
                        <span className="font-extrabold text-slate-800 flex items-center gap-1">
                          <CheckCircle size={12} className="text-emerald-500" />
                          {selectedItem.data.payment_method}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-semibold">Transaction Date</span>
                        <span className="font-extrabold text-slate-800">{new Date(selectedItem.data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-400 font-semibold">Parish Branch</span>
                        <span className="font-extrabold text-slate-800">{selectedItem.data.branch_name || 'Main Cathedral'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        onNavigateToTab?.('finances');
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span>Open Financial Ledger</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
