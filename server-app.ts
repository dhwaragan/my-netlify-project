import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Candidate, Student, Vote, Admin, ElectionResults } from './src/types.js';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseEnabled = !!(supabaseUrl && supabaseKey);
const supabase = isSupabaseEnabled ? createClient(supabaseUrl, supabaseKey) : null;

// Setup environment and paths
const app = express();
// Netlify Functions (and most serverless hosts) only allow writes to the OS
// temp directory - process.cwd() is read-only there. This local file is only
// ever used as a fallback when Supabase isn't configured, but it must not
// crash serverless cold starts even when unused.
const DATA_DIR = path.join(os.tmpdir(), 'voting-app-data');
const DB_FILE = path.join(DATA_DIR, 'voter_db.json');

app.use(express.json());

// Initialize Local JSON Database with realistic seed data
function ensureDbInitialized() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let db = {
    candidates: [] as Candidate[],
    students: [] as Student[],
    votes: [] as Vote[],
    admins: [] as Admin[]
  };

  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error("Error reading database file, resetting:", e);
    }
  }

  // Generate candidates seed data if empty
  if (!db.candidates || db.candidates.length === 0) {
    const seedCandidates: Omit<Candidate, 'id'>[] = [
      // Head Boy
      { position: 'Head Boy', name: 'Aashish', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
      { position: 'Head Boy', name: 'Sri Ram', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200' },
      
      // Head Girl
      { position: 'Head Girl', name: 'Rajakumari', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
      { position: 'Head Girl', name: 'Adithi', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200' },
      
      // General Secretary
      { position: 'General Secretary', name: 'Ritvik', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
      { position: 'General Secretary', name: 'Yuvan Ram', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
      
      // Coordinator
      { position: 'Coordinator', name: 'Kowshik Ram', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200' },
      { position: 'Coordinator', name: 'Atchiya', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
      
      // President
      { position: 'President', name: 'Ashwanth', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=200' },
      { position: 'President', name: 'Nithish', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' },
      { position: 'President', name: 'Fredrick Joel', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200' },
      
      // Sports Secretary
      { position: 'Sports Secretary', name: 'Surendar', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
      { position: 'Sports Secretary', name: 'Joel Osteen', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=200' },
      { position: 'Sports Secretary', name: 'Deepak', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200' },
      { position: 'Sports Secretary', name: 'Praiseline', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=200' },
      
      // Treasurer
      { position: 'Treasurer', name: 'Akshitha', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=200' },
      { position: 'Treasurer', name: 'Kamalesh', class_section: '12B', image_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200' }
    ];

    db.candidates = seedCandidates.map((c, i) => ({
      ...c,
      id: `cand-${i + 1}-${c.name.toLowerCase().replace(/\s+/g, '-')}`
    }));
  }

  // Ensure default Administrator credentials are present
  if (!db.admins) {
    db.admins = [];
  }
  const hasAdmin = db.admins.some((a: any) => a.email.toLowerCase() === 'godson@gmail.com');
  if (!hasAdmin) {
    db.admins.unshift({ id: 'admin-super-id', email: 'godson@gmail.com', role: 'super_admin' });
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log("Database persistent state loaded/initialized successfully.");
}

ensureDbInitialized();

async function ensureSupabaseSeeded() {
  if (!supabase) return;
  try {
    const { data: existingCandidates, error } = await supabase
      .from('candidates')
      .select('id')
      .limit(1);

    if (error) {
      console.error("Supabase candidates query error:", error.message);
      return;
    }

    if (!existingCandidates || existingCandidates.length === 0) {
      console.log("Supabase candidates table is empty. Seeding Candidates...");
      const seedCandidates = [
        // Head Boy
        { position: 'Head Boy', name: 'Aashish', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
        { position: 'Head Boy', name: 'Sri Ram', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200' },
        
        // Head Girl
        { position: 'Head Girl', name: 'Rajakumari', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
        { position: 'Head Girl', name: 'Adithi', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200' },
        
        // General Secretary
        { position: 'General Secretary', name: 'Ritvik', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
        { position: 'General Secretary', name: 'Yuvan Ram', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
        
        // Coordinator
        { position: 'Coordinator', name: 'Kowshik Ram', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200' },
        { position: 'Coordinator', name: 'Atchiya', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
        
        // President
        { position: 'President', name: 'Ashwanth', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=200' },
        { position: 'President', name: 'Nithish', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' },
        { position: 'President', name: 'Fredrick Joel', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200' },
        
        // Sports Secretary
        { position: 'Sports Secretary', name: 'Surendar', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
        { position: 'Sports Secretary', name: 'Joel Osteen', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=200' },
        { position: 'Sports Secretary', name: 'Deepak', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200' },
        { position: 'Sports Secretary', name: 'Praiseline', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=200' },
        
        // Treasurer
        { position: 'Treasurer', name: 'Akshitha', class_section: '12A', image_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=200' },
        { position: 'Treasurer', name: 'Kamalesh', class_section: '12B', image_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200' }
      ];

      const insertPayload = seedCandidates.map(c => ({
        id: crypto.randomUUID(),
        position: c.position,
        name: c.name,
        class_section: c.class_section,
        image_url: c.image_url
      }));

      const { error: seedError } = await supabase
        .from('candidates')
        .insert(insertPayload);

      if (seedError) {
        console.error("Failed to seed candidates in Supabase:", seedError.message);
      } else {
        console.log("Successfully seeded candidates in Supabase!");
      }
    }
  } catch (e: any) {
    console.error("Unexpected error during Supabase seeding:", e.message || e);
  }
}

if (isSupabaseEnabled) {
  ensureSupabaseSeeded();
}

// Helper to interact with the DB
function getDb() {
  ensureDbInitialized();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// REST APIs
// 1. Get info on environment & configuration status
app.get('/api/config', (req, res) => {
  const customSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  res.json({
    status: 'ok',
    mode: customSupabase ? 'Supabase Connected' : 'Local Persistence (Active-Simulated)',
    supabaseConfigured: customSupabase
  });
});

// 2. Clear & Reset Database for easy testing
app.post('/api/admin/reset', async (req, res) => {
  if (isSupabaseEnabled && supabase) {
    try {
      // Clear data from votes, students and then candidates
      await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await ensureSupabaseSeeded();
    } catch (e: any) {
      console.error("Failed to reset Supabase database:", e.message || e);
    }
  }

  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  ensureDbInitialized();
  res.json({ success: true, message: 'Database reset to fresh seeds successfully.' });
});

// 3. Get candidates
app.get('/api/candidates', async (req, res) => {
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase.from('candidates').select('*').order('position', { ascending: true });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json(data);
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  res.json(db.candidates);
});

// 3a. Add candidate
app.post('/api/candidates', async (req, res) => {
  const { position, name, class_section, image_url } = req.body;
  if (!position || !name || !class_section) {
    res.status(400).json({ error: 'Position, Name, and Class Section are required.' });
    return;
  }

  if (isSupabaseEnabled && supabase) {
    try {
      const newCandidate = {
        id: crypto.randomUUID(),
        position: position.trim(),
        name: name.trim(),
        class_section: class_section.trim(),
        image_url: image_url ? image_url.trim() : null
      };
      const { data, error } = await supabase.from('candidates').insert(newCandidate).select();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ success: true, candidate: data[0] });
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  const newCandidate: Candidate = {
    id: `cand-${Date.now()}-${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`,
    position: position.trim(),
    name: name.trim(),
    class_section: class_section.trim(),
    image_url: image_url ? image_url.trim() : undefined
  };
  db.candidates.push(newCandidate);
  saveDb(db);
  res.json({ success: true, candidate: newCandidate });
});

// 3b. Update candidate
app.put('/api/candidates/:id', async (req, res) => {
  const { id } = req.params;
  const { position, name, class_section, image_url } = req.body;
  if (!position || !name || !class_section) {
    res.status(400).json({ error: 'Position, Name, and Class Section are required.' });
    return;
  }

  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .update({
          position: position.trim(),
          name: name.trim(),
          class_section: class_section.trim(),
          image_url: image_url ? image_url.trim() : null
        })
        .eq('id', id)
        .select();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      if (!data || data.length === 0) {
        res.status(404).json({ error: 'Candidate not found.' });
        return;
      }
      res.json({ success: true, candidate: data[0] });
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  const idx = db.candidates.findIndex((c: Candidate) => c.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Candidate not found.' });
    return;
  }
  db.candidates[idx] = {
    ...db.candidates[idx],
    position: position.trim(),
    name: name.trim(),
    class_section: class_section.trim(),
    image_url: image_url ? image_url.trim() : undefined
  };
  saveDb(db);
  res.json({ success: true, candidate: db.candidates[idx] });
});

// 3c. Delete candidate
app.delete('/api/candidates/:id', async (req, res) => {
  const { id } = req.params;

  if (isSupabaseEnabled && supabase) {
    try {
      console.log(`[DELETE CANDIDATE] Initiating delete for candidate ID: ${id}`);
      const { error: votesError } = await supabase.from('votes').delete().eq('candidate_id', id);
      if (votesError) {
        console.error(`[DELETE CANDIDATE] Error deleting votes for candidate:`, votesError);
      }

      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) {
        console.error(`[DELETE CANDIDATE] Error deleting candidate ${id}:`, error);
        res.status(500).json({ error: error.message });
        return;
      }
      console.log(`[DELETE CANDIDATE] Successfully deleted candidate ID: ${id}`);
      res.json({ success: true, message: 'Candidate and associated votes removed successfully.' });
      return;
    } catch (e: any) {
      console.error(`[DELETE CANDIDATE] Crash during deletion:`, e);
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  const idx = db.candidates.findIndex((c: Candidate) => c.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Candidate not found.' });
    return;
  }
  // Remove candidate
  db.candidates.splice(idx, 1);
  // Remove any votes associated with this candidate to protect results consistency
  db.votes = db.votes.filter((v: Vote) => v.candidate_id !== id);
  saveDb(db);
  res.json({ success: true, message: 'Candidate and associated votes removed successfully.' });
});

// 4. Student check and register
app.post('/api/register', async (req, res) => {
  const { name, class_section, unique_identifier } = req.body;
  if (!name || !class_section || !unique_identifier) {
    res.status(400).json({ error: 'Name, Class/Section, and Unique Identifier are required.' });
    return;
  }

  const normalizedId = unique_identifier.trim().toUpperCase();

  if (isSupabaseEnabled && supabase) {
    try {
      // Look up student by unique_identifier in Supabase
      const { data: existingStudents, error: findError } = await supabase
        .from('students')
        .select('*')
        .eq('unique_identifier', normalizedId);
        
      if (findError) {
        res.status(500).json({ error: findError.message });
        return;
      }
      
      let student = existingStudents && existingStudents[0];
      
      if (student) {
        if (student.name.toLowerCase() !== name.trim().toLowerCase()) {
          res.status(403).json({
            error: 'Unique Constraint Violation',
            message: 'This roll no is already used'
          });
          return;
        }
        if (student.has_voted) {
          res.status(403).json({
            error: 'Duplication Error',
            voted: true,
            message: 'This unique identifier has already been used to cast a ballot.'
          });
          return;
        }
      } else {
        // Create new student record
        const newStudent = {
          id: crypto.randomUUID(),
          name: name.trim(),
          class_section: class_section.trim(),
          unique_identifier: normalizedId,
          has_voted: false
        };
        
        const { data: insertedStudents, error: insertError } = await supabase
          .from('students')
          .insert(newStudent)
          .select();
          
        if (insertError) {
          res.status(500).json({ error: insertError.message });
          return;
        }
        student = insertedStudents[0];
      }
      
      res.json({ success: true, student });
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();

  // Look up existing student record
  let student = db.students.find((s: Student) => s.unique_identifier === normalizedId);

  if (student) {
    if (student.name.toLowerCase() !== name.trim().toLowerCase()) {
      res.status(403).json({
        error: 'Unique Constraint Violation',
        message: 'This roll no is already used'
      });
      return;
    }
    if (student.has_voted) {
      res.status(403).json({
        error: 'Duplication Error',
        voted: true,
        message: 'This unique identifier has already been used to cast a ballot.'
      });
      return;
    }
  } else {
    // Create new student tracking entry
    student = {
      id: `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      class_section: class_section.trim(),
      unique_identifier: normalizedId,
      has_voted: false,
      created_at: new Date().toISOString()
    };
    db.students.push(student);
    saveDb(db);
  }

  res.json({ success: true, student });
});

// 5. Submit votes
app.post('/api/votes/submit', async (req, res) => {
  const { student_id, votes } = req.body; // votes: Record<position, candidate_id>
  if (!student_id || !votes || typeof votes !== 'object') {
    res.status(400).json({ error: 'Student ID and ballot selections are required.' });
    return;
  }

  if (isSupabaseEnabled && supabase) {
    try {
      // Find student in Supabase
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', student_id);
      
      if (studentError || !students || students.length === 0) {
        res.status(404).json({ error: 'Student session not found. Please log in again.' });
        return;
      }
      
      const student = students[0];
      if (student.has_voted) {
        res.status(403).json({ error: 'Ballor Error: This student identifier has already voted.' });
        return;
      }
      
      // Pre-fetch all candidates in Supabase to validate
      const { data: candidates, error: candError } = await supabase
        .from('candidates')
        .select('*');
        
      if (candError) {
        res.status(500).json({ error: candError.message });
        return;
      }
      
      // Validate and prepare vote records
      const newVotesPayload = [];
      const entries = Object.entries(votes);
      
      for (const [position, candidateId] of entries) {
        const candidate = candidates?.find((c: any) => c.id === candidateId);
        if (!candidate) {
          res.status(400).json({ error: `Invalid candidate id: ${candidateId} for position: ${position}` });
          return;
        }
        
        newVotesPayload.push({
          id: crypto.randomUUID(),
          student_id: student.id,
          candidate_id: candidate.id,
          position: position,
          status: 'pending'
        });
      }
      
      // Insert votes
      const { error: voteInsertError } = await supabase
        .from('votes')
        .insert(newVotesPayload);
        
      if (voteInsertError) {
        res.status(500).json({ error: voteInsertError.message });
        return;
      }
      
      // Update student voted status
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({ has_voted: true })
        .eq('id', student.id);
        
      if (studentUpdateError) {
        console.error("Failed to update student voted flag inside Supabase:", studentUpdateError.message);
      }
      
      res.json({
        success: true,
        message: 'Your votes were locked into the ballot box with PENDING status! They are awaiting teacher/admin review.',
        voted_at: new Date().toISOString()
      });
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  const studentIndex = db.students.findIndex((s: Student) => s.id === student_id);

  if (studentIndex === -1) {
    res.status(404).json({ error: 'Student session not found. Please log in again.' });
    return;
  }

  const student = db.students[studentIndex];
  if (student.has_voted) {
    res.status(403).json({ error: 'Ballor Error: This student identifier has already voted.' });
    return;
  }

  // Create pending votes for each position
  const newVotes: Vote[] = [];
  const entries = Object.entries(votes);

  for (const [position, candidateId] of entries) {
    const candidate = db.candidates.find((c: Candidate) => c.id === candidateId);
    if (!candidate) {
      res.status(400).json({ error: `Invalid candidate id: ${candidateId} for position: ${position}` });
      return;
    }

    newVotes.push({
      id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      student_id: student.id,
      candidate_id: candidate.id,
      position: position,
      status: 'pending',
      voted_at: new Date().toISOString()
    });
  }

  // Push new votes, update student vote flag
  db.votes.push(...newVotes);
  db.students[studentIndex].has_voted = true;

  saveDb(db);

  res.json({
    success: true,
    message: 'Your votes were locked into the ballot box with PENDING status! They are awaiting teacher/admin review.',
    voted_at: new Date().toISOString()
  });
});

// 6. Admin Login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const db = getDb();
  let admin = db.admins?.find((a: Admin) => a.email.toLowerCase() === email.toLowerCase());

  // Fallback if not found in db array yet
  if (!admin && email.toLowerCase() === 'godson@gmail.com') {
    admin = {
      id: 'admin-super-id',
      email: 'godson@gmail.com',
      role: 'super_admin'
    };
  }

  if (admin && password === 'dhwaragandhwaragan@2009') {
    res.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid administrator email or master password.' });
  }
});

// 7. Admin View Votes List
// 7. Admin View Votes List
app.get('/api/admin/ballots', async (req, res) => {
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select(`
          id,
          position,
          status,
          voted_at,
          admin_approved_at,
          student_id,
          students (
            id,
            name,
            class_section,
            unique_identifier
          ),
          candidate_id,
          candidates (
            id,
            name
          )
        `);
        
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      
      const ballots = (data || []).map((vote: any) => {
        const student = vote.students;
        const candidate = vote.candidates;
        
        return {
          vote_id: vote.id,
          student_id: vote.student_id,
          student_name: student ? student.name : 'Unknown',
          student_class: student ? student.class_section : 'Unknown',
          student_uid: student ? student.unique_identifier : 'Unknown',
          candidate_id: vote.candidate_id,
          candidate_name: candidate ? candidate.name : 'Unknown Candidate',
          position: vote.position,
          status: vote.status,
          voted_at: vote.voted_at,
          admin_approved_at: vote.admin_approved_at
        };
      });
      
      res.json(ballots);
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();

  // Combine details for comprehensive admin audit UI
  const ballots = db.votes.map((vote: Vote) => {
    const student = db.students.find((s: Student) => s.id === vote.student_id);
    const candidate = db.candidates.find((c: Candidate) => c.id === vote.candidate_id);

    return {
      vote_id: vote.id,
      student_id: vote.student_id,
      student_name: student ? student.name : 'Unknown',
      student_class: student ? student.class_section : 'Unknown',
      student_uid: student ? student.unique_identifier : 'Unknown',
      candidate_id: vote.candidate_id,
      candidate_name: candidate ? candidate.name : 'Unknown Candidate',
      position: vote.position,
      status: vote.status,
      voted_at: vote.voted_at,
      admin_approved_at: vote.admin_approved_at
    };
  });

  res.json(ballots);
});

// 8. Admin Approve / Reject ballot items
app.post('/api/admin/ballots/status', async (req, res) => {
  const { vote_ids, status, admin_id } = req.body; // status: 'approved' | 'rejected'
  if (!vote_ids || !Array.isArray(vote_ids) || !status) {
    res.status(400).json({ error: 'List of vote IDs and target status are required.' });
    return;
  }

  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
    return;
  }

  if (isSupabaseEnabled && supabase) {
    try {
      // Validate or map admin_id for Supabase UUID type safety
      const isUuidReg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const safeAdminId = (admin_id && isUuidReg.test(admin_id)) ? admin_id : null;

      // Update votes in Supabase
      const { data: updatedVotes, error: updateError } = await supabase
        .from('votes')
        .update({
          status: status,
          admin_approved_at: new Date().toISOString(),
          admin_id: safeAdminId
        })
        .in('id', vote_ids)
        .select('student_id');
        
      if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
      }
      
      const updatedCount = updatedVotes ? updatedVotes.length : 0;
      
      if (status === 'rejected' && updatedVotes && updatedVotes.length > 0) {
        const studentIdsToReset = Array.from(new Set(updatedVotes.map((v: any) => v.student_id).filter(Boolean)));
        if (studentIdsToReset.length > 0) {
          const { error: resetError } = await supabase
            .from('students')
            .update({ has_voted: false })
            .in('id', studentIdsToReset);
          if (resetError) {
            console.error("Failed to reset student voted flag in Supabase:", resetError.message);
          }
        }
      }
      
      res.json({ success: true, updatedCount, status });
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  let updatedCount = 0;
  const targetStudentIds = new Set<string>();

  db.votes = db.votes.map((vote: Vote) => {
    if (vote_ids.includes(vote.id)) {
      updatedCount++;
      if (vote.student_id) {
        targetStudentIds.add(vote.student_id);
      }
      return {
        ...vote,
        status: status,
        admin_approved_at: new Date().toISOString(),
        admin_id: admin_id || 'admin-super-id'
      };
    }
    return vote;
  });

  if (status === 'rejected') {
    db.students = db.students.map((student: Student) => {
      if (targetStudentIds.has(student.id)) {
        return {
          ...student,
          has_voted: false
        };
      }
      return student;
    });
  }

  saveDb(db);
  res.json({ success: true, updatedCount, status });
});

// 9. Election Results Dashboard
app.get('/api/results', async (req, res) => {
  if (isSupabaseEnabled && supabase) {
    try {
      // 1. Fetch Candidates
      const { data: candidates, error: candError } = await supabase.from('candidates').select('*');
      if (candError) {
        res.status(500).json({ error: candError.message });
        return;
      }
      
      // 2. Fetch Students for mapping student_id -> class_section
      const { data: students, error: studentError } = await supabase.from('students').select('id, class_section');
      if (studentError) {
        res.status(500).json({ error: studentError.message });
        return;
      }
      
      const studentClassMap: Record<string, string> = {};
      (students || []).forEach((s: any) => {
        studentClassMap[s.id] = s.class_section;
      });
      
      // 3. Fetch approved votes
      const { data: approvedVotes, error: voteError } = await supabase
        .from('votes')
        .select('*')
        .eq('status', 'approved');
        
      if (voteError) {
        res.status(500).json({ error: voteError.message });
        return;
      }
      
      // Group votes by position
      const positions = Array.from(new Set(candidates.map((c: any) => c.position))) as string[];
      const targetClass = req.query.class_section as string;
      
      const results: ElectionResults[] = positions.map(pos => {
        // Candidates in this position
        const candidatesInPos = candidates.filter((c: any) => c.position === pos);
        
        // Approved votes for this position
        let approvedPosVotes = (approvedVotes || []).filter((v: any) => v.position === pos);
        
        if (targetClass && targetClass !== 'all') {
          approvedPosVotes = approvedPosVotes.filter((v: any) => {
            const studentClass = studentClassMap[v.student_id];
            return studentClass && studentClass.toLowerCase() === targetClass.toLowerCase();
          });
        }
        
        const totalApprovedVotes = approvedPosVotes.length;
        
        const candidateDetails = candidatesInPos.map(cand => {
          const voteCount = approvedPosVotes.filter(v => v.candidate_id === cand.id).length;
          return {
            candidateId: cand.id,
            candidateName: cand.name,
            classSection: cand.class_section,
            votes: voteCount,
            pct: totalApprovedVotes > 0 ? Math.round((voteCount / totalApprovedVotes) * 100) : 0
          };
        });
        
        // Sort by votes descending to discover winner
        candidateDetails.sort((a, b) => b.votes - a.votes);
        
        let winner = 'No votes yet';
        if (totalApprovedVotes > 0) {
          const topVotes = candidateDetails[0].votes;
          const winners = candidateDetails.filter(c => c.votes === topVotes);
          if (winners.length > 1) {
            winner = `Tie: ${winners.map(w => w.candidateName).join(' & ')} (${topVotes} votes)`;
          } else {
            winner = `${candidateDetails[0].candidateName} (${topVotes} votes)`;
          }
        }
        
        return {
          position: pos,
          candidates: candidateDetails,
          totalApprovedVotes,
          winner
        };
      });
      
      res.json(results);
      return;
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unexpected Supabase error' });
      return;
    }
  }

  const db = getDb();
  
  // Create static mapping for student_id -> class_section
  const studentClassMap: Record<string, string> = {};
  if (db.students) {
    db.students.forEach((s: any) => {
      studentClassMap[s.id] = s.class_section;
    });
  }

  // Group votes by position
  const positions = Array.from(new Set(db.candidates.map((c: Candidate) => c.position))) as string[];
  const targetClass = req.query.class_section as string;
  
  const results: ElectionResults[] = positions.map(pos => {
    // Candidates in this position
    const candidatesInPos = db.candidates.filter((c: Candidate) => c.position === pos);
    
    // Approved votes for this position
    let approvedPosVotes = db.votes.filter((v: Vote) => v.position === pos && v.status === 'approved');
    
    if (targetClass && targetClass !== 'all') {
      approvedPosVotes = approvedPosVotes.filter((v: Vote) => {
        const studentClass = studentClassMap[v.student_id];
        return studentClass && studentClass.toLowerCase() === targetClass.toLowerCase();
      });
    }

    const totalApprovedVotes = approvedPosVotes.length;

    const candidateDetails = candidatesInPos.map(cand => {
      const voteCount = approvedPosVotes.filter(v => v.candidate_id === cand.id).length;
      return {
        candidateId: cand.id,
        candidateName: cand.name,
        classSection: cand.class_section,
        votes: voteCount,
        pct: totalApprovedVotes > 0 ? Math.round((voteCount / totalApprovedVotes) * 100) : 0
      };
    });

    // Sort by votes descending to discover winner
    candidateDetails.sort((a, b) => b.votes - a.votes);

    let winner = 'No votes yet';
    if (totalApprovedVotes > 0) {
      const topVotes = candidateDetails[0].votes;
      // Handle potential ties gracefully
      const winners = candidateDetails.filter(c => c.votes === topVotes);
      if (winners.length > 1) {
        winner = `Tie: ${winners.map(w => w.candidateName).join(' & ')} (${topVotes} votes)`;
      } else {
        winner = `${candidateDetails[0].candidateName} (${topVotes} votes)`;
      }
    }

    return {
      position: pos,
      candidates: candidateDetails,
      totalApprovedVotes,
      winner
    };
  });

  res.json(results);
});


export { app, isSupabaseEnabled };
