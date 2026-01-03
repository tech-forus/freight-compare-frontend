import React, { useState, useEffect } from 'react';
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
        placeholder: field.placeholder,
        type: field.type,
        required: field.required,
        gridSpan: field.gridSpan,
        maxLength: field.constraints.maxLength ?? '',
        minLength: field.constraints.minLength ?? '',
        min: field.constraints.min ?? '',
        max: field.constraints.max ?? '',
        step: field.constraints.step ?? '',
        pattern: field.constraints.pattern ?? '',
        patternMessage: field.constraints.patternMessage ?? '',
        inputMode: field.inputMode ?? '',
        autoCapitalize: field.autoCapitalize ?? '',
        options: field.options || [],
    });

    const [activeTab, setActiveTab] = useState<'basic' | 'validation' | 'advanced'>('basic');

    // Handle input changes
    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Handle option changes
    const handleOptionChange = (index: number, key: 'value' | 'label', val: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = { ...newOptions[index], [key]: val };
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    // Add option
    const addOption = () => {
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, { value: '', label: '' }],
        }));
    };

    // Remove option
    const removeOption = (index: number) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index),
        }));
    };

    // Save changes
    const handleSave = () => {
        const updates: Partial<FieldConfig> = {
            label: formData.label,
            placeholder: formData.placeholder,
            type: formData.type,
            required: formData.required,
            gridSpan: formData.gridSpan,
            constraints: {
                maxLength: formData.maxLength ? Number(formData.maxLength) : null,
                minLength: formData.minLength ? Number(formData.minLength) : null,
                min: formData.min !== '' ? Number(formData.min) : null,
                max: formData.max !== '' ? Number(formData.max) : null,
                step: formData.step !== '' ? Number(formData.step) : null,
                pattern: formData.pattern || null,
                patternMessage: formData.patternMessage || null,
            },
            inputMode: formData.inputMode || null,
            autoCapitalize: formData.autoCapitalize || null,
        };

        // Include options for dropdown/buttons
        if (formData.type === 'dropdown' || formData.type === 'buttons') {
            updates.options = formData.options.filter(o => o.value && o.label);
        }

        onSave(updates);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Edit Field</h3>
                        <p className="text-sm text-blue-100">{field.fieldId}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    {(['basic', 'validation', 'advanced'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[55vh]">
                    {/* Basic Tab */}
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={e => handleChange('label', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Placeholder</label>
                                <input
                                    type="text"
                                    value={formData.placeholder}
                                    onChange={e => handleChange('placeholder', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => handleChange('type', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="email">Email</option>
                                    <option value="textarea">Textarea</option>
                                    <option value="dropdown">Dropdown</option>
                                    <option value="slider">Slider</option>
                                    <option value="buttons">Buttons</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.required}
                                        onChange={e => handleChange('required', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Required</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.gridSpan === 2}
                                        onChange={e => handleChange('gridSpan', e.target.checked ? 2 : 1)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">Full Width</span>
                                </label>
                            </div>

                            {/* Options for dropdown/buttons */}
                            {(formData.type === 'dropdown' || formData.type === 'buttons') && (
                                <div className="pt-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Options</label>
                                    <div className="space-y-2">
                                        {formData.options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Value"
                                                    value={opt.value}
                                                    onChange={e => handleOptionChange(idx, 'value', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Label"
                                                    value={opt.label}
                                                    onChange={e => handleOptionChange(idx, 'label', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                />
                                                <button
                                                    onClick={() => removeOption(idx)}
                                                    className="px-2 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={addOption}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Validation Tab */}
                    {activeTab === 'validation' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Length</label>
                                    <input
                                        type="number"
                                        value={formData.maxLength}
                                        onChange={e => handleChange('maxLength', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., 60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Length</label>
                                    <input
                                        type="number"
                                        value={formData.minLength}
                                        onChange={e => handleChange('minLength', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., 1"
                                    />
                                </div>
                            </div>

                            {formData.type === 'slider' && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Value</label>
                                        <input
                                            type="number"
                                            value={formData.min}
                                            onChange={e => handleChange('min', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., 1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Value</label>
                                        <input
                                            type="number"
                                            value={formData.max}
                                            onChange={e => handleChange('max', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., 5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Step</label>
                                        <input
                                            type="number"
                                            value={formData.step}
                                            onChange={e => handleChange('step', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., 0.1"
                                            step="0.1"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pattern (Regex)</label>
                                <input
                                    type="text"
                                    value={formData.pattern}
                                    onChange={e => handleChange('pattern', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                    placeholder="e.g., ^[0-9]{10}$"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Pattern Error Message</label>
                                <input
                                    type="text"
                                    value={formData.patternMessage}
                                    onChange={e => handleChange('patternMessage', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Must be exactly 10 digits"
                                />
                            </div>
                        </div>
                    )}

                    {/* Advanced Tab */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Input Mode (Mobile Keyboard)</label>
                                <select
                                    value={formData.inputMode}
                                    onChange={e => handleChange('inputMode', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Default</option>
                                    <option value="text">Text</option>
                                    <option value="numeric">Numeric</option>
                                    <option value="email">Email</option>
                                    <option value="tel">Telephone</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Auto Capitalize</label>
                                <select
                                    value={formData.autoCapitalize}
                                    onChange={e => handleChange('autoCapitalize', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">None</option>
                                    <option value="words">Words</option>
                                    <option value="characters">All Characters</option>
                                    <option value="uppercase">Uppercase</option>
                                </select>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="text-sm font-medium text-slate-700 mb-2">Field ID</h4>
                                <code className="text-sm bg-white px-2 py-1 rounded border border-slate-200">{field.fieldId}</code>
                                <p className="text-xs text-slate-500 mt-1">This cannot be changed.</p>
                            </div>
                        </div>
                    )}
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
