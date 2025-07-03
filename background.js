// background.js - TuneSwap Service Worker

console.log('🚀 TuneSwap: Service worker starting...');

// Check available APIs on startup
function checkAPIs() {
    const available = {
        runtime: !!chrome?.runtime,
        storage: !!chrome?.storage,
        contextMenus: !!chrome?.contextMenus,
        tabs: !!chrome?.tabs,
        scripting: !!chrome?.scripting
    };
    
    console.log('📋 TuneSwap: Available APIs:', available);
    return available;
}

const apis = checkAPIs();

// Handle extension installation
if (apis.runtime) {
    chrome.runtime.onInstalled.addListener(async (details) => {
        console.log('📦 TuneSwap: Extension installed:', details.reason);
        
        try {
            if (details.reason === 'install') {
                // Set default values
                if (apis.storage) {
                    await chrome.storage.sync.set({
                        enabled: true,
                        openInNewTab: true,
                        showNotifications: true,
                        countryCode: 'us' // Default to US, will be auto-detected
                    });
                    console.log('✅ TuneSwap: Initial configuration saved');
                }
                
                // Create context menu
                if (apis.contextMenus) {
                    chrome.contextMenus.create({
                        id: 'convertSpotifyLink',
                        title: 'Convert to Apple Music',
                        contexts: ['link'],
                        targetUrlPatterns: [
                            '*://open.spotify.com/*',
                            '*://spotify.com/*'
                        ]
                    });
                    console.log('✅ TuneSwap: Context menu created');
                }
            }
        } catch (error) {
            console.error('❌ TuneSwap: Error during installation:', error);
        }
    });
}

// Handle messages from content script
if (apis.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 TuneSwap: Message received:', request.action);
        
        try {
            switch(request.action) {
                case 'convertUrl':
                    handleUrlConversion(request.url, sender, sendResponse);
                    return true; // Keep channel open
                    
                case 'getSettings':
                    if (apis.storage) {
                        chrome.storage.sync.get(['enabled', 'openInNewTab', 'showNotifications', 'countryCode'])
                            .then(result => {
                                console.log('⚙️ TuneSwap: Settings sent:', result);
                                sendResponse(result);
                            })
                            .catch(error => {
                                console.error('❌ TuneSwap: Error getting settings:', error);
                                sendResponse({error: error.message});
                            });
                    } else {
                        sendResponse({error: 'Storage API not available'});
                    }
                    return true;
                    
                case 'saveSettings':
                    if (apis.storage) {
                        chrome.storage.sync.set(request.settings)
                            .then(() => {
                                console.log('✅ TuneSwap: Settings saved:', request.settings);
                                sendResponse({success: true});
                            })
                            .catch(error => {
                                console.error('❌ TuneSwap: Error saving settings:', error);
                                sendResponse({error: error.message});
                            });
                    } else {
                        sendResponse({error: 'Storage API not available'});
                    }
                    return true;
                    
                case 'updateStats':
                    updateConversionStats(sendResponse);
                    return true;
                    
                case 'clearStats':
                    clearStats().then(result => sendResponse(result));
                    return true;
                    
                default:
                    console.warn('⚠️ TuneSwap: Unrecognized action:', request.action);
                    sendResponse({error: 'Unrecognized action'});
            }
        } catch (error) {
            console.error('❌ TuneSwap: Error in message listener:', error);
            sendResponse({error: error.message});
        }
    });
}

// Function to handle URL conversion
async function handleUrlConversion(spotifyUrl, sender, sendResponse) {
    try {
        console.log('🔄 TuneSwap: Processing conversion:', spotifyUrl);
        
        if (!apis.storage) {
            sendResponse({error: 'Storage API not available'});
            return;
        }
        
        // Check if extension is enabled
        const settings = await chrome.storage.sync.get(['enabled']);
        if (!settings.enabled) {
            console.log('⏸️ TuneSwap: Extension disabled');
            sendResponse({error: 'Extension disabled'});
            return;
        }

        // Update statistics
        await updateConversionStats();
        
        console.log('✅ TuneSwap: Conversion processed successfully');
        sendResponse({success: true});
        
    } catch (error) {
        console.error('❌ TuneSwap: Error in conversion:', error);
        sendResponse({error: error.message});
    }
}

// Function to update conversion statistics
async function updateConversionStats(sendResponse = null) {
    try {
        if (!apis.storage) {
            if (sendResponse) sendResponse({error: 'Storage API not available'});
            return;
        }
        
        const stats = await chrome.storage.local.get(['totalCount', 'todayCount', 'lastDate']);
        const today = new Date().toDateString();
        
        const newStats = {
            totalCount: (stats.totalCount || 0) + 1,
            todayCount: (stats.lastDate === today) ? (stats.todayCount || 0) + 1 : 1,
            lastDate: today,
            lastConversion: new Date().toISOString()
        };
        
        await chrome.storage.local.set(newStats);
        console.log('📊 TuneSwap: Statistics updated:', newStats);
        
        if (sendResponse) {
            sendResponse({success: true, stats: newStats});
        }
        
    } catch (error) {
        console.error('❌ TuneSwap: Error updating statistics:', error);
        if (sendResponse) {
            sendResponse({error: error.message});
        }
    }
}

// Set up context menu (only if API is available)
if (apis.contextMenus) {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        console.log('🖱️ TuneSwap: Context menu click:', info.menuItemId);
        
        if (info.menuItemId === 'convertSpotifyLink' && info.linkUrl) {
            try {
                // Try to send message to content script
                if (apis.tabs) {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'convertLink',
                        url: info.linkUrl
                    });
                    console.log('✅ TuneSwap: Message sent to content script');
                } else {
                    throw new Error('Tabs API not available');
                }
            } catch (error) {
                console.error('❌ TuneSwap: Error in context menu:', error);
                
                // Fallback: open Apple Music directly
                try {
                    const searchUrl = 'https://music.apple.com/us/search';
                    await chrome.tabs.create({url: searchUrl});
                    console.log('🔄 TuneSwap: Fallback - opening Apple Music');
                } catch (fallbackError) {
                    console.error('❌ TuneSwap: Error in fallback:', fallbackError);
                }
            }
        }
    });
} else {
    console.warn('⚠️ TuneSwap: contextMenus API not available');
}

// Function to clear statistics
async function clearStats() {
    try {
        if (apis.storage) {
            await chrome.storage.local.clear();
            console.log('🗑️ TuneSwap: Statistics cleared');
            return {success: true};
        } else {
            throw new Error('Storage API not available');
        }
    } catch (error) {
        console.error('❌ TuneSwap: Error clearing statistics:', error);
        return {error: error.message};
    }
}

// Function to verify extension status
function getExtensionStatus() {
    return {
        name: 'TuneSwap',
        apis: apis,
        timestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest().version
    };
}

console.log('✅ TuneSwap: Service worker configured successfully');
console.log('📋 TuneSwap: Extension status:', getExtensionStatus());