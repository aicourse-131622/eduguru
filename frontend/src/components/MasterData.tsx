import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Database, Users, GraduationCap, Book, Save, AlertCircle, Download, CheckCircle, Edit2, Trash2, X, Search as SearchIcon, Cloud, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Student, ClassGroup } from '../types';

type Tab = 'STUDENTS' | 'CLASSES' | 'SUBJECTS';

export const MasterData: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('STUDENTS');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // Reset input file

    // State for existing data
    const [savedStudents, setSavedStudents] = useState<Student[]>([]);
    const [savedClasses, setSavedClasses] = useState<ClassGroup[]>([]);
    const [savedSubjects, setSavedSubjects] = useState<string[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Search & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const loadData = async () => {
            if (activeTab === 'STUDENTS') {
                const [students, classes] = await Promise.all([
                    storageService.getStudents(),
                    storageService.getClasses()
                ]);
                setSavedStudents(students);
                setSavedClasses(classes);
            } else if (activeTab === 'CLASSES') {
                setSavedClasses(await storageService.getClasses());
            } else if (activeTab === 'SUBJECTS') {
                setSavedSubjects(await storageService.getSubjects());
            }
            setCurrentPage(1); // Reset page on tab change
        };
        loadData();
    }, [activeTab, refreshKey]);

    useEffect(() => {
        setCurrentPage(1); // Reset page on search
    }, [searchTerm]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsName = wb.SheetNames[0];
            const ws = wb.Sheets[wsName];
            const data = XLSX.utils.sheet_to_json(ws);
            setPreviewData(data);
        };
        reader.readAsBinaryString(file);
    };

    const handleSave = async () => {
        if (previewData.length === 0) return;

        // Validasi & Simpan
        if (confirm(`Yakin ingin menyimpan ${previewData.length} data baru? Data lama akan tertimpa.`)) {
            try {
                if (activeTab === 'STUDENTS') {
                    // VALIDASI INTEGRASI: Cek apakah KodeKelas ada di Master Kelas
                    localStorage.removeItem('eduguru_cache_classes');
                    const existingClasses = await storageService.getClasses();
                    const validClassIds = existingClasses.map(c => c.id);

                    const students: Student[] = [];
                    let invalidCount = 0;

                    previewData.forEach((row: any) => {
                        const rawClassId = row.KodeKelas ? String(row.KodeKelas).trim() : (row.ClassID || 'c1');
                        const isValidClass = validClassIds.includes(rawClassId);

                        if (!isValidClass && rawClassId) {
                            invalidCount++;
                        }

                        students.push({
                            id: row.ID ? String(row.ID) : 'S' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                            name: row.Nama || row.Name || 'No Name',
                            nis: row.NIS ? String(row.NIS) : '-',
                            classId: (isValidClass ? rawClassId : null) as any
                        });
                    });

                    if (invalidCount > 0) {
                        const proceed = confirm(`PERINGATAN: Ditemukan ${invalidCount} siswa dengan Kode Kelas yang TIDAK TERDAFTAR di Master Kelas.\n\nSiswa ini akan disimpan TANPA KELAS.\n\nLanjutkan penyimpanan?`);
                        if (!proceed) return;
                    }

                    await storageService.saveStudentsBulk(students);
                } else if (activeTab === 'CLASSES') {
                    const classes: ClassGroup[] = previewData.map((row: any) => ({
                        id: row.ID ? String(row.ID) : row.Kode,
                        name: row.NamaKelas || row.Name,
                        grade: Number(row.Tingkat || row.Grade || 10)
                    }));
                    await storageService.saveClassesBulk(classes);
                } else if (activeTab === 'SUBJECTS') {
                    const subjects = previewData
                        .map((row: any) => String(row.Mapel || row.Subject || '').trim())
                        .filter(Boolean);
                    await storageService.saveSubjectsBulk(subjects);
                }

                alert('Data berhasil disimpan!');
                setPreviewData([]);
                setFileInputKey(Date.now());
                setRefreshKey(prev => prev + 1);
            } catch (error: any) {
                console.error(error);
                alert('Gagal menyimpan data: ' + error.message);
            }
        }
    };

    const downloadTemplate = () => {
        let data: any[] = [];
        let fileName = '';

        switch (activeTab) {
            case 'STUDENTS':
                data = [
                    { Nama: 'Budi Santoso', NIS: '2024001', KodeKelas: 'c1' },
                    { Nama: 'Siti Aminah', NIS: '2024002', KodeKelas: 'c1' }
                ];
                fileName = 'Template_Siswa.xlsx';
                break;
            case 'CLASSES':
                data = [
                    { ID: 'c1', NamaKelas: 'X IPA 1', Tingkat: 10 }
                ];
                fileName = 'Template_Kelas.xlsx';
                break;
            case 'SUBJECTS':
                data = [
                    { Mapel: 'Matematika' }
                ];
                fileName = 'Template_Mapel.xlsx';
                break;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, fileName);
    };

    const getTemplateInfo = () => {
        switch (activeTab) {
            case 'STUDENTS': return 'Kolom: Nama, NIS, KodeKelas (Harus sesuai ID di Data Kelas)';
            case 'CLASSES': return 'Kolom: ID (Kode Unik), NamaKelas, Tingkat';
            case 'SUBJECTS': return 'Kolom: Mapel';
            default: return '';
        }
    };

    const handleDelete = async (item: any) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

        try {
            if (activeTab === 'STUDENTS') {
                await storageService.deleteStudent(item.id);
            } else if (activeTab === 'CLASSES') {
                await storageService.deleteClass(item.id);
            } else if (activeTab === 'SUBJECTS') {
                await storageService.deleteSubject(item);
            }
            setRefreshKey(prev => prev + 1);
            alert('Data berhasil dihapus');
        } catch (error) {
            console.error(error);
            alert('Gagal menghapus data');
        }
    };

    const handleEditClick = (item: any) => {
        setEditingItem(activeTab === 'SUBJECTS' ? { name: item, oldName: item } : { ...item });
        setIsEditOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            if (activeTab === 'STUDENTS') {
                await storageService.saveStudent(editingItem);
            } else if (activeTab === 'CLASSES') {
                await storageService.saveClass(editingItem);
            } else if (activeTab === 'SUBJECTS') {
                if (editingItem.name !== editingItem.oldName) {
                    await storageService.deleteSubject(editingItem.oldName);
                    await storageService.saveSubject(editingItem.name);
                }
            }
            setRefreshKey(prev => prev + 1);
            setIsEditOpen(false);
            setEditingItem(null);
            alert('Data berhasil diperbarui');
        } catch (error) {
            console.error(error);
            alert('Gagal memperbarui data');
        }
    };

    const handleDeleteAll = async () => {
        const type = activeTab === 'STUDENTS' ? 'Data Siswa' : activeTab === 'CLASSES' ? 'Data Kelas' : 'Mata Pelajaran';
        if (!confirm(`PERINGATAN: Anda akan MENGHAPUS SEMUA ${type}!`)) return;

        try {
            if (activeTab === 'STUDENTS') {
                await storageService.deleteAllStudents();
            } else if (activeTab === 'CLASSES') {
                await storageService.deleteAllClasses();
            } else if (activeTab === 'SUBJECTS') {
                await storageService.deleteAllSubjects();
            }
            setRefreshKey(prev => prev + 1);
            alert(`Semua ${type} berhasil dihapus.`);
        } catch (error) {
            console.error(error);
            alert('Gagal menghapus semua data.');
        }
    };

    const getAvatar = (name: string) => {
        const parts = name.split(' ');
        const initials = parts.length > 1
            ? parts[0][0] + parts[1][0]
            : parts[0][0] + (parts[0][1] || '');

        const colors = [
            'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
            'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500'
        ];
        const colorIndex = name.length % colors.length;
        return { initials: initials.toUpperCase(), color: colors[colorIndex] };
    };

    return (
        <div className="space-y-8 pb-32 max-w-7xl mx-auto">
            {/* Header section with icon */}
            <div className="flex items-start gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                    <LayoutGrid className="text-emerald-500" size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {activeTab === 'STUDENTS' ? 'Master Data Siswa' :
                            activeTab === 'CLASSES' ? 'Master Data Kelas' :
                                'Master Data Mapel'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Kelola dan import data {activeTab === 'STUDENTS' ? 'siswa sekolah' : activeTab === 'CLASSES' ? 'kelas sekolah' : 'mata pelajaran'} untuk digunakan di seluruh modul aplikasi.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 gap-8 overflow-x-auto no-scrollbar">
                {[
                    { id: 'STUDENTS', label: 'Data Siswa', icon: Users },
                    { id: 'CLASSES', label: 'Data Kelas', icon: GraduationCap },
                    { id: 'SUBJECTS', label: 'Mata Pelajaran', icon: Book },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as Tab); setPreviewData([]); }}
                        className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab.id
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Import Section Card */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">
                            Import Data {activeTab === 'STUDENTS' ? 'Siswa' : activeTab === 'CLASSES' ? 'Kelas' : 'Mapel'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xl">
                            Gunakan template Excel yang disediakan untuk mengunggah data dalam jumlah banyak.
                        </p>
                        <div className="mt-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl text-xs font-bold w-fit">
                            <AlertCircle size={14} className="shrink-0" />
                            {getTemplateInfo()}
                        </div>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-6 py-3 rounded-xl hover:bg-emerald-100 transition-all duration-300 shrink-0 shadow-sm"
                    >
                        <Download size={18} />
                        Download Template
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-gray-200 border-dashed rounded-[2rem] cursor-pointer bg-gray-50 dark:bg-gray-700/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all duration-300 group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Cloud className="text-emerald-500" size={32} />
                            </div>
                            <p className="mb-2 text-sm">
                                <span className="font-bold text-emerald-600">Klik untuk upload</span> atau <span className="text-gray-500">drag & drop file disini</span>
                            </p>
                            <p className="text-xs text-gray-400">Format: XLSX atau CSV (Maks. 5MB)</p>
                        </div>
                        <input key={fileInputKey} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            {/* Preview Section */}
            {previewData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Preview Data</h3>
                        <button
                            onClick={handleSave}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Save size={20} />
                            Simpan ke Database
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    {Object.keys(previewData[0] || {}).map((key) => (
                                        <th key={key} className="p-4 font-black text-gray-400 uppercase tracking-widest text-xs whitespace-nowrap">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="border-t border-gray-50 dark:border-gray-700">
                                        {Object.values(row).map((val: any, vIdx) => (
                                            <td key={vIdx} className="p-4 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Saved Data Section */}
            {previewData.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Data Tersimpan</h3>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                {activeTab === 'STUDENTS' ? savedStudents.length :
                                    activeTab === 'CLASSES' ? savedClasses.length :
                                        savedSubjects.length} Item
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-80 group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'STUDENTS' ? "Cari Nama atau NIS..." : activeTab === 'CLASSES' ? "Cari Nama Kelas..." : "Cari Mapel..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            {((activeTab === 'STUDENTS' && savedStudents.length > 0) || (activeTab === 'CLASSES' && savedClasses.length > 0) || (activeTab === 'SUBJECTS' && savedSubjects.length > 0)) && (
                                <button
                                    onClick={handleDeleteAll}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 rounded-2xl text-sm font-black transition-all duration-300"
                                >
                                    <Trash2 size={18} />
                                    Hapus Semua
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-y border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">#</th>
                                    {activeTab === 'STUDENTS' && (
                                        <>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">NIS</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Kelas</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">ID Kelas</th>
                                        </>
                                    )}
                                    {activeTab === 'CLASSES' && (
                                        <>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">ID Kelas</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Nama Kelas</th>
                                            <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tingkat</th>
                                        </>
                                    )}
                                    {activeTab === 'SUBJECTS' && (
                                        <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Nama Mata Pelajaran</th>
                                    )}
                                    <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {activeTab === 'STUDENTS' && (() => {
                                    const filtered = savedStudents.filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.includes(searchTerm));
                                    const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                    if (filtered.length === 0) return <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Belum ada data siswa.</td></tr>;
                                    return currentData.map((s, i) => {
                                        const className = savedClasses.find(c => c.id === s.classId)?.name;
                                        const avatar = getAvatar(s.name);
                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center text-gray-400 font-medium text-sm">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 ${avatar.color} rounded-full flex items-center justify-center text-white text-xs font-black ring-4 ring-white dark:ring-gray-800 shadow-sm`}>
                                                            {avatar.initials}
                                                        </div>
                                                        <span className="font-bold text-gray-800 dark:text-white">{s.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 font-medium text-sm tabular-nums">{s.nis}</td>
                                                <td className="p-4 text-center text-gray-700 dark:text-gray-300 font-bold">{className || '-'}</td>
                                                <td className="p-4 text-center">
                                                    {s.classId ? (
                                                        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 text-[10px] font-black tracking-wider uppercase ring-1 ring-blue-100">
                                                            {s.classId}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={() => handleEditClick(s)} className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                        <button onClick={() => handleDelete(s)} className="p-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}

                                {activeTab === 'CLASSES' && (() => {
                                    const filtered = savedClasses.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()));
                                    const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                    if (filtered.length === 0) return <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Belum ada data kelas.</td></tr>;
                                    return currentData.map((c, i) => (
                                        <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4 text-center text-gray-400 font-medium text-sm">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                            <td className="p-4"><span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 text-[10px] font-black tracking-wider uppercase ring-1 ring-blue-100">{c.id}</span></td>
                                            <td className="p-4 font-bold text-gray-800 dark:text-white">{c.name}</td>
                                            <td className="p-4 text-gray-500 font-medium">{c.grade}</td>
                                            <td className="p-4">
                                                <div className="flex gap-1 justify-center">
                                                    <button onClick={() => handleEditClick(c)} className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(c)} className="p-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()}

                                {activeTab === 'SUBJECTS' && (() => {
                                    const filtered = savedSubjects.filter(s => !searchTerm || s.toLowerCase().includes(searchTerm.toLowerCase()));
                                    const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                    if (filtered.length === 0) return <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">Belum ada data mata pelajaran.</td></tr>;
                                    return currentData.map((s, i) => (
                                        <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4 text-center text-gray-400 font-medium text-sm w-20">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                            <td className="p-4 font-bold text-gray-800 dark:text-white">{s}</td>
                                            <td className="p-4">
                                                <div className="flex gap-1 justify-center">
                                                    <button onClick={() => handleEditClick(s)} className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(s)} className="p-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {(() => {
                        const filtered = activeTab === 'STUDENTS' ? savedStudents.filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.includes(searchTerm)) :
                            activeTab === 'CLASSES' ? savedClasses.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())) :
                                savedSubjects.filter(s => !searchTerm || s.toLowerCase().includes(searchTerm.toLowerCase()));

                        const totalPages = Math.ceil(filtered.length / itemsPerPage);
                        if (totalPages <= 1) return null;

                        return (
                            <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    Halaman {currentPage} dari {totalPages}
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    {filtered.length} Total Data
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-20 transition-all active:scale-90"
                                    >
                                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                                    </button>
                                    <div className="flex gap-1">
                                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                            let pageNum = currentPage;
                                            if (currentPage <= 3) pageNum = i + 1;
                                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                            else pageNum = currentPage - 2 + i;
                                            if (pageNum > 0 && pageNum <= totalPages) {
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum
                                                            ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-500/20'
                                                            : 'text-gray-500 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-emerald-100'}`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-20 transition-all active:scale-90"
                                    >
                                        <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                Edit {activeTab === 'STUDENTS' ? 'Data Siswa' : activeTab === 'CLASSES' ? 'Data Kelas' : 'Mapel'}
                            </h3>
                            <button onClick={() => setIsEditOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-gray-600 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-6">
                            {activeTab === 'STUDENTS' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
                                        <input
                                            value={editingItem.name}
                                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">NIS</label>
                                        <input
                                            value={editingItem.nis}
                                            onChange={e => setEditingItem({ ...editingItem, nis: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">Kelas ID</label>
                                        <input
                                            value={editingItem.classId}
                                            onChange={e => setEditingItem({ ...editingItem, classId: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white font-bold"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'CLASSES' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">ID Kelas</label>
                                        <input value={editingItem.id} disabled className="w-full px-5 py-4 bg-gray-100 dark:bg-gray-900 border border-transparent rounded-2xl text-gray-400 font-bold cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">Nama Kelas</label>
                                        <input
                                            value={editingItem.name}
                                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">Tingkat</label>
                                        <input
                                            type="number"
                                            value={editingItem.grade}
                                            onChange={e => setEditingItem({ ...editingItem, grade: Number(e.target.value) })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white font-bold"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'SUBJECTS' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black ml-1 text-gray-400 uppercase tracking-widest">Mata Pelajaran</label>
                                    <input
                                        value={editingItem.name}
                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white font-bold"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setIsEditOpen(false)} className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 font-black rounded-2xl hover:bg-gray-100 transition-all">BATAL</button>
                            <button onClick={handleSaveEdit} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95">SIMPAN</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
