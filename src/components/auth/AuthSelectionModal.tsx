import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthSelectionModal: React.FC<AuthSelectionModalProps> = ({ isOpen, onClose }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Rocket size={32} />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            Unlock Full Access
                        </h2>
                        <p className="text-slate-600 mb-8">
                            To calculate freight costs and view exclusive rates, please sign in or create an account.
                        </p>

                        <div className="space-y-4">
                            {/* Option 1: Sign In */}
                            <Link
                                to="/signin"
                                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors group"
                            >
                                <LogIn size={20} className="group-hover:scale-110 transition-transform" />
                                Sign In
                            </Link>

                            {/* Option 2: Get Started */}
                            <Link
                                to="/userselect"
                                className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all group"
                            >
                                <Rocket size={20} className="group-hover:translate-x-1 transition-transform" />
                                Get Started
                            </Link>
                        </div>

                        <p className="mt-6 text-xs text-slate-400">
                            Join thousands of shippers optimizing their logistics today.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthSelectionModal;
