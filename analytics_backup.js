// analytics.js - TuneSwap Analytics Client (Extension Only)
// This file goes in the Chrome extension - no server code here!

class TuneSwapAnalytics {
    constructor() {
        console.log('[DEBUG] TuneSwapAnalytics initialized');
        // Use environment-specific endpoint
        this.endpoint = this.getAnalyticsEndpoint();
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.enabled = true;
        this.initializeUser();
    }

    // Get analytics endpoint based on environment
    getAnalyticsEndpoint() {
        // Production endpoint - will be your deployed backend
        return 'https://tuneswap-backend.vercel.app/analytics';
        
        // For development, you can switch to:
        // return 'http://localhost:3000/analytics';
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize or get existing user ID
    async initializeUser() {
        try {
            // Check if user has opted out of analytics
            const settings = await chrome.storage.sync.get(['analyticsEnabled', 'userId']);
            
            this.enabled = settings.analyticsEnabled !== false; // Default to enabled
            
            if (!this.enabled) {
                console.log('🔇 TuneSwap Analytics: Disabled by user preference');
                return;
            }

            if (settings.userId) {
                this.userId = settings.userId;
            } else {
                this.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                await chrome.storage.sync.set({ userId: this.userId });
            }
            
            console.log('📊 TuneSwap Analytics: Initialized for user', this.userId.substring(0, 12) + '...');
        } catch (error) {
            console.error('TuneSwap Analytics: Error initializing user:', error);
            this.enabled = false;
        }
    }

    // Check if analytics is enabled
    isEnabled() {
        return this.enabled && this.userId;
    }

    // Get user's basic info (anonymized)
    async getUserInfo() {
        if (!this.isEnabled()) return null;

        try {
            const settings = await chrome.storage.sync.get(['countryCode']);
            return {
                userId: this.userId,
                sessionId: this.sessionId,
                country: settings.countryCode || 'unknown',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
                extensionVersion: chrome.runtime.getManifest().version,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                userId: this.userId,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Track link conversion
    async trackConversion(conversionData) {
        console.log('[DEBUG] trackConversion called', conversionData);
        if (!this.isEnabled()) return;

        const data = {
            event: 'conversion',
            ...(await this.getUserInfo()),
            conversion: {
                spotifyUrl: this.anonymizeUrl(conversionData.spotifyUrl),
                spotifyType: conversionData.spotifyType,
                songTitle: conversionData.songTitle,
                artistName: conversionData.artistName,
                albumName: conversionData.albumName,
                appleMusicUrl: this.anonymizeUrl(conversionData.appleMusicUrl),
                sourceWebsite: this.getSourceWebsite(conversionData.sourceUrl),
                conversionMethod: conversionData.method,
                conversionTime: Date.now() - conversionData.startTime,
                success: conversionData.success
            }
        };
        
        await this.sendEvent(data);
    }

    // Track page visits where extension is active
    async trackPageVisit(pageData) {
        console.log('[DEBUG] trackPageVisit called', pageData);
        if (!this.isEnabled()) return;

        const data = {
            event: 'page_visit',
            ...(await this.getUserInfo()),
            page: {
                hostname: pageData.hostname,
                spotifyLinksFound: pageData.spotifyLinksCount,
                pageCategory: this.categorizeWebsite(pageData.hostname)
            }
        };
        
        await this.sendEvent(data);
    }

    // Track popup interactions
    async trackPopupAction(action, details = {}) {
        console.log('[DEBUG] trackPopupAction called', action, details);
        if (!this.isEnabled()) return;

        const data = {
            event: 'popup_action',
            ...(await this.getUserInfo()),
            popup: {
                action: action,
                details: details
            }
        };
        
        await this.sendEvent(data);
    }

    // Track settings changes
    async trackSettingsChange(settingName, oldValue, newValue) {
        console.log('[DEBUG] trackSettingsChange called', settingName, oldValue, newValue);
        if (!this.isEnabled()) return;

        const data = {
            event: 'settings_change',
            ...(await this.getUserInfo()),
            settings: {
                setting: settingName,
                oldValue: oldValue,
                newValue: newValue
            }
        };
        
        await this.sendEvent(data);
    }

    // Track errors
    async trackError(errorData) {
        console.log('[DEBUG] trackError called', errorData);
        if (!this.isEnabled()) return;

        const data = {
            event: 'error',
            ...(await this.getUserInfo()),
            error: {
                type: errorData.type,
                message: errorData.message,
                context: errorData.context,
                url: this.anonymizeUrl(errorData.url)
            }
        };
        
        await this.sendEvent(data);
    }

    // Helper: Anonymize URLs (remove personal identifiers)
    anonymizeUrl(url) {
        console.log('[DEBUG] anonymizeUrl called', url);
        if (!url) return null;
        
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
        } catch {
            return 'invalid_url';
        }
    }

    // Helper: Get source website
    getSourceWebsite(url) {
        console.log('[DEBUG] getSourceWebsite called', url);
        if (!url) return 'unknown';
        
        try {
            return new URL(url).hostname.toLowerCase();
        } catch {
            return 'unknown';
        }
    }

    // Helper: Categorize websites
    categorizeWebsite(hostname) {
        console.log('[DEBUG] categorizeWebsite called', hostname);
        const categories = {
            'twitter.com': 'social_media',
            'x.com': 'social_media',
            'facebook.com': 'social_media',
            'instagram.com': 'social_media',
            'reddit.com': 'social_media',
            'youtube.com': 'video',
            'tiktok.com': 'social_media',
            'discord.com': 'messaging',
            'spotify.com': 'music',
            'genius.com': 'music',
            'last.fm': 'music',
            'pitchfork.com': 'music_blog',
            'billboard.com': 'music_blog'
        };
        
        for (const [domain, category] of Object.entries(categories)) {
            if (hostname.includes(domain)) {
                return category;
            }
        }
        
        return 'other';
    }

    // Send event to analytics server
    async sendEvent(data) {
        console.log('[DEBUG] sendEvent called', data);
        try {
            // Store locally as backup first
            await this.storeLocally(data);
            
            // Try to send to server if online
            if (navigator.onLine) {
                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Extension-Version': chrome.runtime.getManifest().version
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    console.log('📊 TuneSwap Analytics: Event sent:', data.event);
                } else {
                    const text = await response.text();
                    console.warn('📊 TuneSwap Analytics: Server error:', response.status, text);
                }
            } else {
                console.log('📊 TuneSwap Analytics: Offline, stored locally:', data.event);
            }
        } catch (error) {
            console.warn('📊 TuneSwap Analytics: Error sending event:', error.message, error);
            // Data is still stored locally as backup
        }
    }

    // Store analytics data locally as backup
    async storeLocally(data) {
        try {
            const key = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const localData = {};
            localData[key] = { ...data, synced: false };
            
            await chrome.storage.local.set(localData);
            
            // Clean old data (keep only last 50 events)
            await this.cleanOldAnalyticsData();
        } catch (error) {
            console.error('📊 TuneSwap Analytics: Error storing locally:', error);
        }
    }

    // Clean old analytics data
    async cleanOldAnalyticsData() {
        try {
            const allData = await chrome.storage.local.get();
            const analyticsKeys = Object.keys(allData).filter(key => key.startsWith('analytics_'));
            
            if (analyticsKeys.length > 50) {
                // Sort by timestamp and remove oldest
                analyticsKeys.sort();
                const keysToRemove = analyticsKeys.slice(0, analyticsKeys.length - 50);
                
                for (const key of keysToRemove) {
                    await chrome.storage.local.remove(key);
                }
            }
        } catch (error) {
            console.error('📊 TuneSwap Analytics: Error cleaning old data:', error);
        }
    }

    // Enable/disable analytics
    async setEnabled(enabled) {
        this.enabled = enabled;
        await chrome.storage.sync.set({ analyticsEnabled: enabled });
        
        if (enabled) {
            console.log('📊 TuneSwap Analytics: Enabled');
            await this.trackSettingsChange('analytics', false, true);
        } else {
            console.log('🔇 TuneSwap Analytics: Disabled');
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TuneSwapAnalytics = TuneSwapAnalytics;
}