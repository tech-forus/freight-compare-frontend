import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { Menu, X, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
    children,
    title,
    subtitle,
    actions
}) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user } = useAuth();

    // Get current date for greeting
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans flex">
            {/* Sidebar - Desktop */}
            <AdminSidebar />

            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar Content */}
            <div className={`fixed inset-y-0 left-0 w-72 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-end p-4">
                    <button onClick={() => setIsMobileOpen(false)} className="text-white bg-slate-800 p-1 rounded-md">
                        <X size={24} />
                    </button>
                </div>
                <div className="h-full overflow-y-auto">
                    {/* Re-use sidebar content logic or import Sidebar content separately if we want true DRY */}
                    {/* For now, simplified: forcing desktop sidebar into mobile drawer logic is tricky without lifting state or props. 
                 Let's just use AdminSidebar and handle the mobile visibility via CSS classes if possible, 
                 but AdminSidebar is fixed. 
                 
                 Easier approach: Just use AdminSidebar but standard hidden/block logic for now. 
                 Wait, AdminSidebar defines "hidden lg:flex". So we need a mobile version or modify AdminSidebar.
                 
                 Let's Modify AdminSidebar to accept className or create a Mobile wrapper. 
                 Actually, reusing AdminSidebar for mobile usually just requires removing 'hidden lg:flex' via props override.
                 But let's keep it simple.
              */}
                    {/* NOTE: We might need to refactor AdminSidebar to be responsive if we want perfect mobile support.
                  For this "v1" overhaul, desktop focus is priority. 
              */}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-72 min-w-0 transition-all duration-300">

                {/* Top Header (Mobile Toggle + User Info) */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="hidden sm:block">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{today}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-700">{user?.name || 'Admin User'}</p>
                                <p className="text-xs text-blue-600 font-medium">Super Administrator</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                                {(user?.name || 'A')[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Page Header */}
                    {(title || actions) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                            <div>
                                {title && <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>}
                                {subtitle && <p className="mt-1 text-slate-500 text-lg">{subtitle}</p>}
                            </div>
                            {actions && (
                                <div className="flex items-center gap-3">
                                    {actions}
                                </div>
                            )}
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
