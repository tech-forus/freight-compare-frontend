import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Users, CheckSquare, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';

const SuperAdminDashboard: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect if not super admin
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) {
    return null;
  }

  const dashboardOptions = [
    {
      title: 'Vendor Approval',
      description: 'Manage vendor applications and approvals',
      icon: CheckSquare,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      path: '/super-admin/vendor-approval',
    },
    {
      title: 'User Management',
      description: 'Manage users and their permissions',
      icon: Users,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/super-admin/user-management',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
          </div>
          <p className="text-slate-600 mt-2">Manage your platform from here</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.path}
                onClick={() => navigate(option.path)}
                className={`${option.color} ${option.hoverColor} text-white rounded-xl shadow-lg p-8 transition-all transform hover:scale-105 hover:shadow-xl text-left`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{option.title}</h2>
                    <p className="text-white text-opacity-90">{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
