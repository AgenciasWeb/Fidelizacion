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
/* Normaliza un teléfono argentino a 10 dígitos (área + número), igual que la
   base de datos. Acepta cómo lo escribe la gente: con 0, con 15, con +54, etc. */
function normPhone(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('549') && d.length > 10) d = d.slice(3);
  else if (d.startsWith('54') && d.length > 10) d = d.slice(2);
  d = d.replace(/^0+/, '').replace(/^9/, '');
  if (d.length > 10) {
    if (d.slice(3, 5) === '15' && d.length - 2 === 10) d = d.slice(0, 3) + d.slice(5);
    else if (d.slice(4, 6) === '15' && d.length - 2 === 10) d = d.slice(0, 4) + d.slice(6);
    else if (d.slice(2, 4) === '15' && d.length - 2 === 10) d = d.slice(0, 2) + d.slice(4);
  }
  if (d.length > 10) d = d.slice(-10);
  return d;
}
/* Convierte un teléfono guardado en un número listo para el link de WhatsApp */
function waNum(phone) {
  const d = normPhone(phone);
  if (!d) return '';
  if (d.length === 10) return '549' + d;   /* celular argentino */
  return '54' + d;                          /* fijo u otro */
}
/* Sube una foto del menú a Supabase Storage usando un "pase" que entrega
   biz_photo_sign (valida el PIN). Devuelve la URL pública. */
async function subirFoto(slug, pin, file, onProgress) {
  const ext = ((file.name || '').split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const s = await rpc('biz_photo_sign', { p_slug: slug, p_pin: pin, p_ext: ext });
  if (!s || !s.token || !s.path) throw new Error('No se pudo preparar la subida');
  await new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open('POST', SUPABASE_URL + '/storage/v1/object/menu/' + s.path);
    x.setRequestHeader('apikey', SUPABASE_KEY);
    x.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_KEY);
    x.setRequestHeader('x-foto-token', s.token);
    x.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    x.upload.onprogress = e => { if (onProgress && e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    x.onload = () => (x.status >= 200 && x.status < 300) ? res() : rej(new Error('No se pudo subir la foto'));
    x.onerror = () => rej(new Error('Fallo de conexión al subir la foto'));
    x.send(file);
  });
  try { await rpc('biz_photo_done', { p_slug: slug, p_pin: pin, p_token: s.token }); } catch {}
  return s.url_publica;
}const hexOk = x => /^#[0-9a-f]{6}$/i.test(x || '');
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
/* Le muestra al cliente hace cuánto vino por última vez, cuántas visitas
   lleva y cuándo vencen sus sellos. Ayuda a que vuelva antes de perderlos. */
function visitaHtml(c) {
  const d = c.last_days, v = c.visits || 0;
  const partes = [];
  /* 1) Aviso de vencimiento (lo más urgente si está por vencer) */
  if (c.expires && c.stamps > 0 && c.stamps < (biz ? biz.stamps_needed : 1e9)) {
    partes.push('⏳ Tus sellos vencen el ' + esc(c.expires));
  }
  /* 2) Última visita */
  if (d !== null && d !== undefined) {
    if (v === 0) {
      partes.push('👋 ¡Te esperamos! Todavía no sumaste tu primer sello.');
    } else {
      let cuando;
      if (d <= 0) cuando = 'Viniste hoy. ¡Gracias!';
      else if (d === 1) cuando = 'Última visita: Ayer (' + esc(c.last_date) + ')';
      else cuando = 'Última visita: Hace ' + d + ' días (' + esc(c.last_date) + ')';
      partes.push((d <= 0 ? '✅ ' : '🕒 ') + cuando);
    }
  }
  const box = partes.length ? '<p class="mute" style="text-align:center;margin:12px 0 0">' + partes.join('<br>') + '</p>' : '';
  const visitas = v > 0 ? '<p class="mute" style="text-align:center;margin:6px 0 0">🎉 Ya viniste <b>' + v + '</b> ve' + (v === 1 ? 'z' : 'ces') + ' en total.</p>' : '';
  return box + visitas;
}
async function customerView() {
  legalFooter();
  const saved = localStorage.getItem('code_' + slug);
  if (!saved) {
    $app.innerHTML = `${bhero('Tarjeta de sellos', biz.name, 'Juntá ' + biz.stamps_needed + ' sellos y ganá: ' + esc(biz.reward_emoji || '🎁') + ' ' + esc(biz.reward), biz.reward_emoji || '🎁')}
    <div class="card"><h2>Creá tu tarjeta</h2>${biz.welcome_stamps > 0 ? '<p class="mute">Te regalamos ' + biz.welcome_stamps + ' sello' + (biz.welcome_stamps > 1 ? 's' : '') + ' de bienvenida.</p>' : ''}<p class="mute">Solo pedimos tu nombre y tu teléfono: son los datos necesarios para tener tu tarjeta. No pedimos dirección, email ni datos de pago.</p>
    <form id="frm" novalidate>
    <label for="n">Tu nombre</label><input id="n" autocomplete="name" maxlength="80" required aria-required="true">
    <label for="p">Tu teléfono (WhatsApp)</label><input id="p" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Ej: 11 2345 6789" required aria-required="true">
    <p class="mute" id="ph" style="margin:6px 0 0;font-size:13px">Escribilo como quieras: lo acomodamos solos.</p>
    ${biz.ask_birthday ? '<label for="bd">Tu cumpleaños (opcional)</label><input id="bd" type="date">' : ''}
    ${biz.ask_promo ? '<label class="consent"><input type="checkbox" id="pm"> Quiero recibir ofertas y novedades por WhatsApp (opcional)</label>' : ''}
    <label class="consent"><input type="checkbox" id="ac" required aria-required="true"> Acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y el uso de mis datos solo para esta tarjeta de sellos.</label>
    <button type="submit" id="go">Crear mi tarjeta</button><div id="m" aria-live="polite"></div></form></div>`;
    const phEl = document.getElementById('ph');
    p.oninput = () => {
      const v = normPhone(p.value);
      if (!p.value.trim()) { phEl.textContent = 'Escribilo como quieras: lo acomodamos solos.'; phEl.style.color = ''; return; }
      if (v.length >= 6) { phEl.textContent = '✓ Queda guardado como: ' + v.replace(/^(\d{2,4})(\d+)$/, '$1 $2'); phEl.style.color = ''; }
      else { phEl.textContent = 'Escribilo como quieras: lo acomodamos solos.'; phEl.style.color = ''; }
    };
    document.getElementById('frm').onsubmit = async ev => {
      ev.preventDefault();
      const go = document.getElementById('go');
      const name = n.value.trim(), phone = normPhone(p.value);
      if (name.length < 2) return flash(m, 'Escribí tu nombre', false);
      if (phone.length < 6) return flash(m, 'Escribí un teléfono válido (con característica). Ej: 11 2345 6789', false);
      if (!document.getElementById('ac').checked) return flash(m, 'Tenés que aceptar la política de privacidad para crear tu tarjeta', false);
      go.disabled = true;
      try { const code = await rpc('register_customer', { p_slug: slug, p_name: name, p_phone: phone, p_birthday: document.getElementById('bd')?.value || null, p_promo: !!document.getElementById('pm')?.checked });
        localStorage.setItem('code_' + slug, code); customerView(); }
      catch (e) { go.disabled = false; flash(m, e.message, false); }
    };
    return;
  }
  // Un acierto devuelve un objeto; un código que ya no existe devuelve null.
  let poll = null;
  const stopPoll = () => { if (poll) { clearInterval(poll); poll = null; } };
  const startPoll = () => { stopPoll(); poll = setInterval(() => { if (!document.hidden && !document.querySelector('.msg.err')) draw(); }, 10000); };
  async function draw() {
    try {
      const c = await rpc('get_card', { p_slug: slug, p_code: saved });
      if (!c) { clearInterval(poll); localStorage.removeItem('code_' + slug); return customerView(); }
      const done = c.stamps >= biz.stamps_needed, left = biz.stamps_needed - c.stamps, bdToday = c.birthday_today || (c.birthday && c.birthday === new Date().toLocaleDateString('en-CA').slice(5));
      const pct = Math.max(0, Math.min(100, Math.round((c.stamps / biz.stamps_needed) * 100)));
      $app.innerHTML = `${bhero(done ? '¡Tarjeta completa!' : 'Tu tarjeta', biz.name, 'Hola, ' + esc(c.name), biz.stamp_emoji || biz.reward_emoji || '⭐', true)}${biz.notice ? '<div class="card notice">' + esc(biz.notice) + '</div>' : ''}${bdToday ? '<div class="card notice cumple">🎂 ¡Feliz cumpleaños, ' + esc(c.name.split(' ')[0]) + '!' + (c.bday_gift ? ' <b>Te regalamos 1 sello</b> 🎉' : (biz.birthday_stamp ? ' Pasá hoy por el local y te regalamos 1 sello extra.' : '')) + '</div>' : ''}
      <div class="card">${stampsGrid(biz.stamps_needed, c.stamps, biz.stamp_emoji, biz.tiers, biz.reward_emoji)}
      <div class="prog" role="progressbar" aria-valuenow="${c.stamps}" aria-valuemin="0" aria-valuemax="${biz.stamps_needed}" aria-label="${c.stamps} de ${biz.stamps_needed} sellos"><i style="width:${pct}%"></i></div>
      <p class="prog-t"><span>${c.stamps} de ${biz.stamps_needed} sellos</span><span class="mute">${done ? '¡Listo!' : 'Faltan ' + left}</span></p>
      <p class="mute" style="text-align:center;margin-top:10px">${done ? esc(biz.ready_msg || '¡Completaste la tarjeta! Mostrala para canjear') + ': ' : 'Tu premio: '}${esc(biz.reward_emoji || '🎁')} ${esc(biz.reward)}</p>
      ${(biz.tiers || []).map(t => '<p class="mute" style="margin:4px 0;text-align:center">🎁 Sello ' + t.at + ': ' + esc(t.reward) + (c.stamps >= t.at ? ((c.claimed || []).includes(t.at) ? ' ✔ canjeado' : ' · ¡listo para canjear!') : '') + '</p>').join('')}
      ${visitaHtml(c)}</div>
      <div class="card"><p class="mute" style="text-align:center;margin:0 0 4px">Mostrá este código al negocio para sumar un sello</p>
      <div class="qr" role="img" aria-label="Código QR de tu tarjeta de ${esc(biz.name)}. Tu código es ${esc(c.code)}">${qr(c.code)}</div><div class="code">${esc(c.code)}</div>
      <p class="mute" style="text-align:center;margin:12px 0 0">Premios canjeados: ${c.rewards}</p></div>${bizData()}${links()}
      <p class="legal" style="text-align:center;margin-top:8px"><a href="#" id="del">Borrar mi tarjeta y mis datos</a></p><div id="dm" aria-live="polite"></div>`;
      document.getElementById('del').onclick = async e => {
        e.preventDefault();
        if (!confirm('¿Borrar tu tarjeta de ' + biz.name + '? Se eliminan tu nombre, teléfono y todos tus sellos. No se puede deshacer.')) return;
        stopPoll();
        try { await rpc('delete_my_card', { p_slug: slug, p_code: saved }); localStorage.removeItem('code_' + slug); customerView(); }
        catch (err) { flash(document.getElementById('dm'), err.message, false); startPoll(); }
      };
    } catch (e) {
      // Si el servidor bloqueó por demasiados intentos, NO reintentamos solos:
      // seguir insistiendo solo alarga el bloqueo de la IP.
      stopPoll();
      $app.innerHTML = `<div class="msg err">${esc(e.message)}</div><p class="legal" style="text-align:center"><a href="#" id="rt">Volver a intentar</a></p>`;
      const rt = document.getElementById('rt');
      if (rt) rt.onclick = ev => { ev.preventDefault(); startPoll(); draw(); };
    }
  }
  await draw();
  startPoll();
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
function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } const ov = document.getElementById('scanov'); if (ov) ov.remove(); }

/* Avisos para el dueño: premios por canjear, clientes nuevos hoy y clientes
   que hace mucho que no vienen. Se cargan aparte para no demorar el panel. */
