import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

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
    constraints: FieldConstraints;
    options?: FieldOption[];
    inputMode?: string | null;
    autoCapitalize?: string | null;
}

interface FieldEditorModalProps {
    field: FieldConfig;
    onSave: (updates: Partial<FieldConfig>) => void;
    onClose: () => void;
    saving: boolean;
}

const FieldEditorModal: React.FC<FieldEditorModalProps> = ({ field, onSave, onClose, saving }) => {
    const [formData, setFormData] = useState({
        label: field.label,
        required: field.required,
        maxLength: field.constraints.maxLength ?? '',
        minLength: field.constraints.minLength ?? '',
        max: field.constraints.max ?? '', // For number fields (charges)
    });

    // Handle input changes
    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Save changes
    const handleSave = () => {
        const updates: Partial<FieldConfig> = {
            label: formData.label,
            required: formData.required,
            constraints: {
                ...field.constraints,
                maxLength: formData.maxLength ? Number(formData.maxLength) : null,
                minLength: formData.minLength ? Number(formData.minLength) : null,
                max: formData.max ? Number(formData.max) : null, // Save max for number fields
            },
        };
        onSave(updates);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Edit Field</h3>
                        <p className="text-sm text-blue-100 font-mono">Field ID: {field.fieldId}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                        <input
                            type="text"
                            value={formData.label}
                            onChange={e => handleChange('label', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter field label"
                        />
                    </div>

                    {/* Min/Max Length (for text fields) */}
                    {field.type === 'text' || field.type === 'textarea' || field.type === 'email' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Min Length</label>
                                <input
                                    type="number"
                                    value={formData.minLength}
                                    onChange={e => handleChange('minLength', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 1"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Max Length</label>
                                <input
                                    type="number"
                                    value={formData.maxLength}
                                    onChange={e => handleChange('maxLength', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 60"
                                    min="0"
                                />
                            </div>
                        </div>
                    ) : null}

                    {/* Max Value (for number fields - charges) */}
                    {field.type === 'number' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Max Value (Auto-Clamp Limit)
                            </label>
                            <input
                                type="number"
                                value={formData.max}
                                onChange={e => handleChange('max', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 100000"
                                min="0"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Values entered by vendors will be automatically clamped to this maximum
                            </p>
                        </div>
                    ) : null}

                    {/* Required Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.required}
                                onChange={e => handleChange('required', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <span className="text-sm font-medium text-slate-700">Required Field</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FieldEditorModal;
