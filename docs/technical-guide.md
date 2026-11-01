# Guía técnica

[Volver a la portada](../README.md)

[Demo](https://pabloc43.github.io/lab-dependency-boundaries/) · [Ejecuciones del CI](https://github.com/Pabloc43/lab-dependency-boundaries/actions)

Una aplicación de pedidos para poner a prueba una decisión concreta: **el dominio no debe conocer la interfaz**.

No es una plantilla de arquitectura ni una tienda lista para producción. Hay pocas piezas a propósito: si no podemos explicar una regla en este tamaño, agregar capas no la vuelve más clara.

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

El árbol comienza por lo que hace esta POC: `features/orders` contiene el pedido y `features/architecture-lab` su explicación y evidencia. Las capas de dominio, aplicación e infraestructura viven dentro de pedidos; no organizan toda la web. `app` solo compone el sitio y conecta los adaptadores.

Cada componente posee su CSS Module. El estado y envío del formulario viven en `useOrderDemo`; la lectura y el borrado del historial, en `useOrderHistory`; la carga y cancelación HTTP, en `useEvidence`. La selección de ejemplos sigue siendo estado local del explorador. No hay una carpeta genérica de componentes comunes ni nuevas dependencias de estado.

- **Dominio**: valida líneas y calcula importes en centavos enteros. No depende de otras capas ni paquetes externos.
- **Aplicación**: coordina el caso de uso y define los puertos en `application/order-repository.ts`. No importa adaptadores.
- **Infraestructura**: implementa los puertos con localStorage en la demo y memoria en pruebas. Ambos devuelven copias independientes.
- **Interfaz**: recoge cantidades, presenta resultados y traduce errores inesperados a un mensaje seguro.
- **Composición**: construye las dependencias y las pasa explícitamente. No hay contenedor de inyección ni localizador de servicios.

El contrato `OrderRepository.save(order): Promise<void>` permite sustituir el almacenamiento sin introducir detalles de persistencia en el cálculo. El caso de uso devuelve el pedido solamente después de guardarlo. El catálogo viene de la composición: el formulario no envía precios.

Elegí esta separación porque permite demostrar inversión de dependencias con una operación concreta. En una pantalla trivial, mantener tantas fronteras podría costar más de lo que aporta.

## Persistencia local

`OrderRepository` conserva únicamente `save`. `OrderHistoryRepository` lo extiende con `list` y `clear`, sin hacer depender el adaptador del módulo que implementa `createOrder`. El cálculo de dominio permanece intacto. La UI recibe servicios de crear, listar y borrar, nunca el adaptador.

La clave **`lab-dependency-boundaries:orders:v1`** contiene `{version: 1, orders: [...]}`. El listado presenta primero el último pedido guardado; guardar un ID existente lo reemplaza sin duplicarlo. Cambiar o leer un objeto no permite mutar el almacenamiento por referencia. Recargar recupera el historial, no el formulario.

El adaptador valida estructura, IDs únicos, líneas, cantidades enteras entre 1 y 20, importes seguros no negativos y total consistente. Un JSON inválido o una versión desconocida impiden leer y guardar: no se sobrescriben silenciosamente. El acceso a `window.localStorage` también se resuelve dentro de cada operación, porque el propio getter puede lanzar un error.

**Borrar historial de este lab** elimina únicamente esa clave, incluso cuando el documento es incompatible. No llama a `localStorage.clear()`. Un bloqueo o una cuota agotada no producen un éxito falso ni activan un repositorio en memoria. La lectura del historial tiene su propio error: un pedido ya guardado no se declara fallido porque una lectura posterior falle.

Esto no es almacenamiento seguro ni transaccional entre pestañas: no hay sincronización, control de concurrencia, migraciones de versiones desconocidas, servidor ni recuperación entre dispositivos. El navegador puede borrar los datos; el historial no tiene paginación ni retención automática y puede agotar la cuota. No introduzcas información personal. Memoria sigue disponible para pruebas y comparación, no como alternativa silenciosa de la demo.

## Comprobar los límites

```sh
pnpm architecture
```

Este comando ejecuta dependency-cruiser sobre la aplicación y sobre tres casos incorrectos aislados (el de persistencia incluye una variante corregida). Comprueba las reglas, los códigos de salida y las rutas involucradas. Un error del analizador, un JSON inválido o una infracción adicional hacen fallar el comando.

| Escenario                                          | Resultado esperado                    |
| -------------------------------------------------- | ------------------------------------- |
| Aplicación productiva                              | Sin infracciones; exit code 0         |
| Dominio importando una notificación de UI          | `no-domain-outward`; exit code 1      |
| Dos módulos de dominio que se importan entre sí    | `no-circular`; exit code 1            |
| Aplicación que construye localStorage directamente | `no-application-outward`; exit code 1 |
| El mismo caso de uso con el puerto inyectado       | Sin infracciones; exit code 0         |

### Persistencia: funcionar no basta

El cuarto caso muestra `fixtures/persistence-coupling/src/application/create-order.ts`: el caso de uso importa y construye `LocalStorageOrderRepository`. Guarda correctamente, pero mezcla coordinación con elección del almacenamiento. La corrección es el `create-order.ts` productivo, que recibe `OrderRepository`; `app/composition.ts` construye el adaptador.

`scripts/persistence-scenario.mjs` copia los módulos reales de dominio, contratos y almacenamiento a un directorio temporal y ejecuta cada variante por separado. Ambas deben compilar con TypeScript y superar el mismo flujo de guardado, recuperación desde otra instancia y borrado. Solo la variante acoplada puede producir exactamente una arista `no-application-outward` de aplicación a infraestructura; no se aceptan ciclos, imports no resueltos ni infracciones adicionales. Se elimina el temporal al terminar. El fixture parcial no está diseñado para compilarse solo desde su carpeta: el harness aporta esas copias reales.

Para reproducir este caso sin tocar las fuentes:

```sh
pnpm architecture
pnpm exec vitest run scripts/persistence-scenario.test.ts
```

La evidencia incluye los fragmentos exactos ejecutados, los informes reales de ambas variantes y su comprobación funcional. El navegador no vuelve a ejecutar el escenario ni atribuye resultados de producción a esta POC.

### Ver una infracción directamente

Para reproducir el import incorrecto sin modificar la aplicación:

```sh
DEPENDENCY_BOUNDARY_ROOT=fixtures/domain-to-ui/src \
  pnpm exec depcruise fixtures/domain-to-ui/src \
  --config .dependency-cruiser.cjs --output-type err
```

El código de salida **1** es esperado: el dominio del fixture importa su interfaz. Para inspeccionar el ciclo, repite el comando sustituyendo ambas apariciones de `fixtures/domain-to-ui/src` por `fixtures/cycle/src`. El analizador debe mostrar `a.ts → b.ts → a.ts` y la regla `no-circular`.

`pnpm architecture` comprueba los fallos controlados, la aplicación válida y las dos variantes de persistencia. Ese comando termina correctamente solo si las reglas, rutas y códigos de salida coinciden con lo esperado. Para extraer datos usa el reporter JSON; para verificar el código de salida de la infracción usa el reporter `err`.

El análisis productivo recorre todo `src`, pero las reglas de capas apuntan a `src/features/orders`. Los tests co-localizados no entran en ese grafo. El build comprueba que haya módulos reales en las cuatro capas; una prueba adicional inyecta un import inválido en una copia temporal del dominio productivo y exige detectar la arista exacta. Así, mover carpetas no puede dejar reglas sin coincidencias con un resultado falsamente verde.

La aplicación solo puede importar su propia capa y el dominio: tampoco puede depender del shell ni de la guía didáctica, incluidos los imports de tipos. Se prohíben imports de UI hacia infraestructura y dependencias no resueltas. Los imports de tipos cuentan: las dependencias arquitectónicas no desaparecen porque TypeScript las borre al compilar.

En el caso circular, la página muestra los dos archivos reales: `a.ts` importa `b.ts` y `b.ts` importa `a.ts`. Los imports entre módulos de dominio están permitidos; la infracción es cerrar un ciclo. El recorrido se obtiene del campo `cycle` del analizador y el build comprueba que cada arista exista en su grafo. `no-circular` es el nombre de la regla «No permitir ciclos», no un booleano. El informe normalizado queda disponible en un desplegable.

Los fixtures no se importan desde la aplicación y no entran en el bundle. Para probar un cambio real, introduce temporalmente un import de `src/features/orders/domain/` hacia `src/features/orders/ui/` y ejecuta `pnpm architecture`: el escenario válido deberá fallar. Revierte el cambio antes de continuar.

El build genera `public/evidence.json` leyendo los informes reales y fragmentos del código. La página muestra ese resultado, incluida su fecha UTC. **No es un analizador online ni un indicador del último CI**; el enlace a Actions permite consultar las ejecuciones. No se versiona la evidencia generada.

Los fragmentos y la configuración se colorean con Shiki durante el build, usando las gramáticas de TypeScript, JavaScript y JSON y el tema Dark+. Los tokens se renderizan como texto de React, no como HTML inyectado; cada bloque conserva el contenido original, incluidos espacios y saltos de línea. Los colores con contraste inferior a 4,5:1 se aclaran sobre el fondo real del bloque. El navegador descarga tokens adicionales en el JSON, pero no un motor de resaltado, gramáticas ni WASM. El ejemplo circular muestra sus dos fuentes reales y permite consultar el informe normalizado del análisis. La evidencia se revalida al cargar la página. Si llega una versión de la evidencia sin tokens —por ejemplo, desde caché— o estos no corresponden al texto original, el bloque muestra ese texto sin color en lugar de fallar.

## Pruebas

`pnpm check` ejecuta formato con Prettier, tipos, lint, Vitest, comprobaciones arquitectónicas y build. `pnpm format` aplica el formato localmente. Las pruebas cubren totales, catálogo desconocido, cantidades inválidas, líneas duplicadas, precios inválidos, desbordamiento, persistencia y recuperación tras una falla.

Playwright verifica el pedido en escritorio y móvil, errores visibles, la navegación inicial por teclado, los informes, el ancho de página y un análisis automático de accesibilidad con axe. Esa comprobación no reemplaza una revisión manual de accesibilidad.

## Informe HTML del CI

`pnpm architecture:report` analiza **solo el código productivo de `src`**, con los mismos límites de pedidos y exclusiones de tests que la comprobación existente. Ejecuta una sola vez el analizador JSON y reutiliza ese resultado con los formatters nativos `depcruise-fmt -T err --exit-code` y `depcruise-fmt -T err-html`. No hay un renderer HTML propio ni dependencias nuevas.

El comando regenera `reports/architecture/` (ignorado por Git):

- `architecture.html`: informe HTML nativo para abrir en el navegador.
- `architecture.json`: informe original del analizador.
- `architecture.txt`: salida del formatter de consola.
- `summary.md`: alcance, SHA disponible, versión, estado y conteo de infracciones.

En **Actions → ejecución → Artifacts**, descarga **architecture-report** y descomprime el ZIP antes de abrir el HTML. El artifact se conserva **14 días** y su enlace requiere acceso a GitHub. El resumen de la ejecución incluye el resultado y el enlace de descarga. Estos archivos no se publican en GitHub Pages ni forman parte de `dist`.

Tras una instalación correcta, el workflow intenta generar y adjuntar el informe aunque fallen tipos, tests, límites o E2E; no lo hace si la ejecución fue cancelada. Un reporte sin errores de dependencias **no significa que el CI completo haya pasado**. Los permisos del workflow no cambian.

Encontrar infracciones reales genera HTML y un resumen de error, pero el comando diagnóstico termina con `0` si pudo analizar y formatear correctamente. La salida nativa `0`/`1` queda registrada en el resumen; `pnpm check` conserva el gate que rechaza las infracciones productivas. Una configuración inválida o un fallo de las herramientas hace fallar también `architecture:report`: limpia resultados previos, no conserva HTML obsoleto y adjunta un diagnóstico, nunca un falso «cero infracciones».

Los fixtures incorrectos siguen verificándose por separado con `pnpm architecture`, incluida la equivalencia funcional de persistencia. El HTML descargable describe el `src` de esa ejecución; la evidencia de la web sigue siendo un snapshot del build con ejemplos educativos. Son alcances distintos.

## CI y publicación

El workflow valida las pull requests sin publicar. En `main`, el mismo artefacto que pasó las pruebas de navegador se publica en GitHub Pages. Acciones fijadas por SHA, instalación con lockfile y permisos mínimos: lectura de contenido para validar; escritura de Pages e identidad OIDC solo para desplegar. No usa tokens personales.

En el repositorio público, habilita **Settings → Pages → Source → GitHub Actions**. La demo está publicada en [GitHub Pages](https://pabloc43.github.io/lab-dependency-boundaries/). Las ejecuciones y sus resultados se pueden consultar en [Actions](https://github.com/Pabloc43/lab-dependency-boundaries/actions).

GitHub Pages aloja archivos estáticos. El proyecto no utiliza funciones, cuentas, dominios pagos ni runners grandes. Ver condiciones y límites actuales en [Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/) y [Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Diagramas y límites del experimento

La página incorpora los dos visores interactivos en iframes del mismo origen, con un resumen textual y un enlace a la versión independiente. El componente `DiagramEmbed` valida la estructura esperada al cargar cada visor y corrige exclusivamente el rol del SVG raíz de `img` a `group`: el contenedor conserva su nombre y descripción, y los nodos mantienen sus botones y comportamiento de teclado. Un gráfico interactivo no puede presentarse como una imagen atómica en el árbol de accesibilidad.

Esta adaptación pertenece a la integración: no modifica los HTML generados, sus especificaciones ni la instalación de Archify. Si el documento no carga o no presenta la estructura esperada, se muestra un aviso junto al resumen y al enlace alternativo, sin una espera arbitraria. La versión independiente conserva una limitación conocida de accesibilidad automática (`nested-interactive`); la corrección se aplica únicamente al visor integrado. Las pruebas cargan ambos iframes y analizan sus descendientes con axe sin excluir reglas. Esto no equivale a afirmar conformidad completa con WCAG.

Los diagramas de arquitectura y CI se generan con [Archify](https://github.com/tt-a1i/archify), bajo licencia MIT; se incluyen su [licencia](../public/diagrams/ARCHIFY-LICENSE.txt) y [avisos de redistribución](../public/diagrams/ARCHIFY-NOTICES.md). El contenido está en español; los controles fijos del visor utilizan inglés. El mapa resume relaciones principales, no todos los imports del proyecto. Sus flechas representan imports, no llamadas en tiempo de ejecución.

No hay pagos, stock, autenticación, impuestos ni concurrencia entre usuarios. La persistencia es local al navegador, no una base de datos compartida. Todos los productos y precios son ficticios. La falla simulada se identifica como tal y ocurre antes de escribir; los errores reales de acceso, cuota o formato se muestran por separado.

Dependency-cruiser comprueba dependencias estáticas y reglas elegidas. No detecta todos los acoplamientos de comportamiento, imports calculados ni errores de negocio. Un CI verde no certifica una buena arquitectura.

## Referencias

- [dependency-cruiser: reglas](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [Código del caso de uso](../src/features/orders/application/create-order.ts)
- [Mensaje de ejemplo para LinkedIn](linkedin-post.md)

## Licencia

MIT. Ver [LICENSE](../LICENSE).
