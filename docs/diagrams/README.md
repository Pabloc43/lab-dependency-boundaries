# Diagramas de la POC

Los archivos JSON describen la arquitectura y el flujo de CI. Los HTML interactivos están en `public/diagrams/`. Son explicaciones seleccionadas, no gráficos completos de todos los imports: el informe de dependency-cruiser es la fuente para comprobar las dependencias reales.

Generados con [Archify](https://github.com/tt-a1i/archify), bajo licencia MIT. Las etiquetas del diagrama están en español; los controles del visor mantienen el inglés que soporta la herramienta. No hace falta instalar Archify para ejecutar la aplicación o desplegar los HTML versionados.

## Comprobación de esta versión

Ambos diagramas pasaron los nueve controles de composición showcase, sin errores ni advertencias. La comprobación automatizada del visor pasó en 1440×900, 1600×1000, 1920×1080 y 2048×1320; se revisaron capturas claras y oscuras. Esto verifica los artefactos visuales, no la arquitectura de la aplicación.

| Artefacto | SHA-256 del HTML |
| --- | --- |
| Arquitectura | `bb9f3cb2935913121f6a41c29f558f0e38dd5306b78dd7ab78a5a73cf3f7c0f6` |
| CI | `d6fe476e46028c79c63b4187774533b3bbd8171d840e4b8587d33b608a9dce1b` |

Para regenerarlos con Archify instalado, ejecutar `validate` y luego `deliver` con el tipo `architecture` para `architecture.json` y `workflow` para `ci.json`. Después ejecutar `visual-check` sobre cada HTML y revisar las capturas: cambiar el código no actualiza estos diagramas automáticamente.

## Persistencia local

El mapa de arquitectura distingue la composición, los casos de uso y puertos, el dominio y los adaptadores de almacenamiento. La demo utiliza `localStorage`; el adaptador en memoria sigue disponible para pruebas. Las flechas son imports seleccionados, no el recorrido de una llamada. La aplicación invoca el puerto durante el guardado, aunque el adaptador importe el contrato en dirección opuesta.

La versión actual del mapa pasó nuevamente los nueve controles showcase, sin errores ni advertencias; la comprobación del visor no encontró desbordamiento en los cuatro tamaños de escritorio indicados. Se revisaron visualmente las capturas de 1440×900 en tema claro y 2048×1320 en tema oscuro. La miniatura es una captura del HTML validado. El diagrama de CI no cambió: continúa ejecutando las comprobaciones antes del despliegue.
