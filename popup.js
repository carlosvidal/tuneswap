// popup.js - TuneSwap Popup Script (Updated for Redirect Mode)

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎵 TuneSwap: Popup loaded');
    await initializePopup();
    setupEventListeners();
});

// Initialize popup with current data
async function initializePopup() {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        updateCurrentPageInfo(tab);
        
        // Load settings
        await loadSettings();
        
        // Load statistics
        await loadStats();
        
        // Check if we're on Spotify
        checkSpotifyPage(tab);
        
    } catch (error) {
        console.error('TuneSwap: Error initializing popup:', error);
    }
}

// Update current page information
function updateCurrentPageInfo(tab) {
    const urlElement = document.getElementById('currentUrl');
    const statusElement = document.getElementById('pageStatus');
    
    if (urlElement) {
        const url = new URL(tab.url);
        urlElement.textContent = url.hostname;
    }
    
    if (statusElement) {
        const isSpotify = tab.url.includes('spotify.com');
        if (isSpotify) {
            statusElement.innerHTML = '🎵 <strong>Spotify detected</strong> - TuneSwap is active';
            statusElement.style.color = '#1DB954';
        } else {
            statusElement.innerHTML = '📱 Open a Spotify link to use TuneSwap';
            statusElement.style.color = '#666';
        }
    }
}

// Check if current page is Spotify
function checkSpotifyPage(tab) {
    const testButton = document.getElementById('testConversion');
    const manualButton = document.getElementById('manualConvert');
    
    if (tab.url.includes('spotify.com')) {
        // We're on Spotify - show manual convert option
        if (testButton) {
            testButton.style.display = 'none';
        }
        if (manualButton) {
            manualButton.style.display = 'block';
        }
    } else {
        // Not on Spotify - show test option
        if (testButton) {
            testButton.style.display = 'block';
        }
        if (manualButton) {
            manualButton.style.display = 'none';
        }
    }
}

// Load saved settings
async function loadSettings() {
    try {
        const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });
        
        // Update toggles
        updateToggle('enabledToggle', settings.enabled !== false);
        
        // Update country selector
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            countrySelect.value = settings.countryCode || 'us';
        }
        
    } catch (error) {
        console.error('TuneSwap: Error loading settings:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getStats' });
        
        if (response.success) {
            const stats = response.stats;
            
            const todayEl = document.getElementById('todayCount');
            const totalEl = document.getElementById('totalCount');
            const lastEl = document.getElementById('lastConversion');
            
            if (todayEl) todayEl.textContent = stats.todayCount;
            if (totalEl) totalEl.textContent = stats.totalCount;
            
            if (lastEl && stats.lastConversion) {
                const date = new Date(stats.lastConversion);
                lastEl.textContent = formatRelativeTime(date);
            }
        }
        
    } catch (error) {
        console.error('TuneSwap: Error loading statistics:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Configuration toggles
    const enabledToggle = document.getElementById('enabledToggle');
    if (enabledToggle) {
        enabledToggle.addEventListener('click', () => {
            toggleSetting('enabled', 'enabledToggle');
        });
    }

    // Country selector
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect) {
        countrySelect.addEventListener('change', async (e) => {
            try {
                await chrome.runtime.sendMessage({
                    action: 'saveSettings',
                    settings: { countryCode: e.target.value }
                });
                const countryName = e.target.options[e.target.selectedIndex].text;
                showTemporaryMessage(`Region changed to: ${countryName}`);
            } catch (error) {
                console.error('TuneSwap: Error saving country:', error);
            }
        });
    }
    
    // Action buttons
    const testBtn = document.getElementById('testConversion');
    if (testBtn) testBtn.addEventListener('click', testConversion);
    
    const manualBtn = document.getElementById('manualConvert');
    if (manualBtn) manualBtn.addEventListener('click', manualConvert);
    
    const clearBtn = document.getElementById('clearStats');
    if (clearBtn) clearBtn.addEventListener('click', clearStats);
}

// Update toggle state
function updateToggle(toggleId, isActive) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
        if (isActive) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

