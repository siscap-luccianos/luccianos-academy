# Traducción por Excel

1. **Exportar** el español a un Excel para traducir:
   `python3 tools/i18n/exportar_excel.py "salida.xlsx" --idioma "English (US)"`
   (con `--con-borrador` trae también lo ya traducido, para revisar).
2. Quien traduce completa solo las columnas amarillas y devuelve el .xlsx.
3. **Importar** el Excel devuelto (revisa marcadores `{0}`, líneas, repetidos):
   `python3 tools/i18n/importar_excel.py "traducido.xlsx" [--estricto]`
   Reescribe `js/i18n/en.js` y `js/i18n/en.contenido.js`. Lo no traducido sigue en español.

Los datos de lecciones/preguntas salen de `datos/*.json` (volcado de la planilla de producción al 2026-10-13);
si cambió el contenido en producción, hay que actualizar esos volcados antes de exportar.
