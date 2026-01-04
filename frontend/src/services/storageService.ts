/**
 * Storage Service for EduGuru
 * Hybrid approach: Uses API for persistent storage, localStorage for caching
 */

import { JournalEntry, AttendanceRecord, StudentScore, CounselingSession, AttendanceStatus, User, Student, ClassGroup, UpdateProfilePayload } from '../types';
import { STUDENTS as DEFAULT_STUDENTS, CLASSES as DEFAULT_CLASSES, SUBJECTS as DEFAULT_SUBJECTS } from '../constants';
import {
  authApi,
  classesApi,
  studentsApi,
  subjectsApi,
  journalsApi,
  attendanceApi,
  scoresApi,
  counselingApi,
  dashboardApi,
  setToken
} from './apiService';

// Keys untuk LocalStorage (for caching and offline support)
const STORAGE_KEYS = {
  USER: 'eduguru_user',
  TOKEN: 'eduguru_token',
  // Cache keys
  CACHE_STUDENTS: 'eduguru_cache_students',
  CACHE_CLASSES: 'eduguru_cache_classes',
  CACHE_SUBJECTS: 'eduguru_cache_subjects',
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const setCache = <T>(key: string, data: T) => {
  const item: CacheItem<T> = { data, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(item));
};

const getCache = <T>(key: string): T | null => {
  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    const parsed: CacheItem<T> = JSON.parse(item);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const clearCache = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    if (key.startsWith('eduguru_cache_')) {
      localStorage.removeItem(key);
    }
  });
};