let _avisoWA = null;
async function cargarAvisos() {
  const box = document.getElementById('avisos');
  if (!box) return;
  try {
    const L = await rpc('biz_customers', { p_slug: slug, p_pin: pin });
    if (!document.getElementById('avisos')) return;
    const listos = L.filter(c => c.stamps >= biz.stamps_needed).length;
    const day0 = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const hoy = L.filter(c => new Date(c.last_seen) >= day0).length;
    const frios = L.filter(c => Date.now() - new Date(c.last_seen) > 30 * 864e5).length;
    /* ¿Alguien cumple años HOY? Se avisa siempre arriba, es lo más urgente. */
    const mmdd = new Date().toLocaleDateString('en-CA').slice(5);
    const cumpleHoy = biz.ask_birthday ? L.filter(c => c.birthday && c.birthday === mmdd) : [];
    const it = [];
    if (cumpleHoy.length) it.push({ k: 'cumple', ico: '🎂', t: cumpleHoy.length === 1 ? '¡Hoy cumple años ' + cumpleHoy[0].name.split(' ')[0] + '! Salúdalo por WhatsApp' : '¡Hoy cumplen años ' + cumpleHoy.length + ' clientes! Saludalos por WhatsApp', go: 'stats' });
    if (listos) it.push({ k: 'premio', ico: '🎁', t: listos + ' cliente' + (listos === 1 ? '' : 's') + ' con premio para canjear', go: 'list' });
    if (frios) it.push({ k: 'frio', ico: '😴', t: frios + ' cliente' + (frios === 1 ? '' : 's') + ' hace más de 30 días que no vienen', go: 'stats' });
    if (hoy && !listos) it.push({ k: 'hoy', ico: '✅', t: hoy + ' vinieron hoy', go: null });
    if (!it.length) return;
    box.innerHTML = `<div class="avisos">${it.map(a => `<${a.go ? 'button' : 'div'} class="aviso ${a.k}"${a.go ? ` data-go="${a.go}"` : ''}><span aria-hidden="true">${a.ico}</span>${esc(a.t)}${a.go ? '<span class="aviso-go" aria-hidden="true">›</span>' : ''}</${a.go ? 'button' : 'div'}>`).join('')}</div>`;
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => panel(b.dataset.go));
  } catch {}
}

function panel(tab) {
  /* La pestaña "Menú" aparece siempre: si el negocio apagó su menú, desde
     ahí lo vuelve a activar (antes quedaba escondida y no había forma). */
  if (!({ stamp: 1, list: 1, stats: 1, cfg: 1, menu: 1, ped: 1 })[tab] || (tab === 'ped' && !biz.modulos?.pedidos)) tab = 'stamp';
  if (menuDirty && tab !== 'menu' && !confirm('Tenés cambios sin guardar en el menú. ¿Salir sin guardar?')) return;
  stopCam(); stopMenuWarn();
  if (stampIv) { clearInterval(stampIv); stampIv = null; }
  if (pedIv) { clearInterval(pedIv); pedIv = null; }
  legalFooter();
  const T = [['stamp', 'Mostrador']];
  if (biz.modulos?.pedidos) T.push(['ped', 'Pedidos']);
  T.push(['list', 'Clientes'], ['stats', 'Resumen'], ['cfg', 'Ajustes']);
  T.push(['menu', biz.menu_enabled ? 'Menú' : 'Menú ⚠']);
  $app.innerHTML = `${bhero('Panel del negocio', biz.name, '', biz.stamp_emoji || biz.reward_emoji || '⚙️', true)}${installHtml('panel')}<div id="avisos"></div><div class="tabs${T.length > 4 ? ' t5' : ''}" role="tablist" aria-label="Secciones del panel">${T.map(t => `<button role="tab" aria-selected="${t[0] === tab}" aria-controls="v" class="${t[0] === tab ? 'on' : ''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div id="v" role="tabpanel" tabindex="0"></div>`;
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => panel(b.dataset.t));
  cargarAvisos();
  ({ stamp: stampTab, list: listTab, stats: statsTab, cfg: cfgTab, menu: menuTab, ped: pedidosTab })[tab]();
}

/* ---- MODO MOSTRADOR: dar un sello en un toque, para un negocio que está a full ----
   Idea: el sello tiene que ser consecuencia de algo que el negocio ya está haciendo.
   Acá no se escribe ni se busca: se toca al cliente y ya está. */
let stampIv = null;
async function stampTab() {
  v.innerHTML = `<div class="card">
    <button id="scan" class="scanbtn">📷 Escanear el QR del cliente</button>
    <label for="q">Buscar por nombre o código</label>
    <input id="q" autocomplete="off" inputmode="search" placeholder="Ej: Ana, o el código de su tarjeta">
    ${biz.allow_double ? '<label class="consent" style="font-size:15px;margin-top:10px"><input type="checkbox" id="dbl"> Sellar 2 sellos por visita</label>' : ''}
    <div id="bnr" aria-live="polite"></div><div id="res"></div></div>`;
  const q = document.getElementById('q'), bnr = document.getElementById('bnr'), res = document.getElementById('res');
  let L = [], busy = false;
  const antig = c => Date.now() - new Date(c.last_seen || 0).getTime();
  const porVisitas = (a, b) => (b.visits || 0) - (a.visits || 0) || antig(a) - antig(b);
  const porReciente = (a, b) => antig(a) - antig(b);
  const tile = c => {
    const listo = c.stamps >= biz.stamps_needed;
    return `<button class="mtile${listo ? ' done' : ''}" data-c="${esc(c.code)}"><b>${esc(c.name)}</b><span class="mp">${esc(c.phone || '')}</span><span class="ms">${listo ? '🎁 Premio listo: tocá para canjear' : c.stamps + '/' + biz.stamps_needed + ' · faltan ' + (biz.stamps_needed - c.stamps)}</span></button>`;
  };
  const render = () => {
    const t = q.value.trim().toLowerCase();
    if (t) {
      const f = L.filter(c => (c.name || '').toLowerCase().includes(t) || (c.phone || '').includes(t) || (c.code || '').toLowerCase() === t).slice(0, 30);
      res.innerHTML = f.length ? '<div class="mgrid">' + f.map(tile).join('') + '</div>' : '<p class="mute" style="margin-top:12px">No hay clientes con ese nombre. Si es nuevo, que cree su tarjeta con el link o la tarjeta NFC.</p>';
    } else {
      const hab = [...L].sort(porVisitas).slice(0, 12);
      const rec = [...L].sort(porReciente).filter(c => !hab.includes(c)).slice(0, 12);
      res.innerHTML = (hab.length ? '<p class="msec">Habituales</p><div class="mgrid">' + hab.map(tile).join('') + '</div>' : '')
        + (rec.length ? '<p class="msec">Los que vinieron hace poco</p><div class="mgrid">' + rec.map(tile).join('') + '</div>' : '')
        + (!L.length ? '<p class="mute" style="margin-top:12px">Todavía no hay clientes. Compartí el link o la tarjeta NFC.</p>' : '');
    }
    res.querySelectorAll('.mtile').forEach(b => b.onclick = () => tocar(b.dataset.c));
  };
  const load = async () => { try { L = await rpc('biz_customers', { p_slug: slug, p_pin: pin }); render(); } catch (e) { bnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; } };
  const banner = (txt, code, tier, completo) => {
    bnr.innerHTML = `<div class="mbanner"><span>${esc(txt)}</span>${completo ? '<button class="undo" id="rdm">🎁 Canjear premio</button>' : ''}${tier ? `<button class="undo" id="clm">Canjear ${esc(tier.reward)}</button>` : ''}${code ? '<button class="undo" id="und">Deshacer</button>' : ''}</div>`;
    const u = document.getElementById('und');
    if (u) u.onclick = async () => { u.disabled = true; try { await rpc('biz_undo', { p_slug: slug, p_pin: pin, p_code: code }); bnr.innerHTML = '<div class="mbanner">✓ Sello deshecho</div>'; load(); } catch (e) { bnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; } };
    const cl = document.getElementById('clm');
    if (cl) cl.onclick = async () => { cl.disabled = true; try { const r = await rpc('biz_claim', { p_slug: slug, p_pin: pin, p_code: code, p_at: tier.at }); bnr.innerHTML = `<div class="mbanner">✓ Canjeado: ${esc(r.reward)}</div>`; load(); } catch (e) { bnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; } };
    const rd = document.getElementById('rdm');
    if (rd) rd.onclick = async () => { rd.disabled = true; try { const r = await rpc('biz_redeem', { p_slug: slug, p_pin: pin, p_code: code }); bnr.innerHTML = `<div class="mbanner">🎁 Premio canjeado a ${esc(r.name)}. La tarjeta se reinició</div>`; load(); } catch (e) { bnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; } };
  };
  const tocar = async code => {
    if (busy) return;
    const c = L.find(x => x.code === code);
    const listo = c && c.stamps >= biz.stamps_needed;
    if (listo && !confirm(`${c.name} tiene el premio listo (${c.stamps}/${biz.stamps_needed}). ¿Canjear ahora?`)) return;
    busy = true;
    try {
      if (listo) {
        const r = await rpc('biz_redeem', { p_slug: slug, p_pin: pin, p_code: code });
        bnr.innerHTML = `<div class="mbanner">🎁 Premio canjeado a ${esc(r.name)}. La tarjeta se reinició</div>`;
        await load();
      } else {
        const args = { p_slug: slug, p_pin: pin, p_code: code };
        const dbl = document.getElementById('dbl');
        if (dbl && dbl.checked) args.p_qty = 2;
        const r = await rpc('biz_stamp', args);
        await load();
        const t = (biz.tiers || []).filter(x => r.stamps >= x.at && !(c && (c.claimed || []).includes(x.at))).sort((a, b) => a.at - b.at)[0];
        const completo = r.stamps >= r.needed;
        banner(`✓ Sello a ${r.name}: ${r.stamps} de ${r.needed}` + (r.bonus ? ' 🎂' : '') + (completo ? ' · ¡tarjeta completa!' : ''), code, t ? { at: t.at, reward: t.reward } : null, completo);
        res.querySelectorAll('.mtile').forEach(el => { if (el.dataset.c === code) el.classList.add('hit'); });
      }
    } catch (e) { bnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; }
    finally { busy = false; }
  };
  q.oninput = render;
  load();
  if (stampIv) clearInterval(stampIv);
  stampIv = setInterval(() => { if (!document.hidden && !busy) load(); }, 20000);
  const scan = document.getElementById('scan');
  scan.onclick = async () => {
    const ov = document.createElement('div');
    ov.id = 'scanov';
    ov.innerHTML = '<video playsinline muted></video><div class="sh"><div class="box"></div></div><p class="hint">Apuntá al código QR del cliente</p><button class="x" aria-label="Cerrar el escáner">✕</button>';
    document.body.appendChild(ov);
    const close = () => stopCam();
    ov.querySelector('.x').onclick = close;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const sv = ov.querySelector('video');
      sv.srcObject = stream; await sv.play();
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      let leido = false;
      (function loop() {
        if (leido || !stream) return;
        if (sv.videoWidth) {
          cv.width = sv.videoWidth; cv.height = sv.videoHeight; cx.drawImage(sv, 0, 0);
          const r = jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
          if (r && /^[A-Z0-9]{6,8}$/i.test(r.data.trim())) { leido = true; close(); tocar(r.data.trim().toUpperCase()); return; }
        }
        requestAnimationFrame(loop);
      })();
    } catch { close(); bnr.innerHTML = '<div class="msg err" role="alert">No se pudo abrir la cámara. Buscá al cliente por nombre.</div>'; }
  };
}

/* ---- PEDIDOS: el sello se suma al entregar el pedido (módulo opt-in) ---- */
let pedIv = null;
const moneyAR = () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
async function pedidosTab() {
  v.innerHTML = '<div id="pbnr" aria-live="polite"></div><div id="plist"><p class="mute">Cargando…</p></div>';
  const pbnr = document.getElementById('pbnr'), plist = document.getElementById('plist'), money = moneyAR();
  let ultimo = null;
  const hace = t => { const m = Math.round((Date.now() - new Date(t).getTime()) / 60000); return m < 1 ? 'recién' : m < 60 ? 'hace ' + m + ' min' : 'hace ' + Math.round(m / 60) + ' h'; };
  const beep = () => { try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; const c = new C(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.18, c.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .35); o.start(); o.stop(c.currentTime + .36); setTimeout(() => c.close(), 600); } catch (e) {} };
  const load = async () => {
    try {
      const P = await rpc('pedidos_listar', { p_slug: slug, p_pin: pin });
      if (ultimo !== null && P.length > ultimo) beep();
      ultimo = P.length;
      if (!P.length) { plist.innerHTML = '<div class="card"><p class="mute" style="margin:0">No hay pedidos esperando. Cuando un cliente pida desde el menú, aparece acá y el sello se suma al entregarlo.</p></div>'; return; }
      plist.innerHTML = P.map(o => {
        const its = (o.items || []).map(i => `<li class="olit"><span class="oq">${i.q || 1}×</span> ${esc(i.n)}${i.e ? ' ' + esc(i.e) : ''} <span class="mute">${money.format(Number(i.p) || 0)}</span></li>`).join('');
        return `<div class="ocard"><div class="ohead"><b>${esc(o.cliente)}</b><span class="mute">${hace(o.creado)}</span></div><ul class="olits">${its}</ul>${o.nota ? `<p class="onota">💬 ${esc(o.nota)}</p>` : ''}<div class="ototal">Total ${money.format(Number(o.total) || 0)} <span class="mute" style="font-weight:400">· lo cargó el cliente</span></div><div class="erow"><button class="sm" data-e="${o.id}">Entregar + 1 sello</button><button class="alt sm" data-c="${o.id}">Cancelar pedido</button></div></div>`;
      }).join('');
      plist.querySelectorAll('[data-e]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try {
          const r = await rpc('pedido_entregar', { p_slug: slug, p_pin: pin, p_id: +b.dataset.e });
          const s = r.sello || {};
          pbnr.innerHTML = `<div class="mbanner">✓ Pedido entregado · sello de ${esc(s.name || 'cliente')}: ${s.stamps} de ${s.needed}</div>`;
          load();
        } catch (e) { pbnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; b.disabled = false; }
      });
      plist.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
        if (!confirm('¿Cancelar este pedido? El cliente va a tener que pedir de nuevo.')) return;
        b.disabled = true;
        try { await rpc('pedido_cancelar', { p_slug: slug, p_pin: pin, p_id: +b.dataset.c }); pbnr.innerHTML = '<div class="mbanner">Pedido cancelado</div>'; load(); }
        catch (e) { pbnr.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; b.disabled = false; }
      });
    } catch (e) { plist.innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  };
  await load();
  if (pedIv) clearInterval(pedIv);
  pedIv = setInterval(() => { if (!document.hidden) load(); }, 8000);
}

let inst = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); inst = e; });
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esAndroid = () => /Android/i.test(navigator.userAgent);
const esEscritorio = () => !esIOS() && !esAndroid() && !/Mobile/i.test(navigator.userAgent);
const yaInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
/* Cada app vive en su propia carpeta (panel/, tarjetas/ y menus/) con su
   manifiesto y su scope propios. Es la forma que recomienda el navegador para
   tener varias apps instalables del mismo sitio: si comparten el scope,
   instalar una impide que ofrezca instalar la otra. */
