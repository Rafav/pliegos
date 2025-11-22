/**
 * POPUP.JS - Metabuscador de Pliegos
 * Lógica de la interfaz de usuario
 */

// Configuración de fuentes con URLs de búsqueda y soporte de paginación
const SOURCES = {
  bne: {
    name: 'BNE Digital',
    url: 'https://bnedigital.bne.es/bd/es/results?y=s&w={query}&f=ficha&g=ws',
    pagination: {
      type: 'page',
      param: 'p',
      resultsPerPage: 20,
      urlTemplate: 'https://bnedigital.bne.es/bd/es/results?y=s&w={query}&f=ficha&g=ws&p={page}'
    }
  },
  cordel: {
    name: 'Desenrollando el cordel',
    url: 'https://desenrollandoelcordel.unige.ch/search.html?query={query}&start=1',
    pagination: {
      type: 'start',
      param: 'start',
      resultsPerPage: 10,
      urlTemplate: 'https://desenrollandoelcordel.unige.ch/search.html?query={query}&start={start}'
    }
  },
  mapping: {
    name: 'Mapping Pliegos',
    url: 'https://biblioteca.cchs.csic.es/MappingPliegos/resultadobusquedavanzada.php?TITULO={query}',
    pagination: {
      type: 'page',
      param: 'pagina',
      resultsPerPage: 20,
      urlTemplate: 'https://biblioteca.cchs.csic.es/MappingPliegos/resultadobusquedavanzada.php?TITULO={query}&pagina={page}'
    }
  },
  aracne: {
    name: 'Red-aracne',
    url: 'https://www.red-aracne.es/busqueda/resultados.htm?av=true&tituloDescricion={query}',
    pagination: {
      type: 'page',
      param: 'pagina',
      resultsPerPage: 15,
      urlTemplate: 'https://www.red-aracne.es/busqueda/resultados.htm?av=true&tituloDescricion={query}&pagina={page}'
    }
  },
  funjdiaz: {
    name: 'Fundación Joaquín Díaz',
    url: 'https://funjdiaz.net/pliegos-listado.php?t={query}',
    pagination: {
      type: 'offset',
      param: 'offset',
      resultsPerPage: 50,
      urlTemplate: 'https://funjdiaz.net/pliegos-listado.php?t={query}&offset={offset}'
    }
  }
};

// Elementos del DOM
const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('searchBtn');
const selectAllBtn = document.getElementById('selectAll');
const selectNoneBtn = document.getElementById('selectNone');
const statusDiv = document.getElementById('status');
const sourceCheckboxes = document.querySelectorAll('.source-item input[type="checkbox"]');
const quickBtns = document.querySelectorAll('.quick-btn');
const modeRadios = document.querySelectorAll('input[name="mode"]');

// Elementos nuevos v2.0
const enablePaginationCheckbox = document.getElementById('enablePagination');
const paginationSettings = document.getElementById('paginationSettings');
const pagesPerSourceSelect = document.getElementById('pagesPerSource');
const enableScrapingCheckbox = document.getElementById('enableScraping');
const resumenResultadosDiv = document.getElementById('resumenResultados');
const resumenContenidoDiv = document.getElementById('resumenContenido');
const cerrarResumenBtn = document.getElementById('cerrarResumen');

// ============================================
// EVENT LISTENERS
// ============================================

// Búsqueda principal
searchBtn.addEventListener('click', realizarBusqueda);
queryInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') realizarBusqueda();
});

// Seleccionar todas/ninguna fuente
selectAllBtn.addEventListener('click', () => {
  sourceCheckboxes.forEach(cb => cb.checked = true);
  guardarEstado();
});

selectNoneBtn.addEventListener('click', () => {
  sourceCheckboxes.forEach(cb => cb.checked = false);
  guardarEstado();
});

// Búsquedas rápidas
quickBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    queryInput.value = btn.dataset.query;
    realizarBusqueda();
  });
});

// Guardar selección de fuentes al cambiar
sourceCheckboxes.forEach(cb => {
  cb.addEventListener('change', guardarEstado);
});

// Guardar modo al cambiar
modeRadios.forEach(radio => {
  radio.addEventListener('change', guardarEstado);
});

// ============================================
// EVENT LISTENERS V2.0 (Paginación y Scraping)
// ============================================

// Mostrar/ocultar configuración de paginación
enablePaginationCheckbox.addEventListener('change', () => {
  paginationSettings.style.display = enablePaginationCheckbox.checked ? 'block' : 'none';
  guardarEstado();
});

// Guardar páginas por fuente
pagesPerSourceSelect.addEventListener('change', guardarEstado);

// Guardar opción de scraping
enableScrapingCheckbox.addEventListener('change', guardarEstado);

// Cerrar resumen
cerrarResumenBtn.addEventListener('click', () => {
  resumenResultadosDiv.style.display = 'none';
});

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Realizar búsqueda en las fuentes seleccionadas (v2.0 con paginación y scraping)
 */
