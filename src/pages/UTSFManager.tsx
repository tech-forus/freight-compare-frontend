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
  Package,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import toast from 'react-hot-toast';

interface UTSFTransporter {
  id: string;
  companyName: string;
  transporterType: string;
  rating: number;
  isVerified: boolean;
  totalPincodes: number;
  zonesServed: string[];
  stats: {
    totalPincodes: number;
    avgCoveragePercent: number;
    totalOdaPincodes?: number;
  };
  vendorRatings?: {
    onTimeDelivery?: number;
    customerService?: number;
    valueForMoney?: number;
    overall?: number;
  };
  volumetricConfig?: {
    unit: string;
    divisor: number;
    kFactor: number;
    cftFactor: number | null;
  };
  specialZones?: Record<string, any>;
}

interface TransporterDetails extends UTSFTransporter {
  priceRate: Record<string, any>;
  zoneRates: Record<string, Record<string, number>>;
  serviceability: Record<string, any>;
  data: any;
}

const UTSFManager: React.FC = () => {
  const [transporters, setTransporters] = useState<UTSFTransporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<string | null>(null);
  const [transporterDetails, setTransporterDetails] = useState<Record<string, TransporterDetails>>({});

  useEffect(() => {
    loadTransporters();
  }, []);

  const loadTransporters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/transporters`);
      const data = await response.json();
      if (data.success) {
        setTransporters(data.transporters);
        toast.success(`Loaded ${data.count} transporters`);
      } else {
        toast.error(data.message || 'Failed to load transporters');
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
    if (!window.confirm(`Are you sure you want to delete ${companyName}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/transporters/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${companyName}`);
        setTransporters(prev => prev.filter(t => t.id !== id));
        setTransporterDetails(prev => {
          const newDetails = { ...prev };
          delete newDetails[id];
          return newDetails;
        });
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting transporter:', error);
      toast.error('Failed to delete transporter');
    }
  };

  const handleDownload = async (id: string, companyName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/transporters/${id}`);
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data.transporter.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${id}.utsf.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${companyName}`);
      } else {
        toast.error(data.message || 'Download failed');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleReload = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/reload`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Reloaded ${data.count} transporters`);
        loadTransporters();
      } else {
        toast.error(data.message || 'Reload failed');
      }
    } catch (error) {
      console.error('Error reloading:', error);
      toast.error('Failed to reload transporters');
    }
  };

  const loadTransporterDetails = async (id: string) => {
    if (transporterDetails[id]) {
      return;
    }

    setDetailsLoading(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/utsf/transporters/${id}`);
      const data = await response.json();

      if (data.success) {
        setTransporterDetails(prev => ({
          ...prev,
          [id]: data.transporter
        }));
      } else {
        toast.error(data.message || 'Failed to load details');
      }
    } catch (error) {
      console.error('Error loading details:', error);
      toast.error('Failed to load transporter details');
    } finally {
      setDetailsLoading(null);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await loadTransporterDetails(id);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <AdminLayout
      title="UTSF File Manager"
      subtitle="Manage Universal Transporter Save Format files"
      actions={
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload UTSF</span>
              </>
            )}
            <input
              type="file"
              accept=".json,.utsf.json"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            onClick={handleReload}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload All</span>
          </button>
        </div>
      }
    >
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Files</p>
              <p className="text-2xl font-bold text-slate-800">{transporters.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Verified</p>
              <p className="text-2xl font-bold text-slate-800">
                {transporters.filter(t => t.isVerified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Pincodes</p>
              <p className="text-2xl font-bold text-slate-800">
                {transporters.reduce((sum, t) => sum + t.totalPincodes, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Coverage</p>
              <p className="text-2xl font-bold text-slate-800">
                {transporters.length > 0
                  ? Math.round(
                      transporters.reduce((sum, t) => sum + (t.stats?.avgCoveragePercent || 0), 0) /
                        transporters.length
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transporters Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : transporters.length === 0 ? (
          <div className="text-center py-12">
            <FileJson className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No UTSF files found</p>
            <p className="text-sm text-slate-500">Upload a .utsf.json file to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Transporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Zones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Coverage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Pincodes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transporters.map((transporter) => (
                  <React.Fragment key={transporter.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">{transporter.companyName}</p>
                              {transporter.isVerified && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{transporter.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {transporter.zonesServed?.slice(0, 5).map((zone) => (
                            <span
                              key={zone}
                              className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded"
                            >
                              {zone}
                            </span>
                          ))}
                          {transporter.zonesServed?.length > 5 && (
                            <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded">
                              +{transporter.zonesServed.length - 5}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{
                                width: `${transporter.stats?.avgCoveragePercent || 0}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700 min-w-[3rem] text-right">
                            {Math.round(transporter.stats?.avgCoveragePercent || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {transporter.totalPincodes.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
                          {transporter.transporterType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleExpand(transporter.id)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            {expandedId === transporter.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownload(transporter.id, transporter.companyName)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transporter.id, transporter.companyName)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedId === transporter.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-slate-50">
                          {detailsLoading === transporter.id ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                          ) : transporterDetails[transporter.id] ? (
                            <TransporterDetailsView details={transporterDetails[transporter.id]} />
                          ) : (
                            <div className="text-center py-4 text-slate-500">
                              Failed to load details
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Component to display detailed transporter information
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

      {/* Zone Rates Matrix (condensed) */}
      {details.zoneRates && Object.keys(details.zoneRates).length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">Zone Rates (per kg)</h4>
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                    Origin → Dest
                  </th>
                  {Object.keys(details.zoneRates).slice(0, 6).map((zone) => (
                    <th key={zone} className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                      {zone}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(details.zoneRates)
                  .slice(0, 6)
                  .map(([originZone, rates]) => (
                    <tr key={originZone}>
                      <td className="px-3 py-2 font-semibold text-slate-700">{originZone}</td>
                      {Object.keys(details.zoneRates).slice(0, 6).map((destZone) => (
                        <td key={destZone} className="px-3 py-2 text-center text-slate-600">
                          {rates[destZone] ? `₹${rates[destZone]}` : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {Object.keys(details.zoneRates).length > 6 && (
            <p className="text-xs text-slate-500 mt-2">
              Showing 6 of {Object.keys(details.zoneRates).length} zones
            </p>
          )}
        </div>
      )}

      {/* Zone Coverage */}
      {details.serviceability && Object.keys(details.serviceability).length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">Zone Coverage</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(details.serviceability).map(([zone, data]: [string, any]) => (
              <div key={zone} className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">{zone}</span>
                  {data.mode === 'FULL_ZONE' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {data.mode === 'NOT_SERVED' && (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600">{data.coveragePercent?.toFixed(1) || 0}% covered</p>
                <p className="text-xs text-slate-500 mt-1">{data.mode}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ODA Stats */}
      {details.stats?.totalOdaPincodes && details.stats.totalOdaPincodes > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">ODA Coverage</h4>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-900">
                {details.stats.totalOdaPincodes.toLocaleString()} ODA pincodes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Volumetric Config */}
      {details.volumetricConfig && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">Volumetric Configuration</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Unit</p>
              <p className="text-lg font-bold text-slate-800">
                {details.volumetricConfig.unit}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Divisor</p>
              <p className="text-lg font-bold text-slate-800">
                {details.volumetricConfig.divisor}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">K Factor</p>
              <p className="text-lg font-bold text-slate-800">
                {details.volumetricConfig.kFactor}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Special Zones */}
      {details.specialZones && Object.keys(details.specialZones).length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">Special Zones</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(details.specialZones).map(([zone, data]: [string, any]) => (
              <div key={zone} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-purple-900">{zone}</span>
                  <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded">
                    {data.transportMode}
                  </span>
                </div>
                <p className="text-sm text-purple-700">{data.remarks}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {data.coveragePercent?.toFixed(1) || 0}% coverage
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Ratings */}
      {details.vendorRatings && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">Vendor Ratings</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {details.vendorRatings.onTimeDelivery !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">On-Time Delivery</p>
                <p className="text-lg font-bold text-slate-800">
                  {details.vendorRatings.onTimeDelivery.toFixed(1)}/5
                </p>
              </div>
            )}
            {details.vendorRatings.customerService !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Customer Service</p>
                <p className="text-lg font-bold text-slate-800">
                  {details.vendorRatings.customerService.toFixed(1)}/5
                </p>
              </div>
            )}
            {details.vendorRatings.valueForMoney !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Value for Money</p>
                <p className="text-lg font-bold text-slate-800">
                  {details.vendorRatings.valueForMoney.toFixed(1)}/5
                </p>
              </div>
            )}
            {details.vendorRatings.overall !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Overall Rating</p>
                <p className="text-lg font-bold text-slate-800">
                  {details.vendorRatings.overall.toFixed(1)}/5
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UTSFManager;
