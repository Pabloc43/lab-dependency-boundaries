# Mensaje de ejemplo para LinkedIn

Separar el código en carpetas no garantiza que las responsabilidades estén separadas.

Para probarlo armé una aplicación pequeña de pedidos. El dominio calcula el total, un caso de uso coordina el guardado y React presenta el resultado. Un adaptador localStorage conserva el historial al recargar, sin backend. La memoria queda como implementación alternativa para las pruebas.

La decisión que quise proteger es simple: el dominio no debe depender de la interfaz. Con dependency-cruiser la convertí en una regla que se ejecuta en CI, junto con las pruebas de comportamiento.

También dejé ejemplos incorrectos: una regla de negocio importando una notificación visual, dos módulos con una dependencia circular y un caso de uso que construye directamente su adaptador de persistencia. Esta última variante guarda correctamente, pero incumple el límite; la versión inyectada conserva el comportamiento sin ese import. No alcanza con que el analizador falle: las pruebas comprueban que detecte la infracción que esperamos.

La demo incluye el código relevante, diagramas y los resultados generados durante el build. No ejecuta el análisis en el navegador ni simula el estado del CI.

La herramienta no decide si esta arquitectura es buena. Ayuda a comprobar que el código respete los límites elegidos. Elegir qué vale la pena proteger sigue siendo trabajo del equipo.

Código: https://github.com/Pabloc43/lab-dependency-boundaries
Demo: https://pabloc43.github.io/lab-dependency-boundaries/

#ArquitecturaDeSoftware #TypeScript #DesarrolloWeb

---

Nota de preparación: verificar que repositorio y demo estén disponibles antes de usar este mensaje. No publicar automáticamente.
