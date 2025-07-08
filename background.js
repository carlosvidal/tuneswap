// background.js - TuneSwap Service Worker (Simplified)

console.log('🚀 TuneSwap: Service worker starting...');

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('📦 TuneSwap: Extension installed:', details.reason);
    
    try {
        if (details.reason === 'install') {
            // Set default values
            await chrome.storage.sync.set({
                enabled: true,
                countryCode: 'us' // Default to US, will be auto-detected
            });
            console.log('✅ TuneSwap: Initial configuration saved');
        }
    } catch (error) {
        console.error('❌ TuneSwap: Error during installation:', error);
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 TuneSwap: Message received:', request.action);
    
    try {
        switch(request.action) {
            case 'getSettings':
                chrome.storage.sync.get(['enabled', 'countryCode'])
                    .then(result => {
                        console.log('⚙️ TuneSwap: Settings sent:', result);
                        sendResponse(result);
                    })
                    .catch(error => {
                        console.error('❌ TuneSwap: Error getting settings:', error);
                        sendResponse({error: error.message});
                    });
                return true;
                
            case 'saveSettings':
                chrome.storage.sync.set(request.settings)
                    .then(() => {
                        console.log('✅ TuneSwap: Settings saved:', request.settings);
                        sendResponse({success: true});
                    })
                    .catch(error => {
                        console.error('❌ TuneSwap: Error saving settings:', error);
                        sendResponse({error: error.message});
                    });
                return true;
                
            case 'updateStats':
                updateConversionStats(sendResponse);
                return true;
                
            case 'getStats':
                getConversionStats(sendResponse);
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

// Function to update conversion statistics
async function updateConversionStats(sendResponse = null) {
    try {
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

// Function to get conversion statistics
async function getConversionStats(sendResponse) {
    try {
        const stats = await chrome.storage.local.get([
            'totalCount', 
            'todayCount', 
            'lastDate', 
            'lastConversion'
        ]);
        
        const today = new Date().toDateString();
        const todayCount = (stats.lastDate === today) ? (stats.todayCount || 0) : 0;
        
        const result = {
            totalCount: stats.totalCount || 0,
            todayCount: todayCount,
            lastConversion: stats.lastConversion || null
        };
        
        sendResponse({success: true, stats: result});
        
    } catch (error) {
        console.error('❌ TuneSwap: Error getting statistics:', error);
        sendResponse({error: error.message});
    }
}

// Function to clear statistics
async function clearStats() {
    try {
        await chrome.storage.local.clear();
        console.log('🗑️ TuneSwap: Statistics cleared');
        return {success: true};
    } catch (error) {
        console.error('❌ TuneSwap: Error clearing statistics:', error);
        return {error: error.message};
    }
}

// Function to get extension status
function getExtensionStatus() {
    return {
        name: 'TuneSwap',
        version: chrome.runtime.getManifest().version,
        timestamp: new Date().toISOString(),
        permissions: ['storage'],
        hostPermissions: ['https://open.spotify.com/*', 'https://spotify.com/*']
    };
}

console.log('✅ TuneSwap: Service worker configured successfully');
console.log('📋 TuneSwap: Extension status:', getExtensionStatus());