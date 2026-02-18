import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import {
  Upload,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileJson,
  MapPin,
  CheckCircle,
  ShieldCheck,
  History,
  Activity,
  GitCommit,
  RotateCcw,
  Wrench,
  Loader2,
  ArrowRightLeft,
  Pencil,
  X,
  Save,
  BookOpen
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

// Extended interface to match /health + /transporters data
interface UTSFTransporter {
  id: string;
  companyName: string;
  transporterType: string;
  rating: number;
  isVerified: boolean;
  totalPincodes: number;
  zonesServed: string[];
  // From /health
  complianceScore?: number;
  governanceVersion?: string;
  isLegacy?: boolean;
  updateCount?: number;
  zoneOverrideCount?: number;
  lastUpdated?: string;
  updates?: any[];

  stats: {
    totalPincodes: number;
    avgCoveragePercent: number;
    totalOdaPincodes?: number;
    complianceScore?: number; // fallback location
  };
  meta?: {
    version?: string;
    created?: any;
    updates?: any[];
  };
}

interface TransporterDetails extends UTSFTransporter {
  priceRate: Record<string, any>;
  zoneRates: Record<string, Record<string, number>>;
  serviceability: Record<string, any>;
  data: any;
}

interface ComparisonResult {
  id: string;
  companyName: string;
  zones: Record<string, {
    masterCount: number;
    servedCount: number;
    missingCount: number;
    compliance: number;
    missingPincodes: number[];
  }>;
}

const UTSFManager: React.FC = () => {
  const { user } = useAuth();
  const [transporters, setTransporters] = useState<UTSFTransporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Expanion & feature states
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'compare'>('details');
  const [detailsLoading, setDetailsLoading] = useState<string | null>(null);
  const [transporterDetails, setTransporterDetails] = useState<Record<string, TransporterDetails>>({});

  // Comparison Data
  const [comparisonData, setComparisonData] = useState<Record<string, ComparisonResult>>({});
  const [comparingId, setComparingId] = useState<string | null>(null);

  // Admin Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Enrich Modal
  const [enrichTarget, setEnrichTarget] = useState<UTSFTransporter | null>(null);
  const [enrichDetails, setEnrichDetails] = useState<TransporterDetails | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);

  useEffect(() => {
    loadTransporters();
  }, []);

  const loadTransporters = async () => {
    setLoading(true);
    try {
      // 1. Load basic transporters list
      const response = await fetch(`${API_BASE_URL}/api/utsf/transporters`);
      const data = await response.json();

      // 2. Load health/compliance data
      const healthResponse = await fetch(`${API_BASE_URL}/api/utsf/health`);
      const healthData = await healthResponse.json();

      if (data.success && healthData.success) {
        // Merge health data into transporters
        const healthMap = new Map(healthData.health.map((h: any) => [h.id, h]));

        const merged = data.transporters.map((t: UTSFTransporter) => {
          const health: any = healthMap.get(t.id);
          return {
            ...t,
            complianceScore: health?.complianceScore ?? t.stats?.complianceScore ?? 0,
            governanceVersion: health?.governanceVersion ?? t.meta?.version ?? 'LEGACY',
            isLegacy: health?.isLegacy ?? (!t.meta?.created),
            updateCount: health?.updateCount ?? t.meta?.updates?.length ?? 0,
            lastUpdated: health?.lastUpdated ?? t.meta?.created?.at,
            updates: health?.updates ?? t.meta?.updates ?? []
          };
        });

        setTransporters(merged);
        toast.success(`Loaded ${merged.length} UTSF files`);
      } else {
        toast.error('Failed to load UTSF data');
      }
    } catch (error) {
      console.error('Error loading transporters:', error);
      toast.error('Failed to load transporters');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && !file.name.endsWith('.utsf.json')) {
      toast.error('Please upload a .json or .utsf.json file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('utsfFile', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully uploaded ${data.transporter.companyName}`);
        loadTransporters();
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${companyName}?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/transporters/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${companyName}`);
        setTransporters(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (error) {
      toast.error('Failed to delete transporter');
    }
  };

  const handleRepair = async (id: string, companyName: string) => {
    setActionLoading(id);
    try {
      // Pass current user info if available, else generic
      const editorId = (user as any)?.email || (user as any)?.username || 'Admin User';

      const response = await fetch(`${API_BASE_URL}/api/utsf/repair/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorId })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Repaired ${companyName} (Score: ${data.complianceScore})`);
        loadTransporters(); // Reload to update UI
      } else {
        toast.error(data.message || 'Repair failed');
      }
    } catch (e) {
      toast.error('Repair request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRollback = async (id: string, versionIndex: number) => {
    if (!window.confirm('Are you sure you want to rollback to this version? Current changes will be lost.')) return;

    setActionLoading(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/rollback/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionIndex })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Rollback successful');
        loadTransporters();
      } else {
        toast.error(data.message || 'Rollback failed');
      }
    } catch (e) {
      toast.error('Rollback request failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompare = async (id: string) => {
    if (comparisonData[id]) {
      setActiveTab('compare');
      return;
    }

    setComparingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/compare/${id}`);
      const data = await response.json();

      if (data.success) {
        setComparisonData(prev => ({ ...prev, [id]: data.data }));
        setActiveTab('compare');
      } else {
        toast.error('Comparison failed');
      }
    } catch (e) {
      toast.error('Failed to load comparison data');
    } finally {
      setComparingId(null);
    }
  };

  const handleDownload = async (id: string, companyName: string) => {
    window.open(`${API_BASE_URL}/api/utsf/transporters/${id}`);
  };

  const handleReload = async () => {
    setLoading(true);
    await fetch(`${API_BASE_URL}/api/utsf/reload`, { method: 'POST' });
    loadTransporters();
  };

  const handleOpenEnrich = async (t: UTSFTransporter) => {
    setEnrichTarget(t);
    setEnrichDetails(null);
    // Load full details if not already cached
    if (transporterDetails[t.id]) {
      setEnrichDetails(transporterDetails[t.id]);
    } else {
      setEnrichLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/utsf/transporters/${t.id}`);
        const d = await res.json();
        if (d.success) {
          setTransporterDetails(prev => ({ ...prev, [t.id]: d.transporter }));
          setEnrichDetails(d.transporter);
        }
      } catch (e) {
        toast.error('Failed to load transporter details');
      } finally {
        setEnrichLoading(false);
      }
    }
  };

  const handleEnrichSaved = () => {
    setEnrichTarget(null);
    setEnrichDetails(null);
    // Invalidate cached details so it reloads after save
    if (enrichTarget) {
      setTransporterDetails(prev => {
        const copy = { ...prev };
        delete copy[enrichTarget.id];
        return copy;
      });
    }
    loadTransporters();
  };

  // Expand logic
  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setActiveTab('details'); // Default to details on open
      if (!transporterDetails[id]) {
        setDetailsLoading(id);
        const res = await fetch(`${API_BASE_URL}/api/utsf/transporters/${id}`);
        const d = await res.json();
        if (d.success) setTransporterDetails(prev => ({ ...prev, [id]: d.transporter }));
        setDetailsLoading(null);
      }
    }
  };

  return (
    <AdminLayout
      title="UTSF Command Center"
      subtitle="Universal Transporter Save Format - Governance & Control"
      actions={
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Upload UTSF</span>
            <input type="file" accept=".json,.utsf.json" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
          <button onClick={handleReload} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload All</span>
          </button>
        </div>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">System Health</p>
              <p className="text-2xl font-bold text-slate-800">
                {transporters.every(t => (t.complianceScore || 0) === 1) ? '100%' :
                  Math.round(transporters.reduce((s, t) => s + (t.complianceScore || 0), 0) / (transporters.length || 1) * 100) + '%'}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg"><Activity className="w-6 h-6 text-green-600" /></div>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.round(transporters.reduce((s, t) => s + (t.complianceScore || 0), 0) / (transporters.length || 1) * 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Legacy Files</p>
              <p className="text-2xl font-bold text-slate-800">{transporters.filter(t => t.isLegacy).length}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg"><History className="w-6 h-6 text-amber-600" /></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Require migration to v3.0</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Pincodes</p>
              <p className="text-2xl font-bold text-slate-800">{transporters.reduce((s, t) => s + t.totalPincodes, 0).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg"><MapPin className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Files</p>
              <p className="text-2xl font-bold text-slate-800">{transporters.length}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg"><FileJson className="w-6 h-6 text-purple-600" /></div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Transporter</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Compliance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transporters.map(t => (
                <React.Fragment key={t.id}>
                  <tr className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.isLegacy ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          {t.isLegacy ? <History size={16} /> : <ShieldCheck size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{t.companyName}</span>
                            {t.isVerified && <CheckCircle className="w-3 h-3 text-green-500" />}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{t.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${(t.complianceScore || 0) >= 1 ? 'bg-green-500' :
                              (t.complianceScore || 0) > 0.9 ? 'bg-amber-500' : 'bg-red-500'
                            }`} style={{ width: `${(t.complianceScore || 0) * 100}%` }}></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700">{Math.round((t.complianceScore || 0) * 100)}%</span>
                      </div>
                      {(t.zoneOverrideCount || 0) > 0 && <span className="text-xs text-amber-600 mt-1 block">{t.zoneOverrideCount} overrides active</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${t.isLegacy ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                          {t.governanceVersion || 'v1.0'}
                        </span>
                        {(t.updateCount || 0) > 0 && <span className="text-xs text-slate-400">({t.updateCount} updates)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{t.lastUpdated ? new Date(t.lastUpdated).toLocaleDateString() : 'Unknown'}</p>
                      {t.updates && t.updates.length > 0 && (
                        <p className="text-xs text-slate-400">by {t.updates[t.updates.length - 1].editorId?.split('@')[0] || 'System'}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Enrich Button */}
                        <button
                          onClick={() => handleOpenEnrich(t)}
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                          title="Enrich UTSF — Edit pricing & meta">
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Admin Tools */}
                        {(t.complianceScore || 0) < 1 && (
                          <button onClick={() => handleRepair(t.id, t.companyName)}
                            disabled={actionLoading === t.id}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors" title="Auto-Repair Compliance">
                            {actionLoading === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                          </button>
                        )}

                        <button
                          onClick={() => { handleCompare(t.id); if (expandedId !== t.id) toggleExpand(t.id); }}
                          disabled={comparingId === t.id}
                          className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors" title="Compare vs Master">
                          {comparingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                        </button>

                        <button onClick={() => toggleExpand(t.id)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                          {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div className="w-px h-4 bg-slate-300 mx-1"></div>

                        <button onClick={() => handleDownload(t.id, t.companyName)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Download JSON">
                          <Download className="w-4 h-4" />
                        </button>

                        <button onClick={() => handleDelete(t.id, t.companyName)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Panel */}
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-6 py-6 border-b border-slate-200">
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                          {/* Tabs */}
                          <div className="flex border-b border-slate-200">
                            <button onClick={() => setActiveTab('details')} className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                              File Details
                            </button>
                            <button onClick={() => setActiveTab('compare')} className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'compare' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                              Compliance & Comparison
                            </button>
                          </div>

                          <div className="p-6">
                            {activeTab === 'details' ? (
                              detailsLoading === t.id ? (
                                <div className="py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading details...</div>
                              ) : transporterDetails[t.id] ? (
                                <TransporterDetailsView details={transporterDetails[t.id]} />
                              ) : <div className="text-center text-red-500">Failed to load details</div>
                            ) : (
                              // Comparison / Governance View
                              <div className="space-y-6">
                                {/* Audit Trail */}
                                <div className="mb-6">
                                  <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><GitCommit className="w-4 h-4" /> Modification History</h4>
                                  <div className="border rounded-lg overflow-hidden">
                                    {(t.updates && t.updates.length > 0) ? (
                                      <table className="w-full text-sm">
                                        <thead className="bg-slate-100 border-b">
                                          <tr>
                                            <th className="px-4 py-2 text-left">Timestamp</th>
                                            <th className="px-4 py-2 text-left">Editor</th>
                                            <th className="px-4 py-2 text-left">Change</th>
                                            <th className="px-4 py-2 text-right">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {[...(t.updates || [])].reverse().map((u: any, i: number) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                              <td className="px-4 py-2 text-slate-600">{new Date(u.timestamp).toLocaleString()}</td>
                                              <td className="px-4 py-2 font-medium text-slate-700">{u.editorId}</td>
                                              <td className="px-4 py-2 text-slate-600">{u.changeSummary || u.reason}</td>
                                              <td className="px-4 py-2 text-right">
                                                {i > 0 && <button onClick={() => handleRollback(t.id, t.updates!.length - 1 - i)} className="text-blue-600 hover:underline flex items-center gap-1 justify-end ml-auto">
                                                  <RotateCcw className="w-3 h-3" /> Rollback
                                                </button>}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : <div className="p-4 text-center text-slate-500 italic">No history available for legacy files</div>}
                                  </div>
                                </div>

                                {/* Comparison Table */}
                                <h4 className="font-semibold text-slate-800 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Master Pincode Comparison</h4>
                                {!comparisonData[t.id] ? (
                                  <div className="p-8 text-center bg-slate-50 rounded-lg">
                                    <p className="text-slate-500 mb-4">Run a full comparison to see zone-by-zone coverage gaps vs master pincodes.</p>
                                    <button onClick={() => handleCompare(t.id)} disabled={comparingId === t.id} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
                                      {comparingId === t.id ? 'Running Analysis...' : 'Run Comparison Analysis'}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-100 border-b">
                                        <tr>
                                          <th className="px-4 py-2 text-left">Zone</th>
                                          <th className="px-4 py-2 text-right">Master Pincodes</th>
                                          <th className="px-4 py-2 text-right">Served</th>
                                          <th className="px-4 py-2 text-right">Missing</th>
                                          <th className="px-4 py-2 text-right">Compliance</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(comparisonData[t.id].zones).map(([zone, data]) => (
                                          <tr key={zone} className={`border-b last:border-0 ${data.compliance < 100 ? 'bg-red-50/50' : ''}`}>
                                            <td className="px-4 py-2 font-bold text-slate-700">{zone}</td>
                                            <td className="px-4 py-2 text-right text-slate-600">{data.masterCount}</td>
                                            <td className="px-4 py-2 text-right text-slate-600">{data.servedCount}</td>
                                            <td className="px-4 py-2 text-right text-red-600 font-medium">{data.missingCount}</td>
                                            <td className="px-4 py-2 text-right">
                                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${data.compliance === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {data.compliance}%
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Enrich Modal */}
      {enrichTarget && (
        <EnrichUTSFModal
          transporter={enrichTarget}
          details={enrichDetails}
          loading={enrichLoading}
          onClose={() => { setEnrichTarget(null); setEnrichDetails(null); }}
          onSaved={handleEnrichSaved}
        />
      )}
    </AdminLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EnrichUTSFModal — Edit all pricing & meta fields for a UTSF transporter
// ─────────────────────────────────────────────────────────────────────────────

interface EnrichForm {
  // meta
  companyName: string;
  transporterType: string;
  rating: number;
  isVerified: boolean;
  // base charges
  minCharges: number;
  docketCharges: number;
  greenTax: number;
  daccCharges: number;
  miscellanousCharges: number;
  fuel: number;
  fuelMax: number;
  // variable charges (fixed + variable%)
  rovCharges_v: number; rovCharges_f: number;
  insuaranceCharges_v: number; insuaranceCharges_f: number;
  fmCharges_v: number; fmCharges_f: number;
  appointmentCharges_v: number; appointmentCharges_f: number;
  handlingCharges_v: number; handlingCharges_f: number; handlingCharges_t: number;
  odaCharges_v: number; odaCharges_f: number;
  odaMode: string; odaThresholdWeight: number;
  // invoice value
  invoiceEnabled: boolean;
  invoicePercentage: number;
  invoiceMinimumAmount: number;
  // volumetric
  divisor: number;
}

function buildFormFromDetails(details: TransporterDetails | null, t: UTSFTransporter): EnrichForm {
  const pr = details?.priceRate || (details?.data?.pricing?.priceRate) || {};
  const vol = details?.data?.pricing?.volumetric || details?.data?.volumetric || {};
  const inv = pr.invoiceValueCharges || {};
  return {
    companyName: t.companyName,
    transporterType: t.transporterType,
    rating: t.rating,
    isVerified: t.isVerified,
    minCharges: pr.minCharges ?? 0,
    docketCharges: pr.docketCharges ?? 0,
    greenTax: pr.greenTax ?? 0,
    daccCharges: pr.daccCharges ?? 0,
    miscellanousCharges: pr.miscellanousCharges ?? 0,
    fuel: pr.fuel ?? 0,
    fuelMax: pr.fuelMax ?? 0,
    rovCharges_v: pr.rovCharges?.v ?? 0,
    rovCharges_f: pr.rovCharges?.f ?? 0,
    insuaranceCharges_v: pr.insuaranceCharges?.v ?? 0,
    insuaranceCharges_f: pr.insuaranceCharges?.f ?? 0,
    fmCharges_v: pr.fmCharges?.v ?? 0,
    fmCharges_f: pr.fmCharges?.f ?? 0,
    appointmentCharges_v: pr.appointmentCharges?.v ?? 0,
    appointmentCharges_f: pr.appointmentCharges?.f ?? 0,
    handlingCharges_v: pr.handlingCharges?.v ?? 0,
    handlingCharges_f: pr.handlingCharges?.f ?? 0,
    handlingCharges_t: pr.handlingCharges?.thresholdWeight ?? 0,
    odaCharges_v: pr.odaCharges?.v ?? 0,
    odaCharges_f: pr.odaCharges?.f ?? 0,
    odaMode: pr.odaCharges?.mode || 'legacy',
    odaThresholdWeight: pr.odaCharges?.thresholdWeight ?? 0,
    invoiceEnabled: inv.enabled ?? false,
    invoicePercentage: inv.percentage ?? 0,
    invoiceMinimumAmount: inv.minimumAmount ?? 0,
    divisor: vol.divisor ?? vol.kFactor ?? 5000,
  };
}

interface EnrichUTSFModalProps {
  transporter: UTSFTransporter;
  details: TransporterDetails | null;
  loading: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EnrichUTSFModal: React.FC<EnrichUTSFModalProps> = ({ transporter, details, loading, onClose, onSaved }) => {
  const [form, setForm] = useState<EnrichForm>(() => buildFormFromDetails(details, transporter));
  const [saving, setSaving] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  // Re-initialize form once details load
  useEffect(() => {
    if (details) setForm(buildFormFromDetails(details, transporter));
  }, [details]);

  const num = (key: keyof EnrichForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }));
  const str = (key: keyof EnrichForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        meta: {
          companyName: form.companyName,
          transporterType: form.transporterType,
          rating: form.rating,
          isVerified: form.isVerified,
        },
        pricing: {
          priceRate: {
            minCharges: form.minCharges,
            docketCharges: form.docketCharges,
            greenTax: form.greenTax,
            daccCharges: form.daccCharges,
            miscellanousCharges: form.miscellanousCharges,
            fuel: form.fuel,
            fuelMax: form.fuelMax || undefined,
            rovCharges: { v: form.rovCharges_v, f: form.rovCharges_f },
            insuaranceCharges: { v: form.insuaranceCharges_v, f: form.insuaranceCharges_f },
            fmCharges: { v: form.fmCharges_v, f: form.fmCharges_f },
            appointmentCharges: { v: form.appointmentCharges_v, f: form.appointmentCharges_f },
            handlingCharges: { v: form.handlingCharges_v, f: form.handlingCharges_f, thresholdWeight: form.handlingCharges_t },
            odaCharges: {
              v: form.odaCharges_v,
              f: form.odaCharges_f,
              ...(form.odaMode !== 'legacy' ? {
                mode: form.odaMode,
                thresholdWeight: form.odaThresholdWeight,
              } : {}),
            },
            invoiceValueCharges: {
              enabled: form.invoiceEnabled,
              percentage: form.invoicePercentage,
              minimumAmount: form.invoiceMinimumAmount,
            },
          },
          volumetric: { divisor: form.divisor, kFactor: form.divisor },
        },
        changeSummary: `Admin enrich: meta + pricing updated`,
      };

      const res = await fetch(`${API_BASE_URL}/api/utsf/transporters/${transporter.id}/enrich`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Enriched ${form.companyName}`);
        onSaved();
      } else {
        toast.error(data.message || 'Enrich failed');
      }
    } catch (e) {
      toast.error('Save request failed');
    } finally {
      setSaving(false);
    }
  };

  // Input helpers
  const NI = ({ label, k, unit }: { label: string; k: keyof EnrichForm; unit?: string }) => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {unit && <span className="text-slate-400 text-xs">{unit}</span>}
        <input
          type="number"
          step="any"
          value={form[k] as number}
          onChange={num(k)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  const VFRow = ({ label, vk, fk }: { label: string; vk: keyof EnrichForm; fk: keyof EnrichForm }) => (
    <div className="grid grid-cols-2 gap-2">
      <NI label={`${label} Variable (%)`} k={vk} />
      <NI label={`${label} Fixed (₹)`} k={fk} unit="₹" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Enrich UTSF</h2>
            <p className="text-xs text-slate-500 font-mono">{transporter.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* ── Company Info ── */}
            <section>
              <h3 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">Company Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Company Name</label>
                  <input value={form.companyName} onChange={str('companyName')}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Transporter Type</label>
                  <select value={form.transporterType} onChange={str('transporterType')}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="Road">Road</option>
                    <option value="Air">Air</option>
                    <option value="Rail">Rail</option>
                    <option value="Ship">Ship</option>
                  </select>
                </div>
                <NI label="Rating (0-5)" k="rating" />
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="isVerified" checked={form.isVerified}
                    onChange={e => setForm(f => ({ ...f, isVerified: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="isVerified" className="text-sm text-slate-700">Verified Transporter</label>
                </div>
              </div>
            </section>

            {/* ── Base Charges ── */}
            <section>
              <h3 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">Base Charges</h3>
              <div className="grid grid-cols-3 gap-3">
                <NI label="Min Charges (₹)" k="minCharges" unit="₹" />
                <NI label="Docket Charges (₹)" k="docketCharges" unit="₹" />
                <NI label="Green Tax (₹)" k="greenTax" unit="₹" />
                <NI label="DACC Charges (₹)" k="daccCharges" unit="₹" />
                <NI label="Miscellaneous (₹)" k="miscellanousCharges" unit="₹" />
                <NI label="Fuel Surcharge (%)" k="fuel" />
                <NI label="Fuel Max (₹, 0=none)" k="fuelMax" unit="₹" />
              </div>
            </section>

            {/* ── Variable Charges ── */}
            <section>
              <h3 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">
                Variable Charges
                <span className="ml-2 text-xs font-normal text-slate-400 normal-case">charge = max(variable% × baseFreight, fixed)</span>
              </h3>
              <div className="space-y-3">
                <VFRow label="ROV" vk="rovCharges_v" fk="rovCharges_f" />
                <VFRow label="Insurance" vk="insuaranceCharges_v" fk="insuaranceCharges_f" />
                <VFRow label="FM" vk="fmCharges_v" fk="fmCharges_f" />
                <VFRow label="Appointment" vk="appointmentCharges_v" fk="appointmentCharges_f" />
                {/* ODA with mode support */}
                <div className="col-span-2 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">ODA Mode</label>
                      <select
                        value={form.odaMode}
                        onChange={e => setForm(f => ({ ...f, odaMode: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="legacy">legacy (default)</option>
                        <option value="switch">switch (DB Schenker)</option>
                        <option value="excess">excess (Shipshopy)</option>
                      </select>
                    </div>
                    <NI label="ODA Fixed (₹)" k="odaCharges_f" unit="₹" />
                    {form.odaMode === 'legacy' ? (
                      <NI label="ODA Variable (%)" k="odaCharges_v" />
                    ) : (
                      <NI label="Threshold Weight (kg)" k="odaThresholdWeight" />
                    )}
                  </div>
                  {form.odaMode !== 'legacy' && (
                    <div className="grid grid-cols-3 gap-2">
                      <NI label="Rate / v (₹/kg)" k="odaCharges_v" unit="₹" />
                      <div className="col-span-2 text-xs text-slate-400 pt-5">
                        {form.odaMode === 'switch'
                          ? 'wt <= threshold → fixed | wt > threshold → v × wt'
                          : 'fixed + max(0, wt - threshold) × v'}
                      </div>
                    </div>
                  )}
                </div>
                {/* Handling has extra thresholdWeight */}
                <div className="grid grid-cols-3 gap-2">
                  <NI label="Handling Variable (%)" k="handlingCharges_v" />
                  <NI label="Handling Fixed (₹)" k="handlingCharges_f" unit="₹" />
                  <NI label="Handling Threshold (kg)" k="handlingCharges_t" />
                </div>
              </div>
            </section>

            {/* ── Invoice Value Config ── */}
            <section>
              <h3 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">Invoice Value Config</h3>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="flex items-center gap-2 pb-1">
                  <input type="checkbox" id="invEnabled" checked={form.invoiceEnabled}
                    onChange={e => setForm(f => ({ ...f, invoiceEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="invEnabled" className="text-sm text-slate-700">Enabled</label>
                </div>
                <NI label="Percentage (%)" k="invoicePercentage" />
                <NI label="Minimum Amount (₹)" k="invoiceMinimumAmount" unit="₹" />
              </div>
            </section>

            {/* ── Volumetric Config ── */}
            <section>
              <h3 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wide">Volumetric Config</h3>
              <div className="grid grid-cols-2 gap-3">
                <NI label="Divisor / kFactor" k="divisor" />
                <div className="text-xs text-slate-400 pt-5">
                  Air=5000 · Road=3500 · Rail=4000 · Ship=6000
                </div>
              </div>
            </section>

            {/* ── Formula Reference (collapsible) ── */}
            <section className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                onClick={() => setShowFormulas(f => !f)}>
                <span className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Formula Reference — Freight Calculation Engine
                </span>
                {showFormulas ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showFormulas && (
                <div className="px-4 py-4 bg-slate-900 text-slate-200 font-mono text-xs leading-6 space-y-3">
                  <div>
                    <p className="text-yellow-400 font-bold">// STEP 1 — Chargeable Weight  (calculations.ts)</p>
                    <p>volumetricWeight = (L × W × H) / divisor</p>
                    <p className="text-slate-400">  divisors: Air=5000, Road=3500, Rail=4000, Ship=6000</p>
                    <p>chargeableWeight = max(actualWeight, volumetricWeight)</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold">// STEP 2 — Base Freight  (utsfService.js calculatePrice)</p>
                    <p>baseFreight = unitPrice × chargeableWeight</p>
                    <p>effectiveBaseFreight = max(baseFreight, minCharges)</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold">// STEP 3 — Surcharges</p>
                    <p>fuelCharges = (fuel% / 100) × baseFreight</p>
                    <p className="text-slate-400">// Fuel CAP (if fuelMax {'>'} 0):</p>
                    <p>fuelCharges = min(fuelCharges, fuelMax)</p>
                    <p className="text-slate-400">// ROV, Insurance, FM, Appointment (standard variable):</p>
                    <p>charge = max((variable% / 100) × baseFreight, fixedAmount)</p>
                    <p className="text-slate-400">// Handling (threshold-based):</p>
                    <p>handlingCharges = fixedAmount + ((chargeableWeight - thresholdWeight) × variable% / 100)</p>
                    <p className="text-slate-400">// ODA (only if destination is ODA zone):</p>
                    <p className="text-green-400">legacy:  odaCharges = fixed + (wt × v% / 100)</p>
                    <p className="text-green-400">switch:  wt {'<='} threshold → fixed | wt {'>'} threshold → v × wt</p>
                    <p className="text-green-400">excess:  fixed + max(0, wt - threshold) × v</p>
                    <p className="text-slate-400">// Invoice Value (if enabled):</p>
                    <p>invoiceValueCharges = max((percentage / 100) × invoiceValue, minimumAmount)</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold">// STEP 4 — Total</p>
                    <p>totalCharges =</p>
                    <p className="pl-4">effectiveBaseFreight</p>
                    <p className="pl-4">+ docketCharges + greenTax + daccCharges + miscCharges</p>
                    <p className="pl-4">+ fuelCharges</p>
                    <p className="pl-4">+ rovCharges + insuaranceCharges + fmCharges</p>
                    <p className="pl-4">+ appointmentCharges + handlingCharges + odaCharges</p>
                    <p className="pl-4">+ invoiceValueCharges</p>
                  </div>
                </div>
              )}
            </section>

          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Enrichment
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

// Component to display detailed transporter information (simplified from previous version)
const TransporterDetailsView: React.FC<{ details: TransporterDetails }> = ({ details }) => {
  return (
    <div className="space-y-6">
      {/* Price Configuration */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-3">Price Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Min Charges</p>
            <p className="text-lg font-bold text-slate-800">
              ₹{details.priceRate?.minCharges || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Fuel Surcharge</p>
            <p className="text-lg font-bold text-slate-800">{details.priceRate?.fuel || 0}%</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Docket Charges</p>
            <p className="text-lg font-bold text-slate-800">
              ₹{details.priceRate?.docketCharges || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded text-center text-slate-500 text-sm">
        Full configuration details available in raw JSON download.
      </div>
    </div>
  );
};

export default UTSFManager;
