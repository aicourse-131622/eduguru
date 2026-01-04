import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, TextRun } from "docx";
import { saveAs } from "file-saver";
import { storageService } from "./storageService";
import { CLASSES, STUDENTS } from "../constants";
import { StudentScore } from "../types";

// Helper untuk format tanggal
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
};

// Helper Filter Tanggal (Centralized Logic)
const filterByDate = (data: any[], dateField: string, year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
    return data.filter(item => {
        const d = new Date(item[dateField]);
        const dYear = d.getFullYear();
        const dMonth = d.getMonth();

        if (dYear !== year) return false;

        if (Array.isArray(month)) {
            if (month.length > 0) return month.includes(dMonth);
        } else if (month !== -1) {
            return dMonth === month;
        }

        if (semester === 'ODD') return dMonth >= 6 && dMonth <= 11;
        if (semester === 'EVEN') return dMonth >= 0 && dMonth <= 5;

        return true;
    });
};

// Helper khusus untuk format pendek dd/mm/yyyy di header Excel
const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

// Helper untuk mendapatkan nama kelas
const getClassName = (id: string) => CLASSES.find(c => c.id === id)?.name || id;
// Helper untuk mendapatkan nama siswa
const getStudentName = (id: string) => STUDENTS.find(s => s.id === id)?.name || id;

