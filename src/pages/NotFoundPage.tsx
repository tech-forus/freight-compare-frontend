// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, SearchX } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center px-4 py-16 bg-slate-50">
      {/* Icon */}
      <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
        <SearchX size={44} className="text-indigo-500" />
      </div>

      {/* Headline */}
      <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Error 404</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">Page not found</h1>
      <p className="text-slate-500 text-base max-w-sm mb-10">
        The page you're looking for doesn't exist or has been moved. Check the URL or head back home.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-100 hover:border-slate-400 transition-all"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Home size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
