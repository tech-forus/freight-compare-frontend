// frontend/src/components/NewsPopup.tsx
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Newspaper, Loader2 } from 'lucide-react';
import { fetchIndianBusinessNews, NewsArticle, disableNewsPopup } from '../services/newsService';
import './NewsPopup.css';

interface NewsPopupProps {
    isOpen: boolean;
    onClose: () => void;
    resultsReady: boolean;
}

const NewsPopup: React.FC<NewsPopupProps> = ({ isOpen, onClose, resultsReady }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loadNews = async () => {
            setLoading(true);
            setError(null);

            try {
                const news = await fetchIndianBusinessNews();

                // 🎲 Randomize articles so users see different news each time
                // Even though backend caches for 30min, we shuffle for variety
                const shuffled = [...news].sort(() => Math.random() - 0.5);

                // Show top 5 random articles (not all 10 - keeps popup compact)
                setArticles(shuffled.slice(0, 5));
            } catch (err: any) {
                console.error('[NewsPopup] Error loading news:', err);
                setError(err.message || 'Failed to load news');
            } finally {
                setLoading(false);
            }
        };

        loadNews();
    }, [isOpen]);

    const handleDontShowAgainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setDontShowAgain(checked);

        if (checked) {
            disableNewsPopup();
            console.log('[NewsPopup] User opted to never show news again');
        }
    };

    // Helper to strip HTML tags AND decode HTML entities from text
    // (Google RSS descriptions contain raw HTML with entities like &nbsp;)
    const stripHtml = (html: string): string => {
        if (!html) return '';

        // First remove all HTML tags
        let text = html.replace(/<[^>]*>/g, '');

        // Decode HTML entities using browser's DOMParser
        const doc = new DOMParser().parseFromString(text, 'text/html');
        text = doc.documentElement.textContent || '';

        return text.trim();
    };

    if (!isOpen) return null;

    const handleViewResults = () => {
        onClose();
        // Scroll to results after popup closes
        setTimeout(() => {
            document.getElementById('results')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 100);
    };

    return (
        <div className="news-popup-overlay" onClick={onClose}>
            <div
                className="news-popup-container"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="news-popup-header">
                    <div className="news-popup-title">
                        <Newspaper className="news-icon" />
                        <h2>Latest Indian Business News</h2>
                    </div>
                    <div className="news-popup-header-actions">
                        <button
                            className="view-results-btn-small"
                            onClick={handleViewResults}
                            title="View your freight results"
                        >
                            View Results →
                        </button>
                        <button
                            className="news-popup-close"
                            onClick={onClose}
                            aria-label="Close news"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="news-popup-content">
                    {loading && (
                        <div className="news-loading">
                            <Loader2 className="spinner" size={40} />
                            <p>Loading latest news...</p>
                        </div>
                    )}

                    {error && (
                        <div className="news-error">
                            <p>⚠️ {error}</p>
                            <p className="news-error-hint">
                                Stay updated while we fetch your freight quotes!
                            </p>
                        </div>
                    )}

                    {!loading && !error && articles.length === 0 && (
                        <div className="news-empty">
                            <p>No news available at the moment.</p>
                        </div>
                    )}

                    {!loading && !error && articles.length > 0 && (
                        <div className="news-articles">
                            {articles.map((article, index) => (
                                <a
                                    key={index}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="news-card"
                                >
                                    {article.urlToImage && (
                                        <div className="news-image-wrapper">
                                            <img
                                                src={article.urlToImage}
                                                alt={article.title}
                                                className="news-image"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="news-content">
                                        <h3 className="news-title">{article.title}</h3>
                                        {article.description && (
                                            <p className="news-description">{stripHtml(article.description)}</p>
                                        )}
                                        <div className="news-meta">
                                            <span className="news-source">{article.source.name}</span>
                                            <ExternalLink size={14} />
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with "Don't show again" option */}
                <div className="news-popup-footer">
                    {/* "Don't show again" checkbox (always visible) */}
                    <label className="dont-show-again-label">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={handleDontShowAgainChange}
                            className="dont-show-again-checkbox"
                        />
                        <span>Don't show news again</span>
                    </label>

                    {/* Blinking "View Results" Button (appears when results are ready) */}
                    {resultsReady && (
                        <button
                            className="view-results-btn"
                            onClick={handleViewResults}
                        >
                            🎯 View Your Results
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsPopup;
