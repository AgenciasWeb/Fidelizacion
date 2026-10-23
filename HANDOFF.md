# HANDOFF — Fidelización

Este archivo registra cada cambio. El revisor (Claude) revisa cada entrada.

---

## 2026-10-22 Fix bug a: PIN guardado en localStorage en vez de sessionStorage

- **Pedido:** Fix del revisor: `loginView` guardaba el PIN con `store.set('pin_' + slug, pin)` (sin `true`), por lo que quedaba en `localStorage` (permanente, sin cifrar). `esDueño` leía `sessionStorage` directamente.
- **Archivos tocados:** `app.js`
- **Qué cambió:**
  - Línea 309: `store.set('pin_' + slug, pin)` → `store.set('pin_' + slug, pin, true)` (guarda en `sessionStorage`).
  - `esDueño()` (línea 904): lee con `store.get('pin_' + slug, true)` y limpia con `store.del('pin_' + slug, true)` en vez de tocar `sessionStorage` directamente.
  - Línea 811 (`cfgTab`, al cambiar PIN): `sessionStorage.setItem(...)` → `store.set('pin_' + slug, pin, true)` para consistencia.
  - Línea 778 (botón "Cerrar sesión"): `sessionStorage.removeItem(...)` → `store.del('pin_' + slug, true)`.
- **SQL a correr en Supabase:** no
- **Cómo probarlo:**
  1. En el panel, ingresá con PIN.
  2. Abrí las herramientas de desarrollo (Chrome > DevTools > Application > Storage).
  3. En `sessionStorage` aparece `pin_negocio-prueba` (con el PIN). En `localStorage` NO debe aparecer `pin_...`.
  4. Recargá la página: el panel debe mantener la sesión (hasta que cierres la pestaña).
  5. Abrí otra pestaña con la misma URL: no debe estar logueado (es `sessionStorage`).
- **Dudas o riesgos:** con `sessionStorage` el PIN se pierde al recargar la página si se cierra la pestaña. Ese es el comportamiento esperado (no guardar permanentente el PIN). El `pinok_` + `bizok_` siguen en `sessionStorage` para evitar reconexiones innecesarias.

---

## 2026-10-22 Borrado de todo el QR (no me gustó)

- **Pedido:** El usuario pidió borrar todo lo del QR (generador, scanner, códigos visuales, pasar tarjeta a otro celular, librerías). No usar "adryss" ni datos fake.
- **Archivos tocados:** `app.js`
- **Qué cambió:**
  - Se borró la función `qr()` (línea 163) y todas sus referencias (`customerView`, `posterView`, `listTab`).
  - Se borró el botón `scan` y todo el código del escáner de cámara (`stream`, `stopCam`, `jsQR`, overlay `scanov`).
  - El "Pasar a otro celular" ahora muestra el código como texto (`esc(b.dataset.rec)`) sin imagen.
- **SQL a correr:** no.
- **Cómo probar:** Entrá con el PIN, sumá sellos por nombre, y fijate que no hay botón de escanear ni códigos QR.
- **Dudas o riesgos:** Ninguno.

---

## 2026-10-22 Fix bug b: QR "Pasar a otro celular" usaba `#c=` pero el arranque leía `?c=`

- **Pedido:** Fix del revisor: el QR de "Pasar a otro celular" genera `?b=slug#c=CODIGO` (fragmento), pero el arranque leía `qs.get('c')` (query string), así que el QR no funcionaba.
- **Archivos tocados:** `app.js`
- **Qué cambió:**
  - Arranque (línea ~1476): en vez de `const rc = qs.get('c');`, ahora se lee el fragmento: `const m = (location.hash || '').match(/#c=([A-Z0-9]{6,8})/i); const rc = m ? m[1] : null;`.
  - Se mantiene el uso de fragmento (`#`) por seguridad: no se envía en el `Referer` ni queda en el historial.
- **SQL a correr en Supabase:** no
- **Cómo probarlo:**
  1. En el panel, en la pestaña Clientes, tocá "Pasar a otro celular" de un cliente.
  2. Escaneá el QR con otro celular.
  3. El cliente debe ver su tarjeta de sellos directamente (el código se guarda en `localStorage` y redirige a `?b=slug` limpio).
- **Dudas o riesgos:** el regex de lectura es estricto (`^[A-Z0-9]{6,8}$` con `i`), igual que la validación original. Ninguno.

---

## 2026-10-22 Creación SQL de negocio de prueba

- **Pedido:** Crear un negocio de prueba para validar la app sin tocar los reales ("no uses adryss").
- **Archivos tocados:** `sql/002_negocio_prueba.sql` (nuevo)
- **Qué cambió:** Archivo nuevo idempotente que crea `negocio-prueba` (PIN temporal `1234`, módulos de pedidos apagados, menú digital comentado). Se agregaron comentarios claros sobre cómo activar menú y pedidos.
- **SQL a correr en Supabase:** sí — `sql/002_negocio_prueba.sql`
- **Cómo probarlo:**
  1. En Supabase > SQL Editor > pegar el contenido de `sql/002_negocio_prueba.sql` > Run.
  2. En el celular: `https://<sitio>/?b=negocio-prueba`.
  3. Crear una tarjeta → sumar sellos desde el panel con PIN `1234` → cambiar PIN en Ajustes.
  4. Opcionalmente: en Ajustes > Menú digital activalo, activá pedidos, cargá items (descomentar `insert`s en SQL) y probá un pedido.
- **Dudas o riesgos:** El PIN `1234` es débil; se debe cambiar inmediatamente después de probar. El slug `negocio-prueba` es genérico, no usa datos de prueba ficticios (no "adryss"). El menú está comentado para que solo lo pruebe si lo necesita; más simple, no recargado.
