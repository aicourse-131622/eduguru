import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, TrendingUp, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { exportService } from '../services/exportService';
import { storageService } from '../services/storageService';
import { ClassGroup, Student } from '../types';

export const Reports: React.FC = () => {
    // --- Common Data ---
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);

    // --- Global Report Filters (Jurnal, Leger, Konseling) ---
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [reportSemester, setReportSemester] = useState<'ODD' | 'EVEN'>(new Date().getMonth() >= 6 ? 'ODD' : 'EVEN');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

    // --- Chart Filters (Analisis Perkembangan) ---
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const cls = await storageService.getClasses();
                const sub = await storageService.getSubjects();
                const std = await storageService.getStudents();

                setClasses(cls);
                if (cls.length > 0) {
                    setSelectedClass(cls[0].id);
                }

                setSubjects(sub);
                if (sub.length > 0) {
                    setSelectedSubject(sub[0]);
                }

                setStudents(std);
            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };

        loadInitialData();
    }, []);

    // --- CHART LOGIC ---
    const studentsInClass = students.filter(s => s.classId === selectedClass);

    // Auto select first student for chart when class changes
    useEffect(() => {
        if (studentsInClass.length > 0) {
            setSelectedStudentId(studentsInClass[0].id);
        } else {
            setSelectedStudentId('');
        }
    }, [selectedClass, students]);

    // Prepare Chart Data
    useEffect(() => {
        if (!selectedStudentId) {
            setChartData([]);
            return;
        }

        const fetchChartData = async () => {
            try {
                const allScores = await storageService.getAllScores();

                // Filter nilai berdasarkan siswa dan mapel
                const filteredScores = allScores
                    .filter(s => s.studentId === selectedStudentId && s.subject === selectedSubject)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const formatted = filteredScores.map(s => ({
                    date: new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    nilai: s.score,
                    type: s.type
                }));

                setChartData(formatted);
            } catch (error) {
                console.error("Failed to fetch chart data", error);
            }
        };

        fetchChartData();
    }, [selectedStudentId, selectedSubject]);


    const handleExport = async (type: string, format: 'pdf' | 'excel' | 'word') => {
        try {
            switch (type) {
                case 'journal':
                    if (format === 'pdf') await exportService.journal.toPDF(reportYear, selectedMonths, reportSemester);
                    else if (format === 'excel') await exportService.journal.toExcel(reportYear, selectedMonths, reportSemester);
                    else if (format === 'word') await exportService.journal.toDocx(reportYear, selectedMonths, reportSemester);
                    break;
                case 'counseling':
                    if (format === 'pdf') await exportService.counseling.toPDF(reportYear, selectedMonths, reportSemester);
                    else if (format === 'excel') await exportService.counseling.toExcel(reportYear, selectedMonths, reportSemester);
                    else if (format === 'word') await exportService.counseling.toDocx(reportYear, selectedMonths, reportSemester);
                    break;
                default:
                    alert('Tipe laporan belum didukung');
            }
        } catch (error) {
            console.error(error);
            alert('Gagal mengunduh laporan. Pastikan data tersedia.');
        }
    };

    const reportTypes = [
        { id: 'journal', title: 'Laporan Jurnal Mengajar', desc: 'Rekap aktivitas harian guru', color: 'bg-emerald-500' },
        // Attendance removed
        { id: 'counseling', title: 'Laporan Bimbingan Konseling', desc: 'Statistik kasus siswa', color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-8">
            {/* Bagian Export File */}
            <div>
                <h2 className="text-2xl font-bold dark:text-white mb-6">Laporan & Arsip</h2>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <Filter size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="w-full">
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                <b>Filter Laporan:</b> Gunakan filter di bawah ini untuk mengatur periode pada <b>Jurnal Mengajar</b> dan <b>Bimbingan Konseling</b>.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase mb-1">Tahun</label>
                                    <select
                                        value={reportYear}
                                        onChange={(e) => setReportYear(parseInt(e.target.value))}
                                        className="w-full p-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 font-bold"
                                    >
                                        {[0, 1, 2, 3].map(i => {
                                            const y = new Date().getFullYear() - i;
                                            return <option key={y} value={y}>{y}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase mb-1">Semester</label>
                                    <div className="flex bg-white/50 dark:bg-gray-800/50 p-1 rounded-xl border border-blue-200 dark:border-blue-700">
                                        <button
                                            onClick={() => { setReportSemester('ODD'); setSelectedMonths([]); }}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${reportSemester === 'ODD' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600'}`}
                                        >
                                            Ganjil
                                        </button>
                                        <button
                                            onClick={() => { setReportSemester('EVEN'); setSelectedMonths([]); }}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${reportSemester === 'EVEN' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600'}`}
                                        >
                                            Genap
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase mb-1">Pilih Bulan</label>
                                    <div className="grid grid-cols-6 gap-1">
                                        {(reportSemester === 'ODD' ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5]).map(m => {
                                            const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                            const isSelected = selectedMonths.includes(m);
                                            return (
                                                <button
                                                    key={m}
                                                    onClick={() => {
                                                        if (isSelected) setSelectedMonths(selectedMonths.filter(sm => sm !== m));
                                                        else setSelectedMonths([...selectedMonths, m]);
                                                    }}
                                                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isSelected
                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                        : 'bg-white/50 dark:bg-gray-800/50 border-blue-200 dark:border-blue-700 text-blue-600'}`}
                                                >
                                                    {names[m]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reportTypes.map((report, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`p-3 rounded-xl ${report.color} text-white shadow-lg shadow-${report.color}/30`}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{report.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{report.desc}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => handleExport(report.id, 'excel')}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 transition"
                                >
                                    <FileSpreadsheet size={16} /> Excel
                                </button>
                                <button
                                    onClick={() => handleExport(report.id, 'word')}
                                    className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 transition"
                                >
                                    <FileText size={16} /> Word
                                </button>
                                <button
                                    onClick={() => handleExport(report.id, 'pdf')}
                                    className="flex-1 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-sm font-bold flex items-center justify-center gap-2 transition"
                                >
                                    <Download size={16} /> PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>

            {/* Bagian Grafik Analisis Perkembangan */}
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-primary-600" />
                            Analisis Perkembangan Siswa
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Visualisasi data nilai siswa dari waktu ke waktu.</p>
                    </div>

                    {/* Chart Filter Controls */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="flex-1 md:flex-none p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm"
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="flex-1 md:flex-none p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm"
                        >
                            {studentsInClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="flex-1 md:flex-none p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm"
                        >
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    {chartData.length > 0 ? (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9ca3af"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        stroke="#9ca3af"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="nilai"
                                        name="Nilai"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <Filter size={48} className="mb-2 opacity-20" />
                            <p>Belum ada data nilai untuk siswa dan mata pelajaran ini.</p>
                            <p className="text-xs mt-1">Silakan input nilai di menu ePenilaian terlebih dahulu.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}