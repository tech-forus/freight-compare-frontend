import React, { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { Pencil, Trash2, RotateCcw, History, CheckCircle, XCircle, ChevronRight, FileCode } from 'lucide-react';
import FieldEditorModal from '../components/FieldEditorModal';
import AdminLayout from '../components/admin/AdminLayout';
import { API_BASE_URL } from '../config/api';

// API base URL
const API_BASE = API_BASE_URL;

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
    enabled?: boolean;
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
    company: 'Company & Contact',
    transport: 'Transport Config',
    charges: 'Charges & Pricing',
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

    // Toggle transport mode enabled/disabled
    const handleToggleTransportMode = async (modeValue: string, enabled: boolean) => {
        const transportModeField = config?.fields.find(f => f.fieldId === 'transportMode');
        if (!transportModeField) return;

        // Update options with the new enabled state
        const updatedOptions = (transportModeField.options || []).map(opt =>
            opt.value === modeValue ? { ...opt, enabled } : opt
        );

        await handleUpdateField('transportMode', { options: updatedOptions });
    };

    // Get transport mode field for special rendering
    const transportModeField = config?.fields.find(f => f.fieldId === 'transportMode' && f.section === 'transport');

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

    return (
        <AdminLayout
            title="Form Builder"
            subtitle="Customize the 'Add Vendor' form fields and configurations."
        >
            <div className="flex flex-col h-[calc(100vh-140px)]">
                {/* 
                   AdminLayout adds padding, so we might need to adjust height if we want full scroll. 
                   But AdminLayout usually handles content scrolling. 
                   We'll just make this a flex container. 
                */}

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(['company', 'transport', 'charges'] as const).map((section) => (
                            <button
                                key={section}
                                onClick={() => setActiveSection(section)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSection === section
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {SECTION_LABELS[section]}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={openHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                        >
                            <History size={16} />
                            Change Log
                        </button>
                        <a
                            href="/addvendor"
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <FileCode size={16} />
                            Preview Form
                        </a>
                    </div>
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={18} />
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                        <XCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-auto custom-scrollbar pb-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-2"></div>
                            <p>Loading configuration...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Main Fields List */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Special Transport UI */}
                                {activeSection === 'transport' && transportModeField && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-slate-800">Transport Modes</h3>
                                            <p className="text-sm text-slate-500">
                                                Enable available modes for vendors.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(transportModeField.options || []).map((opt) => (
                                                <div
                                                    key={opt.value}
                                                    className={`rounded-xl border p-4 transition-all ${opt.enabled !== false
                                                        ? 'border-emerald-200 bg-emerald-50/50'
                                                        : 'border-slate-200 bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${opt.enabled !== false
                                                                ? 'bg-emerald-100 text-emerald-600'
                                                                : 'bg-slate-200 text-slate-500'
                                                                }`}>
                                                                {opt.value === 'road' && '🚛'}
                                                                {opt.value === 'air' && '✈️'}
                                                                {opt.value === 'rail' && '🚆'}
                                                                {opt.value === 'ship' && '🚢'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-slate-800">{opt.label}</h4>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleToggleTransportMode(opt.value, opt.enabled === false)}
                                                            disabled={saving}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${opt.enabled !== false
                                                                ? 'bg-emerald-500'
                                                                : 'bg-slate-300'
                                                                } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${opt.enabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fields Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(activeSection === 'transport' ? currentFields.filter(f => f.fieldId !== 'transportMode') : currentFields).map((field) => (
                                        <div
                                            key={field.fieldId}
                                            className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{field.label}</h4>
                                                    <code className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{field.fieldId}</code>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditor(field)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteField(field.fieldId)}
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap text-sm">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${field.required
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                    {field.required ? 'Required' : 'Optional'}
                                                </span>
                                                <span className="text-xs text-slate-400 capitalize">{field.type}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sidebar / Info Column */}
                            <div className="space-y-6">
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                                    <h3 className="font-bold text-slate-800 mb-2">Editor Guide</h3>
                                    <ul className="space-y-3 text-sm text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <span>Fields are grouped by the section they appear in on the form.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <span>Use the toggle buttons to switch between sections.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <span>Changes are applied immediately but might take a moment to propagate to the live form.</span>
                                        </li>
                                    </ul>
                                </div>

                                {hiddenFields.length > 0 && (
                                    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5 opacity-75 hover:opacity-100 transition-opacity">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Trash2 size={16} className="text-slate-400" />
                                            Deleted Fields
                                        </h3>
                                        <div className="space-y-2">
                                            {hiddenFields.map(field => (
                                                <div key={field.fieldId} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                                                    <span className="text-slate-600 line-through">{field.label}</span>
                                                    <button
                                                        onClick={() => handleRestoreField(field.fieldId)}
                                                        className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHistory(false)}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">Change History</h3>
                                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
                                        <History size={32} className="mb-2 opacity-20" />
                                        <p>No history available</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history.map((entry, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-2 h-2 rounded-full mt-2 ${entry.action === 'edit' ? 'bg-blue-500' :
                                                        entry.action === 'delete' ? 'bg-red-500' :
                                                            'bg-emerald-500'
                                                        }`} />
                                                    {idx !== history.length - 1 && <div className="w-px h-full bg-slate-200 my-1" />}
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${entry.action === 'edit' ? 'bg-blue-100 text-blue-700' :
                                                            entry.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                                'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                            {entry.action}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(entry.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-800 font-medium">{entry.fieldId}</p>
                                                    <p className="text-xs text-slate-500 mt-1">by {entry.userName || 'Unknown'}</p>
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
        </AdminLayout>
    );
};

export default FormBuilderPage;
