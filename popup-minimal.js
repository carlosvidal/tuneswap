// popup-minimal.js - Simplified popup without storage dependency

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎵 TuneSwap: Minimal popup loaded');
    
    // First test if Chrome APIs are available
    if (typeof chrome === 'undefined' || !chrome.storage) {
        showError('Chrome storage API not available');
        return;
    }
    
    try {
        await initializeMinimalPopup();
        setupMinimalEventListeners();
    } catch (error) {
        console.error('TuneSwap: Fatal error:', error);
        showError('Extension initialization failed: ' + error.message);
    }
});

// Show error message in popup
function showError(message) {
    const statusEl = document.getElementById('storageStatus');
    if (statusEl) {
        statusEl.textContent = '❌ ' + message;
        statusEl.className = 'storage-status error';
    }
    
    // Disable all interactive elements
    const buttons = document.querySelectorAll('button, select, .toggle');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
}

// Minimal initialization without dependencies
async function initializeMinimalPopup() {
    // Update page info
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const urlElement = document.getElementById('currentUrl');
        if (urlElement && tab) {
            try {
                const url = new URL(tab.url);
                urlElement.textContent = url.hostname;
            } catch (error) {
                urlElement.textContent = 'Unknown page';
            }
        }
        
        // Check if on Spotify and update status
        const isSpotify = tab && tab.url.includes('spotify.com');
        const statusElement = document.getElementById('pageStatus');
        if (statusElement) {
            if (isSpotify) {
                // Parse Spotify URL to show what type of content
                let contentType = 'content';
                let contentInfo = '';
                
                if (tab.url.includes('/track/')) {
                    contentType = 'track';
                    contentInfo = ' 🎵 Track detected';
                } else if (tab.url.includes('/album/')) {
                    contentType = 'album';
                    contentInfo = ' 💿 Album detected';
                } else if (tab.url.includes('/artist/')) {
                    contentType = 'artist';
                    contentInfo = ' 👤 Artist detected';
                } else if (tab.url.includes('/playlist/')) {
                    contentType = 'playlist';
                    contentInfo = ' 📋 Playlist detected';
                }
                
                statusElement.innerHTML = `🎵 <strong>Spotify detected</strong>${contentInfo} - Ready to convert!`;
                statusElement.className = 'spotify-active';
                
                // Show manual convert button
                const testBtn = document.getElementById('testConversion');
                const manualBtn = document.getElementById('manualConvert');
                if (testBtn) testBtn.style.display = 'none';
                if (manualBtn) {
                    manualBtn.style.display = 'block';
                    manualBtn.textContent = `🔄 Convert This ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
                }
            } else {
                statusElement.innerHTML = '📱 Open a Spotify link to use TuneSwap';
                statusElement.className = '';
                
                // Show test button
                const testBtn = document.getElementById('testConversion');
                const manualBtn = document.getElementById('manualConvert');
                if (testBtn) testBtn.style.display = 'block';
                if (manualBtn) manualBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.warn('Could not get tab info:', error);
    }
    
    // Test storage access
    try {
        // Simple test
        const testKey = 'test_' + Date.now();
        await chrome.storage.sync.set({ [testKey]: 'working' });
        const result = await chrome.storage.sync.get([testKey]);
        await chrome.storage.sync.remove([testKey]);
        
        if (result[testKey] === 'working') {
            console.log('✅ Storage test passed');
            const statusEl = document.getElementById('storageStatus');
            if (statusEl) {
                statusEl.textContent = '✅ Storage working - loading settings...';
                statusEl.className = 'storage-status success';
            }
            
            // Load settings if storage works
            await loadMinimalSettings();
            
        } else {
            throw new Error('Storage test failed - value not retrieved');
        }
        
    } catch (error) {
        console.error('❌ Storage test failed:', error);
        const statusEl = document.getElementById('storageStatus');
        if (statusEl) {
            statusEl.textContent = '❌ Storage not working: ' + error.message;
            statusEl.className = 'storage-status error';
        }
        
        // Set default values in UI
        setDefaultUIValues();
    }
}

// Load settings with minimal error handling
async function loadMinimalSettings() {
    try {
        // Get settings directly from storage
        const settings = await chrome.storage.sync.get(['enabled', 'countryCode']);
        console.log('📋 Loaded settings:', settings);
        
        // Update country selector
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            countrySelect.value = settings.countryCode || 'us';
            console.log('🌍 Set country to:', countrySelect.value);
        }
        
        // Update enabled toggle
        const enabledToggle = document.getElementById('enabledToggle');
        if (enabledToggle) {
            if (settings.enabled !== false) {
                enabledToggle.classList.add('active');
            } else {
                enabledToggle.classList.remove('active');
            }
        }
        
        // Update status
        const statusEl = document.getElementById('storageStatus');
        if (statusEl) {
            statusEl.textContent = '✅ Settings loaded successfully';
            statusEl.className = 'storage-status success';
        }
        
        // Load stats
        await loadMinimalStats();
        
    } catch (error) {
        console.error('Error loading settings:', error);
        setDefaultUIValues();
        throw error;
    }
}

// Load statistics with minimal error handling
async function loadMinimalStats() {
    try {
        const stats = await chrome.storage.local.get(['totalCount', 'todayCount', 'lastDate', 'lastConversion']);
        
        const today = new Date().toDateString();
        const todayCount = (stats.lastDate === today) ? (stats.todayCount || 0) : 0;
        
        // Update UI
        const todayEl = document.getElementById('todayCount');
        const totalEl = document.getElementById('totalCount');
        const lastEl = document.getElementById('lastConversion');
        
        if (todayEl) todayEl.textContent = todayCount;
        if (totalEl) totalEl.textContent = stats.totalCount || 0;
        
        if (lastEl) {
            if (stats.lastConversion) {
                try {
                    const date = new Date(stats.lastConversion);
                    lastEl.textContent = formatRelativeTime(date);
                } catch (dateError) {
                    lastEl.textContent = 'Invalid date';
                }
            } else {
                lastEl.textContent = 'Never';
            }
        }
        
        console.log('📊 Stats loaded:', {todayCount, totalCount: stats.totalCount || 0});
        
    } catch (error) {
        console.warn('Could not load stats:', error);
        // Set default values
        const todayEl = document.getElementById('todayCount');
        const totalEl = document.getElementById('totalCount');
        const lastEl = document.getElementById('lastConversion');
        
        if (todayEl) todayEl.textContent = '0';
        if (totalEl) totalEl.textContent = '0';
        if (lastEl) lastEl.textContent = 'Never';
    }
}

// Set default UI values when storage fails
function setDefaultUIValues() {
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect) {
        countrySelect.value = 'us';
    }
    
    const enabledToggle = document.getElementById('enabledToggle');
    if (enabledToggle) {
        enabledToggle.classList.add('active');
    }
    
    const todayEl = document.getElementById('todayCount');
    const totalEl = document.getElementById('totalCount');
    const lastEl = document.getElementById('lastConversion');
    
    if (todayEl) todayEl.textContent = '0';
    if (totalEl) totalEl.textContent = '0';
    if (lastEl) lastEl.textContent = 'Never';
}

// Setup minimal event listeners
function setupMinimalEventListeners() {
    // Country selector
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect) {
        countrySelect.addEventListener('change', async (e) => {
            const newCountryCode = e.target.value;
            const countryName = e.target.options[e.target.selectedIndex].text;
            
            console.log('🌍 Country changed to:', newCountryCode);
            
            try {
                showTemporaryMessage('🔄 Saving region...');
                
                await chrome.storage.sync.set({ countryCode: newCountryCode });
                
                // Verify
                const verification = await chrome.storage.sync.get(['countryCode']);
                if (verification.countryCode === newCountryCode) {
                    showTemporaryMessage(`✅ Region saved: ${countryName}`);
                    console.log('✅ Region saved successfully');
                } else {
                    throw new Error('Verification failed');
                }
                
            } catch (error) {
                console.error('❌ Error saving region:', error);
                showTemporaryMessage('❌ Could not save region');
                
                // Revert
                e.target.value = 'us';
            }
        });
    }
    
    // Test conversion button
    const testBtn = document.getElementById('testConversion');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            try {
                showTemporaryMessage('🧪 Opening test link...');
                
                const testUrl = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
                await chrome.tabs.create({ url: testUrl });
                
                showTemporaryMessage('✅ Test link opened');
                
            } catch (error) {
                console.error('Test error:', error);
                showTemporaryMessage('❌ Test failed');
            }
        });
    }
    
    // Manual convert button
    const manualBtn = document.getElementById('manualConvert');
    if (manualBtn) {
        manualBtn.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                
                if (!tab.url.includes('spotify.com')) {
                    showTemporaryMessage('❌ Not a Spotify page');
                    return;
                }
                
                showTemporaryMessage('🔄 Converting...');
                
                // Get country
                let countryCode = 'us';
                try {
                    const settings = await chrome.storage.sync.get(['countryCode']);
                    countryCode = settings.countryCode || 'us';
                } catch (error) {
                    console.warn('Could not get country, using default');
                }
                
                // Simple conversion - just open Apple Music search
                const appleMusicUrl = `https://music.apple.com/${countryCode}/search`;
                await chrome.tabs.create({ url: appleMusicUrl });
                
                showTemporaryMessage('✅ Opened Apple Music');
                
                // Try to update stats
                try {
                    const stats = await chrome.storage.local.get(['totalCount', 'todayCount', 'lastDate']);
                    const today = new Date().toDateString();
                    
                    await chrome.storage.local.set({
                        totalCount: (stats.totalCount || 0) + 1,
                        todayCount: (stats.lastDate === today) ? (stats.todayCount || 0) + 1 : 1,
                        lastDate: today,
                        lastConversion: new Date().toISOString()
                    });
                    
                    await loadMinimalStats();
                    
                    // Track with simple analytics
                    try {
                        const analyticsData = {
                            spotifyType: 'manual',
                            countryCode: countryCode,
                            isExactMatch: false,
                            appleMusicUrl: appleMusicUrl
                        };
                        
                        // Store analytics data locally
                        const analytics = await chrome.storage.local.get(['totalConversions', 'conversionsByType', 'conversionsByCountry']);
                        
                        await chrome.storage.local.set({
                            totalConversions: (analytics.totalConversions || 0) + 1,
                            conversionsByType: {
                                ...analytics.conversionsByType,
                                manual: (analytics.conversionsByType?.manual || 0) + 1
                            },
                            conversionsByCountry: {
                                ...analytics.conversionsByCountry,
                                [countryCode]: (analytics.conversionsByCountry?.[countryCode] || 0) + 1
                            }
                        });
                        
                        console.log('📊 Manual conversion analytics tracked');
                        
                    } catch (analyticsError) {
                        console.warn('📊 Analytics tracking failed:', analyticsError);
                    }
                    
                } catch (statsError) {
                    console.warn('Could not update stats:', statsError);
                }
                
            } catch (error) {
                console.error('Manual convert error:', error);
                showTemporaryMessage('❌ Conversion failed');
            }
        });
    }
    
    // Clear stats button
    const clearBtn = document.getElementById('clearStats');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            try {
                await chrome.storage.local.clear();
                await loadMinimalStats();
                showTemporaryMessage('📊 Stats cleared');
                
            } catch (error) {
                console.error('Clear stats error:', error);
                showTemporaryMessage('❌ Could not clear stats');
            }
        });
    }
    
    // Debug buttons
    setupDebugButtons();
    
    // Setup debug toggle
    const debugToggle = document.querySelector('.debug-toggle');
    if (debugToggle) {
        debugToggle.addEventListener('click', () => {
            const debugSection = document.querySelector('.debug-section');
            if (debugSection) {
                debugSection.classList.toggle('show');
                // Update toggle text
                if (debugSection.classList.contains('show')) {
                    debugToggle.textContent = '🔧 Hide Debug Tools';
                } else {
                    debugToggle.textContent = '🔧 Show Debug Tools';
                }
            }
        });
    }
}

