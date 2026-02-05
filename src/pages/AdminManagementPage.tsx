import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import {
  Shield,
  Search,
  UserCheck,
  UserX,
  Settings,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import http from '../lib/http';

interface AdminPermissions {
  formBuilder: boolean;
  dashboard: boolean;
  vendorApproval: boolean;
  userManagement: boolean;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  isAdmin: boolean;
  adminPermissions?: AdminPermissions;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    stats: {
      totalUsers: number;
      totalAdmins: number;
      totalRegularUsers: number;
    };
  };
}

const AdminManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalRegularUsers: 0,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermissions>({
    formBuilder: true,
    dashboard: false,
    vendorApproval: false,
    userManagement: false,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await http.get<ApiResponse>('/api/admin/management/admins', {
        params: { search: searchQuery || undefined },
      });

      if (response.data.success) {
        setUsers(response.data.data.users);
        setStats(response.data.data.stats);
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAdmin = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await http.put(`/api/admin/management/admins/${userId}/approve`);

      if (response.data.success) {
        toast.success(response.data.message);
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Failed to approve admin:', error);
      toast.error(error.response?.data?.message || 'Failed to approve admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await http.put(`/api/admin/management/admins/${userId}/revoke`);

      if (response.data.success) {
        toast.success(response.data.message);
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Failed to revoke admin:', error);
      toast.error(error.response?.data?.message || 'Failed to revoke admin access');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setPermissions(user.adminPermissions || {
      formBuilder: true,
      dashboard: false,
      vendorApproval: false,
      userManagement: false,
    });
    setShowPermissionsModal(true);
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading('permissions');
      const response = await http.put(
        `/api/admin/management/admins/${selectedUser._id}/permissions`,
        permissions
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setShowPermissionsModal(false);
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setActionLoading(null);
    }
  };

  const isSuperAdmin = (email: string) => email === 'forus@gmail.com';

  return (
    <AdminLayout
      title="Admin Management"
      subtitle="Manage admin users and their permissions"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Admins</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalAdmins}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Regular Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalRegularUsers}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg">
              <UserX className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    <p className="text-slate-600 mt-2">Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-600">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{user.companyName || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {isSuperAdmin(user.email) ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          <Shield className="w-3.5 h-3.5" />
                          Super Admin
                        </span>
                      ) : user.isAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Regular User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isAdmin && !isSuperAdmin(user.email) ? (
                        <div className="flex flex-wrap gap-1">
                          {user.adminPermissions?.formBuilder && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              Form Builder
                            </span>
                          )}
                          {user.adminPermissions?.dashboard && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              Dashboard
                            </span>
                          )}
                          {user.adminPermissions?.vendorApproval && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                              Vendor Approval
                            </span>
                          )}
                          {user.adminPermissions?.userManagement && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                              User Management
                            </span>
                          )}
                        </div>
                      ) : isSuperAdmin(user.email) ? (
                        <span className="text-xs text-slate-500">All Permissions</span>
                      ) : (
                        <span className="text-xs text-slate-400">No permissions</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isSuperAdmin(user.email) && (
                          <>
                            {user.isAdmin ? (
                              <>
                                <button
                                  onClick={() => handleOpenPermissionsModal(user)}
                                  disabled={actionLoading === user._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Settings className="w-4 h-4" />
                                  Configure
                                </button>
                                <button
                                  onClick={() => handleRevokeAdmin(user._id)}
                                  disabled={actionLoading === user._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoading === user._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <UserX className="w-4 h-4" />
                                  )}
                                  Revoke
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleApproveAdmin(user._id)}
                                disabled={actionLoading === user._id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {actionLoading === user._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                                Approve as Admin
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Configure Permissions
            </h3>
            <p className="text-slate-600 mb-6">
              {selectedUser.firstName} {selectedUser.lastName}
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.formBuilder}
                  onChange={(e) =>
                    setPermissions({ ...permissions, formBuilder: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-slate-900">Form Builder</p>
                  <p className="text-xs text-slate-500">Access to Platform Config Form Builder</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.dashboard}
                  onChange={(e) =>
                    setPermissions({ ...permissions, dashboard: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-slate-900">Dashboard</p>
                  <p className="text-xs text-slate-500">Access to Analytics Dashboard</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.vendorApproval}
                  onChange={(e) =>
                    setPermissions({ ...permissions, vendorApproval: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-slate-900">Vendor Approval</p>
                  <p className="text-xs text-slate-500">Access to Vendor Approval page</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={permissions.userManagement}
                  onChange={(e) =>
                    setPermissions({ ...permissions, userManagement: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-slate-900">User Management</p>
                  <p className="text-xs text-slate-500">Access to User Management page</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPermissionsModal(false)}
                disabled={actionLoading === 'permissions'}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={actionLoading === 'permissions'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {actionLoading === 'permissions' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Permissions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminManagementPage;
