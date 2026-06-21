export interface Candidate {
  id: string;
  position: string;
  name: string;
  class_section: string;
  image_url?: string;
}

export interface Student {
  id: string;
  name: string;
  class_section: string;
  unique_identifier: string; // e.g. Student ID
  has_voted: boolean;
  created_at: string;
}

export interface Vote {
  id: string;
  student_id: string;
  candidate_id: string;
  position: string;
  status: 'pending' | 'approved' | 'rejected';
  voted_at: string;
  admin_approved_at?: string;
  admin_id?: string;
}

export interface Admin {
  id: string;
  email: string;
  role: string;
}

export interface ElectionResults {
  position: string;
  candidates: {
    candidateId: string;
    candidateName: string;
    classSection: string;
    votes: number;
    pct: number;
  }[];
  totalApprovedVotes: number;
  winner?: string;
}
