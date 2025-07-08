// content.js - TuneSwap Content Script
(function() {
    'use strict';
    
    console.log('🎵 TuneSwap extension loaded');

    // Initialize analytics
    let analytics;
    if (typeof TuneSwapAnalytics !== 'undefined') {
        analytics = new TuneSwapAnalytics();
    }

    // Function to extract information from a Spotify link
    function extractSpotifyInfo(url) {
        try {
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
        } catch (error) {
            console.error('❌ TuneSwap: Error extracting Spotify info:', error);
            return null;
        }
    }

    // Alternative function to get metadata using oembed
    async function getSpotifyMetadataOembed(type, id) {
        try {
            console.log(`🔍 TuneSwap: Trying oembed for ${type}:${id}`);
            
            const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/${type}/${id}`;
            console.log('📡 TuneSwap: Oembed URL:', oembedUrl);
            
            const response = await fetch(oembedUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📄 TuneSwap: Oembed data:', data);
            
            if (data.title) {
                let title = '';
                let artist = '';
                
                // Typical format is "Song by Artist" in oembed
                const byMatch = data.title.match(/^(.+?)\s+by\s+(.+)$/i);
                if (byMatch) {
                    title = byMatch[1].trim();
                    artist = byMatch[2].trim();
                } else {
                    title = data.title;
                }
                
                return {
                    title,
                    artist,
                    album: '',
                    type
                };
            }
            
            return null;
            
        } catch (error) {
            console.warn('⚠️ TuneSwap: Oembed failed:', error);
            return null;
        }
    }

    // Main metadata extraction function with multiple methods
    async function getSpotifyMetadata(type, id) {
        console.log(`🔍 TuneSwap: Starting metadata extraction for ${type}:${id}`);
        
        // Method 1: Try oembed first (more reliable)
        let metadata = await getSpotifyMetadataOembed(type, id);
        if (metadata && metadata.title) {
            console.log('✅ TuneSwap: Metadata obtained via oembed:', metadata);
            return metadata;
        }
        
        // Method 2: Fallback to embed HTML scraping
        metadata = await getSpotifyMetadataEmbed(type, id);
        if (metadata && metadata.title) {
            console.log('✅ TuneSwap: Metadata obtained via embed:', metadata);
            return metadata;
        }
        
        // Method 3: Last resort - use ID as title
        console.warn('⚠️ TuneSwap: Could not get metadata, using ID as title');
        return {
            title: `track_${id}`,
            artist: '',
            album: '',
            type
        };
    }

    // Function to get metadata via embed (renamed from previous method)
    async function getSpotifyMetadataEmbed(type, id) {
        try {
            console.log(`🔍 TuneSwap: Getting metadata for ${type}:${id}`);
            
            // Build correct URL
            const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
            console.log('📡 TuneSwap: Fetching URL:', embedUrl);
            
            const response = await fetch(embedUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const html = await response.text();
            console.log('📄 TuneSwap: HTML length:', html.length);
            
            // Method 1: Extract from page title
            let title = '';
            let artist = '';
            let album = '';
            
            // Debug: show part of HTML
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            console.log('🔍 TuneSwap: Title match:', titleMatch);
            
            if (titleMatch) {
                const fullTitle = titleMatch[1].replace(' | Spotify', '');
                console.log('📝 TuneSwap: Full title from HTML:', fullTitle);
                
                // Try different title formats
                // Format 1: "Song by Artist"
                const byMatch = fullTitle.match(/^(.+?)\s+by\s+(.+)$/i);
                if (byMatch) {
                    title = byMatch[1].trim();
                    artist = byMatch[2].trim();
                    console.log('✅ TuneSwap: Parsed "by" format - Title:', title, 'Artist:', artist);
                }
                // Format 2: "Artist - Song" 
                else {
                    const dashMatch = fullTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
                    if (dashMatch) {
                        artist = dashMatch[1].trim();
                        title = dashMatch[2].trim();
                        console.log('✅ TuneSwap: Parsed dash format - Artist:', artist, 'Title:', title);
                    } else {
                        // Only title
                        title = fullTitle;
                        console.log('✅ TuneSwap: Using full title:', title);
                    }
                }
            }
            
            // Method 2: Look for specific metadata
            const metaArtist = html.match(/property="music:musician"[^>]*content="([^"]+)"/);
            const metaAlbum = html.match(/property="music:album"[^>]*content="([^"]+)"/);
            const metaTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/);
            
            console.log('🏷️ TuneSwap: Meta artist:', metaArtist ? metaArtist[1] : 'none');
            console.log('🏷️ TuneSwap: Meta album:', metaAlbum ? metaAlbum[1] : 'none');
            console.log('🏷️ TuneSwap: Meta title:', metaTitle ? metaTitle[1] : 'none');
            
            // Use metadata if available and better
            if (metaArtist && metaArtist[1]) artist = metaArtist[1];
            if (metaAlbum && metaAlbum[1]) album = metaAlbum[1];
            if (metaTitle && metaTitle[1] && !title) title = metaTitle[1];
            
            // Method 3: Look in script tags or JSON
            const scriptMatch = html.match(/<script[^>]*>.*?"name":\s*"([^"]+)".*?<\/script>/s);
            if (scriptMatch) {
                console.log('📜 TuneSwap: Found name in script:', scriptMatch[1]);
                if (!title) title = scriptMatch[1];
            }
            
            const metadata = {
                title: title || '',
                artist: artist || '',
                album: album || '',
                type
            };
            
            console.log('✅ TuneSwap: Final metadata extracted:', metadata);
            
            // Verify we have useful data
            if (!metadata.title && !metadata.artist) {
                console.warn('⚠️ TuneSwap: No useful metadata found, trying fallback');
                return null;
            }
            
            return metadata;
            
        } catch (error) {
            console.error('❌ TuneSwap: Error getting Spotify metadata:', error);
            return null;
        }
    }

    // Function to detect user's country code
    async function getCountryCode() {
        try {
            // First try to get from saved settings
            const settings = await chrome.storage.sync.get(['countryCode']);
            if (settings.countryCode) {
                console.log('✅ TuneSwap: Using configured country:', settings.countryCode);
                return settings.countryCode;
            }
        } catch (error) {
            console.warn('⚠️ TuneSwap: Could not access settings:', error);
        }
        
        // For debugging, show browser information
        const language = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        console.log('🌍 TuneSwap: Browser language:', language);
        console.log('🕐 TuneSwap: Timezone:', timezone);
        
        // Smart country detection
        if (timezone.includes('Lima') || language.startsWith('es')) {
            console.log('✅ TuneSwap: Using country code: pe');
            return 'pe';
        }
        
        // For other cases, use US as fallback
        console.log('⚠️ TuneSwap: Using fallback: us');
        return 'us';
    }

    // Function to intelligently clean song titles
    function cleanSongTitle(title) {
        console.log('🧹 TuneSwap: Original title:', title);
        
        let cleanTitle = title;
        
        // Remove content in parentheses/brackets (remixes, versions, etc.)
        cleanTitle = cleanTitle.replace(/\s*[\(\[].*?[\)\]]/g, '');
        console.log('🧹 TuneSwap: After removing brackets:', cleanTitle);
        
        // Remove featuring/feat/ft but be careful with hyphens
        cleanTitle = cleanTitle.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '');
        console.log('🧹 TuneSwap: After removing featuring:', cleanTitle);
        
        // Only remove content after dash if it looks like artist info or remix info
        // Common patterns: "Song - Artist", "Song - Remix", "Song - Version"
        // But keep hyphens that are part of the actual title like "Anti-Hero"
        const dashPattern = /\s*-\s*(remix|version|edit|mix|instrumental|acoustic|live|radio|explicit|clean|remaster|deluxe).*$/gi;
        cleanTitle = cleanTitle.replace(dashPattern, '');
        console.log('🧹 TuneSwap: After removing remix/version info:', cleanTitle);
        
        // Remove extra whitespace
        cleanTitle = cleanTitle.trim();
        
        console.log('🧹 TuneSwap: Final cleaned title:', cleanTitle);
        return cleanTitle;
    }

    // Function to create Apple Music search URL
    async function createAppleMusicSearchUrl(metadata) {
        try {
            let searchQuery = '';
            
            switch(metadata.type) {
                case 'track':
                    if (metadata.title && metadata.title.length > 0) {
                        // Use intelligent title cleaning
                        let cleanTitle = cleanSongTitle(metadata.title);
                        
                        // Use just the clean title for most cases
                        searchQuery = cleanTitle;
                        
                        // Only add artist if title is very short, generic, or ambiguous
                        const shortTitleThreshold = 8;
                        const genericWords = ['love', 'song', 'music', 'dance', 'party', 'night', 'day'];
                        const isGeneric = genericWords.some(word => cleanTitle.toLowerCase().includes(word));
                        
                        if ((cleanTitle.length < shortTitleThreshold || isGeneric) && metadata.artist) {
                            searchQuery = `${metadata.artist} ${cleanTitle}`.trim();
                            console.log('🎯 TuneSwap: Added artist due to short/generic title');
                        }
                    }
                    break;
                case 'album':
                    searchQuery = metadata.title.trim();
                    if (metadata.artist && searchQuery.length < 20) {
                        searchQuery = `${metadata.artist} ${searchQuery}`.trim();
                    }
                    break;
                case 'artist':
                    searchQuery = metadata.title.trim();
                    break;
                default:
                    searchQuery = metadata.title.trim();
            }

            if (!searchQuery || searchQuery.length < 2) {
                return await createFallbackUrl();
            }

            // Minimal cleaning for search - preserve hyphens and most characters
            searchQuery = searchQuery
                .replace(/\s+/g, ' ') // Multiple spaces to single space
                .trim();

            console.log('🔍 TuneSwap: Final search query:', searchQuery);
            
            // Detect country code
            const countryCode = await getCountryCode();
            console.log('🌍 TuneSwap: Detected country:', countryCode);

            // Create Apple Music search URL with detected country code
            return `https://music.apple.com/${countryCode}/search?term=${encodeURIComponent(searchQuery)}`;
            
        } catch (error) {
            console.error('❌ TuneSwap: Error creating Apple Music URL:', error);
            return await createFallbackUrl();
        }
    }

    // Function to create fallback URL
    async function createFallbackUrl() {
        const countryCode = await getCountryCode();
        return `https://music.apple.com/${countryCode}/search`;
    }

    // Main function to convert link
    async function convertSpotifyToAppleMusic(spotifyUrl) {
        const startTime = Date.now();
        
        try {
            console.log('🔄 TuneSwap: Starting conversion:', spotifyUrl);
            
            // Track page visit if we have analytics
            if (analytics) {
                await analytics.trackPageVisit({
                    hostname: window.location.hostname,
                    spotifyLinksCount: document.querySelectorAll('a[href*="spotify.com"]').length
                });
            }
            
            // Show loading
            showLoadingIndicator();
            
            const spotifyInfo = extractSpotifyInfo(spotifyUrl);
            if (!spotifyInfo) {
                console.error('❌ TuneSwap: Could not extract info from Spotify link');
                hideLoadingIndicator();
                return await createFallbackUrl();
            }

            // Get Spotify metadata
            const metadata = await getSpotifyMetadata(spotifyInfo.type, spotifyInfo.id);
            if (!metadata || !metadata.title) {
                console.warn('⚠️ TuneSwap: Could not get metadata, using fallback');
                hideLoadingIndicator();
                return await createFallbackUrl();
            }

            // Search in Apple Music
            const appleMusicUrl = await createAppleMusicSearchUrl(metadata);
            
            hideLoadingIndicator();
            console.log('✅ TuneSwap: Conversion successful:', appleMusicUrl);
            
            // Notify background script
            try {
                chrome.runtime.sendMessage({
                    action: 'updateStats'
                });
            } catch (error) {
                console.warn('⚠️ TuneSwap: Could not update statistics:', error);
            }
            
            return appleMusicUrl;
            
        } catch (error) {
            console.error('❌ TuneSwap: Error in conversion:', error);
            hideLoadingIndicator();
            return await createFallbackUrl();
        }
    }

    // Simple loading indicator
    function showLoadingIndicator() {
        if (document.getElementById('tuneswap-loading')) return;
        
        const loading = document.createElement('div');
        loading.id = 'tuneswap-loading';
        loading.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1DB954, #1ed760);
            color: white;
            padding: 12px 18px;
            border-radius: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(29, 185, 84, 0.3);
            backdrop-filter: blur(10px);
        `;
        loading.textContent = '🎵 Converting to Apple Music...';
        document.body.appendChild(loading);
    }

    function hideLoadingIndicator() {
        const loading = document.getElementById('tuneswap-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Intercept clicks on links
    document.addEventListener('click', async function(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;

        // Check if it's a Spotify link
        if (link.href.includes('open.spotify.com') || link.href.includes('spotify.com')) {
            e.preventDefault();
            e.stopPropagation();

            console.log('🎵 TuneSwap: Spotify link intercepted:', link.href);

            const appleMusicUrl = await convertSpotifyToAppleMusic(link.href);
            if (appleMusicUrl) {
                console.log('✅ TuneSwap: Opening in Apple Music:', appleMusicUrl);
                window.open(appleMusicUrl, '_blank');
                if (analytics && typeof analytics.trackConversion === 'function') {
                    const conversionData = {
                        spotifyUrl: link.href,
                        appleMusicUrl: appleMusicUrl,
                        spotifyType: extractSpotifyInfo(link.href)?.type || '',
                        songTitle: '', // Puedes extraerlo si tienes el metadata
                        artistName: '',
                        albumName: '',
                        sourceUrl: window.location.href,
                        method: 'click',
                        startTime: Date.now(),
                        success: !!appleMusicUrl
                    };
                    console.log('[DEBUG] Calling analytics.trackConversion', conversionData);
                    analytics.trackConversion(conversionData);
                }
            } else {
                console.warn('⚠️ TuneSwap: Using fallback');
                window.open(await createFallbackUrl(), '_blank');
            }
        }
    });

    // Listen for messages from background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 TuneSwap: Message received from background:', request);
            
            if (request.action === 'convertLink' && request.url) {
                convertSpotifyToAppleMusic(request.url).then(appleMusicUrl => {
                    if (appleMusicUrl) {
                        window.open(appleMusicUrl, '_blank');
                        if (analytics && typeof analytics.trackConversion === 'function') {
    const conversionData = {
        spotifyUrl: request.url,
        appleMusicUrl: appleMusicUrl,
        spotifyType: extractSpotifyInfo(request.url)?.type || '',
        songTitle: '', // Puedes extraerlo si tienes el metadata
        artistName: '',
        albumName: '',
        sourceUrl: window.location.href,
        method: 'background',
        startTime: Date.now(),
        success: !!appleMusicUrl
    };
    console.log('[DEBUG] Calling analytics.trackConversion (background)', conversionData);
    analytics.trackConversion(conversionData);
}
                        sendResponse({success: true, url: appleMusicUrl});
                    } else {
                        window.open(createFallbackUrl(), '_blank');
                        sendResponse({success: false, fallback: true});
                    }
                }).catch(error => {
                    console.error('❌ TuneSwap: Error processing message:', error);
                    sendResponse({success: false, error: error.message});
                });
                
                return true; // Keep channel open
            }
        });

        // Let test pages know TuneSwap is active
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TUNESWAP_TEST_PAGE') {
                window.postMessage({ type: 'TUNESWAP_ACTIVE' }, '*');
            }
        });
    }

    console.log('✅ TuneSwap: Extension configured successfully');
})();