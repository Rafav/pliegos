/**
 * BACKGROUND.JS - Metabuscador de Pliegos v2.0
 * Service Worker para gestión de pestañas, scraping y notificaciones
 */

// ============================================
// ESTADO GLOBAL DEL SCRAPING
// ============================================

let scrapingState = {
  activo: false,
  query: '',
  totalFuentes: 0,
  completadas: 0,
  resultados: [],
  errores: [],
  inicioTimestamp: null,
  tabsIds: []
};

// ============================================
// MESSAGE LISTENER
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensaje recibido:', request.action);

  if (request.action === 'openTabs') {
    abrirMultiplesTabs(request.urls, request.newWindow)
      .then(() => {
        console.log('✅ Pestañas abiertas correctamente');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('❌ Error al abrir tabs:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Mantener canal abierto
  }

  if (request.action === 'searchWithScraping') {
    buscarConScraping(request.query, request.urls, request.newWindow, request.fuentesInfo)
      .then(resultado => sendResponse(resultado))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Mantener canal abierto
  }

  if (request.action === 'scrapingCompleto') {
    manejarResultadoScraping(request, sender);
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'scrapingError') {
    manejarErrorScraping(request, sender);
    sendResponse({ success: true });
    return false;
  }
});

// ============================================
// FUNCIONES PRINCIPALES V2.0
// ============================================

/**
 * Búsqueda con scraping (v2.0)
 */
async function buscarConScraping(query, urls, newWindow = false, fuentesInfo = []) {
  console.log(`🚀 Iniciando búsqueda con scraping: "${query}"`);

  // Inicializar estado
  scrapingState = {
    activo: true,
    query: query,
    totalFuentes: urls.length,
    completadas: 0,
    resultados: [],
    errores: [],
    inicioTimestamp: Date.now(),
    tabsIds: []
  };

  try {
    // Abrir pestañas
    const tabs = await abrirPestanasParaScraping(urls, newWindow);
    scrapingState.tabsIds = tabs.map(t => t.id);
    console.log(`📂 ${tabs.length} pestañas abiertas para scraping`);

    // Inyectar content scripts cuando carguen
    for (const tab of tabs) {
      inyectarScraperCuandoCargue(tab.id);
    }

    // Actualizar badge
    actualizarBadge();

    return {
      success: true,
      tabsAbiertos: tabs.length,
      message: 'Scraping iniciado'
    };

  } catch (error) {
    console.error('❌ Error en búsqueda con scraping:', error);
    scrapingState.activo = false;
    throw error;
  }
}

/**
 * Abrir pestañas para scraping
 */
async function abrirPestanasParaScraping(urls, newWindow = false) {
  const tabs = [];

  if (newWindow) {
    // Crear ventana nueva con todas las pestañas
    const ventana = await chrome.windows.create({ url: urls[0] });
    tabs.push(ventana.tabs[0]);

    for (let i = 1; i < urls.length; i++) {
      const tab = await chrome.tabs.create({
        url: urls[i],
        windowId: ventana.id,
        active: false
      });
      tabs.push(tab);
      await delay(150);
    }
  } else {
    // Crear pestañas en ventana actual
    for (const url of urls) {
      const tab = await chrome.tabs.create({ url, active: false });
      tabs.push(tab);
      await delay(150);
    }
  }

  return tabs;
}

/**
 * Inyectar content script cuando la pestaña termine de cargar
 */
function inyectarScraperCuandoCargue(tabId) {
  chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
    if (updatedTabId === tabId && info.status === 'complete') {
      // Inyectar script
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content-scraper.js']
      }).then(() => {
        console.log(`✅ Script inyectado en tab ${tabId}`);
      }).catch(error => {
        console.error(`❌ Error inyectando script en tab ${tabId}:`, error);
        scrapingState.errores.push({
          tabId: tabId,
          error: error.message
        });
        verificarSiTermino();
      });

      // Remover listener después de inyectar
      chrome.tabs.onUpdated.removeListener(listener);
    }
  });

  // Timeout: si no carga en 30s, marcar como error
  setTimeout(() => {
    if (scrapingState.activo && !scrapingState.resultados.find(r => r.tabId === tabId)) {
      console.warn(`⏱️ Timeout: Tab ${tabId} no respondió en 30s`);
      scrapingState.errores.push({
        tabId: tabId,
        error: 'Timeout al cargar página'
      });
      verificarSiTermino();
    }
  }, 30000);
}

/**
 * Manejar resultado de scraping
 */
