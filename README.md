# 📚 Metabuscador de Pliegos v2.0 - Extensión Chrome

Extensión de Chrome para realizar búsquedas simultáneas en múltiples bases de datos de literatura popular española (pliegos sueltos y cordeles).

---

## 🎯 ¿Qué hace esta extensión?

Abre múltiples pestañas de navegador, una por cada fuente bibliográfica que selecciones, con los resultados de búsqueda de cada base de datos.

**Es como usar 5 buscadores a la vez, pero con un solo click.**

### ✨ Novedades v2.0

- **📄 Paginación Inteligente**: Obtén múltiples páginas de resultados de cada fuente (1, 2, 3 o 5 páginas por fuente)
- **🔍 Scraping y Resumen Unificado**: Extrae automáticamente los resultados y muestra un resumen consolidado
- **🔔 Notificaciones**: Recibe una notificación cuando termine la búsqueda con el total de resultados encontrados
- **📊 Contador en Badge**: Visualiza el progreso del scraping en el icono de la extensión

---

## 📦 Instalación

### Desde los archivos (Modo desarrollador)

1. **Descarga** esta carpeta completa
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa el **"Modo de desarrollador"** (esquina superior derecha)
4. Click en **"Cargar extensión sin empaquetar"**
5. Selecciona la carpeta `metabuscador-extension`
6. ¡Listo! Verás el icono 📚 en tu barra de herramientas

### Verificar instalación

Si ves el icono del libro (📚) en la barra de herramientas de Chrome, la extensión está instalada correctamente.

---

## 🚀 Uso básico

1. **Click en el icono** 📚 de la extensión (o usa `Ctrl+Shift+P` / `Cmd+Shift+P`)
2. **Escribe** tu búsqueda (ej: "romances", "Barcelona", "monja")
3. **Selecciona** las fuentes que quieres consultar (por defecto están todas marcadas)
4. **Configura las opciones** (opcionales):
   - ✅ **Paginación**: Marca "Obtener múltiples páginas" y selecciona cuántas páginas por fuente (1-5)
   - ✅ **Scraping**: Marca "Mostrar resumen unificado" para extraer y consolidar resultados
5. **Click en "Buscar"**
6. Se abrirán pestañas con los resultados
7. Si activaste el scraping, recibirás una notificación al terminar y verás un resumen con todos los resultados

---

## 📚 Fuentes disponibles

La extensión busca en estas 5 bases de datos:

| Fuente | Descripción | Institución |
|--------|-------------|-------------|
| **📖 BNE Digital** | Biblioteca Nacional de España | BNE |
| **📜 Desenrollando el cordel** | Literatura de cordel | Universidad de Ginebra |
| **🗺️ Mapping Pliegos** | Cartografía de pliegos | CSIC |
| **🕸️ Red-aracne** | Metabuscador BIDISO | Universidad de La Rioja |
| **🎵 Fundación Joaquín Díaz** | Folklore y cultura popular | Fundación privada |

---

## ⚙️ Opciones

### Modo de apertura

- **Pestañas nuevas**: Abre cada resultado en una pestaña separada en la ventana actual
- **Ventana nueva**: Abre todas las pestañas en una ventana nueva

### Paginación (v2.0)

- **Activar paginación**: Obtén múltiples páginas de resultados de cada fuente
- **Páginas por fuente**: Selecciona cuántas páginas abrir por cada fuente (1, 2, 3 o 5)
- Ejemplo: Si seleccionas 3 fuentes y 2 páginas por fuente, se abrirán 6 pestañas en total

### Scraping y Resumen (v2.0)

- **Activar resumen unificado**: Extrae automáticamente los resultados de todas las páginas
- **Notificaciones**: Recibe un aviso cuando termine la búsqueda
- **Resumen consolidado**: Ve todos los resultados organizados por fuente en un solo lugar
- **Contador de progreso**: El icono de la extensión muestra cuántas fuentes se han procesado

### Búsquedas rápidas

Click en cualquiera de estos botones para buscar términos comunes:
- `romances`
- `cautivos`
- `Barcelona`
- `monja`
- `Diego Corrientes`
- `muerte`

---

## ⌨️ Atajos de teclado

- **`Ctrl+Shift+P`** (Windows/Linux) o **`Cmd+Shift+P`** (Mac): Abrir la extensión
- **`Enter`**: Realizar búsqueda desde el campo de texto

---

## 🎓 Características educativas

Esta extensión fue desarrollada como **ejercicio educativo para ASIR** (Administración de Sistemas Informáticos en Red) y demuestra:

### Competencias técnicas
- ✅ **Chrome Extension API** (Manifest V3)
- ✅ **Service Workers** (background scripts)
- ✅ **Chrome Storage API** (persistencia de datos)
- ✅ **Tab Management** (gestión de pestañas)
- ✅ **Message Passing** (comunicación entre scripts)

### Ventajas sobre soluciones web
- ✅ **Sin problemas de CORS**: Las extensiones tienen permisos especiales
- ✅ **Sin servidor necesario**: Todo funciona en el navegador
- ✅ **Datos siempre actualizados**: Consulta directa a las fuentes
- ✅ **Experiencia nativa**: Usa las pestañas del navegador

---

