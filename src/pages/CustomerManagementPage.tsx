import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllCustomers,
  getCustomerById,
  updateCustomerSubscription,
  deleteCustomer,
  Customer,
} from '../services/userManagementApi';

const CustomerManagementPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, subscribed: 0, unsubscribed: 0 });

  // Redirect if not super admin
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, [filterStatus]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const data = await getAllCustomers(params);
      setCustomers(data.customers);
      setStats(data.stats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers by search query
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(query) ||
      customer.lastName?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.companyName?.toLowerCase().includes(query)
    );
  });

  // Handle view customer details
  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  // Handle toggle subscription
  const handleToggleSubscription = async (customerId: string, currentStatus: boolean) => {
    setActionLoading(customerId);
    try {
      await updateCustomerSubscription(customerId, !currentStatus);
      toast.success(`Subscription ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subscription');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(customerId);
    try {
      await deleteCustomer(customerId);
      toast.success('Customer deleted successfully');
      fetchCustomers();
      if (selectedCustomer?._id === customerId) {
        handleCloseModal();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete customer');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

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
          <h1 className="text-3xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-slate-600 mt-2">Manage customer accounts and subscriptions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Customers</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Subscribed</p>
                <p className="text-3xl font-bold text-green-600">{stats.subscribed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Crown className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Free Users</p>
                <p className="text-3xl font-bold text-slate-600">{stats.unsubscribed}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-lg">
                <UserX className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('subscribed')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'subscribed'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Subscribed
              </button>
              <button
                onClick={() => setFilterStatus('unsubscribed')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'unsubscribed'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Free
              </button>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {searchQuery ? 'No customers found matching your search' : 'No customers found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer._id}
                    className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Customer Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                              {customer.firstName} {customer.lastName}
                              {customer.isSubscribed && (
                                <Crown className="w-5 h-5 text-yellow-500" title="Subscribed" />
                              )}
                            </h3>
                            <p className="text-sm text-slate-600">{customer.companyName}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>GST: {customer.gstNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {customer.state} - {customer.pincode}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Tokens: {customer.tokenAvailable}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            handleToggleSubscription(customer._id, customer.isSubscribed)
                          }
                          disabled={actionLoading === customer._id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            customer.isSubscribed
                              ? 'bg-slate-600 text-white hover:bg-slate-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {actionLoading === customer._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : customer.isSubscribed ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          {customer.isSubscribed ? 'Revoke' : 'Subscribe'}
                        </button>
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="flex items-center justify-center p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteCustomer(
                              customer._id,
                              `${customer.firstName} ${customer.lastName}`
                            )
                          }
                          disabled={actionLoading === customer._id}
                          className="flex items-center justify-center p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customer Details Modal */}
        {isModalOpen && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Customer Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-blue-700 rounded-full p-1 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Personal Information */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-slate-700">Full Name:</span>
                      <p className="text-slate-900">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Email:</span>
                      <p className="text-slate-900">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Phone:</span>
                      <p className="text-slate-900">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">WhatsApp:</span>
                      <p className="text-slate-900">{selectedCustomer.whatsappNumber || 'N/A'}</p>
                    </div>
                  </div>
                </section>

                {/* Company Information */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-slate-700">Company Name:</span>
                      <p className="text-slate-900">{selectedCustomer.companyName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">GST Number:</span>
                      <p className="text-slate-900">{selectedCustomer.gstNumber}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Business Type:</span>
                      <p className="text-slate-900">{selectedCustomer.businessType || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Products:</span>
                      <p className="text-slate-900">{selectedCustomer.products || 'N/A'}</p>
                    </div>
                  </div>
                </section>

                {/* Location Information */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                    Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-slate-700">Address:</span>
                      <p className="text-slate-900">{selectedCustomer.address}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">State:</span>
                      <p className="text-slate-900">{selectedCustomer.state}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Pincode:</span>
                      <p className="text-slate-900">{selectedCustomer.pincode}</p>
                    </div>
                  </div>
                </section>

                {/* Account Status */}
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">
                    Account Status
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-slate-700">Subscription:</span>
                      <p className="text-slate-900">
                        {selectedCustomer.isSubscribed ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                            <Crown className="w-4 h-4" /> Active
                          </span>
                        ) : (
                          <span className="text-slate-600">Free User</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Tokens Available:</span>
                      <p className="text-slate-900">{selectedCustomer.tokenAvailable}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Joined Date:</span>
                      <p className="text-slate-900">
                        {new Date(selectedCustomer.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Last Updated:</span>
                      <p className="text-slate-900">
                        {new Date(selectedCustomer.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() =>
                    handleToggleSubscription(selectedCustomer._id, selectedCustomer.isSubscribed)
                  }
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    selectedCustomer.isSubscribed
                      ? 'bg-slate-600 text-white hover:bg-slate-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {selectedCustomer.isSubscribed ? 'Revoke Subscription' : 'Activate Subscription'}
                </button>
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
  );
};

export default CustomerManagementPage;
