// frontend/src/components/NewsPopup.tsx
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Newspaper, Loader2 } from 'lucide-react';
import { fetchIndianBusinessNews, NewsArticle } from '../services/newsService';
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

    useEffect(() => {
        if (!isOpen) return;

        const loadNews = async () => {
            setLoading(true);
            setError(null);

            try {
                const news = await fetchIndianBusinessNews();
                setArticles(news);
            } catch (err: any) {
                console.error('[NewsPopup] Error loading news:', err);
                setError(err.message || 'Failed to load news');
            } finally {
                setLoading(false);
            }
        };

        loadNews();
    }, [isOpen]);

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
                    <button
                        className="news-popup-close"
                        onClick={onClose}
                        aria-label="Close news"
                    >
                        <X size={24} />
                    </button>
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
                                            <p className="news-description">{article.description}</p>
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

                {/* Blinking "View Results" Button (appears when results are ready) */}
                {resultsReady && (
                    <div className="news-popup-footer">
                        <button
                            className="view-results-btn"
                            onClick={handleViewResults}
                        >
                            🎯 View Your Results
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsPopup;
