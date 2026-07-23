import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  GitBranch, 
  CheckSquare, 
  LayoutDashboard, 
  ShieldCheck, 
  Compass, 
  HelpCircle,
  Database,
  Grid,
  Menu,
  X,
  Heart,
  UserCheck,
  Download,
  Laptop,
  Smartphone,
  Share,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './api.js';
// @ts-ignore
import gimkLogo from './assets/images/logo.jpg';
import { 
  DashboardStats, 
  Member, 
  Contribution, 
  Expenditure, 
  Branch, 
  CellGroup, 
  Event, 
  Sermon, 
  Hymn, 
  AttendanceSession, 
  AttendanceRecord,
  PrayerRequest,
  BulkSms
} from './types.js';

// Subcomponents
import AdminDashboard from './components/AdminDashboard.js';
import AdminMembers from './components/AdminMembers.js';
import AdminFinances from './components/AdminFinances.js';
import AdminBranches from './components/AdminBranches.js';
import AdminAttendance from './components/AdminAttendance.js';
import CongregantPortal from './components/CongregantPortal.js';
import PastorDashboard from './components/PastorDashboard.js';
import UsherDashboard from './components/UsherDashboard.js';
import GlobalSearch from './components/GlobalSearch.js';
import GimkAuth, { ChangePasswordModal } from './components/GimkAuth.js';
import DatabaseMaintenance from './components/DatabaseMaintenance.js';

