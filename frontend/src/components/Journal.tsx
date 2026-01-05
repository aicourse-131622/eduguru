import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Clock, Calendar, Trash2, Edit, Plus, ArrowLeft, CheckCircle, X, AlertCircle, BookOpen, UserCheck, Search, FileText, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEACHING_METHODS } from '../constants';
import { generateReflection, suggestTeachingMethods } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { JournalEntry, ClassGroup } from '../types';

export const Journal: React.FC = () => {
  const [activeView, setActiveView] = useState<'FORM' | 'HISTORY'>('HISTORY');

  // State Form updated with 'date' field defaulting to today
  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split('T')[0],
    classId: '',
    subject: '',
    startTime: '',
    learningObjective: '',
    materials: '',
    method: '',
    activities: '',
    reflection: '',
    engagementLevel: 'Aktif dan Antusias'
  });

  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalJournals: 0,
    teachingHours: 0,
    attendanceRate: 0
  });

  // State Notifikasi
  const [notification, setNotification] = useState<{ show: boolean, message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const fetchedClasses = await storageService.getClasses();
        setClasses(fetchedClasses);

        const fetchedSubjects = await storageService.getSubjects();
        setSubjects(fetchedSubjects);

        await loadHistory();
      } catch (error) {
        console.error("Failed to load initial data:", error);
        showNotification("Gagal memuat data awal", 'error');
      }
    };
    initData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterClass, searchQuery]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadHistory = async () => {
    const journals = await storageService.getJournals();
    // Sort by date descending
    journals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistory(journals);
    calculateStats(journals);
  };

  const calculateStats = async (journals: JournalEntry[]) => {
    // 1. Total Journals
    const totalJournals = journals.length;

    // 2. Teaching Hours (This Week)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const settingsEndOfWeek = new Date(startOfWeek);
    settingsEndOfWeek.setDate(startOfWeek.getDate() + 6);
    settingsEndOfWeek.setHours(23, 59, 59, 999);

    const thisWeekJournals = journals.filter(j => {
      const jDate = new Date(j.date);
      return jDate >= startOfWeek && jDate <= settingsEndOfWeek;
    });

    let teachingHours = 0;
    thisWeekJournals.forEach(j => {
      if (!j.startTime) return;
      // Logic to extract numbers. e.g. "1-2" => 2 hours. "1" => 1 hour. "1-3" => 3 hours.
      const nums = j.startTime.match(/\d+/g)?.map(Number);
      if (nums && nums.length > 0) {
        if (j.startTime.includes('-') && nums.length >= 2) {
          const min = Math.min(...nums);
          const max = Math.max(...nums);
          teachingHours += (max - min) + 1;
        } else {
          teachingHours += nums.length;
        }
      }
    });

    // 3. Attendance Rate from Attendance Records
    let attendanceRate = 0;
    try {
      const allAttendance = await storageService.getAllAttendanceRecords();
      if (allAttendance.length > 0) {
        // Count 'H' (Hadir) as present
        const presentCount = allAttendance.filter(r => r.status === 'H').length;
        attendanceRate = Math.round((presentCount / allAttendance.length) * 100);
      }
    } catch (e) {
      console.error("Error calculating attendance stats", e);
    }

    setStats({
      totalJournals,
      teachingHours,
      attendanceRate
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateReflection = async () => {
    if (!formData.learningObjective || !formData.activities) {
      showNotification("Mohon isi Tujuan Pembelajaran dan Kegiatan terlebih dahulu.", 'error');
      return;
    }
    setIsGenerating(true);
    const result = await generateReflection(formData.learningObjective, formData.activities, formData.engagementLevel || 'Aktif');
    setFormData(prev => ({ ...prev, reflection: result }));
    setIsGenerating(false);
  };

  const handleSuggestMethods = async () => {
    if (!formData.materials) return;
    setIsGenerating(true);
    const result = await suggestTeachingMethods(formData.materials, "SMA");
    if (result) {
      setFormData(prev => ({ ...prev, activities: (prev.activities || '') + '\n\nSaran AI:\n' + result }));
    }
    setIsGenerating(false);
  }

  const handleSave = async () => {
    if (!formData.classId || !formData.subject || !formData.date) {
      showNotification('Mohon lengkapi Tanggal, Kelas, dan Mata Pelajaran', 'error');
      return;
    }

    try {
      const entry: JournalEntry = {
        id: formData.id || Date.now().toString(),
        createdAt: formData.createdAt || Date.now(),
        date: formData.date,
        classId: formData.classId,
        subject: formData.subject,
        startTime: formData.startTime || '',
        learningObjective: formData.learningObjective || '',
        materials: formData.materials || '',
        method: formData.method || '',
        activities: formData.activities || '',
        reflection: formData.reflection || '',
        engagementLevel: formData.engagementLevel
      };

      // Tunggu sampai selesai disimpan
      await storageService.saveJournal(entry);

      // Tampilkan notifikasi sukses
      const isEditing = !!formData.id;
      showNotification(isEditing ? 'Jurnal berhasil diperbarui!' : 'Jurnal berhasil disimpan!', 'success');

      // Reset Form (keep date as today for convenience)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        classId: '',
        subject: '',
        startTime: '',
        learningObjective: '',
        materials: '',
        method: '',
        activities: '',
        reflection: '',
        engagementLevel: 'Aktif dan Antusias'
      });

      // Reload history setelah save selesai
      await loadHistory();
      setActiveView('HISTORY');
    } catch (error) {
      console.error('Failed to save journal:', error);
      showNotification('Gagal menyimpan jurnal. Silakan coba lagi.', 'error');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setFormData(entry);
    setActiveView('FORM');
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus jurnal ini?')) {
      storageService.deleteJournal(id);
      loadHistory();
      showNotification('Jurnal berhasil dihapus', 'success');
    }
  };

  const currentClassName = (id: string) => classes.find(c => c.id === id)?.name || id;

  // Filtering
  const filteredHistory = history.filter(item => {
    const matchMonth = item.date.startsWith(filterMonth);
    const matchClass = filterClass ? item.classId === filterClass : true;
    const matchSearch = searchQuery.toLowerCase() === '' ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.materials.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reflection && item.reflection.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchMonth && matchClass && matchSearch;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 relative">

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-[slideIn_0.3s_ease-out] md:right-8">
          <div className={`${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4`}>
            <div className="p-2 bg-white/20 rounded-full">
              {notification.type === 'error' ? <AlertCircle size={24} className="text-white" /> : <CheckCircle size={24} className="text-white" />}
            </div>
            <div>
              <h4 className="font-bold text-sm">{notification.type === 'error' ? 'Perhatian' : 'Berhasil!'}</h4>
              <p className="text-xs text-white/90">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-white/70 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">eJurnal Mengajar</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Rekap kegiatan belajar mengajar</p>
        </div>

        {/* Action Button */}
        <div>
          {activeView === 'HISTORY' ? (
            <button
              onClick={() => {
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  classId: '',
                  subject: '',
                  startTime: '',
                  learningObjective: '',
                  materials: '',
                  method: '',
                  activities: '',
                  reflection: '',
                  engagementLevel: 'Aktif dan Antusias'
                });
                setActiveView('FORM');
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/30 flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Buat Jurnal
            </button>
          ) : (
            <button
              onClick={() => setActiveView('HISTORY')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition"
            >
              <ArrowLeft size={18} />
              Kembali
            </button>
          )}
        </div>
      </div>

      {activeView === 'HISTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Jurnal */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start">
            <div>
              <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Jurnal</h4>
              <span className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalJournals}</span>
              <p className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1">
                +12% bulan ini
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
              <FileText size={24} />
            </div>
          </div>

          {/* Card 2: Jam Mengajar */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start">
            <div>
              <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Jam Mengajar</h4>
              <span className="text-3xl font-bold text-gray-800 dark:text-white">{stats.teachingHours} Jam</span>
              <p className="text-xs text-gray-500 mt-2">Minggu ini</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
              <Clock size={24} />
            </div>
          </div>

          {/* Card 3: Kehadiran Siswa */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start">
            <div>
              <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Kehadiran Siswa</h4>
              <span className="text-3xl font-bold text-gray-800 dark:text-white">{stats.attendanceRate}%</span>
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                {stats.attendanceRate >= 90 ? 'Sangat Baik' : stats.attendanceRate >= 75 ? 'Cukup Baik' : 'Perlu Ditingkatkan'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
              <Users size={24} />
            </div>
          </div>
        </div>
      )}

      {activeView === 'FORM' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in">
          {/* Form Content */}
          <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Form Jurnal Mengajar</h3>
          </div>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

            {/* Row 1: Tanggal & Jam Ke (Waktu) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jam Ke</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    name="startTime"
                    type="text"
                    value={formData.startTime}
                    onChange={handleChange}
                    placeholder="Contoh: 1-2"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Kelas & Mapel (Konteks) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kelas</label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                >
                  <option value="">Pilih Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mata Pelajaran</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                >
                  <option value="">Pilih Mapel</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Metode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Metode Pembelajaran</label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-3 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Pilih Metode</option>
                {TEACHING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Main Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tujuan Pembelajaran</label>
              <textarea
                name="learningObjective"
                value={formData.learningObjective}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-3 focus:ring-2 focus:ring-primary-500"
                placeholder="Peserta didik mampu..."
              ></textarea>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Materi Pokok</label>
                <button
                  type="button"
                  onClick={handleSuggestMethods}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  disabled={!formData.materials || isGenerating}
                >
                  <Sparkles size={12} /> Ide Kegiatan AI
                </button>
              </div>
              <input
                type="text"
                name="materials"
                value={formData.materials}
                onChange={handleChange}
                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-3 focus:ring-2 focus:ring-primary-500"
                placeholder="Judul Materi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kegiatan Pembelajaran</label>
              <textarea
                name="activities"
                value={formData.activities}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-3 focus:ring-2 focus:ring-primary-500"
                placeholder="Deskripsi singkat kegiatan..."
              ></textarea>
            </div>

            {/* Reflection Section with AI */}
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-primary-900 dark:text-primary-200">Refleksi Guru</label>
                <button
                  type="button"
                  onClick={handleGenerateReflection}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-primary-800 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-semibold shadow-sm hover:shadow transition disabled:opacity-50"
                >
                  <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
                  {isGenerating ? 'Sedang Berpikir...' : 'Bantu Buat Refleksi'}
                </button>
              </div>

              {/* Context for AI */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Keterlibatan Siswa:</span>
                <select
                  name="engagementLevel"
                  value={formData.engagementLevel}
                  onChange={handleChange}
                  className="text-xs rounded-lg border-gray-200 dark:border-gray-600 p-1 dark:bg-gray-800 dark:text-white"
                >
                  <option>Sangat Aktif</option>
                  <option>Aktif dan Antusias</option>
                  <option>Cukup Aktif</option>
                  <option>Kurang Aktif</option>
                  <option>Pasif</option>
                </select>
              </div>

              <textarea
                name="reflection"
                value={formData.reflection}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white p-3 focus:ring-2 focus:ring-primary-500"
                placeholder="Catatan evaluasi pembelajaran hari ini..."
              ></textarea>
            </div>

            <div className="pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-2 border-t border-gray-100 dark:border-gray-700">
              <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 transition transform active:scale-[0.98]">
                <Save size={20} />
                Simpan Jurnal
              </button>
            </div>

          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">

            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {/* Month Filter */}
              <div className="relative w-full md:w-auto">
                <Calendar className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400" size={18} />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full md:w-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-4 py-2 w-full md:w-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
              >
                <option value="">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari topik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Search size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {history.length === 0 ? "Belum ada riwayat jurnal." : "Tidak ada data yang cocok."}
                </p>
                <p className="text-sm">
                  {history.length === 0 ? 'Klik "Buat Jurnal" untuk mulai mencatat.' : 'Coba ubah filter atau kata kunci pencarian.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
                      <th className="px-6 py-4 font-semibold">Tanggal</th>
                      <th className="px-6 py-4 font-semibold">Jam</th>
                      <th className="px-6 py-4 font-semibold">Kelas</th>
                      <th className="px-6 py-4 font-semibold">Mapel</th>
                      <th className="px-6 py-4 font-semibold">Materi Pokok</th>
                      <th className="px-6 py-4 font-semibold">Kegiatan</th>
                      <th className="px-6 py-4 font-semibold">Refleksi</th>
                      <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200 text-sm">
                          {item.date.split('-').reverse().join('/')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200 text-sm">
                          {item.startTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {currentClassName(item.classId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200 text-sm">
                          {item.subject}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm max-w-[200px] truncate">
                          {item.materials}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm max-w-[200px] truncate">
                          {item.activities}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm max-w-[200px] truncate italic">
                          "{item.reflection}"
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredHistory.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4 px-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredHistory.length)} dari {filteredHistory.length} data
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((number, index) => (
                    <button
                      key={index}
                      onClick={() => typeof number === 'number' ? setCurrentPage(number) : null}
                      disabled={number === '...'}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition
                        ${currentPage === number
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : number === '...'
                            ? 'text-gray-400 cursor-default'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                        }`}
                    >
                      {number}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};