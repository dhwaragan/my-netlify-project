import { useState, FormEvent } from 'react';
import { User, School, Hash, Fingerprint, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Student } from '../types';

interface StudentAuthProps {
  onSuccess: (student: Student) => void;
  onAdminToggle: () => void;
}

export default function StudentAuth({ onSuccess, onAdminToggle }: StudentAuthProps) {
  const [name, setName] = useState('');
  const [classNum, setClassNum] = useState('12');
  const [section, setSection] = useState('A');
  const [uid, setUid] = useState('12A');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateDetails, setDuplicateDetails] = useState<boolean>(false);

  const handleUidChange = (val: string) => {
    const cleanVal = val.trim().toUpperCase();
    setUid(cleanVal);
    
    // Auto-detect Class and Section from Roll Number (e.g. 12A16, 6B5, 10C3)
    const match = cleanVal.match(/^(\d+)([A-D])(\d*)$/);
    if (match) {
      const parsedClass = match[1];
      const parsedSection = match[2];
      
      const validClasses = ['6', '7', '8', '9', '10', '11', '12'];
      if (validClasses.includes(parsedClass)) {
        setClassNum(parsedClass);
      }
      setSection(parsedSection);
    }
  };

  const handleClassChange = (newClass: string) => {
    setClassNum(newClass);
    const cleanUid = uid.trim().toUpperCase();
    const match = cleanUid.match(/^(\d+)([A-D])(\d*)$/);
    if (match) {
      setUid(`${newClass}${match[2]}${match[3]}`);
    } else if (!cleanUid || /^[6-9]$|^1[0-2]$|^[6-9][A-D]$|^1[0-2][A-D]$/.test(cleanUid)) {
      setUid(`${newClass}${section}`);
    }
  };

  const handleSectionChange = (newSection: string) => {
    setSection(newSection);
    const cleanUid = uid.trim().toUpperCase();
    const match = cleanUid.match(/^(\d+)([A-D])(\d*)$/);
    if (match) {
      setUid(`${match[1]}${newSection}${match[3]}`);
    } else if (!cleanUid || /^[6-9]$|^1[0-2]$|^[6-9][A-D]$|^1[0-2][A-D]$/.test(cleanUid)) {
      setUid(`${classNum}${newSection}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !uid.trim()) {
      setError('Please fill in your Full Name and unique Roll Number.');
      return;
    }

    const cleanUid = uid.trim().toUpperCase();
    // Validate format of Roll Number (Class + Section + unique roll digits, e.g. 12A16, 11B5, 10C1)
    const isValidFormat = /^([6-9]|10|11|12)[A-D][0-9]+$/.test(cleanUid);
    if (!isValidFormat) {
      setError('Please enter a valid Roll Number in ClassSectionRollNo format (e.g. 12A16, where 12 is Class, A is Section, and 16 is your unique numeric Roll Number).');
      return;
    }

    const parsedMatch = cleanUid.match(/^([6-9]|10|11|12)([A-D])([0-9]+)$/);
    const apiClassSection = parsedMatch ? `${parsedMatch[1]}${parsedMatch[2]}` : `${classNum}${section}`;

    setLoading(true);
    setError(null);
    setDuplicateDetails(false);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          class_section: apiClassSection,
          unique_identifier: cleanUid
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setDuplicateDetails(true);
          throw new Error(data.message || 'Duplicate voting attempt detected.');
        }
        throw new Error(data.error || 'Server registration failure.');
      }

      // Success
      onSuccess(data.student);
    } catch (err: any) {
      setError(err.message || 'Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="student-auth-container" className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-indigo-50/50 border border-slate-200 overflow-hidden transition-all duration-300">
      <div className="bg-slate-50 border-b border-slate-200 p-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-white mb-3 shadow-md flex items-center justify-center">
          <img 
            src="https://res.cloudinary.com/domuelr1f/image/upload/v1781976105/gps_logo_qoijle.jpg" 
            alt="GPS logo" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="font-display font-bold text-xl tracking-tight text-slate-950">Student Voter Auth</h1>
        <p className="text-slate-500 text-xs mt-1">Verify credentials to proceed to the secure digital booth</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-semibold text-red-800">Authentication Warning</p>
              <p className="mt-0.5 text-red-600 leading-relaxed">{error}</p>
              {duplicateDetails && (
                <div className="mt-2 text-[11px] bg-red-100/50 p-2 rounded text-red-800">
                  ⚠️ Note: Every student is authorized to cast exactly 1 ballot. Auditing software is active. If you feel this is a mistake, contact your administrator.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Name input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-display uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-indigo-605" />
            Full Name (As per school register)
          </label>
          <input
            id="voter-name-input"
            type="text"
            required
            placeholder="Aryan Sharma"
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm transition-all outline-none"
          />
        </div>

        {/* Class and Section selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-display uppercase tracking-wider">
              <School className="w-3.5 h-3.5 text-indigo-605" />
              Class
            </label>
            <select
              id="voter-class-select"
              value={classNum}
              disabled={loading}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-sm transition-all focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="12">Class 12</option>
              <option value="11">Class 11</option>
              <option value="10">Class 10</option>
              <option value="9">Class 9</option>
              <option value="8">Class 8</option>
              <option value="7">Class 7</option>
              <option value="6">Class 6</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-display uppercase tracking-wider">
              <School className="w-3.5 h-3.5 text-indigo-605" />
              Section
            </label>
            <select
              id="voter-section-select"
              value={section}
              disabled={loading}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 text-sm transition-all focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>
        </div>

        {/* Unique Student Identifier */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-display uppercase tracking-wider">
            <Hash className="w-3.5 h-3.5 text-indigo-650" />
            Roll Number (e.g. 12A16)
          </label>
          <input
            id="voter-id-input"
            type="text"
            required
            placeholder="12A16"
            disabled={loading}
            value={uid}
            onChange={(e) => handleUidChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-mono tracking-wider transition-all outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1 leading-normal">
            Where <strong>{classNum}</strong> is Class, <strong>{section}</strong> is Section, followed by your unique roll number digits.
          </p>
        </div>

        <div className="pt-2">
          <button
            id="student-auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sealing Authorization Ticket...
              </>
            ) : (
              <>
                Confirm & Enter Booth
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-450">
          <span>Encrypted Session: Active</span>
          <button
            id="toggle-admin-btn"
            type="button"
            onClick={onAdminToggle}
            className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
          >
            Staff Portal
          </button>
        </div>
      </form>
    </div>
  );
}
