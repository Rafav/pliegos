/**
 * CONTENT-SCRAPER.JS - Metabuscador de Pliegos v2.1
 * Content script mejorado con scraping genérico y robusto
 */

(function() {
  'use strict';

  console.log('Content scraper v2.1 iniciado en:', window.location.href);

  const hostname = window.location.hostname;
  let nombreFuente, sourceId;

  if (hostname.includes('bnedigital.bne.es')) {
    nombreFuente = 'BNE Digital';
    sourceId = 'bne';
  } else if (hostname.includes('desenrollandoelcordel')) {
    nombreFuente = 'Desenrollando el cordel';
    sourceId = 'cordel';
  } else if (hostname.includes('biblioteca.cchs.csic.es')) {
    nombreFuente = 'Mapping Pliegos';
    sourceId = 'mapping';
  } else if (hostname.includes('red-aracne')) {
    nombreFuente = 'Red-aracne';
    sourceId = 'aracne';
  } else if (hostname.includes('funjdiaz')) {
    nombreFuente = 'Fundación Joaquín Díaz';
    sourceId = 'funjdiaz';
  } else {
    console.warn('Fuente no reconocida:', hostname);
    return;
  }

  console.log('Fuente detectada:', nombreFuente);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  function iniciar() {
    setTimeout(() => {
      try {
        const resultados = scrapearGenerico();
        console.log(resultados.length, 'resultados encontrados');
        enviarResultados(resultados);
      } catch (error) {
        console.error('Error:', error);
        enviarError(error);
      }
    }, 3000);
  }

  function enviarResultados(resultados) {
    chrome.runtime.sendMessage({
      action: 'scrapingCompleto',
      fuente: nombreFuente,
      sourceId: sourceId,
      resultados: resultados,
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error al enviar:', chrome.runtime.lastError);
      } else {
        console.log('Resultados enviados');
      }
    });
  }

  function enviarError(error) {
    chrome.runtime.sendMessage({
      action: 'scrapingError',
      fuente: nombreFuente,
      sourceId: sourceId,
      error: error.message,
      timestamp: Date.now()
    });
  }

  function scrapearGenerico() {
    console.log('Iniciando scraping generico');

    const selectores = [
      '.item', '.result', '.resultado', '.search-result',
      '.documento', 'article', '.card', '.entry',
      'tr[class*="result"]', 'div[class*="result"]',
      'li[class*="item"]', '[class*="resultado"]',
      '[class*="result"]', '[class*="item"]'
    ];

    let items = [];
    for (const sel of selectores) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const validos = Array.from(els).filter(el => el.textContent.trim().length > 20);
          if (validos.length > 0) {
            items = validos;
            console.log('Selector funciono:', sel, '(', items.length, 'items)');
            break;
          }
        }
      } catch (e) {}
    }

    if (items.length === 0) {
      console.warn('No se encontraron resultados');
      return [];
    }

    const resultados = [];
    items.forEach((item, i) => {
      try {
        const r = {
          id: sourceId + '_' + Date.now() + '_' + i,
          titulo: extraer(item, ['h1', 'h2', 'h3', '.title', '.titulo', 'strong', 'a']),
          autor: extraer(item, ['.author', '.autor', '[class*="author"]']),
          fecha: extraer(item, ['.date', '.fecha', '.year']),
          url: extraerURL(item),
          fuente: nombreFuente
        };
        if (r.titulo) resultados.push(r);
      } catch (e) {}
    });

    return resultados;
  }

  function extraer(el, sels) {
    for (const s of sels) {
      try {
        const e = el.querySelector(s);
        if (e && e.textContent.trim()) {
          return e.textContent.trim().substring(0, 200);
        }
      } catch (e) {}
    }
    return '';
  }

  function extraerURL(el) {
    try {
      const a = el.querySelector('a[href]');
      if (a) return new URL(a.href, window.location.href).href;
    } catch (e) {}
    return '';
  }

})();