// Setup debug buttons
function setupDebugButtons() {
    // Fix storage button
    const fixBtn = document.getElementById('fixStorage');
    if (fixBtn) {
        fixBtn.addEventListener('click', async () => {
            try {
                showTemporaryMessage('🔧 Resetting storage...');
                
                // Clear and reinitialize
                await chrome.storage.sync.clear();
                await chrome.storage.local.clear();
                
                // Set defaults
                await chrome.storage.sync.set({
                    enabled: true,
                    countryCode: 'us',
                    resetAt: new Date().toISOString()
                });
                
                showTemporaryMessage('✅ Storage reset complete');
                
                // Reload settings
                await loadMinimalSettings();
                
            } catch (error) {
                console.error('Fix storage error:', error);
                showTemporaryMessage('❌ Could not fix storage');
            }
        });
    }
    
    // View storage button
    const viewBtn = document.getElementById('viewStorage');
    if (viewBtn) {
        viewBtn.addEventListener('click', async () => {
            try {
                const syncData = await chrome.storage.sync.get();
                const localData = await chrome.storage.local.get();
                
                console.log('📊 Sync Storage:', syncData);
                console.log('📊 Local Storage:', localData);
                
                showTemporaryMessage('📊 Storage logged to console');
                
            } catch (error) {
                console.error('View storage error:', error);
                showTemporaryMessage('❌ Could not access storage');
            }
        });
    }
    
    // Diagnostic button
    const diagBtn = document.getElementById('runDiagnostic');
    if (diagBtn) {
        diagBtn.addEventListener('click', async () => {
            try {
                showTemporaryMessage('🔍 Running diagnostic...');
                
                // Test storage
                const testKey = 'diag_' + Date.now();
                await chrome.storage.sync.set({ [testKey]: 'test' });
                const result = await chrome.storage.sync.get([testKey]);
                await chrome.storage.sync.remove([testKey]);
                
                if (result[testKey] === 'test') {
                    showTemporaryMessage('✅ Diagnostic passed');
                    console.log('✅ Storage diagnostic passed');
                } else {
                    throw new Error('Storage test failed');
                }
                
            } catch (error) {
                console.error('Diagnostic error:', error);
                showTemporaryMessage('❌ Diagnostic failed: ' + error.message);
            }
        });
    }
}

// Show temporary message
function showTemporaryMessage(message) {
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
    
    setTimeout(() => {
        if (messageEl) {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl && messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
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