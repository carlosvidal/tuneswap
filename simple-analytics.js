// simple-analytics.js - Local analytics for TuneSwap
class SimpleAnalytics {
    constructor() {
        console.log('📊 SimpleAnalytics initialized');
        this.enabled = true;
    }

    // Track conversion event
    async trackConversion(data) {
        if (!this.enabled) return;
        
        try {
            console.log('📊 Tracking conversion:', data);
            
            // Get current stats
            const stats = await chrome.storage.local.get([
                'totalConversions',
                'todayConversions', 
                'lastConversionDate',
                'conversionsByType',
                'conversionsByCountry'
            ]);
            
            const today = new Date().toDateString();
            const isToday = stats.lastConversionDate === today;
            
            // Update basic stats
            const newStats = {
                totalConversions: (stats.totalConversions || 0) + 1,
                todayConversions: isToday ? (stats.todayConversions || 0) + 1 : 1,
                lastConversionDate: today,
                lastConversion: new Date().toISOString()
            };
            
            // Track by content type
            const typeStats = stats.conversionsByType || {};
            const contentType = data.spotifyType || 'unknown';
            typeStats[contentType] = (typeStats[contentType] || 0) + 1;
            newStats.conversionsByType = typeStats;
            
            // Track by country
            const countryStats = stats.conversionsByCountry || {};
            const country = data.countryCode || 'unknown';
            countryStats[country] = (countryStats[country] || 0) + 1;
            newStats.conversionsByCountry = countryStats;
            
            // Track conversion success
            if (data.isExactMatch) {
                newStats.exactMatches = (stats.exactMatches || 0) + 1;
            }
            
            // Store updated stats
            await chrome.storage.local.set(newStats);
            
            console.log('📊 Analytics updated:', newStats);
            
        } catch (error) {
            console.warn('📊 Analytics error:', error);
        }
    }

    // Track page visit
    async trackPageVisit(data) {
        if (!this.enabled) return;
        
        try {
            const visits = await chrome.storage.local.get(['pageVisits']);
            const today = new Date().toDateString();
            const todayVisits = visits.pageVisits?.[today] || 0;
            
            const newVisits = {
                ...visits.pageVisits,
                [today]: todayVisits + 1
            };
            
            await chrome.storage.local.set({ pageVisits: newVisits });
            
        } catch (error) {
            console.warn('📊 Page visit tracking error:', error);
        }
    }

    // Get analytics summary
    async getAnalyticsSummary() {
        try {
            const data = await chrome.storage.local.get();
            
            return {
                totalConversions: data.totalConversions || 0,
                todayConversions: data.todayConversions || 0,
                exactMatches: data.exactMatches || 0,
                conversionsByType: data.conversionsByType || {},
                conversionsByCountry: data.conversionsByCountry || {},
                lastConversion: data.lastConversion
            };
            
        } catch (error) {
            console.error('📊 Error getting analytics:', error);
            return null;
        }
    }

    // Enable/disable analytics
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('📊 Analytics', enabled ? 'enabled' : 'disabled');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SimpleAnalytics = SimpleAnalytics;
}