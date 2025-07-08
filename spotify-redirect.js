// spotify-redirect.js - Enhanced version with exact Apple Music URLs
(function() {
    'use strict';
    
    console.log('🎵 TuneSwap: Enhanced redirect loaded on Spotify page');

    // Initialize analytics
    let analytics;
    if (typeof SimpleAnalytics !== 'undefined') {
        analytics = new SimpleAnalytics();
        console.log('📊 Analytics initialized');
    } else {
        console.warn('📊 SimpleAnalytics not available');
    }

    // Check if extension is enabled
    async function isExtensionEnabled() {
        try {
            const settings = await chrome.storage.sync.get(['enabled']);
            return settings.enabled !== false;
        } catch (error) {
            return true;
        }
    }

    // Get user's country code
    async function getCountryCode() {
        try {
            const settings = await chrome.storage.sync.get(['countryCode']);
            if (settings.countryCode) {
                return settings.countryCode;
            }
        } catch (error) {
            console.warn('⚠️ TuneSwap: Could not access settings');
        }
        
        const language = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (timezone.includes('Lima') || language.startsWith('es')) {
            return 'pe';
        }
        
        return 'us';
    }

    // Extract Spotify info from current URL
    function extractSpotifyInfo() {
        const url = window.location.href;
        const patterns = {
            track: /spotify\.com\/track\/([a-zA-Z0-9]+)/,
            album: /spotify\.com\/album\/([a-zA-Z0-9]+)/,
            artist: /spotify\.com\/artist\/([a-zA-Z0-9]+)/,
            playlist: /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = url.match(pattern);
            if (match) {
                return {
                    type,
                    id: match[1],
                    originalUrl: url
                };
            }
        }
        return null;
    }

    // Enhanced metadata extraction from Spotify page
    async function getEnhancedMetadata() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 15;
            
            const extractMetadata = () => {
                attempts++;
                
                // Method 1: Extract from page DOM
                const metadata = extractFromDOM();
                if (metadata.title) {
                    console.log('✅ TuneSwap: Extracted from DOM:', metadata);
                    resolve(metadata);
                    return;
                }
                
                // Method 2: Extract from JSON-LD structured data
                const structuredData = extractFromStructuredData();
                if (structuredData.title) {
                    console.log('✅ TuneSwap: Extracted from structured data:', structuredData);
                    resolve(structuredData);
                    return;
                }
                
                // Method 3: Extract from meta tags
                const metaData = extractFromMeta();
                if (metaData.title) {
                    console.log('✅ TuneSwap: Extracted from meta:', metaData);
                    resolve(metaData);
                    return;
                }
                
                // Method 4: Extract from page title as fallback
                const titleData = extractFromTitle();
                if (titleData.title) {
                    console.log('✅ TuneSwap: Extracted from title:', titleData);
                    resolve(titleData);
                    return;
                }
                
                if (attempts < maxAttempts) {
                    setTimeout(extractMetadata, 300);
                } else {
                    console.warn('⚠️ TuneSwap: Could not extract metadata after', maxAttempts, 'attempts');
                    resolve({ title: '', artist: '', album: '', isrc: '', duration: 0 });
                }
            };

            extractMetadata();
        });
    }

    // Extract metadata from DOM elements
    function extractFromDOM() {
        const selectors = [
            '[data-testid="entityTitle"]',
            '[data-testid="track-title"]', 
            'h1[data-encore-id="text"]',
            'h1',
            '[class*="Title"]',
            '[class*="title"]'
        ];
        
        let title = '';
        let artist = '';
        let album = '';
        
        // Extract title
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                title = element.textContent.trim();
                break;
            }
        }
        
        // Extract artist
        const artistSelectors = [
            '[data-testid="creator"]',
            '[data-testid="track-artist"]',
            'a[href*="/artist/"]',
            '[class*="Artist"]',
            '[class*="artist"]'
        ];
        
        for (const selector of artistSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                artist = element.textContent.trim();
                break;
            }
        }
        
        // Extract album
        const albumSelectors = [
            '[data-testid="album-link"]',
            'a[href*="/album/"]',
            '[class*="Album"]'
        ];
        
        for (const selector of albumSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                album = element.textContent.trim();
                break;
            }
        }
        
        return { title, artist, album, isrc: '', duration: 0 };
    }

    // Extract from JSON-LD structured data
    function extractFromStructuredData() {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);
                
                if (data['@type'] === 'MusicRecording' || data.name) {
                    return {
                        title: data.name || '',
                        artist: data.byArtist?.name || data.author?.name || '',
                        album: data.inAlbum?.name || '',
                        isrc: data.isrc || '',
                        duration: data.duration || 0
                    };
                }
            } catch (error) {
                // Continue to next script
            }
        }
        
        return { title: '', artist: '', album: '', isrc: '', duration: 0 };
    }

    // Extract from meta tags
    function extractFromMeta() {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        
        let title = '';
        let artist = '';
        let album = '';
        
        if (ogTitle && ogTitle.content !== 'Spotify') {
            title = ogTitle.content;
        } else if (twitterTitle && twitterTitle.content !== 'Spotify') {
            title = twitterTitle.content;
        }
        
        if (ogDescription && ogDescription.content) {
            const descMatch = ogDescription.content.match(/by\s+(.+)/i);
            if (descMatch) {
                artist = descMatch[1];
            }
        }
        
        return { title, artist, album, isrc: '', duration: 0 };
    }

    // Extract from page title
    function extractFromTitle() {
        const title = document.title.replace(' | Spotify', '');
        if (title && title !== 'Spotify' && title !== 'Loading...') {
            const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
            if (byMatch) {
                return {
                    title: byMatch[1].trim(),
                    artist: byMatch[2].trim(),
                    album: '',
                    isrc: '',
                    duration: 0
                };
            } else {
                return {
                    title: title,
                    artist: '',
                    album: '',
                    isrc: '',
                    duration: 0
                };
            }
        }
        
        return { title: '', artist: '', album: '', isrc: '', duration: 0 };
    }

    // Search Apple Music for exact match using iTunes API
    async function findExactAppleMusicUrl(metadata, spotifyInfo, countryCode) {
        try {
            console.log('🔍 TuneSwap: Searching for exact Apple Music URL');
            
            const cleanTitle = cleanSongTitle(metadata.title);
            const cleanArtist = metadata.artist.replace(/,.*$/, '').trim();
            
            let searchQuery = '';
            let searchType = '';
            
            switch(spotifyInfo.type) {
                case 'track':
                    searchQuery = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
                    searchType = 'song';
                    break;
                case 'album':
                    searchQuery = cleanArtist ? `${cleanArtist} ${metadata.title}` : metadata.title;
                    searchType = 'album';
                    break;
                case 'artist':
                    searchQuery = metadata.artist || metadata.title;
                    searchType = 'artist';
                    break;
                default:
                    searchQuery = cleanTitle;
                    searchType = 'song';
            }
            
            if (!searchQuery || searchQuery.length < 2) {
                throw new Error('No search query available');
            }
            
            console.log(`🎯 TuneSwap: Searching Apple Music for "${searchQuery}" (${searchType})`);
            
            const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&country=${countryCode}&media=music&entity=${searchType}&limit=10`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`iTunes API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('🍎 TuneSwap: iTunes API results:', data);
            
            if (data.results && data.results.length > 0) {
                const bestMatch = findBestMatch(data.results, metadata, spotifyInfo.type);
                
                if (bestMatch) {
                    const appleMusicUrl = convertToAppleMusicUrl(bestMatch, countryCode);
                    console.log('✅ TuneSwap: Found exact match:', appleMusicUrl);
                    return appleMusicUrl;
                }
            }
            
            throw new Error('No suitable matches found');
            
        } catch (error) {
            console.warn('⚠️ TuneSwap: Could not find exact URL:', error.message);
            return null;
        }
    }

    // Find best match from iTunes results
    function findBestMatch(results, metadata, contentType) {
        console.log('🎯 TuneSwap: Finding best match from', results.length, 'results');
        
        for (const result of results) {
            const score = calculateMatchScore(result, metadata, contentType);
            console.log(`📊 TuneSwap: Match score for "${result.trackName || result.collectionName || result.artistName}": ${score}`);
            
            if (score >= 0.8) {
                return result;
            }
        }
        
        return results[0];
    }

    // Calculate match score between iTunes result and Spotify metadata
    function calculateMatchScore(result, metadata, contentType) {
        let score = 0;
        let maxScore = 0;
        
        if (metadata.title) {
            maxScore += 0.5;
            const titleMatch = calculateStringSimilarity(
                cleanSongTitle(metadata.title),
                result.trackName || result.collectionName || ''
            );
            score += titleMatch * 0.5;
        }
        
        if (metadata.artist) {
            maxScore += 0.3;
            const artistMatch = calculateStringSimilarity(
                metadata.artist.split(',')[0].trim(),
                result.artistName || ''
            );
            score += artistMatch * 0.3;
        }
        
        if (metadata.album && contentType === 'track') {
            maxScore += 0.2;
            const albumMatch = calculateStringSimilarity(
                metadata.album,
                result.collectionName || ''
            );
            score += albumMatch * 0.2;
        }
        
        return maxScore > 0 ? score / maxScore : 0;
    }

    // Calculate string similarity
    function calculateStringSimilarity(str1, str2) {
        const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        if (s1 === s2) return 1;
        if (!s1 || !s2) return 0;
        
        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);
        
        let commonWords = 0;
        for (const word1 of words1) {
            if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
                commonWords++;
            }
        }
        
        return commonWords / Math.max(words1.length, words2.length);
    }

    // Convert iTunes URL to Apple Music URL
    function convertToAppleMusicUrl(itunesResult, countryCode) {
        const baseUrl = `https://music.apple.com/${countryCode}`;
        
        if (itunesResult.wrapperType === 'track' || itunesResult.kind === 'song') {
            const albumId = itunesResult.collectionId;
            const trackId = itunesResult.trackId;
            const albumName = itunesResult.collectionName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            return `${baseUrl}/album/${albumName}/${albumId}?i=${trackId}`;
        } else if (itunesResult.wrapperType === 'collection' || itunesResult.collectionType) {
            const albumId = itunesResult.collectionId;
            const albumName = itunesResult.collectionName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            return `${baseUrl}/album/${albumName}/${albumId}`;
        } else if (itunesResult.wrapperType === 'artist') {
            const artistId = itunesResult.artistId;
            const artistName = itunesResult.artistName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            return `${baseUrl}/artist/${artistName}/${artistId}`;
        }
        
        const searchTerm = itunesResult.trackName || itunesResult.collectionName || itunesResult.artistName;
        return `${baseUrl}/search?term=${encodeURIComponent(searchTerm)}`;
    }

    // Clean song title for better matching
    function cleanSongTitle(title) {
        return title
            .replace(/\s*[\(\[].*?[\)\]]/g, '')
            .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '')
            .replace(/\s*-\s*(remix|version|edit|mix|instrumental|acoustic|live|radio|explicit|clean|remaster|deluxe).*$/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Create Apple Music URL (with fallback to search)
    async function createAppleMusicUrl(metadata, spotifyInfo) {
        const countryCode = await getCountryCode();
        
        const exactUrl = await findExactAppleMusicUrl(metadata, spotifyInfo, countryCode);
        if (exactUrl) {
            return exactUrl;
        }
        
        console.log('🔍 TuneSwap: Using search fallback');
        return createSearchUrl(metadata, spotifyInfo, countryCode);
    }

    // Create search URL as fallback
    function createSearchUrl(metadata, spotifyInfo, countryCode) {
        let searchQuery = '';
        
        switch(spotifyInfo.type) {
            case 'track':
                if (metadata.title) {
                    const cleanTitle = cleanSongTitle(metadata.title);
                    searchQuery = cleanTitle;
                    
                    if ((cleanTitle.length < 8 || /\b(love|song|music|dance|party)\b/i.test(cleanTitle)) && metadata.artist) {
                        searchQuery = `${metadata.artist} ${cleanTitle}`.trim();
                    }
                }
                break;
            case 'album':
                searchQuery = metadata.title;
                if (metadata.artist && searchQuery.length < 20) {
                    searchQuery = `${metadata.artist} ${searchQuery}`.trim();
                }
                break;
            case 'artist':
                searchQuery = metadata.title || metadata.artist;
                break;
            case 'playlist':
                searchQuery = metadata.title;
                break;
        }

        if (!searchQuery || searchQuery.length < 2) {
            return `https://music.apple.com/${countryCode}/search`;
        }

        searchQuery = searchQuery.replace(/\s+/g, ' ').trim();
        return `https://music.apple.com/${countryCode}/search?term=${encodeURIComponent(searchQuery)}`;
    }

    // Show enhanced conversion notice
    function showConversionNotice(appleMusicUrl, metadata, isExactMatch) {
        const existingNotice = document.getElementById('tuneswap-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        const notice = document.createElement('div');
        notice.id = 'tuneswap-notice';
        
        const songInfo = metadata.title ? 
            `"${metadata.title}"${metadata.artist ? ` by ${metadata.artist}` : ''}` : 
            'this content';
        
        const matchType = isExactMatch ? 
            '🎯 Found exact match' : 
            '🔍 Opening search results';
            
        notice.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1DB954, #1ed760);
                color: white;
                padding: 16px;
                text-align: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                animation: slideDown 0.3s ease-out;
            ">
                <div style="margin-bottom: 4px; font-size: 12px; opacity: 0.9;">
                    ${matchType}
                </div>
                <div style="margin-bottom: 8px;">
                    🎵 Opening ${songInfo} in Apple Music...
                </div>
                <div>
                    <button id="tuneswap-go" style="
                        margin-right: 12px;
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.9);
                        border: none;
                        border-radius: 20px;
                        color: #1DB954;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">Open Now</button>
                    <button id="tuneswap-stay" style="
                        padding: 8px 16px;
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.4);
                        border-radius: 20px;
                        color: white;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">Stay on Spotify</button>
                </div>
                <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
                    Auto-redirecting in <span id="countdown">${isExactMatch ? 4 : 3}</span> seconds
                </div>
            </div>
            <style>
                @keyframes slideDown {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(0); }
                }
                #tuneswap-go:hover {
                    background: white !important;
                    transform: scale(1.05);
                }
                #tuneswap-stay:hover {
                    background: rgba(255,255,255,0.1) !important;
                }
            </style>
        `;
        
        document.body.appendChild(notice);

        let countdown = isExactMatch ? 4 : 3;
        const countdownEl = document.getElementById('countdown');
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        const redirectToAppleMusic = () => {
            clearInterval(countdownInterval);
            window.location.href = appleMusicUrl;
        };
        
        const cancelRedirect = () => {
            clearInterval(countdownInterval);
            notice.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => notice.remove(), 300);
        };

        document.getElementById('tuneswap-go')?.addEventListener('click', redirectToAppleMusic);
        document.getElementById('tuneswap-stay')?.addEventListener('click', cancelRedirect);

        setTimeout(() => {
            if (document.getElementById('tuneswap-notice')) {
                redirectToAppleMusic();
            }
        }, countdown * 1000);
    }

    // Main conversion function
    async function performConversion() {
        try {
            console.log('🔄 TuneSwap: Starting enhanced conversion from Spotify page');
            
            if (!(await isExtensionEnabled())) {
                console.log('⏸️ TuneSwap: Extension disabled');
                return;
            }

            const spotifyInfo = extractSpotifyInfo();
            if (!spotifyInfo) {
                console.log('⚠️ TuneSwap: Could not extract Spotify info from URL');
                return;
            }

            console.log('📝 TuneSwap: Extracted info:', spotifyInfo);

            const metadata = await getEnhancedMetadata();
            console.log('🎵 TuneSwap: Enhanced metadata:', metadata);

            const appleMusicUrl = await createAppleMusicUrl(metadata, spotifyInfo);
            const isExactMatch = !appleMusicUrl.includes('/search?term=');
            
            console.log(`🍎 TuneSwap: ${isExactMatch ? 'Exact' : 'Search'} URL:`, appleMusicUrl);

            try {
                chrome.runtime.sendMessage({ action: 'updateStats' });
            } catch (error) {
                console.warn('⚠️ TuneSwap: Could not update stats');
            }

            // Track conversion with analytics
            if (analytics) {
                try {
                    const countryCode = await getCountryCode();
                    analytics.trackConversion({
                        spotifyType: spotifyInfo.type,
                        songTitle: metadata.title,
                        artistName: metadata.artist,
                        albumName: metadata.album,
                        countryCode: countryCode,
                        isExactMatch: isExactMatch,
                        appleMusicUrl: appleMusicUrl,
                        spotifyUrl: spotifyInfo.originalUrl
                    });
                    console.log('📊 Analytics tracked successfully');
                } catch (analyticsError) {
                    console.warn('📊 Analytics tracking failed:', analyticsError);
                }
            }

            showConversionNotice(appleMusicUrl, metadata, isExactMatch);

        } catch (error) {
            console.error('❌ TuneSwap: Error in conversion:', error);
        }
    }

    // Check if we should skip conversion
    async function shouldSkipConversion() {
        if (!(await isExtensionEnabled())) {
            return true;
        }

        if (window.self !== window.top) {
            return true;
        }

        const spotifyInfo = extractSpotifyInfo();
        if (!spotifyInfo) {
            return true;
        }

        return false;
    }

    // Initialize the conversion process
    async function initialize() {
        if (await shouldSkipConversion()) {
            console.log('⏭️ TuneSwap: Skipping conversion');
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(performConversion, 2000);
            });
        } else {
            setTimeout(performConversion, 2000);
        }
    }

    // Handle navigation changes
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(async () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('🔄 TuneSwap: URL changed, checking for conversion');
            
            if (!(await shouldSkipConversion())) {
                setTimeout(performConversion, 2500);
            }
        }
    }, 1000);

    window.addEventListener('beforeunload', () => {
        clearInterval(urlCheckInterval);
    });

    initialize();

    console.log('✅ TuneSwap: Enhanced Spotify redirect script configured');
})();