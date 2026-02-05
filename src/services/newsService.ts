// frontend/src/services/newsService.ts
import { API_BASE_URL } from '../config/api';

export interface NewsArticle {
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    source: {
        id: string | null;
        name: string;
    };
}

interface NewsCache {
    data: NewsArticle[];
    timestamp: number;
    expiresAt: number;
}

const NEWS_CACHE_KEY = 'indianBusinessNewsCache';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch Indian business news from NewsAPI
 * Uses 10-minute cache to optimize API usage (100 req/day limit)
 */
export const fetchIndianBusinessNews = async (): Promise<NewsArticle[]> => {
    try {
        // Check cache first
        const cached = localStorage.getItem(NEWS_CACHE_KEY);
        if (cached) {
            const parsedCache: NewsCache = JSON.parse(cached);
            const now = Date.now();

            // Return cached data if still valid
            if (now < parsedCache.expiresAt) {
                console.log('[News Service] Using cached news (age:', Math.round((now - parsedCache.timestamp) / 1000), 'seconds)');
                return parsedCache.data;
            }
        }

        // Fetch fresh news from backend proxy (bypasses CORS)
        // Use centralized API configuration
        console.log('[News Service] Fetching fresh Indian business news from backend proxy...');

        const response = await fetch(`${API_BASE_URL}/api/news/business`);


        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('API rate limit reached. Please try again later.');
            }
            throw new Error(`News API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error(data.message || 'Failed to fetch news');
        }

        const articles: NewsArticle[] = data.articles || [];

        // Cache the results
        const now = Date.now();
        const cacheData: NewsCache = {
            data: articles,
            timestamp: now,
            expiresAt: now + CACHE_DURATION_MS,
        };
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cacheData));

        console.log('[News Service] Fetched and cached', articles.length, 'articles');
        return articles;

    } catch (error) {
        console.error('[News Service] Error fetching news:', error);
        throw error;
    }
};

/**
 * Get calculator usage count from localStorage
 */
export const getCalculatorUsageCount = (): number => {
    const count = localStorage.getItem('freightCalculatorUsageCount');
    return count ? parseInt(count, 10) : 0;
};

/**
 * Increment calculator usage count
 */
export const incrementCalculatorUsageCount = (): number => {
    const currentCount = getCalculatorUsageCount();
    const newCount = currentCount + 1;
    localStorage.setItem('freightCalculatorUsageCount', newCount.toString());
    console.log('[News Service] Calculator usage count:', newCount);
    return newCount;
};

/**
 * Check if user has disabled news popup
 */
export const hasUserDisabledNews = (): boolean => {
    return localStorage.getItem('newsPopupDisabled') === 'true';
};

/**
 * Disable news popup permanently (user choice)
 */
export const disableNewsPopup = (): void => {
    localStorage.setItem('newsPopupDisabled', 'true');
    console.log('[News Service] User disabled news popup');
};

/**
 * Re-enable news popup (for testing or user preference reset)
 */
export const enableNewsPopup = (): void => {
    localStorage.removeItem('newsPopupDisabled');
    console.log('[News Service] User enabled news popup');
};

/**
 * Check if user should see news popup
 * Returns false if user clicked "Don't show again"
 * Otherwise always returns true (Google RSS has no limits)
 */
export const shouldShowNewsPopup = (): boolean => {
    // Respect user's choice if they disabled it
    if (hasUserDisabledNews()) {
        return false;
    }

    // Google News RSS has unlimited requests, so no counter limit needed
    // News shows every time UNLESS user explicitly disables it
    return true;
};

/**
 * One-time migration: Clean up old localStorage states from counter-based implementation
 * This ensures users who tested with the old 5/30-limit code don't have stale data
 * Auto-runs on module load
 */
const migrateNewsStorage = (): void => {
    const CURRENT_VERSION = '2.0';
    const versionKey = 'newsStorageVersion';
    const storedVersion = localStorage.getItem(versionKey);

    if (storedVersion !== CURRENT_VERSION) {
        console.log(`[News Migration] Upgrading storage from v${storedVersion || '1.0'} to v${CURRENT_VERSION}`);

        // Migration from v1.0 (counter-based) to v2.0 (user-choice based)
        // We keep the usage counter for analytics but don't use it for limiting
        // We ONLY clear the disabled flag if this is an automatic migration
        // (Users who manually check "Don't show again" in v2.0 will have their preference respected)

        // Clear old disabled state from v1.0 counter limits
        // New v2.0 logic: only disabled if user explicitly checks the box
        const currentDisabled = localStorage.getItem('newsPopupDisabled');
        if (currentDisabled === 'true' && !storedVersion) {
            // This was likely set automatically by old counter logic, not user choice
            console.log('[News Migration] Removing auto-set disabled flag from v1.0');
            localStorage.removeItem('newsPopupDisabled');
        }

        // Mark migration complete
        localStorage.setItem(versionKey, CURRENT_VERSION);
        console.log('[News Migration] ✅ Migration complete');
    }
};

// Auto-run migration when this module loads
try {
    migrateNewsStorage();
} catch (error) {
    console.warn('[News Migration] Migration failed:', error);
}
