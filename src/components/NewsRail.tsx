import { useEffect, useState, useRef } from "react";
import { ExternalLink, Newspaper, Loader2, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchIndianBusinessNews } from "../services/newsService";

export default function NewsRail() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [direction, setDirection] = useState(1);
    const autoScrollRef = useRef<number | null>(null);

    const loadNews = async () => {
        setLoading(true);
        try {
            const news = await fetchIndianBusinessNews();
            setArticles(news.slice(0, 5));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNews();
    }, []);

    // Auto-scroll functionality
    useEffect(() => {
        if (!isPaused && articles.length > 0 && !loading) {
            autoScrollRef.current = window.setInterval(() => {
                setDirection(1);
                setIndex((prev) => (prev + 1) % articles.length);
            }, 6000);
        }

        return () => {
            if (autoScrollRef.current) {
                clearInterval(autoScrollRef.current);
            }
        };
    }, [isPaused, articles.length, loading]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadNews();
        setIndex(0);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const total = articles.length;

    const prev = () => {
        setDirection(-1);
        setIndex((i) => (i - 1 + total) % total);
        pauseAutoScroll();
    };

    const next = () => {
        setDirection(1);
        setIndex((i) => (i + 1) % total);
        pauseAutoScroll();
    };

    const goToIndex = (i: number) => {
        setDirection(i > index ? 1 : -1);
        setIndex(i);
        pauseAutoScroll();
    };

    const pauseAutoScroll = () => {
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 8000);
    };

    return (
        <div className="w-full">
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
                        className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-[340px] flex flex-col"
                    >
                        {/* Header - Fixed height (matches CalculatorHelpRail) */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{ rotate: isRefreshing ? 360 : 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md"
                                >
                                    <Newspaper className="text-white" size={22} />
                                </motion.div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        Business News
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Latest updates
                                    </p>
                                </div>
                            </div>

                            {/* Control buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleRefresh}
                                    disabled={loading || isRefreshing}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50 group"
                                    aria-label="Refresh news"
                                    title="Refresh news"
                                >
                                    <RotateCw
                                        size={18}
                                        className={`text-slate-500 group-hover:text-indigo-600 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                                    />
                                </button>
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-all group"
                                    aria-label="Hide news"
                                    title="Hide news panel"
                                >
                                    <EyeOff size={18} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                                </button>
                            </div>
                        </div>

                        {/* Main Content - Flexible, fills remaining space */}
                        <div className="flex-1 relative overflow-hidden px-4">
                            {/* Loading State */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center"
                                >
                                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={36} />
                                    <div className="space-y-2 w-full px-4">
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="h-3 bg-slate-200 rounded-full"
                                        />
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                            className="h-3 bg-slate-200 rounded-full w-4/5"
                                        />
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                            className="h-3 bg-slate-200 rounded-full w-3/5"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Carousel */}
                            {!loading && articles.length > 0 && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.a
                                            key={index}
                                            href={articles[index].url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            initial={{
                                                x: direction > 0 ? 200 : -200,
                                                opacity: 0,
                                                scale: 0.9
                                            }}
                                            animate={{
                                                x: 0,
                                                opacity: 1,
                                                scale: 1
                                            }}
                                            exit={{
                                                x: direction > 0 ? -200 : 200,
                                                opacity: 0,
                                                scale: 0.9
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 30,
                                                opacity: { duration: 0.2 }
                                            }}
                                            className="absolute inset-0 flex flex-col items-center justify-center p-5 text-slate-700 hover:text-indigo-600 transition-colors group"
                                        >
                                            <span className="text-base font-medium leading-relaxed text-center line-clamp-5">
                                                {articles[index].title}
                                            </span>
                                            <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span>Read more</span>
                                                <ExternalLink size={14} />
                                            </div>
                                        </motion.a>
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* No articles fallback */}
                            {!loading && articles.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center text-slate-500"
                                >
                                    <Newspaper className="mb-3 text-slate-400" size={36} />
                                    <p className="font-medium text-sm">No news available</p>
                                    <button
                                        onClick={handleRefresh}
                                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Try refreshing
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer - Fixed height with navigation (matches CalculatorHelpRail) */}
                        <div className="px-4 pb-4 pt-2">
                            {/* Navigation Controls */}
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    onClick={prev}
                                    disabled={loading || articles.length === 0}
                                    className="p-2 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group disabled:opacity-50"
                                    aria-label="Previous article"
                                >
                                    <ChevronLeft size={20} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                </button>

                                {/* Dot Indicators */}
                                <div className="flex gap-2">
                                    {(articles.length > 0 ? articles : Array(5).fill(null)).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => articles.length > 0 && goToIndex(i)}
                                            disabled={loading || articles.length === 0}
                                            className={`rounded-full transition-all ${i === index && articles.length > 0
                                                ? "w-7 h-2.5 bg-gradient-to-r from-indigo-600 to-purple-600"
                                                : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400"
                                                } disabled:opacity-50`}
                                            aria-label={`Go to article ${i + 1}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={next}
                                    disabled={loading || articles.length === 0}
                                    className="p-2 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group disabled:opacity-50"
                                    aria-label="Next article"
                                >
                                    <ChevronRight size={20} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                                <motion.div
                                    key={`progress-${index}`}
                                    initial={{ width: "0%" }}
                                    animate={{ width: loading ? "0%" : "100%" }}
                                    transition={{
                                        duration: isPaused || loading ? 0 : 6,
                                        ease: "linear"
                                    }}
                                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                                />
                            </div>

                            {/* Counter */}
                            <div className="text-center">
                                <span className="text-xs text-slate-400 font-medium">
                                    {articles.length > 0 ? `${index + 1} / ${total}` : "- / -"}
                                </span>
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
                        className="w-full flex items-center justify-center h-[340px]"
                    >
                        <motion.button
                            onClick={() => setIsVisible(true)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all"
                            aria-label="Show news"
                            title="Show news panel"
                        >
                            <Eye size={18} className="text-slate-500" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
