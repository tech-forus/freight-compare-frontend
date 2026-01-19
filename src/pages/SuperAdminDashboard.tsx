import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Truck,
  UserCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  Building2,
  ChevronRight
} from 'lucide-react';
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
      description: 'Oversee vendor onboarding, verifications, and approvals.',
      icon: Building2,
      color: 'bg-blue-100 text-blue-600',
      links: [
        {
          title: 'Vendor Approval Queue',
          description: 'Review pending applications',
          icon: CheckSquare,
          path: '/super-admin/vendor-approval',
        },
        {
          title: 'All Transporters & Vendors',
          description: 'Manage all accounts',
          icon: Truck,
          path: '/super-admin/user-management/transporters',
        },
      ],
    },
    {
      title: 'User Governance',
      description: 'Manage customer accounts, roles, and platform permissions.',
      icon: Users,
      color: 'bg-indigo-100 text-indigo-600',
      links: [
        {
          title: 'Customer Management',
          description: 'View customer database',
          icon: UserCircle,
          path: '/super-admin/user-management/customers',
        },
        {
          title: 'Transporter Management',
          description: 'Monitor transporter activities',
          icon: Truck,
          path: '/super-admin/user-management/transporters',
        },
      ],
    },
    {
      title: 'Platform Config',
      description: 'Customize system settings, forms, and technical configurations.',
      icon: Settings,
      color: 'bg-slate-100 text-slate-600',
      links: [
        {
          title: 'Form Builder',
          description: 'Edit registration forms',
          icon: FileText,
          path: '/super-admin/form-builder',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header Section */}
        <div className="text-center md:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold tracking-wide text-blue-700 uppercase">Admin Access</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Super Admin <span className="text-blue-600">Dashboard</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Centralized control for managing vendors, users, and platform configurations efficiently.
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dashboardSections.map((section, idx) => {
            const SectionIcon = section.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col items-start bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 ease-in-out hover:-translate-y-1"
              >
                {/* Section Header */}
                <div className={`p-3 rounded-xl mb-6 ${section.color} group-hover:scale-110 transition-transform duration-300`}>
                  <SectionIcon className="w-8 h-8" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {section.title}
                </h2>
                <p className="text-slate-500 mb-8 min-h-[48px]">
                  {section.description}
                </p>

                {/* Links / Actions */}
                <div className="w-full space-y-3 mt-auto">
                  {section.links.map((link, linkIdx) => {
                    const LinkIcon = link.icon;
                    return (
                      <button
                        key={linkIdx}
                        onClick={() => navigate(link.path)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all duration-200 group/btn"
                      >
                        <div className="flex items-center gap-3">
                          <LinkIcon className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-600 transition-colors" />
                          <div className="text-left">
                            <span className="block font-semibold text-slate-700 group-hover/btn:text-slate-900 transition-colors">
                              {link.title}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {link.description}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover/btn:text-blue-500 group-hover/btn:translate-x-1 transition-all" />
                      </button>
                    );
                  })}
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
