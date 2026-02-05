import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import loginImg from "../assets/login.svg"


// ✨ Placeholder for a brand logo
const BrandLogo = () => (
    <div className="flex items-center gap-3 text-2xl font-bold text-slate-800">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <LogIn className="w-6 h-6 text-white" />
        </div>
        <span>Freight Compare</span>
    </div>
);

const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Login Successful!");
        // Redirect based on role if available, otherwise default
        
            navigate('/compare');
       
      } else {
        toast.error(result.error ?? "Something went wrong during login.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-10 w-full lg:grid lg:grid-cols-2 font-sans">
      {/* Left Column: Branding & Image */}
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-indigo-50 p-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
            {/* Replace this with your own branding image */}
            <img 
              src={loginImg}
              alt="Login branding illustration" 
              className="w-full max-w-lg object-contain" 
            />
            <div className="text-center mt-8">
              <h2 className="text-3xl font-bold text-slate-800">
                  Welcome to Your Logistics Hub
              </h2>
              <p className="mt-2 text-slate-600">
                  Streamline your shipments, track your progress, and manage your rates—all in one place.
              </p>
            </div>
          </motion.div>
      </div>
      
      {/* Right Column: Sign In Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-100">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex justify-center">
             <BrandLogo />
          </div>

          <div className="text-left mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Sign In</h1>
              <p className="mt-2 text-slate-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Create one now
                </Link>
              </p>
          </div>

         

          {/* Main Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                 <input id="email-address" name="email" type="email" autoComplete="email" required disabled={isLoading}
                   className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-slate-200"
                   placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                 />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                    Forgot?
                </Link>
              </div>
              <div className="relative">
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                 <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={isLoading}
                   className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-slate-200"
                   placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                   disabled={isLoading}
                 >
                   {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                 </button>
              </div>
            </div>

            <div className="pt-2">
              <motion.button type="submit" disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin"/> Signing In...
                  </>
                ) : 'Sign In'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SignInPage;