export const storageService = {
  // ========== USER & AUTH ==========
  saveUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  getToken: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  saveToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    setToken(token);
  },

  updateUser: async (updates: UpdateProfilePayload): Promise<User | null> => {
    try {
      const updated = await authApi.updateProfile(updates);
      storageService.saveUser(updated);
      return updated;
    } catch (error) {
      console.error('Failed to update user:', error);
      // Fallback to local update (only for non-password fields)
      const currentUser = storageService.getUser();
      if (currentUser) {
        const { currentPassword, newPassword, ...profileUpdates } = updates;
        const updatedUser = { ...currentUser, ...profileUpdates };
        storageService.saveUser(updatedUser);
        return updatedUser;
      }
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    setToken(null);
    clearCache();
  },

  // ========== CLASSES ==========
  getClasses: async (): Promise<ClassGroup[]> => {
    const user = storageService.getUser();
    if (!user) return [];

    // Check cache first
    const cached = getCache<ClassGroup[]>(STORAGE_KEYS.CACHE_CLASSES);
    if (cached) return cached;

    try {
      const apiData = await classesApi.getAll();
      // FIX: Ensure data is an array
      const classes = Array.isArray(apiData) ? apiData : [];

      setCache(STORAGE_KEYS.CACHE_CLASSES, classes);
      return classes;
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      // Return default for demo mode
      return DEFAULT_CLASSES.map(c => ({ ...c, userId: user.id }));
    }
  },

  getClassesSync: (): ClassGroup[] => {
    const cached = getCache<ClassGroup[]>(STORAGE_KEYS.CACHE_CLASSES);
    if (cached) return cached;

    const user = storageService.getUser();
    return DEFAULT_CLASSES.map(c => ({ ...c, userId: user?.id }));
  },

  saveClass: async (classData: { name: string; grade: number; id?: string }) => {
    try {
      if (classData.id) {
        await classesApi.update(classData.id, { name: classData.name, grade: classData.grade });
      } else {
        await classesApi.create({ name: classData.name, grade: classData.grade });
      }
      localStorage.removeItem(STORAGE_KEYS.CACHE_CLASSES);
    } catch (error) {
      console.error('Failed to save class:', error);
      throw error;
    }
  },

  deleteClass: async (id: string) => {
    try {
      await classesApi.delete(id);
      localStorage.removeItem(STORAGE_KEYS.CACHE_CLASSES);
    } catch (error) {
      console.error('Failed to delete class:', error);
      throw error;
    }
  },

  deleteAllClasses: async () => {
    try {
      await classesApi.deleteAll();
      localStorage.removeItem(STORAGE_KEYS.CACHE_CLASSES);
    } catch (error) {
      console.error('Failed to delete all classes:', error);
      throw error;
    }
  },

  saveClassesBulk: async (classes: ClassGroup[]) => {
    // This will sync to server via API bulk endpoint
    await classesApi.bulkCreate(classes);
    localStorage.removeItem(STORAGE_KEYS.CACHE_CLASSES);
  },

  // ========== STUDENTS ==========
  getStudents: async (): Promise<Student[]> => {
    const user = storageService.getUser();
    if (!user) return [];

    const cached = getCache<Student[]>(STORAGE_KEYS.CACHE_STUDENTS);
    if (cached) return cached;

    try {
      const apiData = await studentsApi.getAll();
      // FIX: Ensure array
      const students = Array.isArray(apiData) ? apiData : [];

      setCache(STORAGE_KEYS.CACHE_STUDENTS, students);
      return students;
    } catch (error) {
      console.error('Failed to fetch students:', error);
      return DEFAULT_STUDENTS.map(s => ({ ...s, userId: user.id }));
    }
  },

  getStudentsSync: (): Student[] => {
    const cached = getCache<Student[]>(STORAGE_KEYS.CACHE_STUDENTS);
    if (cached) return cached;

    const user = storageService.getUser();
    return DEFAULT_STUDENTS.map(s => ({ ...s, userId: user?.id }));
  },

  saveStudent: async (student: { name: string; nis: string; classId: string; id?: string }) => {
    try {
      if (student.id) {
        await studentsApi.update(student.id, { name: student.name, nis: student.nis, classId: student.classId });
      } else {
        await studentsApi.create({ name: student.name, nis: student.nis, classId: student.classId });
      }
      localStorage.removeItem(STORAGE_KEYS.CACHE_STUDENTS);
    } catch (error) {
      console.error('Failed to save student:', error);
      throw error;
    }
  },

  deleteStudent: async (id: string) => {
    try {
      await studentsApi.delete(id);
      localStorage.removeItem(STORAGE_KEYS.CACHE_STUDENTS);
    } catch (error) {
      console.error('Failed to delete student:', error);
      throw error;
    }
  },

  deleteAllStudents: async () => {
    try {
      await studentsApi.deleteAll();
      localStorage.removeItem(STORAGE_KEYS.CACHE_STUDENTS);
    } catch (error) {
      console.error('Failed to delete all students:', error);
      throw error;
    }
  },

  saveStudentsBulk: async (students: Student[]) => {
    try {
      await studentsApi.bulkCreate(students);
      localStorage.removeItem(STORAGE_KEYS.CACHE_STUDENTS);
    } catch (error) {
      console.error('Failed to bulk save students:', error);
      throw error;
    }
  },

  // ========== SUBJECTS ==========
  getSubjects: async (): Promise<string[]> => {
    const user = storageService.getUser();
    if (!user) return DEFAULT_SUBJECTS;

    const cached = getCache<string[]>(STORAGE_KEYS.CACHE_SUBJECTS);
    if (cached) return cached;

    try {
      const apiData = await subjectsApi.getAll();
      const subjects = Array.isArray(apiData) ? apiData : [];

      // If empty, return empty (don't fallback to defaults)
      setCache(STORAGE_KEYS.CACHE_SUBJECTS, subjects);
      return subjects;
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      return [];
    }
  },

  getSubjectsSync: (): string[] => {
    const cached = getCache<string[]>(STORAGE_KEYS.CACHE_SUBJECTS);
    return cached || [];
  },

  saveSubject: async (name: string) => {
    try {
      await subjectsApi.create(name);
      localStorage.removeItem(STORAGE_KEYS.CACHE_SUBJECTS);
    } catch (error) {
      console.error('Failed to save subject:', error);
      throw error;
    }
  },

  deleteSubject: async (name: string) => {
    try {
      await subjectsApi.delete(name);
      localStorage.removeItem(STORAGE_KEYS.CACHE_SUBJECTS);
    } catch (error) {
      console.error('Failed to delete subject:', error);
      throw error;
    }
  },

  deleteAllSubjects: async () => {
    try {
      await subjectsApi.deleteAll();
      localStorage.removeItem(STORAGE_KEYS.CACHE_SUBJECTS);
    } catch (error) {
      console.error('Failed to delete all subjects:', error);
      throw error;
    }
  },

  saveSubjectsBulk: async (subjects: string[]) => {
    try {
      await subjectsApi.bulkCreate(subjects);
      localStorage.removeItem(STORAGE_KEYS.CACHE_SUBJECTS);
    } catch (error) {
      console.error('Failed to save subjects:', error);
      throw error;
    }
  },

  // ========== JOURNALS ==========
  getJournals: async (): Promise<JournalEntry[]> => {
    const user = storageService.getUser();
    if (!user) return [];

    try {
      const apiData = await journalsApi.getAll();
      return Array.isArray(apiData) ? apiData : [];
    } catch (error) {
      console.error('Failed to fetch journals:', error);
      return [];
    }
  },

  saveJournal: async (entry: JournalEntry): Promise<JournalEntry> => {
    const user = storageService.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const entryWithUser = { ...entry, userId: user.id };
      await journalsApi.create(entryWithUser);
      return entryWithUser;
    } catch (error) {
      console.error('Failed to save journal:', error);
      throw error;
    }
  },

  deleteJournal: async (id: string) => {
    try {
      await journalsApi.delete(id);
    } catch (error) {
      console.error('Failed to delete journal:', error);
      throw error;
    }
  },

  // ========== ATTENDANCE ==========
  getAttendance: async (classId: string, date: string, subject: string): Promise<Record<string, AttendanceStatus>> => {
    const user = storageService.getUser();
    if (!user) return {};

    try {
      const apiData = await attendanceApi.getAll({ classId, date, subject });
      const records = Array.isArray(apiData) ? apiData : [];

      const map: Record<string, AttendanceStatus> = {};

      // Get students for this class
      const students = await storageService.getStudents();
      const classStudents = students.filter(s => s.classId === classId);

      classStudents.forEach(s => {
        const record = records.find(r => r.studentId === s.id);
        map[s.id] = record ? record.status : 'H';
      });

      return map;
    } catch (error) {
      console.error('Failed to get attendance:', error);
      return {};
    }
  },

  getAllAttendanceRecords: async (): Promise<AttendanceRecord[]> => {
    const user = storageService.getUser();
    if (!user) return [];

    try {
      const apiData = await attendanceApi.getAll();
      return Array.isArray(apiData) ? apiData : [];
    } catch (error) {
      console.error('Failed to get attendance records:', error);
      return [];
    }
  },

  saveAttendanceBulk: async (classId: string, date: string, subject: string, statusMap: Record<string, AttendanceStatus>) => {
    const user = storageService.getUser();
    if (!user) return;

    const records = Object.entries(statusMap).map(([studentId, status]) => ({
      id: `${date}_${classId}_${subject}_${studentId}`,
      studentId,
      classId,
      subject,
      date,
      status,
      userId: user.id
    }));

    try {
      await attendanceApi.bulkSave(records);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      throw error;
    }
  },

  // ========== SCORES ==========
  getScores: async (classId: string, subject: string, type: string, title?: string): Promise<Record<string, number>> => {
    const user = storageService.getUser();
    if (!user) return {};

    try {
      const apiData = await scoresApi.getAll({ classId, subject, type });
      const records = Array.isArray(apiData) ? apiData : [];

      const map: Record<string, number> = {};

      records
        .filter(r => !title || r.assessmentTitle === title)
        .forEach(r => map[r.studentId] = r.score);

      return map;
    } catch (error) {
      console.error('Failed to get scores:', error);
      return {};
    }
  },

  getAllScores: async (): Promise<StudentScore[]> => {
    const user = storageService.getUser();
    if (!user) return [];

    try {
      const apiData = await scoresApi.getAll();
      return Array.isArray(apiData) ? apiData : [];
    } catch (error) {
      console.error('Failed to get all scores:', error);
      return [];
    }
  },

  saveScoresBulk: async (newScores: StudentScore[]) => {
    const user = storageService.getUser();
    if (!user) return;

    const scoresWithUser = newScores.map(s => ({ ...s, userId: user.id }));

    try {
      await scoresApi.bulkSave(scoresWithUser);
    } catch (error) {
      console.error('Failed to save scores:', error);
      throw error;
    }
  },

  // ========== COUNSELING ==========
  getCounselingSessions: async (): Promise<CounselingSession[]> => {
    const user = storageService.getUser();
    if (!user) return [];

    try {
      const apiData = await counselingApi.getAll();
      return Array.isArray(apiData) ? apiData : [];
    } catch (error) {
      console.error('Failed to get counseling sessions:', error);
      return [];
    }
  },

  saveCounselingSession: async (session: CounselingSession) => {
    const user = storageService.getUser();
    if (!user) return;

    const sessionWithUser = { ...session, userId: user.id };

    try {
      await counselingApi.create(sessionWithUser);
    } catch (error) {
      console.error('Failed to save counseling session:', error);
      throw error;
    }
  },

  deleteCounselingSession: async (id: string) => {
    try {
      await counselingApi.delete(id);
    } catch (error) {
      console.error('Failed to delete counseling session:', error);
      throw error;
    }
  },

  // ========== DASHBOARD STATS ==========
  getDashboardStats: async () => {
    try {
      return await dashboardApi.getStats();
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      // Fallback to local calculation
      const journals = await storageService.getJournals();
      const students = await storageService.getStudents();

      const journalThisMonth = journals.filter(j => {
        const d = new Date(j.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      return {
        studentCount: students.length,
        journalCount: journalThisMonth,
        teachingHours: journals.length * 2
      };
    }
  },

  // ========== CLEAR ALL DATA ==========
  clearAllData: () => {
    clearCache();
    // Note: Server-side data should be cleared via API if needed
  },
};