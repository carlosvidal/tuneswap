// content.js - Intercepta clicks en links de Spotify
(function() {
    'use strict';
    
    console.log('🎵 Spotify to Apple Music converter cargado');

    // Función para extraer información de un link de Spotify
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
            console.error('❌ Error extrayendo info de Spotify:', error);
            return null;
        }
    }

    // Función alternativa para obtener metadata usando oembed
    async function getSpotifyMetadataOembed(type, id) {
        try {
            console.log(`🔍 Intentando oembed para ${type}:${id}`);
            
            const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/${type}/${id}`;
            console.log('📡 Oembed URL:', oembedUrl);
            
            const response = await fetch(oembedUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📄 Oembed data:', data);
            
            if (data.title) {
                let title = '';
                let artist = '';
                
                // El formato típico es "Song by Artist" en oembed
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
            console.warn('⚠️ Oembed fallido:', error);
            return null;
        }
    }

    // Función principal de obtención de metadata con múltiples métodos
    async function getSpotifyMetadata(type, id) {
        console.log(`🔍 Iniciando extracción de metadata para ${type}:${id}`);
        
        // Método 1: Intentar oembed primero (más confiable)
        let metadata = await getSpotifyMetadataOembed(type, id);
        if (metadata && metadata.title) {
            console.log('✅ Metadata obtenida via oembed:', metadata);
            return metadata;
        }
        
        // Método 2: Fallback a embed HTML scraping
        metadata = await getSpotifyMetadataEmbed(type, id);
        if (metadata && metadata.title) {
            console.log('✅ Metadata obtenida via embed:', metadata);
            return metadata;
        }
        
        // Método 3: Último recurso - usar el ID como título
        console.warn('⚠️ No se pudo obtener metadata, usando ID como título');
        return {
            title: `track_${id}`,
            artist: '',
            album: '',
            type
        };
    }

    // Función para obtener metadata via embed (renombrada del método anterior)
    async function getSpotifyMetadataEmbed(type, id) {
        try {
            console.log(`🔍 Obteniendo metadata para ${type}:${id}`);
            
            // Construir URL correcta
            const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
            console.log('📡 Fetching URL:', embedUrl);
            
            const response = await fetch(embedUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const html = await response.text();
            console.log('📄 HTML length:', html.length);
            
            // Método 1: Extraer del título de la página
            let title = '';
            let artist = '';
            let album = '';
            
            // Debug: mostrar parte del HTML
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            console.log('🔍 Title match:', titleMatch);
            
            if (titleMatch) {
                const fullTitle = titleMatch[1].replace(' | Spotify', '');
                console.log('📝 Full title from HTML:', fullTitle);
                
                // Intentar diferentes formatos de título
                // Formato 1: "Song by Artist"
                const byMatch = fullTitle.match(/^(.+?)\s+by\s+(.+)$/i);
                if (byMatch) {
                    title = byMatch[1].trim();
                    artist = byMatch[2].trim();
                    console.log('✅ Parsed "by" format - Title:', title, 'Artist:', artist);
                }
                // Formato 2: "Artist - Song" 
                else {
                    const dashMatch = fullTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
                    if (dashMatch) {
                        artist = dashMatch[1].trim();
                        title = dashMatch[2].trim();
                        console.log('✅ Parsed dash format - Artist:', artist, 'Title:', title);
                    } else {
                        // Solo título
                        title = fullTitle;
                        console.log('✅ Using full title:', title);
                    }
                }
            }
            
            // Método 2: Buscar metadata específica
            const metaArtist = html.match(/property="music:musician"[^>]*content="([^"]+)"/);
            const metaAlbum = html.match(/property="music:album"[^>]*content="([^"]+)"/);
            const metaTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/);
            
            console.log('🏷️ Meta artist:', metaArtist ? metaArtist[1] : 'none');
            console.log('🏷️ Meta album:', metaAlbum ? metaAlbum[1] : 'none');
            console.log('🏷️ Meta title:', metaTitle ? metaTitle[1] : 'none');
            
            // Usar metadata si está disponible y es mejor
            if (metaArtist && metaArtist[1]) artist = metaArtist[1];
            if (metaAlbum && metaAlbum[1]) album = metaAlbum[1];
            if (metaTitle && metaTitle[1] && !title) title = metaTitle[1];
            
            // Método 3: Buscar en script tags o JSON
            const scriptMatch = html.match(/<script[^>]*>.*?"name":\s*"([^"]+)".*?<\/script>/s);
            if (scriptMatch) {
                console.log('📜 Found name in script:', scriptMatch[1]);
                if (!title) title = scriptMatch[1];
            }
            
            const metadata = {
                title: title || '',
                artist: artist || '',
                album: album || '',
                type
            };
            
            console.log('✅ Final metadata extracted:', metadata);
            
            // Verificar que tenemos datos útiles
            if (!metadata.title && !metadata.artist) {
                console.warn('⚠️ No useful metadata found, trying fallback');
                return null;
            }
            
            return metadata;
            
        } catch (error) {
            console.error('❌ Error obteniendo metadata de Spotify:', error);
            return null;
        }
    }

    // Función para detectar código de país del usuario
    async function getCountryCode() {
        try {
            // Primero intentar obtener de la configuración guardada
            const settings = await chrome.storage.sync.get(['countryCode']);
            if (settings.countryCode) {
                console.log('✅ Usando país configurado:', settings.countryCode);
                return settings.countryCode;
            }
        } catch (error) {
            console.warn('⚠️ No se pudo acceder a la configuración:', error);
        }
        
        // Para debugging, vamos a mostrar la información del navegador
        const language = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        console.log('🌍 Idioma del navegador:', language);
        console.log('🕐 Timezone:', timezone);
        
        // Forzar PE para Perú por ahora - después podemos hacer esto configurable
        // Si el timezone incluye Lima o el idioma es español, usar PE
        if (timezone.includes('Lima') || language.startsWith('es')) {
            console.log('✅ Usando código de país: pe');
            return 'pe';
        }
        
        // Para otros casos, usar US como fallback
        console.log('⚠️ Usando fallback: us');
        return 'us';
    }

    // Función para crear URL de búsqueda en Apple Music
    async function createAppleMusicSearchUrl(metadata) {
        try {
            let searchQuery = '';
            
            switch(metadata.type) {
                case 'track':
                    // Para tracks, priorizar solo el título si es muy específico
                    if (metadata.title && metadata.title.length > 0) {
                        // Limpiar el título de caracteres especiales y "feat", "ft", etc.
                        let cleanTitle = metadata.title
                            .replace(/\s*[\(\[].*?[\)\]]/g, '') // Remover paréntesis y corchetes
                            .replace(/\s*(feat|ft|featuring)\.?\s+.*/gi, '') // Remover featuring
                            .replace(/\s*-\s*.*$/, '') // Remover todo después de guión
                            .trim();
                        
                        searchQuery = cleanTitle;
                        
                        // Solo añadir artista si el título es muy corto o genérico
                        if (cleanTitle.length < 15 && metadata.artist) {
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

            // Limpiar y simplificar la búsqueda
            searchQuery = searchQuery
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
                .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
                .trim();

            console.log('🔍 Búsqueda final:', searchQuery);
            
            // Detectar código de país
            const countryCode = await getCountryCode();
            console.log('🌍 País detectado:', countryCode);

            // Crear URL de búsqueda de Apple Music con código de país detectado
            return `https://music.apple.com/${countryCode}/search?term=${encodeURIComponent(searchQuery)}`;
            
        } catch (error) {
            console.error('❌ Error creando URL de Apple Music:', error);
            return await createFallbackUrl();
        }
    }

    // Función para crear URL de fallback
    async function createFallbackUrl() {
        const countryCode = await getCountryCode();
        return `https://music.apple.com/${countryCode}/search`;
    }

    // Función principal para convertir link
    async function convertSpotifyToAppleMusic(spotifyUrl) {
        try {
            console.log('🔄 Iniciando conversión:', spotifyUrl);
            
            // Mostrar loading
            showLoadingIndicator();
            
            const spotifyInfo = extractSpotifyInfo(spotifyUrl);
            if (!spotifyInfo) {
                console.error('❌ No se pudo extraer información del link de Spotify');
                hideLoadingIndicator();
                return createFallbackUrl();
            }

            // Obtener metadata de Spotify
            const metadata = await getSpotifyMetadata(spotifyInfo.type, spotifyInfo.id);
            if (!metadata || !metadata.title) {
                console.warn('⚠️ No se pudo obtener metadata, usando fallback');
                hideLoadingIndicator();
                return createFallbackUrl();
            }

            // Buscar en Apple Music
            const appleMusicUrl = createAppleMusicSearchUrl(metadata);
            
            hideLoadingIndicator();
            console.log('✅ Conversión exitosa:', appleMusicUrl);
            
            // Notificar al background script
            try {
                chrome.runtime.sendMessage({
                    action: 'updateStats'
                });
            } catch (error) {
                console.warn('⚠️ No se pudo actualizar estadísticas:', error);
            }
            
            return appleMusicUrl;
            
        } catch (error) {
            console.error('❌ Error en conversión:', error);
            hideLoadingIndicator();
            return createFallbackUrl();
        }
    }

    // Indicador de carga simple
    function showLoadingIndicator() {
        if (document.getElementById('spotify-apple-loading')) return;
        
        const loading = document.createElement('div');
        loading.id = 'spotify-apple-loading';
        loading.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007AFF;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        loading.textContent = '🔄 Convirtiendo a Apple Music...';
        document.body.appendChild(loading);
    }

    function hideLoadingIndicator() {
        const loading = document.getElementById('spotify-apple-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Interceptar clicks en links
    document.addEventListener('click', async function(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;

        // Verificar si es un link de Spotify
        if (link.href.includes('open.spotify.com') || link.href.includes('spotify.com')) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎵 Link de Spotify interceptado:', link.href);
            
            const appleMusicUrl = await convertSpotifyToAppleMusic(link.href);
            
            if (appleMusicUrl) {
                console.log('✅ Abriendo en Apple Music:', appleMusicUrl);
                window.open(appleMusicUrl, '_blank');
            } else {
                console.warn('⚠️ Usando fallback');
                window.open(createFallbackUrl(), '_blank');
            }
        }
    });

    // Escuchar mensajes del background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 Mensaje recibido del background:', request);
            
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
                    console.error('❌ Error procesando mensaje:', error);
                    sendResponse({success: false, error: error.message});
                });
                
                return true; // Mantener canal abierto
            }
        });
    }

    console.log('✅ Spotify to Apple Music converter configurado correctamente');
})();