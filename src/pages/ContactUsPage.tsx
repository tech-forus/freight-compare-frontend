import React, { useState } from 'react';
import { Mail, Phone, MapPin, Building, User, MessageSquare, Send } from 'lucide-react';
import { motion } from 'framer-motion';

// --- STYLED & REUSABLE COMPONENTS ---
const InputField = ({ icon, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode, id: string }) => (
    <div>
      <label htmlFor={id} className="sr-only">{props.placeholder}</label>
      <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none">{icon}</span>
          <input id={id} {...props} className="w-full pl-11 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
      </div>
    </div>
);
const TextAreaField = ({ icon, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { icon: React.ReactNode, id: string }) => (
     <div>
      <label htmlFor={id} className="sr-only">{props.placeholder}</label>
      <div className="relative">
          <span className="absolute left-3.5 top-3 w-5 h-5 text-slate-400 pointer-events-none">{icon}</span>
          <textarea id={id} {...props} className="w-full pl-11 pr-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
      </div>
    </div>
);

const ContactInfoItem = ({ icon: Icon, title, children, href }: { icon: React.ElementType; title: string; children: React.ReactNode; href?: string; }) => (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 text-md text-slate-600 hover:text-blue-600 transition-colors">
            {children}
          </a>
        ) : (
          <p className="mt-1 text-md text-slate-600 leading-relaxed">{children}</p>
        )}
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
    // Basic frontend validation before attempting to open mail client
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
    <div className="bg-slate-50 font-sans">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        
        {/* --- Header --- */}
        <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} transition={{duration:0.6}} className="text-center mb-12 md:mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Get in Touch</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">We're here to help and answer any questions you might have. We look forward to hearing from you!</p>
        </motion.div>

        {/* --- Main Content Card --- */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.6, delay: 0.1}} className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-slate-200/60">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:gap-16">
            
            {/* Left Side: Form */}
            <section className="lg:col-span-3">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Send Us a Message</h2>
              <form className="space-y-5">
                <InputField icon={<User/>} id="name" name="name" type="text" placeholder="Full Name" value={formData.name} onChange={handleChange} required/>
                <InputField icon={<Mail/>} id="email" name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required/>
                <InputField icon={<Building/>} id="subject" name="subject" type="text" placeholder="Subject" value={formData.subject} onChange={handleChange} required/>
                <TextAreaField icon={<MessageSquare/>} id="message" name="message" rows={5} placeholder="Your message here..." value={formData.message} onChange={handleChange} required/>
                <div className="pt-2">
                    <a
                      href="#" // The href is set dynamically by the onClick handler
                      onClick={generateMailtoLink}
                      className="w-full inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg shadow-blue-500/30 text-base font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      <Send size={18}/>
                      Send Message
                    </a>
                    <p className='text-xs text-center text-slate-400 mt-3'>This will open your default email application.</p>
                </div>
              </form>
            </section>

            {/* Right Side: Info & Map */}
            <section className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Contact Information</h2>
              <div className="space-y-6">
                <ContactInfoItem icon={Mail} title="Email Us" href="mailto:tech@foruselectric.com">
                  tech@foruselectric.com
                </ContactInfoItem>
                <ContactInfoItem icon={Phone} title="Call Us" href="tel:+911140366378">
                  +91 11 4036 6378
                </ContactInfoItem>
                <ContactInfoItem icon={MapPin} title="Our Office">
                  Building No. 313, Okhla Phase 1,<br />
                  Delhi – 110020, India
                </ContactInfoItem>
              </div>

              <div className="mt-10">
                <div className="aspect-w-16 aspect-h-9 bg-slate-200 rounded-lg shadow-md overflow-hidden">
                  <iframe
                    src="https://maps.google.com/maps?q=Forus%20Electric%20Building%20No.%20313%20Okhla%20Phase%201%2C%20Delhi%20-%20110020&z=15&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    title="Forus Electric – Okhla Phase 1"
                  />
                </div>
                 <a
                  href="https://maps.app.goo.gl/6WwirDV5uYnub3j57"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUsPage;