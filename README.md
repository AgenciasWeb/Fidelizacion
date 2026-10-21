# Fidelización · Tarjeta de sellos digital

PWA para que un negocio (café, peluquería, etc.) reparta **sellos con un toque** y el
cliente lleve su tarjeta en el celular. Backend en Supabase (Postgres + RPC).

- **Cliente**: crea su tarjeta, ve sus sellos, pide desde el menú y sigue sus pedidos.
- **Negocio**: entra al panel con su PIN, ve el **modo mostrador** y da sellos en 1 toque.
- **Todo en una sola app web instalable** (Panel del negocio + Mis tarjetas).

---

## La idea que manda todo

> El sello tiene que ser **consecuencia de algo que el negocio ya está haciendo**,
> nunca una tarea extra.

Por eso el panel tiene dos módulos de uso:

| Módulo | Qué hace | Cuándo se usa |
|---|---|---|
| **Mostrador** | Grilla de clientes (habituales primero). Un toque = un sello. Banner con *Deshacer*, *Canjear* y *🎁 Canjear premio* cuando la tarjeta quedó completa. Escáner QR a pantalla completa. | El negocio atiende en mostrador y cobra. |
| **Pedidos** | El cliente arma el carrito en el menú público; el pedido entra a la cola del panel; **al entregarlo se suma el sello en el mismo toque**. | Cafés, comidas, locales que Chargue con pedido. |

Ningún otro flujo: no hay que buscar, no hay que abrir un formulario, no hay que elegir
"Sumar sello" en un menú de administración.

---

## Arquitectura: un solo repo, módulos opt-in

**Un solo proyecto de código para todos los negocios**, no uno por nicho.

El núcleo (tarjetas, sellos, premios, panel, menú, estadísticas) es **idéntico** para
todos. Después, cada negocio **enciende los módulos que le sirven** desde *Ajustes* del
panel. El estado de los módulos vive en la tabla `modulos`, una fila por negocio:

```sql
create table public.modulos (
  slug         text primary key,
  pedidos      boolean not null default false,
  turnos       boolean not null default false,
  por_servicio boolean not null default false
);
```

Esto resuelve el problema de "vender a cafés y a peluquerías" sin duplicar nada:

- Un café prende **pedidos**; una peluquería prende **turnos**. El resto del producto es el mismo.
- Un negocio nuevo se crea sin tocar código ni deployar: es una fila más.
- "Mis tarjetas" del cliente sigue siendo **una sola app** con todas sus tarjetas, sea del
  nicho que sea.

### Módulos

| Módulo | Estado | Qué resuelve |
|---|---|---|
| `pedidos` | **Implementado** | Café/comida: pedir desde la app, la cola del mostrador, sello al entregar. |
| `turnos` | Planificado | Peluquería/barbería: reservar turno; el sello se suma al attending. |
| `por_servicio` | Planificado | Varios tipos de sello por negocio (café / tostado / postre), con cuenta por servicio. |

Cada módulo nuevo sigue el mismo patrón: tabla propia + funciones RPC + una pestaña en el
panel que **solo aparece si el módulo está encendido**. La lógica de negocio no se
duplica: los módulos reusan `biz_stamp`, `biz_stats`, `get_card`, etc.

---

## Estructura del repo

```
app.js                 Todo el frontend (cliente + panel). Sin framework.
index.html             HTML + CSS + CSP de la app principal.
panel/index.html       Wrapper para instalar "Panel de sellos" como PWA.
tarjetas/index.html    Wrapper para instalar "Mis tarjetas" como PWA.
sw.js                  Service worker mínimo (no cacheea, solo habilita la PWA).
sql/001_modulo_pedidos.sql   Migración del módulo de pedidos (tablas + 7 funciones).
privacidad.html        Política de privacidad.
terminos.html          Términos y condiciones.
cookies.html           Aviso de cookies.
```

---

## Deploy

### 1. Frontend

Todo el front es estático. Se sube a cualquier hosting (Netlify / Vercel / GitHub Pages /
Cloudflare Pages). `app.js` se cachea con query string: **al publicar, cambiá `?v=` en
`index.html`** (`<script src="app.js?v=20261025">`).

### 2. Backend (Supabase)

El backend es Postgres con funciones RPC exposed por PostgREST. Para habilitar el módulo
de pedidos:

1. Supabase → **SQL Editor** → New query.
2. Pegá el contenido de `sql/001_modulo_pedidos.sql` → **Run**.
3. Encendé el módulo para tu negocio:

```sql
insert into public.modulos (slug, pedidos) values ('micafe', true)
on conflict (slug) do update set pedidos = true;
```

O desde *Ajustes* del panel (checkbox "Activar pedidos"), que usa la función
`modulo_activar` y valida el PIN reusando `biz_stats`.

> Si el SQL todavía no está pegado, la app **no se rompe**: `get_modulos` falla, el módulo
> queda en `{}` y la pestaña "Pedidos" no aparece. Todo lo demás sigue funcionando.

### 3. Reglas que sigue el módulo nuevo

- El navegador **nunca** toca las tablas: todo pasa por funciones `security definer`.
- El PIN del negocio se valida **reusando `biz_stats`** (no se duplica la lógica).
- La pertenencia de la tarjeta se valida **reusando `get_card`** (no se duplica la lógica).
- El sello del pedido se suma **reusando `biz_stamp`**: respeta caducidad, minutos
  mínimos entre sellos, cumpleaños y el historial.

---

## Contratos RPC que usa el front

| Función | Para qué |
|---|---|
| `get_business`, `get_features`, `get_menu` | Datos públicos del negocio y su menú. |
| `get_card`, `register_customer`, `delete_my_card` | Tarjeta del cliente. |
| `biz_login`, `biz_stats`, `biz_customers`, `biz_report`, `biz_history` | Panel: clientes y métricas. |
| `biz_stamp`, `biz_undo`, `biz_redeem`, `biz_claim` | Sellos, deshacer y canjes. |
| `biz_update`, `biz_set_contact`, `biz_set_bg`, `biz_menu_*` | Configuración del negocio. |
| `get_modulos`, `modulo_activar` | **Módulo pedidos**: qué módulos tiene encendidos. |
| `pedido_crear`, `pedidos_listar`, `pedido_entregar`, `pedido_cancelar`, `pedidos_mios` | **Módulo pedidos**: cola y ciclo de vida del pedido. |

Contrato de error del backend: las funciones de negocio devuelven
`{"error":"PIN incorrecto"}` en vez de tirar excepción; el front lo muestra tal cual.

---

## Ideas para seguir

- **Sello al cobrar o al entregar**: hoy el pedido sella al entregar. Si en un café se
  cobra antes de preparar, se puede mover al paso "cobrar".
- **Módulo turnos**: misma grilla que el modo mostrador, pero el sello se suma cuando el
  turno se atiende, y el cliente elige día/hora.
- **Por servicio**: la tarjeta guarda un contador por tipo de servicio y el premio se
  define sobre uno de ellos.
- **Notificación al cliente**: hoy el cliente ve "⏳ tenés un pedido en la barra" al
  abrir el menú; falta el push.
