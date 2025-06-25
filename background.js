// background.js - Service Worker para la extensión

console.log('🚀 Service worker iniciando...');

// Verificar APIs disponibles al iniciar
function checkAPIs() {
    const available = {
        runtime: !!chrome?.runtime,
        storage: !!chrome?.storage,
        contextMenus: !!chrome?.contextMenus,
        tabs: !!chrome?.tabs,
        scripting: !!chrome?.scripting
    };
    
    console.log('📋 APIs disponibles:', available);
    return available;
}

const apis = checkAPIs();

// Manejar instalación de la extensión
if (apis.runtime) {
    chrome.runtime.onInstalled.addListener(async (details) => {
        console.log('📦 Extensión instalada:', details.reason);
        
        try {
            if (details.reason === 'install') {
                // Configurar valores por defecto
                if (apis.storage) {
                    await chrome.storage.sync.set({
                        enabled: true,
                        openInNewTab: true,
                        showNotifications: true
                    });
                    console.log('✅ Configuración inicial guardada');
                }
                
                // Crear menú contextual
                if (apis.contextMenus) {
                    chrome.contextMenus.create({
                        id: 'convertSpotifyLink',
                        title: 'Convertir a Apple Music',
                        contexts: ['link'],
                        targetUrlPatterns: [
                            '*://open.spotify.com/*',
                            '*://spotify.com/*'
                        ]
                    });
                    console.log('✅ Menú contextual creado');
                }
            }
        } catch (error) {
            console.error('❌ Error en instalación:', error);
        }
    });
}

// Manejar mensajes del content script
if (apis.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Mensaje recibido:', request.action);
        
        try {
            switch(request.action) {
                case 'convertUrl':
                    handleUrlConversion(request.url, sender, sendResponse);
                    return true; // Mantener canal abierto
                    
                case 'getSettings':
                    if (apis.storage) {
                        chrome.storage.sync.get(['enabled', 'openInNewTab', 'showNotifications'])
                            .then(result => {
                                console.log('⚙️ Configuración enviada:', result);
                                sendResponse(result);
                            })
                            .catch(error => {
                                console.error('❌ Error obteniendo configuración:', error);
                                sendResponse({error: error.message});
                            });
                    } else {
                        sendResponse({error: 'Storage API no disponible'});
                    }
                    return true;
                    
                case 'saveSettings':
                    if (apis.storage) {
                        chrome.storage.sync.set(request.settings)
                            .then(() => {
                                console.log('✅ Configuración guardada:', request.settings);
                                sendResponse({success: true});
                            })
                            .catch(error => {
                                console.error('❌ Error guardando configuración:', error);
                                sendResponse({error: error.message});
                            });
                    } else {
                        sendResponse({error: 'Storage API no disponible'});
                    }
                    return true;
                    
                case 'updateStats':
                    updateConversionStats(sendResponse);
                    return true;
                    
                default:
                    console.warn('⚠️ Acción no reconocida:', request.action);
                    sendResponse({error: 'Acción no reconocida'});
            }
        } catch (error) {
            console.error('❌ Error en message listener:', error);
            sendResponse({error: error.message});
        }
    });
}

// Función para manejar conversión de URL
async function handleUrlConversion(spotifyUrl, sender, sendResponse) {
    try {
        console.log('🔄 Procesando conversión:', spotifyUrl);
        
        if (!apis.storage) {
            sendResponse({error: 'Storage API no disponible'});
            return;
        }
        
        // Verificar si la extensión está habilitada
        const settings = await chrome.storage.sync.get(['enabled']);
        if (!settings.enabled) {
            console.log('⏸️ Extensión deshabilitada');
            sendResponse({error: 'Extensión deshabilitada'});
            return;
        }

        // Actualizar estadísticas
        await updateConversionStats();
        
        console.log('✅ Conversión procesada exitosamente');
        sendResponse({success: true});
        
    } catch (error) {
        console.error('❌ Error en conversión:', error);
        sendResponse({error: error.message});
    }
}

// Función para actualizar estadísticas de conversión
async function updateConversionStats(sendResponse = null) {
    try {
        if (!apis.storage) {
            if (sendResponse) sendResponse({error: 'Storage API no disponible'});
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
        console.log('📊 Estadísticas actualizadas:', newStats);
        
        if (sendResponse) {
            sendResponse({success: true, stats: newStats});
        }
        
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
        if (sendResponse) {
            sendResponse({error: error.message});
        }
    }
}

// Configurar menú contextual (solo si la API está disponible)
if (apis.contextMenus) {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        console.log('🖱️ Click en menú contextual:', info.menuItemId);
        
        if (info.menuItemId === 'convertSpotifyLink' && info.linkUrl) {
            try {
                // Intentar enviar mensaje al content script
                if (apis.tabs) {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'convertLink',
                        url: info.linkUrl
                    });
                    console.log('✅ Mensaje enviado al content script');
                } else {
                    throw new Error('Tabs API no disponible');
                }
            } catch (error) {
                console.error('❌ Error en menú contextual:', error);
                
                // Fallback: abrir directamente en Apple Music
                try {
                    const searchUrl = 'https://music.apple.com/pe/search';
                    await chrome.tabs.create({url: searchUrl});
                    console.log('🔄 Fallback: abriendo Apple Music');
                } catch (fallbackError) {
                    console.error('❌ Error en fallback:', fallbackError);
                }
            }
        }
    });
} else {
    console.warn('⚠️ contextMenus API no disponible');
}

// Función para limpiar estadísticas
async function clearStats() {
    try {
        if (apis.storage) {
            await chrome.storage.local.clear();
            console.log('🗑️ Estadísticas limpiadas');
            return {success: true};
        } else {
            throw new Error('Storage API no disponible');
        }
    } catch (error) {
        console.error('❌ Error limpiando estadísticas:', error);
        return {error: error.message};
    }
}

// Función para verificar estado de la extensión
function getExtensionStatus() {
    return {
        apis: apis,
        timestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest().version
    };
}

console.log('✅ Service worker configurado correctamente');
console.log('📋 Estado de la extensión:', getExtensionStatus());