# Diagramas de la POC

Los archivos JSON describen la arquitectura y el flujo de CI. Los HTML interactivos están en `public/diagrams/`. Son explicaciones seleccionadas, no gráficos completos de todos los imports: el informe de dependency-cruiser es la fuente para comprobar las dependencias reales.

Generados con [Archify](https://github.com/tt-a1i/archify), bajo licencia MIT. Las etiquetas del diagrama están en español; los controles del visor mantienen el inglés que soporta la herramienta. No hace falta instalar Archify para ejecutar la aplicación o desplegar los HTML versionados.

## Comprobación de esta versión

Ambos diagramas pasaron los nueve controles de composición showcase, sin errores ni advertencias. La comprobación automatizada del visor pasó en 1440×900, 1600×1000, 1920×1080 y 2048×1320; se revisaron capturas claras y oscuras. Esto verifica los artefactos visuales, no la arquitectura de la aplicación.

| Artefacto | SHA-256 del HTML |
| --- | --- |
| Arquitectura | `2a8fb91208138ccffa982eb3429166370c1f871ce0a9e218731ed904f6bb9545` |
| CI | `d6fe476e46028c79c63b4187774533b3bbd8171d840e4b8587d33b608a9dce1b` |

Para regenerarlos con Archify instalado, ejecutar `validate` y luego `deliver` con el tipo `architecture` para `architecture.json` y `workflow` para `ci.json`. Después ejecutar `visual-check` sobre cada HTML y revisar las capturas: cambiar el código no actualiza estos diagramas automáticamente.
