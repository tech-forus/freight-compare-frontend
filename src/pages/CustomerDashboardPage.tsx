// src/pages/CustomerDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  User,
  MapPin,
  Truck as VendorIcon,
  LogOut,
  Calculator,
  Building2,
  Plus,
  Clock,
  Package,
  CreditCard,
  BarChart2,
  TrendingDown,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { API_BASE_URL } from '../config/api';

// Use centralized API configuration

// Helper: build auth headers from cookie
const buildAuthHeaders = () => {
  const token = Cookies.get('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- Types (keep lightweight and tolerant) ---
interface UserProfile {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  contactNumber?: string;
  gstNumber?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  pickupAddresses?: Array<{
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  preferredVendorIds?: string[];
  createdAt?: string | number | null;
}

interface BasicVendorInfo {
  id: string;
  name: string;
}

type OverviewResp = {
  totalShipments?: number;
  totalSpend?: number;
  avgCostPerShipment?: number;
  totalSavings?: number;
  sampleCount?: number;
};

// --- Helpers ---
const formatINR = (n?: number | null) =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const resolveCreatedAt = (obj: any): string | number | null => {
  if (!obj) return null;
  if (typeof obj === 'string' && obj.trim().length > 0) return obj;
  if (typeof obj === 'number' && !Number.isNaN(obj)) return obj;
  if (obj && typeof obj === 'object') {
    if (obj.$date) return obj.$date;
    if (obj.$numberLong) {
      const num = Number(obj.$numberLong);
      return Number.isNaN(num) ? null : num;
    }
    if (obj.createdAt) return resolveCreatedAt(obj.createdAt);
    if (obj.created_at) return resolveCreatedAt(obj.created_at);
    if (obj._createdAt) return resolveCreatedAt(obj._createdAt);
    if (obj.toISOString && typeof obj.toISOString === 'function') {
      try {
        return obj.toISOString();
      } catch {
        /* ignore */
      }
    }
  }
  return null;
};

const prettyMembershipDate = (input?: any) => {
  const raw = resolveCreatedAt(input);
  if (!raw) return 'Unknown';
  const d = new Date(raw as any);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

// --- Component ---
const CustomerDashboardPage: React.FC = () => {
  const { user: authUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [overview, setOverview] = useState<OverviewResp | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  const [allVendors, setAllVendors] = useState<BasicVendorInfo[]>([]);

  // Load profile
  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);

      try {
        const maybeCustomer = (authUser as any)?.customer || authUser;

        let baseProfile: UserProfile | null = null;
        if (
          maybeCustomer &&
          (maybeCustomer.firstName ||
            maybeCustomer.email ||
            maybeCustomer._id ||
            maybeCustomer.name)
        ) {
          baseProfile = {
            _id: maybeCustomer._id || maybeCustomer.id,
            name:
              maybeCustomer.name ||
              `${maybeCustomer.firstName || ''} ${maybeCustomer.lastName || ''
                }`.trim(),
            firstName: maybeCustomer.firstName,
            lastName: maybeCustomer.lastName,
            companyName: maybeCustomer.company || maybeCustomer.companyName,
            email: maybeCustomer.email,
            contactNumber: maybeCustomer.phone || maybeCustomer.contactNumber,
            gstNumber: maybeCustomer.gstNo || maybeCustomer.gstNumber,
            billingAddress:
              maybeCustomer.billingAddress || {
                street: maybeCustomer.address,
                city: maybeCustomer.city,
                state: maybeCustomer.state,
                postalCode: maybeCustomer.pincode?.toString?.(),
                country: 'India',
              },
            pickupAddresses: maybeCustomer.pickupAddresses || [],
            preferredVendorIds: maybeCustomer.preferredVendors || [],
            createdAt:
              resolveCreatedAt(maybeCustomer.createdAt) ||
              resolveCreatedAt(maybeCustomer._createdAt) ||
              resolveCreatedAt((authUser as any)?.createdAt) ||
              null,
          };
        }

        // If we have a baseProfile but no createdAt, fetch it
        if (baseProfile && !baseProfile.createdAt) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/users/me`, {
              headers: buildAuthHeaders(),
            });
            if (res.ok) {
              const body = await res.json();
              const data = body?.data || body;
              const serverCreatedAt =
                resolveCreatedAt(data.createdAt) ||
                resolveCreatedAt(data.created_at) ||
                null;
              baseProfile.createdAt = serverCreatedAt;
            } else {
              console.warn('profile fetch returned', res.status);
            }
          } catch (e) {
            console.warn('failed to fetch /api/users/me for createdAt', e);
          }
        }

        // If we didn't have baseProfile at all, fetch full profile
        if (!baseProfile) {
          const res = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: buildAuthHeaders(),
          });
          if (res.ok) {
            const body = await res.json();
            const data = body?.data || body;

            baseProfile = {
              _id: data._id || data.id,
              name:
                data.name ||
                `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              firstName: data.firstName,
              lastName: data.lastName,
              companyName: data.company || data.companyName,
              email: data.email,
              contactNumber: data.phone || data.contact,
              gstNumber: data.gstNo || data.gstNumber,
              billingAddress:
                data.billingAddress || {
                  street: data.address,
                  city: data.city,
                  state: data.state,
                  postalCode: data.pincode?.toString?.(),
                  country: 'India',
                },
              pickupAddresses: data.pickupAddresses || [],
              preferredVendorIds: data.preferredVendors || [],
              createdAt:
                resolveCreatedAt(data.createdAt) ||
                resolveCreatedAt(data.created_at) ||
                null,
            };
          } else {
            console.warn('profile fetch failed', res.status);
          }
        }

        if (mounted) setProfile(baseProfile);

        // Temporary transporters
        try {
          const token = Cookies.get('authToken');
          if (token && (authUser as any)?._id) {
            const vendorsResponse = await fetch(
              `${API_BASE_URL}/api/transporter/gettemporarytransporters?customerID=${(authUser as any)._id
              }`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (vendorsResponse.ok) {
              const vendorsData = await vendorsResponse.json();
              if (vendorsData.success && vendorsData.data) {
                const userVendors: BasicVendorInfo[] = vendorsData.data.map(
                  (v: any) => ({ id: v._id, name: v.companyName })
                );
                if (mounted) setAllVendors(userVendors);
                if (
                  mounted &&
                  baseProfile &&
                  (!baseProfile.preferredVendorIds ||
                    baseProfile.preferredVendorIds.length === 0)
                ) {
                  setProfile((p) => ({
                    ...(p || {}),
                    preferredVendorIds: userVendors.map((x) => x.id),
                  }));
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error fetching user vendors', e);
        }
      } catch (err) {
        console.error('loadProfile error', err);
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    }

    if (isAuthenticated) loadProfile();
    else setIsLoadingProfile(false);

    return () => {
      mounted = false;
    };
  }, [authUser, isAuthenticated]);

  // Load overview KPI
  useEffect(() => {
    let mounted = true;
    async function loadOverview() {
      setIsLoadingOverview(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard/overview`, {
          headers: buildAuthHeaders(),
        });
        if (!res.ok) throw new Error(`overview failed: ${res.status}`);
        const body = await res.json();
        const data = (body && (body.data || body)) as OverviewResp;
        if (mounted) setOverview(data);
      } catch (err) {
        console.warn('overview fetch failed, using empty state', err);
        if (mounted)
          setOverview({
            totalShipments: 0,
            totalSpend: 0,
            avgCostPerShipment: 0,
            totalSavings: 0,
            sampleCount: 0,
          });
      } finally {
        if (mounted) setIsLoadingOverview(false);
      }
    }
    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  if (isLoadingProfile)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-3">You need to be signed in to view this page.</p>
          <Link to="/signin" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  if (!profile)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Could not load profile. Please try again later.</p>
      </div>
    );

  const isEmpty = (overview?.totalShipments ?? 0) === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              {(profile.name ?? [profile.firstName, profile.lastName].filter(Boolean).join(' ')) || 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {profile.companyName ? `${profile.companyName} · ` : ''}Member since {prettyMembershipDate(profile.createdAt)}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all text-sm font-medium"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Link to="/compare" className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
              <Calculator size={20} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">Calculate</span>
          </Link>
          <Link to="/my-vendors" className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-md hover:bg-emerald-50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition-colors">
              <Building2 size={20} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">My Vendors</span>
          </Link>
          <Link to="/addvendor" className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md hover:bg-blue-50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Plus size={20} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">Add Vendor</span>
          </Link>
          <Link to="/recent-searches" className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-md hover:bg-amber-50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-200 transition-colors">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-amber-700 transition-colors">Recent</span>
          </Link>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={<Package size={18} className="text-indigo-600" />}
            iconBg="bg-indigo-100"
            title="Total Shipments"
            value={isLoadingOverview ? '—' : String(overview?.totalShipments ?? 0)}
          />
          <KpiCard
            icon={<CreditCard size={18} className="text-blue-600" />}
            iconBg="bg-blue-100"
            title="Total Spend"
            value={isLoadingOverview ? '—' : formatINR(overview?.totalSpend ?? 0)}
          />
          <KpiCard
            icon={<BarChart2 size={18} className="text-violet-600" />}
            iconBg="bg-violet-100"
            title="Avg / Shipment"
            value={isLoadingOverview ? '—' : formatINR(overview?.avgCostPerShipment ?? 0)}
          />
          <KpiCard
            icon={<TrendingDown size={18} className={(overview?.totalSavings ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'} />}
            iconBg={(overview?.totalSavings ?? 0) >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}
            title="Est. Savings"
            value={isLoadingOverview ? '—' : formatINR(overview?.totalSavings ?? 0)}
            tone={(overview?.totalSavings ?? 0) >= 0 ? 'green' : 'red'}
          />
        </div>

        {/* ── Profile + Pickup Addresses row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Profile card (2/3) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Profile Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <ProfileField label="Name" value={profile.name ?? [profile.firstName, profile.lastName].filter(Boolean).join(' ')} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Company" value={profile.companyName} />
              <ProfileField label="Contact" value={profile.contactNumber} />
              <ProfileField label="GST No." value={profile.gstNumber} mono />
              <ProfileField label="Member Since" value={prettyMembershipDate(profile.createdAt)} />
              {profile.billingAddress?.street && (
                <div className="sm:col-span-2">
                  <ProfileField
                    label="Billing Address"
                    value={[
                      profile.billingAddress.street,
                      profile.billingAddress.city,
                      profile.billingAddress.state,
                      profile.billingAddress.postalCode,
                    ].filter(Boolean).join(', ')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pickup Addresses (1/3) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Pickup Addresses</h3>
            </div>
            {profile.pickupAddresses && profile.pickupAddresses.length > 0 ? (
              <ul className="space-y-3">
                {profile.pickupAddresses.map((addr, i) => (
                  <li key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    {addr.label && <div className="font-medium text-slate-700 text-sm">{addr.label}</div>}
                    <div className="text-slate-500 text-xs mt-0.5">
                      {[addr.street, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <MapPin size={32} className="text-slate-200" />
                <p className="text-slate-400 text-sm">No pickup addresses configured.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Preferred Vendors ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <VendorIcon size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Preferred Vendors</h3>
                {allVendors.length > 0 && (
                  <p className="text-xs text-slate-400">{allVendors.length} vendor{allVendors.length !== 1 ? 's' : ''} total</p>
                )}
              </div>
            </div>
            <Link
              to="/my-vendors"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              <VendorIcon size={13} /> Manage
            </Link>
          </div>
          {profile.preferredVendorIds && profile.preferredVendorIds.length > 0 && allVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profile.preferredVendorIds.map((vendorId) => {
                const preferredVendor = allVendors.find((v) => v.id === vendorId);
                return preferredVendor ? (
                  <div key={vendorId} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <VendorIcon size={12} className="text-indigo-600" />
                    </div>
                    <span className="text-sm text-slate-700 font-medium truncate">{preferredVendor.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <VendorIcon size={32} className="text-slate-200" />
              <p className="text-slate-400 text-sm">No preferred vendors selected. Add vendors to see them here.</p>
            </div>
          )}
        </div>

        {/* ── Activity / Empty state ── */}
        {isLoadingOverview ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading activity data…</p>
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={26} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No activity yet</p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Your dashboard will populate when you calculate freight or create shipments. Try comparing rates to get started.
            </p>
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Calculator size={16} /> Compare Rates
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Savings over time</h3>
              <div className="h-44 flex items-center justify-center text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                Chart coming soon
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Data source</h3>
              <p className="text-sm text-slate-500">
                Community baseline shown only when sampleCount ≥ 3.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-slate-400">Sample count:</span>
                <span className="text-sm font-bold text-slate-800">{overview?.sampleCount ?? 0}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

function KpiCard({
  icon,
  iconBg,
  title,
  value,
  tone = 'neutral',
}: {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'green' | 'red';
}) {
  const valueColor =
    tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-rose-600' : 'text-slate-800';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {icon && (
        <div className={`w-9 h-9 rounded-lg ${iconBg ?? 'bg-slate-100'} flex items-center justify-center mb-3`}>
          {icon}
        </div>
      )}
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</div>
      <div className={`mt-1.5 text-xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

function ProfileField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-sm text-slate-700 ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  );
}

export default CustomerDashboardPage;
