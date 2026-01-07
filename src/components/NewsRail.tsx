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
            }, 6000); // Change every 6 seconds
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
        <aside className="hidden xl:flex w-full flex-shrink-0 items-start justify-center">
            <div className="sticky top-24 w-full">
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
                            className="bg-white border-2 border-slate-200 rounded-3xl p-9 shadow-lg hover:shadow-xl transition-shadow duration-300 relative"
                        >
                            {/* Header with controls */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        animate={{ rotate: isRefreshing ? 360 : 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md"
                                    >
                                        <Newspaper className="text-white" size={28} />
                                    </motion.div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-xl">
                                            Business News
                                        </h3>
                                        <p className="text-base text-slate-500">
                                            Latest updates
                                        </p>
                                    </div>
                                </div>

                                {/* Control buttons */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleRefresh}
                                        disabled={loading || isRefreshing}
                                        className="p-3 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50 group"
                                        aria-label="Refresh news"
                                        title="Refresh news"
                                    >
                                        <RotateCw
                                            size={20}
                                            className={`text-slate-500 group-hover:text-indigo-600 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                                        />
                                    </button>
                                    <button
                                        onClick={() => setIsVisible(false)}
                                        className="p-3 rounded-lg hover:bg-slate-100 transition-all group"
                                        aria-label="Hide news"
                                        title="Hide news panel"
                                    >
                                        <EyeOff size={20} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                                    </button>
                                </div>
                            </div>

                            {/* Loading State */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="animate-spin text-indigo-600" size={36} />
                                    </div>
                                    <div className="space-y-2">
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="h-3 bg-slate-200 rounded-full"
                                        />
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                            className="h-3 bg-slate-200 rounded-full w-5/6"
                                        />
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                            className="h-3 bg-slate-200 rounded-full w-4/6"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Carousel */}
                            {!loading && articles.length > 0 && (
                                <>
                                    {/* Main content area */}
                                    <div className="relative h-96 mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-8">
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.a
                                                key={index}
                                                href={articles[index].url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                initial={{
                                                    x: direction > 0 ? 300 : -300,
                                                    opacity: 0,
                                                    scale: 0.9
                                                }}
                                                animate={{
                                                    x: 0,
                                                    opacity: 1,
                                                    scale: 1
                                                }}
                                                exit={{
                                                    x: direction > 0 ? -300 : 300,
                                                    opacity: 0,
                                                    scale: 0.9
                                                }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 300,
                                                    damping: 30,
                                                    opacity: { duration: 0.2 }
                                                }}
                                                className="absolute inset-0 flex items-center justify-center text-lg text-slate-700 hover:text-indigo-600 transition-colors group p-8"
                                            >
                                                <div className="relative">
                                                    <span className="line-clamp-6 leading-relaxed">
                                                        {articles[index].title}
                                                    </span>
                                                    <div className="mt-4 flex items-center gap-2 text-base text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span>Read more</span>
                                                        <ExternalLink size={18} />
                                                    </div>
                                                </div>
                                            </motion.a>
                                        </AnimatePresence>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center justify-between mb-6">
                                        <button
                                            onClick={prev}
                                            className="p-3.5 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group"
                                            aria-label="Previous article"
                                        >
                                            <ChevronLeft size={24} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                        </button>

                                        {/* Dots */}
                                        <div className="flex gap-3">
                                            {articles.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => goToIndex(i)}
                                                    aria-label={`Go to article ${i + 1}`}
                                                    className={`rounded-full transition-all ${i === index
                                                        ? "w-10 h-3.5 bg-gradient-to-r from-indigo-600 to-purple-600"
                                                        : "w-3.5 h-3.5 bg-slate-300 hover:bg-slate-400"
                                                        }`}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            onClick={next}
                                            className="p-3.5 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group"
                                            aria-label="Next article"
                                        >
                                            <ChevronRight size={24} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
                                        <motion.div
                                            key={`progress-${index}`}
                                            initial={{ width: "0%" }}
                                            animate={{ width: isPaused ? "100%" : "100%" }}
                                            transition={{
                                                duration: isPaused ? 0 : 6,
                                                ease: "linear"
                                            }}
                                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                                        />
                                    </div>

                                    {/* Counter */}
                                    <div className="text-center">
                                        <span className="text-base text-slate-400 font-medium">
                                            {index + 1} / {total}
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* No articles fallback */}
                            {!loading && articles.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12 text-sm text-slate-500"
                                >
                                    <Newspaper className="mx-auto mb-3 text-slate-400" size={36} />
                                    <p className="font-medium">No news available</p>
                                    <button
                                        onClick={handleRefresh}
                                        className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Try refreshing
                                    </button>
                                </motion.div>
                            )}
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
                                aria-label="Show news"
                                title="Show news panel"
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
