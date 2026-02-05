// src/pages/BuySubscriptionPage.tsx
import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Shield, CheckCircle2, Crown } from "lucide-react";

const prettyFromSlug = (slug?: string) =>
  slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "";

const BuySubscriptionPage: React.FC = () => {
  const { vendorSlug } = useParams<{ vendorSlug?: string }>();
  const vendorName = prettyFromSlug(vendorSlug);
  const navigate = useNavigate();

  const handleSelect = (plan: "monthly" | "quarterly" | "annual") => {
    const qp = new URLSearchParams();
    qp.set("plan", plan);
    if (vendorSlug) qp.set("vendor", vendorSlug);
    navigate(`/subscribe?${qp.toString()}`);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="text-indigo-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">
            Unlock Full Vendor Details
          </h1>
        </div>

        {vendorName ? (
          <p className="text-slate-600 mb-6">
            You’re viewing quotes from <span className="font-semibold">{vendorName}</span>.{" "}
            Subscribe to see transporter info, contact details, and book instantly.
          </p>
        ) : (
          <p className="text-slate-600 mb-6">
            Subscribe to view complete transporter details and contact information for all vendors.
          </p>
        )}

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Monthly */}
          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-1">Monthly</h3>
            <p className="text-3xl font-extrabold text-slate-900 mb-1">₹999</p>
            <p className="text-xs text-slate-500 mb-3">Billed monthly</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> View all vendor details
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Price breakup &amp; ETA
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Direct contact to transporters
              </li>
            </ul>
            <button
              className="mt-4 w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700"
              onClick={() => handleSelect("monthly")}
            >
              Continue
            </button>
          </div>

          {/* Quarterly */}
          <div className="rounded-xl border-2 border-indigo-600 p-5 bg-indigo-50/40">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 mb-1">Quarterly</h3>
              <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded">
                Popular
              </span>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mb-1">₹2,499</p>
            <p className="text-xs text-slate-500 mb-3">Billed every 3 months (~₹833/mo)</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Everything in Monthly
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Priority email support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Early access to new vendors
              </li>
            </ul>
            <button
              className="mt-4 w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700"
              onClick={() => handleSelect("quarterly")}
            >
              Continue
            </button>
          </div>

          {/* Annual */}
          <div className="rounded-xl border border-amber-400 p-5 bg-amber-50/60">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Crown className="text-amber-500" size={18} /> Annual
              </h3>
              <span className="text-xs font-bold bg-amber-500 text-white px-2 py-1 rounded">
                Best Value
              </span>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mb-1">₹4,999</p>
            <p className="text-xs text-slate-500 mb-3">Billed yearly (~₹417/mo)</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Everything in Quarterly
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Priority support &amp; SLA
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={16} /> Bulk RFQs &amp; advanced filters
              </li>
            </ul>
            <button
              className="mt-4 w-full rounded-lg bg-amber-500 text-white font-semibold py-2.5 hover:bg-amber-600"
              onClick={() => handleSelect("annual")}
            >
              Continue
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/compare"
            className="inline-block text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            ← Back to Calculator
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BuySubscriptionPage;