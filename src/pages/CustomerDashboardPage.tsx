// src/pages/CustomerDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, MapPin, Truck as VendorIcon } from 'lucide-react';
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
    return <div className="text-center py-10">Loading your dashboard...</div>;
  if (!isAuthenticated)
    return (
      <div className="text-center py-10">
        Please{' '}
        <Link to="/signin" className="text-blue-600">
          sign in
        </Link>
        .
      </div>
    );
  if (!profile)
    return (
      <div className="text-center py-10">
        Could not load profile. Try again later.
      </div>
    );

  const isEmpty = (overview?.totalShipments ?? 0) === 0;

  return (
    <div className="min-h-[60vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Your Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Personal &amp; company metrics
            </p>
          </div>
          <div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-500 text-white rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-white border rounded-lg p-5 mb-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-slate-700 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> Profile Information
              </h3>
              <div className="mt-3 text-sm text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Name: </span>
                  {profile.name ??
                    `${profile.firstName ?? ''} ${profile.lastName ?? ''
                      }`.trim()}
                </div>
                <div>
                  <span className="font-semibold">Company: </span>
                  {profile.companyName ?? '—'}
                </div>
                <div>
                  <span className="font-semibold">GST No: </span>
                  {profile.gstNumber ?? '—'}
                </div>
                <div>
                  <span className="font-semibold">Billing Address: </span>
                  {profile.billingAddress?.street
                    ? `${profile.billingAddress.street}, ${profile.billingAddress.city}, ${profile.billingAddress.state} - ${profile.billingAddress.postalCode}`
                    : '—'}
                </div>
              </div>
            </div>

            <div className="text-right text-sm text-slate-600">
              <div className="mb-2">
                <span className="font-semibold">Email:</span>{' '}
                {profile.email ?? '—'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Contact:</span>{' '}
                {profile.contactNumber ?? '—'}
              </div>
              <div>
                <span className="font-semibold">Member since:</span>
                <span className="ml-1">
                  {prettyMembershipDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Addresses */}
        <div className="bg-white border rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-lg font-medium text-slate-700 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" /> Pickup Addresses
          </h3>
          {profile.pickupAddresses && profile.pickupAddresses.length > 0 ? (
            profile.pickupAddresses.map((addr, i) => (
              <div key={i} className="py-2">
                <div className="font-semibold">{addr.label}</div>
                <div className="text-slate-500 text-sm">
                  {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-500 text-sm">
              No pickup addresses configured.
            </div>
          )}
        </div>

        {/* Preferred Vendors */}
        <div className="bg-white border rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-lg font-medium text-slate-700 mb-3 flex items-center gap-2">
            <VendorIcon size={18} className="text-blue-600" /> Preferred Vendors
          </h3>
          {profile.preferredVendorIds &&
            profile.preferredVendorIds.length > 0 &&
            allVendors.length > 0 ? (
            <ul className="space-y-2">
              {profile.preferredVendorIds.map((vendorId) => {
                const preferredVendor = allVendors.find(
                  (v) => v.id === vendorId
                );
                return preferredVendor ? (
                  <li
                    key={vendorId}
                    className="p-3 bg-gray-50 rounded-md text-sm"
                  >
                    {preferredVendor.name}
                  </li>
                ) : null;
              })}
            </ul>
          ) : (
            <div className="text-slate-500 text-sm">
              No preferred vendors selected.
            </div>
          )}

          <div className="mt-4">
            <Link
              to="/my-vendors"
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
            >
              <VendorIcon size={16} /> Manage Vendors
            </Link>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Shipments"
            value={
              isLoadingOverview ? 'Loading...' : overview?.totalShipments ?? 0
            }
          />
          <KpiCard
            title="Total Spend"
            value={
              isLoadingOverview
                ? 'Loading...'
                : formatINR(overview?.totalSpend ?? 0)
            }
          />
          <KpiCard
            title="Avg Cost / Shipment"
            value={
              isLoadingOverview
                ? 'Loading...'
                : formatINR(overview?.avgCostPerShipment ?? 0)
            }
          />
          <KpiCard
            title="Estimated Savings"
            value={
              isLoadingOverview
                ? 'Loading...'
                : formatINR(overview?.totalSavings ?? 0)
            }
            tone={(overview?.totalSavings ?? 0) >= 0 ? 'green' : 'red'}
          />
        </div>

        {isLoadingOverview ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-12 text-center text-slate-600">
            Loading your dashboard...
          </div>
        ) : isEmpty ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-600">
            <p className="mb-2 font-semibold">No activity yet</p>
            <p className="text-sm">
              Your dashboard will populate when you create shipments or enable
              anonymised data contributions. Try calculating freight or adding a
              vendor to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2 bg-white border rounded-lg p-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                Savings over time
              </h3>
              <div className="h-44 flex items-center justify-center text-sm text-slate-400">
                (Chart placeholder)
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                Data source
              </h3>
              <p className="text-sm text-slate-600">
                Community baseline shown only when sampleCount ≥ 3. Current
                sample count:
                <span className="font-medium ml-1">
                  {overview?.sampleCount ?? 0}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-blue-600 hover:underline">
            ← Back to Calculator
          </Link>
        </div>
      </div>
    </div>
  );
};

function KpiCard({
  title,
  value,
  tone = 'neutral',
}: {
  title: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'green' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-emerald-600'
      : tone === 'red'
        ? 'text-rose-600'
        : 'text-slate-800';
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className={`mt-2 text-xl font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export default CustomerDashboardPage;