const paginaApp = kind => kind === 'panel' ? 'panel/' : kind === 'menus' ? 'menus/' : 'tarjetas/';
const enPaginaApp = kind => location.pathname.replace(/\/(index\.html)?$/, '/').endsWith('/' + paginaApp(kind));
function pasosInstalar(kind) {
  if (esIOS()) return 'Tocá el botón <b>Compartir</b> (el cuadradito con la flecha hacia arriba) y elegí <b>“Agregar a pantalla de inicio”</b>.';
  if (esAndroid()) return 'Tocá el menú de los tres puntos (⋮) y elegí <b>“Instalar aplicación”</b> (o “Agregar a pantalla de inicio”).';
  if (esEscritorio()) return 'En <b>Chrome de la compu</b>: buscá el ícono de <b>instalar</b> a la derecha de la barra de direcciones (una pantallita con una flecha ↓) y tocalo. Si no lo ves, abrí el menú <b>⋮</b> (arriba a la derecha) y elegí <b>“Instalar Fidelización”</b> o <b>“Instalar aplicación”</b>. También podés elegir <b>“Crear acceso directo”</b>. Se abre en su propia ventana, como un programa.';
  return 'Abrí el menú del navegador (⋮ en Chrome, o Compartir en Safari) y elegí <b>“Instalar aplicación”</b>.';
}
function installApp(btn) {
  const kind = btn.dataset.kind || 'card';
  const msg = btn.parentElement.querySelector('[data-imsg]');
  /* Si el navegador ya nos dio su propio aviso de instalación, lo usamos. */
  if (inst) { inst.prompt(); inst = null; if (msg) msg.innerHTML = ''; return; }
  /* La página raíz ES la app "Mis tarjetas" (tiene su propio manifest), así que
     ahí mostramos cómo instalarla sin mandar a otra página. */
  const enRaiz = location.pathname.replace(/\/(index\.html)?$/, '/').endsWith('/Fidelizacion/');
  if (!(kind === 'card' && enRaiz) && !enPaginaApp(kind)) { location.href = paginaApp(kind); return; }
  if (msg) msg.innerHTML = pasosInstalar(kind);
}
function installHtml(kind) {
  if (yaInstalada()) return '';
  const rot = kind === 'panel' ? 'Instalar el Panel de sellos' : kind === 'menus' ? 'Instalar la app Menús de la zona' : 'Instalar la app Mis tarjetas';
  const txt = kind === 'panel' ? 'El panel del negocio, como app en tu celular.' : kind === 'menus' ? 'Los menús de los negocios, como app en tu celular.' : 'Todas tus tarjetas juntas, como app en tu celular.';
  return `<div class="instbox"><button data-inst data-kind="${kind}">${rot}</button><p class="mute" style="margin:6px 0 0">${txt}</p><div class="mute" data-imsg aria-live="polite"></div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-inst]'); if (b) installApp(b); });
function links() {
  const mn = (biz && biz.menu_enabled) ? `<a class="btn alt" style="display:block;margin-top:12px" href="?b=${encodeURIComponent(slug)}&menu=1">🍽️ Ver el menú</a>` : '';
  const sig = installHtml('card');
  const url = location.origin + location.pathname + '?b=' + encodeURIComponent(slug);
  const invit = `¡${biz.name} te regala premios! 🎁 Juntá ${biz.stamps_needed} sellos y llevate ${biz.reward_emoji || '🎁'} ${biz.reward}. Sacá tu tarjeta acá 👉 ${url}`;
  const invita = `<a class="btn alt" style="display:block;margin-top:12px" href="https://wa.me/?text=${encodeURIComponent(invit)}" target="_blank" rel="noopener noreferrer">💬 Invitar a un amigo</a>`;
  return `<div class="card">${sig}${sig ? '<p class="mute" style="text-align:center;margin:14px 0 0">o</p>' : ''}${mn}<a class="btn alt" style="display:block;margin-top:12px" href="?mis-tarjetas">🎴 Ver todas mis tarjetas</a><a class="btn alt" style="display:block;margin-top:12px" href="menus/">📍 Ver los menús de otros negocios</a>${invita}</div>`;
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
    const old = L.filter(c => Date.now() - new Date(c.last_seen) > 30 * 864e5).sort((a, b) => new Date(a.last_seen) - new Date(b.last_seen));
    const DN = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], byDay = {};
    R.days.forEach(x => byDay[x.d] = x.n);
    const ds = [...Array(30)].map((_, i) => new Date(Date.now() - (29 - i) * 864e5).toLocaleDateString('en-CA'));
    const dayV = ds.map(k => byDay[k] || 0), dowV = [0, 1, 2, 3, 4, 5, 6].map(i => (R.dow.find(x => x.d === i) || {}).n || 0), hrV = [...Array(24)].map((_, i) => (R.hours.find(x => x.h === i) || {}).n || 0);
    const peak = a => a.indexOf(Math.max(...a));
    const bars = (arr, lab, hi) => `<div aria-hidden="true" style="display:flex;align-items:flex-end;gap:2px;height:70px">${arr.map((n, i) => `<div title="${lab(i)}: ${n}" style="flex:1;height:${n ? Math.max(n / Math.max(...arr) * 100, 6) : 2}%;background:${i === hi ? 'var(--ac)' : 'var(--line)'};border-radius:2px"></div>`).join('')}</div>`;
    const chartHtml = `<div class="card"><h2>Sellos por día</h2><p class="mute" style="margin:0 0 6px">Últimos 30 días: ${dayV.reduce((a, b) => a + b, 0)} sellos en total; el día con más fue ${Math.max(...dayV)}.</p>${bars(dayV, i => ds[i].slice(8) + '/' + ds[i].slice(5, 7), -1)}</div>
    <div class="card"><h2>Cuándo vienen más</h2><p class="mute" style="margin:0 0 6px">Por día de la semana (últimos 90 días)</p>${bars(dowV, i => DN[i], peak(dowV))}
      <p class="mute" style="margin:6px 0 14px">${Math.max(...dowV) ? 'Día más fuerte: <b>' + DN[peak(dowV)] + '</b>' : 'Todavía no hay datos.'}</p>
      <p class="mute" style="margin:0 0 6px">Por hora del día</p>${bars(hrV, i => i + ' h', peak(hrV))}
      <p class="mute" style="margin:6px 0 0">${Math.max(...hrV) ? 'Horario más fuerte: <b>de ' + peak(hrV) + ' a ' + (peak(hrV) + 1) + ' h</b>' : ''}</p></div>`;
    const top = [...L].filter(c => c.visits > 0).sort((a, b) => b.visits - a.visits).slice(0, 5);
    const day0 = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const bds = L.filter(c => c.birthday).map(c => { const [m, d] = c.birthday.split('-').map(Number); let t = new Date(day0.getFullYear(), m - 1, d); if (t < day0) t = new Date(day0.getFullYear() + 1, m - 1, d); return { c, days: Math.round((t - day0) / 864e5) }; }).filter(x => x.days <= 7).sort((a, b) => a.days - b.days);
    const waLink = (phone, t) => 'https://wa.me/' + waNum(phone) + '?text=' + encodeURIComponent(t);
    const wa = c => {
      const left = biz.stamps_needed - c.stamps;
      const t = `Hola ${c.name.split(' ')[0]}, te esperamos en ${biz.name}! ` + (c.stamps > 0 && left > 0 ? `Te faltan ${left} sellos para tu premio: ${biz.reward}.` : 'Tu tarjeta de sellos te está esperando.');
      return 'https://wa.me/' + waNum(c.phone) + '?text=' + encodeURIComponent(t);
    };
    v.innerHTML = `<div class="card"><div class="stats">
      <div class="stat"><b>${L.length}</b>clientes</div><div class="stat"><b>${S.today}</b>sellos hoy</div>
      <div class="stat"><b>${S.week}</b>sellos en 7 días</div><div class="stat"><b>${S.redeemed}</b>premios canjeados</div></div></div>
    <div class="card"><h2>Resumen</h2>
      <p class="mute" style="margin:0 0 8px">Un texto listo para que te lo mandes a vos mismo o lo compartas.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="alt sm" id="rsc">Copiar resumen</button><a class="btn sm" id="rsv" target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a></div>
      <pre id="rst" class="rstxt"></pre><div id="rsm" aria-live="polite"></div></div>
    ${chartHtml}    <div class="card"><h2>Mejores clientes</h2>${top.length ? top.map(c => `<div class="row"><b>${esc(c.name)}</b><span>${c.visits} visitas</span></div>`).join('') : '<p class="mute">Todavía no hay datos.</p>'}</div>
    ${!biz.ask_birthday ? '' : `<div class="card"><h2>Cumplen esta semana</h2>${bds.length ? bds.map(x => `<div class="row"><div><b>${esc(x.c.name)}</b><div class="mute">${x.days === 0 ? 'Hoy' : 'En ' + x.days + ' día' + (x.days > 1 ? 's' : '')}</div></div>${(x.c.promo_ok || !biz.ask_promo) ? '<a class="btn sm" target="_blank" rel="noopener noreferrer" href="' + waLink(x.c.phone, (biz.birthday_msg || '¡Feliz cumpleaños, {nombre}! 🎂 Te saludamos de {negocio}. Te esperamos para festejar.').replace(/\{nombre\}/g, x.c.name.split(' ')[0]).replace(/\{negocio\}/g, biz.name)) + '">Saludar por WhatsApp</a>' : (biz.ask_promo ? '<span class="mute">No aceptó mensajes</span>' : '')}</div>`).join('') : '<p class="mute">Nadie por ahora.</p>'}</div>`}
    <div class="card"><h2>Hace más de 30 días que no vienen</h2><p class="mute" style="margin:0 0 8px">Escribiles un mensaje para que vuelvan.</p>${old.length ? old.map(c => { const dd = Math.floor((Date.now() - new Date(c.last_seen)) / 864e5); return `<div class="row"><div><b>${esc(c.name)}</b><div class="mute">${c.stamps}/${biz.stamps_needed} sellos · hace ${dd} días</div></div>${(c.promo_ok || !biz.ask_promo) ? '<a class="btn sm" target="_blank" rel="noopener noreferrer" href="' + wa(c) + '">Escribir por WhatsApp</a>' : (biz.ask_promo ? '<span class="mute">No aceptó ofertas</span>' : '')}</div>`; }).join('') : '<p class="mute">Nadie por ahora. Buena señal.</p>'}</div>`;
    /* ---- resumen de la semana, listo para copiar o mandar ---- */
    const listos = L.filter(c => c.stamps >= biz.stamps_needed).length;
    const nuevosMes = R.m_new || 0;
    const resumen = `📊 ${biz.name} — resumen\n` +
      `• Clientes con tarjeta: ${L.length}\n` +
      `• Sellos esta semana: ${S.week}\n` +
      `• Sellos este mes: ${R.m_stamps}\n` +
      `• Clientes nuevos este mes: ${nuevosMes}\n` +
      `• Premios canjeados: ${S.redeemed}\n` +
      (listos ? `• 🎁 ${listos} con premio para canjear\n` : '') +
      (old.length ? `• 😴 ${old.length} hace más de 30 días que no vienen\n` : '') +
      (Math.max(...dowV) ? `• Día más fuerte: ${DN[peak(dowV)]}\n` : '') +
      (Math.max(...hrV) ? `• Horario más fuerte: de ${peak(hrV)} a ${peak(hrV) + 1} h\n` : '');
    document.getElementById('rst').textContent = resumen;
    document.getElementById('rsv').href = 'https://wa.me/?text=' + encodeURIComponent(resumen);
    document.getElementById('rsc').onclick = async () => {
      try { await navigator.clipboard.writeText(resumen); flash(rsm, 'Resumen copiado', true); }
      catch { window.getSelection().selectAllChildren(document.getElementById('rst')); flash(rsm, 'Seleccionado: copialo manualmente', true); }
    };
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
  const linkMenus = `<a class="btn alt" style="display:block;margin-top:12px" href="menus/">📍 Ver los menús de otros negocios</a>`;
  if (!list.length) { w.innerHTML = `<div class="card"><p class="mute" style="margin:0">Todavía no tenés tarjetas en este celular. Acercá el celular a la tarjeta NFC de un negocio y creá la tuya.</p></div>${linkMenus}`; return; }
  w.innerHTML = '<p class="mute">Cargando…</p>';
  const rows = await Promise.all(list.map(async ([sl, code]) => {
    try {
      const [b, c] = await Promise.all([rpc('get_business', { p_slug: sl }), rpc('get_card', { p_slug: sl, p_code: code })]);
      if (b && c) { let menu = false; try { menu = !!(await rpc('get_features', { p_slug: sl }))?.menu; } catch {} b.menu_enabled = menu; return { sl, b, c }; }
      return { sl, gone: true };
    } catch { return { sl, err: true }; }
  }));
  w.innerHTML = rows.map(r => {
    let card;
    if (r.gone || r.err) card = `<div class="card" style="margin:0"><b>${esc(r.sl)}</b><p class="mute" style="margin:6px 0 0">${r.gone ? 'Esta tarjeta ya no existe.' : 'No se pudo cargar. Revisá tu conexión.'}</p></div>`;
    else {
      const col = hexOk(r.b.color) ? r.b.color : '#c2410c', col2 = hexOk(r.b.color2) ? r.b.color2 : col, left = r.b.stamps_needed - r.c.stamps;
      card = `<a class="wcard" href="?b=${encodeURIComponent(r.sl)}" style="background:linear-gradient(135deg,${col},${col2});color:${textOn(mixHex(col, col2))}"><b>${esc(r.b.name)}</b><span>${r.c.stamps} de ${r.b.stamps_needed} sellos</span><small>${left <= 0 ? '¡Premio listo! ' : 'Te faltan ' + left + ' · '}${esc(r.b.reward_emoji || '🎁')} ${esc(r.b.reward)}</small></a>` + (r.b.menu_enabled ? `<a class="btn alt sm" style="display:block;margin:8px 0 0" href="?b=${encodeURIComponent(r.sl)}&menu=1">🍽️ Ver el menú de ${esc(r.b.name)}</a>` : '');
    }
    return card + `<div class="wrm"><button class="alt sm" data-rm="${esc(r.sl)}">Quitar de este celular</button></div>`;
  }).join('');
  w.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    if (confirm('¿Quitar esta tarjeta de este celular? Vas a perder el acceso a ella y a sus sellos. Guardá el código antes de quitarla: sin el código no vas a poder volver a verla.')) { localStorage.removeItem('code_' + b.dataset.rm); walletView(); }
  });
  const ib = installHtml('card');
  if (ib) w.insertAdjacentHTML('beforeend', ib);
  w.insertAdjacentHTML('beforeend', linkMenus);
}

async function listTab() {
  v.innerHTML = '<p class="mute">Cargando…</p>';
  try {
    const L = await rpc('biz_customers', { p_slug: slug, p_pin: pin });
    L.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    const cell = x => { x = String(x ?? ''); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };
    v.innerHTML = `<div class="card"><h2>${L.length} cliente${L.length === 1 ? '' : 's'}</h2>` + (L.length
      ? '<button class="alt" id="exp" style="margin:0 0 8px">Descargar lista (Excel / CSV)</button><p class="mute" style="margin:0 0 8px;font-size:13px">El archivo tiene datos personales de tus clientes. Guardalo de forma segura y usalo solo para esta tarjeta.</p>' + L.map(c =>
        `<div class="row" style="flex-wrap:wrap"><div><b>${esc(c.name)}</b><div class="mute">${esc(c.phone)} · ${c.stamps}/${biz.stamps_needed} sellos</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="alt sm" data-rec="${esc(c.code)}">Pasar a otro celular</button><button class="alt sm" data-h="${esc(c.code)}">Ver historial</button><button class="alt sm" data-del="${esc(c.code)}" data-n="${esc(c.name)}">Borrar cliente</button></div><div id="h-${esc(c.code)}" style="width:100%"></div></div>`).join('')
      : '<p class="mute">Todavía nadie creó su tarjeta. Compartí el link o la tarjeta NFC.</p>') + '</div>';
    const ex = document.getElementById('exp');
    if (ex) ex.onclick = () => {
      const rows = [['Nombre', 'Teléfono', 'Sellos', 'Faltan para el premio', 'Premios canjeados', 'Visitas', 'Última visita', 'Hora', 'Días sin venir', 'Cumpleaños (día/mes)', 'Aceptó ofertas por WhatsApp']].concat(
        L.map(c => {
          const d = new Date(c.last_seen);
          return [c.name, c.phone, c.stamps, Math.max(0, biz.stamps_needed - c.stamps), c.rewards, c.visits,
            d.toLocaleDateString('es-AR'), String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
            Math.floor((Date.now() - d) / 864e5), c.birthday ? c.birthday.split('-').reverse().join('/') : '',
            biz.ask_promo ? (c.promo_ok ? 'Sí' : 'No') : 'No se preguntó'];
        }));
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
  <label for="c5">Minutos mínimos entre sellos del mismo cliente (0 = sin límite)</label><input id="c5" type="number" min="0" max="10080" value="${biz.min_minutes}">
    <label for="c9">Los sellos vencen después de X días sin venir (0 = nunca)</label><input id="c9" type="number" min="0" max="3650" value="${biz.expiry_days}">
  <label for="c10">Sellos de regalo al crear la tarjeta (0 a 5)</label><input id="c10" type="number" min="0" max="5" value="${biz.welcome_stamps || 0}">
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c11" style="width:auto" ${biz.allow_double ? 'checked' : ''}> Permitir sumar 2 sellos en una compra</label>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c16" style="width:auto" ${biz.ask_birthday ? 'checked' : ''}> Pedir el cumpleaños al crear la tarjeta</label>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c17" style="width:auto" ${biz.ask_promo ? 'checked' : ''}> Pedir permiso para enviar ofertas por WhatsApp</label>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c18" style="width:auto" ${biz.birthday_stamp ? 'checked' : ''}> Regalar 1 sello el día de su cumpleaños</label>
  <label for="c19">Mensaje de cumpleaños para WhatsApp (usá {nombre} y {negocio}; vacío = mensaje por defecto)</label><input id="c19" maxlength="200" value="${esc(biz.birthday_msg || '')}" placeholder="¡Feliz cumple, {nombre}! 🎂 Te esperamos en {negocio} para festejar.">
  <p class="mute" style="margin:6px 0 0">Estas dos opciones funcionan si activaste “Pedir el cumpleaños”.</p>
  <label>Premios intermedios (opcional): se canjean al llegar a ese sello, sin reiniciar la tarjeta</label>
  ${[0, 1, 2].map(i => '<div style="display:flex;gap:8px;margin-top:8px"><input id="tn' + i + '" type="number" min="1" placeholder="Sello nº" style="width:36%" value="' + ((biz.tiers || [])[i]?.at || '') + '"><input id="tr' + i + '" maxlength="60" placeholder="Premio (ej: Café gratis)" value="' + esc((biz.tiers || [])[i]?.reward || '') + '"></div>').join('')}
  <h2 style="margin-top:18px">Menú digital</h2>
  <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="c40" style="width:auto" ${biz.menu_enabled ? 'checked' : ''}> Implementar menú digital</label>
  <p class="mute" style="margin:6px 0 0">Con el menú activado tus clientes ven tus productos con precios y fotos, arman su pedido y a vos te sale todo en la pestaña <b>Pedidos</b>. También aparecés en “Menús de la zona”.</p>
  <p class="mute" style="margin:6px 0 0">Si apagás el menú, se apagan también los pedidos: el pedido se arma en el menú.</p>
  ${(biz.modulos && 'pedidos' in biz.modulos) ? `<label style="display:flex;gap:8px;align-items:center;color:var(--ink);margin-top:12px"><input type="checkbox" id="c30" style="width:auto" ${biz.modulos.pedidos ? 'checked' : ''} ${biz.menu_enabled ? '' : 'disabled'}> Activar pedidos</label>
  <p class="mute" style="margin:6px 0 0">Los clientes arman su pedido en el menú y a vos te aparece en la pestaña <b>Pedidos</b>: un toque y le entregás el pedido + se le suma el sello. Si no lo activás, la tarjeta sigue funcionando igual.</p>` : ''}
  <label for="c6">Nuevo PIN (6 a 12 números; vacío = no cambiarlo)</label><input id="c6" type="password" inputmode="numeric">
  <button id="sv">Guardar cambios</button><button class="alt" id="lo">Cerrar sesión</button><div id="m"></div>
  <p class="mute" style="margin-top:14px">Link de tu tarjeta para clientes:<br><b>${esc(location.origin + location.pathname)}?b=${esc(slug)}</b></p><a class="btn alt" style="display:block;margin-top:8px" target="_blank" href="?b=${esc(slug)}&cartel=1">Imprimir cartel con QR</a></div>`;
  const pv = () => { const e = document.getElementById('pv'); e.style.setProperty('--ac', c4.value); e.style.setProperty('--ac2', c13.value); e.style.setProperty('--ac-ink', textOn(mixHex(c4.value, c13.value))); e.innerHTML = stampsGrid(6, 3, c12.value.trim() || '⭐', [], c20.value.trim() || '🎁'); };
  [c4, c12, c13, c20].forEach(i => i.oninput = pv); pv();
  c21.oninput = () => { c22.checked = false; setBg(c21.value); };
  c22.onchange = () => setBg(c22.checked ? '' : c21.value);
  /* Sin menú no hay pedidos: el interruptor de pedidos sigue al del menú. */
  const elC40 = document.getElementById('c40'), elC30 = document.getElementById('c30');
  if (elC40 && elC30) elC40.onchange = () => { elC30.disabled = !elC40.checked; if (!elC40.checked) elC30.checked = false; };
  lo.onclick = () => { try { sessionStorage.removeItem('pin_' + slug); } catch {} location.reload(); };
  sv.onclick = async () => {
    // Chequeos rápidos con mensaje claro antes de tocar el servidor.
    const needed = +c2.value, minmin = +c5.value || 0, exp = +c9.value || 0, wel = +c10.value || 0;
    if (!(needed >= 2 && needed <= 30)) return flash(m, 'Los sellos para el premio deben estar entre 2 y 30', false);
    if (minmin < 0 || minmin > 10080) return flash(m, 'Los minutos entre sellos deben estar entre 0 y 10080 (7 días)', false);
    if (exp < 0 || exp > 3650) return flash(m, 'Los días de vencimiento deben estar entre 0 y 3650 (10 años)', false);
    if (wel < 0 || wel > 5) return flash(m, 'Los sellos de regalo deben estar entre 0 y 5', false);
    const tierVals = [0, 1, 2].map(i => ({ at: +document.getElementById('tn' + i).value, reward: document.getElementById('tr' + i).value.trim() }));
    if (tierVals.some(t => t.at && t.reward && (t.at < 1 || t.at > needed - 1))) return flash(m, 'Cada premio intermedio debe ser un sello menor al total (' + (needed - 1) + ')', false);
    if (tierVals.filter(t => t.at && t.reward).map(t => t.at).some((v, i, arr) => arr.indexOf(v) !== i)) return flash(m, 'No repitas el número de sello en los premios intermedios', false);
    const a = { p_slug: slug, p_pin: pin, p_name: c1.value.trim() || biz.name, p_needed: needed, p_reward: c3.value.trim() || 'Premio', p_color: c4.value, p_minutes: minmin, p_new_pin: c6.value, p_expiry: exp, p_welcome: wel, p_double: c11.checked, p_emoji: c12.value.trim() || '⭐', p_color2: c13.value, p_notice: c14.value.trim(), p_ready: c15.value.trim(), p_ask_bday: c16.checked, p_ask_promo: c17.checked, p_bday_stamp: c18.checked, p_bday_msg: c19.value.trim(),
      p_tiers: JSON.stringify(tierVals.filter(t => t.at && t.reward).sort((x, y) => x.at - y.at)), p_reward_emoji: c20.value.trim() || '🎁' };
    const bgVal = c22.checked ? '' : c21.value;
    // Se guarda por partes y se avisa EXACTAMENTE qué falló, para no dejar la
    // tarjeta a medio configurar (ej: fondo nuevo con los colores viejos).
    const pasos = [];
    const paso = async (nombre, fn) => { try { await fn(); pasos.push('ok:' + nombre); } catch (e) { pasos.push('err:' + nombre + '|' + e.message); } };
    await paso('datos', () => rpc('biz_update', a));
    await paso('contacto', () => rpc('biz_set_contact', { p_slug: slug, p_pin: pin, p_address: c23.value.trim(), p_phone: c24.value.trim(), p_email: c25.value.trim() }));
    await paso('fondo', () => rpc('biz_set_bg', { p_slug: slug, p_pin: pin, p_bg: bgVal }));
    const c30 = document.getElementById('c30'), c40 = document.getElementById('c40');
    /* El menú se prende o apaga desde acá. Al apagarlo, el servidor apaga
       también los pedidos (el pedido se arma en el menú). */
    const menuCambio = !!(c40 && c40.checked !== !!biz.menu_enabled);
    if (c40) await paso('menu', () => rpc('biz_menu_toggle', { p_slug: slug, p_pin: pin, p_on: c40.checked }));
    if (c30 && c40 && c40.checked) await paso('modulos', () => rpc('modulo_activar', { p_slug: slug, p_pin: pin, p_modulo: 'pedidos', p_activo: c30.checked }));
    const fallas = pasos.filter(p => p.startsWith('err:')).map(p => { const [n, m] = p.slice(4).split('|'); return (n === 'datos' ? 'los datos de la tarjeta' : n === 'contacto' ? 'los datos del negocio' : n === 'modulos' ? 'el módulo de pedidos' : n === 'menu' ? 'el menú digital' : 'el color de fondo') + ' (' + m + ')'; });
    if (fallas.length) {
      // Si falló el núcleo de la tarjeta, no se aplica nada en pantalla.
      flash(m, 'No se pudieron guardar: ' + fallas.join(' y '), false);
      return;
    }
    if (c6.value) { pin = c6.value; sessionStorage.setItem('pin_' + slug, pin); }
    biz = { ...biz, name: a.p_name, stamps_needed: a.p_needed, reward: a.p_reward, color: a.p_color, min_minutes: a.p_minutes, expiry_days: a.p_expiry, welcome_stamps: a.p_welcome, allow_double: a.p_double, stamp_emoji: a.p_emoji, color2: a.p_color2, notice: a.p_notice, ready_msg: a.p_ready, ask_birthday: a.p_ask_bday, ask_promo: a.p_ask_promo, birthday_stamp: a.p_bday_stamp, birthday_msg: a.p_bday_msg, tiers: JSON.parse(a.p_tiers), reward_emoji: a.p_reward_emoji, bg_color: bgVal, address: c23.value.trim(), phone: c24.value.trim(), email: c25.value.trim() };
    if (c40) biz.menu_enabled = c40.checked;
    if (c30) biz.modulos = { ...(biz.modulos || {}), pedidos: !!(c40 && c40.checked && c30.checked) };
    setColor(a.p_color, a.p_color2); legalFooter();
    /* Si cambió el menú hay que redibujar el panel: aparecen o se van las
       pestañas “Menú” y “Pedidos”. */
    if (menuCambio) {
      panel('cfg');
      const mm = document.getElementById('m');
      if (mm) flash(mm, c40.checked ? 'Cambios guardados. ¡Menú activado!' : 'Cambios guardados. Menú apagado (y los pedidos también).', true);
      return;
    }
    flash(m, 'Cambios guardados', true);
  };
}

