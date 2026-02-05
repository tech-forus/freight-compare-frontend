import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllCustomers,
  updateCustomerSubscription,
  deleteCustomer,
  Customer,
} from '../services/userManagementApi';
import AdminLayout from '../components/admin/AdminLayout';

const CustomerManagementPage: React.FC = () => {
  // Note: Permission check is handled by AdminRoute in App.tsx
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, subscribed: 0, unsubscribed: 0 });

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

  return (
    <AdminLayout
      title="Customer Management"
      subtitle="Manage registered customers and subscription status."
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Customers</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <UserCheck size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Subscribed Users</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">{stats.subscribed}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Crown size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Free/Limited</p>
              <h3 className="text-3xl font-bold text-slate-600 mt-1">{stats.unsubscribed}</h3>
            </div>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <UserX size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            All Users
          </button>
          <button
            onClick={() => setFilterStatus('subscribed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'subscribed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            Subscribed
          </button>
          <button
            onClick={() => setFilterStatus('unsubscribed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'unsubscribed'
              ? 'bg-slate-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
          >
            Free Users
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                    <span className="text-slate-500">Loading customers...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-lg">No customers found</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${customer.isSubscribed ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {customer.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{customer.firstName} {customer.lastName}</p>
                            {customer.isSubscribed && <Crown size={14} className="text-amber-500 fill-amber-500" />}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">{customer.companyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          <span className="truncate max-w-[180px]">{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.isSubscribed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                          <Crown size={12} /> Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                          Free Plan
                        </span>
                      )}
                      <div className="ml-1 mt-1 text-xs text-slate-400">
                        {customer.tokenAvailable} tokens
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" />
                          <span>{customer.state || 'N/A'}</span>
                        </div>
                        <p className="text-xs pl-5 text-slate-400">{customer.pincode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleSubscription(customer._id, customer.isSubscribed)}
                          disabled={actionLoading === customer._id}
                          className={`p-2 rounded-lg transition-colors border ${customer.isSubscribed
                            ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                            }`}
                          title={customer.isSubscribed ? 'Revoke Subscription' : 'Upgrade to Premium'}
                        >
                          {actionLoading === customer._id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : customer.isSubscribed ? (
                            <UserX size={16} />
                          ) : (
                            <Crown size={16} />
                          )}
                        </button>

                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteCustomer(customer._id, `${customer.firstName} ${customer.lastName}`)}
                          disabled={actionLoading === customer._id}
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {isModalOpen && selectedCustomer && (
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
                <h2 className="text-xl font-bold text-slate-800">Customer Details</h2>
                <p className="text-sm text-slate-500">User ID: {selectedCustomer._id}</p>
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
              {/* Personal Information */}
              <section className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Full Name</span>
                    <p className="font-semibold text-slate-900">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Email</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Phone</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">WhatsApp</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.whatsappNumber || 'N/A'}</p>
                  </div>
                </div>
              </section>

              {/* Company Information */}
              <section className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Company Name</span>
                    <p className="font-semibold text-slate-900">{selectedCustomer.companyName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">GST Number</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.gstNumber}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Business Type</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.businessType || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Products</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.products || 'N/A'}</p>
                  </div>
                </div>
              </section>

              {/* Location Information */}
              <section className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <span className="text-xs text-slate-500 font-medium block">Address</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.address}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">State</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.state}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Pincode</span>
                    <p className="font-medium text-slate-900">{selectedCustomer.pincode}</p>
                  </div>
                </div>
              </section>

              {/* Account Status */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Account Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Subscription</span>
                    <p className="text-slate-900 mt-1">
                      {selectedCustomer.isSubscribed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-100">
                          <Crown className="w-3.5 h-3.5" /> Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold border border-slate-200">
                          Free User
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Tokens Available</span>
                    <p className="font-bold text-slate-900 text-lg">{selectedCustomer.tokenAvailable}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Joined Date</span>
                    <p className="font-medium text-slate-900">
                      {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Last Updated</span>
                    <p className="font-medium text-slate-900">
                      {new Date(selectedCustomer.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between gap-3 border-t border-slate-100">
              <button
                onClick={() =>
                  handleDeleteCustomer(
                    selectedCustomer._id,
                    `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  )
                }
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
              >
                <Trash2 size={16} /> Delete User
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleToggleSubscription(selectedCustomer._id, selectedCustomer.isSubscribed)
                  }
                  className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCustomer.isSubscribed
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    }`}
                >
                  {selectedCustomer.isSubscribed ? 'Revoke Subscription' : 'Activate Premium'}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CustomerManagementPage;