// --- CORE LOGIC: Prepare Data Matrix (Pivot) ---
// Fungsi ini menyiapkan data agar bentuknya baris=siswa, kolom=jenis penilaian
// --- CORE LOGIC: Prepare Data Matrix (Pivot) ---
// Fungsi ini menyiapkan data agar bentuknya baris=siswa, kolom=jenis penilaian
const prepareScoreMatrix = async (classId: string, subject: string, year?: number, semester?: 'ALL' | 'ODD' | 'EVEN', months?: number[]) => {
    const allScores = await storageService.getAllScores();
    const allStudents = await storageService.getStudents();
    const allClasses = await storageService.getClasses(); // Fetch classes
    const students = allStudents.filter(s => s.classId === classId);

    // Resolve Class Name locally
    const className = allClasses.find(c => c.id === classId)?.name || classId;

    // Filter nilai hanya untuk kelas dan mapel ini
    let classScores = allScores.filter(s => s.classId === classId && s.subject === subject);

    // Filter Semester & Tahun & Bulan
    classScores = filterByDate(classScores, 'date', year || new Date().getFullYear(), months || -1, semester || 'ALL');

    // 1. Identifikasi Kolom Dinamis (Formatif, Portfolio, SLM)
    const extractTitles = (type: string) => {
        const titleMap = new Map<string, string>(); // Title -> Date
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

    const formatifCols = extractTitles('FORMATIVE');
    const portfolioCols = extractTitles('PORTFOLIO');
    const slmCols = extractTitles('SUMMATIVE');

    // 2. Map Data Siswa ke Baris
    const rows = students.map((student, index) => {
        const studentScores = classScores.filter(s => s.studentId === student.id);
        const findScore = (type: string, title?: string) => {
            if (title) return studentScores.find(s => s.type === type && s.assessmentTitle === title)?.score;
            return studentScores.find(s => s.type === type)?.score;
        };

        const formatifValues = formatifCols.map(col => findScore('FORMATIVE', col.title));
        const portfolioValues = portfolioCols.map(col => findScore('PORTFOLIO', col.title));
        const slmValues = slmCols.map(col => findScore('SUMMATIVE', col.title));
        const sts = findScore('STS');
        const sas = findScore('SAS');

        // Hitung Rata-rata
        let total = 0;
        let count = 0;
        [...formatifValues, ...portfolioValues, ...slmValues, sts, sas].forEach(v => {
            if (v !== undefined && v !== null) {
                total += v;
                count++;
            }
        });
        const average = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;

        return {
            no: index + 1,
            name: student.name,
            nis: student.nis,
            formatif: formatifValues,
            portfolio: portfolioValues,
            slm: slmValues,
            sts,
            sas,
            average
        };
    });

    return { rows, formatifCols, portfolioCols, slmCols, className };
};

export const exportService = {
    // --- JURNAL ---
    journal: {
        toPDF: async (year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
            let data = await storageService.getJournals();
            // Filter Data
            data = filterByDate(data, 'date', year, month, semester);

            const classes = await storageService.getClasses();
            const getClsName = (id: string) => classes.find(c => c.id === id)?.name || id;

            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns

            // Header
            doc.setFontSize(16);
            doc.text("Laporan Jurnal Mengajar", 148.5, 15, { align: 'center' });
            doc.setFontSize(10);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            let periodStr = "";
            if (Array.isArray(month) && month.length > 0) {
                periodStr = `${year} (${month.sort((a, b) => a - b).map(m => monthNames[m]).join(', ')})`;
            } else if (!Array.isArray(month) && month !== -1) {
                periodStr = new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            } else {
                periodStr = `${year} ${semester === 'ODD' ? '(Ganjil)' : (semester === 'EVEN' ? '(Genap)' : '')}`;
            }
            doc.text(`Periode: ${periodStr}`, 148.5, 22, { align: 'center' });

            const tableData = data.map((j, idx) => [
                idx + 1,
                formatDateShort(j.date),
                j.startTime || '-',
                getClsName(j.classId),
                j.subject,
                j.materials,
                j.method || '-',
                j.activities || '-',
                j.reflection || '-'
            ]);

            autoTable(doc, {
                startY: 30,
                head: [['No', 'Tgl', 'Jam', 'Kls', 'Mapel', 'Materi', 'Metode', 'Kegiatan', 'Refleksi']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center', fontStyle: 'bold' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 }, // No
                    1: { halign: 'center', cellWidth: 18 }, // Tanggal
                    2: { halign: 'center', cellWidth: 10 }, // Jam
                    3: { halign: 'center', cellWidth: 12 }, // Kelas
                    4: { halign: 'center', cellWidth: 20 }, // Mapel
                    5: { halign: 'left', cellWidth: 35 }, // Materi
                    6: { halign: 'center', cellWidth: 25 }, // Metode
                    7: { halign: 'left', cellWidth: 60 }, // Kegiatan
                    8: { halign: 'left', cellWidth: 60 } // Refleksi
                }
            });
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            const xPos = doc.internal.pageSize.getWidth() - 60;
            const user = storageService.getUser();

            doc.setFontSize(11);
            doc.text(`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, xPos, finalY, { align: 'center' });
            doc.text("Guru Mata Pelajaran", xPos, finalY + 6, { align: 'center' });
            doc.text(`( ${user?.name || '___________________'} )`, xPos, finalY + 25, { align: 'center' });

            doc.save("Laporan_Jurnal_Mengajar.pdf");
        },
        toExcel: async (year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
            let data = await storageService.getJournals();
            data = filterByDate(data, 'date', year, month, semester);

            const classes = await storageService.getClasses();
            const getClsName = (id: string) => classes.find(c => c.id === id)?.name || id;
            const user = storageService.getUser();

            const formattedData = data.map((j, idx) => ({
                No: idx + 1,
                Tanggal: j.date,
                'Jam Ke': j.startTime,
                Kelas: getClsName(j.classId),
                Mapel: j.subject,
                'Tujuan Pembelajaran': j.learningObjective,
                'Materi Pokok': j.materials,
                'Metode': j.method,
                'Kegiatan Pembelajaran': j.activities,
                'Refleksi Guru': j.reflection
            }));
            const ws = XLSX.utils.json_to_sheet(formattedData);

            const startRow = formattedData.length + 4;
            XLSX.utils.sheet_add_aoa(ws, [
                [`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
                ["Guru Mata Pelajaran"],
                [""],
                [""],
                [`( ${user?.name || '___________________'} )`]
            ], { origin: `E${startRow}` });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Jurnal");
            XLSX.writeFile(wb, "Laporan_Jurnal_Mengajar.xlsx");
        },
        toDocx: async (year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
            let data = await storageService.getJournals();
            data = filterByDate(data, 'date', year, month, semester);

            const classes = await storageService.getClasses();
            const getClsName = (id: string) => classes.find(c => c.id === id)?.name || id;

            const headers = ["No", "Tanggal", "Jam", "Kelas", "Mapel", "Materi", "Metode", "Kegiatan", "Refleksi"];

            const tableRows = [
                new TableRow({
                    children: headers.map(text =>
                        new TableCell({
                            children: [new Paragraph({ text, alignment: AlignmentType.CENTER, style: "Header" })],
                            shading: { fill: "2980B9", color: "auto" },
                            verticalAlign: AlignmentType.CENTER,
                        })
                    ),
                }),
                ...data.map((j, idx) =>
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: String(idx + 1), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: formatDateShort(j.date), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: j.startTime || '-', alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: getClsName(j.classId), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: j.subject, alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph(j.materials)] }),
                            new TableCell({ children: [new Paragraph(j.method || '-')] }),
                            new TableCell({ children: [new Paragraph(j.activities || '-')] }),
                            new TableCell({ children: [new Paragraph(j.reflection || '-')] }),
                        ],
                    })
                ),
            ];

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            size: { orientation: "landscape" }
                        }
                    },
                    children: [
                        new Paragraph({
                            text: "Laporan Jurnal Mengajar",
                            heading: "Heading1",
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            text: `Periode: ${Array.isArray(month) && month.length > 0
                                ? `${year} (${month.sort((a, b) => a - b).map(m => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m]).join(', ')})`
                                : (!Array.isArray(month) && month !== -1
                                    ? new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })
                                    : year + (semester === 'ODD' ? ' (Ganjil)' : (semester === 'EVEN' ? ' (Genap)' : '')))}`,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 },
                        }),
                        new Table({
                            rows: tableRows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "Guru Mata Pelajaran", alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `( ${storageService.getUser()?.name || '___________________'} )`, alignment: AlignmentType.RIGHT }),
                    ],
                }],
            });

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, "Laporan_Jurnal_Mengajar.docx");
            });
        }
    },

    // --- ABSENSI ---
    attendance: {
        toPDF: (data: any[], className: string, subject: string, period: string) => {
            const user = storageService.getUser();
            const doc = new jsPDF();

            // Header Fancy
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("LAPORAN ANALISIS KEHADIRAN SISWA", 105, 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("EduGuru Application System", 105, 20, { align: 'center' });

            doc.setLineWidth(0.5);
            doc.line(14, 25, 196, 25);

            // Info Block
            doc.setFontSize(11);
            doc.text(`Kelas`, 14, 35);
            doc.text(`: ${className}`, 50, 35);

            doc.text(`Mata Pelajaran`, 14, 40);
            doc.text(`: ${subject}`, 50, 40);

            doc.text(`Periode`, 14, 45);
            doc.text(`: ${period}`, 50, 45);

            const tableData = data.map(row => [
                row.no,
                row.name,
                row.nis,
                row.S || '-',
                row.I || '-',
                row.A || '-',
                row.H,
                `${row.percentage}%`
            ]);

            autoTable(doc, {
                startY: 50,
                head: [['No', 'Nama Siswa', 'NIS', 'S', 'I', 'A', 'H', 'Ket (%)']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [52, 73, 94], // Dark Blue/Grey
                    textColor: 255,
                    halign: 'center',
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: [200, 200, 200]
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 12 }, // No
                    1: { halign: 'left' }, // Nama (auto width)
                    2: { halign: 'center', cellWidth: 25 }, // NIS
                    3: { halign: 'center', cellWidth: 12 }, // S
                    4: { halign: 'center', cellWidth: 12 }, // I
                    5: { halign: 'center', cellWidth: 12 }, // A
                    6: { halign: 'center', cellWidth: 12 }, // H
                    7: { halign: 'center', cellWidth: 20 }  // %
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                }
            });

            // Signature
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            // Check if page break needed
            if (finalY > 250) {
                doc.addPage();
                // Reset Y for new page
            }

            const pageWidth = doc.internal.pageSize.getWidth();
            const xPos = pageWidth - 60;
            const yPos = finalY > 250 ? 20 : finalY;

            doc.setFontSize(11);
            doc.text(`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, xPos, yPos, { align: 'center' });
            doc.text("Guru Mata Pelajaran", xPos, yPos + 6, { align: 'center' });
            doc.text(`( ${user?.name || '___________________'} )`, xPos, yPos + 25, { align: 'center' });

            doc.save(`Laporan_Absensi_${className}_${subject}.pdf`);
        },
        toExcel: (data: any[], className: string, subject: string, period: string) => {
            const user = storageService.getUser();
            const formattedData = data.map(row => ({
                'No': row.no,
                'Nama Siswa': row.name,
                'NIS': row.nis,
                'Sakit (S)': row.S,
                'Izin (I)': row.I,
                'Alfa (A)': row.A,
                'Hadir (H)': row.H,
                'Kehadiran (%)': `${row.percentage}%`
            }));
            const ws = XLSX.utils.aoa_to_sheet([
                [`LAPORAN ANALISIS KEHADIRAN SISWA`],
                [`Kelas : ${className}`],
                [`Mapel : ${subject}`],
                [`Periode : ${period}`],
                ['']
            ]);
            XLSX.utils.sheet_add_json(ws, formattedData, { origin: 'A6' });
            const startRow = formattedData.length + 8;
            XLSX.utils.sheet_add_aoa(ws, [
                [`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
                ["Guru Mata Pelajaran"],
                [""],
                [""],
                [`( ${user?.name || '___________________'} )`]
            ], { origin: `E${startRow}` });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Absensi");
            const fileName = `Laporan_Absensi_${className}_${subject}.xlsx`.replace(/\s+/g, '_');
            XLSX.writeFile(wb, fileName);
        },
        toDocx: (data: any[], className: string, subject: string, period: string) => {
            const user = storageService.getUser();

            const tableRows = [
                new TableRow({
                    children: ["No", "Nama Siswa", "NIS", "S", "I", "A", "H", "Ket (%)"].map(text =>
                        new TableCell({
                            children: [new Paragraph({ text, alignment: AlignmentType.CENTER, style: "Header" })],
                            shading: { fill: "34495E", color: "auto" },
                            verticalAlign: AlignmentType.CENTER,
                        })
                    ),
                }),
                ...data.map(row =>
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: String(row.no), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph(row.name)] }),
                            new TableCell({ children: [new Paragraph({ text: row.nis, alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: String(row.S || '-'), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: String(row.I || '-'), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: String(row.A || '-'), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: String(row.H), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: `${row.percentage}%`, alignment: AlignmentType.CENTER })] }),
                        ],
                    })
                ),
            ];

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ text: "LAPORAN ANALISIS KEHADIRAN SISWA", heading: "Heading1", alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: "EduGuru Application System", alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ children: [new TextRun({ text: "Kelas: ", bold: true }), new TextRun(className)] }),
                        new Paragraph({ children: [new TextRun({ text: "Mata Pelajaran: ", bold: true }), new TextRun(subject)] }),
                        new Paragraph({ children: [new TextRun({ text: "Periode: ", bold: true }), new TextRun(period)], spacing: { after: 200 } }),
                        new Table({
                            rows: tableRows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "Guru Mata Pelajaran", alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `( ${user?.name || '___________________'} )`, alignment: AlignmentType.RIGHT }),
                    ],
                }],
            });

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, `Laporan_Absensi_${className}_${subject}.docx`);
            });
        }
    },

    // --- NILAI (LEGER / REKAP) ---
    scores: {
        toPDF: async (classId: string, subject: string, year?: number, semester?: 'ALL' | 'ODD' | 'EVEN', months?: number[]) => {
            const { rows, formatifCols, portfolioCols, slmCols, className } = await prepareScoreMatrix(classId, subject, year, semester, months);
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

            // Dynamic Subtitle
            let periodText = `Mapel: ${subject} | Kelas: ${className}`;
            if (year) periodText += ` | Tahun: ${year}`;
            if (months && months.length > 0) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                periodText += ` | Bulan: ${months.sort((a, b) => a - b).map(m => monthNames[m]).join(',')}`;
            } else if (semester === 'ODD') periodText += ` | Sem. Ganjil`;
            else if (semester === 'EVEN') periodText += ` | Sem. Genap`;

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(`LEGER NILAI MATA PELAJARAN`, 148.5, 15, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(periodText, 148.5, 22, { align: 'center' });
            doc.line(14, 25, 283, 25);

            // Construct Headers
            const headerRow = ['No', 'Nama Siswa'];
            formatifCols.forEach(c => headerRow.push(c.title));
            slmCols.forEach(c => headerRow.push(`S:${c.title}`));
            headerRow.push('STS', 'SAS');
            portfolioCols.forEach(c => headerRow.push(`P:${c.title}`));
            headerRow.push('Rata²');

            const bodyData = rows.map(r => {
                const row = [r.no, r.name];
                r.formatif.forEach(v => row.push(v !== undefined ? String(v) : '-'));
                r.slm.forEach(v => row.push(v !== undefined ? String(v) : '-'));
                row.push(r.sts !== undefined ? String(r.sts) : '-');
                row.push(r.sas !== undefined ? String(r.sas) : '-');
                r.portfolio.forEach(v => row.push(v !== undefined ? String(v) : '-'));
                row.push(String(r.average));
                return row;
            });

            autoTable(doc, {
                startY: 30,
                head: [headerRow],
                body: bodyData,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
                headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { halign: 'left', cellWidth: 40 } // Nama wider
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 15;
            const xPos = doc.internal.pageSize.getWidth() - 60;
            const user = storageService.getUser();

            doc.setFontSize(11);
            doc.text(`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, xPos, finalY, { align: 'center' });
            doc.text("Guru Mata Pelajaran", xPos, finalY + 6, { align: 'center' });
            doc.text(`( ${user?.name || '___________________'} )`, xPos, finalY + 25, { align: 'center' });

            doc.save(`Leger_${className}_${subject}.pdf`);
        },
        toExcel: async (classId: string, subject: string, year?: number, semester?: 'ALL' | 'ODD' | 'EVEN', months?: number[]) => {
            const { rows, formatifCols, portfolioCols, slmCols, className } = await prepareScoreMatrix(classId, subject, year, semester, months);
            const user = storageService.getUser();
            const formattedData = rows.map(item => {
                const row: any = { 'No': item.no, 'Nama Siswa': item.name, 'NIS': item.nis };
                if (formatifCols.length > 0) formatifCols.forEach((col, idx) => row[col.title] = item.formatif[idx] ?? '-');
                if (slmCols.length > 0) slmCols.forEach((col, idx) => row[`SLM: ${col.title}`] = item.slm[idx] ?? '-');
                row['STS'] = item.sts ?? '-';
                row['SAS'] = item.sas ?? '-';
                if (portfolioCols.length > 0) portfolioCols.forEach((col, idx) => row[`Portofolio: ${col.title}`] = item.portfolio[idx] ?? '-');
                row['Rata-Rata'] = item.average;
                return row;
            });
            let periodInfo = `Mata Pelajaran : ${subject}`;
            if (year) periodInfo += ` | Tahun: ${year}`;
            if (months && months.length > 0) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                periodInfo += ` | Bulan: ${months.sort((a, b) => a - b).map(m => monthNames[m]).join(',')}`;
            } else if (semester === 'ODD') periodInfo += ` | Sem. Ganjil`;
            else if (semester === 'EVEN') periodInfo += ` | Sem. Genap`;

            const ws = XLSX.utils.aoa_to_sheet([[`Kelas : ${className}`], [periodInfo], ['']]);
            XLSX.utils.sheet_add_json(ws, formattedData, { origin: 'A4' });

            const colCount = Object.keys(formattedData[0]).length; // Rough estimate of width
            const startCol = String.fromCharCode(65 + Math.min(colCount - 1, 10)); // Clamp to some column like K
            const startRow = formattedData.length + 8;

            XLSX.utils.sheet_add_aoa(ws, [
                [`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
                ["Guru Mata Pelajaran"],
                [""],
                [""],
                [`( ${user?.name || '___________________'} )`]
            ], { origin: `${startCol}${startRow}` });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Leger Nilai");
            const fileName = `Leger_${className}_${subject}.xlsx`.replace(/\s+/g, '_');
            XLSX.writeFile(wb, fileName);
        },
        toDocx: async (classId: string, subject: string, year?: number, semester?: 'ALL' | 'ODD' | 'EVEN', months?: number[]) => {
            const { rows, formatifCols, portfolioCols, slmCols, className } = await prepareScoreMatrix(classId, subject, year, semester, months);

            // Construct Headers
            const headerTexts = ['No', 'Nama Siswa'];
            formatifCols.forEach(c => headerTexts.push(c.title));
            slmCols.forEach(c => headerTexts.push(`S:${c.title}`));
            headerTexts.push('STS', 'SAS');
            portfolioCols.forEach(c => headerTexts.push(`P:${c.title}`));
            headerTexts.push('Rata²');

            const tableRows = [
                new TableRow({
                    children: headerTexts.map(text =>
                        new TableCell({
                            children: [new Paragraph({ text, alignment: AlignmentType.CENTER, style: "Header" })],
                            shading: { fill: "22A085", color: "auto" }, // Green
                            verticalAlign: AlignmentType.CENTER,
                        })
                    ),
                }),
                ...rows.map(item => {
                    const cells = [
                        new TableCell({ children: [new Paragraph({ text: String(item.no), alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph(item.name)] }),
                    ];

                    // Formatif
                    formatifCols.forEach((col, idx) => cells.push(new TableCell({ children: [new Paragraph({ text: item.formatif[idx] !== undefined ? String(item.formatif[idx]) : '-', alignment: AlignmentType.CENTER })] })));
                    // SLM
                    slmCols.forEach((col, idx) => cells.push(new TableCell({ children: [new Paragraph({ text: item.slm[idx] !== undefined ? String(item.slm[idx]) : '-', alignment: AlignmentType.CENTER })] })));
                    // STS & SAS
                    cells.push(new TableCell({ children: [new Paragraph({ text: item.sts !== undefined ? String(item.sts) : '-', alignment: AlignmentType.CENTER })] }));
                    cells.push(new TableCell({ children: [new Paragraph({ text: item.sas !== undefined ? String(item.sas) : '-', alignment: AlignmentType.CENTER })] }));
                    // Portfolio
                    portfolioCols.forEach((col, idx) => cells.push(new TableCell({ children: [new Paragraph({ text: item.portfolio[idx] !== undefined ? String(item.portfolio[idx]) : '-', alignment: AlignmentType.CENTER })] })));
                    // Average
                    cells.push(new TableCell({ children: [new Paragraph({ text: String(item.average), alignment: AlignmentType.CENTER })] }));

                    return new TableRow({ children: cells });
                }),
            ];

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            size: { orientation: "landscape" } // Landscape for wide tables
                        }
                    },
                    children: [
                        new Paragraph({ text: "LEGER NILAI MATA PELAJARAN", heading: "Heading1", alignment: AlignmentType.CENTER }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: `Mapel: ${subject} | Kelas: ${className}` }),
                                new TextRun({ text: year ? ` | Tahun: ${year}` : '' }),
                                new TextRun({
                                    text: (months && months.length > 0)
                                        ? ` | Bulan: ${months.sort((a, b) => a - b).map(m => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m]).join(',')}`
                                        : (semester === 'ODD' ? ' | Sem. Ganjil' : (semester === 'EVEN' ? ' | Sem. Genap' : ''))
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),
                        new Table({
                            rows: tableRows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "Guru Mata Pelajaran", alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `( ${storageService.getUser()?.name || '___________________'} )`, alignment: AlignmentType.RIGHT }),
                    ],
                }],
            });

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, `Leger_${className}_${subject}.docx`);
            });
        }
    },

    // --- KONSELING ---
    counseling: {
        toPDF: async (year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
            let data = await storageService.getCounselingSessions();
            data = filterByDate(data, 'date', year, month, semester);

            const students = await storageService.getStudents();
            const getStdName = (id: string) => students.find(s => s.id === id)?.name || id;
            const user = storageService.getUser();
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.text("LAPORAN BIMBINGAN KONSELING SISWA", 105, 15, { align: 'center' });

            doc.setFontSize(10);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            let periodStr = "";
            if (Array.isArray(month) && month.length > 0) {
                periodStr = `${year} (${month.sort((a, b) => a - b).map(m => monthNames[m]).join(', ')})`;
            } else if (!Array.isArray(month) && month !== -1) {
                periodStr = new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            } else {
                periodStr = `${year} ${semester === 'ODD' ? '(Ganjil)' : (semester === 'EVEN' ? '(Genap)' : '')}`;
            }
            doc.text(`Periode: ${periodStr}`, 105, 20, { align: 'center' });

            doc.setLineWidth(0.5);
            doc.line(14, 25, 196, 25);

            const tableData = data.map(s => [
                formatDateShort(s.date),
                getStdName(s.studentId),
                s.type,
                s.notes,
                s.followUp || '-'
            ]);

            autoTable(doc, {
                startY: 25,
                head: [['Tanggal', 'Siswa', 'Masalah/Topik', 'Catatan', 'Tindak Lanjut']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [192, 57, 43], textColor: 255, halign: 'center', fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 25, halign: 'center' },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 30 },
                    3: { halign: 'justify' },
                    4: { halign: 'justify' }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 15;
            const xPos = doc.internal.pageSize.getWidth() - 60;
            const yPos = finalY > 250 ? 20 : finalY;

            doc.setFontSize(11);
            doc.text(`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, xPos, yPos, { align: 'center' });
            doc.text("Guru BK / Konselor", xPos, yPos + 6, { align: 'center' });
            doc.text(`( ${user?.name || '___________________'} )`, xPos, yPos + 25, { align: 'center' });

            doc.save("Laporan_BK.pdf");
        },
        toExcel: async (year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
            let data = await storageService.getCounselingSessions();
            data = filterByDate(data, 'date', year, month, semester);

            const students = await storageService.getStudents();
            const getStdName = (id: string) => students.find(s => s.id === id)?.name || id;
            const user = storageService.getUser();

            const formattedData = data.map(s => ({
                Tanggal: s.date, Siswa: getStdName(s.studentId), Jenis: s.type,
                Catatan: s.notes, 'Rencana Tindak Lanjut': s.followUp, Private: s.isPrivate ? 'Ya' : 'Tidak'
            }));
            const ws = XLSX.utils.json_to_sheet(formattedData);
            const startRow = formattedData.length + 4;
            XLSX.utils.sheet_add_aoa(ws, [
                [`..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
                ["Guru BK / Konselor"],
                [""],
                [""],
                [`( ${user?.name || '___________________'} )`]
            ], { origin: `E${startRow}` });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Konseling");
            XLSX.writeFile(wb, "Data_Konseling.xlsx");
        },
        toDocx: async (year: number, month: number | number[], semester: 'ALL' | 'ODD' | 'EVEN') => {
            let data = await storageService.getCounselingSessions();
            data = filterByDate(data, 'date', year, month, semester);

            const students = await storageService.getStudents();
            const getStdName = (id: string) => students.find(s => s.id === id)?.name || id;
            const user = storageService.getUser();

            const tableRows = [
                new TableRow({
                    children: ["Tanggal", "Siswa", "Masalah/Topik", "Catatan", "Tindak Lanjut"].map(text =>
                        new TableCell({
                            children: [new Paragraph({ text, alignment: AlignmentType.CENTER, style: "Header" })],
                            shading: { fill: "C0392B", color: "auto" }, // Red
                            verticalAlign: AlignmentType.CENTER,
                        })
                    ),
                }),
                ...data.map(s =>
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: formatDateShort(s.date), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph(getStdName(s.studentId))] }),
                            new TableCell({ children: [new Paragraph(s.type)] }),
                            new TableCell({ children: [new Paragraph(s.notes)] }),
                            new TableCell({ children: [new Paragraph(s.followUp || '-')] }),
                        ],
                    })
                ),
            ];

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const periodStr = Array.isArray(month) && month.length > 0
                ? `${year} (${month.sort((a, b) => a - b).map(m => monthNames[m]).join(', ')})`
                : (!Array.isArray(month) && month !== -1
                    ? new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })
                    : year + (semester === 'ODD' ? ' (Ganjil)' : (semester === 'EVEN' ? ' (Genap)' : '')));

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ text: "LAPORAN BIMBINGAN KONSELING SISWA", heading: "Heading1", alignment: AlignmentType.CENTER }),
                        new Paragraph({ text: `Periode: ${periodStr}`, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                        new Table({
                            rows: tableRows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `..................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "Guru BK / Konselor", alignment: AlignmentType.RIGHT }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: `( ${user?.name || '___________________'} )`, alignment: AlignmentType.RIGHT }),
                    ],
                }],
            });

            Packer.toBlob(doc).then(blob => {
                saveAs(blob, "Laporan_BK.docx");
            });
        }
    }
};