/* ---------------- MENÚ ---------------- */
let menuDirty = false;
function menuUnload(e) { if (menuDirty) { e.preventDefault(); e.returnValue = ''; } }
function stopMenuWarn() { menuDirty = false; removeEventListener('beforeunload', menuUnload); }
addEventListener('beforeunload', menuUnload);
const normText = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ---- MENÚ: para entrar hace falta la tarjeta ----
   El menú es del negocio, pero el cliente entra con su tarjeta: así el sello
   es consecuencia de su visita y nunca se pide el teléfono a la mitad.
   Si ya tiene tarjeta (de este celular o de otro), entra con su código. */
function menuTarjeta() {
  $app.innerHTML = `${bhero('Menú', biz.name, 'Creá tu tarjeta para ver el menú y hacer tu pedido', '🎴', true)}
  <div class="card"><h2>Primero creá tu tarjeta</h2>
    <p class="mute" style="margin:0 0 10px">Para ver el menú y pedir necesitás tu tarjeta de ${esc(biz.name)}. Solo pedimos tu nombre y tu teléfono: con eso juntás sellos y ganás ${esc(biz.reward_emoji || '🎁')} ${esc(biz.reward)}.</p>
    ${biz.welcome_stamps > 0 ? `<p class="mute">Te regalamos ${biz.welcome_stamps} sello${biz.welcome_stamps > 1 ? 's' : ''} de bienvenida.</p>` : ''}
    <form id="frm" novalidate>
    <label for="n">Tu nombre</label><input id="n" autocomplete="name" maxlength="80" required aria-required="true">
    <label for="p">Tu teléfono (WhatsApp)</label><input id="p" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Ej: 11 2345 6789" required aria-required="true">
    <p class="mute" id="ph" style="margin:6px 0 0;font-size:13px">Escribilo como quieras: lo acomodamos solos.</p>
    ${biz.ask_birthday ? '<label for="bd">Tu cumpleaños (opcional)</label><input id="bd" type="date">' : ''}
    ${biz.ask_promo ? '<label class="consent"><input type="checkbox" id="pm"> Quiero recibir ofertas y novedades por WhatsApp (opcional)</label>' : ''}
    <label class="consent"><input type="checkbox" id="ac" required aria-required="true"> Acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y el uso de mis datos solo para esta tarjeta de sellos.</label>
    <button type="submit" id="go">Crear mi tarjeta y ver el menú</button><div id="m" aria-live="polite"></div></form></div>
  <div class="card"><details id="det"><summary style="cursor:pointer;font-weight:700">Ya tengo mi tarjeta: entrar con mi código</summary>
    <form id="frm2" novalidate style="margin-top:12px">
    <label for="cd">Tu código de tarjeta</label><input id="cd" autocapitalize="characters" autocomplete="off" maxlength="8" placeholder="Ej: A1B2C3D4" required aria-required="true">
    <p class="mute" style="margin:6px 0 0;font-size:13px">Son los 8 caracteres de tu QR (si te los mandaron por WhatsApp, usá ese mensaje).</p>
    <button type="submit" id="go2">Entrar con mi código</button><div id="m2" aria-live="polite"></div></form></details></div>
  <a class="btn alt" style="display:block;margin-top:12px" href="menus/">📍 Ver los menús de otros negocios</a>`;
  const elN = document.getElementById('n'), elP = document.getElementById('p'), ph = document.getElementById('ph'), m = document.getElementById('m');
  elP.oninput = () => {
    const v = normPhone(elP.value);
    if (!elP.value.trim()) { ph.textContent = 'Escribilo como quieras: lo acomodamos solos.'; ph.style.color = ''; return; }
    ph.textContent = v.length >= 6 ? '✓ Queda guardado como: ' + v.replace(/^(\d{2,4})(\d+)$/, '$1 $2') : 'Escribilo como quieras: lo acomodamos solos.';
    ph.style.color = '';
  };
  document.getElementById('frm').onsubmit = async ev => {
    ev.preventDefault();
    const go = document.getElementById('go');
    const name = elN.value.trim(), phone = normPhone(elP.value);
    if (name.length < 2) return flash(m, 'Escribí tu nombre', false);
    if (phone.length < 6) return flash(m, 'Escribí un teléfono válido (con característica). Ej: 11 2345 6789', false);
    if (!document.getElementById('ac').checked) return flash(m, 'Tenés que aceptar la política de privacidad para crear tu tarjeta', false);
    go.disabled = true;
    try {
      const code = await rpc('register_customer', { p_slug: slug, p_name: name, p_phone: phone, p_birthday: document.getElementById('bd')?.value || null, p_promo: !!document.getElementById('pm')?.checked });
      localStorage.setItem('code_' + slug, code);
      menuView();
    } catch (e) {
      go.disabled = false;
      flash(m, e.message, false);
      if (/Ya tenés una tarjeta/i.test(e.message || '')) {
        m.innerHTML += '<p class="mute" style="margin:8px 0 0">Si esa tarjeta es tuya, entrá con tu código (abajo) o pedile al negocio que te la recupere.</p>';
        document.getElementById('det').open = true;
      }
    }
  };
  document.getElementById('frm2').onsubmit = async ev => {
    ev.preventDefault();
    const go2 = document.getElementById('go2'), m2 = document.getElementById('m2');
    const cod = document.getElementById('cd').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,8}$/.test(cod)) return flash(m2, 'El código tiene 6 a 8 letras o números', false);
    go2.disabled = true;
    try {
      const c = await rpc('get_card', { p_slug: slug, p_code: cod });
      if (!c) { go2.disabled = false; return flash(m2, 'No encontramos una tarjeta con ese código en este negocio', false); }
      localStorage.setItem('code_' + slug, cod);
      menuView();
    } catch (e) { go2.disabled = false; flash(m2, e.message, false); }
  };
}

/* Si el negocio está conectado en este dispositivo (abrió "Ver el menú" desde
   el panel), puede ver su propio menú sin tarjeta: el panel ya lo identificó. */
