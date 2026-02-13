import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, AlertTriangle, CheckCircle, RefreshCw,
    Shield, ChevronDown, ChevronUp, Clock, Wrench,
    FileJson, RotateCcw, Loader2
} from 'lucide-react';

interface GovernanceUpdate {
    timestamp: string;
    editorId: string;
    reason: string;
    changeSummary: string;
}

interface HealthEntry {
    id: string;
    companyName: string;
    complianceScore: number;
    governanceVersion: string;
    isLegacy: boolean;
    updateCount: number;
    zoneOverrideCount: number;
    totalPincodes: number;
    zoneMismatchPercent: number;
    lastUpdated: string | null;
    updates: GovernanceUpdate[];
}

interface HealthData {
    totalTransporters: number;
    legacyCount: number;
    lowComplianceCount: number;
    health: HealthEntry[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const UTSFHealthMonitor: React.FC = () => {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [repairing, setRepairing] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchHealth = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/utsf/health`);
            const data = await res.json();
            if (data.success) {
                setHealthData(data);
            }
        } catch (err) {
            console.error('Failed to fetch health data:', err);
            setToast({ message: 'Failed to load health data', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
    }, [fetchHealth]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleRepair = async (id: string) => {
        setRepairing(id);
        try {
            const res = await fetch(`${API_BASE}/utsf/repair/${id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setToast({ message: `Repaired: ${data.message}`, type: 'success' });
                await fetchHealth();
            } else {
                setToast({ message: data.message || 'Repair failed', type: 'error' });
            }
        } catch (err) {
            setToast({ message: 'Repair request failed', type: 'error' });
        } finally {
            setRepairing(null);
        }
    };

    const getComplianceColor = (score: number) => {
        if (score >= 0.95) return 'text-emerald-400';
        if (score >= 0.8) return 'text-yellow-400';
        if (score >= 0.5) return 'text-orange-400';
        return 'text-red-400';
    };

    const getComplianceBg = (score: number) => {
        if (score >= 0.95) return 'bg-emerald-400/10 border-emerald-400/30';
        if (score >= 0.8) return 'bg-yellow-400/10 border-yellow-400/30';
        if (score >= 0.5) return 'bg-orange-400/10 border-orange-400/30';
        return 'bg-red-400/10 border-red-400/30';
    };

    const getComplianceBadge = (score: number) => {
        if (score >= 0.95) return { text: 'Healthy', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        if (score >= 0.8) return { text: 'Fair', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
        if (score >= 0.5) return { text: 'Degraded', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
        return { text: 'Critical', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
    };

    if (loading && !healthData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${toast.type === 'success'
                        ? 'bg-emerald-900/80 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-900/80 border-red-500/40 text-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl shadow-lg shadow-purple-900/30">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">UTSF Health Monitor</h1>
                        <p className="text-sm text-slate-400">Governance, compliance & data integrity dashboard</p>
                    </div>
                </div>
                <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all duration-200 border border-slate-700/60 text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            {healthData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/15 rounded-lg">
                                <FileJson className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-sm text-slate-400 font-medium">Total Vendors</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{healthData.totalTransporters}</p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/15 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="text-sm text-slate-400 font-medium">Legacy (No Governance)</span>
                        </div>
                        <p className={`text-3xl font-bold ${healthData.legacyCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {healthData.legacyCount}
                        </p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/15 rounded-lg">
                                <Shield className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-sm text-slate-400 font-medium">Low Compliance</span>
                        </div>
                        <p className={`text-3xl font-bold ${healthData.lowComplianceCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {healthData.lowComplianceCount}
                        </p>
                    </div>
                </div>
            )}

            {/* Health Table */}
            {healthData && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/60">
                                    <th className="text-left py-4 px-5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Vendor</th>
                                    <th className="text-center py-4 px-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Compliance</th>
                                    <th className="text-center py-4 px-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Status</th>
                                    <th className="text-center py-4 px-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Version</th>
                                    <th className="text-center py-4 px-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Overrides</th>
                                    <th className="text-center py-4 px-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Mismatch %</th>
                                    <th className="text-center py-4 px-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Updates</th>
                                    <th className="text-right py-4 px-5 text-slate-400 font-semibold text-xs uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {healthData.health.map((entry) => {
                                    const badge = getComplianceBadge(entry.complianceScore);
                                    const isExpanded = expandedRow === entry.id;

                                    return (
                                        <React.Fragment key={entry.id}>
                                            <tr
                                                className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors cursor-pointer"
                                                onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                                            >
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${entry.complianceScore >= 0.95 ? 'bg-emerald-400' : entry.complianceScore >= 0.5 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                                        <div>
                                                            <p className="font-semibold text-white text-sm">{entry.companyName}</p>
                                                            <p className="text-xs text-slate-500 font-mono">{entry.totalPincodes.toLocaleString()} pincodes</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className={`font-bold text-lg ${getComplianceColor(entry.complianceScore)}`}>
                                                        {(entry.complianceScore * 100).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                                                        {badge.text}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    {entry.isLegacy ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                            <AlertTriangle className="w-3 h-3" /> Legacy
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs font-mono">{entry.governanceVersion}</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className="text-slate-300 font-mono text-xs">{entry.zoneOverrideCount}</span>
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    {entry.zoneMismatchPercent > 5 ? (
                                                        <span className="text-red-400 font-semibold text-xs">{entry.zoneMismatchPercent}%</span>
                                                    ) : entry.zoneMismatchPercent > 0 ? (
                                                        <span className="text-yellow-400 text-xs">{entry.zoneMismatchPercent}%</span>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs">0%</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className="text-slate-400 text-xs">{entry.updateCount}</span>
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRepair(entry.id); }}
                                                            disabled={repairing === entry.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded-lg text-xs font-semibold transition-all border border-violet-600/30 disabled:opacity-50"
                                                        >
                                                            {repairing === entry.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Wrench className="w-3.5 h-3.5" />
                                                            )}
                                                            Re-Sync
                                                        </button>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4 text-slate-500" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Audit Trail */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} className="px-5 py-4 bg-slate-900/50">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Clock className="w-4 h-4 text-slate-400" />
                                                                <span className="text-sm font-semibold text-slate-300">Audit Trail</span>
                                                                <span className="text-xs text-slate-500">(latest {entry.updates.length})</span>
                                                            </div>

                                                            {entry.updates.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {entry.updates.map((update, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="flex items-start gap-3 px-4 py-3 bg-slate-800/60 rounded-xl border border-slate-700/40"
                                                                        >
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <span className="text-xs font-mono text-blue-400">{update.editorId}</span>
                                                                                    <span className="text-xs text-slate-500">
                                                                                        {new Date(update.timestamp).toLocaleString()}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-sm text-slate-300">{update.reason}</p>
                                                                                {update.changeSummary && (
                                                                                    <p className="text-xs text-slate-500 mt-1">{update.changeSummary}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-slate-500 italic">No audit entries yet.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UTSFHealthMonitor;
