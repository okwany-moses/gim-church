import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  FileDown, 
  FileUp, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  X, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight,
  User,
  HelpCircle,
  BarChart2,
  Calendar,
  Printer
} from 'lucide-react';
import Papa from 'papaparse';
import ConfirmModal from './ConfirmModal.js';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Contribution, Expenditure, Member } from '../types.js';

interface AdminFinancesProps {
  contributions: Contribution[];
  expenditures: Expenditure[];
  members: Member[];
  onRefresh: () => void;
  onAddContribution: (contrib: Partial<Contribution>) => Promise<any>;
  onDeleteContribution: (id: number) => Promise<any>;
  onBulkDeleteContributions: (ids: number[]) => Promise<any>;
  onImportContributions: (list: Partial<Contribution>[]) => Promise<any>;
  onAddExpenditure: (exp: Partial<Expenditure>) => Promise<any>;
  onDeleteExpenditure: (id: number) => Promise<any>;
  onBulkDeleteExpenditures: (ids: number[]) => Promise<any>;
  onBulkUpdateExpendituresStatus: (ids: number[], status: string) => Promise<any>;
  onUpdateExpenditure: (id: number, exp: Partial<Expenditure>) => Promise<any>;
  onImportExpenditures: (list: Partial<Expenditure>[]) => Promise<any>;
}

const COLORS = ['#1d4ed8', '#eab308', '#10b981', '#6366f1', '#ec4899', '#f97316', '#14b8a6'];

