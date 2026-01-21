import React, { useState, useEffect, useCallback, FormEvent, ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  DollarSign,
  MapPin,
  Package, // The correct, final icon
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";

// --- Your project's imports ---
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

// --- Your image assets (ensure paths are correct) ---
import landingBgPattern from "../assets/landing-bg-final.png";
import BlueDartLogo from "../assets/logos/bluedart.svg";
import DelhiveryLogo from "../assets/logos/delhivery.svg";
import DTDCLogo from "../assets/logos/dtdc.svg";
import FedExLogo from "../assets/logos/fedex.svg";

// --- Types, Helpers, and Data (Unchanged from your perfect version) ---
type LatLng = { lat: number; lng: number };
const PINCODE_PREFIX_LOCATIONS: Record<string, LatLng> = {
  '1100': { lat: 28.6139, lng: 77.2090 }, '1220': { lat: 28.4595, lng: 77.0266 }, '1406': { lat: 30.7333, lng: 76.7794 }, '2013': { lat: 28.5355, lng: 77.3910 }, '2260': { lat: 26.8467, lng: 80.9462 }, '3020': { lat: 26.9124, lng: 75.7873 }, '3800': { lat: 23.0225, lng: 72.5714 }, '4000': { lat: 19.0760, lng: 72.8777 }, '4110': { lat: 18.5204, lng: 73.8567 }, '5000': { lat: 17.3850, lng: 78.4867 }, '5600': { lat: 12.9716, lng: 77.5946 }, '6000': { lat: 13.0827, lng: 80.2707 }, '6820': { lat: 9.9312, lng: 76.2673 },  '7000': { lat: 22.5726, lng: 88.3639 }, '7810': { lat: 26.1445, lng: 91.7362 },
};
const REGION_CENTERS: Record<string, LatLng> = {
  '1': { lat: 28.61, lng: 77.21 }, '2': { lat: 26.85, lng: 80.95 }, '3': { lat: 26.91, lng: 75.79 }, '4': { lat: 19.07, lng: 72.87 }, '5': { lat: 17.38, lng: 78.48 }, '6': { lat: 13.08, lng: 80.27 }, '7': { lat: 22.57, lng: 88.36 }, '8': { lat: 25.61, lng: 85.13 },
};
const INDIA_CENTER: LatLng = { lat: 22.0, lng: 79.0 };
const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversine = (a: LatLng, b: LatLng): number => {
  const R = 6371; const dLat = toRad(b.lat - a.lat); const dLon = toRad(b.lng - a.lng); const φ1 = toRad(a.lat), φ2 = toRad(b.lat); const h = Math.sin(dLat / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const getCentroid = (pin: string): LatLng => {
  if (pin.length < 4) return INDIA_CENTER; const prefix4 = pin.substring(0, 4); const prefix1 = pin[0]; return PINCODE_PREFIX_LOCATIONS[prefix4] || REGION_CENTERS[prefix1] || INDIA_CENTER;
};

// =======================================================================================================
// === SECTION 1: UPGRADED & NEXT-LEVEL COMPONENTS ===
// =======================================================================================================

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }, };
const itemFadeInUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

const AnimatedNumber = ({ value }: { value: number }) => {
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, { stiffness: 100, damping: 30 });
    const displayValue = useTransform(springValue, (latest) => `₹ ${Math.round(latest).toLocaleString('en-IN')}`);
    useEffect(() => { motionValue.set(value); }, [motionValue, value]);
    return <motion.span>{displayValue}</motion.span>;
};

