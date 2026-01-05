import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config/api';

// You can find a similar illustration or use your own branding asset
import ForgotPasswordIllustration from '../assets/forgotpassword.svg';

// --- STYLED HELPER COMPONENTS ---
const InputField = ({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) => (
  <div className="relative">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none">{icon}</span>
    <input {...props} className="w-full pl-11 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-200" />
  </div>
);

const SuccessState = ({ email, onReset }: { email: string, onReset: () => void }) => (
  <div className="text-center">
    <MailCheck className="mx-auto w-16 h-16 text-green-500" />
    <h2 className="mt-4 text-2xl font-bold text-slate-900">Check Your Inbox!</h2>
    <p className="mt-2 text-slate-600">
      A temporary password has been sent to <br />
      <span className="font-semibold text-blue-600">{email}</span>.
    </p>
    <p className="mt-2 text-xs text-slate-500">Please check your spam folder if you don't see it.</p>
    <button onClick={onReset} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500">
      <ArrowLeft size={16} />
      Back to Sign In
    </button>
  </div>
)


// --- MAIN PAGE COMPONENT ---
const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // ✨ New state for better UX

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgotpassword`, { email });
      if (res.data.success) {
        toast.success(res.data.message);
        setEmailSent(true); // ✨ Transition to success screen
      } else {
        toast.error(res.data.message || 'Could not process request.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setEmailSent(false);
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 font-sans bg-slate-50">
      {/* Left Column: Branding & Image */}
      <div className="relative hidden lg:flex flex-col justify-center items-center p-12 bg-blue-50 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
          <img src={ForgotPasswordIllustration} alt="Forgot password illustration" className="w-full max-w-sm mx-auto" />
          <h1 className="mt-8 text-3xl font-bold text-slate-800">Forgot Your Password?</h1>
          <p className="mt-2 text-slate-600 max-w-md mx-auto">No worries. We'll help you get back into your account and back to managing your shipments in no time.</p>
        </motion.div>
      </div>

      {/* Right Column: Form/Success State */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/60"
        >
          <AnimatePresence mode="wait">
            {!emailSent ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Enter your account's email address and we'll send a temporary password.
                  </p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <InputField
                    icon={<Mail />}
                    id="email-forgot"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <motion.button type="submit" disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-lg shadow-blue-500/50"
                  >
                    {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>) : 'Send Temporary Password'}
                  </motion.button>
                </form>
                <div className="text-sm text-center mt-6">
                  <Link to="/signin" className="inline-flex items-center gap-2 font-medium text-blue-600 hover:text-blue-500">
                    <ArrowLeft size={16} /> Back to Sign In
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <SuccessState email={email} onReset={resetForm} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;