## 🔧 Estructura del proyecto

```
metabuscador-extension/
├── manifest.json       # Configuración de la extensión (v2.0)
├── popup.html         # Interfaz de usuario (con paginación y scraping)
├── popup.css          # Estilos mejorados
├── popup.js           # Lógica del popup (paginación + scraping)
├── background.js      # Service worker (pestañas + scraping + notificaciones)
├── content-scraper.js # Content script (inyectado para extraer datos)
├── icons/             # Iconos de la extensión
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # Este archivo
```

---

## 🛠️ Desarrollo y personalización

### Añadir una nueva fuente

Edita `popup.js` y añade la fuente al objeto `SOURCES`:

```javascript
const SOURCES = {
  // ... fuentes existentes
  miNuevaFuente: {
    name: 'Mi Nueva Fuente',
    url: 'https://ejemplo.com/buscar?q={query}'
  }
};
```

Luego añade el checkbox en `popup.html`:

```html
<label class="source-item">
  <input type="checkbox" value="miNuevaFuente" checked>
  <span class="source-name">🆕 Mi Nueva Fuente</span>
</label>
```

### Modificar estilos

Todos los estilos están en `popup.css`. El diseño usa:
- Variables CSS para colores consistentes
- Flexbox para layouts responsivos
- Transiciones suaves para interacciones

### Debug

1. Abre `chrome://extensions/`
2. Busca "Metabuscador de Pliegos"
3. Click en "Inspeccionar vista del service worker" para ver logs del background
4. Click derecho en el icono → "Inspeccionar popup" para debuggear la interfaz

---

## 🐛 Problemas comunes

### La extensión no aparece

- ✅ Verifica que el "Modo de desarrollador" esté activado
- ✅ Recarga la extensión desde `chrome://extensions/`
- ✅ Comprueba que todos los archivos estén presentes

### No se abren las pestañas

- ✅ Revisa la consola del service worker (puede haber errores)
- ✅ Verifica que Chrome tenga permisos para abrir pestañas
- ✅ Comprueba tu conexión a internet

### Las URLs no funcionan

- ✅ Algunas fuentes pueden cambiar sus URLs de búsqueda
- ✅ Edita `popup.js` para actualizar las URLs si es necesario

---

## 🔮 Mejoras futuras posibles

Ideas para extender la extensión:

- [ ] **Scraping de resultados**: Extraer y mostrar resumen unificado
- [ ] **Tab Groups**: Agrupar automáticamente las pestañas por búsqueda
- [ ] **Historial**: Guardar y mostrar búsquedas anteriores
- [ ] **Exportar**: Guardar todas las URLs en un archivo
- [ ] **Notificaciones**: Avisar cuando terminen de cargar las páginas
- [ ] **Estadísticas**: Mostrar uso de la extensión
- [ ] **Filtros**: Filtrar resultados por fecha, tipo, etc.
- [ ] **Marcadores**: Guardar resultados interesantes

---

## 📄 Licencia

Este proyecto es educativo y de código abierto. Libre para uso, modificación y distribución con fines educativos.

---

## 🙏 Créditos

### Fuentes de datos

Agradecimiento a los proyectos que digitalizan y preservan el patrimonio bibliográfico español:

- [BIDISO](https://www.bidiso.es/) - Universidad de La Rioja
- [Desenrollando el cordel](https://desenrollandoelcordel.unige.ch/) - Universidad de Ginebra
- [Mapping Pliegos](http://biblioteca.cchs.csic.es/MappingPliegos/) - CSIC
- [Fundación Joaquín Díaz](https://funjdiaz.net/)
- [Biblioteca Nacional de España](http://catalogo.bne.es/)

### Desarrollo

- **Proyecto**: Metabuscador de Pliegos
- **Contexto**: ASIR - Formación Profesional
- **Año**: 2025
- **Propósito**: Ejercicio educativo de desarrollo web y extensiones

---

## 📞 Soporte

Para problemas técnicos:
1. Revisa la sección **"Problemas comunes"** arriba
2. Inspecciona la consola del navegador (F12)
3. Verifica los logs del service worker

---

## ⭐ Changelog

### v2.0.0 (Noviembre 2025)
- ✨ **Paginación inteligente**: Obtén múltiples páginas de resultados (1-5 páginas por fuente)
- ✨ **Scraping automático**: Extracción de resultados de todas las páginas
- ✨ **Resumen unificado**: Vista consolidada de todos los resultados por fuente
- ✨ **Notificaciones**: Avisos cuando termine la búsqueda
- ✨ **Badge con progreso**: Contador en el icono de la extensión
- ✨ **Content scripts**: Scraping inteligente adaptado a cada fuente
- ✨ **Arquitectura mejorada**: Comunicación popup ↔ background ↔ content scripts
- 🔧 **Permisos añadidos**: `scripting` y `notifications`

### v1.0.0 (Enero 2025)
- ✨ Lanzamiento inicial
- ✅ 5 fuentes integradas
- ✅ Búsquedas rápidas
- ✅ Modo pestañas/ventana nueva
- ✅ Persistencia de preferencias
- ✅ Atajos de teclado
- ✅ URLs verificadas y actualizadas

---

**¡Feliz búsqueda!** 📚
