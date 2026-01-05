import React, { useState, useEffect, useRef } from 'react';
import { AttendanceStatus, ClassGroup, Student } from '../types';
import { storageService } from '../services/storageService';
import { exportService } from '../services/exportService';
import { Check, X, Clock, AlertTriangle, CheckCircle, Users, Filter, ChevronLeft, ChevronRight, Plus, ArrowLeft, Download, FileSpreadsheet, FileText } from 'lucide-react';

export const Attendance: React.FC = () => {
  const [activeView, setActiveView] = useState<'ANALYSIS' | 'FORM'>('ANALYSIS');
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ show: boolean, message: string, type: 'success' | 'error' } | null>(null);

  // --- FORM STATE ---
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  // --- ANALYSIS STATE ---
  const [attClass, setAttClass] = useState('');
  const [attSubject, setAttSubject] = useState('ALL');
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [attSemester, setAttSemester] = useState<'ODD' | 'EVEN'>(new Date().getMonth() >= 6 ? 'ODD' : 'EVEN');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [attendanceRecap, setAttendanceRecap] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const initData = async () => {
      try {
        const cls = await storageService.getClasses();
        setClasses(cls);
        if (cls.length > 0) {
          setSelectedClass(cls[0].id);
          setAttClass(cls[0].id);
        }

        const sub = await storageService.getSubjects();
        setSubjects(sub);
        if (sub.length > 0) {
          setSelectedSubject(sub[0]);
          // attSubject default 'ALL'
        }

        const std = await storageService.getStudents();
        setStudents(std);
      } catch (error) {
        console.error("Failed to load attendance master data:", error);
      }
    };
    initData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ==========================================
  // FORM LOGIC
  // ==========================================
  const studentsInClass = students.filter(s => s.classId === selectedClass);

  useEffect(() => {
    const loadAttendance = async () => {
      if (activeView === 'FORM' && selectedClass && selectedSubject) {
        try {
          const savedData = await storageService.getAttendance(selectedClass, selectedDate, selectedSubject);
          setAttendance(savedData);
        } catch (error) {
          console.error("Failed to load attendance records:", error);
        }
      }
    };
    loadAttendance();
  }, [activeView, selectedClass, selectedDate, selectedSubject]);

  const toggleStatus = (studentId: string) => {
    const current = attendance[studentId] || 'H';
    const sequence: AttendanceStatus[] = ['H', 'S', 'I', 'A'];
    const nextIndex = (sequence.indexOf(current) + 1) % sequence.length;
    setAttendance(prev => ({ ...prev, [studentId]: sequence[nextIndex] }));
  };

  const markAllAsPresent = () => {
    const newAttendance: Record<string, AttendanceStatus> = {};
    studentsInClass.forEach(s => {
      newAttendance[s.id] = 'H';
    });
    setAttendance(newAttendance);
    showNotification('Semua siswa ditandai hadir!', 'success');
  };

  const handleSaveForm = async () => {
    await storageService.saveAttendanceBulk(selectedClass, selectedDate, selectedSubject, attendance);
    showNotification('Data absensi berhasil disimpan!', 'success');
    setAttendance({});
    setActiveView('ANALYSIS');
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'H': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'S': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'I': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'A': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'H': return <Check size={20} />;
      case 'S': return <AlertTriangle size={20} />;
      case 'I': return <Clock size={20} />;
      case 'A': return <X size={20} />;
      default: return <Check size={20} />;
    }
  }

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'H': return 'Hadir';
      case 'S': return 'Sakit';
      case 'I': return 'Izin';
      case 'A': return 'Alfa';
      default: return 'Hadir';
    }
  }

  const summary = studentsInClass.reduce((acc, student) => {
    const status = attendance[student.id] || 'H';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);


  // ==========================================
  // ANALYSIS LOGIC
  // ==========================================
  useEffect(() => {
    if (activeView !== 'ANALYSIS' || !attClass) return;

    setCurrentPage(1);

    const fetchAttendanceData = async () => {
      try {
        const allRecords = await storageService.getAllAttendanceRecords();
        const classStudents = students.filter(s => s.classId === attClass);

        const processedData = classStudents.map((student, idx) => {
          let studentRecords = allRecords.filter(r =>
            r.studentId === student.id &&
            r.classId === attClass
          );

          if (attSubject && attSubject !== 'ALL') {
            studentRecords = studentRecords.filter(r => r.subject === attSubject);
          }

          const filteredRecords = studentRecords.filter(r => {
            if (!r.date) return false;
            const parts = String(r.date).split('-');
            if (parts.length < 2) return false;

            const rYear = parseInt(parts[0]);
            const rMonth = parseInt(parts[1]) - 1;

            if (rYear !== attYear) return false;

            // If no months selected, show all in semester, or all if semester is tricky
            if (selectedMonths.length > 0) {
              return selectedMonths.includes(rMonth);
            } else {
              if (attSemester === 'ODD') return rMonth >= 6 && rMonth <= 11;
              return rMonth >= 0 && rMonth <= 5;
            }
          });

          const counts = { H: 0, S: 0, I: 0, A: 0 };
          filteredRecords.forEach(r => {
            if (counts[r.status] !== undefined) counts[r.status]++;
          });

          const total = counts.H + counts.S + counts.I + counts.A;
          const percentage = total > 0 ? ((counts.H / total) * 100).toFixed(0) : '0';

          return {
            id: student.id,
            no: idx + 1,
            name: student.name,
            nis: student.nis,
            ...counts,
            total,
            percentage
          };
        });

        setAttendanceRecap(processedData);
      } catch (error) {
        console.error("Failed to fetch attendance data", error);
      }
    };

    fetchAttendanceData();

  }, [activeView, attClass, attSubject, attYear, attSemester, selectedMonths, students]);

  const analysisSummary = attendanceRecap.reduce((acc, row) => {
    acc.H += row.H || 0;
    acc.S += row.S || 0;
    acc.I += row.I || 0;
    acc.A += row.A || 0;
    return acc;
  }, { H: 0, S: 0, I: 0, A: 0 });

  const handleSaveAttendanceCount = (studentId: string, field: 'H' | 'S' | 'I' | 'A', val: string) => {
    setEditingCell(null);
    const numVal = parseInt(val);
    if (isNaN(numVal) || numVal < 0) return;

    setAttendanceRecap(prevData => prevData.map(row => {
      if (row.id === studentId) {
        const updatedRow = { ...row, [field]: numVal };
        const total = updatedRow.H + updatedRow.S + updatedRow.I + updatedRow.A;
        const percentage = total > 0 ? ((updatedRow.H / total) * 100).toFixed(0) : 0;
        return { ...updatedRow, total, percentage };
      }
      return row;
    }));
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    try {
      if (!attClass || !attSubject) {
        alert("Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu.");
        return;
      }
      const className = classes.find(c => c.id === attClass)?.name || attClass;
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthLabel = selectedMonths.length > 0
        ? selectedMonths.sort((a, b) => a - b).map(m => monthNamesShort[m]).join(', ')
        : (attSemester === 'ODD' ? 'Semester Ganjil' : 'Semester Genap');

      const periodLabel = `Tahun ${attYear} (${monthLabel})`;

      if (format === 'pdf') exportService.attendance.toPDF(attendanceRecap, className, attSubject, periodLabel);
      else if (format === 'excel') exportService.attendance.toExcel(attendanceRecap, className, attSubject, periodLabel);
      else if (format === 'word') exportService.attendance.toDocx(attendanceRecap, className, attSubject, periodLabel);
    } catch (error) {
      console.error(error);
      showNotification('Gagal mengunduh laporan.', 'error');
    }
  };


  // --- VIEW COMPONENTS ---

  const AttendanceEditableCell = ({
    value,
    studentId,
    field,
    className
  }: {
    value: number,
    studentId: string,
    field: 'H' | 'S' | 'I' | 'A',
    className?: string
  }) => {
    const cellKey = `${studentId}-${field}`;
    const isEditing = editingCell === cellKey;
    const inputRef = useRef<HTMLInputElement>(null);
    const [tempVal, setTempVal] = useState(String(value));

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      setTempVal(String(value));
    }, [isEditing, value]);

    const onBlur = () => {
      if (tempVal !== String(value)) {
        handleSaveAttendanceCount(studentId, field, tempVal);
      } else {
        setEditingCell(null);
      }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setTempVal(String(value));
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
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className="w-full h-8 text-center rounded border border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm font-bold bg-white text-gray-900"
          />
        </td>
      );
    }

    return (
      <td
        onDoubleClick={() => setEditingCell(cellKey)}
        className={`p-4 text-center font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition select-none ${className}`}
        title="Klik 2x untuk edit jumlah"
      >
        {value}
      </td>
    );
  };

  const renderPagination = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const totalPages = Math.ceil(attendanceRecap.length / itemsPerPage);

    if (totalPages <= 1) return null;

    const pageNumbers = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pageNumbers.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pageNumbers.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
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
            className={`
                            min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition
                            ${page === currentPage
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                : typeof page === 'number'
                  ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-gray-400 cursor-default'
              }
                        `}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-30 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = attendanceRecap.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 relative">

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-[slideIn_0.3s_ease-out] md:right-8">
          <div className={`${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4`}>
            <div className="p-2 bg-white/20 rounded-full">
              {notification.type === 'error' ? <AlertTriangle size={24} className="text-white" /> : <CheckCircle size={24} className="text-white" />}
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
          <h2 className="text-2xl font-bold dark:text-white">eSensi (Absensi)</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {activeView === 'ANALYSIS' ? 'Analisis kehadiran siswa' : 'Isi daftar hadir harian'}
          </p>
        </div>

        <div>
          {activeView === 'ANALYSIS' ? (
            <button
              onClick={() => setActiveView('FORM')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/30 flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Buat Absensi Baru
            </button>
          ) : (
            <button
              onClick={() => setActiveView('ANALYSIS')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition"
            >
              <ArrowLeft size={18} />
              Kembali
            </button>
          )}
        </div>
      </div>

      {activeView === 'ANALYSIS' && (
        <div className="space-y-6">
          {/* Attendance Filter Controls */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kelas</label>
              <select
                value={attClass}
                onChange={(e) => setAttClass(e.target.value)}
                className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white text-sm"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mapel</label>
              <select
                value={attSubject}
                onChange={(e) => setAttSubject(e.target.value)}
                className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="ALL">Semua Mapel</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tahun</label>
              <select
                value={attYear}
                onChange={(e) => setAttYear(parseInt(e.target.value))}
                className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white text-sm font-bold"
              >
                {[0, 1, 2, 3].map(i => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Semester</label>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                <button
                  onClick={() => { setAttSemester('ODD'); setSelectedMonths([]); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${attSemester === 'ODD' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Ganjil
                </button>
                <button
                  onClick={() => { setAttSemester('EVEN'); setSelectedMonths([]); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${attSemester === 'EVEN' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Genap
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pilih Bulan</label>
              <div className="grid grid-cols-6 gap-1">
                {(attSemester === 'ODD' ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5]).map(m => {
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
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'}`}
                    >
                      {names[m]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Analysis Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Hadir', key: 'H', color: 'bg-emerald-500' },
              { label: 'Sakit', key: 'S', color: 'bg-blue-500' },
              { label: 'Izin', key: 'I', color: 'bg-amber-500' },
              { label: 'Alfa', key: 'A', color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.key} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center py-6">
                <div className={`w-3 h-3 rounded-full ${item.color} mb-3`}></div>
                <span className="text-3xl font-bold dark:text-white mb-1">{analysisSummary[item.key as keyof typeof analysisSummary]}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                <Users size={18} />
                Rekap Absensi
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('excel')}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                  title="Export Excel"
                >
                  <FileSpreadsheet size={18} />
                </button>
                <button
                  onClick={() => handleExport('word')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Export Word"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Export PDF"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">Nama Siswa</th>
                    <th className="p-4 text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">Sakit (S)</th>
                    <th className="p-4 text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10">Izin (I)</th>
                    <th className="p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">Alfa (A)</th>
                    <th className="p-4 text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10">Hadir (H)</th>
                    <th className="p-4 text-center font-bold">Kehadiran (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {currentItems.length > 0 ? (
                    currentItems.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="p-4 text-center text-gray-500">{indexOfFirstItem + idx + 1}</td>
                        <td className="p-4 font-medium text-gray-800 dark:text-white">
                          {row.name}
                          <span className="block text-xs text-gray-400 font-normal">{row.nis}</span>
                        </td>
                        <AttendanceEditableCell value={row.S} studentId={row.id} field="S" className="bg-blue-50/30 dark:bg-blue-900/5" />
                        <AttendanceEditableCell value={row.I} studentId={row.id} field="I" className="bg-amber-50/30 dark:bg-amber-900/5" />
                        <AttendanceEditableCell value={row.A} studentId={row.id} field="A" className="bg-red-50/30 dark:bg-red-900/5" />
                        <AttendanceEditableCell value={row.H} studentId={row.id} field="H" className="bg-emerald-50/30 dark:bg-emerald-900/5" />

                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${parseFloat(row.percentage) >= 75
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                        Tidak ada data kehadiran untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {attendanceRecap.length > itemsPerPage && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 order-2 md:order-1">
                  Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, attendanceRecap.length)} dari {attendanceRecap.length} siswa
                </span>
                <div className="order-1 md:order-2">
                  {renderPagination()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'FORM' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full md:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2.5"
                />
              </div>
              <div className="w-full md:w-auto flex-1 flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kelas</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2.5"
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mata Pelajaran</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white p-2.5"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            {[
              { label: 'Hadir', key: 'H', color: 'bg-emerald-500' },
              { label: 'Sakit', key: 'S', color: 'bg-blue-500' },
              { label: 'Izin', key: 'I', color: 'bg-amber-500' },
              { label: 'Alfa', key: 'A', color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.key} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className={`w-2 h-2 mx-auto rounded-full ${item.color} mb-1`}></div>
                <span className="block text-2xl font-bold dark:text-white">{summary[item.key] || 0}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{studentsInClass.length} Siswa Terdaftar</span>
                <span className="text-xs text-gray-500">Pilih status kehadiran untuk setiap siswa</span>
              </div>
              <button
                onClick={markAllAsPresent}
                className="w-full md:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
              >
                <CheckCircle size={18} />
                Hadir Semua
              </button>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {studentsInClass.map(student => (
                <li key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{student.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{student.nis}</p>
                    </div>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                    {(['H', 'S', 'I', 'A'] as AttendanceStatus[]).map((status) => {
                      const isActive = (attendance[student.id] || 'H') === status;
                      const colors = {
                        H: 'bg-emerald-500 text-white shadow-emerald-500/20',
                        S: 'bg-blue-500 text-white shadow-blue-500/20',
                        I: 'bg-amber-500 text-white shadow-amber-500/20',
                        A: 'bg-red-500 text-white shadow-red-500/20'
                      };

                      return (
                        <button
                          key={status}
                          onClick={() => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                          className={`
                            relative group flex flex-col items-center justify-center
                            w-10 h-10 md:w-12 md:h-12 rounded-xl transition-all duration-200
                            ${isActive
                              ? `${colors[status]} shadow-lg scale-105 z-10`
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <span className={`text-base md:text-lg font-black ${isActive ? 'scale-110' : ''}`}>
                            {status}
                          </span>
                          {/* Tooltip on hover */}
                          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {getStatusLabel(status)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-6"></div>
          <div className="sticky bottom-4 z-10">
            <button onClick={handleSaveForm} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/30 transition transform flex items-center justify-center gap-2 active:scale-[0.99]">
              <CheckCircle size={20} /> Simpan Absensi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};