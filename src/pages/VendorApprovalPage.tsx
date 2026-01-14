import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTemporaryTransporters } from '../services/api';
import { TemporaryTransporter } from '../utils/validators';
import { Loader2, CheckCircle, XCircle, Clock, Search, Filter, X, Eye, ArrowLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import http from '../lib/http';

type VendorStatus = 'pending' | 'approved' | 'rejected';

interface VendorWithId extends TemporaryTransporter {
  _id: string;
  approvalStatus?: VendorStatus;
  isVerified?: boolean;
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
    console.error('[VendorApproval UI Crash]', error, info);
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

const VendorApprovalPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VendorStatus>('pending');
  const [vendors, setVendors] = useState<VendorWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirect if not super admin
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        console.log('[VendorApproval] Fetching all vendors...');
        const data = await getTemporaryTransporters(undefined);
        console.log('[VendorApproval] Fetched vendors:', data?.length || 0, 'vendors');
        console.log('[VendorApproval] Sample vendor:', data?.[0]);
        setVendors(data || []);
        if (!data || data.length === 0) {
          toast.error('No vendors found in database');
        }
      } catch (error) {
        console.error('[VendorApproval] Failed to fetch vendors:', error);
        toast.error('Failed to load vendors');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    if (isSuperAdmin) {
      fetchVendors();
    }
  }, [isSuperAdmin]);

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

  // Handle marking vendor as unverified
  const handleMarkUnverified = async (vendorId: string) => {
    setActionLoading(vendorId);
    try {
      const response = await http.put(`/api/transporter/temporary/${vendorId}/verification`, {
        isVerified: false,
      });

      if (response.data.success) {
        toast.success('Vendor marked as unverified successfully');
        // Update local state
        setVendors((prev) =>
          prev.map((v) =>
            v._id === vendorId
              ? { ...v, isVerified: false }
              : v
          )
        );
      } else {
        toast.error(response.data.message || 'Failed to update verification status');
      }
    } catch (error: any) {
      console.error('Failed to update verification:', error);
      toast.error(error.response?.data?.message || 'Failed to update verification status');
    } finally {
      setActionLoading(null);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'pending' as VendorStatus, label: 'Pending', icon: Clock, color: 'text-yellow-600' },
    { id: 'approved' as VendorStatus, label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
    { id: 'rejected' as VendorStatus, label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  ];

  // Get count for each tab
  const getTabCount = (status: VendorStatus) => {
    if (!Array.isArray(vendors)) return 0;
    return vendors.filter((v) => v && (v.approvalStatus || 'pending') === status).length;
  };

  if (!isSuperAdmin) {
    return null;
  }

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
      <div className="min-h-screen bg-slate-50 py-8" style={{ position: 'relative' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Back Button */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/super-admin')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-slate-900">Vendor Approval</h1>
            <p className="text-slate-600 mt-2">Manage vendor applications and approvals</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by company name, email, or contact person..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="border-b border-slate-200">
              <div className="flex space-x-1 p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const count = getTabCount(tab.id);
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                        isActive
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vendor List */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">
                    {searchQuery
                      ? 'No vendors found matching your search'
                      : `No ${activeTab} vendors`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVendors.map((vendor) => {
                    if (!vendor || !vendor._id) return null;
                    return (
                      <div
                        key={vendor._id}
                        className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Vendor Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                  {vendor.companyName || 'N/A'}
                                </h3>
                                <p className="text-sm text-slate-600">{vendor.contactPersonName || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                              <div>
                                <span className="font-medium">Email:</span> {vendor.vendorEmailAddress || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Phone:</span> {vendor.vendorPhoneNumber || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">GST:</span> {vendor.gstin || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Transport:</span>{' '}
                                {vendor.transportMode?.toUpperCase() || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Location:</span> {vendor.geo?.city || 'N/A'},{' '}
                                {vendor.geo?.state || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Pincode:</span> {vendor.geo?.pincode || 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {activeTab === 'pending' && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleVendorAction(vendor._id, 'approve')}
                                disabled={actionLoading === vendor._id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {actionLoading === vendor._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleVendorAction(vendor._id, 'reject')}
                                disabled={actionLoading === vendor._id}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {actionLoading === vendor._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Reject
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewVendor(vendor);
                                }}
                                className="flex items-center justify-center p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          )}

                          {activeTab === 'approved' && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleMarkUnverified(vendor._id)}
                                disabled={actionLoading === vendor._id}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Mark as Unverified"
                              >
                                {actionLoading === vendor._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" />
                                )}
                                Show Unverified
                              </button>
                              <button
                                onClick={() => handleVendorAction(vendor._id, 'reject')}
                                disabled={actionLoading === vendor._id}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {actionLoading === vendor._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Reject
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewVendor(vendor);
                                }}
                                className="flex items-center justify-center p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          )}

                          {activeTab === 'rejected' && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleVendorAction(vendor._id, 'approve')}
                                disabled={actionLoading === vendor._id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {actionLoading === vendor._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewVendor(vendor);
                                }}
                                className="flex items-center justify-center p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Vendor Details Modal */}
          {isModalOpen && selectedVendor && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={handleCloseModal}
            >
              <div
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Vendor Details</h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:bg-red-700 rounded-full p-1 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  {isVendorIncomplete(selectedVendor) && (
                    <div className="mb-6 border border-yellow-300 bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-1">
                        Vendor Information Not Added
                      </h4>
                      <p className="text-sm text-yellow-700">
                        Pricing or service configuration has not been added for this vendor.
                        Some values may appear as <strong>N/A</strong>.
                      </p>
                    </div>
                  )}

                  {/* Company & Contact Information */}
                  <section className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                      Company & Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-slate-700">Legal Transporter Name:</span>
                        <p className="text-slate-900">{selectedVendor.companyName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Contact Person:</span>
                        <p className="text-slate-900">{selectedVendor.contactPersonName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Phone Number:</span>
                        <p className="text-slate-900">{selectedVendor.vendorPhoneNumber || selectedVendor.vendorPhone || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Email Address:</span>
                        <p className="text-slate-900">{selectedVendor.vendorEmailAddress || selectedVendor.vendorEmail || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">GST Number:</span>
                        <p className="text-slate-900">{selectedVendor.gstin || selectedVendor.gstNo || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Transporter Code:</span>
                        <p className="text-slate-900">{selectedVendor.vendorCode || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Sub Transporter:</span>
                        <p className="text-slate-900">{selectedVendor.subVendor || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Company Rating:</span>
                        <p className="text-slate-900">{selectedVendor.rating ? `${selectedVendor.rating} / 5.0` : 'N/A'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Location Information */}
                  <section className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                      Location Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-slate-700">Address:</span>
                        <p className="text-slate-900">{selectedVendor.address || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">State:</span>
                        <p className="text-slate-900">{selectedVendor.state || selectedVendor.geo?.state || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">City:</span>
                        <p className="text-slate-900">{selectedVendor.city || selectedVendor.geo?.city || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Pincode:</span>
                        <p className="text-slate-900">{selectedVendor.pincode || selectedVendor.geo?.pincode || 'N/A'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Service Information */}
                  <section className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                      Service Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-slate-700">Transport Mode:</span>
                        <p className="text-slate-900">
                          {(selectedVendor.transportMode || selectedVendor.mode)?.toUpperCase() || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <span className="font-medium text-slate-700">Service Mode:</span>
                        <p className="text-slate-900">
                          {renderValue(selectedVendor.prices?.priceRate?.serviceMode)}
                        </p>
                      </div>

                      <div>
                        <span className="font-medium text-slate-700">Selected Zones:</span>
                        <p className="text-slate-900">
                          {selectedVendor.selectedZones?.join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Zone Configuration */}
                  {selectedVendor.zoneConfig && Object.keys(selectedVendor.zoneConfig).length > 0 && (
                    <section className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                        Zone Configuration
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(selectedVendor.zoneConfig).map(([zone, pincodes]) => (
                          <div key={zone} className="bg-slate-50 p-3 rounded-lg">
                            <span className="font-medium text-slate-700">Zone {zone}:</span>
                            <p className="text-sm text-slate-600 mt-1">
                              {Array.isArray(pincodes) ? `${pincodes.length} pincodes configured` : 'No pincodes'}
                            </p>
                            {Array.isArray(pincodes) && pincodes.length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">
                                  View Pincodes
                                </summary>
                                <div className="mt-2 max-h-40 overflow-y-auto bg-white p-2 rounded text-xs">
                                  {pincodes.join(', ')}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Price Rate Information */}
                  {selectedVendor.prices?.priceRate && (
                    <section className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                        Pricing Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium text-slate-700">Min Weight:</span>
                          <p className="text-slate-900">{selectedVendor.prices.priceRate.minWeight || 'N/A'} kg</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Docket Charges:</span>
                          <p className="text-slate-900">₹{selectedVendor.prices.priceRate.docketCharges || 0}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Fuel Surcharge:</span>
                          <p className="text-slate-900">{selectedVendor.prices.priceRate.fuel || 0}%</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Min Charges:</span>
                          <p className="text-slate-900">₹{selectedVendor.prices.priceRate.minCharges || 0}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Divisor:</span>
                          <p className="text-slate-900">{selectedVendor.prices.priceRate.divisor || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Volumetric Unit:</span>
                          <p className="text-slate-900">{selectedVendor.prices.priceRate.volumetricUnit?.toUpperCase() || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Additional Charges */}
                      <div className="mt-4 bg-slate-50 p-4 rounded-lg">
                        <h4 className="font-medium text-slate-800 mb-2">Additional Charges</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600">ROV:</span>
                            <p className="text-slate-900">
                              {typeof selectedVendor.prices.priceRate.rovCharges === 'object'
                                ? `₹${selectedVendor.prices.priceRate.rovCharges?.fixed || 0} ${selectedVendor.prices.priceRate.rovCharges?.unit || ''}`
                                : `₹${selectedVendor.prices.priceRate.rovCharges || 0}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600">COD:</span>
                            <p className="text-slate-900">
                              {typeof selectedVendor.prices.priceRate.codCharges === 'object'
                                ? `₹${selectedVendor.prices.priceRate.codCharges?.fixed || 0} ${selectedVendor.prices.priceRate.codCharges?.unit || ''}`
                                : `₹${selectedVendor.prices.priceRate.codCharges || 0}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600">To Pay:</span>
                            <p className="text-slate-900">
                              {typeof selectedVendor.prices.priceRate.topayCharges === 'object'
                                ? `₹${selectedVendor.prices.priceRate.topayCharges?.fixed || 0} ${selectedVendor.prices.priceRate.topayCharges?.unit || ''}`
                                : `₹${selectedVendor.prices.priceRate.topayCharges || 0}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600">Handling:</span>
                            <p className="text-slate-900">
                              {typeof selectedVendor.prices.priceRate.handlingCharges === 'object'
                                ? `₹${selectedVendor.prices.priceRate.handlingCharges?.fixed || 0} ${selectedVendor.prices.priceRate.handlingCharges?.unit || ''}`
                                : `₹${selectedVendor.prices.priceRate.handlingCharges || 0}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600">Appointment:</span>
                            <p className="text-slate-900">
                              {typeof selectedVendor.prices.priceRate.appointmentCharges === 'object'
                                ? `₹${selectedVendor.prices.priceRate.appointmentCharges?.fixed || 0} ${selectedVendor.prices.priceRate.appointmentCharges?.unit || ''}`
                                : `₹${selectedVendor.prices.priceRate.appointmentCharges || 0}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600">Green Tax:</span>
                            <p className="text-slate-900">₹{selectedVendor.prices.priceRate.greenTax || 0}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Hamali:</span>
                            <p className="text-slate-900">₹{selectedVendor.prices.priceRate.hamaliCharges || 0}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Miscellaneous:</span>
                            <p className="text-slate-900">₹{selectedVendor.prices.priceRate.miscellanousCharges || 0}</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Invoice Value Charges */}
                  {selectedVendor.invoiceValueCharges && (
                    <section className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                        Invoice Value Charges
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium text-slate-700">Enabled:</span>
                          <p className="text-slate-900">{selectedVendor.invoiceValueCharges.enabled ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Percentage:</span>
                          <p className="text-slate-900">{selectedVendor.invoiceValueCharges.percentage * 100}%</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Minimum Amount:</span>
                          <p className="text-slate-900">₹{selectedVendor.invoiceValueCharges.minimumAmount || 0}</p>
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-6 py-4 flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </InlineErrorBoundary>
  );
};

export default VendorApprovalPage;
