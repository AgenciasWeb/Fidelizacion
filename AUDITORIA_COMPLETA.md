# AUDITORIA COMPLETA — Fidelizacion (2026-10-23/24)

## COMPLETADO — Grupo 1 (Bugs que rompen la app) — SQL aplicado en Supabase paso a paso
- get_business: todos los campos + welcome_stamps (entero)
- biz_login: mismos campos que get_business
- get_card: birthday MM-DD, expires, claimed
- _eff: borrada la de 3 params (quedó solo 4 params con search_path)
- biz_stamp: bonus cumpleaños + usa _eff 4 params
- biz_redeem: usa _eff 4 params
- biz_customers: birthday, promo_ok, claimed, visits + _eff 4 params
- biz_update: borrada la de 11 params (queda solo 21 params)

## COMPLETADO — Grupo 2 parcial (Seguridad) — SQL aplicado
- pedido_crear: validación de rango/qty 1-99
- modulo_activar: REVOKE implícito
- Rate limit / throttle: documentado para aplicación manual
- Session token refactor: documentado como futuro trabajo

## COMPLETADO — Archivos locales
- sw.js: caché básico (fetch + caches)
- manifest.json: correcto, icons maskable presentes
- app.js: todos los fixes aplicados (birthday, visitaHtml, global vars, storage helper, slug validation, #c= fragment, QR, panel, etc.)

## PENDIENTE — Grupo 3 (Legal) — Requiere confirmación tuya
- privacidad.html placeholders (texto legal básico)
- promo_ok revocación botón (SQL en business)
- delete_my_card / biz_delete_customer cascade (SQL)
- Auto-delete inactivos (SQL)

## PENDIENTE — Grupo 4 (Otros bugs)
- recuperar tarjeta flow (app.js — ya está en código)
- QR scanner fix
- sw.js cache refinado
- pedido_entregar seal logic (verificación en server)
- git purge sql/001_modulo_pedidos.sql (historia)

## PRÓXIMO PASO PARA EL USUARIO
1. Confirmar que los SQL del Grupo 1 funcionaron en Supabase (get_card devuelve birthday, etc.)
2. Aplicar SQL del Grupo 3 (legal) si quiere completar todo
3. Hacer git push a origin/main para actualizar GitHub Pages
4. Verificar live: https://bnyfhoxrezvotfktrxmb.supabase.co + site en GitHub Pages
