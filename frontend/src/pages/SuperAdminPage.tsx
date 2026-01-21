import React, { useState, useEffect } from 'react';
import { getTemporaryTransporters } from '../services/api';
import { TemporaryTransporter } from '../utils/validators';
import { Loader2, CheckCircle, XCircle, Clock, Search, Filter, X, FileText, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import http from '../lib/http';
import AdminLayout from '../components/admin/AdminLayout';

type VendorStatus = 'pending' | 'approved' | 'rejected';

interface VendorWithId extends TemporaryTransporter {
  _id: string;
  approvalStatus?: VendorStatus;
  customerID?: string;
  vendorCode?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  gstNo?: string;
  mode?: string;
  address?: string;
  state?: string;
  pincode?: number;
  city?: string;
  rating?: number;
  subVendor?: string;
  selectedZones?: string[];
  zoneConfig?: Record<string, string[]>;
  prices?: any;
  invoiceValueCharges?: any;
  contactPersonName?: string;
}

const renderValue = (value: any, suffix = ''): string => {
  if (value === null || value === undefined) return 'N/A'

  if (typeof value === 'object') {
    const fixed = value.fixed ?? 0
    const variable = value.variable ?? 0
    return `Fixed: ${fixed}, Variable: ${variable}${suffix}`
  }

  return `${value}${suffix}`
}

class InlineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[SuperAdmin UI Crash]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Vendor did not upload information
            </h2>
            <p className="text-slate-600 mb-4">
              There was an issue loading vendor details.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SuperAdminPage: React.FC = () => {
  // Note: Permission check is handled by AdminRoute in App.tsx
  // This page is only rendered if the user has the required permission
  const [activeTab, setActiveTab] = useState<VendorStatus>('pending');
  const [vendors, setVendors] = useState<VendorWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        console.log('[SuperAdmin] Fetching all vendors...');
        const data = await getTemporaryTransporters(undefined);
        setVendors(data || []);
        if (!data || data.length === 0) {
          // toast.error('No vendors found in database'); 
        }
      } catch (error) {
        console.error('[SuperAdmin] Failed to fetch vendors:', error);
        toast.error('Failed to load vendors');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Filter vendors by status and search query
  const filteredVendors = Array.isArray(vendors) ? vendors.filter((vendor) => {
    if (!vendor) return false;
    const status = vendor.approvalStatus || 'pending';
    const matchesTab = status === activeTab;
    const matchesSearch = searchQuery
      ? (vendor.companyName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (vendor.vendorEmailAddress?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (vendor.contactPersonName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      : true;
    return matchesTab && matchesSearch;
  }) : [];

  // Handle opening vendor details modal
  const handleViewVendor = (vendor: VendorWithId) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVendor(null);
  };

  // Handle vendor approval/rejection
  const handleVendorAction = async (vendorId: string, action: 'approve' | 'reject') => {
    setActionLoading(vendorId);
    try {
      const response = await http.put(`/api/transporter/temporary/${vendorId}/status`, {
        status: action === 'approve' ? 'approved' : 'rejected',
      });

      if (response.data.success) {
        toast.success(`Vendor ${action}d successfully`);
        // Update local state
        setVendors((prev) =>
          prev.map((v) =>
            v._id === vendorId
              ? { ...v, approvalStatus: action === 'approve' ? 'approved' : 'rejected' }
              : v
          )
        );
      } else {
        toast.error(response.data.message || `Failed to ${action} vendor`);
      }
    } catch (error: any) {
      console.error(`Failed to ${action} vendor:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} vendor`);
    } finally {
      setActionLoading(null);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'pending' as VendorStatus, label: 'Pending Review', icon: Clock, count: 0, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'approved' as VendorStatus, label: 'Approved Vendors', icon: CheckCircle, count: 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'rejected' as VendorStatus, label: 'Rejected', icon: XCircle, count: 0, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  // Get count for each tab
  const getTabCount = (status: VendorStatus) => {
    if (!Array.isArray(vendors)) return 0;
    return vendors.filter((v) => v && (v.approvalStatus || 'pending') === status).length;
  };



  const isVendorIncomplete = (vendor: VendorWithId) => {
    if (!vendor) return true;
    return (
      !vendor.prices ||
      !vendor.prices.priceRate ||
      Object.keys(vendor.prices.priceRate).length === 0
    );
  };

  return (
    <InlineErrorBoundary>
      <AdminLayout
        title="Vendor Approvals"
        subtitle="Review and manage vendor onboarding applications."
      >

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">

          {/* Custom Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-lg w-full md:w-auto">
            {tabs.map(tab => {
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-slate-100' : 'bg-slate-200'} `}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading vendor data...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Filter className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No vendors found</h3>
              <p className="text-slate-500 max-w-sm">
                {searchQuery
                  ? `No results matching "${searchQuery}"`
                  : `There are no ${activeTab} vendors at the moment.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {(vendor.companyName?.[0] || 'C').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{vendor.companyName}</p>
                            <p className="text-xs text-slate-500">GST: {vendor.gstin || vendor.gstNo || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">{vendor.contactPersonName || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{vendor.vendorEmailAddress}</p>
                          <p className="text-xs text-slate-500">{vendor.vendorPhoneNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold uppercase border border-slate-200">
                            {(vendor.transportMode || vendor.mode || 'N/A')}
                          </span>
                          {isVendorIncomplete(vendor) && (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Incomplete</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400" />
                            <span>{vendor.city || vendor.geo?.city || 'N/A'}, {vendor.state || vendor.geo?.state}</span>
                          </div>
                          <p className="text-xs pl-5 text-slate-400">{vendor.pincode || vendor.geo?.pincode}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVendorAction(vendor._id, 'approve')}
                                disabled={!!actionLoading}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleVendorAction(vendor._id, 'reject')}
                                disabled={!!actionLoading}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}

                          {activeTab === 'approved' && (
                            <button
                              onClick={() => handleVendorAction(vendor._id, 'reject')}
                              disabled={!!actionLoading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject / Deactivate"
                            >
                              <XCircle size={18} />
                            </button>
                          )}

                          {activeTab === 'rejected' && (
                            <button
                              onClick={() => handleVendorAction(vendor._id, 'approve')}
                              disabled={!!actionLoading}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Re-Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}

                          <button
                            onClick={() => handleViewVendor(vendor)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors ml-2"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vendor Details Modal */}
        {isModalOpen && selectedVendor && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Vendor Details</h2>
                  <p className="text-sm text-slate-500">Reviewing application for {selectedVendor.companyName}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full p-2 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                {isVendorIncomplete(selectedVendor) && (
                  <div className="mb-6 border border-amber-200 bg-amber-50 rounded-xl p-4 flex gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg h-fit text-amber-700">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-800 text-sm">Missing Configuration</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Pricing or service configuration has not been added. Essential values may be missing.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Col */}
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Company Info</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Company Name</label>
                          <p className="font-semibold text-slate-900">{selectedVendor.companyName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-500 font-medium">GST Number</label>
                            <p className="font-medium text-slate-900">{selectedVendor.gstin || vendor.gstNo || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Vendor Code</label>
                            <p className="font-medium text-slate-900">{selectedVendor.vendorCode || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Rating</label>
                          <div className="flex items-center gap-1">
                            <div className="flex text-yellow-400 text-sm">
                              {'★'.repeat(Math.round(selectedVendor.rating || 0))}
                              <span className="text-slate-200">{'★'.repeat(5 - Math.round(selectedVendor.rating || 0))}</span>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">({selectedVendor.rating || 0}/5)</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Contact Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Contact Person</label>
                          <p className="font-medium text-slate-900">{selectedVendor.contactPersonName || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Email</label>
                            <p className="font-medium text-slate-900 break-words">{selectedVendor.vendorEmailAddress || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Phone</label>
                            <p className="font-medium text-slate-900">{selectedVendor.vendorPhoneNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Col */}
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Service & Location</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Address</label>
                          <p className="font-medium text-slate-900 text-sm">{selectedVendor.address || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Mode</label>
                            <p className="font-bold text-blue-600">{(selectedVendor.transportMode || selectedVendor.mode)?.toUpperCase() || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Service Type</label>
                            <p className="font-medium text-slate-900">{renderValue(selectedVendor.prices?.priceRate?.serviceMode)}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Pricing Snapshot</h3>
                      {selectedVendor.prices?.priceRate ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500 block">Min Weight</span>
                            <span className="font-bold text-slate-800">{selectedVendor.prices.priceRate.minWeight || 0} kg</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500 block">Min Charge</span>
                            <span className="font-bold text-slate-800">₹{selectedVendor.prices.priceRate.minCharges || 0}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500 block">Fuel Charge</span>
                            <span className="font-bold text-slate-800">{selectedVendor.prices.priceRate.fuel || 0}%</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <span className="text-xs text-slate-500 block">Docket</span>
                            <span className="font-bold text-slate-800">₹{selectedVendor.prices.priceRate.docketCharges || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No pricing configured</p>
                      )}
                    </section>
                  </div>
                </div>

                {/* Zone Config Details */}
                {selectedVendor.zoneConfig && Object.keys(selectedVendor.zoneConfig).length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Zone Configuration</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(selectedVendor.zoneConfig).map(zone => (
                        <div key={zone} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                          Zone {zone}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </InlineErrorBoundary>
  );
};

export default SuperAdminPage;
