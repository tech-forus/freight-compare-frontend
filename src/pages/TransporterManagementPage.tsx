import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Mail,
  Phone,
  Building2,
  MapPin,
  X,
  Edit2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getTemporaryTransporters, updateTemporaryTransporter } from '../services/api';
import { getAllTransporters, Transporter } from '../services/userManagementApi';
import http from '../lib/http';

type VendorStatus = 'pending' | 'approved' | 'rejected';

interface TempVendor {
  _id: string;
  companyName: string;
  contactPersonName?: string;
  vendorEmailAddress?: string;
  vendorPhoneNumber?: string;
  gstin?: string;
  transportMode?: string;
  geo?: { city?: string; state?: string; pincode?: number };
  approvalStatus?: VendorStatus;
  createdAt?: string;
  updatedAt?: string;

  // Additional fields from schema
  vendorCode?: string;
  vendorPhone?: number;
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
  prices?: any;
}

const TransporterManagementPage: React.FC = () => {
  // Note: Permission check is handled by AdminRoute in App.tsx
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'vendors' | 'transporters'>('vendors');
  const [vendorStatusFilter, setVendorStatusFilter] = useState<VendorStatus | 'all'>('all');

  const [tempVendors, setTempVendors] = useState<TempVendor[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<TempVendor | Transporter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'vendors') {
      fetchTempVendors();
    } else {
      fetchTransporters();
    }
  }, [activeTab]);

  const fetchTempVendors = async () => {
    setLoading(true);
    try {
      // Pass undefined to get ALL vendors (for super admin)
      const data = await getTemporaryTransporters(undefined);
      setTempVendors(data || []);
    } catch (error: any) {
      toast.error('Failed to load vendors');
      setTempVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransporters = async () => {
    setLoading(true);
    try {
      const data = await getAllTransporters();
      setTransporters(data.transporters || []);
    } catch (error: any) {
      toast.error('Failed to load transporters');
      setTransporters([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter vendors by status
  const filteredVendors = tempVendors.filter((vendor) => {
    const status = vendor.approvalStatus || 'pending';
    const matchesStatus = vendorStatusFilter === 'all' || status === vendorStatusFilter;

    if (!matchesStatus) return false;

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      vendor.companyName?.toLowerCase().includes(query) ||
      vendor.vendorEmailAddress?.toLowerCase().includes(query) ||
      vendor.contactPersonName?.toLowerCase().includes(query)
    );
  });

  // Filter transporters by search
  const filteredTransporters = transporters.filter((transporter) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      transporter.companyName?.toLowerCase().includes(query) ||
      transporter.email?.toLowerCase().includes(query)
    );
  });

  // Get vendor counts
  const getVendorCount = (status: VendorStatus | 'all') => {
    if (status === 'all') return tempVendors.length;
    return tempVendors.filter((v) => (v.approvalStatus || 'pending') === status).length;
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
        fetchTempVendors();
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

  const handleViewDetails = (item: TempVendor | Transporter) => {
    setSelectedItem(item);
    setEditedData(item);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setIsEditing(false);
    setEditedData({});
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original data
      setEditedData(selectedItem);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedItem || !('_id' in selectedItem)) return;

    setSaveLoading(true);
    try {
      const response = await updateTemporaryTransporter(selectedItem._id, editedData);

      if (response.success) {
        toast.success('Vendor updated successfully');
        setIsEditing(false);
        setSelectedItem(response.data);
        setEditedData(response.data);
        fetchTempVendors();
      } else {
        toast.error(response.message || 'Failed to update vendor');
      }
    } catch (error: any) {
      console.error('Failed to update vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    } finally {
      setSaveLoading(false);
    }
  };

  const statusTabs = [
    { id: 'all' as const, label: 'All', icon: Filter, color: 'text-slate-600' },
    { id: 'pending' as const, label: 'Pending', icon: Clock, color: 'text-yellow-600' },
    { id: 'approved' as const, label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
    { id: 'rejected' as const, label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/super-admin/user-management')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to User Management</span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Transporter Management</h1>
          <p className="text-slate-600 mt-2">Manage vendors and transporter accounts</p>
        </div>

        {/* Main Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
            <div className="flex space-x-1 p-2">
              <button
                onClick={() => setActiveTab('vendors')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'vendors'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Truck className="w-5 h-5" />
                <span>Vendors (Pending Approval)</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'vendors'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {tempVendors.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('transporters')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'transporters'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Main Transporters</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'transporters'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {transporters.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Vendor Status Tabs (only for vendors tab) */}
        {activeTab === 'vendors' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="border-b border-slate-200">
              <div className="flex space-x-1 p-2">
                {statusTabs.map((tab) => {
                  const Icon = tab.icon;
                  const count = getVendorCount(tab.id);
                  const isActive = vendorStatusFilter === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setVendorStatusFilter(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${isActive
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'vendors' ? 'vendors' : 'transporters'} by name or email...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
            ) : activeTab === 'vendors' ? (
              filteredVendors.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">
                    {searchQuery
                      ? 'No vendors found matching your search'
                      : `No ${vendorStatusFilter === 'all' ? '' : vendorStatusFilter} vendors`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVendors.map((vendor) => (
                    <div
                      key={vendor._id}
                      className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Vendor Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {vendor.companyName || 'N/A'}
                          </h3>
                          <p className="text-sm text-slate-600">{vendor.contactPersonName || 'N/A'}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mt-2">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{vendor.vendorEmailAddress || vendor.vendorEmail || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{vendor.vendorPhoneNumber || vendor.vendorPhone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>GST: {vendor.gstin || vendor.gstNo || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {vendor.geo?.city || vendor.city || 'N/A'}, {vendor.geo?.state || vendor.state || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          {(vendor.approvalStatus || 'pending') === 'pending' && (
                            <>
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
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </>
                          )}
                          {(vendor.approvalStatus || 'pending') === 'approved' && (
                            <button
                              onClick={() => handleVendorAction(vendor._id, 'reject')}
                              disabled={actionLoading === vendor._id}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          )}
                          {(vendor.approvalStatus || 'pending') === 'rejected' && (
                            <button
                              onClick={() => handleVendorAction(vendor._id, 'approve')}
                              disabled={actionLoading === vendor._id}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(vendor)}
                            className="flex items-center justify-center p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredTransporters.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {searchQuery ? 'No transporters found matching your search' : 'No transporters found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransporters.map((transporter) => (
                  <div
                    key={transporter._id}
                    className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Transporter Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {transporter.companyName}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mt-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{transporter.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{transporter.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>GST: {transporter.gstNo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>Trucks: {transporter.noOfTrucks || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* View Button */}
                      <button
                        onClick={() => handleViewDetails(transporter)}
                        className="flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details Modal with Edit Capability */}
        {isModalOpen && selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-orange-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {activeTab === 'vendors' ? 'Vendor' : 'Transporter'} Details
                  {isEditing && <span className="ml-2 text-sm">(Editing)</span>}
                </h2>
                <div className="flex items-center gap-2">
                  {activeTab === 'vendors' && !isEditing && (
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:bg-orange-700 rounded-full p-1 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Company Information */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData.companyName || ''}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">{selectedItem.companyName || 'N/A'}</p>
                      )}
                    </div>

                    {'contactPersonName' in selectedItem && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData.contactPersonName || ''}
                            onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <p className="text-slate-900 py-2">{selectedItem.contactPersonName || 'N/A'}</p>
                        )}
                      </div>
                    )}

                    {'vendorCode' in selectedItem && selectedItem.vendorCode && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Code</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData.vendorCode || ''}
                            onChange={(e) => handleInputChange('vendorCode', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <p className="text-slate-900 py-2">{selectedItem.vendorCode || 'N/A'}</p>
                        )}
                      </div>
                    )}

                    {'subVendor' in selectedItem && selectedItem.subVendor && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sub Vendor</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData.subVendor || ''}
                            onChange={(e) => handleInputChange('subVendor', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <p className="text-slate-900 py-2">{selectedItem.subVendor || 'N/A'}</p>
                        )}
                      </div>
                    )}

                    {'rating' in selectedItem && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={editedData.rating || 0}
                            onChange={(e) => handleInputChange('rating', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <p className="text-slate-900 py-2">{selectedItem.rating || 'N/A'}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Contact Information */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={
                            editedData.vendorEmailAddress ||
                            editedData.vendorEmail ||
                            editedData.email ||
                            ''
                          }
                          onChange={(e) => {
                            if ('vendorEmailAddress' in editedData) {
                              handleInputChange('vendorEmailAddress', e.target.value);
                            } else if ('vendorEmail' in editedData) {
                              handleInputChange('vendorEmail', e.target.value);
                            } else {
                              handleInputChange('email', e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">
                          {'vendorEmailAddress' in selectedItem
                            ? selectedItem.vendorEmailAddress
                            : 'vendorEmail' in selectedItem
                              ? selectedItem.vendorEmail
                              : 'email' in selectedItem
                                ? selectedItem.email
                                : 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={
                            editedData.vendorPhoneNumber ||
                            editedData.vendorPhone ||
                            editedData.phone ||
                            ''
                          }
                          onChange={(e) => {
                            if ('vendorPhoneNumber' in editedData) {
                              handleInputChange('vendorPhoneNumber', e.target.value);
                            } else if ('vendorPhone' in editedData) {
                              handleInputChange('vendorPhone', parseFloat(e.target.value));
                            } else {
                              handleInputChange('phone', parseFloat(e.target.value));
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">
                          {'vendorPhoneNumber' in selectedItem
                            ? selectedItem.vendorPhoneNumber
                            : 'vendorPhone' in selectedItem
                              ? selectedItem.vendorPhone
                              : 'phone' in selectedItem
                                ? selectedItem.phone
                                : 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData.gstin || editedData.gstNo || ''}
                          onChange={(e) => {
                            if ('gstin' in editedData) {
                              handleInputChange('gstin', e.target.value);
                            } else {
                              handleInputChange('gstNo', e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">
                          {'gstin' in selectedItem
                            ? selectedItem.gstin
                            : 'gstNo' in selectedItem
                              ? selectedItem.gstNo
                              : 'N/A'}
                        </p>
                      )}
                    </div>

                    {'transportMode' in selectedItem && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Transport Mode</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedData.transportMode || editedData.mode || ''}
                            onChange={(e) => {
                              if ('transportMode' in editedData) {
                                handleInputChange('transportMode', e.target.value);
                              } else {
                                handleInputChange('mode', e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <p className="text-slate-900 py-2">{selectedItem.transportMode || 'mode' in selectedItem && selectedItem.mode || 'N/A'}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Address Information */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {'address' in selectedItem && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        {isEditing ? (
                          <textarea
                            value={editedData.address || ''}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <p className="text-slate-900 py-2">{selectedItem.address || 'N/A'}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData.city || (editedData.geo && editedData.geo.city) || ''}
                          onChange={(e) => {
                            if ('geo' in editedData) {
                              handleInputChange('geo', { ...editedData.geo, city: e.target.value });
                            } else {
                              handleInputChange('city', e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">
                          {('geo' in selectedItem && selectedItem.geo?.city) || ('city' in selectedItem && selectedItem.city) || 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData.state || (editedData.geo && editedData.geo.state) || ''}
                          onChange={(e) => {
                            if ('geo' in editedData) {
                              handleInputChange('geo', { ...editedData.geo, state: e.target.value });
                            } else {
                              handleInputChange('state', e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">
                          {('geo' in selectedItem && selectedItem.geo?.state) || ('state' in selectedItem && selectedItem.state) || 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedData.pincode || (editedData.geo && editedData.geo.pincode) || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if ('geo' in editedData) {
                              handleInputChange('geo', { ...editedData.geo, pincode: value });
                            } else {
                              handleInputChange('pincode', value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-slate-900 py-2">
                          {('geo' in selectedItem && selectedItem.geo?.pincode) || ('pincode' in selectedItem && selectedItem.pincode) || 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Status and Metadata */}
                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">
                    Status & Metadata
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {'approvalStatus' in selectedItem && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Approval Status</label>
                        <p className="text-slate-900 py-2">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${selectedItem.approvalStatus === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : selectedItem.approvalStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {selectedItem.approvalStatus || 'pending'}
                          </span>
                        </p>
                      </div>
                    )}

                    {'selectedZones' in selectedItem && selectedItem.selectedZones && selectedItem.selectedZones.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Selected Zones</label>
                        <p className="text-slate-900 py-2">{selectedItem.selectedZones.join(', ')}</p>
                      </div>
                    )}

                    {'createdAt' in selectedItem && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Created At</label>
                        <p className="text-slate-900 py-2">
                          {selectedItem.createdAt
                            ? new Date(selectedItem.createdAt).toLocaleString()
                            : 'N/A'}
                        </p>
                      </div>
                    )}

                    {'updatedAt' in selectedItem && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Updated At</label>
                        <p className="text-slate-900 py-2">
                          {selectedItem.updatedAt
                            ? new Date(selectedItem.updatedAt).toLocaleString()
                            : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleEditToggle}
                      className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saveLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransporterManagementPage;
