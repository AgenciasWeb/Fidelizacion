/* Anti-clickjacking: si la pagina esta dentro de un marco de otro sitio, salir */
try { if (window.top !== window.self) window.top.location.href = window.self.location.href; } catch (e) { document.documentElement.style.display = 'none'; }

/* ====== CONFIGURACIÓN: pegá tus datos de Supabase (Project Settings > API) ====== */
const SUPABASE_URL = "https://bnyfhoxrezvotfktrxmb.supabase.co";
const SUPABASE_KEY = "sb_publishable_tSt87CXb32Up5zSTfgTfZg_uVVMXuuS";
/* ================================================================================ */

const $app = document.getElementById('app');
const qs = new URLSearchParams(location.search);
const isPanel = qs.has('panel');
let _s = ''; try { _s = localStorage.getItem('panel_slug') || ''; } catch {}
const slug = (qs.get('b') || (isPanel ? _s : '')).toLowerCase();
let biz = null, pin = sessionStorage.getItem('pin_' + slug) || '', stream = null, poll = null;

async function rpc(fn, args) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && d.message) || 'Error de conexión');
  if (d && d.error) throw new Error(d.error);
  return d;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hexOk = x => /^#[0-9a-f]{6}$/i.test(x || '');
const lumOf = c => { if (!hexOk(c)) return 0; const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const textOn = c => lumOf(c) > .179 ? '#1a1a1a' : '#fff';
const mixHex = (a, b) => '#' + [1, 3, 5].map(i => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('');
const setColor = (c, c2) => { const a = hexOk(c) ? c : '#c2410c', b = hexOk(c2) ? c2 : a; document.documentElement.style.setProperty('--ac', a); document.documentElement.style.setProperty('--ac2', b); document.documentElement.style.setProperty('--ac-ink', textOn(mixHex(a, b))); document.documentElement.style.setProperty('--btn-ink', textOn(a)); };
const flash = (el, t, ok) => { el.innerHTML = `<div class="msg ${ok ? 'ok' : 'err'}" role="${ok ? 'status' : 'alert'}">${esc(t)}</div>`; };
/* Cabecera con el color del negocio (mismo lenguaje visual que el menú) */
function bhero(kicker, title, sub, ico, small) {
  return `<header class="bhero${small ? ' hero-sm' : ''}" role="img" aria-label="${esc(title)}">${ico ? `<div class="bhero-ico" aria-hidden="true">${esc(ico)}</div>` : ''}<p class="bhero-k">${esc(kicker)}</p><h1>${esc(title)}</h1>${sub ? `<p class="bhero-u">${sub}</p>` : ''}</header>`;
}
const legalFooter = () => { const f = document.getElementById('ft'); if (!f) return; f.hidden = false; f.innerHTML = ((biz && biz.name) ? `<b>${esc(biz.name)}</b> · ` : '') + '<a href="privacidad.html">Política de privacidad</a> · <a href="terminos.html">Términos y condiciones</a> · <a href="cookies.html">Cookies</a> · <a href="terminos.html#negocio">Datos del negocio</a>'; };
function cookieNotice() { let ok = 1; try { ok = localStorage.getItem('ck_ok'); } catch {} if (ok) return; const el = document.createElement('div'); el.className = 'ck'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Aviso sobre cookies y almacenamiento'); el.innerHTML = '<div><p>No usamos cookies de publicidad ni de seguimiento: solo guardamos tu tarjeta en este dispositivo. <a href="cookies.html">Más información sobre cookies y almacenamiento</a>.</p><button id="cko">Entendido</button></div>'; document.body.appendChild(el); document.body.classList.add('ck-on'); document.getElementById('cko').onclick = () => { try { localStorage.setItem('ck_ok', '1'); } catch {} el.remove(); document.body.classList.remove('ck-on'); }; }
function qr(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag(4, 0); }
function setBg(c) {
  const st = document.documentElement.style, ks = ['--bg', '--card', '--ink', '--mute', '--line'];
  if (!hexOk(c)) { ks.forEach(k => st.removeProperty(k)); return; }
  const rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  const ink = lum > 0.55 ? [26, 26, 26] : [245, 245, 245];
  const mix = (a, b, t) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  st.setProperty('--bg', c); st.setProperty('--card', mix(rgb, ink, 0.06)); st.setProperty('--ink', mix(ink, ink, 0));
  st.setProperty('--mute', mix(rgb, ink, 0.6)); st.setProperty('--line', mix(rgb, ink, 0.18));
}
function stampsGrid(n, on, emoji, tiers, rEmoji) {
  let h = `<div class="grid" role="img" aria-label="${Math.min(on, n)} de ${n} sellos completados">`;
  for (let i = 0; i < n; i++) {
    const last = i === n - 1, tier = (tiers || []).some(t => t.at === i + 1);
    h += `<div class="s ${i < on ? 'on' : ''}${last || tier ? ' tier' : ''}" aria-hidden="true">${last ? esc(rEmoji || '🎁') : i < on ? esc(emoji || '✓') : tier ? '🎁' : ''}</div>`;
  }
  return h + '</div>';
}

/* ---------------- CLIENTE ---------------- */
async function customerView() {
  legalFooter();
  const saved = localStorage.getItem('code_' + slug);
  if (!saved) {
    $app.innerHTML = `${bhero('Tarjeta de sellos', biz.name, 'Juntá ' + biz.stamps_needed + ' sellos y ganá: ' + esc(biz.reward_emoji || '🎁') + ' ' + esc(biz.reward), biz.reward_emoji || '🎁')}
    <div class="card"><h2>Creá tu tarjeta</h2>${biz.welcome_stamps > 0 ? '<p class="mute">Te regalamos ' + biz.welcome_stamps + ' sello' + (biz.welcome_stamps > 1 ? 's' : '') + ' de bienvenida.</p>' : ''}<p class="mute">Solo pedimos tu nombre y tu teléfono: son los datos necesarios para tener tu tarjeta. No pedimos dirección, email ni datos de pago.</p>
    <form id="frm" novalidate>
    <label for="n">Tu nombre</label><input id="n" autocomplete="name" maxlength="80" required aria-required="true">
    <label for="p">Tu teléfono</label><input id="p" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Con característica, sin 0 ni 15" required aria-required="true">
    ${biz.ask_birthday ? '<label for="bd">Tu cumpleaños (opcional)</label><input id="bd" type="date">' : ''}
    ${biz.ask_promo ? '<label class="consent"><input type="checkbox" id="pm"> Quiero recibir ofertas y novedades por WhatsApp (opcional)</label>' : ''}
    <label class="consent"><input type="checkbox" id="ac" required aria-required="true"> Acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y el uso de mis datos solo para esta tarjeta de sellos.</label>
    <button type="submit" id="go">Crear mi tarjeta</button><div id="m" aria-live="polite"></div></form></div>`;
    document.getElementById('frm').onsubmit = async ev => {
      ev.preventDefault();
      const go = document.getElementById('go');
      const name = n.value.trim(), phone = p.value.replace(/\D/g, '');
      if (name.length < 2) return flash(m, 'Escribí tu nombre', false);
      if (phone.length < 6) return flash(m, 'Escribí un teléfono válido', false);
      if (!document.getElementById('ac').checked) return flash(m, 'Tenés que aceptar la política de privacidad para crear tu tarjeta', false);
      go.disabled = true;
      try { const code = await rpc('register_customer', { p_slug: slug, p_name: name, p_phone: phone, p_birthday: document.getElementById('bd')?.value || null, p_promo: !!document.getElementById('pm')?.checked });
        localStorage.setItem('code_' + slug, code); customerView(); }
      catch (e) { go.disabled = false; flash(m, e.message, false); }
    };
    return;
  }
  async function draw() {
    try {
      const c = await rpc('get_card', { p_slug: slug, p_code: saved });
      if (!c) { clearInterval(poll); localStorage.removeItem('code_' + slug); return customerView(); }
      const done = c.stamps >= biz.stamps_needed, left = biz.stamps_needed - c.stamps, bdToday = c.birthday && c.birthday === new Date().toLocaleDateString('en-CA').slice(5);
      const pct = Math.max(0, Math.min(100, Math.round((c.stamps / biz.stamps_needed) * 100)));
      $app.innerHTML = `${bhero(done ? '¡Tarjeta completa!' : 'Tu tarjeta', biz.name, 'Hola, ' + esc(c.name), biz.stamp_emoji || biz.reward_emoji || '⭐', true)}${biz.notice ? '<div class="card notice">' + esc(biz.notice) + '</div>' : ''}${bdToday ? '<div class="card notice">🎂 ¡Feliz cumpleaños, ' + esc(c.name.split(' ')[0]) + '!' + (biz.birthday_stamp ? ' Pasá hoy por el local y te regalamos 1 sello extra.' : '') + '</div>' : ''}
      <div class="card">${stampsGrid(biz.stamps_needed, c.stamps, biz.stamp_emoji, biz.tiers, biz.reward_emoji)}
      <div class="prog" role="progressbar" aria-valuenow="${c.stamps}" aria-valuemin="0" aria-valuemax="${biz.stamps_needed}" aria-label="${c.stamps} de ${biz.stamps_needed} sellos"><i style="width:${pct}%"></i></div>
      <p class="prog-t"><span>${c.stamps} de ${biz.stamps_needed} sellos</span><span class="mute">${done ? '¡Listo!' : 'Faltan ' + left}</span></p>
      <p class="mute" style="text-align:center;margin-top:10px">${done ? esc(biz.ready_msg || '¡Completaste la tarjeta! Mostrala para canjear') + ': ' : 'Tu premio: '}${esc(biz.reward_emoji || '🎁')} ${esc(biz.reward)}</p>
      ${(biz.tiers || []).map(t => '<p class="mute" style="margin:4px 0;text-align:center">🎁 Sello ' + t.at + ': ' + esc(t.reward) + (c.stamps >= t.at ? ((c.claimed || []).includes(t.at) ? ' ✔ canjeado' : ' · ¡listo para canjear!') : '') + '</p>').join('')}
      ${c.expires && c.stamps > 0 && !done ? '<p class="mute" style="text-align:center;margin:8px 0 0">⏳ Tus sellos vencen el ' + esc(c.expires) + '</p>' : ''}</div>
      <div class="card"><p class="mute" style="text-align:center;margin:0 0 4px">Mostrá este código al negocio para sumar un sello</p>
      <div class="qr" role="img" aria-label="Código QR de tu tarjeta de ${esc(biz.name)}. Tu código es ${esc(c.code)}">${qr(c.code)}</div><div class="code">${esc(c.code)}</div>
      <p class="mute" style="text-align:center;margin:12px 0 0">Premios canjeados: ${c.rewards}</p></div>${bizData()}${links()}
      <p class="legal" style="text-align:center;margin-top:8px"><a href="#" id="del">Borrar mi tarjeta y mis datos</a></p><div id="dm" aria-live="polite"></div>
      ${biz.menu_enabled ? '<p class="legal" style="text-align:center;margin-top:6px"><a href="?b=' + encodeURIComponent(slug) + '&panel=1&tab=menu">Soy el dueño: editar el menú</a></p>' : ''}`;
      document.getElementById('del').onclick = async e => {
        e.preventDefault();
        if (!confirm('¿Borrar tu tarjeta de ' + biz.name + '? Se eliminan tu nombre, teléfono y todos tus sellos. No se puede deshacer.')) return;
        clearInterval(poll);
        try { await rpc('delete_my_card', { p_slug: slug, p_code: saved }); localStorage.removeItem('code_' + slug); customerView(); }
        catch (err) { flash(document.getElementById('dm'), err.message, false); poll = setInterval(() => { if (!document.hidden) draw(); }, 10000); }
      };
    } catch (e) { $app.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  }
  await draw(); poll = setInterval(() => { if (!document.hidden) draw(); }, 10000);
}

/* ---------------- NEGOCIO ---------------- */
function loginView(err) {
  $app.innerHTML = `${bhero('Panel del negocio', biz.name, 'Ingresá con el PIN para administrar tu tarjeta de sellos', '🔒', true)}<div class="card"><form id="frm"><label for="pn">PIN del negocio</label>
  <input id="pn" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12" required aria-required="true"><p class="mute" style="margin:8px 0 0">El PIN es personal y secreto. No lo compartas con nadie.</p>
  <button type="submit" id="go">Entrar</button><div id="m" aria-live="polite">${err ? `<div class="msg err" role="alert">${esc(err)}</div>` : ''}</div></form></div>`;
  document.getElementById('frm').onsubmit = async ev => {
    ev.preventDefault();
    const go = document.getElementById('go');
    go.disabled = true;
    try { const b = await rpc('biz_login', { p_slug: slug, p_pin: pn.value }); pin = pn.value; sessionStorage.setItem('pin_' + slug, pin); biz = { ...biz, ...b }; setColor(b.color, b.color2); panel(qs.get('tab') || 'stamp'); }
    catch (e) { go.disabled = false; flash(m, e.message, false); }
  };
}
function posterView() {
  document.title = 'Cartel ' + biz.name;
  $app.innerHTML = `<div class="card" style="text-align:center;padding:28px">${bhero('Escaneá y sumá sellos', biz.name, 'Escaneá el código y creá tu tarjeta', biz.stamp_emoji || '⭐')}<div class="qr" style="width:280px" role="img" aria-label="Código QR para escanear y crear tu tarjeta de ${esc(biz.name)}">${qr(location.origin + location.pathname + '?b=' + slug)}</div><p class="mute">Premio: ${esc(biz.reward_emoji || '🎁')} ${esc(biz.reward)}</p></div><button class="noprint" id="prn">Imprimir</button>`;
  document.getElementById('prn').onclick = () => window.print();
}
function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }

function panel(tab) {
  if (!({ stamp: 1, list: 1, stats: 1, cfg: 1, menu: 1 })[tab] || (tab === 'menu' && !biz.menu_enabled)) tab = 'stamp';
  if (menuDirty && tab !== 'menu' && !confirm('Tenés cambios sin guardar en el menú. ¿Salir sin guardar?')) return;
  stopCam(); stopMenuWarn();
  legalFooter();
  const T = [['stamp', 'Sumar sello'], ['list', 'Clientes'], ['stats', 'Resumen'], ['cfg', 'Ajustes']];
  if (biz.menu_enabled) T.push(['menu', 'Menú']);
  $app.innerHTML = `${bhero('Panel del negocio', biz.name, '', biz.stamp_emoji || biz.reward_emoji || '⚙️', true)}${installHtml('panel')}<div class="tabs${T.length > 4 ? ' t5' : ''}" role="tablist" aria-label="Secciones del panel">${T.map(t => `<button role="tab" aria-selected="${t[0] === tab}" aria-controls="v" class="${t[0] === tab ? 'on' : ''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div id="v" role="tabpanel" tabindex="0"></div>`;
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => panel(b.dataset.t));
  ({ stamp: stampTab, list: listTab, stats: statsTab, cfg: cfgTab, menu: menuTab })[tab]();
}

async function stampTab() {
  v.innerHTML = `<div class="card"><label for="q">Buscar cliente por nombre o teléfono</label><input id="q" autocomplete="off" placeholder="Escribí un nombre">
  ${biz.allow_double ? '<label class="consent" style="font-size:15px"><input type="checkbox" id="dbl"> Sumar 2 sellos (compra grande)</label>' : ''}<div id="res"></div><div id="m" aria-live="polite"></div>
  <button class="alt" id="cam">Escanear QR del cliente con la cámara</button>${biz.menu_enabled ? '<button class="alt" id="mgo" style="margin-top:8px">Editar el menú</button>' : ''}<video id="vid" playsinline muted hidden aria-label="Vista de la cámara para escanear el código del cliente"></video></div>`;
  let L = [];
  const render = () => {
    const t = q.value.trim().toLowerCase();
    const f = L.filter(c => !t || c.name.toLowerCase().includes(t) || c.phone.includes(t) || c.code.toLowerCase() === t).slice(0, 30);
    res.innerHTML = f.length ? f.map(c => {
      const done = c.stamps >= biz.stamps_needed;
      const tb = (biz.tiers || []).filter(t => c.stamps >= t.at && !(c.claimed || []).includes(t.at)).map(t => '<button class="alt sm" data-f="biz_claim" data-at="' + t.at + '" data-c="' + esc(c.code) + '">Canjear: ' + esc(t.reward) + '</button>').join('');
      return `<div class="row" style="flex-wrap:wrap"><div><b>${esc(c.name)}</b><div class="mute">${esc(c.phone)} · ${c.stamps}/${biz.stamps_needed} sellos</div></div>
      <button class="sm" data-f="${done ? 'biz_redeem' : 'biz_stamp'}" data-c="${esc(c.code)}">${done ? 'Canjear premio' : 'Sumar sello'}</button>${tb}</div>`;
    }).join('') : '<p class="mute" style="margin-top:12px">No hay clientes con ese nombre. Si es nuevo, que cree su tarjeta con el link o la tarjeta NFC.</p>';
    res.querySelectorAll('button').forEach(b => b.onclick = () => act(b.dataset.f, b.dataset.c, +b.dataset.at));
  };
  const load = async () => { try { L = await rpc('biz_customers', { p_slug: slug, p_pin: pin }); render(); } catch (e) { flash(m, e.message, false); } };
  let busy = false;
  const act = async (fn, code, at) => {
    if (busy) return;
    busy = true; res.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const args = { p_slug: slug, p_pin: pin, p_code: code }; if (fn === 'biz_claim') args.p_at = at;
      if (fn === 'biz_stamp') args.p_qty = document.getElementById('dbl')?.checked ? 2 : 1;
      const r = await rpc(fn, args);
      flash(m, fn === 'biz_stamp' ? `Sello sumado a ${r.name}: ${r.stamps} de ${r.needed}` + (r.bonus ? ' 🎂 (incluye 1 de regalo por su cumpleaños)' : '') : fn === 'biz_claim' ? `Canjeado a ${r.name}: ${r.reward}` : `Premio canjeado: ${r.name}. Tarjeta reiniciada`, true);
      q.value = ''; stopCam(); vid.hidden = true; load();
      if (fn === 'biz_stamp') { m.insertAdjacentHTML('beforeend', '<button class="alt" id="und">Deshacer este sello</button>');
        und.onclick = async () => { und.disabled = true; try { await rpc('biz_undo', { p_slug: slug, p_pin: pin, p_code: code }); flash(m, 'Sello deshecho', true); load(); } catch (e) { flash(m, e.message, false); } }; }
    } catch (e) { flash(m, e.message, false); render(); }
    finally { busy = false; }
  };
  q.oninput = render; load();
  const mgo = document.getElementById('mgo');
  if (mgo) mgo.onclick = () => panel('menu');
  cam.onclick = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      vid.srcObject = stream; vid.hidden = false; await vid.play();
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      (function scan() {
        if (!stream) return;
        if (vid.videoWidth) { cv.width = vid.videoWidth; cv.height = vid.videoHeight; cx.drawImage(vid, 0, 0);
          const r = jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
          if (r && /^[A-Z0-9]{6,8}$/i.test(r.data)) { return act('biz_stamp', r.data.toUpperCase()); } }
        requestAnimationFrame(scan);
      })();
    } catch { flash(m, 'No se pudo abrir la cámara. Buscá al cliente por nombre', false); }
  };
}

