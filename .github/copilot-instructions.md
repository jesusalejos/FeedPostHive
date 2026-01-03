# Instrucciones para agentes AI (FeedPostHive)

Propósito: ayudar a un agente de codificación a ser productivo rápido en este repositorio frontend estático.

**Big Picture**
- **Tipo:** Aplicación web estática (HTML/CSS/JS) que consulta la API Hive desde el navegador usando `dhive`.
- **Flujo de datos:** UI -> `app.js` llama a Hive vía `dhive.Client` -> procesa resultados (filtrado anti-reblog/crosspost) -> muestra cards y permite exportar a CSV/Word.

**Archivos clave**
- **Archivo:** [app.js](app.js) — lógica principal: `NODOS`, `client`, `escanearPosts()`, filtros y exportadores.
- **Archivo:** [index.html](index.html) — elementos UI y IDs importantes: `inputUser`, `monthFilter`, `activateFetch`, `exportExcel`, `exportAllWord`, `postList`, `statusMessage`.
- **Archivo:** [style.css](style.css) — estilos visuales; revisar para cambios rápidos de UI.
- **Archivo:** [README.md](README.md) — minimal; no contiene instrucciones de ejecución.

**Patrones y convenciones detectadas (probar antes de modificar)**
- La paginación hacia atrás se implementa en `escanearPosts()` usando `start_author` y `start_permlink` y lotes de `limit: 20`.
- Hay filtros específicos para eliminar reblogs/crossposts: comprobación de `post.author` igual al usuario, parseo de `json_metadata` y chequeos heurísticos (`original_author`, `cross_post_author`, `community === "hive-132410"`, texto breve con "cross-post"). Ver `escanearPosts` en [app.js](app.js).
- Límite de seguridad: el escaneo corta en `checked >= 4000` para evitar recorrer un historial infinito.
- Uso de librerías vía CDN en `index.html`: `@hiveio/dhive`, `docx` y `FileSaver.js`. No hay bundler ni package.json.

**Workflows y comandos (cómo ejecutar y depurar localmente)**n+- Ejecutar localmente: abrir `index.html` en un navegador (servir con un servidor estático es recomendado, por ejemplo `python -m http.server` desde la carpeta del repo).
- Depuración: usar la consola del navegador para ver errores de red y mensajes de estado (UI muestra `statusMessage`). Añadir `console.log` en `app.js` cuando sea necesario.
- Probar conectividad Hive: editar `NODOS` en [app.js](app.js) para añadir nodos alternativos o aislar problemas de red.

**Export/IO**
- CSV: `exportarCSV()` añade BOM (`\uFEFF`) y genera `Reporte_<usuario>.csv`.
- Word: usa `docx` y `FileSaver` para generar `.docx` individuales y compilados (`descargarUnWord`, `descargarTodoWord`).

**Cambios comunes y riesgos**
- Evitar cambiar el comportamiento de filtrado sin tests: los filtros anti-crosspost son específicos y afectan directamente al conteo de posts detectados.
- Si se reemplaza `dhive` por otro cliente, mantener la semántica de paginación (`start_author/start_permlink`) y formatos de respuesta.

**Qué buscar al implementar una PR**
- Preservar IDs del DOM usados por `app.js` o actualizar ambas partes.
- No introducir dependencias que requieran un bundler sin añadir instrucciones de build.

Si algo no queda claro o deseas ampliar la sección de workflows (p. ej. añadir scripts de prueba o un servidor de desarrollo), dime qué prefieres y lo actualizo.
