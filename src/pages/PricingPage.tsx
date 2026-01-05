import React, { useState } from 'react';
import { CheckIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// --- TIER DATA (Redefined for a logistics SaaS context) ---
const tiers = [
  {
    name: 'Starter',
    id: 'tier-starter',
    price: { monthly: 29, annually: 290 },
    description: "Perfect for individuals and small businesses getting started.",
    features: ['50 Comparison Tokens/mo', 'Standard Carrier Rates', 'Basic Analytics', 'Email Support'],
    featured: false,
    cta: "Start with Starter",
  },
  {
    name: 'Pro',
    id: 'tier-pro',
    price: { monthly: 99, annually: 990 },
    description: 'For growing businesses that need more volume and support.',
    features: [
      '200 Comparison Tokens/mo',
      'All Standard & Hidden Carrier Rates',
      'Advanced Analytics & Reports',
      'Priority Email & Chat Support',
      'Save Shipment Presets',
    ],
    featured: true,
    cta: "Choose Pro",
  },
  {
    name: 'Enterprise',
    id: 'tier-enterprise',
    price: { monthly: 'Custom', annually: 'Custom' },
    description: 'Dedicated infrastructure and support for large-scale operations.',
    features: [
      'Unlimited Comparison Tokens',
      'API Access & Custom Integrations',
      'Dedicated Account Manager',
      'Personalized Onboarding',
      'Custom Feature Development',
    ],
    featured: false,
    cta: "Contact Sales",
  },
];

// --- STYLED & REUSABLE COMPONENTS ---
const BillingToggle = ({ billingCycle, onToggle }: { billingCycle: 'monthly' | 'annually'; onToggle: () => void }) => (
    <div className="relative flex items-center p-1 bg-slate-200 rounded-full w-fit mx-auto">
        <button onClick={onToggle} className="relative z-10 w-32 py-2 text-sm font-semibold transition-colors text-slate-600">Monthly</button>
        <button onClick={onToggle} className="relative z-10 w-32 py-2 text-sm font-semibold transition-colors text-slate-600">Annually</button>
        <motion.div layout transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="absolute inset-0 z-0 p-1">
          <div className={`w-1/2 h-full bg-white rounded-full shadow-md transform transition-transform ${billingCycle === 'annually' ? 'translate-x-full' : 'translate-x-0'}`} />
        </motion.div>
        <span className="absolute -top-2 -right-3 bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full rotate-6">Save 15%</span>
    </div>
);

const PricingCard = ({ tier, billingCycle }: { tier: typeof tiers[0], billingCycle: 'monthly' | 'annually' }) => {
    const isFeatured = tier.featured;
    const isCustom = tier.price.monthly === 'Custom';

    return (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className={`relative p-8 rounded-2xl h-full flex flex-col ${isFeatured ? 'bg-blue-600 text-white shadow-2xl' : 'bg-white shadow-lg border border-slate-200/80'}`}
        >
            {isFeatured && <div className='absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-slate-900 text-sm font-bold rounded-full'>Most Popular</div>}
            <h3 className={`text-lg font-bold ${isFeatured ? 'text-white' : 'text-slate-800'}`}>{tier.name}</h3>
            <p className={`mt-2 text-sm ${isFeatured ? 'text-blue-200' : 'text-slate-600'}`}>{tier.description}</p>
            
            <div className="mt-6 flex items-baseline gap-x-2">
              {!isCustom ? (
                <>
                  <span className={`text-4xl font-extrabold tracking-tight ${isFeatured ? 'text-white' : 'text-slate-900'}`}>
                    ${billingCycle === 'monthly'
                      ? tier.price.monthly
                      : typeof tier.price.annually === 'number'
                        ? Math.round(tier.price.annually / 12)
                        : 'Custom'}
                  </span>
                  <span className={`text-sm font-medium ${isFeatured ? 'text-blue-200' : 'text-slate-500'}`}>/month</span>
                </>
              ) : (
                <span className={`text-4xl font-extrabold tracking-tight ${isFeatured ? 'text-white' : 'text-slate-900'}`}>Contact Us</span>
              )}
            </div>
            { !isCustom && billingCycle === 'annually' && <p className={`text-xs mt-1 ${isFeatured ? 'text-blue-200' : 'text-slate-500'}`}>Billed as ${tier.price.annually} per year</p>}
            
            <ul role="list" className={`mt-8 space-y-3 text-sm flex-grow ${isFeatured ? 'text-blue-100' : 'text-slate-600'}`}>
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon className={`h-6 w-5 flex-none ${isFeatured ? 'text-yellow-400' : 'text-blue-600'}`} aria-hidden="true"/>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <Link to="/signup" className={`block w-full text-center mt-10 rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
                isFeatured
                  ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}>{tier.cta}</Link>
        </motion.div>
    );
};

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return(
        <div className='py-5 border-b border-slate-200'>
            <button onClick={() => setIsOpen(!isOpen)} className='w-full flex justify-between items-center text-left'>
                <h4 className="text-md font-semibold text-slate-800">{question}</h4>
                <ChevronDown size={20} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            <AnimatePresence>
              {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} exit={{ height: 0, opacity: 0, marginTop: 0 }}>
                      <p className='text-slate-600 leading-relaxed'>{answer}</p>
                  </motion.div>
              )}
            </AnimatePresence>
        </div>
    )
};


export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  return (
    <div className="bg-slate-50 font-sans">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        
        {/* Header Section */}
        <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1,y:0}} className="text-center w-full mx-auto">
          <p className="font-semibold text-blue-600">Pricing Plans</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            The Right Plan for Your Business
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Choose an affordable plan packed with features to save you time and money on every shipment.
          </p>
        </motion.div>
        
        {/* Billing Toggle */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{delay: 0.1}} className="mt-12 flex justify-center">
            <BillingToggle billingCycle={billingCycle} onToggle={() => setBillingCycle(prev => prev === 'monthly' ? 'annually' : 'monthly')} />
        </motion.div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-stretch gap-8 lg:max-w-7xl lg:grid-cols-3">
          {tiers.map((tier) => (
             <PricingCard key={tier.id} tier={tier} billingCycle={billingCycle} />
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div initial={{opacity:0, y:50}} whileInView={{opacity:1, y:0}} viewport={{once: true, amount:0.2}} className='mt-24 w-full mx-auto'>
           <div className="text-center mb-12">
               <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
           </div>
           <div className="divide-y divide-slate-200">
               <FAQItem question="What is a 'Comparison Token'?" answer="One token allows you to perform a single rate comparison search for a specific route and shipment size. It unlocks all available carrier rates for that query, including standard and hidden ones, allowing you to choose the absolute best option."/>
               <FAQItem question="Can I change my plan later?" answer="Yes! You can upgrade or downgrade your plan at any time from your account dashboard. Prorated charges or credits will be applied automatically."/>
               <FAQItem question="Is there a free trial?" answer="Our 'Starter' plan is a great way to explore the platform with a generous token allowance. For large-scale needs, contact our sales team to discuss a custom Enterprise trial."/>
               <FAQItem question="What kind of support do you offer?" answer="All plans come with email support. The 'Pro' plan includes priority email and chat support, while the 'Enterprise' plan gives you a dedicated account manager for personalized assistance."/>
           </div>
        </motion.div>

      </div>
    </div>
  )
}