async function esDueño() {
  const ps = sessionStorage.getItem('pin_' + slug);
  if (!ps) return false;
  try {
    const st = await rpc('biz_stats', { p_slug: slug, p_pin: ps });
    if (st && !st.error) return true;
    sessionStorage.removeItem('pin_' + slug);
  } catch {}
  return false;
}

async function menuView() {
  document.title = biz.name + ' · Menú';
  legalFooter();
  /* Si el cliente lo abrió desde el celular y ese negocio tiene menú, ofrecemos
     volver al menú. Si no, volvemos donde estaba. */
  const tieneTarjeta = !!savedCards().find(([sl]) => sl === slug);
  const volver = tieneTarjeta ? `<a class="btn alt" style="display:block;margin-top:12px" href="?b=${encodeURIComponent(slug)}">🎴 Ver mi tarjeta de sellos</a>` : '';
  if (!biz.menu_enabled) {
    $app.innerHTML = `${bhero('Menú', biz.name, 'Este negocio todavía no cargó su menú', '🍽️', true)}<div class="card"><p class="mute" style="margin:0">Este negocio no tiene menú publicado por ahora.</p></div>${installHtml('menus')}${tieneTarjeta ? volver : `<a class="btn alt" style="display:block;margin-top:12px" href="?b=${encodeURIComponent(slug)}">🎴 Crear mi tarjeta de sellos</a>`}`;
    return;
  }
  /* Para ver el menú hace falta la tarjeta del negocio: así el cliente no entra
     a un menú donde después le dicen que no tiene tarjeta. Si el código guardado
     ya no existe (borró la tarjeta en otro celular), se lo vuelve a pedir.
     El negocio dueño, si está conectado en este dispositivo, sí puede verlo. */
  const code = localStorage.getItem('code_' + slug);
  let acceso = false;
  if (code) {
    try {
      const c = await rpc('get_card', { p_slug: slug, p_code: code });
      if (c) acceso = true;
      else localStorage.removeItem('code_' + slug);
    } catch (e) {
      $app.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div><p class="legal" style="text-align:center"><a href="?b=${encodeURIComponent(slug)}&menu=1">Volver a intentar</a></p>`;
      return;
    }
  }
  if (!acceso && !(await esDueño())) return menuTarjeta();
  $app.innerHTML = `${bhero('Menú', biz.name, '<span id="mu">Cargando menú…</span>', '🍽️')}
  <div class="card"><label for="mq">Buscar en el menú</label><input id="mq" type="search" autocomplete="off" placeholder="Ej: café, torta"></div>
  <div id="misped"></div><div id="cart"></div><div id="pmsg" aria-live="polite"></div>
  <div id="ml"></div>
  <div id="mcontacto"></div>
  ${installHtml('menus')}
  <a class="btn alt" style="display:block;margin-top:12px" href="menus/">📍 Ver los menús de otros negocios</a>
  ${volver}`;
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  /* ---- Carrito y pedido: solo si el negocio tiene el módulo de pedidos ---- */
  const conPedidos = !!biz.modulos?.pedidos;
  let cart = [];
  const total = () => cart.reduce((a, x) => a + (Number(x.p) || 0) * x.q, 0);
  const enviar = async (code, nombre) => {
    const msg = document.getElementById('pmsg'), btn = document.getElementById('pedir');
    if (btn) btn.disabled = true;
    try {
      await rpc('pedido_crear', { p_slug: slug, p_codigo: code, p_items: cart.map(x => ({ n: x.n, p: x.p, q: x.q, e: x.e })), p_total: total(), p_cliente: nombre || null, p_nota: (document.getElementById('pnota')?.value || '').trim() });
      cart = []; renderCart();
      msg.innerHTML = '<div class="msg ok">✓ ¡Pedido enviado! Te lo preparamos en el local.</div>';
    } catch (e) { msg.innerHTML = `<div class="msg err" role="alert">${esc(e.message)}</div>`; if (btn) btn.disabled = false; }
  };
  const formRegistro = () => {
    const msg = document.getElementById('pmsg');
    msg.innerHTML = `<div class="card"><h2>Creá tu tarjeta para pedir</h2><p class="mute" style="margin:0 0 10px">Con tu tarjeta te sumamos el sello de este pedido. Solo tu nombre y tu teléfono.</p>
      <form id="preg" novalidate><label for="rn">Tu nombre</label><input id="rn" maxlength="80" required>
      <label for="rp">Tu teléfono</label><input id="rp" type="tel" inputmode="tel" maxlength="20" required>
      <label class="consent"><input type="checkbox" id="rac" required> Acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y el uso de mis datos solo para esta tarjeta de sellos.</label>
      <button type="submit" id="rgo">Crear mi tarjeta y pedir</button></form></div>`;
    document.getElementById('preg').onsubmit = async ev => {
      ev.preventDefault();
      const go = document.getElementById('rgo');
      const nom = document.getElementById('rn').value.trim(), tel = document.getElementById('rp').value.replace(/\D/g, '');
      if (nom.length < 2) return flash(msg, 'Escribí tu nombre', false);
      if (tel.length < 6) return flash(msg, 'Escribí un teléfono válido', false);
      if (!document.getElementById('rac').checked) return flash(msg, 'Tenés que aceptar la política de privacidad', false);
      go.disabled = true;
      try {
        const code = await rpc('register_customer', { p_slug: slug, p_name: nom, p_phone: tel, p_birthday: null, p_promo: false });
        localStorage.setItem('code_' + slug, code);
        await enviar(code, nom);
      } catch (e) { go.disabled = false; flash(msg, e.message, false); }
    };
  };
  const pedir = async () => {
    const code = localStorage.getItem('code_' + slug);
    if (!code) { formRegistro(); return; }
    let nombre = '';
    try { const c = await rpc('get_card', { p_slug: slug, p_code: code }); if (c) nombre = c.name; } catch (e) {}
    await enviar(code, nombre);
  };
  const renderCart = () => {
    const box = document.getElementById('cart');
    if (!box) return;
    if (!conPedidos || !cart.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="card"><h2>Tu pedido</h2><ul class="mlist">${cart.map((x, i) => `<li class="mrow"><span class="memoji" aria-hidden="true">${esc(x.e || '🛒')}</span><div class="mtxt"><b>${esc(x.n)}</b><div class="mute">${money.format(x.p)} c/u</div></div><span class="ebtns"><button class="alt sm" data-less="${i}" aria-label="Quitar uno">−</button><b class="oq">${x.q}</b><button class="alt sm" data-plus="${i}" aria-label="Agregar uno">+</button></span></li>`).join('')}</ul>
      <div class="ototal">Total ${money.format(total())}</div>
      <label for="pnota">Nota para el local (opcional)</label><input id="pnota" maxlength="120" placeholder="Ej: sin azúcar, para llevar">
      <button id="pedir">Pedir y ganar mi sello</button>
      <p class="mute" style="text-align:center;margin:10px 0 0">Pagás en el local. Cuando te entreguen el pedido te sumamos el sello.</p></div>`;
    box.querySelectorAll('[data-less]').forEach(b => b.onclick = () => { const i = +b.dataset.less; cart[i].q--; if (cart[i].q <= 0) cart.splice(i, 1); renderCart(); });
    box.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { cart[+b.dataset.plus].q++; renderCart(); });
    document.getElementById('pedir').onclick = pedir;
  };
  const misPedidos = async () => {
    const box = document.getElementById('misped');
    if (!box || !conPedidos) return;
    const code = localStorage.getItem('code_' + slug);
    if (!code) { box.innerHTML = ''; return; }
    try {
      const P = await rpc('pedidos_mios', { p_slug: slug, p_codigo: code });
      if (!(P || []).some(o => o.estado === 'pendiente')) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="card notice">⏳ Tenés un pedido en la barra. Te avisamos cuando esté listo.</div>';
    } catch (e) { box.innerHTML = ''; }
  };
  let data = null, last = 0;
  const render = () => {
    const box = document.getElementById('ml'), mu = document.getElementById('mu');
    if (!box || !mu) return;    mu.textContent = data && data.updated ? 'Actualizado el ' + new Date(data.updated).toLocaleDateString('es-AR') : 'Elegí lo que más te guste';
    if (!data || !data.enabled) { box.innerHTML = '<div class="card"><p class="mute" style="margin:0">Este negocio no tiene menú.</p></div>'; return; }
    const mq = document.getElementById('mq');
    const q = mq ? normText(mq.value) : '';
    const its = (data.items || []).filter(x => !q || normText(x.name).includes(q) || normText(x.description).includes(q));
    if (!its.length) { box.innerHTML = `<div class="card"><p class="mute" style="margin:0">${q ? 'No encontramos nada con ese texto.' : 'Todavía no hay productos cargados.'}</p></div>`; return; }
    /* índices de categorías (foto + emoji) que cargó el negocio */
    const catInfo = {};
    (data.categories || []).forEach(c => { catInfo[c.name] = c; });
    const groups = [], seen = {};
    its.forEach(x => { const c = x.category || ''; if (!(c in seen)) { seen[c] = groups.length; groups.push({ c, list: [] }); } groups[seen[c]].list.push(x); });
    const chips = groups.filter(g => g.c).length > 3 ? `<nav class="mchips" aria-label="Categorías del menú">${groups.map((g, i) => g.c ? `<a class="mchip" href="#cat-${i}">${esc(g.c)}</a>` : '').join('')}</nav>` : '';
    box.innerHTML = chips + groups.map((g, i) => {
      const info = catInfo[g.c] || {};
      const foto = String(info.photo || '').trim();
      const ico = String(info.emoji || '').trim() || (g.list.map(x => String(x.emoji || '').trim()).find(e => e) || '');
      const head = g.c ? `<header class="mcover${foto ? '' : ' noimg'}" id="cat-${i}">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<div class="mcover-sign">${ico ? `<span class="mcover-ico" aria-hidden="true">${esc(ico)}</span>` : ''}<span class="mcover-t">${esc(g.c)}</span><span class="mcover-n">${g.list.length}</span></div></header>` : '';
      return head + `<ul class="mlist">${g.list.map(x => {
        const em = String(x.emoji || '').trim();
        const nota = String(x.price_note || '').trim();
        const precio = nota ? `<span class="mprice-v">${esc(nota)}</span>` : `<span class="mprice-v">${money.format(Number(x.price) || 0)}</span>`;
        const dest = x.featured ? '<span class="fdest">⭐ Destacado</span>' : '';
        return `<li class="mrow${x.available ? '' : ' sold'}${x.featured ? ' feat' : ''}">${em ? `<span class="memoji" aria-hidden="true">${esc(em)}</span>` : ''}<div class="mtxt"><b>${esc(x.name)}${dest}</b>${x.description ? `<div class="mute">${esc(x.description)}</div>` : ''}</div>${conPedidos && x.available ? `<button class="madd" data-add="${esc(x.name)}" aria-label="Agregar ${esc(x.name)} al pedido">+</button>` : ''}<div class="mprice">${precio}${x.available ? '' : '<span class="badge">Agotado</span>'}</div></li>`;
      }).join('')}</ul>`;
    }).join('');
    if (conPedidos) box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const it = (data.items || []).find(x => x.name === b.dataset.add);
      if (!it) return;
      const l = cart.find(x => x.n === it.name);
      if (l) l.q++; else cart.push({ n: it.name, p: Number(it.price) || 0, e: String(it.emoji || '').trim(), q: 1 });
      renderCart();
    });
  };
  const load = async () => {
    try {
      data = await rpc('get_menu', { p_slug: slug }); last = Date.now(); render(); contacto(); misPedidos();
    }
    catch (e) { const b = document.getElementById('ml'); if (b) b.innerHTML = `<div class="card"><div class="msg err" style="margin:0">${esc(e.message)}</div></div>`; }
  };
  /* Datos de contacto del negocio: WhatsApp y llamar. El teléfono viene del menú.
     Siempre incluye "Invitar a un amigo", aunque el negocio no haya cargado teléfono. */
  const contacto = () => {
    const box = document.getElementById('mcontacto');
    if (!box || !data) return;
    const tel = String(data.phone || '').trim();
    const num = tel ? waNum(tel) : '';
    const dir = String(data.address || '').trim();
    const url = location.origin + location.pathname + '?b=' + encodeURIComponent(slug);
    const invit = `¡${biz.name} te regala premios! 🎁 Juntá ${biz.stamps_needed} sellos y llevate ${biz.reward_emoji || '🎁'} ${biz.reward}. Sacá tu tarjeta acá 👉 ${url}`;
    const invita = `<a class="btn alt" style="display:block;margin-top:10px" href="https://wa.me/?text=${encodeURIComponent(invit)}" target="_blank" rel="noopener noreferrer">💬 Invitar a un amigo</a>`;
    const pedir = num ? `<h2>¿Querés pedir o consultar?</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="https://wa.me/${esc(num)}?text=${encodeURIComponent('Hola ' + biz.name + '! Vi el menú y quería consultar.')}" target="_blank" rel="noopener noreferrer">💬 Escribir por WhatsApp</a><a class="btn alt" href="tel:${esc(num)}">📞 Llamar</a></div>
      ${dir ? `<p class="mute" style="margin:10px 0 0">📍 ${esc(dir)}</p>` : ''}` : `<h2>¿Te gustó?</h2>${dir ? `<p class="mute" style="margin:0 0 10px">📍 ${esc(dir)}</p>` : '<p class="mute" style="margin:0 0 10px">Invitá a un amigo a conocer este lugar.</p>'}`;
    box.innerHTML = `<div class="card">${pedir}${invita}</div>`;
  };
  const mqEl = document.getElementById('mq');
  if (mqEl) mqEl.oninput = render;
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
  /* Si el menú todavía no está activado, mostramos cómo activarlo. */
  if (!biz.menu_enabled) {
    v.innerHTML = `<div class="card"><h2>🍽️ Tu menú digital</h2>
      <p class="mute" style="margin:0 0 10px">Mostrale a tus clientes todo lo que ofrecés, con precios y fotos. Se ve en un link propio que podés compartir por WhatsApp o poner en tu Instagram.</p>
      <p class="mute" style="margin:0 0 12px">Tener el menú activado también te agrega a <b>“Menús de la zona”</b>, para que gente nueva te encuentre. Lo podés prender o apagar cuando quieras desde <b>Ajustes</b>.</p>
      <button id="mon">Activar mi menú</button><div id="mm" aria-live="polite"></div></div>`;
    document.getElementById('mon').onclick = async e => {
      const b = e.target; b.disabled = true;
      try {
        const r = await rpc('biz_menu_toggle', { p_slug: slug, p_pin: pin, p_on: true });
        biz.menu_enabled = !!(r && r.menu_enabled);
        setTimeout(() => {
          panel('menu');
          const mm = document.getElementById('mm');
          if (mm) flash(mm, '¡Menú activado! Ya podés cargar tus productos.', true);
        }, 700);
      } catch (err) { b.disabled = false; flash(document.getElementById('mm'), err.message, false); }
    };
    return;
  }
  let items = [], updated = null, cats = [];
  v.innerHTML = `<div class="card"><h2>Menú del negocio</h2>
  <p class="mute" style="margin:0 0 8px">Cargá los productos y las fotos de cada categoría. Tocá “Guardar cambios” y se ven en el menú público al instante.</p>
  <p class="mute" id="mt" style="margin:0 0 10px">Última actualización: —</p>
  <label for="mlk">Link del menú para tus clientes</label><input id="mlk" readonly value="">
  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="alt sm" id="mcp">Copiar link</button><a class="btn alt sm" id="mwa" target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a><a class="btn alt sm" id="mver" target="_blank">Ver el menú</a></div><div id="mcs" aria-live="polite"></div>
  <a class="btn alt" style="display:block;margin-top:12px" href="menus/">📍 Ver los menús de otros negocios de la zona</a>
  <button class="alt" id="moff" style="margin-top:12px;opacity:.85">Ocultar mi menú (desactivarlo)</button><div id="moffm" aria-live="polite"></div></div>
  <div class="card"><div id="magotados" class="mute" style="margin:0 0 10px"></div><div id="mg"></div>
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
  mwa.href = 'https://wa.me/?text=' + encodeURIComponent('Mirá el menú de ' + biz.name + ' 👉 ' + mlk.value);
  mver.href = mlk.value;
  const moff = document.getElementById('moff');
  if (moff) moff.onclick = async e => {
    if (!confirm('¿Ocultar tu menú? Dejará de verse para los clientes hasta que lo actives de nuevo. Si tenés los pedidos activados, se apagan también.')) return;
    const b = e.target; b.disabled = true;
    try {
      const r = await rpc('biz_menu_toggle', { p_slug: slug, p_pin: pin, p_on: false });
      biz.menu_enabled = !!(r && r.menu_enabled);
      if (!biz.menu_enabled && biz.modulos) biz.modulos.pedidos = false;
      setTimeout(() => {
        panel('menu');
        const mm = document.getElementById('mm');
        if (mm) flash(mm, 'Menú oculto. Los pedidos se apagaron también: el pedido se hace desde el menú. Lo podés volver a activar desde Ajustes.', true);
      }, 700);
    } catch (err) { b.disabled = false; flash(document.getElementById('moffm'), err.message, false); }
  };
  const normCat = s => String(s ?? '').trim().slice(0, 40);
  const regroup = arr => { const g = [], ix = {}; arr.forEach(x => { const c = x.category || ''; if (!(c in ix)) { ix[c] = g.length; g.push([]); } g[ix[c]].push(x); }); return [].concat(...g); };
  const pushItem = it => { let last = -1; items.forEach((x, i) => { if (x.category === it.category) last = i; }); const at = last < 0 ? items.length : last + 1; items.splice(at, 0, it); return at; };
  /* Marca un producto como "recién agregado" para que se resalte y se vea. */
  const marcarNuevo = (i, cat) => {
    items.forEach(x => { delete x.__nuevo; });
    if (items[i]) items[i].__nuevo = cat;
  };
  /* Agrega un producto, lo resalta, hace scroll hasta él y lo deja listo para
     escribir el nombre. Así el negocio ve claramente qué acaba de agregar. */
  const agregarProducto = cat => {
    const at = pushItem({ id: null, category: cat, name: '', description: '', price: 0, available: true, hidden: false, emoji: '', featured: false, price_note: '' });
    marcarNuevo(at, cat);
    setDirty(true); render();
    const el = document.querySelector('.eprod[data-prod="' + at + '"]');
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const f = el.querySelector('[data-name]'); if (f) setTimeout(() => f.focus(), 120);
    }
    flash(mm, 'Producto agregado a “' + (cat || 'Sin categoría') + '”. Escribile el nombre.', true);
  };
  const setDirty = d => { menuDirty = d; const el = document.getElementById('mdy'); if (el) el.hidden = !d; };
  const updLine = () => { mt.textContent = 'Última actualización: ' + (updated ? new Date(updated).toLocaleString('es-AR') : '—'); };
  const catOf = n => { const c = cats.find(x => x.name === n); if (c) return c; const nn = { name: n, emoji: '', photo: '' }; cats.push(nn); return nn; };
  /* Sube o baja una categoría entera, junto con todos sus productos. */
  const moverCategoria = (name, dir) => {
    const names = []; items.forEach(x => { const c = x.category || ''; if (!names.includes(c)) names.push(c); });
    const at = names.indexOf(name); if (at < 0) return;
    const to = at + dir; if (to < 0 || to >= names.length) return;
    names.splice(to, 0, names.splice(at, 1)[0]);
    const byCat = {}; items.forEach(x => { (byCat[x.category || ''] = byCat[x.category || ''] || []).push(x); });
    items = [].concat(...names.map(c => byCat[c] || []));
    const ord = names.map(c => catOf(c));
    cats = ord.concat(cats.filter(c => !names.includes(c.name)));
    setDirty(true); render();
  };
  const adopt = r => { updated = r.updated; cats = []; items = regroup((r.items || []).map(x => ({ id: x.id, category: normCat(x.category), name: x.name || '', description: x.description || '', price: Number(x.price) || 0, available: !!x.available, hidden: !!x.hidden, emoji: x.emoji || '', featured: !!x.featured, price_note: x.price_note || '' }))); items.forEach(x => catOf(x.category)); setDirty(false); updLine(); };
  const loadCats = async () => { try { const r = await rpc('biz_cat_list', { p_slug: slug, p_pin: pin }); (r.categories || []).forEach(c => { const e = catOf(c.name); e.emoji = c.emoji || ''; e.photo = c.photo || ''; }); } catch {} };
  const reload = async () => { try { adopt(await rpc('biz_menu_list', { p_slug: slug, p_pin: pin })); await loadCats(); render(); } catch (e) { flash(mm, e.message, false); } };
  const render = () => {
    const box = document.getElementById('mg');
    if (!box) return;
    const groups = [], ix = {};
    items.forEach((x, i) => { const c = x.category || ''; if (!(c in ix)) { ix[c] = groups.length; groups.push({ c, rows: [], start: i }); } groups[ix[c]].rows.push({ x, i }); });
    groups.forEach(g => catOf(g.c));
    const catNames = groups.map(g => g.c);
    if (groups.length) { const ag = items.filter(x => !x.available).length; document.getElementById('magotados').innerHTML = ag ? `⚠️ Tenés <b>${ag}</b> producto${ag === 1 ? '' : 's'} marcado${ag === 1 ? '' : 's'} como agotado. Los clientes lo ven.` : ''; }
    else { const ea = document.getElementById('magotados'); if (ea) ea.innerHTML = ''; }
    box.innerHTML = groups.length ? groups.map((g, gi) => { const ci = catOf(g.c); return `
    <div class="ecatbox" data-catbox="${esc(g.c)}">
      <div class="ecat-top"><input class="eice" data-cat="${g.start}" value="${esc(g.c)}" maxlength="40" placeholder="Sin categoría" aria-label="Nombre de la categoría" style="flex:1;min-width:0"><span class="mute" style="flex:none">${g.rows.length} prod.</span>
        <button class="alt sm" data-catup="${esc(g.c)}" ${gi === 0 ? 'disabled' : ''} aria-label="Subir la categoría ${esc(g.c)}" title="Subir categoría">↑</button>
        <button class="alt sm" data-catdn="${esc(g.c)}" ${gi === groups.length - 1 ? 'disabled' : ''} aria-label="Bajar la categoría ${esc(g.c)}" title="Bajar categoría">↓</button>
        <button class="alt sm" data-catrm="${esc(g.c)}" aria-label="Borrar la categoría ${esc(g.c)}" title="Borrar categoría">🗑️</button>
      </div>
      <div class="ecat-foto">
        <div class="ecat-prev">${ci.photo ? `<img src="${esc(ci.photo)}" alt="Foto de ${esc(g.c)}" onerror="this.parentNode.innerHTML='🖼️'">` : '🖼️'}</div>
        <div class="ecat-foto-c">
          <input class="eicemoji" data-catemo="${esc(g.c)}" value="${esc(ci.emoji || '')}" maxlength="8" placeholder="Emoji ☕" aria-label="Emoji de la categoría ${esc(g.c)}" style="max-width:96px;text-align:center">
          <p class="mute">Foto de fondo de la categoría. Se ve grande arriba de los productos.</p>
          <input type="file" accept="image/*" data-catfile="${esc(g.c)}" aria-label="Elegir foto de ${esc(g.c)}">
          <div class="upbar" data-upbar="${esc(g.c)}"><i></i></div>
          <button class="alt sm" data-catdel="${esc(g.c)}" ${ci.photo ? '' : 'hidden'}>Quitar foto</button>
        </div>
      </div>
      <div class="ecat-actions" style="display:flex;gap:8px;margin-top:10px">
        <button class="alt sm" data-ac="${esc(g.c)}">+ Agregar producto</button>
      </div>
      ${g.rows.map(r => { const it = r.x, i = r.i; const esNuevo = (r.x.__nuevo ? ' nuevo' : ''); return `
      <div class="eprod${esNuevo}" data-prod="${i}">
        <div class="erow">
          <input class="eemoji" data-emo="${i}" value="${esc(it.emoji || '')}" maxlength="8" placeholder="🍔" aria-label="Emoji del producto ${i + 1}">
          <input class="eic" data-name="${i}" value="${esc(it.name)}" maxlength="80" placeholder="Nombre del producto (ej: Café con leche)" aria-label="Nombre del producto ${i + 1}">
          <span class="ebtns"><button class="alt sm" data-up="${i}" aria-label="Subir el producto ${i + 1}" title="Subir">↑</button><button class="alt sm" data-dn="${i}" aria-label="Bajar el producto ${i + 1}" title="Bajar">↓</button><button class="alt sm" data-del="${i}" aria-label="Eliminar el producto ${i + 1}" title="Eliminar">✕</button></span>
        </div>
        <div class="erow-d">
          <label class="consent" style="margin:0;flex:1;min-width:0"><span class="mute" style="flex:none">$ Precio:</span> <input data-price="${i}" type="number" inputmode="decimal" step="any" min="0" value="${esc(it.price)}" aria-label="Precio del producto ${i + 1}" ${it.price_note ? 'disabled' : ''} title="${it.price_note ? 'Reemplazado por: ' + esc(it.price_note) : 'Precio'}"></label>
        </div>
        <div class="eopts">${catNames.length > 1 ? `<label class="consent"><span class="mute">Categoría:</span> <select data-mv="${i}" aria-label="Categoría del producto ${i + 1}">${catNames.map(c => `<option value="${esc(c)}"${c === it.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>` : ''}<label class="consent"><input type="checkbox" data-sld="${i}" ${it.available ? '' : 'checked'}> Agotado por ahora</label><label class="consent"><input type="checkbox" data-hid="${i}" ${it.hidden ? 'checked' : ''}> Ocultar (no se ve nunca)</label><label class="consent"><input type="checkbox" data-ft="${i}" ${it.featured ? 'checked' : ''}> ⭐ Destacado</label></div>
        <details><summary>Descripción y precio especial</summary><textarea data-dsc="${i}" maxlength="200" rows="2" aria-label="Descripción del producto ${i + 1}" placeholder="Ej: en taza grande, con leche cremosa">${esc(it.description)}</textarea><input data-pnote="${i}" maxlength="20" value="${esc(it.price_note || '')}" placeholder="En vez de precio, ej: Consultar" aria-label="Texto del precio del producto ${i + 1}"></details>
      </div>`; }).join('')}
    </div>`; }).join('')
      : '<p class="mute">Todavía no hay productos. Empezá con “+ Nueva categoría”.</p>';
    box.querySelectorAll('[data-cat]').forEach(el => el.onchange = () => {
      const i = +el.dataset.cat, old = items[i].category, nw = normCat(el.value);
      if (nw === old) { el.value = old; return; }
      if (nw && cats.some(c => c.name === nw && c.name !== old)) return flash(mm, 'Ya tenés una categoría con ese nombre', false);
      const ci = catOf(old); ci.name = nw; items.forEach(x => { if (x.category === old) x.category = nw; }); setDirty(true); render();
    });
    box.querySelectorAll('[data-catup]').forEach(el => el.onclick = () => moverCategoria(el.dataset.catup, -1));
    box.querySelectorAll('[data-catdn]').forEach(el => el.onclick = () => moverCategoria(el.dataset.catdn, 1));
    box.querySelectorAll('[data-catrm]').forEach(el => el.onclick = async () => {
      const name = el.dataset.catrm;
      const n = items.filter(x => x.category === name).length;
      if (!confirm('¿Borrar la categoría “' + (name || 'Sin categoría') + '”' + (n ? ' y sus ' + n + ' producto' + (n === 1 ? '' : 's') : '') + '? No se puede deshacer.')) return;
      try {
        await rpc('biz_cat_del', { p_slug: slug, p_pin: pin, p_name: name });
        cats = cats.filter(c => c.name !== name);
        items = items.filter(x => x.category !== name);
        setDirty(false); flash(mm, 'Categoría borrada', true); await reload();
      } catch (e) { flash(mm, e.message, false); }
    });
    box.querySelectorAll('[data-catemo]').forEach(el => el.oninput = () => { catOf(el.dataset.catemo).emoji = el.value.slice(0, 8); setDirty(true); });
    box.querySelectorAll('[data-catfile]').forEach(el => el.onchange = async () => {
      const file = el.files && el.files[0]; if (!file) return;
      const name = el.dataset.catfile, ci = catOf(name);
      if (file.size > 5 * 1024 * 1024) { flash(mm, 'La foto es muy grande (máximo 5 MB). Probá con una más liviana.', false); el.value = ''; return; }
      const bar = el.parentNode ? el.parentNode.querySelector('.upbar') : null, fill = bar && bar.firstElementChild;
      if (bar) { bar.style.display = 'block'; if (fill) fill.style.width = '0%'; }
      el.disabled = true;
      try {
        const url = await subirFoto(slug, pin, file, p => { if (fill) fill.style.width = p + '%'; });
        ci.photo = url; setDirty(true);
        await rpc('biz_cat_save', { p_slug: slug, p_pin: pin, p_items: cats.map((c, k) => ({ name: c.name, emoji: c.emoji || '', photo: c.photo || '', position: k })) });
        flash(mm, 'Foto cargada. Se ve en el menú público.', true); render();
      } catch (e) { flash(mm, e.message || 'No se pudo subir la foto', false); el.value = ''; }
      finally { el.disabled = false; if (bar) bar.style.display = 'none'; }
    });
    box.querySelectorAll('[data-catdel]').forEach(el => el.onclick = async () => {
      const name = el.dataset.catdel; if (!confirm('¿Quitar la foto de “' + name + '”?')) return;
      catOf(name).photo = ''; setDirty(true);
      try { await rpc('biz_cat_save', { p_slug: slug, p_pin: pin, p_items: cats.map((c, k) => ({ name: c.name, emoji: c.emoji || '', photo: c.photo || '', position: k })) }); } catch {}
      render();
    });
    box.querySelectorAll('[data-ac]').forEach(el => el.onclick = () => agregarProducto(el.dataset.ac));
    box.querySelectorAll('[data-name]').forEach(el => el.oninput = () => { items[+el.dataset.name].name = el.value; setDirty(true); });
    box.querySelectorAll('[data-emo]').forEach(el => el.oninput = () => { items[+el.dataset.emo].emoji = el.value.slice(0, 8); setDirty(true); });
    box.querySelectorAll('[data-price]').forEach(el => el.oninput = () => { items[+el.dataset.price].price = Number(el.value); setDirty(true); });
    box.querySelectorAll('[data-dsc]').forEach(el => el.oninput = () => { items[+el.dataset.dsc].description = el.value; setDirty(true); });
    box.querySelectorAll('[data-sld]').forEach(el => el.onchange = () => { items[+el.dataset.sld].available = !el.checked; setDirty(true); });
    box.querySelectorAll('[data-hid]').forEach(el => el.onchange = () => { items[+el.dataset.hid].hidden = el.checked; setDirty(true); });
    box.querySelectorAll('[data-ft]').forEach(el => el.onchange = () => { items[+el.dataset.ft].featured = el.checked; setDirty(true); });
    box.querySelectorAll('[data-pnote]').forEach(el => el.oninput = () => { items[+el.dataset.pnote].price_note = el.value.slice(0, 20); setDirty(true); });
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
    /* El resaltado de "recién agregado" dura un momento y se apaga solo. */
    if (items.some(x => x.__nuevo)) setTimeout(() => {
      items.forEach(x => { delete x.__nuevo; });
      document.querySelectorAll('.eprod.nuevo').forEach(el => el.classList.remove('nuevo'));
    }, 2600);
  };
  document.getElementById('mnc').onclick = () => {
    const c = prompt('Nombre de la nueva categoría');
    if (c === null) return;
    const nc = normCat(c);
    if (!nc) return flash(mm, 'Escribí un nombre para la categoría', false);
    if (nc.length > 40) return flash(mm, 'La categoría no puede superar los 40 caracteres', false);
    if (cats.some(c => c.name === nc)) return flash(mm, 'Ya tenés una categoría con ese nombre', false);
    catOf(nc);
    agregarProducto(nc);
  };
  document.getElementById('msv').onclick = async () => {
    if (!items.length && !confirm('¿Guardar el menú vacío? Se van a borrar todos los productos.')) return;
    if (items.some(x => !x.name.trim() || x.name.trim().length > 80)) return flash(mm, 'Todos los productos necesitan un nombre de 1 a 80 caracteres', false);
    if (items.some(x => !isFinite(Number(x.price)) || Number(x.price) < 0)) return flash(mm, 'Revisá los precios: van solo números, sin letras ni signos', false);
    if (items.some(x => x.category.length > 40)) return flash(mm, 'La categoría no puede superar los 40 caracteres', false);
    if (items.some(x => String(x.price_note || '').trim().length > 20)) return flash(mm, 'El texto del precio no puede superar los 20 caracteres', false);
    const b = document.getElementById('msv'); b.disabled = true;
    try {
      await rpc('biz_menu_save', { p_slug: slug, p_pin: pin, p_items: items.map(x => ({ id: x.id || null, category: x.category, name: x.name.trim(), description: x.description.trim(), price: Number(x.price) || 0, available: !!x.available, hidden: !!x.hidden, emoji: String(x.emoji || '').trim().slice(0, 8), featured: !!x.featured, price_note: String(x.price_note || '').trim() })) });
      await rpc('biz_cat_save', { p_slug: slug, p_pin: pin, p_items: cats.map((c, k) => ({ name: c.name, emoji: c.emoji || '', photo: c.photo || '', position: k })) });
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
      pushItem({ id: null, category: cat, name: nom, description: '', price: Math.round(price * 100) / 100, available: true, hidden: false, emoji: '', featured: false, price_note: '' });
      ok++;
    });
    if (!ok) return flash(mpmsg, 'No pude leer ninguna línea. Usá el formato: Categoría; Nombre; Precio', false);
    setDirty(true); render();
    flash(mpmsg, ok + ' producto' + (ok === 1 ? '' : 's') + ' agregado' + (ok === 1 ? '' : 's') + (mal ? ' · ' + mal + ' línea' + (mal === 1 ? '' : 's') + ' descartada' + (mal === 1 ? '' : 's') : '') + '. Revisalos y guardá.', true);
  };
  try { adopt(await rpc('biz_menu_list', { p_slug: slug, p_pin: pin })); await loadCats(); render(); }
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
  if (!slug) { $app.innerHTML = `${bhero('Tarjeta de sellos', 'Falta el negocio', 'Pedile al negocio el link o el código QR correcto', '🔗', true)}<div class="card"><p class="mute" style="margin:0 0 10px">El link tiene que incluir el negocio. Ejemplo: <b>?b=nombre-del-negocio</b></p><a class="btn alt" style="display:block" href="menus/">📍 Ver los menús de los negocios de la zona</a><a class="btn alt" style="display:block;margin-top:12px" href="tarjetas/">🎴 Mis tarjetas</a><a class="btn alt" style="display:block;margin-top:12px" href="panel/">⚙️ Soy un negocio (panel)</a></div>`; return; }
  try {
    biz = await rpc('get_business', { p_slug: slug });
    if (!biz) { $app.innerHTML = '<div class="msg err">Negocio no encontrado</div>'; return; }
    setColor(biz.color, biz.color2); setBg(biz.bg_color); legalFooter();
    if (isPanel) { document.title = biz.name; try { localStorage.setItem('panel_slug', slug); } catch {} }
    else { document.title = biz.name + ' · Mis tarjetas'; }
    if (qs.has('cartel')) return posterView();
    try { biz.menu_enabled = !!(await rpc('get_features', { p_slug: slug }))?.menu; } catch { biz.menu_enabled = false; }
    try { biz.modulos = (await rpc('get_modulos', { p_slug: slug })) || {}; } catch { biz.modulos = {}; }
    if (qs.has('menu') && !isPanel) return menuView();
    const rc = qs.get('c');
    if (!isPanel && rc && /^[A-Z0-9]{6,8}$/i.test(rc)) { try { localStorage.setItem('code_' + slug, rc.toUpperCase()); history.replaceState(null, '', location.pathname + '?b=' + slug); } catch {} }
    if (!isPanel) return customerView();
    if (pin) { try { const b = await rpc('biz_login', { p_slug: slug, p_pin: pin }); biz = { ...biz, ...b }; return panel(qs.get('tab') || 'stamp'); } catch {} }
    loginView();
  } catch (e) { $app.innerHTML = `<div class="msg err">${esc(e.message)}. Revisá la configuración de Supabase.</div>`; }
})();