// Change setting
async function toggleSetting(settingName, toggleId) {
    try {
        const current = await chrome.runtime.sendMessage({ action: 'getSettings' });
        const newValue = !current[settingName];
        
        await chrome.runtime.sendMessage({
            action: 'saveSettings',
            settings: { [settingName]: newValue }
        });
        
        updateToggle(toggleId, newValue);
        
        // Show feedback
        const status = newValue ? 'enabled' : 'disabled';
        showTemporaryMessage(`TuneSwap ${status}`);
        
    } catch (error) {
        console.error('TuneSwap: Error changing setting:', error);
    }
}

// Test conversion with example link
async function testConversion() {
    showTemporaryMessage('Opening test Spotify link...');
    
    try {
        // Open a test Spotify track - TuneSwap will handle the conversion
        const testSpotifyUrl = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
        chrome.tabs.create({ url: testSpotifyUrl });
        
        showTemporaryMessage('✅ Test link opened - TuneSwap will convert it!');
        
    } catch (error) {
        console.error('TuneSwap: Error in test:', error);
        showTemporaryMessage('❌ Test failed');
    }
}

// Manual convert current Spotify page
async function manualConvert() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url.includes('spotify.com')) {
            showTemporaryMessage('❌ This is not a Spotify page');
            return;
        }
        
        showTemporaryMessage('🔄 Converting current page...');
        
        // Get settings to determine country
        const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });
        const countryCode = settings.countryCode || 'us';
        
        // Try to get title from current page
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const title = document.title.replace(' | Spotify', '');
                const ogTitle = document.querySelector('meta[property="og:title"]');
                return {
                    pageTitle: title !== 'Spotify' ? title : '',
                    ogTitle: ogTitle ? ogTitle.content : ''
                };
            }
        });
        
        const pageData = results[0]?.result || {};
        let searchQuery = pageData.pageTitle || pageData.ogTitle || '';
        
        // Clean the title for better search
        if (searchQuery) {
            // Remove "by Artist" part and use just the song title for better matching
            const byMatch = searchQuery.match(/^(.+?)\s+by\s+(.+)$/i);
            if (byMatch) {
                searchQuery = byMatch[1].trim(); // Just the song title
            }
            
            // Clean up the title
            searchQuery = searchQuery
                .replace(/\s*[\(\[].*?[\)\]]/g, '') // Remove parentheses content
                .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '') // Remove featuring
                .replace(/\s*-\s*(remix|version|edit|mix|instrumental|acoustic|live).*$/gi, '') // Remove remix info
                .replace(/\s+/g, ' ')
                .trim();
        }
        
        // Fallback if no good title found
        if (!searchQuery || searchQuery.length < 2) {
            const url = tab.url;
            if (url.includes('/track/')) {
                searchQuery = 'spotify track';
            } else if (url.includes('/album/')) {
                searchQuery = 'spotify album';
            } else if (url.includes('/artist/')) {
                searchQuery = 'spotify artist';
            } else {
                searchQuery = 'spotify music';
            }
        }
        
        // Create Apple Music URL
        const appleMusicUrl = `https://music.apple.com/${countryCode}/search?term=${encodeURIComponent(searchQuery)}`;
        
        // Open Apple Music
        chrome.tabs.create({ url: appleMusicUrl });
        
        // Update stats
        chrome.runtime.sendMessage({ action: 'updateStats' });
        
        showTemporaryMessage(`✅ Opened "${searchQuery}" in Apple Music`);
        
    } catch (error) {
        console.error('TuneSwap: Error in manual convert:', error);
        showTemporaryMessage('❌ Conversion failed');
    }
}

// Clear statistics
async function clearStats() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'clearStats' });
        
        if (response.success) {
            await loadStats();
            showTemporaryMessage('📊 Statistics cleared');
        } else {
            showTemporaryMessage('❌ Error clearing statistics');
        }
        
    } catch (error) {
        console.error('TuneSwap: Error clearing statistics:', error);
        showTemporaryMessage('❌ Error clearing statistics');
    }
}

// Show temporary message
function showTemporaryMessage(message) {
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('tempMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'tempMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            background: rgba(29, 185, 84, 0.95);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            z-index: 1000;
            transition: opacity 0.3s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.opacity = '1';
    
    // Hide after 2.5 seconds
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 2500);
}

// Format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}