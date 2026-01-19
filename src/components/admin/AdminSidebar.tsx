import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Settings,
    ShieldCheck,
    LogOut,
    Building2,
    FileText
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const AdminSidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            title: 'Dashboard',
            path: '/super-admin',
            icon: LayoutDashboard,
            exact: true,
        },
        {
            title: 'Vendor Approval',
            path: '/super-admin/vendor-approval',
            icon: CheckSquare,
        },
        {
            title: 'User Management',
            path: '/super-admin/user-management/customers', // Defaulting to customers sub-page
            icon: Users,
            matches: ['/super-admin/user-management'], // Highlight for all sub-routes
        },
        {
            title: 'Platform Config',
            path: '/super-admin/form-builder', // Defaulting to form-builder
            icon: Settings,
            matches: ['/super-admin/form-builder'],
        },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (item: any) => {
        if (item.exact) {
            return location.pathname === item.path;
        }
        if (item.matches) {
            return item.matches.some((match: string) => location.pathname.startsWith(match));
        }
        return location.pathname.startsWith(item.path);
    };

    return (
        <aside className="hidden lg:flex w-72 flex-col bg-slate-900 text-white min-h-screen fixed left-0 top-0 z-50 shadow-xl font-sans">
            {/* Brand Header */}
            <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800/60 bg-slate-950/30 backdrop-blur-sm">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/40">
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight">Super Admin</h1>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">CONTROL PANEL</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Main Menu</p>

                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={() => `
              relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
              ${isActive(item)
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 translate-x-1'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white hover:translate-x-1'}
            `}
                    >
                        <item.icon className={`w-5 h-5 transition-colors ${isActive(item) ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                        <span className="font-medium tracking-wide">{item.title}</span>

                        {isActive(item) && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full" />
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/20">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
                >
                    <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
