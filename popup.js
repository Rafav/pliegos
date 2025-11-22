/**
 * POPUP.JS - Metabuscador de Pliegos
 * Lógica de la interfaz de usuario
 */

// Configuración de fuentes con URLs de búsqueda y soporte de paginación
// Basado en análisis real de cada sitio web
const SOURCES = {
  bne: {
    name: 'BNE Digital',
    url: 'https://bnedigital.bne.es/bd/es/results?y=s&w={query}&f=ficha&g=ws',
    pagination: {
      type: 'start',  // Usa parámetro 's' (start)
      param: 's',
      resultsPerPage: 10,
      urlTemplate: 'https://bnedigital.bne.es/bd/es/results?y=s&w={query}&f=ficha&g=ws&s={start}'
    }
  },
  cordel: {
    name: 'Desenrollando el cordel',
    url: 'https://desenrollandoelcordel.unige.ch/search.html?query={query}&start=1',
    pagination: {
      type: 'start',  // Usa 'start': 1, 11, 21, 31...
      param: 'start',
      resultsPerPage: 10,
      urlTemplate: 'https://desenrollandoelcordel.unige.ch/search.html?query={query}&start={start}'
    }
  },
  mapping: {
    name: 'Mapping Pliegos',
    url: 'https://biblioteca.cchs.csic.es/MappingPliegos/resultadobusquedavanzada.php?TITULO={query}',
    pagination: null  // No pagina - devuelve todos los resultados
  },
  aracne: {
    name: 'Red-aracne',
    url: 'https://www.red-aracne.es/busqueda/resultados.htm?av=true&tituloDescricion={query}',
    pagination: {
      type: 'page',  // Usa 'paxina' (con x): 1, 2, 3...
      param: 'paxina',
      resultsPerPage: 10,
      urlTemplate: 'https://www.red-aracne.es/busqueda/resultados.htm?paxina={page}&tituloDescricion={query}&av=true'
    }
  },
  funjdiaz: {
    name: 'Fundación Joaquín Díaz',
    url: 'https://funjdiaz.net/pliegos-listado.php?t={query}',
    pagination: {
      type: 'page',  // Usa 'pag': 1, 2, 3...
      param: 'pag',
      resultsPerPage: 20,
      urlTemplate: 'https://funjdiaz.net/pliegos-listado.php?t={query}&pag={page}'
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
const exportarTXTBtn = document.getElementById('exportarTXT');

// Variable global para guardar datos del último scraping
let ultimoScrapingData = null;

// Verificar que el botón exportar existe
if (exportarTXTBtn) {
  console.log('✅ Botón exportarTXT encontrado');
} else {
  console.error('❌ Botón exportarTXT NO encontrado');
}

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

// Exportar resumen a TXT
exportarTXTBtn.addEventListener('click', () => {
  console.log('🖱️ Click en exportar TXT');
  console.log('Datos disponibles:', !!ultimoScrapingData);

  if (ultimoScrapingData) {
    try {
      exportarScrapingATXT(ultimoScrapingData);
    } catch (error) {
      console.error('❌ Error al exportar:', error);
      mostrarEstado('❌ Error al exportar: ' + error.message, 'error');
    }
  } else {
    console.warn('No hay datos para exportar');
    mostrarEstado('⚠️ No hay datos para exportar', 'error');
  }
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
        fuentesInfo: obtenerInfoFuentes(fuentesSeleccionadas),
        maxPages: paginasPorFuente,
        paginationConfig: obtenerConfigPaginacion(fuentesSeleccionadas)
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
 * Construir URLs con paginación correcta para cada fuente
 */
function construirURLsConPaginacion(fuentesSeleccionadas, query, paginas) {
  const urls = [];

  fuentesSeleccionadas.forEach(sourceId => {
    const source = SOURCES[sourceId];
    if (!source) {
      console.warn(`Fuente no encontrada: ${sourceId}`);
      return;
    }

    // Página 1 siempre
    const url1 = source.url.replace('{query}', encodeURIComponent(query));
    urls.push(url1);

    // Si paginación está activada y soportada
    if (paginas > 1 && source.pagination) {
      for (let pagina = 2; pagina <= paginas; pagina++) {
        let urlPagina;

        if (source.pagination.type === 'page') {
          // Tipo page: simplemente usar número de página (2, 3, 4...)
          urlPagina = source.pagination.urlTemplate
            .replace('{query}', encodeURIComponent(query))
            .replace('{page}', pagina);
        } else if (source.pagination.type === 'start') {
          // Tipo start: calcular offset basado en resultsPerPage
          let startValue;
          if (sourceId === 'bne') {
            // BNE: página 2 = s=10, página 3 = s=20
            startValue = (pagina - 1) * source.pagination.resultsPerPage;
          } else {
            // Desenrollando: página 2 = start=11, página 3 = start=21
            startValue = ((pagina - 1) * source.pagination.resultsPerPage) + 1;
          }
          urlPagina = source.pagination.urlTemplate
            .replace('{query}', encodeURIComponent(query))
            .replace('{start}', startValue);
        }

        if (urlPagina) {
          urls.push(urlPagina);
        }
      }
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
 * Obtener configuración de paginación por fuente
 */
function obtenerConfigPaginacion(fuentesSeleccionadas) {
  const config = {};
  fuentesSeleccionadas.forEach(sourceId => {
    const source = SOURCES[sourceId];
    if (source && source.pagination) {
      config[sourceId] = source.pagination;
    }
  });
  return config;
}

/**
 * Escuchar progreso del scraping (mejorado con logs)
 */
function escucharProgresoScraping() {
  console.log('🎧 Iniciando escucha de scraping...');

  let ultimoTimestamp = 0;
  let checksRealizados = 0;
  const maxChecks = 90; // 90 segundos máximo

  const interval = setInterval(async () => {
    checksRealizados++;

    try {
      const data = await chrome.storage.local.get(['ultimoScraping']);

      if (data.ultimoScraping) {
        const scraping = data.ultimoScraping;

        // Si es un resultado nuevo (timestamp diferente al último)
        if (scraping.timestamp > ultimoTimestamp) {
          console.log('✅ Nuevo resultado detectado!');
          ultimoTimestamp = scraping.timestamp;

          // Mostrar resumen
          mostrarResumenScraping(scraping);
          searchBtn.disabled = false;
          clearInterval(interval);
        } else if (checksRealizados % 5 === 0) {
          // Log cada 5 segundos
          console.log(`⏳ Esperando resultado... (${checksRealizados}s)`);
        }
      } else if (checksRealizados % 5 === 0) {
        console.log(`⏳ Sin datos aún... (${checksRealizados}s)`);
      }

    } catch (error) {
      console.error('❌ Error:', error);
    }

    if (checksRealizados >= maxChecks) {
      console.warn('⏱️ Timeout alcanzado');
      mostrarEstado('⏱️ Revisa la notificación o las pestañas abiertas', 'error');
      searchBtn.disabled = false;
      clearInterval(interval);
    }
  }, 1000);
}

/**
 * Mostrar resumen de scraping
 */
function mostrarResumenScraping(scraping) {
  // Guardar datos para exportar
  ultimoScrapingData = scraping;

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

/**
 * Exportar resultados del scraping a archivo TXT
 */
function exportarScrapingATXT(scraping) {
  console.log('Exportando scraping a TXT...', scraping);

  // Calcular estadísticas
  const totalResultados = scraping.resultados.reduce((sum, r) => sum + r.datos.length, 0);
  const tiempoSegundos = (scraping.tiempoTotal / 1000).toFixed(1);
  const fecha = new Date().toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Construir contenido del archivo
  let contenido = '';
  contenido += '═══════════════════════════════════════════════════════════\n';
  contenido += '      METABUSCADOR DE PLIEGOS - RESULTADOS SCRAPING         \n';
  contenido += '═══════════════════════════════════════════════════════════\n\n';
  contenido += `Búsqueda:          "${scraping.query}"\n`;
  contenido += `Fecha:             ${fecha}\n`;
  contenido += `Total resultados:  ${totalResultados}\n`;
  contenido += `Tiempo:            ${tiempoSegundos}s\n`;
  contenido += `Fuentes exitosas:  ${scraping.resultados.length}\n`;
  contenido += `Fuentes con error: ${scraping.errores.length}\n`;
  contenido += '\n';

  // Resultados por fuente
  scraping.resultados.forEach((resultado, idx) => {
    const nombreFuente = resultado.fuente.toUpperCase();
    const separador = '='.repeat(nombreFuente.length + 4);

    contenido += separador + '\n';
    contenido += `  ${nombreFuente}  \n`;
    contenido += separador + '\n';
    contenido += `Resultados encontrados: ${resultado.datos.length}\n\n`;

    if (resultado.datos.length > 0) {
      resultado.datos.forEach((item, i) => {
        contenido += `${i + 1}. ${item.titulo}\n`;
        contenido += `   URL: ${item.url}\n`;
        if (item.autor) {
          contenido += `   Autor: ${item.autor}\n`;
        }
        if (item.fecha) {
          contenido += `   Fecha: ${item.fecha}\n`;
        }
        contenido += '\n';
      });
    } else {
      contenido += '(Sin resultados)\n\n';
    }

    contenido += '\n';
  });

  // Errores
  if (scraping.errores.length > 0) {
    contenido += '═══════════════════════════════════════════════════════════\n';
    contenido += '  FUENTES CON ERRORES  \n';
    contenido += '═══════════════════════════════════════════════════════════\n\n';

    scraping.errores.forEach(error => {
      contenido += `❌ ${error.fuente || 'Desconocida'}\n`;
      contenido += `   Error: ${error.error || 'Error desconocido'}\n\n`;
    });
  }

  contenido += '\n';
  contenido += '═══════════════════════════════════════════════════════════\n';
  contenido += 'Generado por Metabuscador de Pliegos v2.0\n';
  contenido += 'https://github.com/Rafav/pliegos\n';
  contenido += '═══════════════════════════════════════════════════════════\n';

  try {
    // Crear blob
    console.log('📦 Creando blob con', contenido.length, 'caracteres');
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    console.log('✅ Blob creado:', blob.size, 'bytes');

    const url = URL.createObjectURL(blob);
    console.log('🔗 URL creada:', url);

    // Sanitizar query para nombre de archivo (eliminar caracteres problemáticos)
    const querySanitizada = scraping.query
      .replace(/[^a-zA-Z0-9\s]/g, '') // Solo letras, números y espacios
      .replace(/\s+/g, '-')            // Espacios a guiones
      .substring(0, 30);               // Max 30 caracteres

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `pliegos-${querySanitizada}-${timestamp}.txt`;
    console.log('📝 Nombre de archivo:', filename);

    // Crear link temporal y disparar descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    console.log('🔗 Link añadido al DOM');

    a.click();
    console.log('✅ Click disparado en el link');

    // Limpiar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('🧹 Limpieza completada');
    }, 100);

    mostrarEstado(`💾 Archivo "${filename}" descargado`, 'success');
    console.log('✅ Exportación completada exitosamente');

  } catch (error) {
    console.error('❌ Error en proceso de descarga:', error);
    mostrarEstado('❌ Error al descargar: ' + error.message, 'error');
    throw error;
  }
}

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