const QuoteCard = ({ carrier, logo, price, eta, isBest, delay }: { carrier: string; logo: string; price: number; eta: number; isBest: boolean; delay: number; }) => (
    <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} className={`relative bg-white border rounded-xl p-5 transition-all duration-300 ${isBest ? 'border-yellow-400 shadow-2xl scale-105' : 'border-slate-200 shadow-lg'}`}>
        {isBest && (<div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-slate-900 text-xs font-bold rounded-full shadow-md">BEST VALUE</div>)}
        <div className="flex items-center justify-between mb-4 mt-2"><h3 className="text-lg font-bold text-slate-800">{carrier}</h3><img src={logo} alt={carrier} className="h-7" /></div>
        <div className="flex items-end justify-between text-left"><div><p className="text-3xl font-bold text-blue-600"><AnimatedNumber value={price} /></p><p className="text-sm text-slate-500">Estimated Cost</p></div><div className="text-right"><p className="text-xl font-semibold text-slate-700">{eta} days</p><p className="text-sm text-slate-500">Est. Delivery</p></div></div>
    </motion.div>
);

const UpgradedStepCard: React.FC<{ stepNumber: string; title: string; description: string; icon: React.ElementType }> = ({ stepNumber, title, description, icon: Icon }) => (
  <motion.div variants={itemFadeInUp} className="relative text-center p-8 bg-white rounded-2xl shadow-xl border border-transparent hover:border-blue-500 transition-all duration-300 group">
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full font-bold text-2xl shadow-lg border-4 border-slate-50 transform group-hover:scale-110 transition-transform">
        {stepNumber}
    </div>
    <div className="mt-10 mb-4">
      <Icon className="w-12 h-12 text-blue-500 mx-auto transition-transform group-hover:scale-125" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 leading-relaxed">{description}</p>
  </motion.div>
);

const UpgradedFeatureCard: React.FC<{ icon: React.ElementType; title: string; description: string }> = ({ icon: Icon, title, description }) => (
    <motion.div variants={itemFadeInUp} className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent transition-all duration-300 hover:shadow-2xl hover:border-yellow-400 group">
        <div className="mb-5 inline-block p-4 bg-yellow-100 rounded-full transition-colors group-hover:bg-yellow-200">
          <Icon className="w-10 h-10 text-yellow-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-base text-slate-600 leading-relaxed">{description}</p>
    </motion.div>
);

const useMagnetic = (ref: React.RefObject<HTMLElement>) => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onMouseMove = (e: MouseEvent) => { const rect = el.getBoundingClientRect(); setPos({ x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 }); };
        const onMouseLeave = () => setPos({ x: 0, y: 0 });
        el.addEventListener("mousemove", onMouseMove);
        el.addEventListener("mouseleave", onMouseLeave);
        return () => { el.removeEventListener("mousemove", onMouseMove); el.removeEventListener("mouseleave", onMouseLeave); };
    }, [ref]);
    return useSpring({ x: pos.x, y: pos.y }, { stiffness: 120, damping: 15, mass: 0.1 });
};

