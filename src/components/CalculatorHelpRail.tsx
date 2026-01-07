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
            }, 4000); // Change every 4 seconds
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
        setTimeout(() => setIsPaused(false), 8000); // Resume after 8 seconds
    };

    const currentFact = platformFacts[currentIndex];
    const IconComponent = currentFact.icon;

    return (
        <aside
            className="hidden xl:flex w-full flex-shrink-0 items-center justify-center"
            style={{ minHeight: '100vh' }}
        >
            <div className="sticky top-1/2 -translate-y-1/2 w-full">
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
                            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{
                                            rotate: [0, 360],
                                            scale: [1, 1.1, 1]
                                        }}
                                        transition={{
                                            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                        }}
                                        className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm"
                                    >
                                        <Sparkles className="text-white" size={20} />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">
                                            Why Choose Us
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Platform highlights
                                        </p>
                                    </div>
                                </div>

                                {/* Hide button */}
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="p-2 rounded-md hover:bg-slate-100 transition-all group"
                                    aria-label="Hide info"
                                    title="Hide platform info"
                                >
                                    <EyeOff size={16} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                                </button>
                            </div>

                            {/* Main Content - Single Fact Display */}
                            <div className="relative h-72 mb-6 overflow-hidden">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={currentIndex}
                                        initial={{
                                            x: direction > 0 ? 300 : -300,
                                            opacity: 0,
                                            scale: 0.8,
                                            rotateY: direction > 0 ? 45 : -45
                                        }}
                                        animate={{
                                            x: 0,
                                            opacity: 1,
                                            scale: 1,
                                            rotateY: 0
                                        }}
                                        exit={{
                                            x: direction > 0 ? -300 : 300,
                                            opacity: 0,
                                            scale: 0.8,
                                            rotateY: direction > 0 ? -45 : 45
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30,
                                            opacity: { duration: 0.2 }
                                        }}
                                        className="absolute inset-0 flex flex-col items-center justify-center"
                                    >
                                        {/* Icon with animated gradient background */}
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15,
                                                delay: 0.1
                                            }}
                                            className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${currentFact.bgGradient} flex items-center justify-center mb-5 shadow-lg`}
                                        >
                                            <IconComponent className="text-white" size={48} strokeWidth={2} />

                                            {/* Animated ring */}
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.5, 0, 0.5]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${currentFact.bgGradient}`}
                                            />
                                        </motion.div>

                                        {/* Metric Badge with shine effect */}
                                        <motion.div
                                            initial={{ scale: 0, y: 20 }}
                                            animate={{ scale: 1, y: 0 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                            className="mb-4 relative"
                                        >
                                            <span className={`inline-block px-5 py-2 bg-gradient-to-r ${currentFact.bgGradient} text-white text-base font-bold rounded-full shadow-md`}>
                                                {currentFact.metric}
                                            </span>
                                        </motion.div>

                                        {/* Title */}
                                        <motion.h4
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.25 }}
                                            className="text-xl font-bold text-slate-800 mb-3 text-center"
                                        >
                                            {currentFact.title}
                                        </motion.h4>

                                        {/* Description */}
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="text-base text-slate-600 leading-relaxed text-center px-3"
                                        >
                                            {currentFact.description}
                                        </motion.p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Navigation Controls */}
                            <div className="flex items-center justify-between mb-4">
                                {/* Previous Button */}
                                <button
                                    onClick={goToPrev}
                                    className="p-2.5 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group"
                                    aria-label="Previous fact"
                                >
                                    <ChevronLeft size={18} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                </button>

                                {/* Dot Indicators */}
                                <div className="flex gap-2">
                                    {platformFacts.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToIndex(index)}
                                            className={`rounded-full transition-all ${index === currentIndex
                                                ? "w-7 h-2.5 bg-gradient-to-r from-indigo-600 to-purple-600"
                                                : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400"
                                                }`}
                                            aria-label={`Go to fact ${index + 1}`}
                                        />
                                    ))}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={goToNext}
                                    className="p-2.5 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group"
                                    aria-label="Next fact"
                                >
                                    <ChevronRight size={18} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-4">
                                <motion.div
                                    key={`progress-${currentIndex}`}
                                    initial={{ width: "0%" }}
                                    animate={{ width: isPaused ? "100%" : "100%" }}
                                    transition={{
                                        duration: isPaused ? 0 : 4,
                                        ease: "linear"
                                    }}
                                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                                />
                            </div>

                            {/* Counter */}
                            <div className="text-center">
                                <span className="text-sm text-slate-400 font-medium">
                                    {currentIndex + 1} / {platformFacts.length}
                                </span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className="w-full flex items-center justify-center"
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
        </aside>
    );
}
