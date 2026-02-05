import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  CheckSquare,
  Settings,
  Truck,
  ShieldCheck,
  Building2,
  ChevronRight
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import AdminStatsCard from '../components/admin/AdminStatsCard';

const SuperAdminDashboard: React.FC = () => {
  // Note: Permission check is handled by AdminRoute in App.tsx
  // This page is only rendered if the user has 'dashboard' permission or is super admin
  const { user } = useAuth();
  const navigate = useNavigate();

  // MOCK DATA - In production, fetch this from an API
  // Use "getTemporaryTransporters" or similar to populate "Pending"
  const stats = [
    {
      title: 'Total Active Vendors',
      value: '124',
      icon: Truck,
      trend: '12%',
      trendUp: true,
      description: 'Verified shipping partners',
      color: 'blue'
    },
    {
      title: 'Pending Approvals',
      value: '4', // We can fetch this dynamically later
      icon: CheckSquare,
      trend: '2 pending',
      trendUp: false, // Attention needed
      description: 'Awaiting your review',
      color: 'orange'
    },
    {
      title: 'Total Customers',
      value: '1,893',
      icon: Users,
      trend: '85 this week',
      trendUp: true,
      description: 'Registered active users',
      color: 'purple'
    },
    {
      title: 'Platform Config',
      value: 'Active',
      icon: Settings,
      description: 'System operational',
      color: 'green'
    },
  ];

  return (
    <AdminLayout
      title="Dashboard Overview"
      subtitle={`Welcome back, ${user?.name || 'Admin'}. Here's what's happening today.`}
    >

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <AdminStatsCard key={idx} {...stat} />
        ))}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Chart / Activity Area (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Recent Activity / Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/super-admin/vendor-approval')}
                className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 hover:border-orange-200 transition-all group text-left"
              >
                <div className="p-3 bg-orange-500 text-white rounded-lg shadow-md shadow-orange-200 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span className="block font-bold text-slate-800">Review Vendors</span>
                  <span className="text-xs text-slate-500">4 applications pending</span>
                </div>
                <ChevronRight className="ml-auto text-orange-400" />
              </button>

              <button
                onClick={() => navigate('/super-admin/user-management/transporters')}
                className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="p-3 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-200 group-hover:scale-110 transition-transform">
                  <Truck size={20} />
                </div>
                <div>
                  <span className="block font-bold text-slate-800">Manage Transporters</span>
                  <span className="text-xs text-slate-500">View all database entries</span>
                </div>
                <ChevronRight className="ml-auto text-blue-400" />
              </button>
            </div>
          </div>

          {/* Placeholder Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[300px] flex flex-col justify-center items-center text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Platform Growth Analytics</h3>
            <p className="text-slate-500 max-w-sm">
              Detailed analytics charts for user registrations and vendor onboarding metrics will appear here.
            </p>
          </div>

        </div>

        {/* Sidebar / Secondary Area */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
            <h3 className="font-bold text-lg mb-2">Admin Pro Tips</h3>
            <p className="text-indigo-100 text-sm mb-4">
              Did you know you can verify vendors directly from the approval queue with a single click?
            </p>
            <button
              onClick={() => navigate('/super-admin/vendor-approval')}
              className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-colors"
            >
              Go to Approvals
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Server Status</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Online</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Database</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Healthy</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Email Service</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Version</span>
                <span className="text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">v1.2.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
};

export default SuperAdminDashboard;