const FinalCTA = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLAnchorElement>(null);
    const magneticProps = useMagnetic(buttonRef);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if(sectionRef.current) { const rect = sectionRef.current.getBoundingClientRect(); setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); } }
    
    return (
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }} variants={{ show: { transition: { staggerChildren: 0.3 }}}}>
            <div ref={sectionRef} onMouseMove={handleMouseMove} className="relative bg-blue-600 py-24 overflow-hidden" style={{backgroundImage: `url(${landingBgPattern})`}}>
                <motion.div className="pointer-events-none absolute -inset-px opacity-100" style={{ background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(251, 191, 36, 0.15), transparent 80%)`,}}/>
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                    <motion.h2 variants={itemFadeInUp} className="text-4xl md:text-5xl font-extrabold mb-4">Ready to Optimize Your Shipping Costs?</motion.h2>
                    <motion.p variants={itemFadeInUp} className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-blue-100">Join thousands of businesses already saving time and money. Get started for free today!</motion.p>
                    <motion.div variants={itemFadeInUp} className="inline-block" style={{x: magneticProps.x, y: magneticProps.y}}>
                        <Link to="/userselect" ref={buttonRef} className="inline-block bg-yellow-400 text-slate-900 font-bold px-10 py-4 rounded-lg text-lg shadow-2xl transition-transform duration-200 ease-out hover:scale-110">
                            <motion.span className="inline-block" style={{x: magneticProps.x, y: magneticProps.y}}>Create Your Free Account <ArrowRight className="inline w-6 h-6 ml-2 -mt-1" /></motion.span>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

// --- DATA ARRAYS ---
const STEPS_DATA = [ { stepNumber: '1', title: 'Enter Details', description: 'Provide shipment origin, destination, and package specifics.', icon: SlidersHorizontal }, { stepNumber: '2', title: 'Compare Quotes', description: 'Instantly see real-time rates from trusted carriers.', icon: BarChart3 }, { stepNumber: '3', title: 'Choose & Ship', description: 'Select the best option and book your shipment with one click.', icon: CheckCircle }];
const FEATURES_DATA = [ { icon: Zap, title: 'Real-Time Rates', description: 'Access up-to-the-minute pricing from multiple carriers in one place.' }, { icon: Users, title: 'Wide Carrier Network', description: 'Compare options from local couriers to global logistics giants.' }, { icon: DollarSign, title: 'Save Big', description: 'Find the most cost-effective shipping solutions and reduce your expenses.' }, { icon: ThumbsUp, title: 'Transparent Pricing', description: 'No hidden fees. What you see is what you pay. Full cost breakdown.' }, { icon: Sparkles, title: 'Easy-to-Use', description: 'Intuitive interface designed for speed and simplicity, even for complex shipments.' }, { icon: Truck, title: 'All Shipment Types', description: 'From small parcels to large freight, we cover a wide range of shipping needs.' }];
const CARRIERS_LOGOS = [{ src: BlueDartLogo, alt: 'Blue Dart' }, { src: DelhiveryLogo, alt: 'Delhivery' }, { src: DTDCLogo, alt: 'DTDC' }, { src: FedExLogo, alt: 'FedEx' }];


// =======================================================================================================
// === SECTION 2: MAIN LANDING PAGE COMPONENT ===
// =======================================================================================================
const LandingPage: React.FC = () => {
  const [fromPincode, setFromPincode] = useState("110001");
  const [toPincode, setToPincode] = useState("560001");
  const [weight, setWeight] = useState("5.1");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  // ======================================================================
  // === START: DYNAMIC PRICING LOGIC ===
  // ======================================================================

  /**
   * Defines the base pricing profile for each carrier.
   * Instead of a static cost, we define a base and a variance percentage.
   * This allows us to simulate dynamic, real-world pricing fluctuations.
   */
  const QUOTE_PROFILES = [
    { 
      carrier: 'Express Wings', logo: DelhiveryLogo, 
      baseCost: { base: 35, variance: 0.20 }, // Can vary by +/- 20%
      kmRate:   { base: 0.18, variance: 0.10 },
      kgRate:   { base: 20, variance: 0.15 },
      speedFactor: 1.0 
    },
    { 
      carrier: 'Value Connect', logo: DTDCLogo, 
      baseCost: { base: 45, variance: 0.10 }, // More stable pricing
      kmRate:   { base: 0.15, variance: 0.20 }, // but per-km rate fluctuates more
      kgRate:   { base: 18, variance: 0.10 },
      speedFactor: 1.2 
    },
    { 
      carrier: 'Blue Dart', logo: BlueDartLogo, 
      baseCost: { base: 60, variance: 0.10 }, // Premium, less fluctuation
      kmRate:   { base: 0.22, variance: 0.05 },
      kgRate:   { base: 25, variance: 0.10 },
      speedFactor: 0.8 
    },
    { 
      carrier: 'Global Post', logo: FedExLogo, 
      baseCost: { base: 80, variance: 0.25 }, // High base, high fluctuation
      kmRate:   { base: 0.30, variance: 0.15 },
      kgRate:   { base: 30, variance: 0.05 },
      speedFactor: 0.7 
    }
  ];

  /**
   * Helper function to apply a random variance to a base rate.
   * @param base - The base number (e.g., base cost).
   * @param variance - The percentage to vary by (e.g., 0.1 for +/- 10%).
   * @returns A randomized number within the specified range.
   */
  const applyVariance = (base: number, variance: number): number => {
      const randomness = (Math.random() - 0.5) * 2; // Creates a random number between -1 and 1
      return base * (1 + randomness * variance);
  };
  
  // --- Core Calculation Logic ---
  const handleCalculate = useCallback((e: FormEvent) => {
    e.preventDefault(); 
    setError(null); 
    setResults([]);

    if (!/^\d{6}$/.test(fromPincode) || !/^\d{6}$/.test(toPincode)) { 
        setError("Please enter valid 6-digit pincodes."); 
        return; 
    }
    const w = parseFloat(weight);
    if (isNaN(w) || w < 0.1) { 
        setError("Please enter a valid weight (at least 0.1 kg)."); 
        return; 
    }

    const origin = getCentroid(fromPincode); 
    const dest = getCentroid(toPincode); 
    const dist = haversine(origin, dest);

    // Simulate getting fresh, dynamic rates from carriers for this specific search
    const dynamicQuotes = QUOTE_PROFILES.map(profile => {
        const dynamicBaseCost = applyVariance(profile.baseCost.base, profile.baseCost.variance);
        const dynamicKmRate = applyVariance(profile.kmRate.base, profile.kmRate.variance);
        const dynamicKgRate = applyVariance(profile.kgRate.base, profile.kgRate.variance);

        const calculatedPrice = Math.round(dynamicBaseCost + (dist * dynamicKmRate) + (w * dynamicKgRate));
        const calculatedEta = Math.ceil((dist / 500) * profile.speedFactor) + 1;
        
        return {
            ...profile,
            price: calculatedPrice,
            eta: calculatedEta,
        };
    });

    // Find the carrier with the absolute lowest price in this specific batch of quotes
    const bestQuote = dynamicQuotes.reduce(
        (cheapest, current) => (current.price < cheapest.price ? current : cheapest), 
        dynamicQuotes[0]
    );
    
    // Set results for rendering, marking the cheapest one as "Best Value"
    setResults(
        dynamicQuotes
            .map(q => ({...q, isBest: q.carrier === bestQuote.carrier}))
            .sort((a,b) => a.price - b.price)
    );

    setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100);

  }, [fromPincode, toPincode, weight]); // QUOTE_PROFILES is static, no need to include

  // ======================================================================
  // === END: DYNAMIC PRICING LOGIC ===
  // ======================================================================

  // --- Component Render ---
  return (
    <div className="font-sans text-gray-700 bg-white">
      <Header />

      <main>
        {/* === HERO SECTION === */}
        <div role="banner" className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 bg-slate-50 border-b border-slate-200">
             <div className="container mx-auto px-6 text-center relative z-10 flex flex-col items-center">
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 mb-4 leading-tight">Stop Overpaying for Shipping.<br /><span className="text-blue-600">Find the Best Rates, Instantly.</span></motion.h1>
                 <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl mb-10 max-w-3xl mx-auto text-slate-600">We compare real-time quotes from top carriers, saving you time and money. Use our live demo to see how much you can save.</motion.p>
                 <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1]}} className="w-full w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
                     <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5 text-left"><label htmlFor="from" className="font-semibold text-sm text-slate-600 mb-1.5 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-600"/>Origin Pincode</label><input id="from" value={fromPincode} onChange={e=>setFromPincode(e.target.value.replace(/\D/g, ''))} type="text" pattern="\d{6}" maxLength={6} placeholder="e.g., 110001" required className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"/></div>
                        <div className="md:col-span-5 text-left"><label htmlFor="to" className="font-semibold text-sm text-slate-600 mb-1.5 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-yellow-500"/>Destination Pincode</label><input id="to" value={toPincode} onChange={e=>setToPincode(e.target.value.replace(/\D/g, ''))} type="text" pattern="\d{6}" maxLength={6} placeholder="e.g., 560001" required className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"/></div>
                        <div className="md:col-span-2 text-left"><label htmlFor="weight" className="font-semibold text-sm text-slate-600 mb-1.5 flex items-center gap-1.5"><Package className="w-4 h-4 text-slate-500"/>Weight (kg)</label><input id="weight" value={weight} onChange={e=>setWeight(e.target.value)} type="number" step="0.1" min="0.1" placeholder="5.1" required className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"/></div>
                        <div className="md:col-span-12"><button type="submit" className="w-full mt-2 h-full py-3 bg-blue-600 text-white text-lg font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:scale-[1.02] flex items-center justify-center">Compare Rates</button></div>
                     </form>
                     {error && <p className="text-red-600 text-sm font-semibold text-left mt-3">{error}</p>}
                 </motion.div>
             </div>
        </div>
        
        {/* === DYNAMIC RESULTS SECTION === */}
        <AnimatePresence>
            {results.length > 0 && (
                <motion.div id="results-section" initial={{ opacity: 0 }} animate={{ opacity: 1}} exit={{ opacity: 0}} className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <motion.h2 initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="text-3xl font-extrabold text-slate-900 text-center mb-4">
                            Your Live Quotes are Ready!
                        </motion.h2>
                        
                        {/* === ADDED BUTTON - START === */}
                        <motion.div
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: 0.2, duration: 0.4}}
                            className="text-center mb-10"
                        >
                            <Link to="/userselect" className="inline-flex items-center bg-yellow-400 text-slate-900 font-bold px-8 py-3 rounded-lg text-lg shadow-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-2xl">
                                Get Started <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </motion.div>
                        {/* === ADDED BUTTON - END === */}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {results.map((quote, i) => (
                                <QuoteCard key={quote.carrier} {...quote} delay={i * 0.08 + 0.35} /> 
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* === "HOW IT WORKS" SECTION - UPGRADED === */}
        <motion.section
            initial="hidden" whileInView="show" variants={staggerContainer} viewport={{ once: true, amount: 0.3 }}
            aria-labelledby="how-it-works-title" className="py-24 bg-slate-50"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <motion.h2 variants={itemFadeInUp} id="how-it-works-title" className="text-3xl md:text-4xl font-extrabold text-slate-900">Simple Steps to Smart Shipping</motion.h2>
              <motion.p variants={itemFadeInUp} className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">Getting the best shipping deal is as easy as 1-2-3.</motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 md:gap-x-12">
              {STEPS_DATA.map(step => <UpgradedStepCard key={step.stepNumber} {...step} />)}
            </div>
          </div>
        </motion.section>

        {/* === "FEATURES" SECTION - UPGRADED === */}
        <motion.section
            initial="hidden" whileInView="show" variants={staggerContainer} viewport={{ once: true, amount: 0.2 }}
            aria-labelledby="features-title" className="py-24 bg-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <motion.h2 variants={itemFadeInUp} id="features-title" className="text-3xl md:text-4xl font-extrabold text-slate-900">Everything You Need for Smarter Logistics</motion.h2>
              <motion.p variants={itemFadeInUp} className="mt-4 text-slate-600 text-lg">Our platform is packed with features to simplify your shipping process.</motion.p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES_DATA.map((feature, idx) => <UpgradedFeatureCard key={idx} {...feature} />)}
            </div>
          </div>
        </motion.section>
        
        {/* === "TRUSTED BY" SECTION - ANIMATED === */}
        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="py-20 bg-slate-50">
          <div aria-labelledby="trusted-by-title" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2 variants={itemFadeInUp} id="trusted-by-title" className="text-2xl font-semibold text-slate-700 text-center mb-12">Compare Rates from Leading Carriers</motion.h2>
            <motion.div variants={staggerContainer} className="flex flex-wrap justify-center items-center gap-x-12 sm:gap-x-16 gap-y-8">
              {CARRIERS_LOGOS.map((c, i) => (
                <motion.img variants={itemFadeInUp} key={i} src={c.src} alt={c.alt} loading="lazy" className="h-10 sm:h-12 object-contain transition-transform duration-300 hover:scale-110" />
              ))}
            </motion.div>
          </div>
        </motion.section>
        
        {/* === FINAL CTA - UPGRADED === */}
        <FinalCTA />

      </main>

      <Footer />
    </div>
  );
};

export default React.memo(LandingPage);