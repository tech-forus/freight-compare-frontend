import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminUpdatesPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Updates are coming</h1>
                <p className="text-slate-600 mb-6">We are currently working on new features for the admin dashboard. Please check back later.</p>
                <button
                    onClick={() => navigate('/')}
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go to Home
                </button>
            </div>
        </div>
    );
};

export default AdminUpdatesPage;