function manejarResultadoScraping(request, sender) {
  const tabId = sender.tab?.id;
  console.log(`📊 Resultados recibidos de tab ${tabId} (${request.fuente}):`, request.resultados.length);

  scrapingState.resultados.push({
    tabId: tabId,
    fuente: request.fuente,
    hostname: request.hostname,
    datos: request.resultados,
    timestamp: request.timestamp
  });

  scrapingState.completadas++;

  // Actualizar badge con progreso
  actualizarBadge();

  // Verificar si terminaron todas
  verificarSiTermino();
}

/**
 * Manejar error de scraping
 */
function manejarErrorScraping(request, sender) {
  const tabId = sender.tab?.id;
  console.error(`❌ Error en tab ${tabId} (${request.fuente}):`, request.error);

  scrapingState.errores.push({
    tabId: tabId,
    fuente: request.fuente,
    hostname: request.hostname,
    error: request.error,
    timestamp: request.timestamp
  });

  scrapingState.completadas++;

  actualizarBadge();
  verificarSiTermino();
}

/**
 * Verificar si terminó el scraping
 */
function verificarSiTermino() {
  const totalProcesado = scrapingState.completadas;

  if (totalProcesado >= scrapingState.totalFuentes) {
    finalizarScraping();
  }
}

/**
 * Finalizar scraping y mostrar notificación
 */
function finalizarScraping() {
  if (!scrapingState.activo) return; // Ya finalizado

  scrapingState.activo = false;

  const tiempoTotal = Date.now() - scrapingState.inicioTimestamp;
  const totalResultados = scrapingState.resultados.reduce((sum, r) => sum + r.datos.length, 0);
  const fuentesExitosas = scrapingState.resultados.length;
  const fuentesFallidas = scrapingState.errores.length;

  console.log(`
    ✅ SCRAPING COMPLETADO
    ⏱️  Tiempo: ${(tiempoTotal / 1000).toFixed(1)}s
    📊 Resultados: ${totalResultados}
    ✅ Exitosas: ${fuentesExitosas}/${scrapingState.totalFuentes}
    ❌ Fallidas: ${fuentesFallidas}
  `);

  // Mostrar notificación
  mostrarNotificacion(totalResultados, fuentesExitosas, fuentesFallidas);

  // Limpiar badge
  chrome.action.setBadgeText({ text: '' });

  // Guardar resultados para el popup
  chrome.storage.local.set({
    ultimoScraping: {
      query: scrapingState.query,
      resultados: scrapingState.resultados,
      errores: scrapingState.errores,
      timestamp: Date.now(),
      tiempoTotal: tiempoTotal
    }
  });
}

/**
 * Actualizar badge con progreso
 */
function actualizarBadge() {
  const progreso = `${scrapingState.completadas}/${scrapingState.totalFuentes}`;
  chrome.action.setBadgeText({ text: progreso });
  chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
}

/**
 * Mostrar notificación
 */
function mostrarNotificacion(totalResultados, exitosas, fallidas) {
  let mensaje;

  if (fallidas === 0) {
    mensaje = `Se encontraron ${totalResultados} resultados en ${exitosas} fuentes`;
  } else {
    mensaje = `${totalResultados} resultados (${exitosas} fuentes OK, ${fallidas} fallidas)`;
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '✅ Búsqueda completada',
    message: mensaje,
    priority: 2,
    requireInteraction: false
  }, (notificationId) => {
    console.log('🔔 Notificación mostrada:', notificationId);

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 5000);
  });
}

/**
 * Click en notificación → Abrir popup con resultados
 */
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notificación clickeada:', notificationId);
  chrome.action.openPopup();
});

// ============================================
// FUNCIONES TRADICIONALES (SIN SCRAPING)
// ============================================

/**
 * Abrir múltiples pestañas
 * @param {Array<string>} urls - Array de URLs a abrir
 * @param {boolean} newWindow - Si debe abrir en ventana nueva
 */
async function abrirMultiplesTabs(urls, newWindow = false) {
  if (!urls || urls.length === 0) {
    throw new Error('No hay URLs para abrir');
  }

  console.log(`🚀 Abriendo ${urls.length} pestañas (newWindow: ${newWindow})`);

  try {
    if (newWindow) {
      // Opción 1: Abrir en ventana nueva
      await abrirEnVentanaNueva(urls);
    } else {
      // Opción 2: Abrir en ventana actual
      await abrirEnVentanaActual(urls);
    }
  } catch (error) {
    console.error('Error en abrirMultiplesTabs:', error);
    throw error;
  }
}