async function realizarBusqueda() {
  const query = queryInput.value.trim();

  // Validación
  if (!query) {
    mostrarEstado('⚠️ Por favor, introduce un término de búsqueda', 'error');
    queryInput.focus();
    return;
  }

  // Obtener fuentes seleccionadas
  const fuentesSeleccionadas = Array.from(sourceCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (fuentesSeleccionadas.length === 0) {
    mostrarEstado('⚠️ Selecciona al menos una fuente', 'error');
    return;
  }

  // Obtener opciones de paginación
  const paginacionHabilitada = enablePaginationCheckbox.checked;
  const paginasPorFuente = paginacionHabilitada ? parseInt(pagesPerSourceSelect.value) : 1;

  // Construir URLs (con paginación si está habilitada)
  const urls = construirURLsConPaginacion(fuentesSeleccionadas, query, paginasPorFuente);

  if (urls.length === 0) {
    mostrarEstado('❌ Error al construir URLs', 'error');
    return;
  }

  // Obtener modo de apertura
  const modeChecked = document.querySelector('input[name="mode"]:checked');
  const openInNewWindow = modeChecked ? modeChecked.value === 'window' : false;

  // Verificar si scraping está habilitado
  const scrapingHabilitado = enableScrapingCheckbox.checked;

  // Mostrar estado de carga
  const totalPestanas = urls.length;
  const mensajePaginacion = paginacionHabilitada ? ` (${paginasPorFuente} página${paginasPorFuente > 1 ? 's' : ''} por fuente)` : '';
  mostrarEstado(`⏳ Abriendo ${totalPestanas} pestaña${totalPestanas > 1 ? 's' : ''}${mensajePaginacion}...`, 'success');
  searchBtn.disabled = true;

  // Guardar última búsqueda
  guardarUltimaBusqueda(query);

  try {
    if (scrapingHabilitado) {
      // Modo con scraping: enviar acción especial
      const response = await chrome.runtime.sendMessage({
        action: 'searchWithScraping',
        query: query,
        urls: urls,
        newWindow: openInNewWindow,
        fuentesInfo: obtenerInfoFuentes(fuentesSeleccionadas)
      });

      if (response && response.success) {
        mostrarEstado('🔍 Scraping en progreso...', 'success');

        // Escuchar progreso del scraping
        escucharProgresoScraping();
      } else {
        mostrarEstado('❌ Error al iniciar scraping', 'error');
        searchBtn.disabled = false;
      }
    } else {
      // Modo tradicional: solo abrir pestañas
      const response = await chrome.runtime.sendMessage({
        action: 'openTabs',
        urls: urls,
        newWindow: openInNewWindow
      });

      if (response && response.success) {
        mostrarEstado(`✅ ${totalPestanas} pestaña${totalPestanas > 1 ? 's' : ''} abierta${totalPestanas > 1 ? 's' : ''}`, 'success');

        // Cerrar popup después de 1 segundo
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        mostrarEstado('❌ Error al abrir pestañas', 'error');
        searchBtn.disabled = false;
      }
    }
  } catch (error) {
    console.error('Error en búsqueda:', error);
    mostrarEstado('❌ Error: ' + error.message, 'error');
    searchBtn.disabled = false;
  }
}

/**
 * Construir URLs con paginación
 */
function construirURLsConPaginacion(fuentesSeleccionadas, query, paginas) {
  const urls = [];

  fuentesSeleccionadas.forEach(sourceId => {
    const source = SOURCES[sourceId];
    if (!source) {
      console.warn(`Fuente no encontrada: ${sourceId}`);
      return;
    }

    // Para cada fuente, generar URLs para cada página
    for (let pagina = 1; pagina <= paginas; pagina++) {
      let url;

      if (pagina === 1) {
        // Primera página: usar URL base
        url = source.url.replace('{query}', encodeURIComponent(query));
      } else {
        // Páginas siguientes: usar template de paginación
        const pagination = source.pagination;
        if (!pagination) continue;

        url = pagination.urlTemplate.replace('{query}', encodeURIComponent(query));

        // Reemplazar parámetro de paginación según el tipo
        if (pagination.type === 'page') {
          url = url.replace('{page}', pagina);
        } else if (pagination.type === 'start') {
          const start = ((pagina - 1) * pagination.resultsPerPage) + 1;
          url = url.replace('{start}', start);
        } else if (pagination.type === 'offset') {
          const offset = (pagina - 1) * pagination.resultsPerPage;
          url = url.replace('{offset}', offset);
        }
      }

      urls.push(url);
    }
  });

  return urls;
}

/**
 * Obtener información de fuentes seleccionadas
 */
function obtenerInfoFuentes(fuentesSeleccionadas) {
  return fuentesSeleccionadas.map(sourceId => ({
    id: sourceId,
    name: SOURCES[sourceId]?.name || sourceId
  }));
}

/**
 * Escuchar progreso del scraping
 */
function escucharProgresoScraping() {
  // Polling cada segundo para ver el progreso
  const interval = setInterval(async () => {
    try {
      const data = await chrome.storage.local.get(['ultimoScraping']);

      if (data.ultimoScraping) {
        const scraping = data.ultimoScraping;

        // Verificar si es de la búsqueda actual
        const tiempoTranscurrido = Date.now() - scraping.timestamp;
        if (tiempoTranscurrido < 5000) { // Menos de 5 segundos
          // Mostrar resumen
          mostrarResumenScraping(scraping);
          searchBtn.disabled = false;
          clearInterval(interval);
        }
      }
    } catch (error) {
      console.error('Error al obtener progreso:', error);
    }
  }, 1000);

  // Timeout de 60 segundos
  setTimeout(() => {
    clearInterval(interval);
    searchBtn.disabled = false;
  }, 60000);
}

/**
 * Mostrar resumen de scraping
 */
function mostrarResumenScraping(scraping) {
  const totalResultados = scraping.resultados.reduce((sum, r) => sum + r.datos.length, 0);
  const tiempoSegundos = (scraping.tiempoTotal / 1000).toFixed(1);

  let html = `
    <div class="resumen-stats">
      <h4>Búsqueda: "${scraping.query}"</h4>
      <div class="total">${totalResultados}</div>
      <div class="tiempo">resultados encontrados en ${tiempoSegundos}s</div>
    </div>
  `;

  // Resultados por fuente
  scraping.resultados.forEach(r => {
    html += `
      <div class="fuente-resumen">
        <span class="fuente-nombre">${r.fuente}</span>
        <span class="fuente-count">${r.datos.length}</span>
      </div>
    `;
  });

  // Errores
  scraping.errores.forEach(e => {
    html += `
      <div class="fuente-resumen fuente-error">
        <span class="fuente-nombre">${e.fuente || 'Desconocido'}</span>
        <span class="fuente-count">Error</span>
      </div>
    `;
  });

  resumenContenidoDiv.innerHTML = html;
  resumenResultadosDiv.style.display = 'block';
  statusDiv.classList.remove('show');
}

/**
 * Mostrar mensaje de estado
 */
function mostrarEstado(mensaje, tipo) {
  statusDiv.textContent = mensaje;
  statusDiv.className = `status show ${tipo}`;
  
  // Auto-ocultar después de 3 segundos (solo si no es success antes de cerrar)
  if (tipo === 'error') {
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 3000);
  }
}

