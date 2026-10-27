# Mensaje de ejemplo para LinkedIn

Separar el código en carpetas no garantiza que las responsabilidades estén separadas.

Para probarlo armé una aplicación pequeña de pedidos. El dominio calcula el total, un caso de uso coordina el guardado y React presenta el resultado. El repositorio es en memoria: no hacía falta una base de datos para demostrar el límite.

La decisión que quise proteger es simple: el dominio no debe depender de la interfaz. Con dependency-cruiser la convertí en una regla que se ejecuta en CI, junto con las pruebas de comportamiento.

También dejé dos ejemplos incorrectos: una regla de negocio importando una notificación visual y dos módulos con una dependencia circular. No alcanza con que el analizador falle: las pruebas comprueban que detecte la infracción que esperamos.

La demo incluye el código relevante, diagramas y los resultados generados durante el build. No ejecuta el análisis en el navegador ni simula el estado del CI.

La herramienta no decide si esta arquitectura es buena. Ayuda a comprobar que el código respete los límites elegidos. Elegir qué vale la pena proteger sigue siendo trabajo del equipo.

Código: https://github.com/Pabloc43/lab-dependency-boundaries
Demo: https://pabloc43.github.io/lab-dependency-boundaries/

#ArquitecturaDeSoftware #TypeScript #DesarrolloWeb

---

Nota de preparación: verificar que repositorio y demo estén disponibles antes de usar este mensaje. No publicar automáticamente.
