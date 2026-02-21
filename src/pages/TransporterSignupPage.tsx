// src/pages/TransporterSignupPage.tsx
import React, { useState } from 'react';
import { Loader2, ScrollText, CheckCircle } from 'lucide-react';
import { termsSections } from '../data/termsContent';

const TRANSPORTER_SIGNUP_URL = 'https://transporter-signup.netlify.app/';

const TransporterSignupPage: React.FC = () => {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Show T&C acceptance gate until user confirms
    if (!confirmed) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-10 px-4">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <ScrollText className="w-6 h-6 flex-shrink-0" />
                        <div>
                            <h1 className="text-lg font-bold leading-tight">Terms & Conditions</h1>
                            <p className="text-amber-100 text-xs mt-0.5">Please read before joining as a Transporter</p>
                        </div>
                    </div>

                    {/* Scrollable T&C body */}
                    <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-slate-700" style={{ maxHeight: '55vh' }}>
                        <div className="space-y-3 mb-6">
                            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
                                Effective Date: February 20, 2026<br />
                                Last Updated: February 20, 2026
                            </p>
                            <p className="text-sm">
                                These Terms and Conditions ("Terms," "T&C," or "Agreement") govern your access to and use of the FreightCompare.ai platform (the "Platform"), including any websites, applications, APIs, or services provided by FreightCompare.ai, a product of Forus Electric Private Limited (hereinafter referred to as "We," "Us," "Our," or the "Company"), a company incorporated under the Companies Act, 2013, with its registered office at [Insert Registered Office Address, e.g., Okhla Phase 1, Delhi NCR, India].
                            </p>
                            <p className="text-sm">
                                By accessing, registering for, or using the Platform, you ("User," "You," or "Your") agree to be bound by these Terms, our Privacy Policy, Acceptable Use Policy, and any other policies incorporated herein by reference. If You are accessing the Platform on behalf of an entity (e.g., a company or organization), You represent and warrant that You have the authority to bind that entity to these Terms.
                            </p>
                            <div className="text-sm">
                                <p className="mb-2">These Terms are drafted in compliance with applicable Indian laws, including but not limited to:</p>
                                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                    <li>The Information Technology Act, 2000 (as amended) ("IT Act");</li>
                                    <li>The Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (as amended through 2026, including amendments on synthetically generated information ("SGI"), 3-hour takedown requirements, and due diligence obligations) ("IT Rules");</li>
                                    <li>The Digital Personal Data Protection Act, 2023 ("DPDPA");</li>
                                    <li>The Goods and Services Tax Act, 2017 ("GST Act");</li>
                                    <li>The Carriage by Road Act, 2007;</li>
                                    <li>The Motor Vehicles Act, 1988 (as amended);</li>
                                    <li>The Consumer Protection Act, 2019 (to the extent applicable to B2B services);</li>
                                    <li>Relevant provisions of the Bharatiya Nyaya Sanhita, 2023 (Indian Penal Code equivalent) on abetment, fraud, and criminal misuse; and</li>
                                    <li>Other regulatory frameworks governing logistics, data protection, and electronic commerce in India.</li>
                                </ul>
                            </div>
                            <p className="text-sm font-medium text-slate-800 border-l-2 border-amber-500 pl-3">
                                If You do not agree with any part of these Terms, You must not access or use the Platform. We reserve the right to amend these Terms at any time, with notice provided via the Platform or email. Continued use after amendments constitutes acceptance.
                            </p>
                        </div>

                        {termsSections.map((sec) => (
                            <div key={sec.title}>
                                <h3 className="font-bold text-slate-800 mb-1">{sec.title}</h3>
                                <div className="text-slate-600 leading-relaxed">{sec.content}</div>
                            </div>
                        ))}
                    </div>

                    {/* Acceptance footer */}
                    <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 space-y-4">
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${termsAccepted ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700 leading-snug">
                                I have read and understood all the Terms & Conditions of{' '}
                                <strong>freightcompare.ai</strong> and agree to be bound by them.
                                {!termsAccepted && <span className="ml-1 text-red-500 font-semibold">*</span>}
                            </span>
                        </label>

                        <button
                            disabled={!termsAccepted}
                            onClick={() => setConfirmed(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200
                                bg-amber-500 text-white hover:bg-amber-600
                                disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                            <CheckCircle size={16} />
                            I Agree — Continue to Sign Up
                        </button>

                        {!termsAccepted && (
                            <p className="text-xs text-center text-slate-400">
                                You must accept the Terms & Conditions to proceed.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // After acceptance — show iframe
    return (
        <div className="w-full" style={{ height: 'calc(100vh - 64px)' }}>
            {isLoading && (
                <div className="flex items-center justify-center h-full bg-slate-50">
                    <div className="text-center">
                        <Loader2 size={36} className="mx-auto animate-spin text-amber-500 mb-3" />
                        <p className="text-slate-500 text-sm">Loading transporter signup…</p>
                    </div>
                </div>
            )}

            <iframe
                src={TRANSPORTER_SIGNUP_URL}
                title="Transporter Signup"
                onLoad={() => setIsLoading(false)}
                className="w-full border-0"
                style={{
                    height: 'calc(100vh - 64px)',
                    display: isLoading ? 'none' : 'block',
                }}
                allow="clipboard-write"
            />
        </div>
    );
};

export default TransporterSignupPage;
