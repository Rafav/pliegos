/**
 * CONTENT-SCRAPER.JS - Metabuscador de Pliegos v2.0
 * Content script que se inyecta en las páginas para extraer resultados
 */

(function() {
  'use strict';

  console.log('🔍 Content scraper iniciado en:', window.location.hostname);

  // Detectar qué fuente es basándonos en el hostname
  const hostname = window.location.hostname;
  let scraper;
  let nombreFuente;

  if (hostname.includes('bnedigital.bne.es')) {
    scraper = scrapearBNE;
    nombreFuente = 'BNE Digital';
  } else if (hostname.includes('desenrollandoelcordel')) {
    scraper = scrapearDesenrollando;
    nombreFuente = 'Desenrollando el cordel';
  } else if (hostname.includes('biblioteca.cchs.csic.es')) {
    scraper = scrapearMapping;
    nombreFuente = 'Mapping Pliegos';
  } else if (hostname.includes('red-aracne')) {
    scraper = scrapearAracne;
    nombreFuente = 'Red-aracne';
  } else if (hostname.includes('funjdiaz')) {
    scraper = scrapearFunjdiaz;
    nombreFuente = 'Fundación Joaquín Díaz';
  } else {
    console.warn('⚠️ Fuente no reconocida:', hostname);
    return;
  }

  // Esperar a que la página cargue completamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  function iniciar() {
    // Dar tiempo al JavaScript de la página para renderizar
    setTimeout(() => {
      try {
        const resultados = scraper();
        enviarResultados(resultados);
      } catch (error) {
        console.error('❌ Error en scraping:', error);
        enviarError(error);
      }
    }, 2000); // 2 segundos de espera
  }

  function enviarResultados(resultados) {
    chrome.runtime.sendMessage({
      action: 'scrapingCompleto',
      fuente: nombreFuente,
      hostname: hostname,
      resultados: resultados,
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error al enviar resultados:', chrome.runtime.lastError);
      } else {
        console.log(`✅ ${resultados.length} resultados enviados`);
      }
    });
  }

  function enviarError(error) {
    chrome.runtime.sendMessage({
      action: 'scrapingError',
      fuente: nombreFuente,
      hostname: hostname,
      error: error.message,
      timestamp: Date.now()
    });
  }

  // ============================================
  // SCRAPERS ESPECÍFICOS POR FUENTE
  // ============================================

  /**
   * Scraper para BNE Digital
   */
  function scrapearBNE() {
    const resultados = [];

    // Intentar diferentes selectores (la estructura puede variar)
    const selectores = [
      '.resultado',
      '.item-resultado',
      '.documento',
      'article.resultado',
      '.search-result'
    ];

    let items = [];
    for (const selector of selectores) {
      items = document.querySelectorAll(selector);
      if (items.length > 0) break;
    }

    if (items.length === 0) {
      console.warn('No se encontraron resultados con selectores conocidos');
      return resultados;
    }

    items.forEach((item, index) => {
      try {
        const resultado = {
          id: `bne_${Date.now()}_${index}`,
          titulo: extraerTexto(item, ['.titulo', 'h2', 'h3', '.title']),
          autor: extraerTexto(item, ['.autor', '.author', '.creator']),
          fecha: extraerTexto(item, ['.fecha', '.date', '.year']),
          url: extraerURL(item),
          imagen: extraerImagen(item),
          fuente: 'BNE Digital'
        };

        // Solo añadir si tiene título
        if (resultado.titulo) {
          resultados.push(resultado);
        }
      } catch (error) {
        console.warn('Error procesando item BNE:', error);
      }
    });

    console.log(`📖 BNE: ${resultados.length} resultados extraídos`);
    return resultados;
  }

  /**
   * Scraper para Desenrollando el cordel
   */
  function scrapearDesenrollando() {
    const resultados = [];

    const selectores = [
      '.search-result',
      '.result-item',
      '.cordel-item',
      'article'
    ];

    let items = [];
    for (const selector of selectores) {
      items = document.querySelectorAll(selector);
      if (items.length > 0) break;
    }

    items.forEach((item, index) => {
      try {
        const resultado = {
          id: `cordel_${Date.now()}_${index}`,
          titulo: extraerTexto(item, ['.title', 'h2', 'h3', '.titulo']),
          autor: extraerTexto(item, ['.author', '.autor', '.creator']),
          fecha: extraerTexto(item, ['.date', '.fecha', '.year']),
          url: extraerURL(item),
          imagen: extraerImagen(item),
          fuente: 'Desenrollando el cordel'
        };

        if (resultado.titulo) {
          resultados.push(resultado);
        }
      } catch (error) {
        console.warn('Error procesando item Desenrollando:', error);
      }
    });

    console.log(`📜 Desenrollando: ${resultados.length} resultados`);
    return resultados;
  }

  /**
   * Scraper para Mapping Pliegos (CSIC)
   */
  function scrapearMapping() {
    const resultados = [];

    // Mapping Pliegos probablemente usa tabla
    const filas = document.querySelectorAll('table tr, .resultado, .item');

    filas.forEach((fila, index) => {
      if (index === 0 && fila.querySelector('th')) return; // Skip header

      try {
        const celdas = fila.querySelectorAll('td');

        const resultado = {
          id: `mapping_${Date.now()}_${index}`,
          titulo: celdas.length > 0 ? celdas[0]?.textContent.trim() : extraerTexto(fila, ['.titulo', 'h2', 'h3']),
          autor: celdas.length > 1 ? celdas[1]?.textContent.trim() : extraerTexto(fila, ['.autor', '.author']),
          fecha: celdas.length > 2 ? celdas[2]?.textContent.trim() : extraerTexto(fila, ['.fecha', '.date']),
          impresor: celdas.length > 3 ? celdas[3]?.textContent.trim() : '',
          url: extraerURL(fila),
          fuente: 'Mapping Pliegos'
        };

        if (resultado.titulo) {
          resultados.push(resultado);
        }
      } catch (error) {
        console.warn('Error procesando item Mapping:', error);
      }
    });

    console.log(`🗺️ Mapping: ${resultados.length} resultados`);
    return resultados;
  }

  /**
   * Scraper para Red-aracne
   */
  function scrapearAracne() {
    const resultados = [];

    const selectores = [
      '.registro',
      '.resultado',
      '.result-item',
      'article'
    ];

    let items = [];
    for (const selector of selectores) {
      items = document.querySelectorAll(selector);
      if (items.length > 0) break;
    }

    items.forEach((item, index) => {
      try {
        const resultado = {
          id: `aracne_${Date.now()}_${index}`,
          titulo: extraerTexto(item, ['h3', 'h2', '.titulo', '.title']),
          autor: extraerTexto(item, ['.autor', '.author']),
          descripcion: extraerTexto(item, ['.descripcion', '.description', 'p']),
          url: extraerURL(item),
          fuente: 'Red-aracne'
        };

        if (resultado.titulo) {
          resultados.push(resultado);
        }
      } catch (error) {
        console.warn('Error procesando item Aracne:', error);
      }
    });

    console.log(`🕸️ Aracne: ${resultados.length} resultados`);
    return resultados;
  }

  /**
   * Scraper para Fundación Joaquín Díaz
   */
  function scrapearFunjdiaz() {
    const resultados = [];

    const selectores = [
      '.pliego-item',
      '.item',
      '.resultado',
      'article',
      'tr'
    ];

    let items = [];
    for (const selector of selectores) {
      items = document.querySelectorAll(selector);
      if (items.length > 0) break;
    }

    items.forEach((item, index) => {
      try {
        const resultado = {
          id: `funjdiaz_${Date.now()}_${index}`,
          titulo: extraerTexto(item, ['.titulo', 'h2', 'h3', '.title']),
          descripcion: extraerTexto(item, ['.descripcion', 'p', '.description']),
          url: extraerURL(item),
          imagen: extraerImagen(item),
          fuente: 'Fundación Joaquín Díaz'
        };

        if (resultado.titulo) {
          resultados.push(resultado);
        }
      } catch (error) {
        console.warn('Error procesando item Funjdiaz:', error);
      }
    });

    console.log(`🎵 Funjdiaz: ${resultados.length} resultados`);
    return resultados;
  }

  // ============================================
  // UTILIDADES DE SCRAPING
  // ============================================

  /**
   * Extraer texto del primer selector que funcione
   */
  function extraerTexto(elemento, selectores) {
    for (const selector of selectores) {
      const el = elemento.querySelector(selector);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return '';
  }

  /**
   * Extraer URL del primer enlace
   */
  function extraerURL(elemento) {
    const enlace = elemento.querySelector('a');
    if (enlace && enlace.href) {
      return enlace.href;
    }
    return '';
  }

  /**
   * Extraer imagen
   */
  function extraerImagen(elemento) {
    const img = elemento.querySelector('img');
    if (img && img.src) {
      return img.src;
    }
    return '';
  }

})();
