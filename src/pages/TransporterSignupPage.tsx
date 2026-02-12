// src/pages/TransporterSignupPage.tsx
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const TRANSPORTER_SIGNUP_URL = 'https://transporter-signup.netlify.app/';

const TransporterSignupPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="w-full" style={{ height: 'calc(100vh - 64px)' }}>
            {/* Loading spinner while iframe loads */}
            {isLoading && (
                <div className="flex items-center justify-center h-full bg-slate-50">
                    <div className="text-center">
                        <Loader2 size={36} className="mx-auto animate-spin text-blue-600 mb-3" />
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
