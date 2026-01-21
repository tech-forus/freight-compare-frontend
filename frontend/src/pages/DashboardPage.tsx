import React, { useEffect, useState } from 'react';

type OverviewResp = {
  totalShipments?: number;
  totalSpend?: number;
  avgCostPerShipment?: number;
  totalSavings?: number;
  sampleCount?: number;
};

const formatINR = (n: number | undefined) =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadOverview() {
      setLoading(true);
      try {
        const res = await fetch('/api/dashboard/overview');
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (mounted) setOverview(json);
      } catch (e: any) {
        console.warn('Dashboard fetch failed, falling back to mock', e);
        // fallback mock so developers see the layout immediately
        if (mounted) {
          setError('Could not load dashboard data (dev fallback shown).');
          setOverview({
            totalShipments: 128,
            totalSpend: 560000,
            avgCostPerShipment: 4375,
            totalSavings: 48000,
            sampleCount: 0,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadOverview();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-[60vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
          <div className="text-sm text-slate-500">Overview · Personal metrics</div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-12 text-center text-slate-600">
            Loading your dashboard...
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 text-sm text-amber-700">
                {error} — displayed sample numbers are for development only.
              </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard title="Total Shipments" value={overview?.totalShipments ?? 0} />
              <KpiCard title="Total Spend" value={formatINR(overview?.totalSpend ?? 0)} />
              <KpiCard title="Avg Cost / Shipment" value={formatINR(overview?.avgCostPerShipment ?? 0)} />
              <KpiCard title="Estimated Savings" value={formatINR(overview?.totalSavings ?? 0)} tone={(overview?.totalSavings ?? 0) >= 0 ? 'green' : 'red'} />
            </div>

            {/* Data status */}
            {(overview?.totalShipments ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-slate-600">
                <p className="mb-2 font-semibold">No activity yet</p>
                <p className="text-sm">
                  Your dashboard will populate once you have shipments or when you enable anonymised
                  price contribution. Try calculating freight or adding a vendor to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2 bg-white border rounded-lg p-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Savings over time</h3>
                  <div className="h-44 flex items-center justify-center text-sm text-slate-400">
                    (Chart placeholder — implement chart using recharts or chart.js)
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Data source</h3>
                  <p className="text-sm text-slate-600">
                    Community baseline shown only when sampleCount ≥ 3. Current sample count:
                    <span className="font-medium ml-1">{overview?.sampleCount ?? 0}</span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, tone = 'neutral' }: { title: string; value: React.ReactNode; tone?: 'neutral' | 'green' | 'red' }) {
  const toneClass = tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-rose-600' : 'text-slate-800';
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
