// content.js - TuneSwap Content Script (Minimal Version)
(function() {
    'use strict';
    
    console.log('🎵 TuneSwap extension loaded');

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
            
            const response = await fetch(oembedUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
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

    // Function to detect user's country code
    async function getCountryCode() {
        try {
            const settings = await chrome.storage.sync.get(['countryCode']);
            if (settings.countryCode) {
                return settings.countryCode;
            }
        } catch (error) {
            console.warn('⚠️ TuneSwap: Could not access settings:', error);
        }
        
        const language = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Smart country detection
        if (timezone.includes('Lima') || language.startsWith('es')) {
            return 'pe';
        }
        
        return 'us';
    }

    // Function to intelligently clean song titles
    function cleanSongTitle(title) {
        let cleanTitle = title;
        
        // Remove content in parentheses/brackets (remixes, versions, etc.)
        cleanTitle = cleanTitle.replace(/\s*[\(\[].*?[\)\]]/g, '');
        
        // Remove featuring/feat/ft
        cleanTitle = cleanTitle.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '');
        
        // Remove remix/version info after dash
        const dashPattern = /\s*-\s*(remix|version|edit|mix|instrumental|acoustic|live|radio|explicit|clean|remaster|deluxe).*$/gi;
        cleanTitle = cleanTitle.replace(dashPattern, '');
        
        return cleanTitle.trim();
    }

    // Function to create Apple Music search URL
    async function createAppleMusicSearchUrl(metadata) {
        try {
            let searchQuery = '';
            
            switch(metadata.type) {
                case 'track':
                    if (metadata.title && metadata.title.length > 0) {
                        let cleanTitle = cleanSongTitle(metadata.title);
                        searchQuery = cleanTitle;
                        
                        // Add artist if title is short or generic
                        const shortTitleThreshold = 8;
                        const genericWords = ['love', 'song', 'music', 'dance', 'party', 'night', 'day'];
                        const isGeneric = genericWords.some(word => cleanTitle.toLowerCase().includes(word));
                        
                        if ((cleanTitle.length < shortTitleThreshold || isGeneric) && metadata.artist) {
                            searchQuery = `${metadata.artist} ${cleanTitle}`.trim();
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

            searchQuery = searchQuery.replace(/\s+/g, ' ').trim();
            
            const countryCode = await getCountryCode();
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
        try {
            console.log('🔄 TuneSwap: Starting conversion:', spotifyUrl);
            
            showLoadingIndicator();
            
            const spotifyInfo = extractSpotifyInfo(spotifyUrl);
            if (!spotifyInfo) {
                hideLoadingIndicator();
                return await createFallbackUrl();
            }

            // Get Spotify metadata
            const metadata = await getSpotifyMetadataOembed(spotifyInfo.type, spotifyInfo.id);
            if (!metadata || !metadata.title) {
                hideLoadingIndicator();
                return await createFallbackUrl();
            }

            // Search in Apple Music
            const appleMusicUrl = await createAppleMusicSearchUrl(metadata);
            
            hideLoadingIndicator();
            console.log('✅ TuneSwap: Conversion successful:', appleMusicUrl);
            
            // Update stats
            try {
                chrome.runtime.sendMessage({ action: 'updateStats' });
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

    // Only intercept clicks on Spotify links (more targeted approach)
    document.addEventListener('click', async function(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;

        // Check if it's a Spotify link
        if (link.href.includes('open.spotify.com') || link.href.includes('spotify.com')) {
            // Only intercept if not already on Spotify
            if (window.location.hostname.includes('spotify.com')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();

            console.log('🎵 TuneSwap: Spotify link intercepted:', link.href);

            const appleMusicUrl = await convertSpotifyToAppleMusic(link.href);
            if (appleMusicUrl) {
                window.open(appleMusicUrl, '_blank');
            } else {
                window.open(await createFallbackUrl(), '_blank');
            }
        }
    });

    // Listen for messages from background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'convertLink' && request.url) {
                convertSpotifyToAppleMusic(request.url).then(appleMusicUrl => {
                    if (appleMusicUrl) {
                        window.open(appleMusicUrl, '_blank');
                        sendResponse({success: true, url: appleMusicUrl});
                    } else {
                        window.open(createFallbackUrl(), '_blank');
                        sendResponse({success: false, fallback: true});
                    }
                }).catch(error => {
                    sendResponse({success: false, error: error.message});
                });
                
                return true;
            }
        });
    }

    console.log('✅ TuneSwap: Extension configured successfully');
})();