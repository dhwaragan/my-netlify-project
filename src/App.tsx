import { useState, useEffect } from 'react';
import { 
  Vote, BarChart3, ShieldAlert, CheckSquare, 
  Info, InfoIcon, Award, School2, HeartHandshake, CheckCircle2 
} from 'lucide-react';
import { Candidate, Student } from './types';
import StudentAuth from './components/StudentAuth';
import BallotBox from './components/BallotBox';
import AdminPanel from './components/AdminPanel';
import ResultsView from './components/ResultsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'booth' | 'results' | 'admin'>('booth');
  const [student, setStudent] = useState<Student | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Voting session receipt state
  const [ballotSuccessSeed, setBallotSuccessSeed] = useState<{
    voted_at: string;
    student_name: string;
    student_id: string;
    uid: string;
  } | null>(null);

  // Results refresh state
  const [resultsVersion, setResultsVersion] = useState(0);

  // Load candidate nominees directory on mount
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const res = await fetch('/api/candidates');
        if (!res.ok) throw new Error('Unresolved REST API candidates catalog compilation.');
        const data = await res.json();
        setCandidates(data);
      } catch (err: any) {
        setError(err.message || 'Error compiling database candidates list.');
      }
    };
    loadCandidates();
  }, [resultsVersion]);

  // Handle successful student login card validation
  const handleStudentAuthSuccess = (authenticatedStudent: Student) => {
    setStudent(authenticatedStudent);
    setBallotSuccessSeed(null); // Clear any previous success message
    setActiveTab('booth'); // Ensure they are on the booth tab
  };

  // Submit student selections securely to Express server
  const handleVoteSubmit = async (selections: Record<string, string>) => {
    if (!student) return;

    try {
      const response = await fetch('/api/votes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          votes: selections
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server rejected ballot storage.');
      }

      // Record success parameters for the confirmation report receipt
      setBallotSuccessSeed({
        voted_at: data.voted_at || new Date().toISOString(),
        student_name: student.name,
        student_id: student.id,
        uid: student.unique_identifier
      });

      // Clear student state, and trigger results reload
      setStudent(null);
      setResultsVersion(prev => prev + 1);
    } catch (err: any) {
      throw new Error(err.message || 'Network communication error while casting ballot.');
    }
  };

  const handleLogoutStudent = () => {
    setStudent(null);
    setBallotSuccessSeed(null);
  };

  const forceRefreshResults = () => {
    setResultsVersion(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Main Core Navigation bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-md shrink-0 flex items-center justify-center">
              <img 
                src="https://res.cloudinary.com/domuelr1f/image/upload/v1781976105/gps_logo_qoijle.jpg" 
                alt="GPS Private Academy Logo" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%232563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school-2"><path d="M14 22V12h-4v10"/><path d="M2 22h20"/><path d="m12 2-10 6v3h20V8L12 2z"/></svg>';
                }}
              />
            </div>
            <div>
              <h1 className="font-display font-medium text-lg leading-tight text-slate-950 flex items-center gap-1.5">
                GPS Private Academy
              </h1>
              <p className="text-xs text-slate-500 font-medium">Digital Sovereign Election Portal</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 md:gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button
              id="nav-booth-tab"
              onClick={() => { setActiveTab('booth'); setBallotSuccessSeed(null); }}
              className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'booth'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span className="hidden sm:inline">Voting Booth</span>
              <span className="sm:hidden">Booth</span>
            </button>

            <button
              id="nav-results-tab"
              onClick={() => setActiveTab('results')}
              className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Live Results
            </button>

            <button
              id="nav-admin-tab"
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Teacher Audit Log
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container Stage Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start gap-8">
        
        {error && (
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-3xl p-4 text-red-600 text-xs flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-normal">{error}</p>
          </div>
        )}

        {/* Tab 1: BOOTH MODULE */}
        {activeTab === 'booth' && (
          <>
            {student ? (
              // Voting Booth wizard
              <div className="w-full flex justify-center animate-fadeIn">
                <BallotBox
                  student={student}
                  candidates={candidates}
                  onSubmit={handleVoteSubmit}
                  onLogout={handleLogoutStudent}
                />
              </div>
            ) : ballotSuccessSeed ? (
              // Ballot submission receipt
              <div id="ballot-receipt-success" className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto border-2 border-emerald-100 shadow-sm animate-scaleIn">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 font-extrabold bg-emerald-50 px-3 py-1 rounded-full">
                    TRANSMISSION LOCKED
                  </span>
                  <h3 className="font-display font-black text-2xl text-slate-900">Ballot Cast Successfully</h3>
                  <p className="text-xs text-slate-500 leading-relaxed px-2">
                    Congratulations <strong>{ballotSuccessSeed.student_name}</strong>. Your school ballot choices have been encrypted and stored in the secure pending queue for verification.
                  </p>
                </div>

                {/* Encrypted receipt hash */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold uppercase pb-1.5 border-b border-slate-200">
                    <span>Audit Ticket Receipt</span>
                    <span>Class 12A Verified</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">STUDENT SERIAL DEED</span>
                    <span className="font-mono text-slate-700 font-semibold">{ballotSuccessSeed.student_id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">ROLL CALL UID</span>
                      <span className="font-mono text-slate-700 font-bold">{ballotSuccessSeed.uid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">DEPOSITED TIME</span>
                      <span className="font-mono text-slate-700 font-bold">{new Date(ballotSuccessSeed.voted_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    id="finish-voting-receipt-btn"
                    onClick={() => setBallotSuccessSeed(null)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  >
                    Close & Enter Another Student
                  </button>
                  <button
                    id="receipt-view-standings-btn"
                    onClick={() => { setBallotSuccessSeed(null); setActiveTab('results'); }}
                    className="w-full py-3 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    View Live Standing Standings
                  </button>
                </div>
              </div>
            ) : (
              // Login view
              <div className="w-full flex flex-col items-center gap-8">
                {/* Visual Intro Info Grid */}
                <div className="text-center max-w-2xl px-4 space-y-3">
                  <div className="inline-flex py-1 px-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-semibold gap-1.5 items-center justify-center mx-auto">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    GPS Student Elections 2026-2027
                  </div>
                  <h2 className="font-display font-extrabold text-4xl text-slate-950 tracking-tight leading-tight">
                    Secure Online Voting Portal
                  </h2>
                  <p className="text-slate-550 text-sm leading-relaxed max-w-lg mx-auto">
                    Provide your School Register credential cards below to cast your ballot. The system enforces cryptographic safety and single-vote protection protocols.
                  </p>
                </div>

                {/* Login Form */}
                <StudentAuth 
                  onSuccess={handleStudentAuthSuccess} 
                  onAdminToggle={() => setActiveTab('admin')}
                />

                {/* Additional Guidance Info */}
                <div className="max-w-lg w-full bg-blue-50/40 border border-blue-100 text-blue-900 rounded-3xl p-5 space-y-3">
                  <h4 className="font-display font-bold text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    Cryptographic Voting Shield Notice
                  </h4>
                  <ul className="list-disc list-inside text-xs text-blue-800 space-y-1.5 leading-relaxed">
                    <li>Students cannot register or cast votes multiple times. Your Student ID Roll No must be totally unique.</li>
                    <li>Full ballots enter a sealed, audited state, protecting privacy before review by the election administrators.</li>
                    <li>Only approved ballots are counted toward the results standings chart.</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: STANDINGS MODULE */}
        {activeTab === 'results' && (
          <div className="w-full flex justify-center animate-fadeIn">
            <ResultsView version={resultsVersion} />
          </div>
        )}

        {/* Tab 3: ADMIN MODULE */}
        {activeTab === 'admin' && (
          <div className="w-full flex justify-center animate-fadeIn">
            <AdminPanel 
              onLogout={() => setActiveTab('booth')} 
              onRefreshResults={forceRefreshResults}
            />
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 GPS Private School Academy. All Rights Reserved. Audited & Certified.</p>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <span>&bull;</span>
            <a href="#terms" className="hover:text-blue-600 transition-colors">Security Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