/**
 * Abrir pestañas en ventana nueva
 */
async function abrirEnVentanaNueva(urls) {
  // Crear ventana con la primera URL
  const nuevaVentana = await chrome.windows.create({
    url: urls[0],
    focused: true,
    type: 'normal'
  });

  console.log(`📱 Ventana creada: ${nuevaVentana.id}`);

  // Añadir las demás URLs como pestañas en esa ventana
  for (let i = 1; i < urls.length; i++) {
    await chrome.tabs.create({
      url: urls[i],
      windowId: nuevaVentana.id,
      active: false
    });
    
    // Pequeño delay para evitar sobrecarga
    await delay(100);
  }

  console.log(`✅ ${urls.length} pestañas creadas en nueva ventana`);
}

/**
 * Abrir pestañas en ventana actual
 */
async function abrirEnVentanaActual(urls) {
  const ventanaActual = await chrome.windows.getCurrent();
  
  console.log(`📱 Ventana actual: ${ventanaActual.id}`);

  let primeraPestañaId = null;

  // Crear todas las pestañas
  for (let i = 0; i < urls.length; i++) {
    const nuevaPestaña = await chrome.tabs.create({
      url: urls[i],
      windowId: ventanaActual.id,
      active: i === 0 // Solo la primera está activa
    });

    if (i === 0) {
      primeraPestañaId = nuevaPestaña.id;
    }

    // Pequeño delay entre pestañas
    await delay(100);
  }

  // Activar la primera pestaña creada
  if (primeraPestañaId) {
    await chrome.tabs.update(primeraPestañaId, { active: true });
  }

  console.log(`✅ ${urls.length} pestañas creadas en ventana actual`);
}

/**
 * Agrupar pestañas (Chrome 89+)
 * Agrupa todas las pestañas del metabuscador
 */
async function agruparPestañas(tabIds) {
  try {
    // Verificar si Tab Groups API está disponible
    if (chrome.tabGroups) {
      const groupId = await chrome.tabs.group({ tabIds: tabIds });
      
      await chrome.tabGroups.update(groupId, {
        title: '📚 Pliegos',
        color: 'purple',
        collapsed: false
      });
      
      console.log(`📁 Pestañas agrupadas: ${tabIds.length}`);
    }
  } catch (error) {
    console.warn('No se pudieron agrupar las pestañas:', error);
  }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// INSTALACIÓN Y ACTUALIZACIÓN
// ============================================

// Al instalar la extensión
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 Extensión instalada/actualizada:', details.reason);
  
  if (details.reason === 'install') {
    // Primera instalación
    console.log('🎉 ¡Bienvenido al Metabuscador de Pliegos!');
    
    // Abrir página de bienvenida (opcional)
    // chrome.tabs.create({ url: 'welcome.html' });
    
    // Configuración inicial
    chrome.storage.local.set({
      selectedSources: ['bne', 'cordel', 'mapping', 'aracne'],
      openMode: 'tabs',
      installDate: new Date().toISOString()
    });
  } else if (details.reason === 'update') {
    console.log(`📱 Actualizado a versión ${chrome.runtime.getManifest().version}`);
  }
});

// Al iniciar Chrome
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Chrome iniciado - Service Worker activo');
});

// ============================================
// ATAJOS DE TECLADO (opcional)
// ============================================

chrome.commands.onCommand.addListener((command) => {
  console.log(`⌨️ Comando recibido: ${command}`);
  
  if (command === '_execute_action') {
    // Abrir popup (manejado automáticamente por Chrome)
    console.log('Abriendo popup via atajo');
  }
});

// ============================================
// ESTADÍSTICAS (opcional)
// ============================================

/**
 * Guardar estadísticas de uso
 */
async function registrarBusqueda(numTabs) {
  try {
    const data = await chrome.storage.local.get(['totalSearches', 'totalTabs']);
    
    await chrome.storage.local.set({
      totalSearches: (data.totalSearches || 0) + 1,
      totalTabs: (data.totalTabs || 0) + numTabs,
      lastSearch: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al registrar estadísticas:', error);
  }
}

// ============================================
// LOG INICIAL
// ============================================

console.log('📚 Metabuscador de Pliegos - Service Worker iniciado');
console.log(`Versión: ${chrome.runtime.getManifest().version}`);
console.log(`Manifest: V${chrome.runtime.getManifest().manifest_version}`);
