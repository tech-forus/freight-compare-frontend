import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Settings,
    ShieldCheck,
    LogOut,
    Home,
    Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AdminPermissionKey, hasPermission } from '../../config/adminPermissions';

const AdminSidebar: React.FC = () => {
    const { logout, user, isSuperAdmin, adminPermissions } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get user name for display
    const customer = (user as any)?.customer || user;
    const userName = customer?.firstName || 'Admin';

    // Define all possible menu items with permission requirements
    // To add a new permission-based menu item:
    // 1. Add permission to config/adminPermissions.ts
    // 2. Add the menu item here with the permission key
    const allMenuItems = [
        {
            title: 'Home',
            path: '/super-admin',
            icon: Home,
            exact: true,
            // No permission required - always shown to admins
        },
        {
            title: 'Dashboard',
            path: '/super-admin/dashboard',
            icon: LayoutDashboard,
            permission: 'dashboard' as AdminPermissionKey,
        },
        {
            title: 'Vendor Approval',
            path: '/super-admin/vendor-approval',
            icon: CheckSquare,
            permission: 'vendorApproval' as AdminPermissionKey,
        },
        {
            title: 'User Management',
            path: '/super-admin/user-management/customers',
            icon: Users,
            matches: ['/super-admin/user-management'],
            permission: 'userManagement' as AdminPermissionKey,
        },
        {
            title: 'Admin Management',
            path: '/super-admin/admin-management',
            icon: Shield,
            superAdminOnly: true, // Only super admin can see this
        },
        {
            title: 'Platform Config',
            path: '/super-admin/form-builder',
            icon: Settings,
            matches: ['/super-admin/form-builder'],
            permission: 'formBuilder' as AdminPermissionKey,
        },
    ];

    // Filter menu items based on permissions
    const menuItems = allMenuItems.filter(item => {
        // Super admin sees everything
        if (isSuperAdmin) return true;

        // Items marked as super admin only
        if (item.superAdminOnly) return false;

        // Check if user has the required permission using centralized helper
        if (item.permission) {
            return hasPermission(adminPermissions, item.permission);
        }

        // If no permission requirement, show by default
        return true;
    });

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
                <div className={`p-2 rounded-lg shadow-lg ${isSuperAdmin ? 'bg-purple-600 shadow-purple-900/40' : 'bg-blue-600 shadow-blue-900/40'}`}>
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight">
                        {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
                    </h1>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">
                        {isSuperAdmin ? 'FULL ACCESS' : `Hi, ${userName}`}
                    </p>
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
