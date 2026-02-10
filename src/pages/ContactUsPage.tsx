import React, { useState } from 'react';
import { Mail, User, MessageSquare, Send } from 'lucide-react';
import { motion } from 'framer-motion';

// --- STYLED & REUSABLE COMPONENTS ---
const InputField = ({ icon, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode, id: string }) => (
  <div>
    <label htmlFor={id} className="sr-only">{props.placeholder}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none">{icon}</span>
      <input id={id} {...props} className="w-full pl-11 pr-3 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
  </div>
);
const TextAreaField = ({ icon, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { icon: React.ReactNode, id: string }) => (
  <div>
    <label htmlFor={id} className="sr-only">{props.placeholder}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-3 w-5 h-5 text-slate-400 pointer-events-none">{icon}</span>
      <textarea id={id} {...props} className="w-full pl-11 pr-3 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
  </div>
);

// --- MAIN PAGE COMPONENT ---
const ContactUsPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateMailtoLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Basic frontend validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      e.preventDefault();
      alert('Please fill in all fields before sending.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      e.preventDefault();
      alert('Please enter a valid email address.');
      return;
    }
    const { name, email, subject, message } = formData;
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    e.currentTarget.href = `mailto:tech@foruselectric.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-10"
      >
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Get in Touch</h1>
        <p className="mt-3 text-lg text-slate-600">
          We'd love to hear from you.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="sm:mx-auto sm:w-full sm:max-w-[600px]"
      >
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">

          {/* Email Header Component */}
          <div className="mb-8 flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3 text-blue-700">
              <Mail className="w-6 h-6" />
              <span className="font-semibold text-lg">tech@foruselectric.com</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Direct email support available</p>
          </div>

          <form className="space-y-6">
            <InputField icon={<User />} id="name" name="name" type="text" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
            <InputField icon={<Mail />} id="email" name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
            <InputField icon={<MessageSquare />} id="subject" name="subject" type="text" placeholder="Subject" value={formData.subject} onChange={handleChange} required />
            <TextAreaField icon={<MessageSquare />} id="message" name="message" rows={6} placeholder="How can we help you?" value={formData.message} onChange={handleChange} required />

            <div className="pt-4">
              <a
                href="#"
                onClick={generateMailtoLink}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.01]"
              >
                <Send className="w-4 h-4" />
                Send Message
              </a>
              <p className='text-xs text-center text-slate-400 mt-3'>
                This will open your default email client
              </p>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Footer Decor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center text-sm text-slate-400"
      >
        &copy; {new Date().getFullYear()} FreightCompare. All rights reserved.
      </motion.div>

    </div>
  );
};

export default ContactUsPage;