let inst = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); inst = e; });
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esAndroid = () => /Android/i.test(navigator.userAgent);
const yaInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
/* Cada app vive en su propia carpeta (panel/ y tarjetas/) con su manifiesto y su
   scope propios. Es la forma que recomienda el navegador para tener dos apps
   instalables del mismo sitio: si comparten el scope, instalar una impide que
   ofrezca instalar la otra. */
const paginaApp = kind => kind === 'panel' ? 'panel/' : 'tarjetas/';
const enPaginaApp = kind => (kind === 'panel') === /\/panel\/?$/.test(location.pathname) && /\/(panel|tarjetas)\/?$/.test(location.pathname);
function pasosInstalar(kind) {
  if (esIOS()) return 'Tocá el botón <b>Compartir</b> (el cuadradito con la flecha hacia arriba) y elegí <b>“Agregar a pantalla de inicio”</b>.';
  if (esAndroid()) return 'Tocá el menú de los tres puntos (⋮) y elegí <b>“Instalar aplicación”</b> (o “Agregar a pantalla de inicio”).';
  return 'Abrí el menú del navegador (⋮ en Chrome, o Compartir en Safari) y elegí <b>“Instalar aplicación”</b>.';
}
function installApp(btn) {
  const kind = btn.dataset.kind || 'card';
  const msg = btn.parentElement.querySelector('[data-imsg]');
  /* Si el navegador ya nos dio su propio aviso de instalación, lo usamos. */
  if (inst) { inst.prompt(); inst = null; if (msg) msg.innerHTML = ''; return; }
  /* Si no estamos en la página propia de la app, vamos ahí: es donde el
     navegador ofrece instalar la app correcta. */
  if (!enPaginaApp(kind)) { location.href = paginaApp(kind); return; }
  if (msg) msg.innerHTML = pasosInstalar(kind);
}
function installHtml(kind) {
  if (yaInstalada()) return '';
  const rot = kind === 'panel' ? 'Instalar el Panel de sellos' : 'Instalar la app Mis tarjetas';
  const txt = kind === 'panel' ? 'El panel del negocio, como app en tu celular.' : 'Todas tus tarjetas juntas, como app en tu celular.';
  return `<div class="instbox"><button data-inst data-kind="${kind}">${rot}</button><p class="mute" style="margin:6px 0 0">${txt}</p><div class="mute" data-imsg aria-live="polite"></div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-inst]'); if (b) installApp(b); });
function links() {
  const mn = (biz && biz.menu_enabled) ? `<a class="btn alt" style="display:block;margin-top:12px" href="?b=${encodeURIComponent(slug)}&menu=1">Ver menú</a>` : '';
  const sig = installHtml('card');
  return `<div class="card">${sig}${sig ? '<p class="mute" style="text-align:center;margin:14px 0 0">o</p>' : ''}<a class="btn alt" style="display:block;margin-top:12px" href="?mis-tarjetas">Ver todas mis tarjetas</a></div>`;
}
function bizData() {
  if (!biz || (!biz.address && !biz.phone && !biz.email)) return '';
  const l = [];
  if (biz.address) l.push(esc(biz.address));
  if (biz.phone) l.push('Teléfono: ' + esc(biz.phone));
  if (biz.email) l.push('Email: ' + esc(biz.email));
  return `<div class="card"><h2>Datos del negocio</h2><p style="margin:0 0 6px"><b>${esc(biz.name)}</b></p><p class="mute" style="margin:0">${l.join('<br>')}</p></div>`;
}

async function statsTab() {
  v.innerHTML = '<p class="mute">Cargando…</p>';
  try {
    const [S, L, R] = await Promise.all([rpc('biz_stats', { p_slug: slug, p_pin: pin }), rpc('biz_customers', { p_slug: slug, p_pin: pin }), rpc('biz_report', { p_slug: slug, p_pin: pin })]);
    const old = L.filter(c => Date.now() - new Date(c.last_seen) > 30 * 864e5);
    const DN = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], byDay = {};
    R.days.forEach(x => byDay[x.d] = x.n);
    const ds = [...Array(30)].map((_, i) => new Date(Date.now() - (29 - i) * 864e5).toLocaleDateString('en-CA'));
    const dayV = ds.map(k => byDay[k] || 0), dowV = [0, 1, 2, 3, 4, 5, 6].map(i => (R.dow.find(x => x.d === i) || {}).n || 0), hrV = [...Array(24)].map((_, i) => (R.hours.find(x => x.h === i) || {}).n || 0);
    const peak = a => a.indexOf(Math.max(...a));
    const bars = (arr, lab, hi) => `<div aria-hidden="true" style="display:flex;align-items:flex-end;gap:2px;height:70px">${arr.map((n, i) => `<div title="${lab(i)}: ${n}" style="flex:1;height:${n ? Math.max(n / Math.max(...arr) * 100, 6) : 2}%;background:${i === hi ? 'var(--ac)' : 'var(--line)'};border-radius:2px"></div>`).join('')}</div>`;
    const trend = (a, b) => b ? ` (${a >= b ? '+' : ''}${Math.round((a - b) / b * 100)}% vs mes anterior)` : '';
    const chartHtml = `<div class="card"><h2>Este mes</h2><p style="margin:0">${R.m_stamps} sellos${trend(R.m_stamps, R.p_stamps)}<br>${R.m_new} clientes nuevos${trend(R.m_new, R.p_new)}</p></div>
    <div class="card"><h2>Sellos por día</h2><p class="mute" style="margin:0 0 6px">Últimos 30 días: ${dayV.reduce((a, b) => a + b, 0)} sellos en total; el día con más fue ${Math.max(...dayV)}.</p>${bars(dayV, i => ds[i].slice(8) + '/' + ds[i].slice(5, 7), -1)}</div>
    <div class="card"><h2>Cuándo vienen más</h2><p class="mute" style="margin:0 0 6px">Por día de la semana (últimos 90 días)</p>${bars(dowV, i => DN[i], peak(dowV))}
      <p class="mute" style="margin:6px 0 14px">${Math.max(...dowV) ? 'Día más fuerte: <b>' + DN[peak(dowV)] + '</b>' : 'Todavía no hay datos.'}</p>
      <p class="mute" style="margin:0 0 6px">Por hora del día</p>${bars(hrV, i => i + ' h', peak(hrV))}
      <p class="mute" style="margin:6px 0 0">${Math.max(...hrV) ? 'Horario más fuerte: <b>de ' + peak(hrV) + ' a ' + (peak(hrV) + 1) + ' h</b>' : ''}</p></div>`;
    const top = [...L].filter(c => c.visits > 0).sort((a, b) => b.visits - a.visits).slice(0, 5);
    const day0 = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const bds = L.filter(c => c.birthday).map(c => { const [m, d] = c.birthday.split('-').map(Number); let t = new Date(day0.getFullYear(), m - 1, d); if (t < day0) t = new Date(day0.getFullYear() + 1, m - 1, d); return { c, days: Math.round((t - day0) / 864e5) }; }).filter(x => x.days <= 7).sort((a, b) => a.days - b.days);
    const waLink = (phone, t) => { let d = phone.replace(/\D/g, '').replace(/^0+/, ''); if (!d.startsWith('54')) d = '549' + d; return 'https://wa.me/' + d + '?text=' + encodeURIComponent(t); };
    const wa = c => {
      let d = c.phone.replace(/\D/g, '').replace(/^0+/, ''); if (!d.startsWith('54')) d = '549' + d;
      const left = biz.stamps_needed - c.stamps;
      const t = `Hola ${c.name.split(' ')[0]}, te esperamos en ${biz.name}! ` + (c.stamps > 0 && left > 0 ? `Te faltan ${left} sellos para tu premio: ${biz.reward}.` : 'Tu tarjeta de sellos te está esperando.');
      return 'https://wa.me/' + d + '?text=' + encodeURIComponent(t);
    };
    v.innerHTML = `<div class="card"><div class="stats">
      <div class="stat"><b>${L.length}</b>clientes</div><div class="stat"><b>${S.today}</b>sellos hoy</div>
      <div class="stat"><b>${S.week}</b>sellos en 7 días</div><div class="stat"><b>${S.redeemed}</b>premios canjeados</div></div></div>
    ${chartHtml}
    <div class="card"><h2>Mejores clientes</h2>${top.length ? top.map(c => `<div class="row"><b>${esc(c.name)}</b><span>${c.visits} visitas</span></div>`).join('') : '<p class="mute">Todavía no hay datos.</p>'}</div>
    ${!biz.ask_birthday ? '' : `<div class="card"><h2>Cumplen esta semana</h2>${bds.length ? bds.map(x => `<div class="row"><div><b>${esc(x.c.name)}</b><div class="mute">${x.days === 0 ? 'Hoy' : 'En ' + x.days + ' día' + (x.days > 1 ? 's' : '')}</div></div>${(x.c.promo_ok || !biz.ask_promo) ? '<a class="btn sm" target="_blank" rel="noopener noreferrer" href="' + waLink(x.c.phone, (biz.birthday_msg || '¡Feliz cumpleaños, {nombre}! 🎂 Te saludamos de {negocio}. Te esperamos para festejar.').replace(/\{nombre\}/g, x.c.name.split(' ')[0]).replace(/\{negocio\}/g, biz.name)) + '">Saludar por WhatsApp</a>' : (biz.ask_promo ? '<span class="mute">No aceptó mensajes</span>' : '')}</div>`).join('') : '<p class="mute">Nadie por ahora.</p>'}</div>`}
    <div class="card"><h2>Hace más de 30 días que no vienen</h2>${old.length ? old.map(c => `<div class="row"><div><b>${esc(c.name)}</b><div class="mute">${c.stamps}/${biz.stamps_needed} sellos</div></div>${(c.promo_ok || !biz.ask_promo) ? '<a class="btn sm" target="_blank" rel="noopener noreferrer" href="' + wa(c) + '">Escribir por WhatsApp</a>' : (biz.ask_promo ? '<span class="mute">No aceptó ofertas</span>' : '')}</div>`).join('') : '<p class="mute">Nadie por ahora. Buena señal.</p>'}</div>`;
  } catch (e) { v.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
}

const savedCards = () => {
  try { return Object.keys(localStorage).filter(k => k.startsWith('code_')).map(k => [k.slice(5), localStorage.getItem(k)]); } catch { return []; }
};
async function walletView() {
  document.title = 'Mis tarjetas';
  legalFooter();
  $app.innerHTML = `${bhero('Tus tarjetas', 'Mis tarjetas', 'Todas tus tarjetas de sellos en un solo lugar', '🎴')}<div id="w"></div>`;
  const w = document.getElementById('w'), list = savedCards();
  if (!list.length) { w.innerHTML = '<div class="card"><p class="mute" style="margin:0">Todavía no tenés tarjetas en este celular. Acercá el celular a la tarjeta NFC de un negocio y creá la tuya.</p></div>'; return; }
  w.innerHTML = '<p class="mute">Cargando…</p>';
  const rows = await Promise.all(list.map(async ([sl, code]) => {
    try {
      const [b, c] = await Promise.all([rpc('get_business', { p_slug: sl }), rpc('get_card', { p_slug: sl, p_code: code })]);
      return b && c ? { sl, b, c } : { sl, gone: true };
    } catch { return { sl, err: true }; }
  }));
  w.innerHTML = rows.map(r => {
    let card;
    if (r.gone || r.err) card = `<div class="card" style="margin:0"><b>${esc(r.sl)}</b><p class="mute" style="margin:6px 0 0">${r.gone ? 'Esta tarjeta ya no existe.' : 'No se pudo cargar. Revisá tu conexión.'}</p></div>`;
    else {
      const col = hexOk(r.b.color) ? r.b.color : '#c2410c', col2 = hexOk(r.b.color2) ? r.b.color2 : col, left = r.b.stamps_needed - r.c.stamps;
      card = `<a class="wcard" href="?b=${encodeURIComponent(r.sl)}" style="background:linear-gradient(135deg,${col},${col2});color:${textOn(mixHex(col, col2))}"><b>${esc(r.b.name)}</b><span>${r.c.stamps} de ${r.b.stamps_needed} sellos</span><small>${left <= 0 ? '¡Premio listo! ' : 'Te faltan ' + left + ' · '}${esc(r.b.reward_emoji || '🎁')} ${esc(r.b.reward)}</small></a>`;
    }
    return card + `<div class="wrm"><button class="alt sm" data-rm="${esc(r.sl)}">Quitar de este celular</button></div>`;
  }).join('');
  w.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    if (confirm('¿Quitar esta tarjeta de este celular? No perdés tus sellos: para recuperarla después, pedile al negocio que te la recupere.')) { localStorage.removeItem('code_' + b.dataset.rm); walletView(); }
  });
  const ib = installHtml('card');
  if (ib) w.insertAdjacentHTML('beforeend', ib);
}

async function listTab() {
  v.innerHTML = '<p class="mute">Cargando…</p>';
  try {
    const L = await rpc('biz_customers', { p_slug: slug, p_pin: pin });
    const cell = x => { x = String(x ?? ''); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };
    v.innerHTML = `<div class="card"><h2>${L.length} cliente${L.length === 1 ? '' : 's'}</h2>` + (L.length
      ? '<button class="alt" id="exp" style="margin:0 0 8px">Descargar lista (Excel / CSV)</button><p class="mute" style="margin:0 0 8px;font-size:13px">El archivo tiene datos personales de tus clientes. Guardalo de forma segura y usalo solo para esta tarjeta.</p>' + L.map(c =>
        `<div class="row" style="flex-wrap:wrap"><div><b>${esc(c.name)}</b><div class="mute">${esc(c.phone)} · ${c.stamps}/${biz.stamps_needed} sellos</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="alt sm" data-rec="${esc(c.code)}">Pasar a otro celular</button><button class="alt sm" data-h="${esc(c.code)}">Ver historial</button><button class="alt sm" data-del="${esc(c.code)}" data-n="${esc(c.name)}">Borrar cliente</button></div><div id="h-${esc(c.code)}" style="width:100%"></div></div>`).join('')
      : '<p class="mute">Todavía nadie creó su tarjeta. Compartí el link o la tarjeta NFC.</p>') + '</div>';
    const ex = document.getElementById('exp');
    if (ex) ex.onclick = () => {
      const rows = [['Nombre', 'Teléfono', 'Sellos', 'Premios canjeados', 'Visitas', 'Última visita', 'Cumpleaños (día/mes)', 'Aceptó ofertas por WhatsApp']].concat(
        L.map(c => [c.name, c.phone, c.stamps, c.rewards, c.visits, new Date(c.last_seen).toLocaleDateString('es-AR'), c.birthday ? c.birthday.split('-').reverse().join('/') : '', biz.ask_promo ? (c.promo_ok ? 'Sí' : 'No') : 'No se preguntó']));
      const blob = new Blob(['\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clientes-' + slug + '.csv'; a.click();
    };
    v.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
      const box = document.getElementById('h-' + b.dataset.rec);
      if (box.innerHTML) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="qr" role="img" aria-label="Código QR para pasar esta tarjeta a otro celular">' + qr(location.origin + location.pathname + '?b=' + slug + '&c=' + b.dataset.rec) + '</div><p class="mute" style="text-align:center">Que el cliente escanee este QR con su celular nuevo. No lo compartas por otro medio.</p>';
    });
    v.querySelectorAll('[data-h]').forEach(b => b.onclick = async () => {
      const box = document.getElementById('h-' + b.dataset.h);
      if (box.innerHTML) { box.innerHTML = ''; return; }
      try {
        const H = await rpc('biz_history', { p_slug: slug, p_pin: pin, p_code: b.dataset.h });
        box.innerHTML = H.length ? H.map(h => `<div class="mute" style="padding:4px 0">${new Date(h.at).toLocaleString('es-AR')} · ${h.kind === 'redeem' ? 'Premio canjeado' : h.kind === 'tier' ? 'Premio intermedio canjeado (sello ' + h.qty + ')' : '+' + h.qty + ' sello' + (h.qty > 1 ? 's' : '') + (h.bonus ? ' 🎂 (incluye cumpleaños)' : '')}</div>`).join('') : '<div class="mute">Sin movimientos</div>';
      } catch (e) { box.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
    });
    v.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Borrar a ' + b.dataset.n + ' y todos sus datos y sellos? No se puede deshacer. Esta acción borra también su nombre y teléfono.')) return;
      b.disabled = true;
      try { await rpc('biz_delete_customer', { p_slug: slug, p_pin: pin, p_code: b.dataset.del }); listTab(); }
      catch (e) { b.disabled = false; document.getElementById('h-' + b.dataset.del).innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
    });
  } catch (e) { v.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
}

function cfgTab() {
  v.innerHTML = `<div class="card"><h2>Configurar tarjeta</h2>
  <label for="c1">Nombre del negocio</label><input id="c1" value="${esc(biz.name)}">
  <label for="c2">Sellos para el premio (2 a 30)</label><input id="c2" type="number" min="2" max="30" value="${biz.stamps_needed}">
  <label for="c3">Premio</label><input id="c3" value="${esc(biz.reward)}">
  <label for="c20">Emoji del premio</label><input id="c20" maxlength="8" value="${esc(biz.reward_emoji || '🎁')}">
  <label for="c4">Color de la tarjeta</label><input id="c4" type="color" value="${esc(biz.color)}">
  <label for="c13">Segundo color (para degradé; igual al primero = sin degradé)</label><input id="c13" type="color" value="${esc(biz.color2 || biz.color)}">
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c22" style="width:auto" ${biz.bg_color ? '' : 'checked'}> Fondo automático (claro u oscuro según el celular)</label>
  <label for="c21">Color de fondo de la tarjeta</label><input id="c21" type="color" value="${esc(biz.bg_color || '#1c1713')}">
  <label for="c12">Emoji del sello</label><input id="c12" maxlength="8" value="${esc(biz.stamp_emoji || '⭐')}">
  <div id="pv"></div>
  <label for="c14">Aviso para tus clientes (arriba de la tarjeta; vacío = ninguno)</label><input id="c14" maxlength="120" value="${esc(biz.notice || '')}" placeholder="Hoy 2x1 en café">
  <label for="c15">Mensaje cuando el premio está listo (opcional)</label><input id="c15" maxlength="80" value="${esc(biz.ready_msg || '')}" placeholder="¡Tenés un café gratis!">
  <h2 style="margin-top:18px">Datos del negocio (opcionales)</h2>
  <p class="mute" style="margin:0 0 6px;font-size:13px">Se muestran a tus clientes en su tarjeta. No es obligatorio, pero ayuda a que confíen en tu negocio y cumplir con informar quién presta el servicio.</p>
  <label for="c23">Dirección del negocio</label><input id="c23" maxlength="120" value="${esc(biz.address || '')}" placeholder="Calle 123, Ciudad">
  <label for="c24">Teléfono o WhatsApp del negocio</label><input id="c24" type="tel" maxlength="40" value="${esc(biz.phone || '')}" placeholder="Ej: 11 5555-5555">
  <label for="c25">Email de contacto</label><input id="c25" type="email" maxlength="120" value="${esc(biz.email || '')}" placeholder="hola@tunegocio.com">
  <label for="c5">Minutos mínimos entre sellos del mismo cliente (0 = sin límite)</label><input id="c5" type="number" min="0" value="${biz.min_minutes}">
    <label for="c9">Los sellos vencen después de X días sin venir (0 = nunca)</label><input id="c9" type="number" min="0" value="${biz.expiry_days}">
  <label for="c10">Sellos de regalo al crear la tarjeta (0 a 5)</label><input id="c10" type="number" min="0" max="5" value="${biz.welcome_stamps || 0}">
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c11" style="width:auto" ${biz.allow_double ? 'checked' : ''}> Permitir sumar 2 sellos en una compra</label>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c16" style="width:auto" ${biz.ask_birthday ? 'checked' : ''}> Pedir el cumpleaños al crear la tarjeta</label>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c17" style="width:auto" ${biz.ask_promo ? 'checked' : ''}> Pedir permiso para enviar ofertas por WhatsApp</label>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c18" style="width:auto" ${biz.birthday_stamp ? 'checked' : ''}> Regalar 1 sello el día de su cumpleaños</label>
  <label for="c19">Mensaje de cumpleaños para WhatsApp (usá {nombre} y {negocio}; vacío = mensaje por defecto)</label><input id="c19" maxlength="200" value="${esc(biz.birthday_msg || '')}" placeholder="¡Feliz cumple, {nombre}! 🎂 Te esperamos en {negocio} para festejar.">
  <p class="mute" style="margin:6px 0 0">Estas dos opciones funcionan si activaste “Pedir el cumpleaños”.</p>
  <label>Premios intermedios (opcional): se canjean al llegar a ese sello, sin reiniciar la tarjeta</label>
  ${[0, 1, 2].map(i => '<div style="display:flex;gap:8px;margin-top:8px"><input id="tn' + i + '" type="number" min="1" placeholder="Sello nº" style="width:36%" value="' + ((biz.tiers || [])[i]?.at || '') + '"><input id="tr' + i + '" maxlength="60" placeholder="Premio (ej: Café gratis)" value="' + esc((biz.tiers || [])[i]?.reward || '') + '"></div>').join('')}
  <label for="c6">Nuevo PIN (6 a 12 números; vacío = no cambiarlo)</label><input id="c6" type="password" inputmode="numeric">
  <button id="sv">Guardar cambios</button><button class="alt" id="lo">Cerrar sesión</button><div id="m"></div>
  <p class="mute" style="margin-top:14px">Link de tu tarjeta para clientes:<br><b>${esc(location.origin + location.pathname)}?b=${esc(slug)}</b></p><a class="btn alt" style="display:block;margin-top:8px" target="_blank" href="?b=${esc(slug)}&cartel=1">Imprimir cartel con QR</a></div>`;
  const pv = () => { const e = document.getElementById('pv'); e.style.setProperty('--ac', c4.value); e.style.setProperty('--ac2', c13.value); e.style.setProperty('--ac-ink', textOn(mixHex(c4.value, c13.value))); e.innerHTML = stampsGrid(6, 3, c12.value.trim() || '⭐', [], c20.value.trim() || '🎁'); };
  [c4, c12, c13, c20].forEach(i => i.oninput = pv); pv();
  c21.oninput = () => { c22.checked = false; setBg(c21.value); };
  c22.onchange = () => setBg(c22.checked ? '' : c21.value);
  lo.onclick = () => { try { sessionStorage.removeItem('pin_' + slug); } catch {} location.reload(); };
  sv.onclick = async () => {
    const a = { p_slug: slug, p_pin: pin, p_name: c1.value.trim() || biz.name, p_needed: +c2.value, p_reward: c3.value.trim() || 'Premio', p_color: c4.value, p_minutes: +c5.value || 0, p_new_pin: c6.value, p_expiry: +c9.value || 0, p_welcome: +c10.value || 0, p_double: c11.checked, p_emoji: c12.value.trim() || '⭐', p_color2: c13.value, p_notice: c14.value.trim(), p_ready: c15.value.trim(), p_ask_bday: c16.checked, p_ask_promo: c17.checked, p_bday_stamp: c18.checked, p_bday_msg: c19.value.trim(),
      p_tiers: JSON.stringify([0, 1, 2].map(i => ({ at: +document.getElementById('tn' + i).value, reward: document.getElementById('tr' + i).value.trim() })).filter(t => t.at && t.reward).sort((x, y) => x.at - y.at)), p_reward_emoji: c20.value.trim() || '🎁' };
    const bgVal = c22.checked ? '' : c21.value;
    try { await rpc('biz_set_bg', { p_slug: slug, p_pin: pin, p_bg: bgVal }); await rpc('biz_update', a); await rpc('biz_set_contact', { p_slug: slug, p_pin: pin, p_address: c23.value.trim(), p_phone: c24.value.trim(), p_email: c25.value.trim() }); if (c6.value) { pin = c6.value; sessionStorage.setItem('pin_' + slug, pin); }
      biz = { ...biz, name: a.p_name, stamps_needed: a.p_needed, reward: a.p_reward, color: a.p_color, min_minutes: a.p_minutes, expiry_days: a.p_expiry, welcome_stamps: a.p_welcome, allow_double: a.p_double, stamp_emoji: a.p_emoji, color2: a.p_color2, notice: a.p_notice, ready_msg: a.p_ready, ask_birthday: a.p_ask_bday, ask_promo: a.p_ask_promo, birthday_stamp: a.p_bday_stamp, birthday_msg: a.p_bday_msg, tiers: JSON.parse(a.p_tiers), reward_emoji: a.p_reward_emoji, bg_color: bgVal, address: c23.value.trim(), phone: c24.value.trim(), email: c25.value.trim() }; setColor(a.p_color, a.p_color2); legalFooter(); flash(m, 'Cambios guardados', true); }
    catch (e) { flash(m, e.message, false); }
  };
}

/* ---------------- MENÚ ---------------- */
let menuDirty = false;
function menuUnload(e) { if (menuDirty) { e.preventDefault(); e.returnValue = ''; } }
function stopMenuWarn() { menuDirty = false; removeEventListener('beforeunload', menuUnload); }
addEventListener('beforeunload', menuUnload);
const normText = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function menuView() {
  document.title = biz.name + ' · Menú';
  legalFooter();
  if (!biz.menu_enabled) {
    $app.innerHTML = `<h1>${esc(biz.name)}</h1><div class="card"><p class="mute" style="margin:0">Este negocio no tiene menú.</p></div><a class="btn alt" style="display:block" href="?b=${encodeURIComponent(slug)}">Ver mi tarjeta de sellos</a>`;
    return;
  }
  $app.innerHTML = `<div class="mhero"><span class="mhero-ico" aria-hidden="true">🍽️</span><p class="mhero-k">Menú</p><h1>${esc(biz.name)}</h1><p class="mhero-u" id="mu">Cargando menú…</p></div>
  <div class="card"><label for="mq">Buscar en el menú</label><input id="mq" type="search" autocomplete="off" placeholder="Ej: café, torta"></div>
  <div id="ml"></div>
  <a class="btn alt" style="display:block" href="?b=${encodeURIComponent(slug)}">Ver mi tarjeta de sellos</a>`;
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  let data = null, last = 0;
  const render = () => {
    const box = document.getElementById('ml'), mu = document.getElementById('mu');
    if (!box || !mu) return;
    mu.textContent = data && data.updated ? 'Actualizado el ' + new Date(data.updated).toLocaleDateString('es-AR') : 'Elegí lo que más te guste';
    if (!data || !data.enabled) { box.innerHTML = '<div class="card"><p class="mute" style="margin:0">Este negocio no tiene menú.</p></div>'; return; }
    const q = normText(document.getElementById('mq').value);
    const its = (data.items || []).filter(x => !q || normText(x.name).includes(q) || normText(x.description).includes(q));
    if (!its.length) { box.innerHTML = `<div class="card"><p class="mute" style="margin:0">${q ? 'No encontramos nada con ese texto.' : 'Todavía no hay productos cargados.'}</p></div>`; return; }
    const groups = [], seen = {};
    its.forEach(x => { const c = x.category || ''; if (!(c in seen)) { seen[c] = groups.length; groups.push({ c, list: [] }); } groups[seen[c]].list.push(x); });
    const chips = groups.filter(g => g.c).length > 3 ? `<nav class="mchips" aria-label="Categorías del menú">${groups.map((g, i) => g.c ? `<a class="mchip" href="#cat-${i}">${esc(g.c)}</a>` : '').join('')}</nav>` : '';
    box.innerHTML = chips + groups.map((g, i) => {
      const ico = (g.list.map(x => String(x.emoji || '').trim()).find(e => e) || '');
      return `${g.c ? `<h2 class="mhead" id="cat-${i}">${ico ? `<span class="mhead-ico" aria-hidden="true">${esc(ico)}</span>` : ''}<span class="mhead-t">${esc(g.c)}</span><span class="mhead-n">${g.list.length}</span></h2>` : ''}
    <ul class="mlist">${g.list.map(x => { const em = String(x.emoji || '').trim(); return `<li class="mrow${x.available ? '' : ' sold'}">${em ? `<span class="memoji" aria-hidden="true">${esc(em)}</span>` : ''}<div class="mtxt"><b>${esc(x.name)}</b>${x.description ? `<div class="mute">${esc(x.description)}</div>` : ''}</div><div class="mprice"><span class="mprice-v">${money.format(Number(x.price) || 0)}</span>${x.available ? '' : '<span class="badge">Agotado</span>'}</div></li>`; }).join('')}</ul>`;
    }).join('');
  };
  const load = async () => {
    try { data = await rpc('get_menu', { p_slug: slug }); last = Date.now(); render(); }
    catch (e) { const b = document.getElementById('ml'); if (b) b.innerHTML = `<div class="card"><div class="msg err" style="margin:0">${esc(e.message)}</div></div>`; }
  };
  document.getElementById('mq').oninput = render;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !document.getElementById('ml')) return;
    if (Date.now() - last < 60000) return;
    load();
  });
  await load();
}

async function menuTab() {
  menuDirty = false;
  addEventListener('beforeunload', menuUnload);
  let items = [], updated = null;
  v.innerHTML = `<div class="card"><h2>Menú del negocio</h2>
  <p class="mute" style="margin:0 0 8px">Cargá los productos acá y tocá “Guardar cambios”. Se ven en el menú público apenas guardás.</p>
  <p class="mute" id="mt" style="margin:0 0 10px">Última actualización: —</p>
  <label for="mlk">Link del menú para tus clientes</label><input id="mlk" readonly value="">
  <button class="alt sm" id="mcp" style="margin-top:8px">Copiar link</button><div id="mcs" aria-live="polite"></div></div>
  <div class="card"><div id="mg"></div>
  <button class="alt" id="mnc">+ Nueva categoría</button>
  <p class="msg err" id="mdy" hidden>Tenés cambios sin guardar</p>
  <button id="msv">Guardar cambios</button><div id="mm" aria-live="polite"></div></div>
  <div class="card"><h2>Subir o bajar todos los precios</h2>
  <p class="mute" style="margin:0 0 6px">Se aplica a todos los productos del menú.</p>
  <label for="mpc">Porcentaje (ej: 10 para subir, -5 para bajar)</label><input id="mpc" type="number" inputmode="decimal" step="any" min="-50" max="200" value="10">
  <label for="mrn">Redondeo del precio final</label><select id="mrn"><option value="0">Sin redondeo</option><option value="10">A 10</option><option value="50">A 50</option><option value="100">A 100</option></select>
  <button class="alt" id="mbp">Aplicar a todos los productos</button><div id="mb2" aria-live="polite"></div></div>
  <div class="card"><h2>Pegar lista rápida</h2>
  <p class="mute" style="margin:0 0 6px">Una línea por producto con el formato <b>Categoría; Nombre; Precio</b>. Ejemplo: <b>Cafés; Espresso; 900</b></p>
  <label for="mpaste">Lista</label><textarea id="mpaste" rows="4"></textarea>
  <button class="alt" id="mpg">Agregar a la lista</button><div id="mpmsg" aria-live="polite"></div></div>`;
  mlk.value = location.origin + location.pathname + '?b=' + slug + '&menu=1';
  const normCat = s => String(s ?? '').trim().slice(0, 40);
  const regroup = arr => { const g = [], ix = {}; arr.forEach(x => { const c = x.category || ''; if (!(c in ix)) { ix[c] = g.length; g.push([]); } g[ix[c]].push(x); }); return [].concat(...g); };
  const pushItem = it => { let last = -1; items.forEach((x, i) => { if (x.category === it.category) last = i; }); const at = last < 0 ? items.length : last + 1; items.splice(at, 0, it); return at; };
  const setDirty = d => { menuDirty = d; const el = document.getElementById('mdy'); if (el) el.hidden = !d; };
  const updLine = () => { mt.textContent = 'Última actualización: ' + (updated ? new Date(updated).toLocaleString('es-AR') : '—'); };
  const adopt = r => { updated = r.updated; items = regroup((r.items || []).map(x => ({ id: x.id, category: normCat(x.category), name: x.name || '', description: x.description || '', price: Number(x.price) || 0, available: !!x.available, hidden: !!x.hidden, emoji: x.emoji || '' }))); setDirty(false); updLine(); };
  const reload = async () => { try { adopt(await rpc('biz_menu_list', { p_slug: slug, p_pin: pin })); render(); } catch (e) { flash(mm, e.message, false); } };
  const render = () => {
    const box = document.getElementById('mg');
    if (!box) return;
    const groups = [], ix = {};
    items.forEach((x, i) => { const c = x.category || ''; if (!(c in ix)) { ix[c] = groups.length; groups.push({ c, rows: [], start: i }); } groups[ix[c]].rows.push({ x, i }); });
    const cats = groups.map(g => g.c);
    box.innerHTML = groups.length ? groups.map(g => `
    <div class="ecat"><input data-cat="${g.start}" value="${esc(g.c)}" maxlength="40" placeholder="Sin categoría" aria-label="Nombre de la categoría" style="max-width:55%"><span class="mute">${g.rows.length} producto${g.rows.length === 1 ? '' : 's'}</span><button class="alt sm" data-ac="${esc(g.c)}" style="margin-left:auto">+ Agregar producto</button></div>
    ${g.rows.map(r => { const it = r.x, i = r.i; return `
    <div class="erow"><input class="eemoji" data-emo="${i}" value="${esc(it.emoji || '')}" maxlength="8" placeholder="🍔" aria-label="Emoji del producto ${i + 1}"><input class="eic" data-name="${i}" value="${esc(it.name)}" maxlength="80" aria-label="Nombre del producto ${i + 1}">
    <input data-price="${i}" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.price)}" aria-label="Precio del producto ${i + 1}">
    <span class="ebtns"><button class="alt sm" data-up="${i}" aria-label="Subir el producto ${i + 1}">↑</button><button class="alt sm" data-dn="${i}" aria-label="Bajar el producto ${i + 1}">↓</button><button class="alt sm" data-del="${i}" aria-label="Eliminar el producto ${i + 1}">✕</button></span></div>
    <div class="eopts">${cats.length > 1 ? `<label class="consent"><span class="mute">Categoría:</span> <select data-mv="${i}" aria-label="Categoría del producto ${i + 1}">${cats.map(c => `<option value="${esc(c)}"${c === it.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>` : ''}<label class="consent"><input type="checkbox" data-sld="${i}" ${it.available ? '' : 'checked'}> Agotado</label><label class="consent"><input type="checkbox" data-hid="${i}" ${it.hidden ? 'checked' : ''}> Ocultar del menú público</label></div>
    <details><summary>Descripción</summary><textarea data-dsc="${i}" maxlength="200" rows="2" aria-label="Descripción del producto ${i + 1}">${esc(it.description)}</textarea></details>`; }).join('')}`).join('')
      : '<p class="mute">Todavía no hay productos. Empezá con “+ Nueva categoría”.</p>';
    box.querySelectorAll('[data-cat]').forEach(el => el.onchange = () => { const i = +el.dataset.cat, old = items[i].category, nw = normCat(el.value); if (nw === old) { el.value = old; return; } items.forEach(x => { if (x.category === old) x.category = nw; }); setDirty(true); render(); });
    box.querySelectorAll('[data-ac]').forEach(el => el.onclick = () => { const at = pushItem({ id: null, category: el.dataset.ac, name: '', description: '', price: 0, available: true, hidden: false, emoji: '' }); setDirty(true); render(); const f = box.querySelector('[data-name="' + at + '"]'); if (f) f.focus(); });
    box.querySelectorAll('[data-name]').forEach(el => el.oninput = () => { items[+el.dataset.name].name = el.value; setDirty(true); });
    box.querySelectorAll('[data-emo]').forEach(el => el.oninput = () => { items[+el.dataset.emo].emoji = el.value.slice(0, 8); setDirty(true); });
    box.querySelectorAll('[data-price]').forEach(el => el.oninput = () => { items[+el.dataset.price].price = Number(el.value); setDirty(true); });
    box.querySelectorAll('[data-dsc]').forEach(el => el.oninput = () => { items[+el.dataset.dsc].description = el.value; setDirty(true); });
    box.querySelectorAll('[data-sld]').forEach(el => el.onchange = () => { items[+el.dataset.sld].available = !el.checked; setDirty(true); });
    box.querySelectorAll('[data-hid]').forEach(el => el.onchange = () => { items[+el.dataset.hid].hidden = el.checked; setDirty(true); });
    box.querySelectorAll('[data-mv]').forEach(el => el.onchange = () => {
      const i = +el.dataset.mv, nc = el.value;
      if (nc === items[i].category) return;
      if (!nc) { el.value = items[i].category; return; }
      const it = items.splice(i, 1)[0];
      it.category = nc;
      let last = -1; items.forEach((x, k) => { if (x.category === nc) last = k; });
      items.splice(last < 0 ? items.length : last + 1, 0, it);
      setDirty(true); render();
    });
    box.querySelectorAll('[data-del]').forEach(el => el.onclick = () => { const i = +el.dataset.del; if (!confirm('¿Eliminar “' + (items[i].name || 'producto sin nombre') + '” del menú? Se borra cuando guardás.')) return; items.splice(i, 1); setDirty(true); render(); });
    box.querySelectorAll('[data-up]').forEach(el => el.onclick = () => { const i = +el.dataset.up; if (i > 0 && items[i - 1].category === items[i].category) { const t = items[i - 1]; items[i - 1] = items[i]; items[i] = t; setDirty(true); render(); } });
    box.querySelectorAll('[data-dn]').forEach(el => el.onclick = () => { const i = +el.dataset.dn; if (i < items.length - 1 && items[i + 1].category === items[i].category) { const t = items[i + 1]; items[i + 1] = items[i]; items[i] = t; setDirty(true); render(); } });
  };
  document.getElementById('mnc').onclick = () => {
    const c = prompt('Nombre de la nueva categoría');
    if (c === null) return;
    const nc = normCat(c);
    if (!nc) return flash(mm, 'Escribí un nombre para la categoría', false);
    if (nc.length > 40) return flash(mm, 'La categoría no puede superar los 40 caracteres', false);
    const at = pushItem({ id: null, category: nc, name: '', description: '', price: 0, available: true, hidden: false, emoji: '' });
    setDirty(true); render();
    const f = document.querySelector('#mg [data-name="' + at + '"]'); if (f) f.focus();
  };
  document.getElementById('msv').onclick = async () => {
    if (!items.length && !confirm('¿Guardar el menú vacío? Se van a borrar todos los productos.')) return;
    if (items.some(x => !x.name.trim() || x.name.trim().length > 80)) return flash(mm, 'Todos los productos necesitan un nombre de 1 a 80 caracteres', false);
    if (items.some(x => !isFinite(Number(x.price)) || Number(x.price) < 0)) return flash(mm, 'Revisá los precios: van solo números, sin letras ni signos', false);
    if (items.some(x => x.category.length > 40)) return flash(mm, 'La categoría no puede superar los 40 caracteres', false);
    const b = document.getElementById('msv'); b.disabled = true;
    try {
      await rpc('biz_menu_save', { p_slug: slug, p_pin: pin, p_items: items.map(x => ({ id: x.id || null, category: x.category, name: x.name.trim(), description: x.description.trim(), price: Number(x.price) || 0, available: !!x.available, hidden: !!x.hidden, emoji: String(x.emoji || '').trim().slice(0, 8) })) });
      setDirty(false); flash(mm, 'Menú guardado', true); await reload();
    } catch (e) { flash(mm, e.message, false); }
    finally { b.disabled = false; }
  };
  document.getElementById('mbp').onclick = async () => {
    const txt = String(mpc.value).trim(), rnd = +mrn.value;
    if (!txt || !isFinite(Number(txt))) return flash(mb2, 'Escribí un porcentaje, por ejemplo 10', false);
    const pct = Number(txt);
    if (pct < -50 || pct > 200) return flash(mb2, 'El porcentaje debe estar entre -50 y 200', false);
    const red = { 0: 'sin redondeo', 10: 'redondeo a 10', 50: 'redondeo a 50', 100: 'redondeo a 100' }[rnd] || 'sin redondeo';
    if (!confirm('¿' + (pct >= 0 ? 'Subir' : 'Bajar') + ' todos los precios en ' + (pct > 0 ? '+' : '') + pct + '% (' + red + ')? No se puede deshacer.')) return;
    const b = document.getElementById('mbp'); b.disabled = true;
    try { const r = await rpc('biz_menu_bump', { p_slug: slug, p_pin: pin, p_percent: pct, p_round: rnd }); await reload(); flash(mb2, r.count + ' precio' + (r.count === 1 ? '' : 's') + ' actualizado' + (r.count === 1 ? '' : 's'), true); }
    catch (e) { flash(mb2, e.message, false); }
    finally { b.disabled = false; }
  };
  document.getElementById('mcp').onclick = async () => {
    try { await navigator.clipboard.writeText(mlk.value); flash(mcs, 'Link copiado', true); }
    catch { mlk.focus(); mlk.select(); flash(mcs, 'Seleccionado: presioná Ctrl+C para copiarlo', true); }
  };
  document.getElementById('mpg').onclick = () => {
    const txt = mpaste.value.trim();
    if (!txt) return flash(mpmsg, 'Pegá primero tu lista', false);
    let ok = 0, mal = 0;
    txt.split(/\r?\n/).forEach(l => {
      const t = l.trim(); if (!t) return;
      let p = t.split(';'); if (p.length < 2) p = t.split('\t'); if (p.length < 2) p = t.split(',');
      const cat = normCat(p[0]), nom = String(p[1] || '').trim().slice(0, 80);
      let raw = String(p[2] || '0').replace(/[^\d.,]/g, '');
      if (raw.indexOf(',') >= 0) raw = raw.replace(/\./g, '').replace(',', '.');
      const price = Number(raw);
      if (!cat || !nom || !isFinite(price) || price < 0) { mal++; return; }
      pushItem({ id: null, category: cat, name: nom, description: '', price: Math.round(price * 100) / 100, available: true, hidden: false, emoji: '' });
      ok++;
    });
    if (!ok) return flash(mpmsg, 'No pude leer ninguna línea. Usá el formato: Categoría; Nombre; Precio', false);
    setDirty(true); render();
    flash(mpmsg, ok + ' producto' + (ok === 1 ? '' : 's') + ' agregado' + (ok === 1 ? '' : 's') + (mal ? ' · ' + mal + ' línea' + (mal === 1 ? '' : 's') + ' descartada' + (mal === 1 ? '' : 's') : '') + '. Revisalos y guardá.', true);
  };
  try { adopt(await rpc('biz_menu_list', { p_slug: slug, p_pin: pin })); render(); }
  catch (e) { document.getElementById('mg').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
}

/* ---------------- ARRANQUE ---------------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
legalFooter();
cookieNotice();
(async () => {
  if (isPanel && !slug) {
    document.title = 'Panel de sellos';
    $app.innerHTML = `${bhero('Panel del negocio', 'Panel de sellos', 'Ingresá el código de tu negocio para administrarlo', '🔒', true)}<div class="card"><form id="frm"><label for="sg">Código de tu negocio</label><input id="sg" autocapitalize="none" maxlength="40" required aria-required="true" placeholder="ej: micafe"><button type="submit" id="go">Continuar</button><div id="m" aria-live="polite"></div></form></div>`;
    document.getElementById('frm').onsubmit = ev => { ev.preventDefault(); const v = sg.value.trim().toLowerCase(); if (/^[a-z0-9-]{2,40}$/.test(v)) location.href = '?b=' + v + '&panel=1'; else flash(m, 'Escribí el código de tu negocio: solo letras, números y guiones', false); };
    return;
  }
  if (qs.has('mis-tarjetas') || (!slug && savedCards().length)) return walletView();
  if (!slug) { $app.innerHTML = `${bhero('Tarjeta de sellos', 'Falta el negocio', 'Pedile al negocio el link o el código QR correcto', '🔗', true)}<div class="card"><p class="mute" style="margin:0">El link tiene que incluir el negocio. Ejemplo: <b>?b=nombre-del-negocio</b></p></div>`; return; }
  try {
    biz = await rpc('get_business', { p_slug: slug });
    if (!biz) { $app.innerHTML = '<div class="msg err">Negocio no encontrado</div>'; return; }
    setColor(biz.color, biz.color2); setBg(biz.bg_color); legalFooter();
    if (isPanel) { document.title = biz.name; try { localStorage.setItem('panel_slug', slug); } catch {} }
    else { document.title = biz.name + ' · Mis tarjetas'; }
    if (qs.has('cartel')) return posterView();
    try { biz.menu_enabled = !!(await rpc('get_features', { p_slug: slug }))?.menu; } catch { biz.menu_enabled = false; }
    if (qs.has('menu') && !isPanel) return menuView();
    const rc = qs.get('c');
    if (!isPanel && rc && /^[A-Z0-9]{6,8}$/i.test(rc)) { try { localStorage.setItem('code_' + slug, rc.toUpperCase()); history.replaceState(null, '', location.pathname + '?b=' + slug); } catch {} }
    if (!isPanel) return customerView();
    if (pin) { try { const b = await rpc('biz_login', { p_slug: slug, p_pin: pin }); biz = { ...biz, ...b }; return panel(qs.get('tab') || 'stamp'); } catch {} }
    loginView();
  } catch (e) { $app.innerHTML = `<div class="msg err">${esc(e.message)}. Revisá la configuración de Supabase.</div>`; }
})();