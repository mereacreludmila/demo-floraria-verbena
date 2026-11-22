/* app.js — coșul, comanda, caruselele și bara de livrare. Datele vin din window.VERBENA (generate de build.js). */
(function () {
  var D = window.VERBENA || { setari: {}, texte: {}, produse: [] };
  var S = D.setari, T = D.texte;
  function $(id) { return document.getElementById(id); }
  function lei(n) { return Number(n).toLocaleString('ro-RO') + ' lei'; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200); }
  function produs(id) { return D.produse.filter(function (x) { return x.id === id; })[0]; }

  /* ---------- trimiterea formularelor ---------- */
  function trimite(formular, date) {
    if (S.metoda === 'netlify' && document.documentElement.dataset.site === 'live') {
      date['form-name'] = formular;
      return fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(date).toString() })
        .then(function (r) { if (!r.ok) throw new Error(r.status); });
    }
    if (S.metoda === 'endpoint' && S.endpoint) {
      date._formular = formular;
      return fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(date) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); });
    }
    // „whatsapp” sau previzualizare: nu se trimite nimic pe server, clientul confirmă pe WhatsApp
    return new Promise(function (ok) { setTimeout(ok, 400); });
  }

  /* ---------- livrare azi / mâine ---------- */
  function primaZi() { var d = new Date(); var poate = S.zileLivrare.indexOf(d.getDay()) > -1 && d.getHours() < S.oraLimita; if (!poate && S.zileLivrare.length) { do { d.setDate(d.getDate() + 1); } while (S.zileLivrare.indexOf(d.getDay()) === -1); } return d; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function bara() {
    var d = new Date(), lim = new Date(d), cand; lim.setHours(S.oraLimita, 0, 0, 0);
    if (S.zileLivrare.indexOf(d.getDay()) > -1 && d < lim) {
      var min = Math.ceil((lim - d) / 60000), h = Math.floor(min / 60), m = min % 60;
      $('deliverybar').innerHTML = esc(T.livram_azi).replace('{timp}', '<strong>' + (h ? h + ' h ' : '') + m + ' min</strong>');
      cand = T.azi;
    } else {
      var z = primaZi(), mn = new Date(); mn.setDate(mn.getDate() + 1);
      cand = iso(z) === iso(mn) ? T.maine : z.toLocaleDateString('ro-RO', { weekday: 'long' });
      $('deliverybar').innerHTML = esc(T.pleaca).replace('{zi}', '<strong>' + esc(cand) + '</strong>');
    }
    document.querySelectorAll('[data-zi-tpl]').forEach(function (el) { el.textContent = el.dataset.ziTpl.replace('{zi}', cand); });
  }

  /* ---------- carusel principal ---------- */
  var s = $('slides');
  if (s && s.children.length > 1) {
    var n = s.children.length, dots = $('dots'), i = 0, timer;
    dots.innerHTML = Array.prototype.map.call(s.children, function (_, k) { return '<button aria-label="' + (k + 1) + '" data-k="' + k + '"></button>'; }).join('');
    var arata = function (k) { i = (k + n) % n; s.scrollTo({ left: s.clientWidth * i, behavior: reduce ? 'auto' : 'smooth' }); };
    var marcheaza = function () { var k = Math.round(s.scrollLeft / s.clientWidth); i = k; Array.prototype.forEach.call(dots.children, function (d, j) { d.setAttribute('aria-current', j === k); }); };
    var porneste = function () { if (reduce) return; clearInterval(timer); timer = setInterval(function () { arata(i + 1); }, 6000); };
    s.addEventListener('scroll', function () { clearTimeout(s._t); s._t = setTimeout(marcheaza, 80); });
    dots.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) { arata(+b.dataset.k); porneste(); } });
    $('prev').addEventListener('click', function () { arata(i - 1); porneste(); });
    $('next').addEventListener('click', function () { arata(i + 1); porneste(); });
    s.addEventListener('pointerenter', function () { clearInterval(timer); });
    s.addEventListener('pointerleave', porneste);
    s.addEventListener('touchstart', function () { clearInterval(timer); }, { passive: true });
    marcheaza(); porneste();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-rail]'); if (!b) return; var r = $(b.dataset.rail); r.scrollBy({ left: r.clientWidth * 0.9 * (+b.dataset.dir), behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- mărimi și adăugare în coș ---------- */
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.product'); if (!card) return;
    var mb = e.target.closest('[data-m]');
    if (mb && mb.tagName === 'BUTTON') {
      var k = mb.dataset.m; card.dataset.m = k;
      card.querySelectorAll('.sizes button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === k); });
      card.querySelectorAll('.size-view,.price [data-i]').forEach(function (v) { v.hidden = v.dataset.i !== k; });
      return;
    }
    if (e.target.closest('[data-add]')) {
      var id = card.dataset.id, m = +card.dataset.m || 0, cheie = id + ':' + m, g = cos.filter(function (z) { return z.k === cheie; })[0];
      if (g) g.q++; else cos.push({ k: cheie, id: id, m: m, q: 1 });
      salveaza(); actualizeaza();
      var p = produs(id); toast(p.nume + ' (' + p.marimi[m].nume + ') ' + T.adaugat);
    }
  });

  /* ---------- comandă rapidă: „Te sunăm noi” ---------- */
  var qf = $('quickForm');
  if (qf) qf.addEventListener('submit', function (e) {
    e.preventDefault(); var d = new FormData(qf), err = $('quickError');
    if (!String(d.get('nume')).trim() || String(d.get('telefon')).replace(/\D/g, '').length < 9) { err.hidden = false; err.textContent = 'Completează numele și un număr de telefon valid.'; return; }
    err.hidden = true; var b = qf.querySelector('button'); b.disabled = true; b.textContent = 'Se trimite…';
    var date = { nume: d.get('nume'), telefon: d.get('telefon'), mesaj: d.get('mesaj') || '' };
    trimite('suna-ma', date).then(function () {
      var wa = S.metoda === 'whatsapp' ? '<br><a class="btn wa-btn" style="margin-top:.8rem" target="_blank" rel="noopener" href="https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent('Bună ziua! Sunt ' + date.nume + ', vă rog să mă sunați la ' + date.telefon + '. ' + date.mesaj) + '">Trimite pe WhatsApp</a>' : '';
      qf.innerHTML = '<div class="ok"><strong>Mulțumim, ' + esc(date.nume) + '!</strong><br>Te sunăm la ' + esc(date.telefon) + ' în cel mult 30 de minute, în program.' + wa + '</div>';
    }).catch(function () { b.disabled = false; b.textContent = T.suna_buton; err.hidden = false; err.textContent = 'Cererea nu a plecat. Încearcă din nou sau sună-ne la ' + S.telefon + '.'; });
  });

  /* ---------- coș ---------- */
  var cos = (function () { try { var v = JSON.parse(localStorage.getItem('verbena-cos') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } })();
  var pas = 'cos';
  function salveaza() { try { localStorage.setItem('verbena-cos', JSON.stringify(cos)); } catch (e) {} }
  function subtotal() { return cos.reduce(function (s, x) { var p = produs(x.id); return p && p.marimi[x.m] ? s + p.marimi[x.m].pret * x.q : s; }, 0); }
  function taxa(metoda) { if (metoda === 'ridicare') return 0; return subtotal() >= S.livrareGratuitaPeste ? 0 : S.taxaLivrare; }
  function actualizeaza() { cos = cos.filter(function (x) { var p = produs(x.id); return p && p.marimi[x.m]; }); $('cartCount').textContent = cos.reduce(function (s, x) { return s + x.q; }, 0); if ($('drawer').classList.contains('open')) deseneaza(); }
  function thumb(p, m) {
    var x = p.marimi[m];
    if (x.img) return '<div class="ph are-poza"><img src="' + esc(x.img) + '" alt="" style="object-position:' + x.poz + '"></div>';
    return '<div class="ph" style="--tone:#ffffffaa;--tone-bg:' + p.fundal + ';--tone-dark:' + p.floare + '"><svg viewBox="0 0 100 100" style="width:60%"><use href="#floare"/></svg></div>';
  }
  function deseneaza() {
    var body = $('drawerBody'), foot = $('drawerFoot');
    if (pas === 'gata') return;
    if (!cos.length) { $('drawerTitle').textContent = T.cos; body.innerHTML = '<p class="empty">Coșul e gol. Alege un buchet și îl pregătim pentru livrare.</p>'; foot.innerHTML = '<button class="btn full" data-close>Vezi buchetele</button>'; return; }
    if (pas === 'cos') {
      $('drawerTitle').textContent = T.cos;
      body.innerHTML = cos.map(function (x) { var p = produs(x.id), m = p.marimi[x.m]; return '<div class="line-item"><div class="thumb">' + thumb(p, x.m) + '</div><div><strong>' + esc(p.nume) + '</strong><small>' + esc(m.nume) + ', ' + lei(m.pret) + '</small><div><span class="qty"><button data-q="-1" data-k="' + x.k + '" aria-label="Scade">−</button><span>' + x.q + '</span><button data-q="1" data-k="' + x.k + '" aria-label="Adaugă">+</button></span></div></div><strong>' + lei(m.pret * x.q) + '</strong></div>'; }).join('');
      var lipsa = S.livrareGratuitaPeste - subtotal();
      foot.innerHTML = '<div class="totals"><div><span>Buchete</span><span>' + lei(subtotal()) + '</span></div><div><span>Livrare în oraș</span><span>' + (taxa() ? lei(taxa()) : 'gratuită') + '</span></div><div class="grand"><span>Total</span><span>' + lei(subtotal() + taxa()) + '</span></div></div><button class="btn full" data-pas="comanda">Continuă spre livrare</button>' + (lipsa > 0 && S.livrareGratuitaPeste ? '<p class="hint">Mai adaugă ' + lei(lipsa) + ' și livrarea e gratuită.</p>' : '');
      return;
    }
    $('drawerTitle').textContent = 'Livrare și date';
    var min = iso(primaZi());
    body.innerHTML = '<form class="checkout" id="checkout" novalidate>' +
      '<fieldset><legend>Cum ajung florile</legend><div class="toggle" role="radiogroup"><label><input type="radio" name="metoda" value="livrare" checked><span>Livrare</span></label><label><input type="radio" name="metoda" value="ridicare"><span>Ridic din florărie</span></label></div></fieldset>' +
      '<fieldset><legend>Când</legend><div class="two"><label>Ziua<input type="date" name="data" min="' + min + '" value="' + min + '" required></label><label>Intervalul<select name="interval">' + S.intervale.map(function (i) { return '<option>' + esc(i) + '</option>'; }).join('') + '</select></label></div></fieldset>' +
      '<fieldset id="destFs"><legend>Pentru cine</legend><label>Numele destinatarului<input name="destinatar" autocomplete="off" required></label><label>Telefonul destinatarului <span class="opt">(pentru curier)</span><input name="telefon_destinatar" type="tel" inputmode="tel"></label><label>Adresa de livrare<input name="adresa" autocomplete="street-address" required></label></fieldset>' +
      '<fieldset><legend>Mesaj pe felicitare <span class="opt" style="font-family:var(--sans);font-size:.9rem">(opțional)</span></legend><textarea name="felicitare" maxlength="200" aria-label="Mesaj pe felicitare" placeholder="La mulți ani, mamă! Cu drag, Ana"></textarea></fieldset>' +
      '<fieldset><legend>Datele tale</legend><label>Numele tău<input name="nume" autocomplete="name" required></label><div class="two"><label>Telefon<input name="telefon" type="tel" inputmode="tel" autocomplete="tel" required></label><label>Email <span class="opt">(opțional)</span><input name="email" type="email" autocomplete="email"></label></div></fieldset>' +
      '<fieldset><legend>Plata</legend><div class="radios"><label><input type="radio" name="plata" value="La livrare, numerar sau card" checked>La livrare, numerar sau card</label><label><input type="radio" name="plata" value="Transfer bancar">Transfer bancar</label><label><input type="radio" name="plata" value="Link de plată cu cardul">Link de plată cu cardul, trimis la confirmare</label></div></fieldset>' +
      '<label>Observații <span class="opt">(opțional)</span><textarea name="observatii" placeholder="De exemplu: livrare anonimă, interfon 12"></textarea></label>' +
      '<p class="error" id="formError" hidden></p></form>';
    foot.innerHTML = '<div class="totals"><div><span>Buchete</span><span>' + lei(subtotal()) + '</span></div><div><span>Livrare</span><span id="taxaTxt">' + (taxa() ? lei(taxa()) : 'gratuită') + '</span></div><div class="grand"><span>Total</span><span id="totalTxt">' + lei(subtotal() + taxa()) + '</span></div></div><button class="btn full" id="trimite">Trimite comanda</button><p class="hint">Nu plătești acum. Te sunăm să confirmăm comanda.</p><button class="btn ghost full" style="margin-top:.6rem" data-pas="cos">Înapoi la coș</button>';
    $('checkout').addEventListener('change', function (e) { if (e.target.name === 'metoda') { $('destFs').hidden = e.target.value === 'ridicare'; $('taxaTxt').textContent = taxa(e.target.value) ? lei(taxa(e.target.value)) : 'gratuită'; $('totalTxt').textContent = lei(subtotal() + taxa(e.target.value)); } });
    $('trimite').addEventListener('click', trimiteComanda);
  }
  function trimiteComanda() {
    var f = $('checkout'), d = new FormData(f), err = $('formError'), ridicare = d.get('metoda') === 'ridicare';
    var obl = [['nume', 'numele tău'], ['telefon', 'telefonul tău'], ['data', 'ziua']]; if (!ridicare) obl.push(['destinatar', 'numele destinatarului'], ['adresa', 'adresa de livrare']);
    var lipsa = obl.filter(function (c) { return !String(d.get(c[0]) || '').trim(); }).map(function (c) { return c[1]; });
    if (lipsa.length) { err.hidden = false; err.textContent = 'Completează: ' + lipsa.join(', ') + '.'; err.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); return; }
    err.hidden = true;
    var numar = 'V' + Date.now().toString().slice(-6);
    var produse = cos.map(function (x) { var p = produs(x.id), m = p.marimi[x.m]; return x.q + ' × ' + p.nume + ' (' + m.nume + ') = ' + lei(m.pret * x.q); }).join('\n');
    var total = lei(subtotal() + taxa(d.get('metoda')));
    var dataTxt = new Date(d.get('data') + 'T12:00').toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
    var rezumat = 'Comanda ' + numar + '\n\n' + produse + '\nLivrare: ' + (ridicare ? 'ridicare din florărie' : (taxa() ? lei(taxa()) : 'gratuită')) + '\nTotal: ' + total + '\n\n' + (ridicare ? 'Ridicare' : 'Livrare') + ': ' + dataTxt + ', ' + d.get('interval') + (ridicare ? '' : '\nPentru: ' + d.get('destinatar') + (d.get('telefon_destinatar') ? ', ' + d.get('telefon_destinatar') : '') + '\nAdresa: ' + d.get('adresa')) + (d.get('felicitare') ? '\nFelicitare: „' + d.get('felicitare') + '”' : '') + '\n\nDe la: ' + d.get('nume') + ', ' + d.get('telefon') + (d.get('email') ? ', ' + d.get('email') : '') + '\nPlata: ' + d.get('plata') + (d.get('observatii') ? '\nObservații: ' + d.get('observatii') : '');
    var date = { numar: numar, nume: d.get('nume'), telefon: d.get('telefon'), email: d.get('email') || '', metoda: d.get('metoda'), destinatar: d.get('destinatar') || '', telefon_destinatar: d.get('telefon_destinatar') || '', adresa: d.get('adresa') || '', data: d.get('data'), interval: d.get('interval'), felicitare: d.get('felicitare') || '', plata: d.get('plata'), observatii: d.get('observatii') || '', produse: produse, total: total };
    var btn = $('trimite'); btn.disabled = true; btn.textContent = 'Se trimite comanda…';
    trimite('comanda', date).then(function () { confirmare(numar, rezumat); })
      .catch(function () { btn.disabled = false; btn.textContent = 'Trimite comanda'; err.hidden = false; err.textContent = 'Comanda nu a plecat. Verifică conexiunea și încearcă din nou, sau trimite-o pe WhatsApp.'; });
  }
  function confirmare(numar, rezumat) {
    pas = 'gata'; cos = []; salveaza(); $('cartCount').textContent = '0';
    var doarWa = S.metoda === 'whatsapp';
    $('drawerTitle').textContent = doarWa ? 'Mai e un pas' : 'Comandă trimisă';
    $('drawerBody').innerHTML = '<div class="done"><span class="num">' + numar + '</span><h3>' + (doarWa ? 'Trimite-ne comanda' : 'Mulțumim!') + '</h3><p>' + (doarWa ? 'Apasă butonul de mai jos ca să ne trimiți comanda pe WhatsApp. Te sunăm apoi să confirmăm.' : 'Am primit comanda. Te sunăm în cel mult 30 de minute, în program, ca să confirmăm detaliile și plata.') + '</p><div class="summary">' + esc(rezumat) + '</div></div>';
    $('drawerFoot').innerHTML = '<a class="btn wa-btn full" target="_blank" rel="noopener" href="https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent(rezumat) + '">' + (doarWa ? 'Trimite comanda pe WhatsApp' : 'Trimite și pe WhatsApp') + '</a>' + (doarWa ? '' : '<p class="hint">Opțional, dacă vrei confirmarea mai repede.</p>') + '<button class="btn ghost full" style="margin-top:.6rem" data-close>Înapoi la buchete</button>';
    $('drawerBody').scrollTop = 0;
  }
  $('drawer').addEventListener('click', function (e) {
    var q = e.target.closest('[data-q]');
    if (q) { var x = cos.filter(function (i) { return i.k === q.dataset.k; })[0]; if (x) { x.q += +q.dataset.q; if (x.q < 1) cos.splice(cos.indexOf(x), 1); } salveaza(); actualizeaza(); deseneaza(); return; }
    var p = e.target.closest('[data-pas]'); if (p) { pas = p.dataset.pas; deseneaza(); $('drawerBody').scrollTop = 0; return; }
    if (e.target.closest('[data-close]')) { inchide(); if (pas === 'gata') pas = 'cos'; var b = $('buchete'); if (b) b.scrollIntoView(); }
  });
  function deschide() { if (pas === 'gata') pas = 'cos'; $('overlay').classList.add('open'); $('drawer').classList.add('open'); deseneaza(); setTimeout(function () { $('closeCart').focus(); }, 50); }
  function inchide() { $('overlay').classList.remove('open'); $('drawer').classList.remove('open'); $('openCart').focus(); }
  $('openCart').addEventListener('click', deschide);
  $('closeCart').addEventListener('click', function () { inchide(); if (pas === 'gata') pas = 'cos'; });
  $('overlay').addEventListener('click', inchide);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('drawer').classList.contains('open')) inchide(); });

  actualizeaza(); bara(); setInterval(bara, 60000);
})();
