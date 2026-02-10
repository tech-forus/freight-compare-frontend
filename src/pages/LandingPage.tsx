import React, { useState, useEffect, useCallback, FormEvent, useRef, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  DollarSign,
  MapPin,
  Package,
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import {
  motion,
  useTransform,
  useScroll,
  useSpring,
  useMotionValue,
  Variants
} from "framer-motion";

// --- Your project's imports ---
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

// --- Your image assets ---
import BlueDartLogo from "../assets/logos/bluedart.svg";
import DelhiveryLogo from "../assets/logos/delhivery.svg";
import DTDCLogo from "../assets/logos/dtdc.svg";
import FedExLogo from "../assets/logos/fedex.svg";

// --- Types, Helpers, and Data ---
// --- Types, Helpers, and Data ---
// --- Types, Helpers, and Data ---
// const INDIA_CENTER: LatLng = { lat: 22.0, lng: 79.0 }; // Unused
// const toRad = (deg: number) => (deg * Math.PI) / 180; // Unused
// const getCentroid = (pin: string): LatLng => { ... }; // Unused

// =======================================================================================================
// === SECTION 1: COMPONENTS ===
// =======================================================================================================

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  },
};
const itemFadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};



// QuoteCard unused


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
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 120, damping: 15, mass: 0.1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      x.set(e.clientX - rect.left - rect.width / 2);
      y.set(e.clientY - rect.top - rect.height / 2);
    };
    const onMouseLeave = () => {
      x.set(0);
      y.set(0);
    };
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [ref, x, y]);

  return { x: springX, y: springY };
};

