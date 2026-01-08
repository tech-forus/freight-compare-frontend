import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Users, CheckSquare, LayoutDashboard, Settings, Truck, UserCircle, FileText, ArrowRight } from 'lucide-react';
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

  const dashboardSections = [
    {
      title: 'Vendor Management',
      description: 'Manage vendor applications and approvals',
      icon: CheckSquare,
      links: [
        {
          title: 'Vendor Approval Queue',
          description: 'Review and approve pending vendor applications',
          icon: CheckSquare,
          path: '/super-admin/vendor-approval',
        },
        {
          title: 'All Transporters & Vendors',
          description: 'View and manage all transporter accounts',
          icon: Truck,
          path: '/super-admin/user-management/transporters',
        },
      ],
    },
    {
      title: 'User Management',
      description: 'Manage users and their permissions',
      icon: Users,
      links: [
        {
          title: 'Customer Management',
          description: 'Manage customer accounts and subscriptions',
          icon: UserCircle,
          path: '/super-admin/user-management/customers',
        },
        {
          title: 'Transporter Management',
          description: 'Manage transporter accounts and vendors',
          icon: Truck,
          path: '/super-admin/user-management/transporters',
        },
      ],
    },
    {
      title: 'Form Builder & Settings',
      description: 'Customize forms and platform configuration',
      icon: Settings,
      links: [
        {
          title: 'Vendor Registration Form Builder',
          description: 'Customize Add Vendor form fields',
          icon: FileText,
          path: '/super-admin/form-builder',
        },
      ],
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
        <div className="space-y-6">
          {dashboardSections.map((section, idx) => {
            const SectionIcon = section.icon;
            return (
              <div key={idx} className="bg-white rounded-lg shadow-sm border border-slate-200">
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <SectionIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                      <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                    </div>
                  </div>
                </div>

                {/* Card Links */}
                <div className="p-4">
                  <div className="space-y-2">
                    {section.links.map((link, linkIdx) => {
                      const LinkIcon = link.icon;
                      return (
                        <button
                          key={linkIdx}
                          onClick={() => navigate(link.path)}
                          className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                        >
                          <div className="flex items-start gap-3 flex-1 text-left">
                            <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <h3 className="text-base font-semibold text-blue-600 group-hover:text-blue-700">
                                {link.title}
                              </h3>
                              <p className="text-sm text-slate-600 mt-0.5">{link.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
