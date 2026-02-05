import React from 'react';
import { Truck, Globe, UserCheck, MapPin, Network, DollarSign, BrainCircuit, Heart, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Reusable Animated & Styled Components ---
const MotionSection = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`container mx-auto px-4 ${className}`}>
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    </div>
);

const SectionTitle = ({ children, subtitle }: { children: React.ReactNode; subtitle: string; }) => (
    <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{children}</h2>
        <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">{subtitle}</p>
    </div>
);

const PillarCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode; }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/60 text-center h-full hover:-translate-y-2 transition-transform duration-300">
        <div className="mx-auto w-16 h-16 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mb-6">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{children}</p>
    </div>
);


export default function AboutUsPage() {
  return (
    <div className="bg-slate-50 font-sans">
      <main className="space-y-20 sm:space-y-28 py-20 sm:py-28">

        {/* --- Page Header --- */}
        <MotionSection>
            <div className="text-center">
                <p className="font-semibold text-blue-600">Our Company</p>
                <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    Engineering Smarter Logistics
                </h1>
                <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                    We're a team of engineers and logistics experts dedicated to simplifying shipping for every Indian business.
                </p>
            </div>
        </MotionSection>

        {/* --- Our Story Section --- */}
<MotionSection>
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-slate-200/60">
                <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 items-center">
                    <div className="lg:col-span-2 text-slate-600 leading-relaxed space-y-4 text-base sm:text-lg">
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">Our Story: From In-House Tool to National Platform</h2>
                        <p>FreightCompare is a spin-off from <strong>Forus Electric</strong>, India’s leader in lighting solutions. While scaling our national distribution, we faced persistent logistics challenges: opaque pricing, unreliable delivery times, and a fragmented network of carriers.</p>
                        <p>Frustrated by these inefficiencies, CEO <strong>Uttam Goyal (IIT Roorkee '10)</strong> leveraged Forus's deep engineering expertise to build an internal platform to solve this problem. The goal was simple: create a single dashboard to compare rates from every possible carrier and find the true best rate, every time.</p>
                        <p>The success of this tool was so profound that we knew we had to share it. Today, FreightCompare is that platform, available to every business in India seeking to drive down costs and streamline their supply chain.</p>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="bg-slate-100 rounded-2xl p-8 text-center shadow-inner">
                            {/* Updated Image Source pointing to Public folder */}
                            <img 
                                className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-lg object-cover" 
                                src="/uttamgoyal.jpg" 
                                alt="Uttam Goyal, CEO" 
                            />
                            <h4 className="text-xl font-bold text-slate-800">Uttam Goyal</h4>
                            <p className="text-blue-600 font-semibold">CEO & Founder</p>
                            <p className="text-sm text-slate-500 mt-1">Alumnus, IIT Roorkee</p>
                        </div>
                    </div>
                </div>
            </div>
        </MotionSection>

        {/* --- Pillars Section (Mission, Vision, Values) --- */}
        <MotionSection>
            <SectionTitle subtitle="These core principles guide every decision we make.">
                Our Pillars
            </SectionTitle>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <PillarCard icon={<Truck size={32}/>} title="Our Mission">To unify India's freight-rate landscape, providing transparent and cost-effective shipping for businesses of all sizes by connecting them with a vast network of carriers.</PillarCard>
                <PillarCard icon={<Globe size={32}/>} title="Our Vision">To become the essential logistics backbone for every Indian business, empowering growth and efficiency through technology, data, and an all-inclusive carrier network.</PillarCard>
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/60 h-full hover:-translate-y-2 transition-transform duration-300">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mb-6">
                        <Heart size={32}/>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">Our Values</h3>
                    <ul className="space-y-3 text-slate-600">
                        <li className='flex gap-3'><UserCheck className='w-5 h-5 text-blue-600 mt-1 flex-shrink-0'/><div><strong>Integrity:</strong> Transparent, direct-from-carrier rates. No hidden fees.</div></li>
                        <li className='flex gap-3'><Network className='w-5 h-5 text-blue-600 mt-1 flex-shrink-0'/><div><strong>Inclusivity:</strong> Onboarding everyone from logistics giants to local transporters.</div></li>
                        <li className='flex gap-3'><BrainCircuit className='w-5 h-5 text-blue-600 mt-1 flex-shrink-0'/><div><strong>Innovation:</strong> A product engineered for performance, born from real-world expertise.</div></li>
                    </ul>
                </div>
            </div>
        </MotionSection>

        {/* --- The FreightCompare Advantage --- */}
        <MotionSection className="bg-white py-20 sm:py-28 -mx-4">
             <div className="container mx-auto px-4">
                <SectionTitle subtitle="We leverage our unique background to offer unparalleled service.">
                    The FreightCompare Advantage
                </SectionTitle>
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3"><Network className="w-8 h-8 text-blue-600"/> <h3 className='text-xl font-bold text-slate-800'>Expansive Network</h3></div>
                        <p className="text-slate-600">We onboard regional and local providers, giving you access to the best rates even in remote locations.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-blue-600"/> <h3 className='text-xl font-bold text-slate-800'>Transparent Pricing</h3></div>
                        <p className="text-slate-600">Our token system ensures you pay a tiny fraction of what you save. One token unlocks every rate for a search.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3"><Briefcase className="w-8 h-8 text-blue-600"/> <h3 className='text-xl font-bold text-slate-800'>Built by Shippers, For Shippers</h3></div>
                        <p className="text-slate-600">As a manufacturer, we built the tool we always needed. This platform is powered by real-world shipping experience.</p>
                    </div>
                </div>
            </div>
        </MotionSection>
        
{/* --- Warehouses & Map --- */}
<MotionSection>
    <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-left">
            <h2 className="text-3xl font-extrabold text-slate-900">Anchored by a National Presence</h2>
            <p className="mt-4 text-lg text-slate-600">Our logistics operations are backed by Forus Electric's strategically located warehouses, forming the core of our physical distribution network across India.</p>
            <div className="mt-6 space-y-3">
                <div className="flex gap-3 items-center"><MapPin className="w-6 h-6 text-blue-600 flex-shrink-0"/><p className="font-semibold text-slate-700">Delhi NCR (Okhla Phase 1)</p></div>
                <div className="flex gap-3 items-center"><MapPin className="w-6 h-6 text-blue-600 flex-shrink-0"/><p className="font-semibold text-slate-700">Mumbai (Vikhroli)</p></div>
                <div className="flex gap-3 items-center"><MapPin className="w-6 h-6 text-blue-600 flex-shrink-0"/><p className="font-semibold text-slate-700">Bengaluru (Electronics City)</p></div>
            </div>
        </div>
        
        {/* Map Image Section */}
        {/* Added 'max-w-md' and 'mx-auto' to fix the size issue */}
        <div className="p-4 bg-white rounded-2xl shadow-xl border max-w-md mx-auto w-full">
            <img 
                src="/indiamap.jpg" 
                alt="Map of India showing warehouse locations" 
                className="rounded-lg object-cover w-full h-auto"
            />
        </div>
    </div>
</MotionSection>

      </main>
    </div>
  )
}