// File: components/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  LogOut as LogOutIcon,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Truck,
  PackagePlus,
  Info,
  History,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable & Styled Components (Unchanged) ---
const BrandLogo = () => (
  <Link to="/" className="flex items-center gap-2 flex-shrink-0">
    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
      <Truck className="w-5 h-5 text-white" />
    </div>
    <h1 className="text-xl font-bold text-slate-800">FreightCompare</h1>
  </Link>
);

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
  >
    {children}
  </Link>
);

const UserProfileDropdown = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Safely extract customer info - handle both formats:
  // 1. user.customer (from login response)
  // 2. user directly (from /api/auth/me or localStorage)
  const customer = (user as any)?.customer || (user as any);
  const userInitial = customer?.firstName?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <div className="w-8 h-8 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm">
          {userInitial}
        </div>
        <span className="hidden md:inline text-sm font-medium text-slate-700">
          Hi, {customer?.firstName || 'User'}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border z-20"
          >
            <div className="p-2">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">
                  {customer?.firstName || ''} {customer?.lastName || ''}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {customer?.email || ''}
                </p>
              </div>
              <hr className="my-1 border-slate-100" />
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <UserIcon size={16} /> Profile
              </Link>

              {/* DUPLICATE DASHBOARD LINK (now correct) */}
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>

              <Link
                to="/my-vendors"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <Truck size={16} /> My Vendor
              </Link>
              <Link
                to="/recent-searches"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <History size={16} /> Box Libraries
              </Link>
              <hr className="my-1 border-slate-100" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium"
              >
                <LogOutIcon size={16} /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MOBILE NAVIGATION (updated) ---
const MobileNav = ({ isOpen, closeMenu }: { isOpen: boolean; closeMenu: () => void }) => {
  const { isAuthenticated, logout, isAdmin } = useAuth();

  const handleSignOut = () => {
    logout();
    closeMenu();
  };
  const MobileNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      onClick={closeMenu}
      className="flex items-center gap-4 p-3 -m-3 rounded-lg hover:bg-slate-100 transition-colors"
    >
      {children}
    </Link>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMenu}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 right-0 h-full w-full max-w-xs bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <BrandLogo />
              <button onClick={closeMenu} className="p-2 -m-2">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-1 text-base font-medium text-slate-800">
              {isAuthenticated && (
                <>
                  {/* MOBILE: Dashboard now links to /dashboard */}
                  <MobileNavLink to="/dashboard">
                    <LayoutDashboard size={20} className="text-blue-600" /> Dashboard
                  </MobileNavLink>


                  <MobileNavLink to="/my-vendors">
                    <Truck size={20} className="text-blue-600" /> My Vendor
                  </MobileNavLink>
                  <MobileNavLink to="/recent-searches">
                    <History size={20} className="text-blue-600" /> Box Libraries
                  </MobileNavLink>
                  <MobileNavLink to="/profile">
                    <UserIcon size={20} className="text-blue-600" /> Profile
                  </MobileNavLink>
                  <hr className="border-slate-200 my-3" />

                  {/* ADMIN-ONLY BLOCK (showing only for admin/superadmin) */}
                  {isAdmin && (
                    <>
                      <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Admin
                      </h3>
                      <MobileNavLink to="/addtransporter">
                        <Truck size={20} className="text-blue-600" /> Add Transporter
                      </MobileNavLink>
                      <MobileNavLink to="/addvendor">
                        <PackagePlus size={20} className="text-blue-600" /> Add Tied-up Vendor
                      </MobileNavLink>
                      <hr className="border-slate-200 my-3" />
                    </>
                  )}
                </>
              )}
              {isAuthenticated && <MobileNavLink to="/about">About Us</MobileNavLink>}
              <MobileNavLink to="/contact">Contact Us</MobileNavLink>
              {isAuthenticated && <MobileNavLink to="/addbid">Add Bid</MobileNavLink>}
              <MobileNavLink to="/vehicle-info">
                <Info size={20} className="text-blue-600" /> Vehicle Info
              </MobileNavLink>
              <div className="pt-8">
                {isAuthenticated ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full text-center px-6 py-3 bg-slate-100 text-slate-700 rounded-lg"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/signin"
                    onClick={closeMenu}
                    className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN HEADER COMPONENT (FIXED) ---
const Header: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/80 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <BrandLogo />
            <nav className="hidden lg:flex items-center gap-8">
              {/* Conditional About Us */}
              {isAuthenticated && <NavLink to="/about">About Us</NavLink>}

              <NavLink to="/contact">Contact</NavLink>
              {/* --- FIXED: Use NavLink here */}
              {isAuthenticated && <NavLink to="/addbid">Add Bid</NavLink>}
              {isAuthenticated && <NavLink to="/addvendor">Add Vendor</NavLink>}
              <NavLink to="/vehicle-info">Vehicle Info</NavLink>
            </nav>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4">
                {isAuthenticated ? (
                  <>
                    {/* PRIMARY CTA: Calculate Freight (new) */}
                    <Link
                      to="/compare"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700"
                    >
                      Calculate Freight
                    </Link>

                    {/* SECONDARY CTA: Dashboard (new) */}
                    <Link
                      to="/dashboard"
                      className="px-4 py-2 bg-white border text-sm font-semibold rounded-lg hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>


                    {/* Admin button (desktop) - show only for admin */}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="px-3 py-2 bg-white border text-sm font-medium rounded-lg hover:bg-slate-50"
                      >
                        Admin
                      </Link>
                    )}

                    <UserProfileDropdown />
                  </>
                ) : (
                  <>
                    <NavLink to="/signin">Sign In</NavLink>
                    <Link
                      to="/userselect"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
              <div className="lg:hidden">
                <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2">
                  <Menu className="h-6 w-6 text-slate-800" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <MobileNav isOpen={menuOpen} closeMenu={() => setMenuOpen(false)} />
    </>
  );
};

export default Header;
