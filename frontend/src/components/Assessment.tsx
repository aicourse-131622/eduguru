import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AssessmentType, StudentScore, ClassGroup, Student } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import {
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    X,
    Tag,
    Calendar,
    Search,
    Download,
    Calculator,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Plus,
    ArrowLeft,
    FileSpreadsheet,
    FileText
} from 'lucide-react';

export const Assessment: React.FC = () => {
    const [activeView, setActiveView] = useState<'RECAP' | 'INPUT'>('RECAP');
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [allScores, setAllScores] = useState<StudentScore[]>([]);
    const [notification, setNotification] = useState<{ show: boolean, message: string, type: 'success' | 'error' } | null>(null);

    // --- INPUT VIEW STATE ---
    const [selectedClassInput, setSelectedClassInput] = useState('');
    const [assessmentType, setAssessmentType] = useState<AssessmentType>('FORMATIVE');
    const [selectedSubjectInput, setSelectedSubjectInput] = useState('');
    const [assessmentTitle, setAssessmentTitle] = useState('PH 1');
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [scores, setScores] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [kkm, setKkm] = useState<number>(75);

    // --- RECAP VIEW STATE ---
    const [selectedClassRecap, setSelectedClassRecap] = useState('');
    const [selectedSubjectRecap, setSelectedSubjectRecap] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedSemester, setSelectedSemester] = useState<'ODD' | 'EVEN'>(new Date().getMonth() >= 6 ? 'ODD' : 'EVEN');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [noteModal, setNoteModal] = useState<{
        studentId: string,
        studentName: string,
        notes: { title: string, note: string, type: string, score: number }[]
    } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const initData = async () => {
            try {
                const cls = await storageService.getClasses();
                const sub = await storageService.getSubjects();
                const std = await storageService.getStudents();
                const scr = await storageService.getAllScores();

                setClasses(cls);
                setSubjects(sub);
                setStudents(std);
                setAllScores(scr);

                if (cls.length > 0) {
                    setSelectedClassInput(cls[0].id);
                    setSelectedClassRecap(cls[0].id);
                }
                if (sub.length > 0) {
                    setSelectedSubjectInput(sub[0]);
                    setSelectedSubjectRecap(sub[0]);
                }
            } catch (error) {
                console.error("Failed to load evaluation data:", error);
            }
        };
        initData();
    }, []);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // ==========================================
    // INPUT LOGIC
    // ==========================================
    const studentsInClassInput = students.filter(s => s.classId === selectedClassInput);

    useEffect(() => {
        const loadScores = async () => {
            if (activeView === 'INPUT' && selectedClassInput && selectedSubjectInput) {
                try {
                    const relevantScores = allScores.filter(s =>
                        s.classId === selectedClassInput &&
                        s.subject === selectedSubjectInput &&
                        s.type === assessmentType &&
                        s.assessmentTitle === assessmentTitle
                    );

                    const formattedScores: Record<string, string> = {};
                    const formattedNotes: Record<string, string> = {};

                    relevantScores.forEach(s => {
                        formattedScores[s.studentId] = s.score.toString();
                        if (s.notes) formattedNotes[s.studentId] = s.notes;
                    });

                    if (relevantScores.length > 0) {
                        setAssessmentDate(relevantScores[0].date);
                    }

                    setScores(formattedScores);
                    setNotes(formattedNotes);
                } catch (error) {
                    console.error("Failed to load scores:", error);
                }
            }
        };
        loadScores();
    }, [activeView, selectedClassInput, assessmentType, selectedSubjectInput, assessmentTitle]);

    const handleScoreChange = (studentId: string, val: string) => {
        if (val === '' || (/^\d+$/.test(val) && parseInt(val) <= 100)) {
            setScores(prev => ({ ...prev, [studentId]: val }));
        }
    };

    const generateSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

    const handleSaveInput = async () => {
        const records: StudentScore[] = [];
        const safeTitle = generateSlug(assessmentTitle) || 'standard';

        Object.entries(scores).forEach(([studentId, scoreVal]) => {
            const noteVal = notes[studentId];
            if (scoreVal !== undefined || noteVal) {
                records.push({
                    id: `${selectedClassInput}_${selectedSubjectInput}_${assessmentType}_${safeTitle}_${studentId}`,
                    classId: selectedClassInput,
                    subject: selectedSubjectInput,
                    type: assessmentType,
                    studentId: studentId,
                    score: scoreVal ? parseInt(scoreVal) : 0,
                    assessmentTitle: assessmentTitle,
                    date: assessmentDate,
                    notes: noteVal
                });
            }
        });

        await storageService.saveScoresBulk(records);
        const updatedScores = await storageService.getAllScores();
        setAllScores(updatedScores);
        setScores({});
        setNotes({});
        showNotification(`Nilai ${assessmentTitle} berhasil disimpan!`);
        setActiveView('RECAP');
    };

    const inputStats = useMemo(() => {
        const validScores = Object.values(scores).map((v: string) => parseInt(v)).filter(n => !isNaN(n));
        if (validScores.length === 0) return { avg: "0", max: 0, min: 0 };
        const sum = validScores.reduce((a, b) => a + b, 0);
        return {
            avg: (sum / validScores.length).toFixed(1),
            max: Math.max(...validScores),
            min: Math.min(...validScores)
        };
    }, [scores]);

    // ==========================================
    // RECAP LOGIC
    // ==========================================
    const formatDateShort = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const { formatifCols, portfolioCols, slmCols } = useMemo(() => {
        if (!selectedClassRecap || !selectedSubjectRecap) return { formatifCols: [], portfolioCols: [], slmCols: [] };

        let classScores = allScores.filter(s => s.classId === selectedClassRecap && s.subject === selectedSubjectRecap);

        classScores = classScores.filter(s => {
            const d = new Date(s.date);
            const dYear = d.getFullYear();
            const dMonth = d.getMonth();
            if (dYear !== selectedYear) return false;
            if (selectedSemester === 'ODD') return dMonth >= 6 && dMonth <= 11;
            if (selectedSemester === 'EVEN') return dMonth >= 0 && dMonth <= 5;
            return true;
        });

        const extractTitles = (type: string) => {
            const titleMap = new Map<string, string>();
            classScores.filter(s => s.type === type).forEach(s => {
                let defaultTitle = 'Penilaian';
                if (type === 'FORMATIVE') defaultTitle = 'PH 1';
                else if (type === 'PORTFOLIO') defaultTitle = 'Tugas 1';
                else if (type === 'SUMMATIVE') defaultTitle = 'SLM 1';
                const t = s.assessmentTitle || defaultTitle;
                if (!titleMap.has(t)) titleMap.set(t, s.date);
            });
            return Array.from(titleMap.entries())
                .map(([title, date]) => ({ title, date }))
                .sort((a, b) => a.title.localeCompare(b.title));
        };

        return {
            formatifCols: extractTitles('FORMATIVE'),
            portfolioCols: extractTitles('PORTFOLIO'),
            slmCols: extractTitles('SUMMATIVE')
        };
    }, [allScores, selectedClassRecap, selectedSubjectRecap, selectedYear, selectedSemester]);

    const processedRecapData = useMemo(() => {
        if (!selectedClassRecap || !selectedSubjectRecap) return [];

        const classStudents = students.filter(s => s.classId === selectedClassRecap);
        const filteredStudents = classStudents.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return filteredStudents.map((student, index) => {
            const studentScores = allScores.filter(s =>
                s.studentId === student.id &&
                s.subject === selectedSubjectRecap &&
                s.classId === selectedClassRecap
            ).filter(s => {
                const d = new Date(s.date);
                const dYear = d.getFullYear();
                const dMonth = d.getMonth();
                if (dYear !== selectedYear) return false;

                if (selectedMonths.length > 0) {
                    return selectedMonths.includes(dMonth);
                } else {
                    if (selectedSemester === 'ODD') return dMonth >= 6 && dMonth <= 11;
                    return dMonth >= 0 && dMonth <= 5;
                }
            });

            const findScoreObj = (type: string, title?: string) => {
                if (title) return studentScores.find(s => s.type === type && s.assessmentTitle === title);
                return studentScores.find(s => s.type === type);
            };

            const formatifValues = formatifCols.map(col => findScoreObj('FORMATIVE', col.title)?.score);
            const portfolioValues = portfolioCols.map(col => findScoreObj('PORTFOLIO', col.title)?.score);
            const slmValues = slmCols.map(col => findScoreObj('SUMMATIVE', col.title)?.score);
            const sts = findScoreObj('STS')?.score;
            const sas = findScoreObj('SAS')?.score;

            let total = 0;
            let count = 0;
            [...formatifValues, ...portfolioValues, ...slmValues, sts, sas].forEach(v => {
                if (v !== undefined && v !== null) {
                    total += v;
                    count++;
                }
            });
            const average = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;

            const notesList = studentScores
                .filter(s => s.notes && s.notes.trim() !== '')
                .map(s => ({
                    title: s.assessmentTitle || s.type,
                    type: s.type,
                    score: s.score,
                    note: s.notes || ''
                }));

            return {
                no: index + 1,
                id: student.id,
                name: student.name,
                nis: student.nis,
                formatif: formatifValues,
                portfolio: portfolioValues,
                slm: slmValues,
                sts,
                sas,
                total,
                average,
                notes: notesList
            };
        });
    }, [students, allScores, selectedClassRecap, selectedSubjectRecap, searchQuery, formatifCols, portfolioCols, slmCols, selectedYear, selectedSemester, selectedMonths]);

    const sortedData = useMemo(() => {
        let sortableItems = [...processedRecapData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof typeof a];
                const bValue = b[sortConfig.key as keyof typeof b];
                if (aValue === undefined) return 1;
                if (bValue === undefined) return -1;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [processedRecapData, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
        if (!selectedClassRecap || !selectedSubjectRecap) {
            showNotification("Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu.", "error");
            return;
        }
        try {
            if (format === 'excel') await exportService.scores.toExcel(selectedClassRecap, selectedSubjectRecap, selectedYear, selectedSemester, selectedMonths);
            else if (format === 'pdf') await exportService.scores.toPDF(selectedClassRecap, selectedSubjectRecap, selectedYear, selectedSemester, selectedMonths);
            else if (format === 'word') await exportService.scores.toDocx(selectedClassRecap, selectedSubjectRecap, selectedYear, selectedSemester, selectedMonths);
            showNotification(`Laporan berhasil diunduh!`);
        } catch (error) {
            console.error(error);
            showNotification("Gagal mengunduh laporan.", "error");
        }
    };

    const handleSaveScoreRecap = async (studentId: string, type: string, title: string, newVal: string) => {
        setEditingCell(null);
        if (newVal === '') return;
        const numVal = parseInt(newVal);
        if (isNaN(numVal) || numVal < 0 || numVal > 100) return;

        const safeTitle = generateSlug(title) || 'standard';
        const recordId = `${selectedClassRecap}_${selectedSubjectRecap}_${type}_${safeTitle}_${studentId}`;
        const existingRecord = allScores.find(r => r.id === recordId);
        const date = existingRecord ? existingRecord.date : new Date().toISOString().split('T')[0];

        const newRecord: StudentScore = {
            id: recordId,
            classId: selectedClassRecap,
            subject: selectedSubjectRecap,
            type: type as any,
            studentId: studentId,
            score: numVal,
            assessmentTitle: title,
            date: date
        };

        await storageService.saveScoresBulk([newRecord]);
        const updatedScores = await storageService.getAllScores();
        setAllScores(updatedScores);
    };

    // --- RECAP COMPONENTS ---

    const EditableCell = ({
        value,
        studentId,
        type,
        title,
        colIndex,
        className
    }: {
        value: number | undefined,
        studentId: string,
        type: string,
        title: string,
        colIndex?: number,
        className?: string
    }) => {
        const cellKey = `${studentId}-${type}-${colIndex !== undefined ? colIndex : 'main'}`;
        const isEditing = editingCell === cellKey;
        const inputRef = useRef<HTMLInputElement>(null);
        const [tempVal, setTempVal] = useState(value !== undefined ? String(value) : '');

        useEffect(() => {
            if (isEditing && inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
                setTempVal(value !== undefined ? String(value) : '');
            }
        }, [isEditing, value]);

        const onBlur = () => {
            if (tempVal !== (value !== undefined ? String(value) : '')) {
                handleSaveScoreRecap(studentId, type, title, tempVal);
            } else {
                setEditingCell(null);
            }
        };

        const onKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') inputRef.current?.blur();
            else if (e.key === 'Escape') {
                setEditingCell(null);
                setTempVal(value !== undefined ? String(value) : '');
            }
        };

        if (isEditing) {
            return (
                <td className={`p-1 ${className}`}>
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={tempVal}
                        onChange={(e) => setTempVal(e.target.value)}
                        onKeyDown={onKeyDown}
                        onBlur={onBlur}
                        className="w-full h-8 text-center rounded border border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm font-bold bg-white text-gray-900"
                    />
                </td>
            );
        }

        return (
            <td
                onDoubleClick={() => setEditingCell(cellKey)}
                className={`p-4 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition group select-none ${className}`}
                title="Klik 2x untuk edit nilai"
            >
                {value === undefined || value === null ? (
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500">-</span>
                ) : (
                    <span className={value < 75 ? "text-red-500 font-bold" : "text-gray-900 dark:text-gray-100 font-medium"}>
                        {value}
                    </span>
                )}
            </td>
        );
    };

    const renderPagination = () => {
        const totalPagesItems = Math.ceil(sortedData.length / itemsPerPage);
        if (totalPagesItems <= 1) return null;

        const pageNumbers = [];
        if (totalPagesItems <= 7) {
            for (let i = 1; i <= totalPagesItems; i++) pageNumbers.push(i);
        } else {
            if (currentPage <= 4) pageNumbers.push(1, 2, 3, 4, 5, '...', totalPagesItems);
            else if (currentPage >= totalPagesItems - 3) pageNumbers.push(1, '...', totalPagesItems - 4, totalPagesItems - 3, totalPagesItems - 2, totalPagesItems - 1, totalPagesItems);
            else pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPagesItems);
        }

        return (
            <div className="flex items-center gap-1 md:gap-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    <ChevronLeft size={16} />
                </button>
                {pageNumbers.map((page, index) => (
                    <button
                        key={index}
                        onClick={() => typeof page === 'number' && setCurrentPage(page)}
                        disabled={typeof page !== 'number'}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${page === currentPage ? 'bg-primary-600 text-white shadow-md' : typeof page === 'number' ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100' : 'text-gray-400'}`}
                    >
                        {page}
                    </button>
                ))}
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesItems))}
                    disabled={currentPage === totalPagesItems}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        );
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

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
                        <button onClick={() => setNotification(null)} className="ml-2 text-white/70 hover:text-white transition">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">ePenilaian</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {activeView === 'RECAP' ? 'Rekap nilai hasil belajar siswa' : 'Input nilai penilaian harian/ujian'}
                    </p>
                </div>

                <div>
                    {activeView === 'RECAP' ? (
                        <button
                            onClick={() => setActiveView('INPUT')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/30 flex items-center gap-2 transition"
                        >
                            <Plus size={18} />
                            Input Nilai Baru
                        </button>
                    ) : (
                        <button
                            onClick={() => setActiveView('RECAP')}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition"
                        >
                            <ArrowLeft size={18} />
                            Kembali
                        </button>
                    )}
                </div>
            </div>

            {activeView === 'RECAP' && (
                <div className="space-y-6">
                    {/* Recap Filters */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kelas</label>
                            <select
                                value={selectedClassRecap}
                                onChange={(e) => { setSelectedClassRecap(e.target.value); setCurrentPage(1); }}
                                className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2.5"
                            >
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mata Pelajaran</label>
                            <select
                                value={selectedSubjectRecap}
                                onChange={(e) => { setSelectedSubjectRecap(e.target.value); setCurrentPage(1); }}
                                className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2.5"
                            >
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tahun</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}
                                className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2.5 font-bold"
                            >
                                {[0, 1, 2, 3].map(i => {
                                    const y = new Date().getFullYear() - i;
                                    return <option key={y} value={y}>{y}</option>
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Semester</label>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                <button
                                    onClick={() => { setSelectedSemester('ODD'); setSelectedMonths([]); setCurrentPage(1); }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedSemester === 'ODD' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Ganjil
                                </button>
                                <button
                                    onClick={() => { setSelectedSemester('EVEN'); setSelectedMonths([]); setCurrentPage(1); }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedSemester === 'EVEN' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Genap
                                </button>
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pilih Bulan</label>
                            <div className="grid grid-cols-6 gap-1">
                                {(selectedSemester === 'ODD' ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5]).map(m => {
                                    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                    const isSelected = selectedMonths.includes(m);
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                if (isSelected) setSelectedMonths(selectedMonths.filter(sm => sm !== m));
                                                else setSelectedMonths([...selectedMonths, m]);
                                                setCurrentPage(1);
                                            }}
                                            className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isSelected
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}
                                        >
                                            {names[m]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari Nama Siswa..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Recap Table Container */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                <Calculator size={18} />
                                Rekap Nilai Siswa
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExport('excel')}
                                    title="Export Excel"
                                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                                >
                                    <FileSpreadsheet size={20} />
                                </button>
                                <button
                                    onClick={() => handleExport('word')}
                                    title="Export Word"
                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                >
                                    <FileText size={20} />
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    title="Export PDF"
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                                        <th className="p-4 w-12 text-center sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-sm md:shadow-none">No</th>
                                        <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition sticky left-12 bg-gray-50 dark:bg-gray-800 z-10 shadow-sm md:shadow-none" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">Nama Siswa <ArrowUpDown size={12} /></div>
                                        </th>
                                        {formatifCols.map((col, i) => (
                                            <th key={`h-f-${i}`} className="p-4 text-center min-w-[80px] border-l border-gray-200 dark:border-gray-600">
                                                <div className="flex flex-col items-center">
                                                    <span>{col.title}</span>
                                                    {col.date && <span className="text-[10px] text-gray-400 font-normal">{formatDateShort(col.date)}</span>}
                                                </div>
                                            </th>
                                        ))}
                                        {slmCols.map((col, i) => (
                                            <th key={`h-slm-${i}`} className="p-4 text-center min-w-[80px] border-l border-gray-200 dark:border-gray-600 bg-blue-50/30 dark:bg-blue-900/10">
                                                <div className="flex flex-col items-center">
                                                    <span>SLM</span>
                                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mt-0.5">{col.title}</span>
                                                    {col.date && <span className="text-[10px] text-gray-400 font-normal">{formatDateShort(col.date)}</span>}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-4 text-center w-24 border-l border-gray-200 dark:border-gray-600">STS</th>
                                        <th className="p-4 text-center w-24">SAS</th>
                                        {portfolioCols.map((col, i) => (
                                            <th key={`h-p-${i}`} className="p-4 text-center min-w-[80px] border-l border-gray-200 dark:border-gray-600">
                                                <div className="flex flex-col items-center">
                                                    <span>{col.title}</span>
                                                    {col.date && <span className="text-[10px] text-gray-400 font-normal">{formatDateShort(col.date)}</span>}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-4 text-center w-24 border-l border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('average')}>
                                            <div className="flex items-center justify-center gap-1">Rata-rata <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="p-4 text-center w-16 border-l border-gray-200 dark:border-gray-600">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((row, idx) => (
                                            <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                                <td className="p-4 text-center text-gray-500 sticky left-0 bg-white dark:bg-gray-800 z-10">{indexOfFirstItem + idx + 1}</td>
                                                <td className="p-4 font-medium text-gray-800 dark:text-white sticky left-12 bg-white dark:bg-gray-800 z-10">
                                                    {row.name}
                                                    <span className="block text-xs text-gray-400 font-normal">{row.nis}</span>
                                                </td>
                                                {formatifCols.map((col, i) => (
                                                    <EditableCell key={`d-f-${i}`} value={row.formatif[i]} studentId={row.id} type="FORMATIVE" title={col.title} colIndex={i} className="border-l border-gray-50 dark:border-gray-700" />
                                                ))}
                                                {slmCols.map((col, i) => (
                                                    <EditableCell key={`d-slm-${i}`} value={row.slm[i]} studentId={row.id} type="SUMMATIVE" title={col.title} colIndex={i} className="border-l border-gray-50 dark:border-gray-700 bg-blue-50/10 dark:bg-blue-900/5" />
                                                ))}
                                                <EditableCell value={row.sts} studentId={row.id} type="STS" title="Utama" className="border-l border-gray-50 dark:border-gray-700" />
                                                <EditableCell value={row.sas} studentId={row.id} type="SAS" title="Utama" className="" />
                                                {portfolioCols.map((col, i) => (
                                                    <EditableCell key={`d-p-${i}`} value={row.portfolio[i]} studentId={row.id} type="PORTFOLIO" title={col.title} colIndex={i} className="border-l border-gray-50 dark:border-gray-700" />
                                                ))}
                                                <td className="p-4 text-center font-bold text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10 border-l border-gray-100 dark:border-gray-700">{row.average}</td>
                                                <td className="p-4 text-center border-l border-gray-100 dark:border-gray-700">
                                                    <button
                                                        onClick={() => setNoteModal({ studentId: row.id, studentName: row.name, notes: row.notes })}
                                                        disabled={!row.notes || row.notes.length === 0}
                                                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-30"
                                                    >
                                                        <MessageSquare size={18} className={row.notes && row.notes.length > 0 ? 'text-blue-500' : 'text-gray-300'} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={15} className="p-8 text-center text-gray-400 italic">Tidak ada data ditemukan.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {sortedData.length > itemsPerPage && (
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400 order-2 md:order-1">
                                    Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedData.length)} dari {sortedData.length} siswa
                                </span>
                                <div className="order-1 md:order-2">{renderPagination()}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeView === 'INPUT' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kelas</label>
                                <select value={selectedClassInput} onChange={(e) => setSelectedClassInput(e.target.value)} className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2">
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mata Pelajaran</label>
                                <select value={selectedSubjectInput} onChange={(e) => setSelectedSubjectInput(e.target.value)} className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2">
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Jenis Penilaian</label>
                                <select
                                    value={assessmentType}
                                    onChange={(e) => {
                                        const type = e.target.value as AssessmentType;
                                        setAssessmentType(type);
                                        if (type === 'FORMATIVE') setAssessmentTitle('PH 1');
                                        else if (type === 'PORTFOLIO') setAssessmentTitle('Tugas 1');
                                        else setAssessmentTitle('Utama');
                                    }}
                                    className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2"
                                >
                                    <option value="FORMATIVE">Formatif (Quiz/Tugas Harian)</option>
                                    <option value="SUMMATIVE">Sumatif Lingkup Materi (SLM)</option>
                                    <option value="STS">Sumatif Tengah Semester (STS)</option>
                                    <option value="SAS">Sumatif Akhir Semester (SAS)</option>
                                    <option value="PORTFOLIO">Portofolio (Proyek)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-end gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Tag size={12} /> Judul / Topik Penilaian</label>
                                <input type="text" value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder="Contoh: PH 1, Tugas Bab 2..." className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2 font-medium" />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12} /> Tanggal</label>
                                <input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2 font-medium" />
                            </div>
                            <div className="w-full md:w-32">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1"><AlertCircle size={12} /> Target KKM</label>
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={kkm} onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*$/.test(val)) setKkm(val === '' ? 0 : parseInt(val));
                                }} className="w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2 font-bold text-center" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                            <h4 className="text-xs font-bold text-blue-600 uppercase mb-1">Rata-rata</h4>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-200">{inputStats.avg}</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
                            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center justify-center gap-1"><TrendingUp size={14} /> Tertinggi</h4>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">{inputStats.max}</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 text-center">
                            <h4 className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center justify-center gap-1"><TrendingDown size={14} /> Terendah</h4>
                            <div className="text-2xl font-bold text-red-700 dark:text-red-200">{inputStats.min}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-500 font-semibold">
                                        <th className="p-4 w-12">#</th>
                                        <th className="p-4">Nama Siswa</th>
                                        <th className="p-4 w-32 text-center">Nilai</th>
                                        <th className="p-4">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {studentsInClassInput.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                            <td className="p-4 text-gray-500">{idx + 1}</td>
                                            <td className="p-4 font-medium text-gray-800 dark:text-white">{student.name}</td>
                                            <td className="p-4">
                                                <input
                                                    type="text" inputMode="numeric" value={scores[student.id] || ''}
                                                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                                    className={`w-full text-center p-2 rounded-lg border font-bold ${!isNaN(parseInt(scores[student.id])) && parseInt(scores[student.id]) < kkm ? 'bg-red-50 border-red-300 text-red-600' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-white'}`}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input type="text" value={notes[student.id] || ''} onChange={(e) => setNotes(prev => ({ ...prev, [student.id]: e.target.value }))} className="w-full p-2 rounded-lg border border-gray-200 dark:bg-gray-800 dark:text-white text-sm" placeholder="Catatan..." />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end p-4">
                        <button onClick={handleSaveInput} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition">
                            <CheckCircle size={20} /> Simpan Semua Nilai
                        </button>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {noteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Catatan Penilaian</h3>
                                <p className="text-xs text-gray-500">{noteModal.studentName}</p>
                            </div>
                            <button onClick={() => setNoteModal(null)} className="p-1 hover:bg-gray-200 rounded-full transition text-gray-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-4">
                                {noteModal.notes.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase tracking-wider">{item.title}</span>
                                            {item.score > 0 && <span className="text-xs font-bold text-gray-500">Nilai: {item.score}</span>}
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{item.note}"</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setNoteModal(null)} className="w-full mt-6 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};