export default function AdminFinances({
  contributions,
  expenditures,
  members,
  onRefresh,
  onAddContribution,
  onDeleteContribution,
  onBulkDeleteContributions,
  onImportContributions,
  onAddExpenditure,
  onDeleteExpenditure,
  onBulkDeleteExpenditures,
  onBulkUpdateExpendituresStatus,
  onUpdateExpenditure,
  onImportExpenditures
}: AdminFinancesProps) {
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

  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'incomes' | 'expenditures'>('ledger');

  // Income Ledger State
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomeTypeFilter, setIncomeTypeFilter] = useState('All');
  const [incomeMethodFilter, setIncomeMethodFilter] = useState('All');
  const [selectedIncomeIds, setSelectedIncomeIds] = useState<number[]>([]);

  // Expenses State
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

  // Modal forms state
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Income Form Fields
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [anonName, setAnonName] = useState('Anonymous Donor');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeType, setIncomeType] = useState('Tithe');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeMethod, setIncomeMethod] = useState('M-Pesa');
  const [incomeError, setIncomeError] = useState('');

  // Auto-suggest fee amounts based on family role
  React.useEffect(() => {
    if (!isAnonymous && selectedMember) {
      const role = selectedMember.family_role;
      if (incomeType === 'Registration Fee') {
        if (role === 'Father' || role === 'Mother' || role === 'Single') {
          setIncomeAmount('200');
        } else if (role === 'Youth') {
          setIncomeAmount('100');
        } else if (role === 'Child') {
          setIncomeAmount('50');
        } else {
          setIncomeAmount('200');
        }
      } else if (incomeType === 'Monthly Contribution') {
        if (role === 'Father' || role === 'Mother' || role === 'Single') {
          setIncomeAmount('100');
        } else if (role === 'Youth') {
          setIncomeAmount('50');
        } else if (role === 'Child') {
          setIncomeAmount('0');
        } else {
          setIncomeAmount('100');
        }
      }
    }
  }, [selectedMember, incomeType, isAnonymous]);

  // Expense Form Fields
  const [expenseCategory, setExpenseCategory] = useState('Utilities');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseError, setExpenseError] = useState('');

  // File import refs
  const incomeFileInputRef = useRef<HTMLInputElement>(null);
  const expenseFileInputRef = useRef<HTMLInputElement>(null);

  // Financial Calculations
  const totalRevenue = contributions.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenditures.reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalRevenue - totalExpenses;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);
  };

  // Dues & Registration Tracker calculations
  const activeMembers = members.filter(m => m.status === 'Active');
  const adultMembers = activeMembers.filter(m => m.family_role === 'Father' || m.family_role === 'Mother' || m.family_role === 'Single');
  const youthMembers = activeMembers.filter(m => m.family_role === 'Youth');
  const childMembers = activeMembers.filter(m => m.family_role === 'Child');

  const expectedRegistrationYearly = (adultMembers.length * 200) + (youthMembers.length * 100) + (childMembers.length * 50);
  const registrationFeesCollected = contributions
    .filter(c => c.type === 'Registration Fee')
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyContributionsCollected = contributions
    .filter(c => c.type === 'Monthly Contribution')
    .reduce((sum, item) => sum + item.amount, 0);

  // Build chart structures
  const incomeByTypeData = Object.entries(
    contributions.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const expenseByCategoryData = Object.entries(
    expenditures.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Filter incomes
  const filteredContributions = contributions.filter(c => {
    const matchesSearch = 
      (c.member_name || 'Anonymous').toLowerCase().includes(incomeSearch.toLowerCase()) ||
      c.type.toLowerCase().includes(incomeSearch.toLowerCase()) ||
      c.payment_method.toLowerCase().includes(incomeSearch.toLowerCase());

    const matchesType = incomeTypeFilter === 'All' || c.type === incomeTypeFilter;
    const matchesMethod = incomeMethodFilter === 'All' || c.payment_method === incomeMethodFilter;

    return matchesSearch && matchesType && matchesMethod;
  });

  // Filter expenses
  const filteredExpenditures = expenditures.filter(e => {
    const matchesSearch = 
      e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      e.description.toLowerCase().includes(expenseSearch.toLowerCase());

    const matchesCategory = expenseCategoryFilter === 'All' || e.category === expenseCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // ---------------- MEMBERS DROPDOWN LOGIC FOR INCOMES ----------------
  const filteredMembersForLookup = members.filter(m => 
    m.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    m.contact.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  // ---------------- FORM ACTIONS ----------------
  const handleAddIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      setIncomeError('Please specify a positive contribution amount.');
      return;
    }
    if (!isAnonymous && !selectedMember) {
      setIncomeError('Please search and select an active GIMK member or mark as anonymous.');
      return;
    }

    const payload: Partial<Contribution> = {
      member_id: isAnonymous ? null : selectedMember!.id,
      member_name: isAnonymous ? (anonName || 'Anonymous') : selectedMember!.name,
      amount: parseFloat(incomeAmount),
      type: incomeType,
      date: incomeDate || new Date().toISOString().split('T')[0],
      payment_method: incomeMethod
    };

    try {
      await onAddContribution(payload);
      setIsIncomeModalOpen(false);
      // Reset
      setSelectedMember(null);
      setMemberSearchTerm('');
      setIncomeAmount('');
      setIsAnonymous(false);
      onRefresh();
    } catch (err: any) {
      setIncomeError(err.message || 'Error recording contribution.');
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      setExpenseError('Please specify a positive expense amount.');
      return;
    }
    if (!expenseDescription.trim()) {
      setExpenseError('Please include a detailed description for this expenditure.');
      return;
    }

    const payload: Partial<Expenditure> = {
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      date: expenseDate || new Date().toISOString().split('T')[0],
      description: expenseDescription
    };

    try {
      await onAddExpenditure(payload);
      setIsExpenseModalOpen(false);
      setExpenseAmount('');
      setExpenseDescription('');
      onRefresh();
    } catch (err: any) {
      setExpenseError(err.message || 'Error recording expense.');
    }
  };

  const handleDeleteContribution = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Contribution',
      message: 'Are you sure you want to permanently remove this financial entry?',
      onConfirm: async () => {
        try {
          await onDeleteContribution(id);
          setSelectedIncomeIds(prev => prev.filter(item => item !== id));
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting contribution');
        }
      }
    });
  };

  const handleBulkDeleteContributions = () => {
    if (selectedIncomeIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Contributions',
      message: `Are you sure you want to permanently remove these ${selectedIncomeIds.length} contributions?`,
      onConfirm: async () => {
        try {
          await onBulkDeleteContributions(selectedIncomeIds);
          setSelectedIncomeIds([]);
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting contributions');
        }
      }
    });
  };

  const handleDeleteExpense = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to permanently remove this expense entry?',
      onConfirm: async () => {
        try {
          await onDeleteExpenditure(id);
          onRefresh();
        } catch (err: any) {
          alert(err.message || 'Error deleting expenditure');
        }
      }
    });
  };

  const handleApproveExpense = async (id: number) => {
    try {
      const exp = expenditures.find(e => e.id === id);
      if (!exp) return;
      await onUpdateExpenditure(id, { ...exp, status: 'Approved' });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error approving expenditure');
    }
  };

  const handleRejectExpense = async (id: number) => {
    try {
      const exp = expenditures.find(e => e.id === id);
      if (!exp) return;
      await onUpdateExpenditure(id, { ...exp, status: 'Rejected' });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error rejecting expenditure');
    }
  };

  // ---------------- CSV EXPORTS ----------------
  const exportIncomesCSV = () => {
    const data = filteredContributions.map(c => ({
      'Member Name': c.member_name || 'Anonymous',
      'Amount (KES)': c.amount,
      'Type': c.type,
      'Date': c.date,
      'Payment Method': c.payment_method,
      'Affiliated Branch': c.branch_name || ''
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'GIMK_Incomes_Ledger.csv');
    link.click();
  };

  const exportExpensesCSV = () => {
    const data = filteredExpenditures.map(e => ({
      'Category': e.category,
      'Amount (KES)': e.amount,
      'Date': e.date,
      'Description': e.description
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'GIMK_Expenditures_Ledger.csv');
    link.click();
  };

  // ---------------- CSV IMPORTS ----------------
  const handleIncomesCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Papa.parse(files[0], {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const mapped: Partial<Contribution>[] = rows.map(row => {
          const mName = row['Member Name'] || row.member_name || 'Anonymous';
          const matchedMember = members.find(m => m.name.toLowerCase().includes(mName.toLowerCase()));

          return {
            member_id: matchedMember ? matchedMember.id : null,
            member_name: mName,
            amount: parseFloat(row['Amount (KES)'] || row.amount || '0'),
            type: row.Type || row.type || 'Tithe',
            date: row.Date || row.date || new Date().toISOString().split('T')[0],
            payment_method: row['Payment Method'] || row.payment_method || 'M-Pesa'
          };
        });

        try {
          await onImportContributions(mapped);
          alert(`Successfully imported ${mapped.length} income entries!`);
          onRefresh();
        } catch (err: any) {
          alert(`Failed to import incomes: ${err.message}`);
        }
      }
    });
  };

  const handleExpensesCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Papa.parse(files[0], {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const mapped: Partial<Expenditure>[] = rows.map(row => ({
          category: row.Category || row.category || 'Other',
          amount: parseFloat(row['Amount (KES)'] || row.amount || '0'),
          date: row.Date || row.date || new Date().toISOString().split('T')[0],
          description: row.Description || row.description || 'Imported expense'
        }));

        try {
          await onImportExpenditures(mapped);
          alert(`Successfully imported ${mapped.length} expense entries!`);
          onRefresh();
        } catch (err: any) {
          alert(`Failed to import expenses: ${err.message}`);
        }
      }
    });
  };

  // Checkbox Selection Helpers
  const handleSelectAllIncomes = (checked: boolean) => {
    if (checked) {
      setSelectedIncomeIds(filteredContributions.map(c => c.id));
    } else {
      setSelectedIncomeIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Controls & Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-1.5">
        <div className="flex flex-wrap">
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'ledger' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <BookOpen size={14} />
            <span>Ledger Summary</span>
          </button>
          <button
            onClick={() => setActiveSubTab('incomes')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'incomes' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <TrendingUp size={14} />
            <span>Incomes & Tithes</span>
          </button>
          <button
            onClick={() => setActiveSubTab('expenditures')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${activeSubTab === 'expenditures' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <TrendingDown size={14} />
            <span>Expenditures / Expenses</span>
          </button>
        </div>

        <button 
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer select-none self-start sm:self-auto mb-2 sm:mb-0"
        >
          <Printer size={13} />
          <span>Print Financial Report</span>
        </button>
      </div>

      {/* 1. LEDGER SUMMARY TAB */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-6">
          {/* Quick Stats Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Total Church Revenue</span>
              <div className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowUpRight className="text-emerald-600 shrink-0" size={18} />
                <span>{formatCurrency(totalRevenue)}</span>
              </div>
              <p className="text-xs text-emerald-700 font-medium">Tithes, offerings, project pledges</p>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-6 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800">Total Church Expenditures</span>
              <div className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowDownRight className="text-rose-600 shrink-0" size={18} />
                <span>{formatCurrency(totalExpenses)}</span>
              </div>
              <p className="text-xs text-rose-700 font-medium">Outreach ministries, utility overheads</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-800">Net Ledger Balance</span>
              <div className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                <BarChart2 className="text-blue-600 shrink-0" size={18} />
                <span>{formatCurrency(netBalance)}</span>
              </div>
              <p className="text-xs text-blue-700 font-medium">Reserves currently in bank accounts</p>
            </div>
          </div>

          {/* Registration & Monthly Contributions Tracker */}
          <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-amber-400 tracking-tight uppercase">Registration & Monthly Contributions Tracker</h3>
                <p className="text-xs text-slate-400">Calculated according to family roles of active members</p>
              </div>
              <div className="text-[10px] font-mono bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-slate-300">
                Active Registry: {activeMembers.length} Members ({adultMembers.length} Adults • {youthMembers.length} Youths • {childMembers.length} Children)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Yearly Registration Fees Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Yearly Registration Fees</h4>
                    <span className="text-[9px] text-slate-500">Rate: 200/yr Adults • 100/yr Youth • 50/yr Children</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {Math.round((registrationFeesCollected / (expectedRegistrationYearly || 1)) * 100)}% Collected
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 block">Expected</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{formatCurrency(expectedRegistrationYearly)}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 block">Collected</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(registrationFeesCollected)}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 block">Remaining</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {formatCurrency(Math.max(0, expectedRegistrationYearly - registrationFeesCollected))}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (registrationFeesCollected / (expectedRegistrationYearly || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 text-right">Progress towards complete annual registry coverage</p>
                </div>
              </div>

              {/* Monthly Contribution Tracker Column */}
              <div className="space-y-4 pt-4 md:pt-0 md:pl-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Monthly Contribution Tracker</h4>
                  <span className="text-[9px] text-slate-500">Rate: 100/mo Adults • 50/mo Youth • 0/mo Children</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Total Monthly Dues Received</span>
                    <p className="text-lg font-mono font-bold text-blue-400">{formatCurrency(monthlyContributionsCollected)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Active Contribution Volume</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      {contributions.filter(c => c.type === 'Monthly Contribution').length} Transactions
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed">
                  📢 <strong className="text-slate-300">Aesthetic Notice:</strong> Add "Registration Fee" and "Monthly Contribution" as types in the Log Donation form to dynamically record these dues using the age-group rate matrix.
                </div>
              </div>
            </div>
          </div>

          {/* Ledger visual charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-blue-900 tracking-tight">Income Distribution</h3>
                <p className="text-xs text-slate-500">Breakdown of contributions by purpose</p>
              </div>
              <div className="h-64">
                {incomeByTypeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">No entries logged</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeByTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="value" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-blue-900 tracking-tight">Expense Distribution</h3>
                <p className="text-xs text-slate-500">Breakdown of administrative expenditures</p>
              </div>
              <div className="h-64">
                {expenseByCategoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">No entries logged</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseByCategoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. INCOMES TAB */}
      {activeSubTab === 'incomes' && (
        <div className="space-y-4">
          {/* Income Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search donor, details..." 
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                  className="pl-8 pr-4 py-1.5 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs w-48"
                />
              </div>
              {/* Type Filter */}
              <select
                value={incomeTypeFilter}
                onChange={(e) => setIncomeTypeFilter(e.target.value)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
              >
                <option value="All">All Types</option>
                <option value="Tithe">Tithe</option>
                <option value="Offering">Offering</option>
                <option value="Building Fund">Building Fund</option>
                <option value="Missions">Missions</option>
                <option value="Benevolence">Benevolence</option>
                <option value="Registration Fee">Registration Fee</option>
                <option value="Monthly Contribution">Monthly Contribution</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={incomeFileInputRef}
                onChange={handleIncomesCSVUpload}
                accept=".csv"
                className="hidden"
              />
              <button 
                onClick={() => incomeFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileUp size={14} />
                <span>Import CSV</span>
              </button>
              <button 
                onClick={exportIncomesCSV}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileDown size={14} />
                <span>Export CSV</span>
              </button>
              <button 
                onClick={() => { setIncomeError(''); setIsIncomeModalOpen(true); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold cursor-pointer"
              >
                <Plus size={14} />
                <span>Log Donation</span>
              </button>
            </div>
          </div>

          {/* Sticky selection toolbar for Contributions */}
          {selectedIncomeIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-xs font-semibold whitespace-nowrap bg-blue-950 px-3 py-1.5 rounded-full border border-blue-900 text-blue-300">
                {selectedIncomeIds.length} selected
              </span>
              
              <div className="h-5 w-px bg-slate-800" />

              <button
                onClick={handleBulkDeleteContributions}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full font-bold text-xs transition cursor-pointer shadow-md shrink-0"
              >
                <Trash2 size={13} />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={filteredContributions.length > 0 && selectedIncomeIds.length === filteredContributions.length}
                        onChange={(e) => handleSelectAllIncomes(e.target.checked)}
                        className="rounded-sm text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-3 px-4">Donor Name</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Branch Affiliation</th>
                    <th className="py-3 px-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContributions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                        No transactions registered
                      </td>
                    </tr>
                  ) : (
                    filteredContributions.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-4 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedIncomeIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIncomeIds(p => [...p, c.id]);
                              else setSelectedIncomeIds(p => p.filter(x => x !== c.id));
                            }}
                            className="rounded-sm text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{c.member_name || 'Anonymous'}</td>
                        <td className="py-2.5 px-4 font-bold text-blue-700 font-mono">{formatCurrency(c.amount)}</td>
                        <td className="py-2.5 px-4">
                          <span className="bg-blue-50 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-blue-100">
                            {c.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(c.date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-medium">{c.payment_method}</td>
                        <td className="py-2.5 px-4 text-slate-500">{c.branch_name || '—'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button 
                            onClick={() => handleDeleteContribution(c.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* 3. EXPENDITURES TAB */}
      {activeSubTab === 'expenditures' && (
        <div className="space-y-4">
          {/* Expenditure Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="pl-8 pr-4 py-1.5 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded-lg text-xs w-48"
                />
              </div>
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
              >
                <option value="All">All Categories</option>
                <option value="Salaries">Salaries</option>
                <option value="Utilities">Utilities</option>
                <option value="Charity">Charity</option>
                <option value="Missions">Missions</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Events">Events</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={expenseFileInputRef}
                onChange={handleExpensesCSVUpload}
                accept=".csv"
                className="hidden"
              />
              <button 
                onClick={() => expenseFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileUp size={14} />
                <span>Import CSV</span>
              </button>
              <button 
                onClick={exportExpensesCSV}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileDown size={14} />
                <span>Export CSV</span>
              </button>
              <button 
                onClick={() => { setExpenseError(''); setIsExpenseModalOpen(true); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold cursor-pointer"
              >
                <Plus size={14} />
                <span>Log Expense</span>
              </button>
            </div>
          </div>

          {/* Sticky selection toolbar for Expenditures */}
          {selectedExpenseIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-xs font-semibold whitespace-nowrap bg-blue-950 px-3 py-1.5 rounded-full border border-blue-900 text-blue-300">
                {selectedExpenseIds.length} selected
              </span>
              
              <div className="h-5 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap hidden sm:inline">Set Status:</span>
                <select
                  onChange={async (ev) => {
                    const val = ev.target.value;
                    if (!val) return;
                    try {
                      await onBulkUpdateExpendituresStatus(selectedExpenseIds, val);
                      setSelectedExpenseIds([]);
                      onRefresh();
                    } catch (err: any) {
                      alert(err.message || 'Error updating status');
                    }
                  }}
                  defaultValue=""
                  className="bg-slate-950 border border-slate-800 text-xs rounded-full px-3 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Change Status --</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="h-5 w-px bg-slate-800" />

              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Bulk Delete Expenditures',
                    message: `Are you sure you want to permanently remove these ${selectedExpenseIds.length} expenditures?`,
                    onConfirm: async () => {
                      try {
                        await onBulkDeleteExpenditures(selectedExpenseIds);
                        setSelectedExpenseIds([]);
                        onRefresh();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      } catch (err: any) {
                        alert(err.message || 'Error deleting expenditures');
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

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={filteredExpenditures.length > 0 && selectedExpenseIds.length === filteredExpenditures.length}
                        onChange={(ev) => {
                          if (ev.target.checked) setSelectedExpenseIds(filteredExpenditures.map(item => item.id));
                          else setSelectedExpenseIds([]);
                        }}
                        className="rounded-sm text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center w-40">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenditures.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-slate-400">
                        No expenditure logs found
                      </td>
                    </tr>
                  ) : (
                    filteredExpenditures.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-4 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedExpenseIds.includes(e.id)}
                            onChange={(ev) => {
                              if (ev.target.checked) setSelectedExpenseIds(prev => [...prev, e.id]);
                              else setSelectedExpenseIds(prev => prev.filter(x => x !== e.id));
                            }}
                            className="rounded-sm text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="bg-red-50 text-red-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-red-100">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-red-700 font-mono">{formatCurrency(e.amount)}</td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 text-slate-700 max-w-sm truncate" title={e.description}>{e.description}</td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${e.status === 'Approved' ? 'bg-green-100 text-green-700' : e.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800 animate-pulse'}`}>
                            {e.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center flex items-center justify-center gap-1.5 h-12">
                          {(e.status === 'Pending' || !e.status) && (
                            <>
                              <button
                                onClick={() => handleApproveExpense(e.id)}
                                className="px-2 py-0.5 text-[9px] font-bold bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer transition uppercase"
                                title="Approve expenditure"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectExpense(e.id)}
                                className="px-2 py-0.5 text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white rounded cursor-pointer transition uppercase"
                                title="Reject expenditure"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleDeleteExpense(e.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* 4. LOG DONATION MODAL (searchable member link) */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Post Ministry Income</h3>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddIncomeSubmit} className="p-5 space-y-4">
              {incomeError && (
                <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2.5 rounded-lg text-xs">
                  {incomeError}
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Contribution Amount (KES) *</label>
                <input 
                  type="number" 
                  placeholder="e.g. 5000"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              {/* Anonymous Check */}
              <div className="flex items-center gap-2 py-1">
                <input 
                  type="checkbox" 
                  id="anon_check"
                  checked={isAnonymous}
                  onChange={(e) => {
                    setIsAnonymous(e.target.checked);
                    if (e.target.checked) setSelectedMember(null);
                  }}
                  className="rounded-sm text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="anon_check" className="text-xs font-medium text-slate-600 select-none cursor-pointer">
                  Mark as Anonymous / Walk-in Donor
                </label>
              </div>

              {/* Member Selector (if not anonymous) */}
              {!isAnonymous ? (
                <div className="space-y-2 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <User size={13} />
                    <span>Associate with GIMK Member *</span>
                  </span>
                  
                  {selectedMember ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                      <div className="text-xs">
                        <p className="font-bold text-blue-900">{selectedMember.name}</p>
                        <p className="text-blue-700 text-[10px]">{selectedMember.contact}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSelectedMember(null)}
                        className="text-blue-500 hover:text-blue-700 bg-white shadow-xs p-1 rounded-full cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search GIMK registry..."
                          value={memberSearchTerm}
                          onChange={(e) => setMemberSearchTerm(e.target.value)}
                          className="pl-8 w-full border border-slate-200 rounded-lg p-1.5 text-xs bg-white"
                        />
                      </div>
                      
                      {memberSearchTerm.length > 0 && (
                        <div className="border border-slate-100 bg-white max-h-24 overflow-y-auto divide-y divide-slate-50 rounded-md">
                          {filteredMembersForLookup.length === 0 ? (
                            <p className="p-2 text-[10px] text-slate-400">No members found</p>
                          ) : (
                            filteredMembersForLookup.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelectedMember(m)}
                                className="w-full text-left p-2 hover:bg-slate-50 transition text-[11px] block text-slate-700"
                              >
                                <span className="font-bold">{m.name}</span> ({m.contact})
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Anonymous Placeholder Name</label>
                  <input 
                    type="text" 
                    value={anonName}
                    onChange={(e) => setAnonName(e.target.value)}
                    placeholder="e.g. Anonymous Walk-in"
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
              )}

              {/* Type, Date, Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Donation Type</label>
                  <select
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                  >
                    <option value="Tithe">Tithe</option>
                    <option value="Offering">Offering</option>
                    <option value="Building Fund">Building Fund</option>
                    <option value="Missions">Missions</option>
                    <option value="Benevolence">Benevolence</option>
                    <option value="Registration Fee">Registration Fee</option>
                    <option value="Monthly Contribution">Monthly Contribution</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Payment Method</label>
                  <select
                    value={incomeMethod}
                    onChange={(e) => setIncomeMethod(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Transaction Date</label>
                  <input 
                    type="date" 
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Log Income</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. LOG EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Post Ministry Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-4">
              {expenseError && (
                <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2.5 rounded-lg text-xs">
                  {expenseError}
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Expenditure Amount (KES) *</label>
                <input 
                  type="number" 
                  placeholder="e.g. 15000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Expense Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                  >
                    <option value="Salaries">Salaries</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Charity">Charity</option>
                    <option value="Missions">Missions</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Events">Events</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Posting Date</label>
                  <input 
                    type="date" 
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Expense Description *</label>
                <textarea 
                  placeholder="e.g. Allowance paid to local evangelists for regional market outreach in Kabondo"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Log Outflow</span>
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
