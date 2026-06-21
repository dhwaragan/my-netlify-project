import { useState } from 'react';
import { Candidate, Student } from '../types';
import { ChevronRight, ChevronLeft, Check, Send, AlertTriangle, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface BallotBoxProps {
  student: Student;
  candidates: Candidate[];
  onSubmit: (selections: Record<string, string>) => Promise<void>;
  onLogout: () => void;
}

export default function BallotBox({ student, candidates, onSubmit, onLogout }: BallotBoxProps) {
  // Group candidates by position
  const positionsOrder = [
    'Head Boy',
    'Head Girl',
    'General Secretary',
    'Coordinator',
    'President',
    'Sports Secretary',
    'Treasurer'
  ];

  const [currentStep, setCurrentStep] = useState(0); // 0 to 6 for positions, 7 for Review Receipt
  const [selections, setSelections] = useState<Record<string, string>>({}); // position: candidateId
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentPosition = positionsOrder[currentStep];
  const candidatesForCurrentPosition = candidates.filter(c => c.position === currentPosition);

  const handleSelectCandidate = (candidateId: string) => {
    setSelections({
      ...selections,
      [currentPosition]: candidateId
    });
  };

  const handleNext = () => {
    if (!selections[currentPosition]) {
      // Prompt selection if they try to skip without voting
      alert(`Please select a candidate for ${currentPosition} before moving to the next position.`);
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmitBallot = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(selections);
    } catch (err: any) {
      setSubmitError(err.message || 'Ballot submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fast direct selection from receipt step
  const handleJumpToStep = (index: number) => {
    setCurrentStep(index);
  };

  // Render step progress tracker top bar
  const progressPercent = Math.min(((currentStep + 1) / (positionsOrder.length + 1)) * 100, 100);

  return (
    <div id="ballot-box-container" className="max-w-5xl w-full bg-slate-50/45 rounded-3xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300">
      {/* Header Navigation */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center">
            <img 
              src="https://res.cloudinary.com/domuelr1f/image/upload/v1781976105/gps_logo_qoijle.jpg" 
              alt="GPS logo" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-850 italic uppercase font-display">
            GPS <span className="text-indigo-650">Voter</span>
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-900">{student.name}</span>
            <span className="text-xs text-slate-500 font-medium">Class {student.class_section} • ID: {student.unique_identifier}</span>
          </div>
          <button
            id="exit-booth-btn"
            onClick={onLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-all cursor-pointer"
          >
            Exit Portal
          </button>
        </div>
      </header>

      {/* Modern Progress Steps Track */}
      <div className="h-1.5 w-full bg-slate-100">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-500 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Ballot Content View */}
      <div className="p-6 md:p-8 min-h-[400px]">
        {currentStep < positionsOrder.length ? (
          // S-1: Voting Step with Sidebar (Geometric Balance style)
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar: Ballot Progress */}
            <aside className="w-full lg:w-64 flex flex-col gap-4 flex-shrink-0">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 font-display">Ballot Progress</h3>
                <div className="space-y-3.5">
                  {positionsOrder.map((position, idx) => {
                    const isCurrent = idx === currentStep;
                    const isSelected = !!selections[position];
                    const colorClass = isCurrent ? 'text-indigo-600 font-bold' : isSelected ? 'text-slate-800' : 'text-slate-400';
                    const borderClass = isCurrent ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-450';
                    return (
                      <div key={position} className={`flex items-center gap-3 transition-colors ${colorClass}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${borderClass}`}>
                          {isSelected && !isCurrent ? '✓' : idx + 1}
                        </div>
                        <span className="text-xs truncate">{position}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-950 text-indigo-50 p-5 rounded-2xl flex-grow flex flex-col justify-between shadow-sm min-h-[140px] border border-indigo-900">
                <div>
                  <h3 className="text-sm font-bold tracking-tight mb-2 text-white">Election Policy</h3>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed font-sans">
                    All votes are final once submitted and enter a 'Pending' state for administrative verification. One vote per student ID.
                  </p>
                </div>
                <div className="pt-3 border-t border-indigo-900 mt-4">
                  <div className="text-[9px] uppercase text-indigo-400 font-bold mb-1 tracking-wider">Admin Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[11px] font-semibold text-indigo-100">System Live & Audited</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Voting Area Options */}
            <div className="flex-grow flex flex-col gap-6">
              
              {/* Position Header Banner */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded mb-1.5 font-mono">
                    Active Category
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">{currentPosition}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select one nominee for the academic leadership delegation.</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{candidatesForCurrentPosition.length} Candidates Found</span>
                </div>
              </div>

              {/* Candidates Geometric Balance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {candidatesForCurrentPosition.map((candidate) => {
                  const isSelected = selections[currentPosition] === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      id={`candidate-btn-${candidate.id}`}
                      onClick={() => handleSelectCandidate(candidate.id)}
                      className={`group text-left relative overflow-hidden bg-white rounded-3xl p-1 border-2 transition-all duration-200 flex flex-col shadow-sm cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 shadow-xl shadow-indigo-100/70'
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      {/* Stylized geometric background picture box for photo/avatar */}
                      <div className="bg-slate-50 h-44 rounded-t-[22px] flex items-center justify-center relative overflow-hidden bg-slate-50 w-full group-hover:bg-slate-100/70 transition-colors">
                        <div className="w-20 h-20 bg-slate-200 rounded-full border-4 border-white overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
                          {candidate.image_url ? (
                            <img
                              src={candidate.image_url}
                              alt={candidate.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-indigo-50 to-indigo-150 flex items-center justify-center font-display font-medium text-xl text-indigo-600">
                              {candidate.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                            CURRENTLY SELECTED
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-grow items-center text-center w-full">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {candidate.name}
                        </h4>
                        <p className="text-xs text-slate-500 mb-4 font-medium">
                          Class {candidate.class_section} • Candidate
                        </p>
                        
                        <div className="mt-auto w-full">
                          {isSelected ? (
                            <div className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-sm">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              Selected
                            </div>
                          ) : (
                            <div className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider text-center group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:bg-indigo-50/60 transition-colors">
                              Select Candidate
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        ) : (
          // S-2: Ultimate Confirmation Audit Receipt
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex py-1 px-3 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold gap-1.5 items-center">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Ballot Box Status: Pending Locking
              </div>
              <h3 className="font-display font-bold text-3xl text-slate-950">
                Review School Ballot
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Ensure all selections are accurate. Votes submitted are signed by your unique key and require teacher approval before count validation.
              </p>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm flex gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-normal">{submitError}</p>
              </div>
            )}

            {/* Selection Receipt Grid */}
            <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white divide-y divide-slate-100 max-w-3xl mx-auto shadow-sm">
              {positionsOrder.map((position, idx) => {
                const selectedCandId = selections[position];
                const candidate = candidates.find(c => c.id === selectedCandId);

                return (
                  <div key={position} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 group hover:bg-slate-50/50 transition-all">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-600 font-extrabold bg-indigo-50/80 px-2 py-0.5 rounded-full">
                        {position} Selection
                      </span>
                      <h5 className="font-display font-bold text-slate-800 text-base mt-1.5">
                        {candidate ? candidate.name : 'No Selection Made'}
                      </h5>
                      <span className="text-xs text-slate-500 font-medium">
                        {candidate ? `Class ${candidate.class_section}` : 'N/A'}
                      </span>
                    </div>

                    <button
                      id={`edit-${position.replace(/\s+/g, '-')}`}
                      onClick={() => handleJumpToStep(idx)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl px-3.5 py-2 transition-all cursor-pointer"
                    >
                      Change Choice
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-yellow-50/60 border border-yellow-100 rounded-2xl p-4 flex gap-3 max-w-3xl mx-auto text-yellow-800 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">Important Human-In-The-Loop Audit notice:</p>
                <p className="mt-0.5">
                  This vote will be transmitted as <strong>PENDING APPROVED</strong> status. Digital fingerprints are monitored to prevent multi-device collusion or ballot stuffing. Only approved ballots determine the final school results.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons Row / Sticky Bottom Controls styled cleanly */}
      <footer className="h-20 bg-white border-t border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {currentStep < positionsOrder.length ? `Step ${currentStep + 1} of 8` : 'Final Review'}
          </span>
        </div>
        <div className="flex gap-4">
          <button
            id="ballot-prev-btn"
            onClick={handlePrev}
            disabled={currentStep === 0 || submitting}
            className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-all hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < positionsOrder.length ? (
            <button
              id="ballot-next-btn"
              onClick={handleNext}
              className="px-8 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-205 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              {currentStep === positionsOrder.length - 1 ? 'Review Ballot' : 'Next Category'}
            </button>
          ) : (
            <button
              id="ballot-submit-btn"
              onClick={handleSubmitBallot}
              disabled={submitting}
              className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-150 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              {submitting ? 'Locking Ballot...' : 'Securely Cast Ballot'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