const FinalCTA = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const magneticProps = useMagnetic(buttonRef);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if (sectionRef.current) { const rect = sectionRef.current.getBoundingClientRect(); setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); } }

  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }} variants={{ show: { transition: { staggerChildren: 0.3 } } }}>
      <div ref={sectionRef} onMouseMove={handleMouseMove} className="relative bg-blue-600 py-24 overflow-hidden">
        <motion.div className="pointer-events-none absolute -inset-px opacity-100" style={{ background: `radial-gradient(600px at ${mousePos.x}px ${mousePos.y}px, rgba(251, 191, 36, 0.15), transparent 80%)`, }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <motion.h2 variants={itemFadeInUp} className="text-4xl md:text-5xl font-extrabold mb-4">Ready to Optimize Your Shipping Costs?</motion.h2>
          <motion.p variants={itemFadeInUp} className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-blue-100">Join thousands of businesses already saving time and money. Get started for free today!</motion.p>
          <motion.div variants={itemFadeInUp} className="inline-block" style={{ x: magneticProps.x, y: magneticProps.y }}>
            <Link to="/userselect" ref={buttonRef} className="inline-block bg-yellow-400 text-slate-900 font-bold px-10 py-4 rounded-lg text-lg shadow-2xl transition-transform duration-200 ease-out hover:scale-110">
              <motion.span className="inline-block" style={{ x: magneticProps.x, y: magneticProps.y }}>Create Your Free Account <ArrowRight className="inline w-6 h-6 ml-2 -mt-1" /></motion.span>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// --- DATA ARRAYS ---
const STEPS_DATA = [{ stepNumber: '1', title: 'Enter Details', description: 'Provide shipment origin, destination, and package specifics.', icon: SlidersHorizontal }, { stepNumber: '2', title: 'Compare Quotes', description: 'Instantly see real-time rates from trusted carriers.', icon: BarChart3 }, { stepNumber: '3', title: 'Choose & Ship', description: 'Select the best option and book your shipment with one click.', icon: CheckCircle }];
const FEATURES_DATA = [{ icon: Zap, title: 'Real-Time Rates', description: 'Access up-to-the-minute pricing from multiple carriers in one place.' }, { icon: Users, title: 'Wide Carrier Network', description: 'Compare options from local couriers to global logistics giants.' }, { icon: DollarSign, title: 'Save Big', description: 'Find the most cost-effective shipping solutions and reduce your expenses.' }, { icon: ThumbsUp, title: 'Transparent Pricing', description: 'No hidden fees. What you see is what you pay. Full cost breakdown.' }, { icon: Sparkles, title: 'Easy-to-Use', description: 'Intuitive interface designed for speed and simplicity, even for complex shipments.' }, { icon: Truck, title: 'All Shipment Types', description: 'From small parcels to large freight, we cover a wide range of shipping needs.' }];
const CARRIERS_LOGOS = [{ src: BlueDartLogo, alt: 'Blue Dart' }, { src: DelhiveryLogo, alt: 'Delhivery' }, { src: DTDCLogo, alt: 'DTDC' }, { src: FedExLogo, alt: 'FedEx' }];


// =======================================================================================================
// === SECTION 2: MAIN LANDING PAGE COMPONENT ===
// =======================================================================================================
// =======================================================================================================
// === SECTION 2: MAIN LANDING PAGE COMPONENT ===
// =======================================================================================================
const LandingPage: React.FC = () => {
  const [fromPincode, setFromPincode] = useState("110001");
  const [toPincode, setToPincode] = useState("560001");
  const [weight, setWeight] = useState("5.1");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Scroll hooks
  const { scrollY } = useScroll();
  const truckX = useTransform(scrollY, [0, 400], [0, 200]);
  const truckScale = useTransform(scrollY, [0, 400], [1, 1.2]);
  const truckOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const handleCalculate = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(fromPincode) || !/^\d{6}$/.test(toPincode)) {
      setError("Please enter valid 6-digit pincodes.");
      return;
    }
    const w = parseFloat(weight);
    if (isNaN(w) || w < 0.1) {
      setError("Please enter a valid weight (at least 0.1 kg).");
      return;
    }

    // Navigate to calculator page with state
    navigate('/compare', {
      state: {
        fromPincode,
        toPincode,
        weight
      }
    });

  }, [fromPincode, toPincode, weight, navigate]);

  return (
    <div className="font-sans text-gray-700 min-h-screen flex flex-col">
      <Header />

      {/* === FIXED VIDEO BACKGROUND === */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <video
          className="absolute top-0 left-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/Logistics_cargo_truck_202602091459.mp4" type="video/mp4" />
          {/* Fallback */}
          <div className="w-full h-full bg-slate-900" />
        </video>
        {/* Overlays for readability */}
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <main className="relative z-10 flex-grow">
        {/* === HERO SECTION (Transparent) === */}
        <div role="banner" className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="container mx-auto px-6 relative z-10 w-full pt-20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">

              {/* LEFT CONTENT: HEADLINES */}
              <div className="w-full md:w-1/2 text-left text-white space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 drop-shadow-lg">
                    Stop <span className="text-yellow-400">Overpaying</span> <br />
                    for Shipping.
                  </h1>
                  <p className="text-xl md:text-2xl font-light text-blue-100 max-w-lg leading-relaxed drop-shadow-md">
                    Compare amongst your vendors for rates and get the best deals. Save upto 40% instantly.                 </p>
                </motion.div>

                {/* SCROLL-LINKED ANIMATED TRUCK */}
                <div className="hidden md:block relative h-32 mt-10">
                  <motion.div
                    style={{
                      x: truckX,
                      scale: truckScale,
                      opacity: truckOpacity
                    }}
                    className="absolute left-0"
                  >
                    <div className="relative">
                      <Truck className="w-24 h-24 text-yellow-400 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" strokeWidth={1} />
                      <motion.div
                        className="absolute -bottom-2 -left-4 w-32 h-4 bg-black/40 blur-xl rounded-full"
                        animate={{ scaleX: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                      <motion.div
                        className="absolute top-2 -right-6"
                        animate={{ x: [0, 10, 0], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      >
                        <div className="h-0.5 w-4 bg-white/50 blur-[1px]" />
                      </motion.div>
                      <motion.div
                        className="absolute top-6 -right-8"
                        animate={{ x: [0, 15, 0], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, ease: "linear" }}
                      >
                        <div className="h-0.5 w-6 bg-white/50 blur-[1px]" />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* RIGHT CONTENT: CALCULATOR (Glassmorphism) */}
              <div className="w-full md:w-3/12 ml-auto">
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-2xl ring-1 ring-black/5"
                >
                  <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                    <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">Compare Rates</h2>
                  </div>

                  <form onSubmit={handleCalculate} className="space-y-4">
                    <div className="space-y-1">
                      <label htmlFor="from" className="text-[10px] font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-yellow-400" /> Origin Pincode
                      </label>
                      <input
                        id="from"
                        value={fromPincode}
                        onChange={e => setFromPincode(e.target.value.replace(/\D/g, ''))}
                        type="text"
                        pattern="\d{6}"
                        maxLength={6}
                        placeholder="110001"
                        required
                        className="w-full px-3 py-2 bg-white/80 border-0 rounded-lg text-sm text-slate-800 placeholder:text-slate-500 font-bold focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all shadow-inner backdrop-blur-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="to" className="text-[10px] font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-yellow-400" /> Destination Pincode
                      </label>
                      <input
                        id="to"
                        value={toPincode}
                        onChange={e => setToPincode(e.target.value.replace(/\D/g, ''))}
                        type="text"
                        pattern="\d{6}"
                        maxLength={6}
                        placeholder="560001"
                        required
                        className="w-full px-3 py-2 bg-white/80 border-0 rounded-lg text-sm text-slate-800 placeholder:text-slate-500 font-bold focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all shadow-inner backdrop-blur-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="weight" className="text-[10px] font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-yellow-400" /> Weight (kg)
                      </label>
                      <input
                        id="weight"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="5.1"
                        required
                        className="w-full px-3 py-2 bg-white/80 border-0 rounded-lg text-sm text-slate-800 placeholder:text-slate-500 font-bold focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all shadow-inner backdrop-blur-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/40 hover:shadow-blue-600/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                    >
                      <span>Get Live Quotes</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                  {error && <div className="mt-4 p-2 bg-red-500/40 border border-red-500/30 rounded-lg text-white text-xs font-medium text-center backdrop-blur-md shadow-lg">{error}</div>}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* === "HOW IT WORKS" SECTION - GLASSMORPHISM === */}
        <motion.section
          initial="hidden" whileInView="show" variants={staggerContainer} viewport={{ once: true, amount: 0.3 }}
          aria-labelledby="how-it-works-title" className="py-24 relative z-10"
        >
          {/* Glass background for section */}
          <div className="absolute inset-0 bg-white/80 backdrop-blur-lg -z-10" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">Process</span>
              <motion.h2 variants={itemFadeInUp} id="how-it-works-title" className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-2 mb-6">Simple Steps to Smart Shipping</motion.h2>
              <motion.p variants={itemFadeInUp} className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">Getting the best shipping deal is as easy as 1-2-3. No complex paperwork, just results.</motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 md:gap-x-12">
              {STEPS_DATA.map(step => <UpgradedStepCard key={step.stepNumber} {...step} />)}
            </div>
          </div>
        </motion.section>

        {/* === "FEATURES" SECTION - GLASSMORPHISM === */}
        <motion.section
          initial="hidden" whileInView="show" variants={staggerContainer} viewport={{ once: true, amount: 0.2 }}
          aria-labelledby="features-title" className="py-24 relative z-10 text-white"
        >
          {/* Darker Glass background for section contrast */}
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-lg -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 max-w-3xl mx-auto">
              <span className="text-yellow-400 font-bold tracking-wider uppercase text-sm">Features</span>
              <motion.h2 variants={itemFadeInUp} id="features-title" className="text-3xl md:text-4xl font-extrabold text-white mt-2 mb-6">Everything You Need for Smarter Logistics</motion.h2>
              <motion.p variants={itemFadeInUp} className="text-blue-100 text-lg">Our platform is packed with powerful tools designed to simplify your shipping operations.</motion.p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES_DATA.map((feature, idx) => <UpgradedFeatureCard key={idx} {...feature} />)}
            </div>
          </div>
        </motion.section>

        {/* === "TRUSTED BY" SECTION - GLASSMORPHISM === */}
        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="py-24 relative z-10 border-t border-white/10">
          {/* White Glass background */}
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xl -z-10" />

          <div aria-labelledby="trusted-by-title" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2 variants={itemFadeInUp} id="trusted-by-title" className="text-2xl font-semibold text-slate-500 text-center mb-16 uppercase tracking-widest">Powered by Industry Leaders</motion.h2>
            <motion.div variants={staggerContainer} className="flex flex-wrap justify-center items-center gap-x-12 sm:gap-x-20 gap-y-12 grayscale hover:grayscale-0 transition-all duration-500">
              {CARRIERS_LOGOS.map((c, i) => (
                <motion.img variants={itemFadeInUp} key={i} src={c.src} alt={c.alt} loading="lazy" className="h-10 sm:h-14 object-contain opacity-60 hover:opacity-100 transition-all duration-300 hover:scale-110" />
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