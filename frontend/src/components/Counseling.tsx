import React, { useState, useEffect } from 'react';
import { CounselingType, Student, ClassGroup, CounselingSession } from '../types';
import { storageService } from '../services/storageService';
import { generateFollowUpPlan } from '../services/geminiService';
import { Lock, Search, Calendar, ChevronRight, CheckCircle, X, Save, Sparkles } from 'lucide-react';

export const Counseling: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassGroup[]>([]);

    // State Form
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [counselingType, setCounselingType] = useState<CounselingType>('AKADEMIK');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // State Notifikasi
    const [notification, setNotification] = useState<{ show: boolean, message: string } | null>(null);

    useEffect(() => {
        const initData = async () => {
            try {
                const std = await storageService.getStudents();
                setStudents(std);
                const cls = await storageService.getClasses();
                setClasses(cls);
            } catch (error) {
                console.error("Failed to load counseling data:", error);
            }
        };
        initData();
    }, []);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.includes(searchTerm)
    );

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    const handleGenerateRTL = async () => {
        if (!selectedStudent || !notes) {
            setNotification({ show: true, message: 'Isi catatan konseling terlebih dahulu untuk generate RTL.' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        setIsGenerating(true);
        const result = await generateFollowUpPlan(selectedStudent.name, counselingType, notes);
        if (result) {
            setFollowUp(result);
        }
        setIsGenerating(false);
    };

    const handleSave = () => {
        if (!selectedStudentId) return;

        const newSession: CounselingSession = {
            id: Date.now().toString(),
            studentId: selectedStudentId,
            date: date,
            type: counselingType,
            notes: notes,
            followUp: followUp,
            isPrivate: isPrivate
        };

        storageService.saveCounselingSession(newSession);

        // Reset Form
        setNotes('');
        setFollowUp('');

        // Show Notification
        setNotification({ show: true, message: 'Data konseling berhasil dicatat!' });
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <div className="space-y-6 relative">
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-20 right-4 z-50 animate-[slideIn_0.3s_ease-out] md:right-8">
                    <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
                        <div className="p-2 bg-white/20 rounded-full">
                            <CheckCircle size={24} className="text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">Berhasil!</h4>
                            <p className="text-xs text-emerald-100">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-2 text-emerald-200 hover:text-white transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">eKonseling</h2>
                <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    <Lock size={12} />
                    Privasi Terjamin
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Student Selector (Left Column) */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari Siswa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                        {filteredStudents.map(student => (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`w-full text-left p-3 rounded-xl flex items-center justify-between mb-1 transition ${selectedStudentId === student.id
                                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${selectedStudentId === student.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>{student.name}</p>
                                        <p className="text-xs text-gray-500">{classes.find(c => c.id === student.classId)?.name || 'Unknown Class'}</p>
                                    </div>
                                </div>
                                {selectedStudentId === student.id && <ChevronRight size={16} className="text-primary-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form (Right Column) */}
                <div className="lg:col-span-2">
                    {selectedStudent ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-bold text-primary-600 dark:text-primary-300">
                                    {selectedStudent.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold dark:text-white">{selectedStudent.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400">NIS: {selectedStudent.nis} • {classes.find(c => c.id === selectedStudent.classId)?.name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal Konseling</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jenis Masalah</label>
                                    <select
                                        value={counselingType}
                                        onChange={(e) => setCounselingType(e.target.value as CounselingType)}
                                        className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="AKADEMIK">Akademik (Nilai/Belajar)</option>
                                        <option value="PERILAKU">Perilaku (Kedisiplinan)</option>
                                        <option value="PRIBADI">Pribadi</option>
                                        <option value="SOSIAL">Sosial (Teman/Bullying)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catatan Konseling</label>
                                <textarea
                                    rows={4}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    placeholder="Deskripsikan permasalahan dan hasil diskusi..."
                                ></textarea>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rencana Tindak Lanjut</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateRTL}
                                        disabled={isGenerating || !notes}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-semibold shadow-sm hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles size={12} className={isGenerating ? "animate-spin" : ""} />
                                        {isGenerating ? 'Sedang Membuat...' : 'Bantu Buat RTL'}
                                    </button>
                                </div>
                                <textarea
                                    rows={3}
                                    value={followUp}
                                    onChange={(e) => setFollowUp(e.target.value)}
                                    className="w-full p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    placeholder="Apa yang akan dilakukan selanjutnya?"
                                ></textarea>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="private"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="private" className="text-sm text-gray-600 dark:text-gray-300 select-none">Tandai sebagai rahasia (Hanya Guru BK)</label>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2 active:scale-[0.98]"
                                >
                                    <Save size={18} />
                                    Simpan Data
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Pilih siswa dari daftar di samping untuk memulai konseling.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};