/**
 * Guardar última búsqueda
 */
function guardarUltimaBusqueda(query) {
  chrome.storage.local.set({ 
    lastQuery: query,
    lastSearchTime: new Date().toISOString()
  });
}

/**
 * Guardar estado de fuentes seleccionadas y modo (v2.0 con paginación y scraping)
 */
function guardarEstado() {
  const fuentesSeleccionadas = Array.from(sourceCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const modoSeleccionado = document.querySelector('input[name="mode"]:checked')?.value || 'tabs';

  chrome.storage.local.set({
    selectedSources: fuentesSeleccionadas,
    openMode: modoSeleccionado,
    paginationEnabled: enablePaginationCheckbox.checked,
    pagesPerSource: pagesPerSourceSelect.value,
    scrapingEnabled: enableScrapingCheckbox.checked
  });
}

/**
 * Restaurar estado guardado (v2.0 con paginación y scraping)
 */
async function restaurarEstado() {
  try {
    const data = await chrome.storage.local.get([
      'lastQuery',
      'selectedSources',
      'openMode',
      'paginationEnabled',
      'pagesPerSource',
      'scrapingEnabled'
    ]);

    // Restaurar última búsqueda
    if (data.lastQuery) {
      queryInput.value = data.lastQuery;
    }

    // Restaurar fuentes seleccionadas
    if (data.selectedSources && Array.isArray(data.selectedSources)) {
      sourceCheckboxes.forEach(cb => {
        cb.checked = data.selectedSources.includes(cb.value);
      });
    }

    // Restaurar modo de apertura
    if (data.openMode) {
      const radio = document.querySelector(`input[name="mode"][value="${data.openMode}"]`);
      if (radio) radio.checked = true;
    }

    // Restaurar paginación
    if (data.paginationEnabled !== undefined) {
      enablePaginationCheckbox.checked = data.paginationEnabled;
      paginationSettings.style.display = data.paginationEnabled ? 'block' : 'none';
    }

    if (data.pagesPerSource) {
      pagesPerSourceSelect.value = data.pagesPerSource;
    }

    // Restaurar scraping
    if (data.scrapingEnabled !== undefined) {
      enableScrapingCheckbox.checked = data.scrapingEnabled;
    }

  } catch (error) {
    console.error('Error al restaurar estado:', error);
  }
}

/**
 * Guardar búsqueda al escribir (con debounce)
 */
let saveTimeout;
queryInput.addEventListener('input', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    chrome.storage.local.set({ lastQuery: queryInput.value });
  }, 500);
});

// ============================================
// INICIALIZACIÓN
// ============================================

// Restaurar estado al abrir popup
document.addEventListener('DOMContentLoaded', () => {
  restaurarEstado();
  queryInput.focus();
  queryInput.select();
});

// Focus automático en el input
setTimeout(() => {
  queryInput.focus();
}, 100);

// Log para debugging
console.log('📚 Metabuscador de Pliegos - Popup cargado');
console.log(`Fuentes disponibles: ${Object.keys(SOURCES).length}`);
