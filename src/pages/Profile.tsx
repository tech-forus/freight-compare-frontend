import React, { useState, FormEvent } from 'react';
import { User, Lock, Save, Building, Phone, Mail, Hash, MapPin, Loader2, Coins } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config/api';

// --- STYLED HELPER COMPONENTS ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6 sm:p-8 ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center mb-6">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-100 rounded-lg">
            {icon}
        </div>
        <h2 className="ml-4 text-xl font-bold text-slate-800">{title}</h2>
    </div>
);

const ProfileField = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <div>
        <p className="block text-sm font-medium text-slate-500">{label}</p>
        <p className="text-md font-semibold text-slate-800">{value || <span className='font-normal text-slate-400'>Not Provided</span>}</p>
    </div>
);


const PasswordInputField = ({ id, label, value, onChange, disabled }: { id: string; label: string, value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled: boolean }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
        <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
                id={id} name={id} type="password" required value={value} onChange={onChange} disabled={disabled}
                placeholder="••••••••"
                className="w-full pl-11 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-slate-100"
            />
        </div>
    </div>
);

// --- MAIN COMPONENT ---
const ProfilePage: React.FC = () => {
    const [passwordFields, setPasswordFields] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuth();

    // Handle both formats: user.customer (from login) OR user directly (from /api/auth/me)
    const customer = (user as any)?.customer || (user as any) || {};
    const userInitial = customer.firstName ? customer.firstName.charAt(0).toUpperCase() : '?';

    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault(); setIsSaving(true);
        if (passwordFields.newPassword !== passwordFields.confirmPassword) { toast.error('New passwords do not match.'); setIsSaving(false); return; }
        if (passwordFields.newPassword.length < 8) { toast.error('New password must be at least 8 characters long.'); setIsSaving(false); return; }

        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/changepassword`, {
                email: customer.email, password: passwordFields.currentPassword, newpassword: passwordFields.newPassword,
            });
            toast.success(response.data?.message || 'Password changed successfully!');
            setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            const axiosError = error as any;
            toast.error(axiosError.response?.data?.message || 'Failed to change password.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
                    <p className="mt-2 text-lg text-slate-600">View and manage your account and business details.</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Profile Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Personal & Contact Info */}
                        <Card>
                            <SectionHeader icon={<User size={20} />} title="Personal & Contact Information" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                <ProfileField label="First Name" value={customer.firstName} />
                                <ProfileField label="Last Name" value={customer.lastName} />
                                <ProfileField label="Email Address" value={customer.email} />
                                <ProfileField label="Phone Number" value={customer.phone} />
                            </div>
                        </Card>

                        {/* Company & Address Info */}
                        <Card>
                            <SectionHeader icon={<Building size={20} />} title="Company & Address" />
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                    <ProfileField label="Company Name" value={customer.companyName} />
                                    <ProfileField label="GST Number" value={customer.gstNumber} />
                                    <ProfileField label="Business Type" value={customer.businessType} />
                                    <ProfileField label="Average Monthly Orders" value={customer.monthlyOrder} />
                                </div>
                                <hr className="border-slate-200" />
                                <div className="space-y-6">
                                    <ProfileField label="Address" value={customer.address} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                        <ProfileField label="State / Province" value={customer.state} />
                                        <ProfileField label="Pincode" value={customer.pincode} />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Security Settings */}
                        <Card>
                            <SectionHeader icon={<Lock size={20} />} title="Security Settings" />
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <p className='text-sm text-slate-500 -mt-2 mb-4'>Change your account password here. Choose a strong, unique password.</p>
                                <PasswordInputField id="currentPassword" label="Current Password" value={passwordFields.currentPassword} onChange={handlePasswordInputChange} disabled={isSaving} />
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <PasswordInputField id="newPassword" label="New Password" value={passwordFields.newPassword} onChange={handlePasswordInputChange} disabled={isSaving} />
                                    <PasswordInputField id="confirmPassword" label="Confirm New Password" value={passwordFields.confirmPassword} onChange={handlePasswordInputChange} disabled={isSaving} />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-sm text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Password'}
                                    </button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="space-y-8">
                        {/* Profile Card */}
                        <Card className='text-center'>
                            <div className="w-24 h-24 bg-blue-100 rounded-full overflow-hidden mx-auto border-4 border-white shadow-md">
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.firstName}`}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h2 className='text-xl font-bold text-slate-800'>{customer.firstName} {customer.lastName}</h2>
                            <p className='text-sm text-slate-500'>{customer.email}</p>
                        </Card>

                        {/* Subscription/Tokens Card */}
                        <Card>
                            <div className='flex items-center gap-4'>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                    <Coins size={24} />
                                </div>
                                <div>
                                    <p className='text-sm font-medium text-slate-500'>Available Tokens</p>
                                    <p className='text-3xl font-bold text-slate-800'>{customer.tokenAvailable ?? 0}</p>
                                </div>
                            </div>
                            <p className='text-xs text-slate-400 mt-4'>Tokens are used for generating detailed rate comparisons.</p>
                            <button className='w-full px-8 mt-4 bg-green-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-green-600 transition'>Buy More Tokens</button>
                        </Card>
                    </div>

                </motion.div>
            </div>
        </div>
    );
};

export default ProfilePage;