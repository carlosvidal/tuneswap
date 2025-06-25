// popup.js - Script del popup de la extensión

document.addEventListener('DOMContentLoaded', async function() {
    await initializePopup();
    setupEventListeners();
});

// Inicializar popup con datos actuales
async function initializePopup() {
    try {
        // Obtener pestaña actual
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        updateCurrentPageInfo(tab);
        
        // Cargar configuraciones
        await loadSettings();
        
        // Cargar estadísticas
        await loadStats();
        
        // Contar links de Spotify en la página actual
        await countSpotifyLinks(tab.id);
        
    } catch (error) {
        console.error('Error inicializando popup:', error);
    }
}

// Actualizar información de la página actual
function updateCurrentPageInfo(tab) {
    const urlElement = document.getElementById('currentUrl');
    const url = new URL(tab.url);
    urlElement.textContent = url.hostname;
}

// Cargar configuraciones guardadas
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get([
            'enabled', 
            'openInNewTab', 
            'showNotifications',
            'countryCode'
        ]);
        
        // Actualizar toggles
        updateToggle('enabledToggle', settings.enabled !== false);
        updateToggle('newTabToggle', settings.openInNewTab !== false);
        updateToggle('notificationsToggle', settings.showNotifications !== false);
        
        // Actualizar selector de país
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            countrySelect.value = settings.countryCode || 'pe';
        }
        
    } catch (error) {
        console.error('Error cargando configuraciones:', error);
    }
}

// Cargar estadísticas
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
        
        document.getElementById('todayCount').textContent = todayCount;
        document.getElementById('totalCount').textContent = stats.totalCount || 0;
        
        const lastConversion = stats.lastConversion;
        if (lastConversion) {
            const date = new Date(lastConversion);
            document.getElementById('lastConversion').textContent = formatRelativeTime(date);
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Contar links de Spotify en la página
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
        document.getElementById('spotifyCount').textContent = count;
        
    } catch (error) {
        console.error('Error contando links:', error);
        document.getElementById('spotifyCount').textContent = '?';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Toggles de configuración
    document.getElementById('enabledToggle').addEventListener('click', () => {
        toggleSetting('enabled', 'enabledToggle');
    });
    
    document.getElementById('newTabToggle').addEventListener('click', () => {
        toggleSetting('openInNewTab', 'newTabToggle');
    });
    
    document.getElementById('notificationsToggle').addEventListener('click', () => {
        toggleSetting('showNotifications', 'notificationsToggle');
    });

    // Selector de país
    document.getElementById('countrySelect').addEventListener('change', async (e) => {
        try {
            await chrome.storage.sync.set({countryCode: e.target.value});
            showTemporaryMessage(`País cambiado a: ${e.target.options[e.target.selectedIndex].text}`);
        } catch (error) {
            console.error('Error guardando país:', error);
        }
    });
    
    // Botones de acción
    document.getElementById('testConversion').addEventListener('click', testConversion);
    document.getElementById('convertAllLinks').addEventListener('click', convertAllLinks);
    document.getElementById('clearStats').addEventListener('click', clearStats);
}

// Actualizar estado de toggle
function updateToggle(toggleId, isActive) {
    const toggle = document.getElementById(toggleId);
    if (isActive) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
}

// Cambiar configuración
async function toggleSetting(settingName, toggleId) {
    try {
        const current = await chrome.storage.sync.get([settingName]);
        const newValue = !current[settingName];
        
        await chrome.storage.sync.set({[settingName]: newValue});
        updateToggle(toggleId, newValue);
        
        // Mostrar feedback
        showTemporaryMessage(`${settingName} ${newValue ? 'habilitado' : 'deshabilitado'}`);
        
    } catch (error) {
        console.error('Error cambiando configuración:', error);
    }
}

// Probar conversión con link de ejemplo
async function testConversion() {
    const testUrl = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
    
    showTemporaryMessage('Probando conversión...');
    
    try {
        // Obtener código de país de la configuración
        const settings = await chrome.storage.sync.get(['countryCode']);
        const countryCode = settings.countryCode || 'pe';
        
        // Obtener metadata real de Spotify
        const response = await fetch(`https://open.spotify.com/embed/track/4iV5W9uYEdYUVa79Axb7Rh`);
        const html = await response.text();
        
        // Extraer título real
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        let title = titleMatch ? titleMatch[1].replace(' | Spotify', '') : 'Never Gonna Give You Up';
        
        // Limpiar título para búsqueda óptima
        title = title
            .replace(/\s*[\(\[].*?[\)\]]/g, '') // Remover paréntesis
            .replace(/\s*(feat|ft|featuring)\.?\s+.*/gi, '') // Remover featuring
            .replace(/\s*-\s*.*$/, '') // Remover todo después de guión
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        console.log('🎵 Título extraído y limpiado:', title);
        console.log('🌍 Usando país:', countryCode);
        
        // Usar código de país configurado
        const appleMusicUrl = `https://music.apple.com/${countryCode}/search?term=${encodeURIComponent(title)}`;
        
        chrome.tabs.create({url: appleMusicUrl});
        showTemporaryMessage('✅ Conversión exitosa - abriendo Apple Music');
        
    } catch (error) {
        console.error('Error en prueba:', error);
        // Fallback con búsqueda simple
        const fallbackUrl = 'https://music.apple.com/pe/search?term=never%20gonna%20give%20you%20up';
        chrome.tabs.create({url: fallbackUrl});
        showTemporaryMessage('✅ Usando búsqueda básica');
    }
}

// Convertir todos los links de la página
async function convertAllLinks() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        showTemporaryMessage('Convirtiendo todos los links...');
        
        await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
                const spotifyLinks = document.querySelectorAll('a[href*="spotify.com"], a[href*="open.spotify.com"]');
                let converted = 0;
                
                spotifyLinks.forEach(link => {
                    // Agregar indicador visual
                    link.style.border = '2px solid #007AFF';
                    link.title = 'Link convertido a Apple Music';
                    converted++;
                });
                
                return converted;
            }
        });
        
        showTemporaryMessage('✅ Links marcados para conversión');
        
    } catch (error) {
        console.error('Error convirtiendo links:', error);
        showTemporaryMessage('❌ Error convirtiendo links');
    }
}

// Limpiar estadísticas
async function clearStats() {
    try {
        await chrome.storage.local.clear();
        await loadStats();
        showTemporaryMessage('📊 Estadísticas limpiadas');
        
    } catch (error) {
        console.error('Error limpiando estadísticas:', error);
        showTemporaryMessage('❌ Error limpiando estadísticas');
    }
}

// Mostrar mensaje temporal
function showTemporaryMessage(message) {
    // Crear elemento de mensaje si no existe
    let messageEl = document.getElementById('tempMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'tempMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
            z-index: 1000;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.opacity = '1';
    
    // Ocultar después de 2 segundos
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 2000);
}

// Formatear tiempo relativo
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
}