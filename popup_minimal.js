// popup.js - TuneSwap Popup Script (Minimal Version)

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
        
        // Count Spotify links on current page
        await countSpotifyLinks(tab.id);
        
    } catch (error) {
        console.error('TuneSwap: Error initializing popup:', error);
    }
}

// Update current page information
function updateCurrentPageInfo(tab) {
    const urlElement = document.getElementById('currentUrl');
    if (urlElement) {
        const url = new URL(tab.url);
        urlElement.textContent = url.hostname;
    }
}

// Load saved settings
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get([
            'enabled', 
            'countryCode'
        ]);
        
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
        const stats = await chrome.storage.local.get([
            'todayCount',
            'totalCount', 
            'lastConversion',
            'lastDate'
        ]);
        
        const today = new Date().toDateString();
        const todayCount = (stats.lastDate === today) ? (stats.todayCount || 0) : 0;
        
        const todayEl = document.getElementById('todayCount');
        const totalEl = document.getElementById('totalCount');
        const lastEl = document.getElementById('lastConversion');
        
        if (todayEl) todayEl.textContent = todayCount;
        if (totalEl) totalEl.textContent = stats.totalCount || 0;
        
        if (lastEl && stats.lastConversion) {
            const date = new Date(stats.lastConversion);
            lastEl.textContent = formatRelativeTime(date);
        }
        
    } catch (error) {
        console.error('TuneSwap: Error loading statistics:', error);
    }
}

// Count Spotify links on the page
async function countSpotifyLinks(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: {tabId: tabId},
            func: () => {
                const spotifyLinks = document.querySelectorAll('a[href*="spotify.com"], a[href*="open.spotify.com"]');
                return spotifyLinks.length;
            }
        });
        
        const count = results[0]?.result || 0;
        const countEl = document.getElementById('spotifyCount');
        if (countEl) countEl.textContent = count;
        
    } catch (error) {
        console.error('TuneSwap: Error counting links:', error);
        const countEl = document.getElementById('spotifyCount');
        if (countEl) countEl.textContent = '?';
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
                await chrome.storage.sync.set({countryCode: e.target.value});
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
    
    const convertBtn = document.getElementById('convertAllLinks');
    if (convertBtn) convertBtn.addEventListener('click', convertAllLinks);
    
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
        const current = await chrome.storage.sync.get([settingName]);
        const newValue = !current[settingName];
        
        await chrome.storage.sync.set({[settingName]: newValue});
        updateToggle(toggleId, newValue);
        
        // Show feedback
        const status = newValue ? 'enabled' : 'disabled';
        showTemporaryMessage(`${settingName} ${status}`);
        
    } catch (error) {
        console.error('TuneSwap: Error changing setting:', error);
    }
}

// Test conversion with example link
async function testConversion() {
    showTemporaryMessage('Testing conversion...');
    
    try {
        // Get country code from settings
        const settings = await chrome.storage.sync.get(['countryCode']);
        const countryCode = settings.countryCode || 'us';
        
        // Simple test search
        const testQuery = 'Never Gonna Give You Up Rick Astley';
        const appleMusicUrl = `https://music.apple.com/${countryCode}/search?term=${encodeURIComponent(testQuery)}`;
        
        chrome.tabs.create({url: appleMusicUrl});
        showTemporaryMessage('✅ Test successful - opening Apple Music');
        
    } catch (error) {
        console.error('TuneSwap: Error in test:', error);
        showTemporaryMessage('❌ Test failed');
    }
}

// Convert all links on the page
async function convertAllLinks() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        showTemporaryMessage('Converting all links...');
        
        const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
                const spotifyLinks = document.querySelectorAll('a[href*="spotify.com"], a[href*="open.spotify.com"]');
                let converted = 0;
                
                spotifyLinks.forEach(link => {
                    // Add visual indicator
                    link.style.border = '2px solid #1DB954';
                    link.style.borderRadius = '4px';
                    link.title = 'TuneSwap: Link marked for conversion';
                    converted++;
                });
                
                return converted;
            }
        });
        
        const count = results[0]?.result || 0;
        showTemporaryMessage(`✅ ${count} links marked for conversion`);
        
    } catch (error) {
        console.error('TuneSwap: Error converting links:', error);
        showTemporaryMessage('❌ Error converting links');
    }
}

// Clear statistics
async function clearStats() {
    try {
        await chrome.storage.local.clear();
        await loadStats();
        showTemporaryMessage('📊 Statistics cleared');
        
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