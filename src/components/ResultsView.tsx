import { useState, useEffect } from 'react';
import { Award, RefreshCw, BarChart3, HelpCircle, Inbox, Medal, Ticket } from 'lucide-react';
import { ElectionResults } from '../types';

interface ResultsViewProps {
  version: number; // Used to trigger reload
}

export default function ResultsView({ version }: ResultsViewProps) {
  const [results, setResults] = useState<ElectionResults[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalApproved, setTotalApproved] = useState(0);
  const [selectedClass, setSelectedClass] = useState('all');

  const fetchResults = async (targetClass = selectedClass) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/results?class_section=${targetClass}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        
        // Sum total approved ballots cast (using a single position count represents total voter ballots)
        if (data.length > 0) {
          setTotalApproved(data[0].totalApprovedVotes);
        } else {
          setTotalApproved(0);
        }
      }
    } catch (e) {
      console.error('Error fetching voting results', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(selectedClass);
  }, [version, selectedClass]);

  return (
    <div id="results-view-card" className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      
      {/* Title */}
      <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-[10px] text-blue-300 font-mono uppercase font-bold tracking-wider">LIVE AUDITED TALLIES</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-white mt-1">School Election Results</h2>
          <p className="text-xs text-slate-400 mt-0.5">Dynamic calculation derived exclusively from teacher-approved ballots.</p>
        </div>

        <button
          id="refresh-results-btn"
          onClick={fetchResults}
          disabled={loading}
          className="p-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          Refresh Standings
        </button>
      </div>

      {/* Grade and Class Segment Filter styled as a scrollable horizontal button bar */}
      <div className="bg-indigo-50/40 border-b border-slate-200 px-6 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Class-Wise Standings (Classes 6 to 12)
          </span>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
            Active: {selectedClass === 'all' ? 'All Classes Combined' : `Class ${selectedClass}`}
          </span>
        </div>
        
        {/* Horizontal scrollbar of buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <button
            type="button"
            onClick={() => setSelectedClass('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
              selectedClass === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                : 'bg-white text-slate-600 hover:text-indigo-600 border-slate-200 hover:border-indigo-200'
            }`}
          >
            🌐 All Classes
          </button>
          
          {['12A', '12B', '11A', '11B', '10A', '10B', '9A', '9B', '8A', '8B', '7A', '7B', '6A', '6B', '6C'].map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                selectedClass === cls
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                  : 'bg-white text-slate-600 hover:text-indigo-600 border-slate-200 hover:border-indigo-250'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Mini Stats */}
      <div className="px-6 py-4 bg-slate-50 border-b border-secondary-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider font-display shrink-0 uppercase">TOTAL VALIDATED BALLOTS</p>
            <p id="total-val-votes-text" className="text-sm font-extrabold font-mono text-slate-900">{totalApproved} Approved Profiles</p>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium max-w-sm">
          💡 <em>Note: Votes in a PENDING state are omitted from this report until reviewed and cleared in the Admin Console.</em>
        </div>
      </div>

      {/* Results details */}
      <div className="p-6 md:p-8 space-y-10">
        {loading && results.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Calculating audit logs standings...
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-slate-400 space-y-2">
            <Inbox className="w-12 h-12 text-slate-200 mx-auto" />
            <h4 className="font-display font-semibold text-slate-700">No Votes Approved Yet</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Total validated approved count is currently 0. Ballots must be approved by an administrator to count.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {results.map((posStat, idx) => {
              const hasWinner = posStat.totalApprovedVotes > 0;
              
              return (
                <div 
                  key={posStat.position} 
                  id={`pos-results-${posStat.position.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Position and Winner */}
                    <div className="border-b border-slate-50 pb-3 flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-wider text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                          POSITION TALLY
                        </span>
                        <h3 className="font-display font-bold text-slate-900 text-lg mt-1">
                          {posStat.position}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono whitespace-nowrap">
                        {posStat.totalApprovedVotes} votes
                      </span>
                    </div>

                    {/* Candidate options lists */}
                    <div className="space-y-4">
                      {posStat.candidates.map((cand, candIdx) => {
                        const isLeading = hasWinner && candIdx === 0 && cand.votes > 0;
                        const barWidth = cand.pct + '%';

                        // Custom elegant colors for candidates depending on position index for gorgeous visuals
                        const barColors = [
                          'bg-gradient-to-r from-blue-500 to-indigo-500',
                          'bg-gradient-to-r from-teal-400 to-emerald-500',
                          'bg-gradient-to-r from-amber-400 to-orange-500',
                          'bg-gradient-to-r from-purple-400 to-indigo-500'
                        ];
                        const chosenBarColor = barColors[candIdx % barColors.length];

                        return (
                          <div key={cand.candidateId} className="space-y-1.5 relative">
                            {/* Candidate Labels */}
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{cand.candidateName}</span>
                                <span className="text-[10px] text-slate-400">({cand.classSection})</span>
                                {isLeading && (
                                  <span className="inline-flex bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase gap-0.5 items-center">
                                    <Medal className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                                    Leader
                                  </span>
                                )}
                              </div>
                              <div className="text-right font-mono text-[11px]">
                                <span className="font-semibold text-slate-900">{cand.votes} votes</span>
                                <span className="text-slate-400"> ({cand.pct}%)</span>
                              </div>
                            </div>

                            {/* Stylized Progress Bar */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${chosenBarColor}`}
                                style={{ width: barWidth }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Highlight current winning projection label */}
                  {hasWinner && (
                    <div className="mt-5 pt-3 border-t border-slate-50 bg-slate-50/50 p-2.5 rounded-xl text-[11px] flex items-center justify-between text-slate-600">
                      <span className="font-medium flex items-center gap-1 font-mono">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        PROJECTION STATUS:
                      </span>
                      <span className="font-bold text-slate-850 truncate max-w-[150px]">
                        {posStat.winner}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-[11px] text-slate-400 font-medium">
        Validations checked &bull; Double-Voting Protection Shield Active &bull; Database Server: SHA-256 Registered
      </div>
    </div>
  );
}
