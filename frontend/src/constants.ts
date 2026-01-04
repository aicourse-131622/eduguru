import { ClassGroup, Student } from './types';

export const CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'X IPA 1', grade: 10 },
  { id: 'c2', name: 'X IPS 1', grade: 10 },
  { id: 'c3', name: 'XI IPA 1', grade: 11 },
];

export const STUDENTS: Student[] = [
  { id: 's1', name: 'Ahmad Dahlan', nis: '2023001', classId: 'c1' },
  { id: 's2', name: 'Budi Santoso', nis: '2023002', classId: 'c1' },
  { id: 's3', name: 'Citra Kirana', nis: '2023003', classId: 'c1' },
  { id: 's4', name: 'Dewi Sartika', nis: '2023004', classId: 'c1' },
  { id: 's5', name: 'Eko Prasetyo', nis: '2023005', classId: 'c1' },
  { id: 's6', name: 'Fajar Nugraha', nis: '2023006', classId: 'c2' },
  { id: 's7', name: 'Gita Gutawa', nis: '2023007', classId: 'c2' },
];

export const SUBJECTS: string[] = [];

export const TEACHING_METHODS = [
  'Ceramah',
  'Diskusi Kelompok',
  'Project Based Learning',
  'Problem Based Learning',
  'Discovery Learning',
  'Demonstrasi',
];
