export type Role = 'GURU' | 'WALI_KELAS' | 'BK' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  avatar?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatar?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface Student {
  id: string;
  name: string;
  nis: string;
  classId: string;
  userId?: string; // Owner
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: number;
  userId?: string; // Owner
}

export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface AttendanceRecord {
  id: string; // Composite key updated: date_classId_subject_studentId
  studentId: string;
  classId: string;
  subject: string; // Added Subject field
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  userId?: string; // Owner
}

export interface JournalEntry {
  id: string;
  date: string;
  createdAt: number;
  classId: string;
  subject: string;
  startTime: string; // Jam Ke
  learningObjective: string; // Tujuan Pembelajaran
  materials: string; // Materi
  method: string; // Metode
  activities: string; // Kegiatan
  reflection: string; // Refleksi
  engagementLevel?: string;
  userId?: string; // Owner
}

export type AssessmentType = 'FORMATIVE' | 'SUMMATIVE' | 'STS' | 'SAS' | 'PORTFOLIO' | 'NOTE';

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  classId: string;
  subject: string;
  date: string;
  maxScore: number;
  userId?: string; // Owner
}

export interface StudentScore {
  id: string;
  classId: string;
  subject: string;
  type: AssessmentType;
  studentId: string;
  score: number;
  notes?: string;
  assessmentTitle?: string; // Judul Penilaian (misal: PH 1, Tugas 2)
  date: string;
  userId?: string; // Owner
}

export type CounselingType = 'AKADEMIK' | 'PERILAKU' | 'PRIBADI' | 'SOSIAL';

export interface CounselingSession {
  id: string;
  studentId: string;
  date: string;
  type: CounselingType;
  notes: string;
  followUp: string;
  isPrivate: boolean;
  userId?: string; // Owner
}