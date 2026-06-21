import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, CheckCircle, XCircle, Clock, Search, ShieldCheck, 
  RotateCcw, Code, Database, RefreshCw, Loader2, Eye,
  Plus, Trash2, Pencil, UserPlus, Image as ImageIcon, Filter
} from 'lucide-react';
import { Admin } from '../types';

// Normalization function to compare classes cleanly across different formats (e.g., "6th A" vs "6A")
const normalizeClassForComparison = (cls: string): string => {
  if (!cls) return '';
  return cls
    .toLowerCase()
    .replace(/\s+/g, '')        // remove spaces
    .replace('th', '')          // remove 'th' from e.g. '6thA' -> '6a'
    .replace('class', '')       // remove 'class'
    .replace('grade', '')       // remove 'grade'
    .trim();
};

interface AdminPanelProps {
  onLogout: () => void;
  onRefreshResults: () => void;
}

interface AuditRecord {
  vote_id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_uid: string;
  candidate_id: string;
  candidate_name: string;
  position: string;
  status: 'pending' | 'approved' | 'rejected';
  voted_at: string;
}

export default function AdminPanel({ onLogout, onRefreshResults }: AdminPanelProps) {
  // Authentication State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminUser, setAdminUser] = useState<Admin | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Ballots & Audit State
  const [ballots, setBallots] = useState<AuditRecord[]>([]);
  const [loadingBallots, setLoadingBallots] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'actions' | 'candidates'>('pending');
  const [approvingIds, setApprovingIds] = useState<string[]>([]);
  const [auditViewMode, setAuditViewMode] = useState<'flat' | 'grouped'>('grouped');
  const [selectedPendingClass, setSelectedPendingClass] = useState<string>('All');
  const [selectedHistoryClass, setSelectedHistoryClass] = useState<string>('All');

  // Candidates CRUD Backend State
  const [panelCandidates, setPanelCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  
  // Nominee forms
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [candName, setCandName] = useState('');
  const [candPosition, setCandPosition] = useState('Head Boy');
  const [candClassSection, setCandClassSection] = useState('12A');
  const [candImageUrl, setCandImageUrl] = useState('');
  const [candError, setCandError] = useState<string | null>(null);
  const [candSuccess, setCandSuccess] = useState<string | null>(null);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // States to bypass sandboxed iframe native window.confirm / alert blockers
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchPanelCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch('/api/candidates');
      if (res.ok) {
        const data = await res.json();
        setPanelCandidates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSaveCandidate = async (e: FormEvent) => {
    e.preventDefault();
    if (!candName.trim()) {
      setCandError('Candidate Nominee Name is required.');
      return;
    }
    setIsSubmitLoading(true);
    setCandError(null);
    setCandSuccess(null);

    const payload = {
      name: candName.trim(),
      position: candPosition,
      class_section: candClassSection,
      image_url: candImageUrl.trim() || undefined
    };

    try {
      let res;
      if (editingCandidate) {
        res = await fetch(`/api/candidates/${editingCandidate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save candidate nominee profile.');
      }

      setCandSuccess(editingCandidate ? 'Nominee profile updated successfully!' : 'New Nominee added to database!');
      setCandName('');
      setCandImageUrl('');
      setEditingCandidate(null);
      await fetchPanelCandidates();
      onRefreshResults(); // Reflushes live stand charts
    } catch (err: any) {
      setCandError(err.message || 'Error occurred while saving nominee.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleEditClick = (candidate: any) => {
    setEditingCandidate(candidate);
    setCandName(candidate.name);
    setCandPosition(candidate.position);
    setCandClassSection(candidate.class_section);
    setCandImageUrl(candidate.image_url || '');
    setCandError(null);
    setCandSuccess(null);
  };

  const handleDeleteCandidate = async (candId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCandSuccess('Nominee and received votes purged successfully!');
        setDeletingCandidateId(null);
        await fetchPanelCandidates();
        await fetchBallots(); // Refresh ballots log list
        onRefreshResults(); // Reflow logs
      } else {
        const d = await res.json();
        setCandError(d.error || 'Deletion failed.');
      }
    } catch (e: any) {
      setCandError(e.message || 'Error deleting candidate.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setCandName('');
    setCandImageUrl('');
    setCandError(null);
    setCandSuccess(null);
  };

  // Fetch all ballots
  const fetchBallots = async () => {
    if (!adminUser) return;
    setLoadingBallots(true);
    try {
      const res = await fetch('/api/admin/ballots');
      if (res.ok) {
        const data = await res.json();
        setBallots(data);
      }
    } catch (err) {
      console.error('Failed to load ballots', err);
    } finally {
      setLoadingBallots(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      fetchBallots();
      if (activeTab === 'candidates') {
        fetchPanelCandidates();
      }
    }
  }, [adminUser, activeTab]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication rejected.');
      }

      setAdminUser(data.admin);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Group pending votes by student so they can approve/reject the FULL school ballot at once
  const getGroupedPendingBallots = () => {
    const pendingBallots = ballots.filter(b => b.status === 'pending');
    
    // Group by student_id
    const groups: Record<string, {
      student_name: string;
      student_class: string;
      student_uid: string;
      student_id: string;
      votes: { vote_id: string; position: string; candidate_name: string }[];
    }> = {};

    pendingBallots.forEach(b => {
      if (!groups[b.student_id]) {
        groups[b.student_id] = {
          student_id: b.student_id,
          student_name: b.student_name,
          student_class: b.student_class,
          student_uid: b.student_uid,
          votes: []
        };
      }
      groups[b.student_id].votes.push({
        vote_id: b.vote_id,
        position: b.position,
        candidate_name: b.candidate_name
      });
    });

    return Object.values(groups);
  };

  // Group ALL ballots by school Grade Level & section (e.g. 12A, 12B... 6A, 6B, 6C) to trace who votes who cleanly
  const getGroupedBallotsByClass = () => {
    // 1. Group individual votes by student voter to assemble full ballot papers
    const studentBallots: Record<string, {
      student_id: string;
      student_name: string;
      student_class: string;
      student_uid: string;
      status: string;
      voted_at: string;
      votes: { position: string; candidate_name: string; status: string }[];
    }> = {};

    filteredAllBallots.forEach((b) => {
      if (!studentBallots[b.student_id]) {
        studentBallots[b.student_id] = {
          student_id: b.student_id,
          student_name: b.student_name,
          student_class: b.student_class,
          student_uid: b.student_uid,
          status: b.status,
          voted_at: b.voted_at,
          votes: []
        };
      }
      studentBallots[b.student_id].votes.push({
        position: b.position,
        candidate_name: b.candidate_name,
        status: b.status
      });
    });

    // 2. Classify student ballot papers into distinct Class/Section cohorts (12A, 12B... 6A, 6B, 6C)
    const gradeGroups: Record<string, typeof studentBallots[string][]> = {
      'Class 12A': [],
      'Class 12B': [],
      'Class 11A': [],
      'Class 11B': [],
      'Class 10A': [],
      'Class 10B': [],
      'Class 9A': [],
      'Class 9B': [],
      'Class 8A': [],
      'Class 8B': [],
      'Class 7A': [],
      'Class 7B': [],
      'Class 6A': [],
      'Class 6B': [],
      'Class 6C': [],
      'Other Classes': []
    };

    Object.values(studentBallots).forEach((sb) => {
      const cls = sb.student_class.trim().toUpperCase();
      const gradeKey = `Class ${cls}`;
      if (gradeGroups[gradeKey]) {
        gradeGroups[gradeKey].push(sb);
      } else {
        // Try fallback for general match like "12D" or simple "12"
        const match = sb.student_class.match(/^(\d+)/);
        if (match) {
          const generalKey = `Class ${match[1]}A`;
          if (gradeGroups[generalKey]) {
            gradeGroups[generalKey].push(sb);
            return;
          }
        }
        gradeGroups['Other Classes'].push(sb);
      }
    });

    return gradeGroups;
  };

  const handleUpdateStudentBallotStatus = async (studentId: string, voteIds: string[], status: 'approved' | 'rejected') => {
    setApprovingIds(prev => [...prev, studentId]);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/ballots/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_ids: voteIds,
          status,
          admin_id: adminUser?.id
        })
      });

      if (res.ok) {
        setSuccessMsg(`Successfully marked entire ballot as ${status.toUpperCase()}!`);
        setTimeout(() => setSuccessMsg(null), 3500);
        await fetchBallots();
        onRefreshResults();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to update ballot status. Please make sure database rules permit this action.');
    } finally {
      setApprovingIds(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleResetDatabase = async () => {
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Database has been completely reset back to candidate seeds!');
        setConfirmReset(false);
        await fetchBallots();
        onRefreshResults();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Stats Counters
  const totalVotesCast = ballots.length / 7; // Average candidates, let's count distinct student voters instead
  const distinctVotersSet = new Set(ballots.map(b => b.student_id));
  const totalVoters = distinctVotersSet.size;

  const distinctApprovedVoters = new Set(ballots.filter(b => b.status === "approved").map(b => b.student_id)).size;
  const distinctPendingVoters = new Set(ballots.filter(b => b.status === "pending").map(b => b.student_id)).size;
  const distinctRejectedVoters = new Set(ballots.filter(b => b.status === "rejected").map(b => b.student_id)).size;

  // Complete list of classes requested by the user, plus any present in the database
  const systemClassesList = (() => {
    const requested = [
      "6A", "6B", "6C", 
      "7A", "7B", "7C", 
      "8A", "8B", "8C", 
      "9A", "9C", 
      "10A", "10B", "10C", 
      "11A", "11B", "11C", 
      "12A", "12B"
    ];
    const presentClasses = Array.from(
      new Set(ballots.map(b => b.student_class?.trim().toUpperCase()).filter(Boolean))
    ) as string[];
    
    const merged = Array.from(new Set([...requested, ...presentClasses]));
    return merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  })();

  const getPendingCountByClass = (clsName: string) => {
    return new Set(
      ballots
        .filter(b => b.status === 'pending' && normalizeClassForComparison(b.student_class) === normalizeClassForComparison(clsName))
        .map(b => b.student_id)
    ).size;
  };

  const getAllCountByClass = (clsName: string) => {
    return new Set(
      ballots
        .filter(b => normalizeClassForComparison(b.student_class) === normalizeClassForComparison(clsName))
        .map(b => b.student_id)
    ).size;
  };

  const getFilteredGroupedPendingBallots = () => {
    const allGrouped = getGroupedPendingBallots();
    if (selectedPendingClass === 'All') {
      return allGrouped;
    }
    return allGrouped.filter(g => normalizeClassForComparison(g.student_class) === normalizeClassForComparison(selectedPendingClass));
  };

  // Filter audit lists
  const filteredAllBallots = ballots.filter(b => {
    const q = searchQuery.toLowerCase();
    const searchMatch = (
      b.student_name.toLowerCase().includes(q) ||
      b.student_uid.toLowerCase().includes(q) ||
      b.position.toLowerCase().includes(q) ||
      b.candidate_name.toLowerCase().includes(q)
    );

    if (!searchMatch) return false;

    if (selectedHistoryClass === 'All') return true;
    return normalizeClassForComparison(b.student_class) === normalizeClassForComparison(selectedHistoryClass);
  });

  // Supabase Blueprint Code display block
  const supabaseSQLCode = `-- ----------------------------------------------------
-- Supabase Schema & Row-Level Security (RLS) Configuration
-- For Online School Voting application
-- ----------------------------------------------------

-- 1. Create Candidates Lookup Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position TEXT NOT NULL,
  name TEXT NOT NULL,
  class_section TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Students Tracking Table (Enforces Unique ID)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_section TEXT NOT NULL,
  unique_identifier TEXT NOT NULL UNIQUE,
  has_voted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create SECURED Votes Table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  admin_id UUID
);

-- 4. Enable Row Level Security (RLS) Rules (Optional, Recommended for Production)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Candidates Policies (Fully viewable/manageable by server backend)
CREATE POLICY "Allow public read access to candidates" ON candidates FOR SELECT USING (true);
CREATE POLICY "Allow public insert to candidates" ON candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to candidates" ON candidates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to candidates" ON candidates FOR DELETE USING (true);

-- Students Policies (Allows registration and status lookups)
CREATE POLICY "Allow public read access to students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow student registration" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow student update" ON students FOR UPDATE USING (true);

-- Votes Policies (Allows voting, viewing results, and admin moderation)
CREATE POLICY "Allow public read access to votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Allow students to cast secure votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin status updates" ON votes FOR UPDATE USING (true);
CREATE POLICY "Allow admin vote deletion" ON votes FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- NOTE: If you are experiencing permission errors or empty tables, 
-- you can completely disable Row Level Security (RLS) for testing simplicity:
-- ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
-- -----------------------------------------------------------------------------`;

  if (!adminUser) {
    // Admin login UI
    return (
      <div id="admin-login-card" className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-indigo-50/50 border border-slate-200 overflow-hidden space-y-0 transition-all duration-300">
        <div className="bg-slate-50 border-b border-slate-200 p-6 text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-indigo-650 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-150">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-slate-950">Teacher Secretariat</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Authorized administrator console & ballot auditing workstation
          </p>
        </div>

        <div className="p-6 space-y-4">
          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs flex gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-705 uppercase tracking-wider font-display">Administrator Username / Email</label>
              <input
                id="admin-email-input"
                type="text"
                required
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-705 uppercase tracking-wider font-display">Audit Secret Key</label>
              <input
                id="admin-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Securing Vault Ingress...
                </>
              ) : (
                'Enter Secretariat Portal'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard UI
  return (
    <div id="admin-dashboard-container" className="max-w-6xl w-full bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-200 overflow-hidden">
      
      {/* Header Info Banner */}
      <div className="bg-slate-50 p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex py-1 px-2.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold tracking-wider uppercase items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-650" />
            SECRETARIATE CONSOLE
          </div>
          <h2 className="font-display font-bold text-xl text-slate-950 mt-1.5">Election Monitor Secretariat</h2>
          <p className="text-xs text-slate-500 mt-0.5">Logged in as: <span className="font-mono text-indigo-650 font-semibold">{adminUser.email} ({adminUser.role})</span></p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            id="admin-refresh-btn"
            onClick={fetchBallots}
            className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Refresh
          </button>
          <button
            id="admin-exit-btn"
            onClick={onLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Exit Console
          </button>
        </div>
      </div>

      {/* Modern Dashboard Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-200 bg-slate-50/30">
        <div className="p-6 border-r border-b lg:border-b-0 border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold font-display tracking-wider uppercase">TOTAL BALLOTS</span>
            <h4 id="stat-total-ballots" className="text-2xl font-bold font-mono text-slate-950 mt-0.5">{totalVoters}</h4>
          </div>
        </div>

        <div className="p-6 border-r border-b lg:border-b-0 border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold font-display tracking-wider uppercase">APPROVED</span>
            <h4 id="stat-approved-ballots" className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">{distinctApprovedVoters}</h4>
          </div>
        </div>

        <div className="p-6 border-r border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold font-display tracking-wider uppercase">PENDING REVIEW</span>
            <h4 id="stat-pending-ballots" className="text-2xl font-bold font-mono text-amber-600 mt-0.5">{distinctPendingVoters}</h4>
          </div>
        </div>

        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-505 flex items-center justify-center shadow-sm">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold font-display tracking-wider uppercase">REJECTED</span>
            <h4 id="stat-rejected-ballots" className="text-2xl font-bold font-mono text-red-650 mt-0.5">{distinctRejectedVoters}</h4>
          </div>
        </div>
      </div>

      {/* Tabs list navigation */}
      <div className="border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            id="tab-pending-btn"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-indigo-650 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({distinctPendingVoters})
          </button>
          
          <button
            id="tab-all-btn"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-indigo-650 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History Logs
          </button>

          <button
            id="tab-candidates-btn"
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-white text-indigo-650 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manage Candidates
          </button>

          <button
            id="tab-actions-btn"
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'actions'
                ? 'bg-white text-indigo-650 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            System
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              id="search-audit-input"
              type="text"
              placeholder="Search voter name, status, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-205 rounded-xl text-xs outline-none focus:border-indigo-600 bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        )}
      </div>

      {successMsg && (
        <div id="admin-toast-success" className="mx-6 mt-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold">
          🎉 {successMsg}
        </div>
      )}

      {errorMsg && (
        <div id="admin-toast-error" className="mx-6 mt-6 p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>❌ Error: {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">Dismiss</button>
        </div>
      )}

      {/* Tab Panels */}
      <div className="p-6">
        
        {/* TAB 1: PENDING WORKFLOW (HUMAN-IN-THE-LOOP BATCH REVIEW) */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-lg text-slate-900">Pending Student Ballots Review</h3>
              <p className="text-xs text-slate-500">
                These students have cast ballots which currently reside in a secure sealed holding area. Review and approve to tabulate, or reject if they are suspected duplicates.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left / Top Filter Sidebar */}
              <div className="lg:col-span-3 lg:sticky lg:top-4 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 shrink-0 shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      Filter by Class
                    </span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-100">
                      Pending
                    </span>
                  </div>
                  
                  {/* On mobile: Horizontal slider. On desktop: Vertical stacked list */}
                  <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none snap-x">
                    <button
                      onClick={() => setSelectedPendingClass('All')}
                      className={`px-3 py-1.5 lg:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 snap-start cursor-pointer shrink-0 lg:w-full ${
                        selectedPendingClass === 'All'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-705 border border-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        All Classes
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        selectedPendingClass === 'All'
                          ? 'bg-indigo-750 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {distinctPendingVoters}
                      </span>
                    </button>

                    {systemClassesList.map((cls) => {
                      const count = getPendingCountByClass(cls);
                      const isSelected = selectedPendingClass === cls;

                      return (
                        <button
                          key={cls}
                          onClick={() => setSelectedPendingClass(cls)}
                          className={`px-3 py-1.5 lg:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 snap-start cursor-pointer shrink-0 lg:w-full ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-100/90 text-slate-750 border border-slate-205'
                          }`}
                        >
                          <span className="truncate">Grade {cls}</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-755 text-white'
                              : count > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-100 text-slate-405'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right main list workflow */}
              <div className="lg:col-span-9 space-y-4">
                {loadingBallots ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-xs">Accessing Ballot Audit Logs...</span>
                  </div>
                ) : getFilteredGroupedPendingBallots().length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-3xl py-12 text-center text-slate-400 bg-slate-50/20">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-40 mb-3" />
                    <h4 className="font-display font-semibold text-slate-850">
                      {selectedPendingClass === 'All' ? 'Secretariat Queue is Clear' : `No submissions for Class ${selectedPendingClass}`}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {selectedPendingClass === 'All'
                        ? 'There are no pending ballots currently requiring manual human audit review. Feel free to vote as a student to see them here!'
                        : `All submitted ballots from Grade ${selectedPendingClass} have already been fully audited and resolved.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredGroupedPendingBallots().map((grouped) => {
                      const studentIdsMap = grouped.votes.map(v => v.vote_id);
                      const isProcessing = approvingIds.includes(grouped.student_id);

                      return (
                        <div 
                          key={grouped.student_id} 
                          className={`border rounded-3xl p-5 bg-white shadow-sm transition-all border-slate-205 ${
                            isProcessing ? 'opacity-50 animate-pulse' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-4 gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-display font-bold text-slate-900 text-base">{grouped.student_name}</h4>
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-indigo-100/50">Class {grouped.student_class}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Roll No: <span className="font-mono text-indigo-650 font-semibold">{grouped.student_uid}</span>
                              </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                id={`approve-all-${grouped.student_id}`}
                                disabled={isProcessing}
                                onClick={() => handleUpdateStudentBallotStatus(grouped.student_id, studentIdsMap, 'approved')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve Entire Ballot
                              </button>

                              <button
                                id={`reject-all-${grouped.student_id}`}
                                disabled={isProcessing}
                                onClick={() => handleUpdateStudentBallotStatus(grouped.student_id, studentIdsMap, 'rejected')}
                                className="px-4 py-2 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 border border-red-200 text-red-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject Ballot
                              </button>
                            </div>
                          </div>

                          {/* Display what student selected */}
                          <div className="bg-slate-50 rounded-2xl p-4">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Ballot Selections ({grouped.votes.length} positions)</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                              {grouped.votes.map((v) => (
                                <div key={v.vote_id} className="bg-white p-3 rounded-xl border border-slate-200">
                                  <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">{v.position}</p>
                                  <p className="text-xs font-bold text-slate-800 mt-0.5">{v.candidate_name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
                  {/* TAB 2: AUDIT LOG GRID REPORT */}
        {activeTab === 'all' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-slate-900">Ballot Counting Room Audit Reports</h3>
                <p className="text-xs text-slate-500">
                  Granular audit logs of ballots cast. Filter by voter name/UID or change format options below.
                </p>
              </div>

              {/* View Mode controls: Grouped vs Flat */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start shrink-0 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAuditViewMode('grouped')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    auditViewMode === 'grouped'
                      ? 'bg-white text-indigo-750 shadow-sm'
                      : 'text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <span>📂 Class Groups (6-12)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditViewMode('flat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    auditViewMode === 'flat'
                      ? 'bg-white text-indigo-750 shadow-sm'
                      : 'text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <span>📋 Flat Audit Rows</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left / Top Filter Sidebar */}
              <div className="lg:col-span-3 lg:sticky lg:top-4 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 shrink-0 shadow-xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      Filter by Class
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-300">
                      Logs List
                    </span>
                  </div>
                  
                  {/* On mobile: Horizontal slider. On desktop: Vertical stacked list */}
                  <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none snap-x">
                    <button
                      onClick={() => setSelectedHistoryClass('All')}
                      className={`px-3 py-1.5 lg:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 snap-start cursor-pointer shrink-0 lg:w-full ${
                        selectedHistoryClass === 'All'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-705 border border-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        All Classes
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        selectedHistoryClass === 'All'
                          ? 'bg-indigo-750 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {new Set(ballots.map(b => b.student_id)).size}
                      </span>
                    </button>

                    {systemClassesList.map((cls) => {
                      const count = getAllCountByClass(cls);
                      const isSelected = selectedHistoryClass === cls;

                      return (
                        <button
                          key={cls}
                          onClick={() => setSelectedHistoryClass(cls)}
                          className={`px-3 py-1.5 lg:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 snap-start cursor-pointer shrink-0 lg:w-full ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-100/90 text-slate-755 border border-slate-205'
                          }`}
                        >
                          <span className="truncate">Grade {cls}</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-755 text-white'
                              : count > 0
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/30'
                              : 'bg-slate-100 text-slate-405'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right main list workflow logs */}
              <div className="lg:col-span-9 space-y-5">
                {loadingBallots ? (
                  <div className="text-center py-20 text-slate-400 text-xs">Loading ballots...</div>
                ) : filteredAllBallots.length === 0 ? (
                  <div className="text-center py-20 text-slate-450 text-xs bg-slate-50 border border-dashed border-slate-205 rounded-3xl p-6">
                    {selectedHistoryClass === 'All'
                      ? 'No ballots matching current search queries were discovered.'
                      : `No active voting logs exist for Class ${selectedHistoryClass} matching current query.`}
                  </div>
                ) : auditViewMode === 'grouped' ? (
                  /* Class grouped voting summaries - Shows who votes who */
                  <div className="space-y-6">
                    {Object.entries(getGroupedBallotsByClass()).map(([gradeKey, studentList]) => {
                      if (studentList.length === 0) return null; // Skip grades with no votes is clean

                      return (
                        <div key={gradeKey} className="space-y-4 bg-slate-100/40 p-5 rounded-3xl border border-slate-200 animate-fade">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                              <h4 className="font-display font-bold text-slate-900 text-sm">{gradeKey} Registration Logs</h4>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100/50">
                              {studentList.length} Active ballots
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studentList.map((sb) => {
                              const statusColor = sb.status === 'approved' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : sb.status === 'rejected'
                                ? 'bg-red-50 text-red-755 border-red-100'
                                : 'bg-amber-50 text-amber-705 border-amber-100';

                              return (
                                <div key={sb.student_id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between space-y-3.5">
                                  <div>
                                    <div className="flex items-start justify-between gap-1">
                                      <div>
                                        <h5 className="font-bold text-slate-900 text-xs">{sb.student_name}</h5>
                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                                          ID: <span className="font-bold text-slate-700">{sb.student_uid}</span> &bull; cl. {sb.student_class}
                                        </p>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase shrink-0 ${statusColor}`}>
                                        {sb.status}
                                      </span>
                                    </div>

                                    {/* Who Voted Who Selections Pairings */}
                                    <div className="mt-3.5 space-y-1.5">
                                      <div className="text-[9px] font-bold text-slate-450 uppercase tracking-widest font-mono">Ballot Details</div>
                                      <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 divide-y divide-slate-100 space-y-1.5 max-h-[140px] overflow-y-auto">
                                        {sb.votes.map((v, vIdx) => (
                                          <div key={vIdx} className="flex justify-between items-start text-[10px] gap-2 pt-1.5 first:pt-0">
                                            <span className="text-slate-404 truncate max-w-[100px] shrink-0 font-medium">{v.position}:</span>
                                            <span className="font-bold text-indigo-950 text-right">{v.candidate_name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-[9px] text-slate-400 font-mono text-right font-medium">
                                    Cast: {new Date(sb.voted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Flat simple list table format */
                  <div className="border border-slate-205 rounded-3xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px] font-bold">
                          <th className="p-4">Voter Identity</th>
                          <th className="p-4">Student ID (UID)</th>
                          <th className="p-4">Position</th>
                          <th className="p-4">Nominee Choice</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Cast Time</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 text-xs divide-y divide-slate-100 font-medium">
                        {filteredAllBallots.map((ballot) => {
                          const statusColor = ballot.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : ballot.status === 'rejected'
                            ? 'bg-red-50 text-red-755 border-red-100'
                            : 'bg-amber-50 text-amber-705 border-amber-100';

                          return (
                            <tr key={ballot.vote_id} className="hover:bg-slate-50/50">
                              <td className="p-4">
                                <span className="font-bold text-slate-900">{ballot.student_name}</span>
                                <span className="block text-[10px] text-slate-400">Class {ballot.student_class}</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-600">{ballot.student_uid}</td>
                              <td className="p-4 text-slate-550">{ballot.position}</td>
                              <td className="p-4 font-bold text-indigo-650">{ballot.candidate_name}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusColor}`}>
                                  {ballot.status}
                                </span>
                              </td>
                              <td className="p-4 text-[10px] text-slate-405 font-mono">
                                {new Date(ballot.voted_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3a: MANAGE CANDIDATES PANEL */}
        {activeTab === 'candidates' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  Manage Candidate Nominees
                </h3>
                <p className="text-xs text-slate-500">
                  Add new entries, update current nominees, or delete redudent profiles globally across the digital ballot paper.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Form card - Left Column */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  {editingCandidate ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-500" />
                      Edit Candidate Nominee
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-indigo-600" />
                      Add New Candidate Nominee
                    </>
                  )}
                </h4>

                {candError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs leading-normal">
                    {candError}
                  </div>
                )}

                {candSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-105 rounded-xl text-emerald-800 text-xs font-semibold">
                    🎉 {candSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveCandidate} className="space-y-4">
                  {/* Nominee Name input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Candidate Name</label>
                    <input
                      id="cand-name-input"
                      type="text"
                      required
                      placeholder="e.g. Godson Daniel"
                      value={candName}
                      onChange={(e) => setCandName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  {/* Nominee Position Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Position</label>
                    <select
                      id="cand-position-select"
                      value={candPosition}
                      onChange={(e) => setCandPosition(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-indigo-600 outline-none"
                    >
                      <option value="Head Boy">Head Boy</option>
                      <option value="Head Girl">Head Girl</option>
                      <option value="General Secretary">General Secretary</option>
                      <option value="Coordinator">Coordinator</option>
                      <option value="President">President</option>
                      <option value="Sports Secretary">Sports Secretary</option>
                      <option value="Treasurer">Treasurer</option>
                    </select>
                  </div>

                  {/* Nominee Class/Section selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Class & Section</label>
                    <select
                      id="cand-class-select"
                      value={candClassSection}
                      onChange={(e) => setCandClassSection(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-indigo-600 outline-none"
                    >
                      <option value="12A">Class 12A</option>
                      <option value="12B">Class 12B</option>
                      <option value="12C">Class 12C</option>
                      <option value="12D">Class 12D</option>
                      <option value="11A">Class 11A</option>
                      <option value="11B">Class 11B</option>
                    </select>
                  </div>

                  {/* Nominee Avatar Image block - URL Input + Direct Image upload with base64 conversion */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avatar Portrait (URL or Direct Upload)</label>
                    
                    {/* Visual thumbnail preview */}
                    {candImageUrl && (
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 animate-fade">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-50 flex items-center justify-center">
                          <img 
                            src={candImageUrl} 
                            alt="Nominee Portrait Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23888888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-indigo-700 font-bold">Image Selected</p>
                          <p className="text-[9px] text-slate-400 truncate font-mono">{candImageUrl.startsWith('data:') ? 'Base64 Encoded Portrait' : candImageUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCandImageUrl('')}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div className="relative flex-grow min-w-0">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                        <input
                          id="cand-img-input"
                          type="text"
                          placeholder="Paste image link/URL..."
                          value={candImageUrl}
                          onChange={(e) => setCandImageUrl(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
                        />
                      </div>

                      <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-100/50 transition-colors shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Please select an image smaller than 2MB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setCandImageUrl(base64);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      id="cand-submit-save-btn"
                      type="submit"
                      disabled={isSubmitLoading}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs transition-all cursor-pointer text-center"
                    >
                      {isSubmitLoading ? 'Saving...' : editingCandidate ? 'Update Nominee' : 'Add Candidate Nominee'}
                    </button>
                    {editingCandidate && (
                      <button
                        id="cand-cancel-edit-btn"
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Candidates Grid - Right Columns */}
              <div className="lg:col-span-2 space-y-4">
                {loadingCandidates ? (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    Accessing Candidate Catalog...
                  </div>
                ) : panelCandidates.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-3xl py-12 text-center text-slate-400 bg-slate-50/20">
                    <Users className="w-12 h-12 text-slate-300 mx-auto opacity-40 mb-3" />
                    <h4 className="font-display font-semibold text-slate-800">No Nominees Registered</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Ballot paper has no candidates registered yet. Please populate the nominee list.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Map candidates grouped by Position */}
                    {Array.from(new Set(panelCandidates.map(c => c.position))).map(position => {
                      const posCandidates = panelCandidates.filter(c => c.position === position);
                      
                      return (
                        <div key={position} className="space-y-2">
                          <h4 className="text-xs font-bold text-indigo-750 bg-indigo-50/60 px-3 py-1.5 rounded-lg border border-indigo-100/50 inline-block font-sans animate-fade">
                            {position}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5 animate-fade">
                            {posCandidates.map(cand => (
                              <div 
                                key={cand.id} 
                                className="bg-white border border-slate-205 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-3">
                                  {cand.image_url ? (
                                    <img 
                                      src={cand.image_url} 
                                      alt={cand.name}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-200">
                                      {cand.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <h5 className="text-sm font-bold text-slate-900">{cand.name}</h5>
                                    <p className="text-xs text-slate-400">Class {cand.class_section}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    id={`edit-cand-${cand.id}`}
                                    onClick={() => handleEditClick(cand)}
                                    title="Edit Profile"
                                    className="p-1 px-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Pencil className="w-3" />
                                    Edit
                                  </button>
                                  {deletingCandidateId === cand.id ? (
                                    <div className="flex gap-1 items-center">
                                      <button
                                        id={`delete-cand-confirm-${cand.id}`}
                                        onClick={() => handleDeleteCandidate(cand.id)}
                                        title="Confirm Purge Nominee"
                                        className="p-1 px-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm animate-pulse"
                                      >
                                        Sure? Purge
                                      </button>
                                      <button
                                        onClick={() => setDeletingCandidateId(null)}
                                        className="p-1 px-1 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-[10px] font-medium transition-all cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      id={`delete-cand-${cand.id}`}
                                      onClick={() => setDeletingCandidateId(cand.id)}
                                      title="Purge Candidate Nominee"
                                      className="p-1 px-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM CONTROLS / SEED / RESET */}
        {activeTab === 'actions' && (
          <div className="space-y-6 max-w-xl">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-900">Secretariat System Tools</h3>
              <p className="text-xs text-slate-500">
                Maintenance and mock simulation sandbox utilities.
              </p>
            </div>

            <div className="border border-red-200 rounded-3xl p-5 bg-red-50/20 space-y-4">
              <div>
                <h4 className="font-display font-bold text-sm text-red-950 flex items-center gap-1">
                   <RotateCcw className="w-4 h-4 text-red-600" />
                  Wipe & Re-Seed Election Data
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Removes all students, current votes cast, and registrations from memory and persistent files. Instantly resets the candidates table back to the original candidates requested in the school guidelines.
                </p>
              </div>

              {confirmReset ? (
                <div className="flex gap-2 items-center">
                  <button
                    id="reset-db-btn-confirm"
                    onClick={handleResetDatabase}
                    className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm animate-pulse"
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="reset-db-btn"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2 border border-red-300 hover:bg-red-650 hover:text-white hover:border-red-600 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-red-50/50"
                >
                  Trigger Complete Database Reset
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
