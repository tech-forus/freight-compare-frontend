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
  ArrowRightLeft
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
    </AdminLayout>
  );
};

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
