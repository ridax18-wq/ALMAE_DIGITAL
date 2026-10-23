# Guía de administración de contenidos (CMS) — ALMAE DIGITAL

Manual breve para el administrador del sitio. Requiere iniciar sesión en `/admin/login` (usuario administrador configurado). El paciente nunca necesita cuenta.

Los cambios de contenidos se publican al instante, sin rebuild del sitio.

---

## 1. Editar textos del sitio

1. Ir a **Contenidos** (`/admin/contenidos`).
2. Elegir el bloque a editar (por ejemplo: título principal, preguntas frecuentes, texto del pie de página).
3. Modificar los campos. El texto de cada campo es el texto que se muestra en la página pública.
4. Guardar:
   - **Guardar borrador**: guarda el cambio pero NO lo muestra en la página pública.
   - **Publicar cambios**: aplica el cambio en la página pública de inmediato.
5. Verificar el resultado abriendo la página pública correspondiente.

Los borradores no son visibles para el público.

---

## 2. Subir y usar imágenes

1. Ir a **Multimedia** (`/admin/multimedia`).
2. Seleccionar el archivo de imagen (formatos habituales: JPG, PNG o WebP) y agregar una descripción breve (texto alternativo).
3. Presionar **Subir imagen**. La imagen queda en la biblioteca con su miniatura.
4. Para eliminar una imagen que ya no se usa, presionar su botón de borrado (solo se puede borrar si ninguna tarjeta la usa).

Para usar una imagen en un servicio o promoción, se elige desde la biblioteca Multimedia en la página de ese servicio o promoción (ver secciones siguientes).

---

## 3. Gestionar servicios

1. Ir a **Servicios** (`/admin/servicios`).
2. Cada servicio permite editar nombre, descripción, precio, duración y demás datos.
3. **Imagen principal**: elegir una imagen desde la biblioteca Multimedia; la tarjeta pública usará esa imagen.
4. **Modo de catálogo**: elegir entre:
   - `reservable`: el paciente puede reservar online (solo aplica a servicios presenciales del consultorio).
   - `visible`: se muestra en el catálogo pero no admite reserva online.
   - `consulta`: solo se muestra para consulta.
5. **Reordenar**: usar las flechas de intercambio para cambiar el orden de las tarjetas del catálogo público.
6. Guardar cambios; el catálogo público se actualiza al instante.

---

## 4. Gestionar promociones

1. Ir a **Promociones** (`/admin/promociones`).
2. Crear una promoción con: código único, tipo (monto fijo o porcentaje), servicio asociado (opcional), fecha de inicio y fin, usos máximos e imagen (opcional, desde Multimedia).
3. Estados: **borrador**, **publicada**, **pausada** o **vencida**. Solo las publicadas y vigentes se muestran en `/promociones`.
4. Validaciones: los precios deben ser coherentes (no se permite un porcentaje distinto de 100 cuando el tipo es porcentaje, ni valores no positivos); las fechas deben ser coherentes.
5. Para retirar una promoción del sitio sin borrarla, usar **Pausar**; para quitarla del todo, **Eliminar** (solo si aún no se ha usado).

---

## 5. Actualizar ubicación y contacto

### Ubicación

1. Ir a **Ubicación** (`/admin/ubicacion`).
2. Editar la dirección (calle, distrito, provincia, departamento), la referencia, la introducción y la URL de Google Maps.
3. Guardar borrador y luego **Publicar** para aplicar el cambio.
4. La URL del mapa debe ser de Google Maps (https). Si no se conoce, se puede dejar vacía y el sitio mostrará un botón de búsqueda en Maps en lugar de un mapa con un pin inventado.

### Contacto

1. Ir a **Contacto** (`/admin/contacto`).
2. Editar el número de WhatsApp, teléfono, correo, redes sociales y el mensaje predeterminado de WhatsApp.
3. Guardar borrador y **Publicar**. El botón flotante de WhatsApp del sitio usará el número y el mensaje configurados aquí.

### Horarios

1. Ir a **Horarios** (`/admin/horarios`).
2. El texto `hours_note` es el horario comercial visible en el sitio (Footer y home).
3. Aclaración: la tabla semanal real de disponibilidad de citas se gestiona en la agenda/turnos; el texto de horarios es solo informativo.

---

## 6. Restaurar versiones anteriores

Cada vez que se publica un contenido (bloque, ubicación, contacto u horarios) queda registrado en el historial.

1. Ir a **Versiones** (`/admin/revisiones`).
2. La lista muestra las revisiones publicadas, con fecha (hora de Lima), autor y el contenido afectado (por ejemplo: `Bloque: footer_intro`).
3. Presionar **Ver versión** de la revisión que se desea recuperar.
4. La página de detalle muestra:
   - la comparación con la versión anterior (campo por campo), y
   - el contenido completo de esa versión.
5. Marcar la casilla de confirmación y presionar **Restaurar versión**.
6. El contenido de esa versión se aplica al sitio y se genera una **nueva revisión** (el historial no se elimina nunca).

---

## 7. Testimonios

1. Ir a **Testimonios** (`/admin/testimonios`).
2. Crear un testimonio con nombre, cita y calificación opcional. La publicación **exige consentimiento expreso** del paciente (casilla obligatoria); sin él, el sistema impide publicar.
3. Solo se muestran en la página los testimonios publicados (que siempre tienen consentimiento registrado).

---

## 8. Datos de demostración

- En desarrollo local se muestra un banner naranja: “Entorno de prueba ALMAE — Los cambios realizados aquí no afectan la página publicada”.
- Ese banner solo aparece en entornos locales; nunca en producción.
