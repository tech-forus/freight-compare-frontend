import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, UserCircle, Truck } from 'lucide-react';

const UserManagementPage: React.FC = () => {
  // Note: Permission check is handled by AdminRoute in App.tsx
  const navigate = useNavigate();

  const categories = [
    {
      title: 'Customers',
      description: 'Manage customer accounts and subscriptions',
      icon: UserCircle,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/super-admin/user-management/customers',
    },
    {
      title: 'Transporters',
      description: 'Manage transporter accounts and vendors',
      icon: Truck,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      path: '/super-admin/user-management/transporters',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
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
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          </div>
          <p className="text-slate-600 mt-2">Manage users and their permissions</p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.path}
                onClick={() => navigate(category.path)}
                className={`${category.color} ${category.hoverColor} text-white rounded-xl shadow-lg p-8 transition-all transform hover:scale-105 hover:shadow-xl text-left`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{category.title}</h2>
                    <p className="text-white text-opacity-90">{category.description}</p>
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

export default UserManagementPage;
