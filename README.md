# Dependency Boundaries Lab

[Demo](https://pabloc43.github.io/lab-dependency-boundaries/) · [Ejecuciones del CI](https://github.com/Pabloc43/lab-dependency-boundaries/actions)

Una aplicación de pedidos para poner a prueba una decisión concreta: **el dominio no debe conocer la interfaz**.

Es el primer proyecto de la colección `lab-` de [Pabloc43](https://github.com/Pabloc43). No es una plantilla de arquitectura ni una tienda lista para producción. Hay pocas piezas a propósito: si no podemos explicar una regla en este tamaño, agregar capas no la vuelve más clara.

## Ejecutarlo

Requiere Node.js 24 y pnpm 10.34.9. No necesita credenciales, servicios externos ni base de datos.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm dev
```

Vite muestra la dirección local. La aplicación usa la base `/lab-dependency-boundaries/`, también en desarrollo.

```sh
pnpm test:e2e  # requiere: pnpm exec playwright install chromium
pnpm preview  # servir el build estático
```

## La decisión y el código

- **Dominio**: valida líneas y calcula importes en centavos enteros. No depende de otras capas ni paquetes externos.
- **Aplicación**: coordina el caso de uso y define el puerto `OrderRepository`. No importa adaptadores.
- **Infraestructura**: implementa ese puerto con un mapa en memoria. Copia los objetos para no exponer su estado interno.
- **Interfaz**: recoge cantidades, presenta resultados y traduce errores inesperados a un mensaje seguro.
- **Composición**: construye las dependencias y las pasa explícitamente. No hay contenedor de inyección ni localizador de servicios.

El contrato `OrderRepository.save(order): Promise<void>` permite sustituir el almacenamiento sin introducir detalles de persistencia en el cálculo. El caso de uso devuelve el pedido solamente después de guardarlo. El catálogo viene de la composición: el formulario no envía precios.

Elegí esta separación porque permite demostrar inversión de dependencias con una operación concreta. En una pantalla trivial, mantener tantas fronteras podría costar más de lo que aporta.

## Comprobar los límites

```sh
pnpm architecture
```

Este comando ejecuta dependency-cruiser sobre la aplicación y sobre dos fixtures independientes. Comprueba las reglas, los códigos de salida y las rutas involucradas. Un error del analizador, un JSON inválido o una infracción adicional hacen fallar el comando.

| Escenario                                       | Resultado esperado               |
| ----------------------------------------------- | -------------------------------- |
| Aplicación productiva                           | Sin infracciones; exit code 0    |
| Dominio importando una notificación de UI       | `no-domain-outward`; exit code 1 |
| Dos módulos de dominio que se importan entre sí | `no-circular`; exit code 1       |

También se prohíben imports de aplicación hacia infraestructura/UI, de UI hacia infraestructura y dependencias no resueltas. Los imports de tipos cuentan: las dependencias arquitectónicas no desaparecen porque TypeScript las borre al compilar.

Los fixtures no se importan desde la aplicación y no entran en el bundle. Para probar un cambio real, introduce temporalmente un import de `src/domain/` hacia `src/ui/` y ejecuta `pnpm architecture`: el escenario válido deberá fallar. Revierte el cambio antes de continuar.

El build genera `public/evidence.json` leyendo los informes reales y fragmentos del código. La página muestra ese resultado, incluida su fecha UTC. **No es un analizador online ni un indicador del último CI**; el enlace a Actions permite consultar las ejecuciones. No se versiona la evidencia generada.

Los fragmentos y la configuración se colorean con Shiki durante el build, usando las gramáticas de TypeScript, JavaScript y JSON y el tema Dark+. Los tokens se renderizan como texto de React, no como HTML inyectado; cada bloque conserva el contenido original, incluidos espacios y saltos de línea. Los colores con contraste inferior a 4,5:1 se aclaran sobre el fondo real del bloque. El navegador descarga tokens adicionales en el JSON, pero no un motor de resaltado, gramáticas ni WASM. El ejemplo circular sigue mostrando el informe JSON real del análisis. La evidencia se revalida al cargar la página. Si llega una versión de la evidencia sin tokens —por ejemplo, desde caché— o estos no corresponden al texto original, el bloque muestra ese texto sin color en lugar de fallar.

## Pruebas

`pnpm check` ejecuta formato con Prettier, tipos, lint, Vitest, comprobaciones arquitectónicas y build. `pnpm format` aplica el formato localmente. Las pruebas cubren totales, catálogo desconocido, cantidades inválidas, líneas duplicadas, precios inválidos, desbordamiento, persistencia y recuperación tras una falla.

Playwright verifica el pedido en escritorio y móvil, errores visibles, la navegación inicial por teclado, los informes, el ancho de página y un análisis automático de accesibilidad con axe. Esa comprobación no reemplaza una revisión manual de accesibilidad.

## CI y publicación

El workflow valida las pull requests sin publicar. En `main`, el mismo artefacto que pasó las pruebas de navegador se publica en GitHub Pages. Acciones fijadas por SHA, instalación con lockfile y permisos mínimos: lectura de contenido para validar; escritura de Pages e identidad OIDC solo para desplegar. No usa tokens personales.

En el repositorio público, habilita **Settings → Pages → Source → GitHub Actions**. La demo está publicada en [GitHub Pages](https://pabloc43.github.io/lab-dependency-boundaries/). Las ejecuciones y sus resultados se pueden consultar en [Actions](https://github.com/Pabloc43/lab-dependency-boundaries/actions).

GitHub Pages aloja archivos estáticos. El proyecto no utiliza funciones, cuentas, dominios pagos ni runners grandes. Ver condiciones y límites actuales en [Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/) y [Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Diagramas y límites del experimento

La página incorpora los dos visores interactivos en iframes del mismo origen, con un resumen textual y un enlace a la versión independiente. El componente `DiagramEmbed` valida la estructura esperada al cargar cada visor y corrige exclusivamente el rol del SVG raíz de `img` a `group`: el contenedor conserva su nombre y descripción, y los nodos mantienen sus botones y comportamiento de teclado. Un gráfico interactivo no puede presentarse como una imagen atómica en el árbol de accesibilidad.

Esta adaptación pertenece a la integración: no modifica los HTML generados, sus especificaciones ni la instalación de Archify. Si el documento no carga o no presenta la estructura esperada, se muestra un aviso junto al resumen y al enlace alternativo, sin una espera arbitraria. La versión independiente conserva una limitación conocida de accesibilidad automática (`nested-interactive`); la corrección se aplica únicamente al visor integrado. Las pruebas cargan ambos iframes y analizan sus descendientes con axe sin excluir reglas. Esto no equivale a afirmar conformidad completa con WCAG.

Los diagramas de arquitectura y CI se generan con [Archify](https://github.com/tt-a1i/archify), bajo licencia MIT; se incluyen su [licencia](public/diagrams/ARCHIFY-LICENSE.txt) y [avisos de redistribución](public/diagrams/ARCHIFY-NOTICES.md). El contenido está en español; los controles fijos del visor utilizan inglés. El mapa resume relaciones principales, no todos los imports del proyecto. Sus flechas representan imports, no llamadas en tiempo de ejecución.

No hay pagos, stock, autenticación, impuestos, concurrencia entre usuarios ni persistencia tras recargar. Todos los productos y precios son ficticios. La falla de guardado es una opción explícita de la demo; no representa una caída de un servicio real.

Dependency-cruiser comprueba dependencias estáticas y reglas elegidas. No detecta todos los acoplamientos de comportamiento, imports calculados ni errores de negocio. Un CI verde no certifica una buena arquitectura.

## Referencias

- [dependency-cruiser: reglas](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [Código del caso de uso](src/application/create-order.ts)
- [Mensaje de ejemplo para LinkedIn](docs/linkedin-post.md)

## Licencia

MIT. Ver [LICENSE](LICENSE).
