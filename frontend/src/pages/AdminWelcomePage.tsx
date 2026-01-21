import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AdminLayout from '../components/admin/AdminLayout';
import {
  ADMIN_PERMISSIONS,
  getAvailableRoutes,
  hasAnyPermission,
  AdminPermissionKey,
} from '../config/adminPermissions';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  Shield,
  ChevronRight,
} from 'lucide-react';

// Map icon names to components
const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
};

const AdminWelcomePage: React.FC = () => {
  const { user, adminPermissions, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Get user's name
  const customer = (user as any)?.customer || user;
  const userName = customer?.firstName
    ? `${customer.firstName} ${customer.lastName || ''}`
    : 'Admin';

  // Get available routes for this user
  const availableRoutes = getAvailableRoutes(adminPermissions);
  const hasPermissions = hasAnyPermission(adminPermissions);

  return (
    <AdminLayout
      title={`Welcome, ${userName}!`}
      subtitle="Access your admin tools below"
    >
      {/* Quick Stats */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin Dashboard</h2>
              <p className="text-blue-100">
                {isSuperAdmin
                  ? 'You have full super admin access to all features.'
                  : `You have access to ${availableRoutes.length} admin feature${availableRoutes.length !== 1 ? 's' : ''}.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Features */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          {isSuperAdmin ? 'All Admin Features' : 'Your Available Features'}
        </h3>

        {!hasPermissions && !isSuperAdmin ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-800 mb-2">
              No Permissions Assigned
            </h4>
            <p className="text-slate-600 mb-4">
              You've been granted admin status, but no specific permissions have been assigned yet.
              Please contact the super admin to get access to admin features.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Show all permissions for super admin, or just available ones for regular admin */}
            {(isSuperAdmin
              ? Object.values(ADMIN_PERMISSIONS)
              : availableRoutes
            ).map((perm) => {
              const IconComponent = iconMap[perm.icon] || Settings;
              const isAccessible =
                isSuperAdmin ||
                adminPermissions?.[perm.key as AdminPermissionKey];

              return (
                <button
                  key={perm.key}
                  onClick={() => navigate(perm.route)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center justify-between p-4 rounded-xl border transition-all
                    ${
                      isAccessible
                        ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                        : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        isAccessible ? 'bg-blue-100' : 'bg-slate-200'
                      }`}
                    >
                      <IconComponent
                        className={`w-6 h-6 ${
                          isAccessible ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <h4
                        className={`font-semibold ${
                          isAccessible ? 'text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        {perm.label}
                      </h4>
                      <p
                        className={`text-sm ${
                          isAccessible ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {perm.description}
                      </p>
                    </div>
                  </div>
                  {isAccessible && (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              );
            })}

            {/* Super Admin Only: Admin Management */}
            {isSuperAdmin && (
              <button
                onClick={() => navigate('/super-admin/admin-management')}
                className="flex items-center justify-between p-4 rounded-xl border bg-purple-50 border-purple-200 hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-800">
                      Admin Management
                    </h4>
                    <p className="text-sm text-slate-600">
                      Manage admin users and permissions
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-2">Need More Access?</h4>
        <p className="text-slate-600 text-sm">
          If you need access to additional features, please contact the super
          admin at <span className="font-medium">forus@gmail.com</span>.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminWelcomePage;
