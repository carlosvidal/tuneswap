// diagnostic.js - Script para diagnosticar problemas de la extensión

console.log('🔧 Iniciando diagnóstico de la extensión...');

// Función para verificar APIs de Chrome
function checkChromeAPIs() {
    const apis = {
        chrome: typeof chrome !== 'undefined',
        runtime: !!chrome?.runtime,
        storage: !!chrome?.storage,
        contextMenus: !!chrome?.contextMenus,
        tabs: !!chrome?.tabs,
        scripting: !!chrome?.scripting,
        action: !!chrome?.action
    };
    
    console.log('📋 Estado de APIs de Chrome:');
    Object.entries(apis).forEach(([api, available]) => {
        console.log(`  ${available ? '✅' : '❌'} ${api}: ${available}`);
    });
    
    return apis;
}

// Función para verificar permisos del manifest
function checkManifestPermissions() {
    try {
        const manifest = chrome.runtime.getManifest();
        console.log('📄 Manifest version:', manifest.manifest_version);
        console.log('📄 Permisos:', manifest.permissions);
        console.log('📄 Host permissions:', manifest.host_permissions);
        
        return {
            success: true,
            manifest: manifest
        };
    } catch (error) {
        console.error('❌ Error accediendo al manifest:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Función para verificar storage
async function checkStorage() {
    try {
        // Verificar storage sync
        const syncData = await chrome.storage.sync.get();
        console.log('💾 Storage sync data:', syncData);
        
        // Verificar storage local
        const localData = await chrome.storage.local.get();
        console.log('💾 Storage local data:', localData);
        
        return {
            success: true,
            sync: syncData,
            local: localData
        };
    } catch (error) {
        console.error('❌ Error accediendo al storage:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Función para verificar content scripts
function checkContentScripts() {
    const spotifyLinks = document.querySelectorAll('a[href*="spotify.com"], a[href*="open.spotify.com"]');
    console.log(`🔗 Links de Spotify encontrados: ${spotifyLinks.length}`);
    
    spotifyLinks.forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.href}`);
    });
    
    return {
        count: spotifyLinks.length,
        links: Array.from(spotifyLinks).map(link => link.href)
    };
}

// Función para probar conversión
async function testConversion() {
    const testUrl = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
    
    try {
        console.log('🧪 Probando conversión con:', testUrl);
        
        // Simular extracción de info
        const spotifyInfo = extractSpotifyInfo(testUrl);
        console.log('📊 Info extraída:', spotifyInfo);
        
        if (spotifyInfo) {
            // Simular conversión
            const appleMusicUrl = `https://music.apple.com/search?term=${encodeURIComponent('Never Gonna Give You Up Rick Astley')}`;
            console.log('✅ URL de Apple Music:', appleMusicUrl);
            
            return {
                success: true,
                original: testUrl,
                converted: appleMusicUrl
            };
        } else {
            throw new Error('No se pudo extraer información del link');
        }
        
    } catch (error) {
        console.error('❌ Error en prueba de conversión:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Función auxiliar para extraer info de Spotify (copia de content.js)
function extractSpotifyInfo(url) {
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

// Función principal de diagnóstico
async function runDiagnostic() {
    console.log('🚀 === DIAGNÓSTICO DE EXTENSIÓN ===');
    
    const results = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
    };
    
    console.log('🌐 URL actual:', results.url);
    console.log('🖥️ User Agent:', results.userAgent);
    
    // 1. Verificar APIs
    results.apis = checkChromeAPIs();
    
    // 2. Verificar manifest
    results.manifest = checkManifestPermissions();
    
    // 3. Verificar storage
    results.storage = await checkStorage();
    
    // 4. Verificar content scripts
    results.contentScripts = checkContentScripts();
    
    // 5. Probar conversión
    results.conversionTest = await testConversion();
    
    console.log('📊 === RESUMEN DEL DIAGNÓSTICO ===');
    console.log(JSON.stringify(results, null, 2));
    
    // Generar recomendaciones
    generateRecommendations(results);
    
    return results;
}

// Función para generar recomendaciones
function generateRecommendations(results) {
    console.log('💡 === RECOMENDACIONES ===');
    
    const recommendations = [];
    
    if (!results.apis.chrome) {
        recommendations.push('❌ APIs de Chrome no disponibles - Verificar que se esté ejecutando como extensión');
    }
    
    if (!results.apis.runtime) {
        recommendations.push('❌ chrome.runtime no disponible - Verificar manifest.json');
    }
    
    if (!results.apis.storage) {
        recommendations.push('❌ chrome.storage no disponible - Añadir permiso "storage" al manifest');
    }
    
    if (!results.apis.contextMenus) {
        recommendations.push('❌ chrome.contextMenus no disponible - Añadir permiso "contextMenus" al manifest');
    }
    
    if (!results.manifest.success) {
        recommendations.push('❌ Error accediendo al manifest - Verificar sintaxis del manifest.json');
    }
    
    if (!results.storage.success) {
        recommendations.push('❌ Error accediendo al storage - Verificar permisos de storage');
    }
    
    if (results.contentScripts.count === 0) {
        recommendations.push('💡 No se encontraron links de Spotify en esta página - Probar en una página con links de Spotify');
    }
    
    if (!results.conversionTest.success) {
        recommendations.push('❌ Prueba de conversión falló - Verificar función extractSpotifyInfo');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('✅ Todo parece estar funcionando correctamente');
    }
    
    recommendations.forEach(rec => console.log(rec));
}

// Ejecutar diagnóstico automáticamente
runDiagnostic().then(results => {
    console.log('🏁 Diagnóstico completado');
    
    // Enviar resultados al background script si está disponible
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
            action: 'diagnosticResults',
            results: results
        }).catch(error => {
            console.warn('⚠️ No se pudo enviar resultados al background script:', error);
        });
    }
}).catch(error => {
    console.error('❌ Error ejecutando diagnóstico:', error);
});

// Exportar función para uso manual
if (typeof window !== 'undefined') {
    window.spotifyDiagnostic = runDiagnostic;
    console.log('💡 Puedes ejecutar window.spotifyDiagnostic() para correr el diagnóstico manualmente');
}