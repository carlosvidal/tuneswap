// spotify-redirect.js - Redirect Spotify to Apple Music
(function() {
    'use strict';
    
    console.log('🎵 TuneSwap: Loaded on Spotify page');

    // Check if extension is enabled
    async function isExtensionEnabled() {
        try {
            const settings = await chrome.storage.sync.get(['enabled']);
            return settings.enabled !== false; // Default to enabled
        } catch (error) {
            return true; // Default to enabled if can't check
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
        
        // Smart country detection
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

    // Get metadata from current Spotify page
    async function getMetadataFromPage() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkMetadata = () => {
                attempts++;
                
                // Method 1: Try to get from page title
                const title = document.title.replace(' | Spotify', '');
                if (title && title !== 'Spotify' && title !== 'Loading...') {
                    let songTitle = '';
                    let artist = '';
                    
                    // Parse "Song by Artist" format
                    const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
                    if (byMatch) {
                        songTitle = byMatch[1].trim();
                        artist = byMatch[2].trim();
                    } else {
                        songTitle = title;
                    }
                    
                    resolve({ title: songTitle, artist, album: '' });
                    return;
                }

                // Method 2: Try meta tags
                const ogTitle = document.querySelector('meta[property="og:title"]');
                const ogDescription = document.querySelector('meta[property="og:description"]');
                
                if (ogTitle && ogTitle.content && ogTitle.content !== 'Spotify') {
                    resolve({ 
                        title: ogTitle.content, 
                        artist: ogDescription ? ogDescription.content : '',
                        album: ''
                    });
                    return;
                }

                // Method 3: Try structured data
                const jsonLd = document.querySelector('script[type="application/ld+json"]');
                if (jsonLd) {
                    try {
                        const data = JSON.parse(jsonLd.textContent);
                        if (data.name) {
                            resolve({
                                title: data.name,
                                artist: data.byArtist ? data.byArtist.name : '',
                                album: data.inAlbum ? data.inAlbum.name : ''
                            });
                            return;
                        }
                    } catch (error) {
                        // Ignore JSON parse errors
                    }
                }

                // Continue trying if we haven't reached max attempts
                if (attempts < maxAttempts) {
                    setTimeout(checkMetadata, 500);
                } else {
                    // Fallback: use URL info
                    resolve({ title: '', artist: '', album: '' });
                }
            };

            // Start checking immediately
            checkMetadata();
        });
    }

    // Clean song title for better search
    function cleanSongTitle(title) {
        let cleanTitle = title;
        
        // Remove content in parentheses/brackets
        cleanTitle = cleanTitle.replace(/\s*[\(\[].*?[\)\]]/g, '');
        
        // Remove featuring/feat/ft
        cleanTitle = cleanTitle.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '');
        
        // Remove remix/version info after dash
        cleanTitle = cleanTitle.replace(/\s*-\s*(remix|version|edit|mix|instrumental|acoustic|live|radio|explicit|clean|remaster|deluxe).*$/gi, '');
        
        return cleanTitle.trim();
    }

    // Create Apple Music search URL
    async function createAppleMusicUrl(metadata, spotifyInfo) {
        const countryCode = await getCountryCode();
        
        let searchQuery = '';
        
        switch(spotifyInfo.type) {
            case 'track':
                if (metadata.title) {
                    const cleanTitle = cleanSongTitle(metadata.title);
                    searchQuery = cleanTitle;
                    
                    // Add artist for short/generic titles
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

    // Show conversion notice
    function showConversionNotice(appleMusicUrl, metadata) {
        // Remove any existing notice
        const existingNotice = document.getElementById('tuneswap-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        const notice = document.createElement('div');
        notice.id = 'tuneswap-notice';
        
        const songInfo = metadata.title ? 
            `"${metadata.title}"${metadata.artist ? ` by ${metadata.artist}` : ''}` : 
            'this content';
            
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
                <div style="margin-bottom: 8px;">
                    🎵 TuneSwap: Opening ${songInfo} in Apple Music...
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
                    Auto-redirecting in <span id="countdown">3</span> seconds
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

        // Countdown timer
        let countdown = 3;
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

        // Add event listeners
        const goButton = document.getElementById('tuneswap-go');
        const stayButton = document.getElementById('tuneswap-stay');
        
        const redirectToAppleMusic = () => {
            clearInterval(countdownInterval);
            window.location.href = appleMusicUrl;
        };
        
        const cancelRedirect = () => {
            clearInterval(countdownInterval);
            notice.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => notice.remove(), 300);
        };

        if (goButton) {
            goButton.addEventListener('click', redirectToAppleMusic);
        }
        
        if (stayButton) {
            stayButton.addEventListener('click', cancelRedirect);
        }

        // Auto-redirect after 3 seconds
        setTimeout(() => {
            if (document.getElementById('tuneswap-notice')) {
                redirectToAppleMusic();
            }
        }, 3000);
    }

    // Main conversion function
    async function performConversion() {
        try {
            console.log('🔄 TuneSwap: Starting conversion from Spotify page');
            
            // Check if enabled
            if (!(await isExtensionEnabled())) {
                console.log('⏸️ TuneSwap: Extension disabled');
                return;
            }

            // Extract Spotify info
            const spotifyInfo = extractSpotifyInfo();
            if (!spotifyInfo) {
                console.log('⚠️ TuneSwap: Could not extract Spotify info from URL');
                return;
            }

            console.log('📝 TuneSwap: Extracted info:', spotifyInfo);

            // Get metadata from page
            const metadata = await getMetadataFromPage();
            console.log('🎵 TuneSwap: Page metadata:', metadata);

            // Create Apple Music URL
            const appleMusicUrl = await createAppleMusicUrl(metadata, spotifyInfo);
            console.log('🍎 TuneSwap: Apple Music URL:', appleMusicUrl);

            // Update stats
            try {
                chrome.runtime.sendMessage({ action: 'updateStats' });
            } catch (error) {
                console.warn('⚠️ TuneSwap: Could not update stats');
            }

            // Show conversion notice
            showConversionNotice(appleMusicUrl, metadata);

        } catch (error) {
            console.error('❌ TuneSwap: Error in conversion:', error);
        }
    }

    // Check if we should skip conversion (user preferences)
    async function shouldSkipConversion() {
        // Skip if user has disabled the extension
        if (!(await isExtensionEnabled())) {
            return true;
        }

        // Skip if this is an embed or iframe
        if (window.self !== window.top) {
            return true;
        }

        // Skip if URL doesn't contain content we can convert
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

        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(performConversion, 1500);
            });
        } else {
            // Page already loaded, wait a bit for dynamic content
            setTimeout(performConversion, 1500);
        }
    }

    // Handle navigation changes (for SPA behavior)
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(async () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('🔄 TuneSwap: URL changed, checking for conversion');
            
            if (!(await shouldSkipConversion())) {
                setTimeout(performConversion, 2000);
            }
        }
    }, 1000);

    // Clean up interval when page unloads
    window.addEventListener('beforeunload', () => {
        clearInterval(urlCheckInterval);
    });

    // Start the process
    initialize();

    console.log('✅ TuneSwap: Spotify redirect script configured');
})();