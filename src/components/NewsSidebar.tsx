// frontend/src/components/NewsSidebar.tsx
// Fixed left sidebar for business news - always visible on desktop

import React, { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, Loader2, ChevronRight } from 'lucide-react';
import { fetchIndianBusinessNews, NewsArticle, disableNewsPopup, hasUserDisabledNews } from '../services/newsService';
import './NewsSidebar.css';

interface NewsSidebarProps {
    className?: string;
}

const NewsSidebar: React.FC<NewsSidebarProps> = ({ className = '' }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isHidden, setIsHidden] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(hasUserDisabledNews());

    useEffect(() => {
        // Check if user has disabled news
        if (hasUserDisabledNews()) {
            setIsHidden(true);
            return;
        }

        const loadNews = async () => {
            setLoading(true);
            setError(null);

            try {
                const news = await fetchIndianBusinessNews();

                // Shuffle for variety
                const shuffled = [...news].sort(() => Math.random() - 0.5);

                // Show top 6 articles for sidebar
                setArticles(shuffled.slice(0, 6));
            } catch (err: any) {
                console.error('[NewsSidebar] Error loading news:', err);
                setError(err.message || 'Failed to load news');
            } finally {
                setLoading(false);
            }
        };

        loadNews();
    }, []);

    const handleDontShowAgainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setDontShowAgain(checked);

        if (checked) {
            disableNewsPopup();
            // Hide sidebar with animation
            setTimeout(() => setIsHidden(true), 300);
        }
    };

    // Strip HTML tags and decode entities
    const stripHtml = (html: string): string => {
        if (!html) return '';
        let text = html.replace(/<[^>]*>/g, '');
        const doc = new DOMParser().parseFromString(text, 'text/html');
        text = doc.documentElement.textContent || '';
        return text.trim();
    };

    // Format time ago
    const getTimeAgo = (dateStr: string): string => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHours < 1) return 'Just now';
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Yesterday';
            return `${diffDays}d ago`;
        } catch {
            return '';
        }
    };

    if (isHidden) return null;

    return (
        <aside className={`news-sidebar ${className}`}>
            {/* Header */}
            <div className="news-sidebar-header">
                <div className="news-sidebar-title">
                    <Newspaper className="news-sidebar-icon" />
                    <h3>Business News</h3>
                </div>
                <span className="news-sidebar-badge">Live</span>
            </div>

            {/* Content */}
            <div className="news-sidebar-content">
                {loading && (
                    <div className="news-sidebar-loading">
                        <Loader2 className="news-sidebar-spinner" />
                        <p>Loading news...</p>
                    </div>
                )}

                {error && (
                    <div className="news-sidebar-error">
                        <p>⚠️ {error}</p>
                    </div>
                )}

                {!loading && !error && articles.length === 0 && (
                    <div className="news-sidebar-empty">
                        <p>No news available</p>
                    </div>
                )}

                {!loading && !error && articles.length > 0 && (
                    <div className="news-sidebar-articles">
                        {articles.map((article, index) => (
                            <a
                                key={index}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-sidebar-card"
                            >
                                {article.urlToImage && (
                                    <div className="news-sidebar-image-wrapper">
                                        <img
                                            src={article.urlToImage}
                                            alt=""
                                            className="news-sidebar-image"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                <div className="news-sidebar-card-content">
                                    <h4 className="news-sidebar-card-title">{article.title}</h4>
                                    {article.description && (
                                        <p className="news-sidebar-card-desc">
                                            {stripHtml(article.description).slice(0, 80)}...
                                        </p>
                                    )}
                                    <div className="news-sidebar-card-meta">
                                        <span className="news-sidebar-source">{article.source.name}</span>
                                        <span className="news-sidebar-time">{getTimeAgo(article.publishedAt)}</span>
                                        <ExternalLink size={12} />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="news-sidebar-footer">
                <label className="news-sidebar-checkbox-label">
                    <input
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={handleDontShowAgainChange}
                        className="news-sidebar-checkbox"
                    />
                    <span>Don't show news</span>
                </label>
            </div>
        </aside>
    );
};

export default NewsSidebar;
