import React, { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { Pencil, Trash2, RotateCcw, History, CheckCircle, XCircle } from 'lucide-react';
import FieldEditorModal from '../components/FieldEditorModal';

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Types
interface FieldConstraints {
    maxLength?: number | null;
    minLength?: number | null;
    min?: number | null;
    max?: number | null;
    step?: number | null;
    pattern?: string | null;
    patternMessage?: string | null;
}

interface FieldOption {
    value: string;
    label: string;
}

interface FieldConfig {
    fieldId: string;
    label: string;
    placeholder: string;
    type: string;
    required: boolean;
    visible: boolean;
    gridSpan: number;
    order: number;
    section?: 'company' | 'transport' | 'charges';
    constraints: FieldConstraints;
    options?: FieldOption[];
    inputMode?: string | null;
    autoCapitalize?: string | null;
    suffix?: string | null;
}

interface ChangeHistoryEntry {
    timestamp: string;
    userName: string;
    action: string;
    fieldId: string;
    before: any;
    after: any;
}

interface FormConfig {
    pageId: string;
    pageName: string;
    description: string;
    fields: FieldConfig[];
    changeHistory?: ChangeHistoryEntry[];
    lastModifiedAt?: string;
}

// Get auth token
const getAuthToken = (): string => {
    return Cookies.get('authToken') || localStorage.getItem('authToken') || localStorage.getItem('token') || '';
};

const SECTION_LABELS: Record<string, string> = {
    company: 'Company & Contact Information',
    transport: 'Transport & Volumetric Configuration',
    charges: 'Basic Charges',
};

const FormBuilderPage: React.FC = () => {
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedField, setSelectedField] = useState<FieldConfig | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<string>('company');

    const pageId = 'add-vendor';

    // Fetch full config (including hidden fields)
    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/form-config/${pageId}/full`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.success && result.data) {
                setConfig(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch config');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pageId]);

    // Fetch change history
    const fetchHistory = useCallback(async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/form-config/${pageId}/history?limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) setHistory(result.data || []);
            }
        } catch {
            // Silent fail for history
        }
    }, [pageId]);

    // Initial load
    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // Update a field
    const handleUpdateField = async (fieldId: string, updates: Partial<FieldConfig>) => {
        setSaving(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/form-config/${pageId}/field/${fieldId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            setSuccessMessage(`Field "${fieldId}" updated successfully!`);
            setTimeout(() => setSuccessMessage(null), 3000);

            // Refresh config
            await fetchConfig();
            setShowEditor(false);
            setSelectedField(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Delete a field
    const handleDeleteField = async (fieldId: string) => {
        if (!confirm(`Delete field "${fieldId}"? This will remove it from the Add Vendor form.`)) return;

        setSaving(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/form-config/${pageId}/field/${fieldId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            setSuccessMessage(`Field "${fieldId}" deleted!`);
            setTimeout(() => setSuccessMessage(null), 3000);

            // Refresh config
            await fetchConfig();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Restore a deleted field
    const handleRestoreField = async (fieldId: string) => {
        setSaving(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/form-config/${pageId}/field/${fieldId}/restore`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            setSuccessMessage(`Field "${fieldId}" restored!`);
            setTimeout(() => setSuccessMessage(null), 3000);

            // Refresh config
            await fetchConfig();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Open editor modal
    const openEditor = (field: FieldConfig) => {
        setSelectedField(field);
        setShowEditor(true);
    };

    // Open history panel
    const openHistory = () => {
        fetchHistory();
        setShowHistory(true);
    };

    // Visible and hidden fields
    const visibleFields = config?.fields.filter(f => f.visible !== false).sort((a, b) => a.order - b.order) || [];
    const hiddenFields = config?.fields.filter(f => f.visible === false) || [];

    // Group by section
    const fieldsBySection = {
        company: visibleFields.filter(f => f.section === 'company' || !f.section),
        transport: visibleFields.filter(f => f.section === 'transport'),
        charges: visibleFields.filter(f => f.section === 'charges'),
    };

    const currentFields = fieldsBySection[activeSection as keyof typeof fieldsBySection] || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Form Builder</h1>
                        <p className="text-sm text-slate-500">Customize Add Vendor form fields</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <History size={18} />
                            Change Log
                        </button>
                        <a
                            href="/addvendor"
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Preview Form
                        </a>
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="max-w-7xl mx-auto px-4 mt-4">
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <CheckCircle size={18} />
                        {successMessage}
                    </div>
                </div>
            )}
            {error && (
                <div className="max-w-7xl mx-auto px-4 mt-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <XCircle size={18} />
                        {error}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Sidebar - Sections */}
                    <div className="w-64 shrink-0">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sections</h3>
                            <div className="space-y-2">
                                {(['company', 'transport', 'charges'] as const).map((section) => (
                                    <button
                                        key={section}
                                        onClick={() => setActiveSection(section)}
                                        className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === section
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{SECTION_LABELS[section]}</span>
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                {fieldsBySection[section].length}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main - Field Grid */}
                    <div className="flex-1">
                        {/* Current Section Fields */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <CheckCircle size={20} className="text-green-500" />
                                {SECTION_LABELS[activeSection]} ({currentFields.length})
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {currentFields.map((field) => (
                                    <div
                                        key={field.fieldId}
                                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                                    >
                                        {/* Header: Label + Actions */}
                                        <div className="flex items-start justify-between mb-3">
                                            <h4 className="font-semibold text-slate-800">{field.label}</h4>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditor(field)}
                                                    disabled={saving}
                                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteField(field.fieldId)}
                                                    disabled={saving}
                                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Field ID */}
                                        <div className="text-xs text-slate-400 mb-2 font-mono">
                                            Field ID: {field.fieldId}
                                        </div>

                                        {/* Constraints: Min/Max + Required */}
                                        <div className="flex items-center gap-2 flex-wrap text-sm">
                                            {field.constraints.minLength != null && (
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                                                    Min: {field.constraints.minLength}
                                                </span>
                                            )}
                                            {field.constraints.maxLength != null && (
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                                                    Max: {field.constraints.maxLength}
                                                </span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded ${field.required ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {field.required ? 'Required' : 'Optional'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Deleted Fields */}
                        {hiddenFields.length > 0 && (
                            <div className="mt-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <XCircle size={20} className="text-red-400" />
                                    Deleted Fields ({hiddenFields.length})
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {hiddenFields.map((field) => (
                                        <div
                                            key={field.fieldId}
                                            className="bg-slate-50 rounded-xl border border-slate-200 p-4 opacity-60"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-slate-600 line-through">{field.label}</h4>
                                                    <div className="text-xs text-slate-400 font-mono">Field ID: {field.fieldId}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleRestoreField(field.fieldId)}
                                                    disabled={saving}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                                                >
                                                    <RotateCcw size={14} />
                                                    Restore
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Field Editor Modal */}
            {showEditor && selectedField && (
                <FieldEditorModal
                    field={selectedField}
                    onSave={(updates) => handleUpdateField(selectedField.fieldId, updates)}
                    onClose={() => {
                        setShowEditor(false);
                        setSelectedField(null);
                    }}
                    saving={saving}
                />
            )}

            {/* History Panel */}
            {showHistory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800">Change History</h3>
                            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {history.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No changes recorded yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((entry, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded ${entry.action === 'edit' ? 'bg-blue-100 text-blue-700' :
                                                    entry.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {entry.action}
                                                </span>
                                                <span className="text-sm font-medium text-slate-700">{entry.fieldId}</span>
                                                <span className="text-xs text-slate-400 ml-auto">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                by {entry.userName || 'Unknown'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormBuilderPage;
