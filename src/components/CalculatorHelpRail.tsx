import { useEffect, useState, useRef } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Zap, Shield, TrendingUp, Users, Package, Clock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Platform facts - easily expandable
const platformFacts = [
    {
        icon: Zap,
        iconColor: "text-yellow-500",
        bgGradient: "from-yellow-400 to-orange-500",
        bgLight: "bg-yellow-50",
        title: "Instant Quotes",
        description: "Get freight rates from 100+ verified transporters in under 10 seconds",
        metric: "10sec",
    },
    {
        icon: Shield,
        iconColor: "text-green-500",
        bgGradient: "from-green-400 to-emerald-500",
        bgLight: "bg-green-50",
        title: "Verified Vendors",
        description: "All transporters are pre-verified with insurance and licenses checked",
        metric: "100%",
    },
    {
        icon: TrendingUp,
        iconColor: "text-blue-500",
        bgGradient: "from-blue-400 to-cyan-500",
        bgLight: "bg-blue-50",
        title: "Save up to 40%",
        description: "Compare rates instantly and choose the best value for your shipment",
        metric: "40%",
    },
    {
        icon: Users,
        iconColor: "text-purple-500",
        bgGradient: "from-purple-400 to-pink-500",
        bgLight: "bg-purple-50",
        title: "Trusted by 1000+",
        description: "Over 1000 businesses use our platform for their daily freight needs",
        metric: "1000+",
    },
    {
        icon: Package,
        iconColor: "text-indigo-500",
        bgGradient: "from-indigo-400 to-blue-500",
        bgLight: "bg-indigo-50",
        title: "All Modes",
        description: "Support for Road, Air, Rail, and Ship freight with real-time tracking",
        metric: "4 Modes",
    },
    {
        icon: Clock,
        iconColor: "text-orange-500",
        bgGradient: "from-orange-400 to-red-500",
        bgLight: "bg-orange-50",
        title: "24/7 Support",
        description: "Round-the-clock customer support to help with your shipment needs",
        metric: "24/7",
    },
];

export default function InfoCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [direction, setDirection] = useState(1);
    const [isVisible, setIsVisible] = useState(true);
    const autoScrollRef = useRef<number | null>(null);

    // Auto-scroll functionality
    useEffect(() => {
        if (!isPaused && isVisible) {
            autoScrollRef.current = window.setInterval(() => {
                setDirection(1);
                setCurrentIndex((prev) => (prev + 1) % platformFacts.length);
            }, 4000);
        }

        return () => {
            if (autoScrollRef.current) {
                clearInterval(autoScrollRef.current);
            }
        };
    }, [isPaused, isVisible]);

    const goToNext = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % platformFacts.length);
        pauseAutoScroll();
    };

    const goToPrev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + platformFacts.length) % platformFacts.length);
        pauseAutoScroll();
    };

    const goToIndex = (index: number) => {
        setDirection(index > currentIndex ? 1 : -1);
        setCurrentIndex(index);
        pauseAutoScroll();
    };

    const pauseAutoScroll = () => {
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 8000);
    };

    const currentFact = platformFacts[currentIndex];
    const IconComponent = currentFact.icon;

    return (
        <div className="w-full max-w-full overflow-hidden">
            <AnimatePresence mode="wait">
                {isVisible ? (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-[260px] flex flex-col overflow-hidden"
                    >
                        {/* Header - Compact */}
                        <div className="flex items-center justify-between px-3 pt-3 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                    <Sparkles className="text-white" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Why Choose Us</h3>
                                    <p className="text-xs text-slate-500">Platform highlights</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                                title="Hide"
                            >
                                <EyeOff size={14} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex items-center justify-center px-3">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-center text-center"
                                >
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${currentFact.bgGradient} flex items-center justify-center mb-1.5 shadow`}>
                                        <IconComponent className="text-white" size={24} strokeWidth={2} />
                                    </div>

                                    {/* Metric */}
                                    <span className={`inline-block px-3 py-0.5 bg-gradient-to-r ${currentFact.bgGradient} text-white text-xs font-bold rounded-full mb-1.5`}>
                                        {currentFact.metric}
                                    </span>

                                    {/* Title */}
                                    <h4 className="text-sm font-bold text-slate-800 mb-0.5">
                                        {currentFact.title}
                                    </h4>

                                    {/* Description */}
                                    <p className="text-[11px] text-slate-500 leading-snug px-1">
                                        {currentFact.description}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer - Compact navigation */}
                        <div className="px-4 pb-3">
                            <div className="flex items-center justify-center gap-1.5">
                                {platformFacts.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToIndex(index)}
                                        className={`rounded-full transition-all ${index === currentIndex
                                            ? "w-5 h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600"
                                            : "w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400"
                                            }`}
                                        aria-label={`Go to fact ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="collapsed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="w-full flex items-center justify-center h-[260px]"
                    >
                        <motion.button
                            onClick={() => setIsVisible(true)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all"
                            aria-label="Show info"
                            title="Show platform info"
                        >
                            <Eye size={18} className="text-slate-500" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
