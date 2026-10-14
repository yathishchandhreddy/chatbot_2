import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Building,
  GraduationCap,
  Users,
  Calendar,
  FileQuestion,
  Home,
  Bus,
  Briefcase,
  Bell,
  FolderOpen,
  Database,
  CheckCircle,
  Settings,
  Plus,
  Search,
  Edit3,
  Trash2,
  ArrowLeft,
  FileCheck2,
  Sparkles,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Download,
  HardDrive,
} from 'lucide-react';
import { PenguinMascot } from '../PenguinMascot';
import { RecordEditorModal } from './RecordEditorModal';
import { DocumentLibrary } from './DocumentLibrary';
import {
  CollegeSourceRecord,
  AdminUserProfile,
  InformationCategory,
  DocumentUploadItem,
} from '../../types/collegeSource';

interface AdminDashboardProps {
  adminProfile: AdminUserProfile;
  onLogout: () => void;
  onBackToChat: () => void;
}

export type AdminSection =
  | 'overview'
  | 'add_record'
  | 'source_records'
  | 'quick_add'
  | 'college_profile'
  | 'departments'
  | 'faculty'
  | 'admissions'
  | 'academic_calendar'
  | 'examinations'
  | 'hostel'
  | 'transport'
  | 'placements'
  | 'notices'
  | 'document_library'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminProfile,
  onLogout,
  onBackToChat,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [records, setRecords] = useState<CollegeSourceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentUploadItem[]>([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    verifiedRecords: 0,
    totalDocuments: 0,
  });
  const [systemInfo, setSystemInfo] = useState({
    institution: 'V.S.B. Engineering College, Karur',
    storageBackend: 'Live Dataset Memory (Direct Publish)',
    isSupabaseConnected: false,
    environment: 'development',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  // Quick batch add state
  const [batchCategory, setBatchCategory] = useState<InformationCategory>('COLLEGE_OVERVIEW');
  const [batchText, setBatchText] = useState('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Single record add state
  const [singleCategory, setSingleCategory] = useState<InformationCategory>('COLLEGE_OVERVIEW');
  const [singleTitle, setSingleTitle] = useState('');
  const [singleContent, setSingleContent] = useState('');
  const [singleSourceRef, setSingleSourceRef] = useState('Campus Office Record');
  const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<CollegeSourceRecord | null>(null);

  // Excel file upload ref and loading state
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [isExcelLoading, setIsExcelLoading] = useState(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Safe error extraction helper (never crashes on 404/HTML responses)
  const getSafeErrorMessage = async (res: Response, fallback: string): Promise<string> => {
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const errData = await res.json();
        if (errData?.error && typeof errData.error === 'string' && errData.error.trim()) {
          return errData.error;
        }
      } else {
        const text = await res.text();
        if (text && text.trim().length > 0 && text.trim().length < 200) {
          return text.trim();
        }
      }
    } catch {
      // ignore
    }
    return `${fallback} (HTTP ${res.status})`;
  };

  // Fetch records and overview
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${adminProfile.sessionToken}`,
      };

      const [overviewRes, recordsRes, docsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/records', { headers }),
        fetch('/api/admin/documents', { headers }),
      ]);

      if (overviewRes.ok && overviewRes.headers.get('content-type')?.includes('application/json')) {
        const data = await overviewRes.json();
        setStats(data.stats);
        setSystemInfo(data.system);
      }

      if (recordsRes.ok && recordsRes.headers.get('content-type')?.includes('application/json')) {
        const data = await recordsRes.json();
        setRecords(data.records);
      }

      if (docsRes.ok && docsRes.headers.get('content-type')?.includes('application/json')) {
        const data = await docsRes.json();
        setDocuments(data.documents);
      }
    } catch (err) {
      console.warn('Notice while fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminProfile.sessionToken]);

  // Handle Save Record (Direct Add or Update — No reviews!)
  const handleSaveRecord = async (recordData: Partial<CollegeSourceRecord>) => {
    setIsLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminProfile.sessionToken}`,
      };

      let res;
      if (recordToEdit) {
        res = await fetch(`/api/admin/records/${recordToEdit.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(recordData),
        });
      } else {
        res = await fetch('/api/admin/records', {
          method: 'POST',
          headers,
          body: JSON.stringify(recordData),
        });
      }

      if (!res.ok) {
        const errorMsg = await getSafeErrorMessage(res, 'Failed to save dataset record.');
        throw new Error(errorMsg);
      }

      setIsEditorOpen(false);
      setRecordToEdit(null);
      await fetchData();
      showNotification(recordToEdit ? 'Record updated successfully!' : 'New record added to dataset & live in AI!');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Error saving record');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Direct Record Deletion
  const handleDeleteRecord = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the dataset?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/records/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminProfile.sessionToken}`,
        },
      });

      if (!res.ok) {
        const errorMsg = await getSafeErrorMessage(res, 'Failed to delete record.');
        throw new Error(errorMsg);
      }

      await fetchData();
      showNotification(`Record "${title}" deleted.`);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Error deleting record');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Single Add Record Form Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle.trim() || !singleContent.trim()) {
      alert('Please fill in both the Title and Details fields.');
      return;
    }

    setIsSingleSubmitting(true);
    try {
      await handleSaveRecord({
        category: singleCategory,
        title: singleTitle.trim(),
        content: singleContent.trim(),
        sourceReference: singleSourceRef.trim() || 'Internal College Circular / Office Record',
        sourceOrganization: 'V.S.B. Engineering College',
        verificationNotes: 'Directly added to dataset.',
      });
      setSingleTitle('');
      setSingleContent('');
      setSingleSourceRef('Campus Office Record');
      setActiveSection('source_records');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Error saving dataset record.');
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  // Handle Quick Batch Import (paste multiple records or JSON)
  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;

    setIsBatchSubmitting(true);
    try {
      let itemsToImport: Array<{ title: string; content: string; category: InformationCategory }> = [];

      // Try parsing as JSON first
      try {
        const parsed = JSON.parse(batchText);
        if (Array.isArray(parsed)) {
          itemsToImport = parsed.map((item) => ({
            title: item.title || item.question || item.topic || 'Campus Detail',
            content: item.content || item.answer || item.details || JSON.stringify(item),
            category: item.category || batchCategory,
          }));
        }
      } catch {
        // Parse line-by-line format:
        // "Title: ... Content: ..." OR "Q: ... A: ..." OR Paragraph blocks separated by blank lines
        const blocks = batchText.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
        for (const block of blocks) {
          const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length === 0) continue;

          let title = lines[0].replace(/^(Title|Q|Question|Topic|Heading):\s*/i, '').trim();
          let content = lines.slice(1).join('\n').replace(/^(Content|A|Answer|Details):\s*/i, '').trim();

          if (!content) {
            // Single line block
            title = lines[0].substring(0, 50);
            content = lines[0];
          }

          itemsToImport.push({
            title,
            content,
            category: batchCategory,
          });
        }
      }

      if (itemsToImport.length === 0) {
        throw new Error('No valid dataset records could be parsed. Please check your text.');
      }

      const res = await fetch('/api/admin/records/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminProfile.sessionToken}`,
        },
        body: JSON.stringify({ records: itemsToImport }),
      });

      if (!res.ok) {
        const errorMsg = await getSafeErrorMessage(res, 'Failed to import batch records.');
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setBatchText('');
      await fetchData();
      showNotification(`Successfully added ${data.count || itemsToImport.length} records to the dataset!`);
      setActiveSection('source_records');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Import error');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (file: File, category: InformationCategory) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminProfile.sessionToken}`,
    };

    const payload = {
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category,
    };

    const res = await fetch('/api/admin/documents/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorMsg = await getSafeErrorMessage(res, 'Upload registration failed.');
      throw new Error(errorMsg);
    }

    await fetchData();
    showNotification(`File "${file.name}" uploaded to Document Library.`);
  };

  // Handle Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      showNotification('Generating Excel spreadsheet (.xlsx)...');
      const res = await fetch('/api/admin/records/export/excel', {
        headers: {
          Authorization: `Bearer ${adminProfile.sessionToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to generate Excel export.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VSB_College_Dataset_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('Excel spreadsheet (.xlsx) downloaded successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Error exporting to Excel');
    }
  };

  // Handle Export to CSV
  const handleExportCsv = async () => {
    try {
      showNotification('Generating CSV file...');
      const res = await fetch('/api/admin/records/export/csv', {
        headers: {
          Authorization: `Bearer ${adminProfile.sessionToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to generate CSV export.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VSB_College_Dataset_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('CSV file downloaded successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Error exporting to CSV');
    }
  };

  // Handle Download Excel Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/admin/records/template/excel', {
        headers: {
          Authorization: `Bearer ${adminProfile.sessionToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to download template.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'VSB_College_Dataset_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('Excel template (.xlsx) downloaded!');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Error downloading template');
    }
  };

  // Handle Upload Excel File (.xlsx, .xls, .csv)
  const handleUploadExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExcelLoading(true);
    showNotification(`Reading & importing "${file.name}" into dataset...`);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = event.target?.result;
          let payload: Record<string, unknown> = {};

          if (file.name.endsWith('.csv')) {
            payload = {
              csvText: result as string,
              filename: file.name,
              defaultCategory: batchCategory,
            };
          } else {
            const base64 = (result as string).split(',')[1];
            payload = {
              fileBase64: base64,
              filename: file.name,
              defaultCategory: batchCategory,
            };
          }

          const res = await fetch('/api/admin/records/import/excel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminProfile.sessionToken}`,
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errorMsg = await getSafeErrorMessage(res, 'Failed to import Excel file.');
            throw new Error(errorMsg);
          }

          const data = await res.json();
          await fetchData();
          showNotification(`Success! ${data.count} records imported from Excel & auto-saved permanently to disk!`);
          setActiveSection('source_records');
        } catch (innerErr: unknown) {
          const error = innerErr as Error;
          alert(error.message || 'Error importing Excel sheet');
        } finally {
          setIsExcelLoading(false);
          if (excelInputRef.current) {
            excelInputRef.current.value = '';
          }
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setIsExcelLoading(false);
      alert(error.message || 'Failed reading file');
    }
  };

  // Filtered records for current display
  const getFilteredRecords = (categoryOverride?: InformationCategory | InformationCategory[]) => {
    return records.filter((r) => {
      if (categoryOverride) {
        if (Array.isArray(categoryOverride)) {
          if (!categoryOverride.includes(r.category)) return false;
        } else {
          if (r.category !== categoryOverride) return false;
        }
      } else if (categoryFilter !== 'ALL' && r.category !== categoryFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }

      return true;
    });
  };

  // Navigation Items
  const NAV_ITEMS: Array<{ id: AdminSection; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'overview', label: 'Dataset Overview', icon: LayoutDashboard },
    { id: 'add_record', label: '➕ Add Dataset Record', icon: Plus },
    { id: 'source_records', label: 'All Dataset Records', icon: Database, badge: records.length },
    { id: 'quick_add', label: '⚡ Quick Add / Batch', icon: Sparkles },
    { id: 'document_library', label: 'Document Library', icon: FolderOpen, badge: documents.length },
    { id: 'college_profile', label: 'College Profile', icon: Building },
    { id: 'departments', label: 'Departments', icon: GraduationCap },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'admissions', label: 'Admissions', icon: FileQuestion },
    { id: 'academic_calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'examinations', label: 'Examinations (COE)', icon: FileCheck2 },
    { id: 'hostel', label: 'Hostel Info', icon: Home },
    { id: 'transport', label: 'Transport & Buses', icon: Bus },
    { id: 'placements', label: 'Placements', icon: Briefcase },
    { id: 'notices', label: 'Notices & Circulars', icon: Bell },
    { id: 'settings', label: 'Settings & Status', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Admin Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Brand header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center p-1 border border-slate-700">
              <PenguinMascot size="sm" animated={false} interactive={false} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white font-heading tracking-tight">PING Admin</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded">
                  DATASET
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">V.S.B. Engineering College</p>
            </div>
          </div>
        </div>

        {/* Quick Add Button in Sidebar */}
        <div className="p-3">
          <button
            onClick={() => {
              setRecordToEdit(null);
              setActiveSection('add_record');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Dataset Record</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-sky-800 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile & actions footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{adminProfile.name}</p>
              <p className="text-[10px] text-sky-400 truncate">{adminProfile.email}</p>
            </div>
            <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
              ADMIN
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onBackToChat}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Return to Student Chat"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Student Chat</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 text-xs font-semibold rounded-xl border border-rose-800/50 transition-colors cursor-pointer"
              title="Log Out"
            >
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-extrabold text-slate-900 font-heading">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label || 'Dataset Management'}
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              <span>Direct Publishing Active</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Hidden file input for Excel upload */}
            <input
              type="file"
              ref={excelInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleUploadExcelFile}
              className="hidden"
            />

            <button
              onClick={handleExportExcel}
              className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Download entire dataset as Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={isExcelLoading}
              className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/80 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Import spreadsheet (.xlsx / .xls / .csv) directly into dataset"
            >
              <Upload className="w-3.5 h-3.5 text-purple-600" />
              <span>{isExcelLoading ? 'Importing...' : 'Import Excel'}</span>
            </button>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Refresh dataset"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setRecordToEdit(null);
                setIsEditorOpen(true);
              }}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        </header>

        {/* Floating Notification */}
        {notification && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-900 text-emerald-100 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Active Dataset Records
                    </span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{records.length}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      ✓ 100% Live in PING AI Chat
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Reference Files
                    </span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{documents.length}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">PDF, CSV, XLSX, JSON</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Publishing Mode
                    </span>
                    <p className="text-lg font-black text-slate-900 mt-1">Direct & Simplified</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">No reviews or approval bottlenecks</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Fast Action Card */}
              <div className="p-5 bg-gradient-to-r from-sky-900 to-indigo-950 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-white">Direct Dataset Ingestion</h3>
                  <p className="text-xs text-sky-200 mt-1 max-w-xl leading-relaxed">
                    Any information you add (bus routes, fee rules, course cutoffs, hostel timings) is immediately incorporated into PING AI responses for students. No approval review steps required.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveSection('quick_add')}
                    className="py-2 px-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick Batch Paste</span>
                  </button>
                  <button
                    onClick={() => {
                      setRecordToEdit(null);
                      setIsEditorOpen(true);
                    }}
                    className="py-2 px-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Single Record</span>
                  </button>
                </div>
              </div>

              {/* Persistent Excel & Storage Card */}
              <div className="p-5 bg-white border border-emerald-200/90 rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-slate-900 font-heading">
                          Excel & Persistent Disk Storage
                        </h3>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                          AUTO-SAVED
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Every dataset item you add is permanently saved in Excel (<code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded text-[11px]">data/college_records.xlsx</code>), CSV, and JSON on the server. Data will never be lost or deleted on restarts.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={handleExportExcel}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download the full dataset as an Excel file (.xlsx)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Excel</span>
                    </button>

                    <button
                      onClick={handleExportCsv}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download the dataset as CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>CSV</span>
                    </button>

                    <button
                      onClick={() => excelInputRef.current?.click()}
                      disabled={isExcelLoading}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Upload an Excel spreadsheet to add records"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isExcelLoading ? 'Importing...' : 'Upload Excel'}</span>
                    </button>

                    <button
                      onClick={handleDownloadTemplate}
                      className="px-3 py-1.5 text-sky-700 hover:text-sky-800 hover:underline text-xs font-semibold cursor-pointer"
                      title="Download pre-formatted Excel template"
                    >
                      Template (.xlsx)
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Records List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Active College Dataset Records ({records.length})
                  </h3>
                  <button
                    onClick={() => setActiveSection('source_records')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                  >
                    View & Search All Records →
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {records.slice(0, 8).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-slate-400">{rec.id}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-bold text-slate-700">{rec.category}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{rec.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                          {rec.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                        <button
                          onClick={() => {
                            setRecordToEdit(rec);
                            setIsEditorOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id, rec.title)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: ADD DATASET RECORD FORM */}
          {activeSection === 'add_record' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-3xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading">
                    Add Dataset Record
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter official campus information to add it directly to PING AI knowledge base.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Direct Publish</span>
                </span>
              </div>

              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Information Category *
                  </label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value as InformationCategory)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500 font-medium"
                  >
                    <option value="COLLEGE_OVERVIEW">1. College Overview & History</option>
                    <option value="OFFICIAL_ADDRESS_LOCATION">2. Official Address and Location</option>
                    <option value="CONTACT_DETAILS">3. Contact Details & Helpdesk</option>
                    <option value="DEPARTMENTS_PROGRAMMES">4. Departments and Programmes</option>
                    <option value="ADMISSIONS_ELIGIBILITY">5. Admissions & Eligibility (TNEA)</option>
                    <option value="ACADEMIC_CALENDAR">6. Academic Calendar & Term Dates</option>
                    <option value="EXAMINATION_INFO">7. Examination Information (COE)</option>
                    <option value="FACULTY_DEPARTMENT_CONTACTS">8. Faculty & Department Desks</option>
                    <option value="CAMPUS_FACILITIES">9. Campus Facilities & Utilities</option>
                    <option value="LIBRARY_FACILITIES">10. Library Facilities & Working Hours</option>
                    <option value="HOSTEL_INFO">11. Hostel Information (Men & Women)</option>
                    <option value="TRANSPORT_INFO">12. Transport & Bus Routes</option>
                    <option value="SCHOLARSHIPS_FINANCIAL_AID">13. Scholarships & Financial Aid</option>
                    <option value="PLACEMENT_CAREER_SERVICES">14. Placement & Career Services</option>
                    <option value="OFFICIAL_NOTICES">15. Official Notices & Circulars</option>
                    <option value="FREQUENTLY_ASKED_QUESTIONS">16. Frequently Asked Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Topic / Subject Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleTitle}
                    onChange={(e) => setSingleTitle(e.target.value)}
                    placeholder="e.g., Bus Route 14 Timings, B.E. Computer Science Intake, Hostel Mess Hours"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Factual Information / Record Details *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={singleContent}
                    onChange={(e) => setSingleContent(e.target.value)}
                    placeholder="Type or paste the official college information here. PING uses this exact record when answering students."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department / Source Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={singleSourceRef}
                    onChange={(e) => setSingleSourceRef(e.target.value)}
                    placeholder="e.g., Transport Office, HOD Desk, Principal Office Circular"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Saved directly to server disk & Excel store.
                  </span>

                  <button
                    type="submit"
                    disabled={isSingleSubmitting || !singleTitle.trim() || !singleContent.trim()}
                    className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSingleSubmitting ? 'Publishing...' : 'Save Record to Dataset'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION: QUICK ADD / BULK BATCH IMPORT */}
          {activeSection === 'quick_add' && (
            <div className="space-y-6">
              {/* Method 1: Excel / CSV File Upload */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 font-heading">
                          Method 1: Upload Excel Spreadsheet (.xlsx / .csv)
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                          FASTEST
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Upload any Excel sheet with campus facts, Q&A pairs, or bus/hostel/admission details. Rows are instantly verified, published to AI, and permanently saved to disk.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template (.xlsx)</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 border-t border-emerald-100">
                  <button
                    type="button"
                    onClick={() => excelInputRef.current?.click()}
                    disabled={isExcelLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isExcelLoading ? 'Importing Excel Sheet...' : 'Select Excel File (.xlsx / .csv)'}</span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Auto-saved directly to server storage. Once uploaded, data is never deleted!
                  </span>
                </div>
              </div>

              {/* Method 2: Direct Text / JSON Paste */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                    Method 2: Paste Facts, Text Blocks, or JSON
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Paste text blocks or Q&A items below. They will be immediately parsed, added to the live PING AI college dataset, and saved into the persistent Excel store.
                  </p>
                </div>

                <form onSubmit={handleBatchImport} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target College Category
                    </label>
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value as InformationCategory)}
                      className="w-full sm:w-80 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500"
                    >
                      <option value="COLLEGE_OVERVIEW">College Overview & History</option>
                      <option value="OFFICIAL_ADDRESS_LOCATION">Official Address and Location</option>
                      <option value="CONTACT_DETAILS">Contact Details & Helpdesk</option>
                      <option value="DEPARTMENTS_PROGRAMMES">Departments and Programmes</option>
                      <option value="ADMISSIONS_ELIGIBILITY">Admissions & Eligibility (TNEA)</option>
                      <option value="ACADEMIC_CALENDAR">Academic Calendar & Term Dates</option>
                      <option value="EXAMINATION_INFO">Examination Information (COE)</option>
                      <option value="FACULTY_DEPARTMENT_CONTACTS">Faculty & Department Contacts</option>
                      <option value="CAMPUS_FACILITIES">Campus Facilities & Utilities</option>
                      <option value="LIBRARY_FACILITIES">Library Facilities & Working Hours</option>
                      <option value="HOSTEL_INFO">Hostel Information (Men & Women)</option>
                      <option value="TRANSPORT_INFO">Transport & Bus Routes</option>
                      <option value="SCHOLARSHIPS_FINANCIAL_AID">Scholarships & Financial Aid</option>
                      <option value="PLACEMENT_CAREER_SERVICES">Placement & Career Services</option>
                      <option value="OFFICIAL_NOTICES">Official Notices & Circulars</option>
                      <option value="FREQUENTLY_ASKED_QUESTIONS">Frequently Asked Questions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paste Data (Text blocks, Q&A pairs, or JSON array)
                    </label>
                    <textarea
                      rows={10}
                      required
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      placeholder={`Example format 1 (Simple blocks separated by empty lines):\nTitle: College Bus Route 7\nContent: Bus Route 7 runs from Dindigul Central Bus Stand via Vedasandur to V.S.B. Campus. Morning pickup 6:50 AM.\n\nTitle: Department of Artificial Intelligence & Data Science\nContent: Established in 2021 with approved intake of 120 students. Focuses on Machine Learning and Cloud Computing.\n\nOr paste JSON: [{"title": "...", "content": "..."}]`}
                      className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Entries are active immediately after clicking Import.
                    </span>

                    <button
                      type="submit"
                      disabled={isBatchSubmitting || !batchText.trim()}
                      className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isBatchSubmitting ? 'Importing...' : 'Add All to Dataset'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SECTION: ALL SOURCE RECORDS */}
          {activeSection === 'source_records' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, keywords, or content..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden shadow-xs"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="COLLEGE_OVERVIEW">Overview</option>
                    <option value="DEPARTMENTS_PROGRAMMES">Departments</option>
                    <option value="ADMISSIONS_ELIGIBILITY">Admissions</option>
                    <option value="EXAMINATION_INFO">Examinations</option>
                    <option value="HOSTEL_INFO">Hostel</option>
                    <option value="TRANSPORT_INFO">Transport</option>
                    <option value="PLACEMENT_CAREER_SERVICES">Placements</option>
                    <option value="OFFICIAL_NOTICES">Notices</option>
                  </select>

                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Export all records as Excel spreadsheet (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="hidden md:inline">Export Excel</span>
                  </button>

                  <button
                    onClick={() => excelInputRef.current?.click()}
                    disabled={isExcelLoading}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/90 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Upload Excel spreadsheet to add records"
                  >
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span className="hidden md:inline">{isExcelLoading ? 'Importing...' : 'Upload Excel'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setRecordToEdit(null);
                      setIsEditorOpen(true);
                    }}
                    className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Record</span>
                  </button>
                </div>
              </div>

              {/* Records List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {getFilteredRecords().map((rec) => (
                  <div
                    key={rec.id}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-slate-400">{rec.id}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md">
                          {rec.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3 mt-1 leading-relaxed">
                        {rec.content}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
                        <span>Source: {rec.sourceReference || rec.sourceOrganization || 'Campus Admin'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setRecordToEdit(rec);
                          setIsEditorOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec.id, rec.title)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {getFilteredRecords().length === 0 && (
                  <div className="p-12 text-center text-xs text-slate-500">
                    No matching records found. Click &quot;New Record&quot; or &quot;Quick Add&quot; to add data.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: CATEGORY-SPECIFIC VIEWS */}
          {['college_profile', 'departments', 'faculty', 'admissions', 'academic_calendar', 'examinations', 'hostel', 'transport', 'placements', 'notices'].includes(activeSection) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    {activeSection.replace(/_/g, ' ').toUpperCase()} RECORDS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live campus records for this category.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setRecordToEdit(null);
                    setIsEditorOpen(true);
                  }}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Category</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                {(() => {
                  let cats: InformationCategory[] = [];
                  if (activeSection === 'college_profile') cats = ['COLLEGE_OVERVIEW', 'OFFICIAL_ADDRESS_LOCATION', 'CONTACT_DETAILS'];
                  if (activeSection === 'departments') cats = ['DEPARTMENTS_PROGRAMMES'];
                  if (activeSection === 'faculty') cats = ['FACULTY_DEPARTMENT_CONTACTS'];
                  if (activeSection === 'admissions') cats = ['ADMISSIONS_ELIGIBILITY'];
                  if (activeSection === 'academic_calendar') cats = ['ACADEMIC_CALENDAR'];
                  if (activeSection === 'examinations') cats = ['EXAMINATION_INFO'];
                  if (activeSection === 'hostel') cats = ['HOSTEL_INFO'];
                  if (activeSection === 'transport') cats = ['TRANSPORT_INFO'];
                  if (activeSection === 'placements') cats = ['PLACEMENT_CAREER_SERVICES'];
                  if (activeSection === 'notices') cats = ['OFFICIAL_NOTICES', 'REGULATIONS_POLICIES'];

                  const filtered = getFilteredRecords(cats);
                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No records under this category yet. Click &quot;Add to Category&quot; to create one.
                      </div>
                    );
                  }

                  return filtered.map((rec) => (
                    <div key={rec.id} className="p-5 space-y-2 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">{rec.id}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRecordToEdit(rec);
                              setIsEditorOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(rec.id, rec.title)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        {rec.content}
                      </p>
                      <div className="text-[11px] text-slate-400 pt-1">
                        Source: {rec.sourceReference || rec.sourceOrganization || 'Campus Admin'}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* SECTION: DOCUMENT LIBRARY */}
          {activeSection === 'document_library' && (
            <DocumentLibrary
              documents={documents}
              onUploadDocument={handleUploadDocument}
              isLoading={isLoading}
            />
          )}

          {/* SECTION: SETTINGS */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  System & Dataset Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-semibold">Admin Credentials</span>
                    <p className="font-bold text-slate-900">ID: admin@vsbec.edu.in | Pass: admin123</p>
                    <p className="text-[11px] text-slate-400">Timing-safe cryptographic auth active</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-semibold">Publishing Pipeline</span>
                    <p className="font-bold text-slate-900">Instant Direct Publishing</p>
                    <p className="text-[11px] text-slate-400">All added records are live in PING AI Chat</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Simplified Editor Modal (No URLs, direct publish) */}
      <RecordEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setRecordToEdit(null);
        }}
        recordToEdit={recordToEdit}
        onSaveRecord={handleSaveRecord}
        isLoading={isLoading}
      />
    </div>
  );
};