export default function App() {
  const [currentRole, setCurrentRole] = useState<'congregant' | 'usher' | 'pastor' | 'admin'>(() => {
    try {
      const savedRole = localStorage.getItem('gimk_current_role');
      if (savedRole && ['congregant', 'usher', 'pastor', 'admin'].includes(savedRole)) {
        return savedRole as any;
      }
    } catch (e) {
      console.error('Error reading gimk_current_role from localStorage:', e);
    }
    return 'congregant';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const savedTab = localStorage.getItem('gimk_active_tab');
      if (savedTab) return savedTab;
    } catch (e) {
      console.error('Error reading gimk_active_tab from localStorage:', e);
    }
    return 'home';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Active user sessions per administrative role
  const [loggedInUsers, setLoggedInUsers] = useState<Record<'admin' | 'pastor' | 'usher', string | null>>(() => {
    try {
      const saved = localStorage.getItem('gimk_logged_in_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          admin: parsed?.admin || null,
          pastor: parsed?.pastor || null,
          usher: parsed?.usher || null
        };
      }
    } catch (e) {
      console.error('Error reading gimk_logged_in_users from localStorage:', e);
    }
    return {
      admin: null,
      pastor: null,
      usher: null
    };
  });

  // Sync session and navigation state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gimk_current_role', currentRole);
    } catch (e) {}
  }, [currentRole]);

  useEffect(() => {
    try {
      localStorage.setItem('gimk_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('gimk_logged_in_users', JSON.stringify(loggedInUsers));
    } catch (e) {}
  }, [loggedInUsers]);
  const [showChangePassword, setShowChangePassword] = useState<boolean>(false);

  // Data Loading States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [bulkSmsLogs, setBulkSmsLogs] = useState<BulkSms[]>([]);

  const [latestBackupTime, setLatestBackupTime] = useState<string>('');
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPrompt || null);
  const [isInstallable, setIsInstallable] = useState(!!(window as any).deferredPrompt || true); // Default to true so user can always attempt/click install
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  // Real-time PWA Diagnostics States
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [hasManifest, setHasManifest] = useState<boolean>(false);

  useEffect(() => {
    // Check if running inside iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent browser's default prompt
      e.preventDefault();
      // Stash the event
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      // Update state to render button
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register global trigger handler in case the event was caught early or is caught later
    (window as any).onBeforeInstallPromptTriggered = (e: any) => {
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Check if already in standalone/PWA mode
    let autoOpenTimer: any = null;
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!isStandaloneMode);
    if (isStandaloneMode) {
      setIsInstallable(false);
    } else {
      // Auto-open install guide so user can install immediately upon landing without clicking any button
      const hasDismissed = localStorage.getItem('gimk_install_prompt_dismissed');
      if (!hasDismissed) {
        autoOpenTimer = setTimeout(() => {
          setShowInstallModal(true);
        }, 1200);
      }
    }

    // Aggressive periodic & reactive stashed event check and PWA diagnostics
    const syncStashedPrompt = () => {
      const globalPrompt = (window as any).deferredPrompt;
      if (globalPrompt && !deferredPrompt) {
        setDeferredPrompt(globalPrompt);
        setIsInstallable(true);
      }

      // Query manifest link presence
      setHasManifest(!!document.querySelector('link[rel="manifest"]'));

      // Query active Service Worker state
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
          .then((reg) => {
            if (reg) {
              setSwRegistered(true);
              setSwActive(!!reg.active);
            } else {
              setSwRegistered(false);
              setSwActive(false);
            }
          })
          .catch(() => {});
      }
    };

    // Run diagnostics immediately
    syncStashedPrompt();

    // Sync on window focus (user returning to tab)
    window.addEventListener('focus', syncStashedPrompt);

    // Sync on any document click/tap anywhere on the screen (user gesture)
    const handleGestureSync = () => {
      syncStashedPrompt();
    };
    document.addEventListener('click', handleGestureSync, { passive: true });
    document.addEventListener('touchstart', handleGestureSync, { passive: true });

    // Polling backup every 1 second for first 15 seconds to catch lazy service worker registrations
    const intervalId = setInterval(syncStashedPrompt, 1000);
    const timeoutId = setTimeout(() => clearInterval(intervalId), 15000);

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      showToast('GIMK App installed successfully! Access it directly from your home screen.');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('focus', syncStashedPrompt);
      document.removeEventListener('click', handleGestureSync);
      document.removeEventListener('touchstart', handleGestureSync);
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      if (autoOpenTimer) clearTimeout(autoOpenTimer);
      delete (window as any).onBeforeInstallPromptTriggered;
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (isInIframe) {
      // Show PWA install guide modal which explains how to bypass the iframe sandbox
      setShowInstallModal(true);
      return;
    }

    const activePrompt = deferredPrompt || (window as any).deferredPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        console.log('User PWA install choice:', outcome);
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
        setIsInstallable(false);
      } catch (err) {
        console.error('PWA install prompt failed:', err);
        setShowInstallModal(true);
      }
      return;
    }

    // If no native prompt exists yet, show our advanced visual guide modal
    setShowInstallModal(true);
  };

  const handleCloseInstallModal = () => {
    setShowInstallModal(false);
    localStorage.setItem('gimk_install_prompt_dismissed', 'true');
  };

  // Toast Notification State
  const [toast, setToast] = useState<{
    message: string;
    onUndo?: () => Promise<void>;
  } | null>(null);

  const showToast = (message: string, onUndo?: () => Promise<void>) => {
    setToast({ message, onUndo });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Data Loading orchestrator
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        statsData,
        membersData,
        branchesData,
        cellGroupsData,
        contributionsData,
        expendituresData,
        eventsData,
        sermonsData,
        hymnsData,
        sessionsData,
        prayerData,
        smsLogsData
      ] = await Promise.all([
        api.getStats(),
        api.getMembers(),
        api.getBranches(),
        api.getCellGroups(),
        api.getContributions(),
        api.getExpenditures(),
        api.getEvents(),
        api.getSermons(),
        api.getHymns(),
        api.getAttendanceSessions(),
        api.getPrayerRequests(),
        api.getBulkSmsLogs()
      ]);

      setStats(statsData);
      setMembers(membersData);
      setBranches(branchesData);
      setCellGroups(cellGroupsData);
      setContributions(contributionsData);
      setExpenditures(expendituresData);
      setEvents(eventsData);
      setSermons(sermonsData);
      setHymns(hymnsData);
      setSessions(sessionsData);
      setPrayerRequests(prayerData);
      setBulkSmsLogs(smsLogsData);

      try {
        const backupRes = await api.getLatestBackup();
        setLatestBackupTime(backupRes.timestamp);
      } catch (be) {
        console.error('Error fetching backup time:', be);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error connecting to church management database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // API Mutator Wrappers for Subcomponents
  const handleAddMember = async (member: Partial<Member>) => {
    await api.createMember(member);
    await loadAllData();
  };

  const handleUpdateMember = async (id: number, member: Partial<Member>) => {
    await api.updateMember(id, member);
    await loadAllData();
  };

  const handleDeleteMember = async (id: number) => {
    const deleted = members.find(m => m.id === id);
    await api.deleteMember(id);
    await loadAllData();
    if (deleted) {
      showToast(`Member "${deleted.name}" deleted.`, async () => {
        await api.restore('members', [deleted]);
        await loadAllData();
        showToast(`Restored member "${deleted.name}".`);
      });
    }
  };

  const handleBulkDeleteMembers = async (ids: number[]) => {
    const deleted = members.filter(m => ids.includes(m.id));
    await api.bulkDeleteMembers(ids);
    await loadAllData();
    if (deleted.length > 0) {
      showToast(`${deleted.length} members deleted.`, async () => {
        await api.restore('members', deleted);
        await loadAllData();
        showToast(`Restored ${deleted.length} members.`);
      });
    }
  };

  const handleBulkUpdateMembersStatus = async (ids: number[], status: string) => {
    await api.bulkUpdateMembersStatus(ids, status);
    await loadAllData();
    showToast(`Updated ${ids.length} members status to "${status}".`);
  };

  const handleImportMembers = async (list: Partial<Member>[]) => {
    await api.importMembers(list);
    await loadAllData();
  };

  const handleAddContribution = async (contrib: Partial<Contribution>) => {
    await api.createContribution(contrib);
    await loadAllData();
  };

  const handleDeleteContribution = async (id: number) => {
    const deleted = contributions.find(c => c.id === id);
    await api.deleteContribution(id);
    await loadAllData();
    if (deleted) {
      showToast(`Contribution of KSh ${deleted.amount} deleted.`, async () => {
        await api.restore('contributions', [deleted]);
        await loadAllData();
        showToast(`Restored contribution.`);
      });
    }
  };

  const handleBulkDeleteContributions = async (ids: number[]) => {
    const deleted = contributions.filter(c => ids.includes(c.id));
    await api.bulkDeleteContributions(ids);
    await loadAllData();
    if (deleted.length > 0) {
      showToast(`${deleted.length} financial entries deleted.`, async () => {
        await api.restore('contributions', deleted);
        await loadAllData();
        showToast(`Restored ${deleted.length} entries.`);
      });
    }
  };

  const handleImportContributions = async (list: Partial<Contribution>[]) => {
    await api.importContributions(list);
    await loadAllData();
  };

  const handleAddExpenditure = async (exp: Partial<Expenditure>) => {
    await api.createExpenditure(exp);
    await loadAllData();
  };

  const handleDeleteExpenditure = async (id: number) => {
    const deleted = expenditures.find(e => e.id === id);
    await api.deleteExpenditure(id);
    await loadAllData();
    if (deleted) {
      showToast(`Expenditure entry deleted.`, async () => {
        await api.restore('expenditures', [deleted]);
        await loadAllData();
        showToast(`Restored expenditure.`);
      });
    }
  };

  const handleBulkDeleteExpenditures = async (ids: number[]) => {
    const deleted = expenditures.filter(e => ids.includes(e.id));
    await api.bulkDeleteExpenditures(ids);
    await loadAllData();
    if (deleted.length > 0) {
      showToast(`${deleted.length} expenditures deleted.`, async () => {
        await api.restore('expenditures', deleted);
        await loadAllData();
        showToast(`Restored ${deleted.length} expenditures.`);
      });
    }
  };

  const handleBulkUpdateExpendituresStatus = async (ids: number[], status: string) => {
    await api.bulkUpdateExpendituresStatus(ids, status);
    await loadAllData();
    showToast(`Updated ${ids.length} expenditures status to "${status}".`);
  };

  const handleUpdateExpenditure = async (id: number, exp: Partial<Expenditure>) => {
    await api.updateExpenditure(id, exp);
    await loadAllData();
  };

  const handleImportExpenditures = async (list: Partial<Expenditure>[]) => {
    await api.importExpenditures(list);
    await loadAllData();
  };

  const handleAddBranch = async (branch: Partial<Branch>) => {
    await api.createBranch(branch);
    await loadAllData();
  };

  const handleUpdateBranch = async (id: number, branch: Partial<Branch>) => {
    await api.updateBranch(id, branch);
    await loadAllData();
  };

  const handleDeleteBranch = async (id: number) => {
    const deleted = branches.find(b => b.id === id);
    await api.deleteBranch(id);
    await loadAllData();
    if (deleted) {
      showToast(`Branch "${deleted.name}" deleted.`, async () => {
        await api.restore('branches', [deleted]);
        await loadAllData();
        showToast(`Restored branch "${deleted.name}".`);
      });
    }
  };

  const handleBulkDeleteBranches = async (ids: number[]) => {
    const deleted = branches.filter(b => ids.includes(b.id));
    await api.bulkDeleteBranches(ids);
    await loadAllData();
    if (deleted.length > 0) {
      showToast(`${deleted.length} branches deleted.`, async () => {
        await api.restore('branches', deleted);
        await loadAllData();
        showToast(`Restored ${deleted.length} branches.`);
      });
    }
  };

  const handleAddCellGroup = async (cg: Partial<CellGroup>) => {
    await api.createCellGroup(cg);
    await loadAllData();
  };

  const handleUpdateCellGroup = async (id: number, cg: Partial<CellGroup>) => {
    await api.updateCellGroup(id, cg);
    await loadAllData();
  };

  const handleDeleteCellGroup = async (id: number) => {
    const deleted = cellGroups.find(cg => cg.id === id);
    await api.deleteCellGroup(id);
    await loadAllData();
    if (deleted) {
      showToast(`Cell group "${deleted.name}" deleted.`, async () => {
        await api.restore('cell_groups', [deleted]);
        await loadAllData();
        showToast(`Restored cell group "${deleted.name}".`);
      });
    }
  };

  const handleBulkDeleteCellGroups = async (ids: number[]) => {
    const deleted = cellGroups.filter(cg => ids.includes(cg.id));
    await api.bulkDeleteCellGroups(ids);
    await loadAllData();
    if (deleted.length > 0) {
      showToast(`${deleted.length} cell groups deleted.`, async () => {
        await api.restore('cell_groups', deleted);
        await loadAllData();
        showToast(`Restored ${deleted.length} cell groups.`);
      });
    }
  };

  const handleAddSession = async (data: { date: string; service_name: string; branch_id: number; records: { member_id: number; status: string }[] }) => {
    await api.createAttendanceSession(data);
    await loadAllData();
  };

  const handleUpdateRecords = async (sessionId: number, records: { member_id: number; status: string }[]) => {
    await api.updateAttendanceRecords(sessionId, records);
    await loadAllData();
  };

  const handleGetSessionRecords = async (sessionId: number) => {
    return await api.getAttendanceRecords(sessionId);
  };

  const handleDeleteSession = async (id: number) => {
    const deletedSession = sessions.find(s => s.id === id);
    let deletedRecords: any[] = [];
    try {
      deletedRecords = await api.getAttendanceRecords(id);
    } catch (_) {}
    await api.deleteAttendanceSession(id);
    await loadAllData();
    if (deletedSession) {
      showToast(`Attendance session deleted.`, async () => {
        await api.restore('attendance_sessions', [deletedSession]);
        if (deletedRecords.length > 0) {
          await api.restore('attendance_records', deletedRecords);
        }
        await loadAllData();
        showToast(`Restored attendance session.`);
      });
    }
  };

  const handleBulkDeleteSessions = async (ids: number[]) => {
    const deletedSessions = sessions.filter(s => ids.includes(s.id));
    let deletedRecords: any[] = [];
    for (const sid of ids) {
      try {
        const recs = await api.getAttendanceRecords(sid);
        deletedRecords = [...deletedRecords, ...recs];
      } catch (_) {}
    }
    await api.bulkDeleteSessions(ids);
    await loadAllData();
    if (deletedSessions.length > 0) {
      showToast(`${deletedSessions.length} sessions deleted.`, async () => {
        await api.restore('attendance_sessions', deletedSessions);
        if (deletedRecords.length > 0) {
          await api.restore('attendance_records', deletedRecords);
        }
        await loadAllData();
        showToast(`Restored ${deletedSessions.length} sessions.`);
      });
    }
  };

  const handleSendBulkSms = async (smsData: { sender: string; message: string; recipients: string }) => {
    await api.sendBulkSms(smsData);
    await loadAllData();
  };

  const handleUpdatePrayerRequestStatus = async (id: number, status: string) => {
    await api.updatePrayerRequestStatus(id, status);
    await loadAllData();
  };

  const handleDeletePrayerRequest = async (id: number) => {
    const deleted = prayerRequests.find(pr => pr.id === id);
    await api.deletePrayerRequest(id);
    await loadAllData();
    if (deleted) {
      showToast(`Prayer request deleted.`, async () => {
        await api.restore('prayer_requests', [deleted]);
        await loadAllData();
        showToast(`Restored prayer request.`);
      });
    }
  };

  const handleBulkUpdatePrayerRequestsStatus = async (ids: number[], status: string) => {
    await api.bulkUpdatePrayerRequestsStatus(ids, status);
    await loadAllData();
    showToast(`Updated ${ids.length} prayer requests status to "${status}".`);
  };

  const handleSubmitPrayerRequest = async (reqData: Partial<PrayerRequest>) => {
    await api.createPrayerRequest(reqData);
    await loadAllData();
  };

  const handleTriggerBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await api.triggerBackup();
      if (res.success) {
        setLatestBackupTime(res.timestamp);
      }
    } catch (err: any) {
      console.error('Manual backup failed:', err);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Nav definitions
  const adminNavItems = [
    { id: 'dashboard', label: 'Ministry Metrics', icon: LayoutDashboard },
    { id: 'members', label: 'Congregant Registry', icon: Users },
    { id: 'finances', label: 'Financial Ledger', icon: TrendingUp },
    { id: 'branches', label: 'Cell Groups & Branches', icon: GitBranch },
    { id: 'attendance', label: 'Attendance Rosters', icon: CheckSquare },
    { id: 'database', label: 'Database Status', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Sticky Header Banner */}
      <header className="sticky top-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-900/30 z-30 shadow-md px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex flex-col gap-2 sm:gap-2.5">
          {/* Main Header Bar Row */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
            {/* Logo & Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full overflow-hidden shadow-md border border-slate-200 flex items-center justify-center shrink-0">
                <img
                  src={gimkLogo}
                  alt="GIMK Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-tight leading-none truncate">GIMK Portal</h1>
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase transition cursor-pointer active:scale-95 select-none shadow-md shrink-0"
                  >
                    <Download size={9} />
                    <span>Install</span>
                  </button>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-300 font-semibold tracking-wider mt-0.5 truncate">Ramba-Kabondo, Kenya</p>
              </div>
            </div>

            {/* Desktop Search Bar (Admin View - Large screens) */}
            {currentRole === 'admin' && (
              <div className="hidden xl:block flex-1 max-w-xs lg:max-w-sm mx-4">
                <GlobalSearch 
                  members={members}
                  prayerRequests={prayerRequests}
                  contributions={contributions}
                  onNavigateToTab={(tabId) => setActiveTab(tabId)}
                />
              </div>
            )}

            {/* Right Controls Container */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Admin Database Backup Info (Desktop) */}
              {currentRole === 'admin' && (
                <div className="hidden xl:flex items-center gap-2 text-xs bg-slate-950/45 px-2.5 py-1.5 rounded-lg border border-blue-900/30 shadow-inner">
                  <Database size={13} className="text-amber-400 animate-pulse shrink-0" />
                  <div className="text-[9px] text-slate-300 leading-tight">
                    <span className="font-bold block text-slate-400 uppercase tracking-widest text-[7px] leading-none">Database Backup</span>
                    <span className="font-mono font-medium">{latestBackupTime || 'Loading...'}</span>
                  </div>
                  <button
                    onClick={handleTriggerBackup}
                    disabled={isBackingUp}
                    className={`ml-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-extrabold tracking-wider uppercase transition cursor-pointer disabled:opacity-50 select-none active:scale-95 ${isBackingUp ? 'animate-pulse' : ''}`}
                  >
                    {isBackingUp ? '...' : 'Backup'}
                  </button>
                </div>
              )}

              {/* Desktop-only Role Toggle Switch (lg+ screens) */}
              <div className="hidden lg:inline-flex rounded-xl border border-blue-900/40 p-0.5 bg-slate-950/75 text-xs shadow-inner gap-1">
                <button
                  onClick={() => { setCurrentRole('congregant'); setActiveTab('home'); }}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[10px] uppercase tracking-wider ${currentRole === 'congregant' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                  <Compass size={12} />
                  <span>Congregant</span>
                </button>
                <button
                  onClick={() => { setCurrentRole('usher'); }}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[10px] uppercase tracking-wider ${currentRole === 'usher' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                  <UserCheck size={12} />
                  <span>Usher</span>
                </button>
                <button
                  onClick={() => { setCurrentRole('pastor'); }}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[10px] uppercase tracking-wider ${currentRole === 'pastor' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                  <BookOpen size={12} />
                  <span>Pastor</span>
                </button>
                <button
                  onClick={() => { setCurrentRole('admin'); setActiveTab('dashboard'); }}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[10px] uppercase tracking-wider ${currentRole === 'admin' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                >
                  <ShieldCheck size={12} />
                  <span>Admin</span>
                </button>
              </div>

              {/* Dynamic User Session Info Bar */}
              {currentRole !== 'congregant' && loggedInUsers[currentRole] && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/65 border border-slate-800/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] text-slate-300 font-semibold shadow-inner">
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">
                    User: <strong className="text-amber-400 font-bold">{loggedInUsers[currentRole]}</strong>
                  </span>
                  <div className="w-px h-3 bg-slate-800 shrink-0" />
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="text-[8px] sm:text-[9px] uppercase tracking-wider hover:text-white text-slate-400 font-bold cursor-pointer transition select-none shrink-0"
                  >
                    Keys
                  </button>
                  <div className="w-px h-3 bg-slate-800 shrink-0" />
                  <button
                    onClick={() => setLoggedInUsers(prev => ({ ...prev, [currentRole]: null }))}
                    className="text-[8px] sm:text-[9px] uppercase tracking-wider hover:text-rose-400 text-slate-400 font-bold cursor-pointer transition select-none shrink-0"
                  >
                    Exit
                  </button>
                </div>
              )}

              {/* Mobile Hamburger for Admin panel */}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1.5 sm:p-2 md:hidden hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer shrink-0"
                  aria-label="Toggle navigation menu"
                >
                  {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Full-width Responsive Role Switcher Segmented Control for Mobile & Tablet (< lg) */}
          <div className="lg:hidden w-full pt-0.5">
            <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl border border-blue-900/40 bg-slate-950/80 text-xs shadow-inner w-full">
              <button
                onClick={() => { setCurrentRole('congregant'); setActiveTab('home'); }}
                className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider ${currentRole === 'congregant' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
              >
                <Compass size={11} className="shrink-0" />
                <span className="truncate">Congregant</span>
              </button>
              <button
                onClick={() => { setCurrentRole('usher'); }}
                className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider ${currentRole === 'usher' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
              >
                <UserCheck size={11} className="shrink-0" />
                <span className="truncate">Usher</span>
              </button>
              <button
                onClick={() => { setCurrentRole('pastor'); }}
                className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider ${currentRole === 'pastor' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
              >
                <BookOpen size={11} className="shrink-0" />
                <span className="truncate">Pastor</span>
              </button>
              <button
                onClick={() => { setCurrentRole('admin'); setActiveTab('dashboard'); }}
                className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer text-[9px] sm:text-[10px] uppercase tracking-wider ${currentRole === 'admin' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
              >
                <ShieldCheck size={11} className="shrink-0" />
                <span className="truncate">Admin</span>
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Search Bar (Admin View - < xl screens) */}
          {currentRole === 'admin' && (
            <div className="block xl:hidden w-full pt-0.5 pb-0.5">
              <GlobalSearch 
                members={members}
                prayerRequests={prayerRequests}
                contributions={contributions}
                onNavigateToTab={(tabId) => setActiveTab(tabId)}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col md:flex-row relative">
        {/* Admin Navigation Sidebar (Desktop only, if admin) */}
        {currentRole === 'admin' && (
          <aside className="hidden md:block w-60 border-r border-slate-800 bg-slate-900 p-4 space-y-2 shrink-0">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 block px-3 py-1">
              Admin Services
            </span>
            <nav className="space-y-1">
              {adminNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${activeTab === item.id ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
                  >
                    <Icon size={16} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Mobile Sidebar overlay */}
        <AnimatePresence>
          {currentRole === 'admin' && isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 top-[61px] bg-slate-950/50 backdrop-blur-xs z-20"
            >
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="w-60 h-full bg-slate-900 border-r border-slate-800 p-4 space-y-2 shadow-xl"
              >
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 block px-3 py-1">
                  Admin Navigation
                </span>
                <nav className="space-y-1">
                  {adminNavItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${activeTab === item.id ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                      >
                        <Icon size={16} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-500'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Mobile Backup Module */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2 mt-4">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 block px-3">
                    System Administration
                  </span>
                  <div className="mx-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Database size={13} className="text-amber-400 animate-pulse" />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Database Backup</span>
                    </div>
                    <div className="text-[10px] font-mono leading-tight text-slate-300">
                      Last: {latestBackupTime || 'None'}
                    </div>
                    <button
                      onClick={handleTriggerBackup}
                      disabled={isBackingUp}
                      className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 select-none"
                    >
                      <Database size={11} />
                      <span>{isBackingUp ? 'Backing up...' : 'Backup Now'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Main Content Stage */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Database className="animate-spin text-blue-600" size={32} />
              <div className="text-center space-y-0.5">
                <span className="text-xs font-bold text-slate-600 block">Connecting to GIMK SQLite DB</span>
                <span className="text-[10px] text-slate-400 font-medium">Bootstrapping and seeding initial records...</span>
              </div>
            </div>
          ) : error ? (
            <div className="py-12 max-w-md mx-auto text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 border border-rose-100 rounded-full text-rose-600">
                <ShieldCheck size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-sm">Database Connection Error</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={loadAllData}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
              >
                Retry Database Connection
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {currentRole !== 'congregant' && !loggedInUsers[currentRole] ? (
                <GimkAuth
                  role={currentRole}
                  onLoginSuccess={(username) => {
                    setLoggedInUsers(prev => ({ ...prev, [currentRole]: username }));
                    if (currentRole === 'admin') {
                      setActiveTab('dashboard');
                    }
                  }}
                  onCancel={() => {
                    setCurrentRole('congregant');
                    setActiveTab('home');
                  }}
                />
              ) : currentRole === 'admin' ? (
                /* ADMIN VIEWPORT */
                <>
                  {(activeTab === 'dashboard' || !['dashboard', 'members', 'finances', 'branches', 'attendance', 'database'].includes(activeTab)) && stats && (
                    <AdminDashboard 
                      stats={stats} 
                      onNavigateToTab={(tab) => setActiveTab(tab)} 
                      members={members}
                      contributions={contributions}
                      sessions={sessions}
                      role={currentRole}
                      permissions={{
                        canDelete: currentRole === 'admin',
                        canExport: currentRole === 'admin'
                      }}
                    />
                  )}
                  {activeTab === 'members' && (
                    <AdminMembers 
                      members={members} 
                      branches={branches}
                      cellGroups={cellGroups}
                      onRefresh={loadAllData}
                      onAddMember={handleAddMember}
                      onUpdateMember={handleUpdateMember}
                      onDeleteMember={handleDeleteMember}
                      onBulkDeleteMembers={handleBulkDeleteMembers}
                      onBulkUpdateMembersStatus={handleBulkUpdateMembersStatus}
                      onImportMembers={handleImportMembers}
                    />
                  )}
                  {activeTab === 'finances' && (
                    <AdminFinances 
                      contributions={contributions}
                      expenditures={expenditures}
                      members={members}
                      cellGroups={cellGroups}
                      onRefresh={loadAllData}
                      onAddContribution={handleAddContribution}
                      onDeleteContribution={handleDeleteContribution}
                      onBulkDeleteContributions={handleBulkDeleteContributions}
                      onImportContributions={handleImportContributions}
                      onAddExpenditure={handleAddExpenditure}
                      onUpdateExpenditure={handleUpdateExpenditure}
                      onDeleteExpenditure={handleDeleteExpenditure}
                      onBulkDeleteExpenditures={handleBulkDeleteExpenditures}
                      onBulkUpdateExpendituresStatus={handleBulkUpdateExpendituresStatus}
                      onImportExpenditures={handleImportExpenditures}
                    />
                  )}
                  {activeTab === 'branches' && (
                    <AdminBranches 
                      branches={branches}
                      cellGroups={cellGroups}
                      onRefresh={loadAllData}
                      onAddBranch={handleAddBranch}
                      onUpdateBranch={handleUpdateBranch}
                      onDeleteBranch={handleDeleteBranch}
                      onBulkDeleteBranches={handleBulkDeleteBranches}
                      onAddCellGroup={handleAddCellGroup}
                      onUpdateCellGroup={handleUpdateCellGroup}
                      onDeleteCellGroup={handleDeleteCellGroup}
                      onBulkDeleteCellGroups={handleBulkDeleteCellGroups}
                    />
                  )}
                  {activeTab === 'attendance' && (
                    <AdminAttendance 
                      sessions={sessions}
                      branches={branches}
                      members={members}
                      onRefresh={loadAllData}
                      onAddSession={handleAddSession}
                      onUpdateRecords={handleUpdateRecords}
                      onGetSessionRecords={handleGetSessionRecords}
                      onDeleteSession={handleDeleteSession}
                      onBulkDeleteSessions={handleBulkDeleteSessions}
                    />
                  )}
                  {activeTab === 'database' && (
                    <DatabaseMaintenance 
                      onRefresh={loadAllData} 
                      showToast={(msg) => showToast(msg)} 
                    />
                  )}
                </>
              ) : currentRole === 'pastor' ? (
                /* PASTOR VIEWPORT */
                <PastorDashboard 
                  members={members}
                  branches={branches}
                  cellGroups={cellGroups}
                  prayerRequests={prayerRequests}
                  bulkSmsLogs={bulkSmsLogs}
                  onAddMember={handleAddMember}
                  onRefresh={loadAllData}
                  onSendBulkSms={handleSendBulkSms}
                  onUpdatePrayerRequestStatus={handleUpdatePrayerRequestStatus}
                  onDeletePrayerRequest={handleDeletePrayerRequest}
                />
              ) : currentRole === 'usher' ? (
                /* USHER VIEWPORT */
                <UsherDashboard 
                  members={members}
                  branches={branches}
                  sessions={sessions}
                  onAddSession={handleAddSession}
                  onRefresh={loadAllData}
                />
              ) : (
                /* CONGREGANT PORTAL VIEWPORT */
                <CongregantPortal 
                  events={events}
                  sermons={sermons}
                  hymns={hymns}
                  members={members}
                  onSubmitPrayerRequest={handleSubmitPrayerRequest}
                />
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Humble Page Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gideons International Ministries Kenya (GIMK) © 2026</span>
          <span className="font-mono text-[9px] bg-slate-50 px-2 py-0.5 border rounded-sm text-slate-400">HQ Location: Ramba-Kabondo</span>
        </div>
      </footer>

      {/* Floating PWA Install Button */}
      {!isStandalone && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleInstallClick}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 md:py-3.5 md:px-5 rounded-full md:rounded-2xl shadow-2xl flex items-center gap-2.5 z-[150] cursor-pointer group active:scale-[0.98] border border-blue-500/30 transition-shadow hover:shadow-blue-500/20"
          title="Install GIMK Portal App"
        >
          <Download size={18} className="animate-bounce" />
          <span className="hidden md:inline text-xs uppercase tracking-wider font-extrabold">Install GIMK App</span>
        </motion.button>
      )}

      {/* Floating Toast Notification with Undo */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo?.();
                setToast(null);
              }}
              className="ml-4 px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-black rounded-md cursor-pointer transition shadow-xs uppercase tracking-wider"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Change Password Modal */}
      {currentRole !== 'congregant' && loggedInUsers[currentRole] && (
        <ChangePasswordModal
          username={loggedInUsers[currentRole]!}
          role={currentRole}
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            showToast('Success: Password updated.');
          }}
        />
      )}

      {/* Elegant PWA Install Guide Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseInstallModal}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30">
                    <Download className="text-amber-400 animate-pulse" size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight uppercase">Install GIMK Portal App</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Run GIMK on your Home Screen or Desktop</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseInstallModal}
                  className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Iframe detection alert */}
                {isInIframe ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Inside Workspace Preview Frame</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Your browser <strong>completely blocks</strong> PWA installation inside iframe editors. To install GIMK as an app on your device, you must open it in a direct top-level browser tab first!
                      </p>
                      <button
                        onClick={() => {
                          window.open(window.location.href, '_blank');
                          setShowInstallModal(false);
                        }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg shadow-sm cursor-pointer transition active:scale-95"
                      >
                        <ExternalLink size={12} />
                        <span>Open in New Tab & Install</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Top-Level Window Active</p>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Ready to install! If you don't see the default address-bar prompt, select your platform below for easy manual trigger guides.
                      </p>
                    </div>
                  </div>
                )}

                {/* Real-time Diagnostics Monitor */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                      PWA Compliance Diagnostics
                    </h5>
                    <button
                      onClick={() => {
                        const globalPrompt = (window as any).deferredPrompt;
                        if (globalPrompt) {
                          setDeferredPrompt(globalPrompt);
                          setIsInstallable(true);
                        }
                        setHasManifest(!!document.querySelector('link[rel="manifest"]'));
                        if ('serviceWorker' in navigator) {
                          navigator.serviceWorker.getRegistration()
                            .then((reg) => {
                              if (reg) {
                                setSwRegistered(true);
                                setSwActive(!!reg.active);
                              } else {
                                setSwRegistered(false);
                                setSwActive(false);
                              }
                            });
                        }
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition active:scale-95"
                    >
                      <RefreshCw size={10} />
                      Scan Engine
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 text-[11px]">Connection:</span>
                      {window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle size={12} /> HTTPS
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> Unsecured
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 text-[11px]">Manifest:</span>
                      {hasManifest ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle size={12} /> Linked
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> Missing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 text-[11px]">Worker:</span>
                      {swRegistered ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle size={12} /> Registered
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> Missing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 text-[11px]">Status:</span>
                      {swActive ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 text-[11px] leading-relaxed space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300 text-[11px]">Install Prompt state:</span>
                      {deferredPrompt ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          <CheckCircle size={11} /> Ready
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          <AlertTriangle size={11} /> Pending / Cooldown
                        </span>
                      )}
                    </div>

                    {!deferredPrompt && (
                      <p className="text-slate-400">
                        <strong>Chrome Prompt Cooldown Active?</strong> Chrome blocks prompts if previously dismissed. To bypass this and force the address-bar install icon / star to appear:
                        <br />
                        <span className="text-blue-400 block mt-1.5">
                          ➔ Open GIMK in a new <strong>Incognito Window</strong>.
                          <br />
                          ➔ Or in DevTools (F12) ➔ Application ➔ Storage ➔ Click <strong>Clear Site Data</strong>, then refresh.
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Platform Selection Guides */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Device Guides & Troubleshooting</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Desktop Tab */}
                    <div className="border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 space-y-2.5 bg-slate-50 transition">
                      <div className="flex items-center gap-2 text-slate-800">
                        <Laptop size={16} className="text-blue-600 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide">Desktop</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
                        <p>
                          1. Look at your <strong>browser URL bar</strong> (top).
                        </p>
                        <p>
                          2. Click the <strong>Install Icon</strong> <span className="font-mono bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[9px]">⊕</span> right next to the bookmark star.
                        </p>
                        <p>
                          3. Alternatively, click the browser's <strong>3-dots menu</strong> ➔ <strong>Save and share</strong> ➔ <strong>Install App</strong>.
                        </p>
                      </div>
                    </div>

                    {/* iOS Tab */}
                    <div className="border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 space-y-2.5 bg-slate-50 transition">
                      <div className="flex items-center gap-2 text-slate-800">
                        <Smartphone size={16} className="text-blue-600 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide">iOS Safari</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
                        <p>
                          1. Open this link in your <strong>Safari Browser</strong>.
                        </p>
                        <p>
                          2. Tap the <strong>Share</strong> icon <Share size={10} className="inline mx-0.5" /> (square with up arrow).
                        </p>
                        <p>
                          3. Scroll down and tap <strong>Add to Home Screen</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Android Tab */}
                    <div className="border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 space-y-2.5 bg-slate-50 transition">
                      <div className="flex items-center gap-2 text-slate-800">
                        <Smartphone size={16} className="text-blue-600 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide">Android Chrome</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
                        <p>
                          1. Tap the <strong>three dots</strong> menu <span className="font-bold text-slate-700">⋮</span> in the top-right.
                        </p>
                        <p>
                          2. Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                        </p>
                        <p>
                          3. Click <strong>Install</strong> to confirm.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">PWA Installed Benefits</h5>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>Launch GIMK full-screen from your desktop, dock, or home screen without the browser URL bar.</li>
                    <li>Highly secure, sandbox-isolated local experience.</li>
                    <li>Instant load times with optimized client caching.</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-3">
                <button
                  onClick={handleCloseInstallModal}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition active:scale-95"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    window.open(window.location.href, '_blank');
                    setShowInstallModal(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition active:scale-95 shadow-md shadow-blue-500/10"
                >
                  Open in New Tab
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
