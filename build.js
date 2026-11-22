/*
  build.js — construiește site-ul florăriei din fișierele de conținut.
  Nu folosește niciun pachet extern, deci nu are nimic de actualizat.

  node build.js            → site-ul pentru Netlify (cu panou de editare și comenzi pe email), în "dist"
  node build.js --vanzare  → versiunea HTML simplă, pentru vânzare ca temă, în "vanzare"
                             (se deschide direct din folder, fără server și fără Netlify)
*/
const fs = require('fs');
const path = require('path');

const VANZARE = process.argv.includes('--vanzare');
const OUT = path.join(__dirname, VANZARE ? 'vanzare' : 'dist');
const citeste = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'content', f), 'utf8'));

const S = citeste('setari.json');
const A = citeste('acasa.json');
const T = citeste('texte.json');
const TIPURI = citeste('tipuri.json').lista || [];
const OCAZII = citeste('ocazii.json').lista || [];
const PRODUSE_BRUTE = citeste('produse.json').lista || [];

// ---------- utilitare ----------
const e = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pagina';
const lei = (n) => Number(n || 0).toLocaleString('ro-RO') + ' lei';
const ZILE = ['duminica', 'luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata'];
const POZITII = { sus: '50% 20%', centru: '50% 50%', jos: '50% 80%', stanga: '20% 50%', dreapta: '80% 50%' };
const poz = (p) => POZITII[p] || POZITII.centru;

// Adresa unei poze: pe Netlify trece prin optimizarea automată; în versiunea de vânzare e o cale relativă.
function urlPoza(img, latime, pre) {
  if (!img) return '';
  if (/^https?:\/\//.test(img)) return img;
  if (VANZARE) return pre + img.replace(/^\//, '');
  return `/.netlify/images?url=${encodeURIComponent(img)}&w=${latime}&q=78`;
}
function tagPoza(img, alt, pozitie, pre, sizes) {
  const src = urlPoza(img, 1200, pre);
  const srcset = VANZARE || /^https?:/.test(img) ? '' : ` srcset="${e(urlPoza(img, 500, pre))} 500w, ${e(urlPoza(img, 900, pre))} 900w, ${e(urlPoza(img, 1400, pre))} 1400w" sizes="${sizes}"`;
  return `<img src="${e(src)}"${srcset} alt="${e(alt)}" loading="lazy" style="object-position:${poz(pozitie)}">`;
}
// Loc de poză: poza reală dacă există, altfel o floare desenată în culorile categoriei
function ph({ fundal, floare, lumina = '#ffffffaa', eticheta = '', marime = 48, img = '', pozitie = 'centru', pre = '', alt = '', sizes = '50vw' }) {
  if (img) return `<div class="ph are-poza">${tagPoza(img, alt || eticheta, pozitie, pre, sizes)}</div>`;
  return `<div class="ph" style="--tone:${e(lumina)};--tone-bg:${e(fundal)};--tone-dark:${e(floare)}"><svg viewBox="0 0 100 100" style="width:${marime}%" aria-hidden="true"><use href="#floare"/></svg><span>${e(eticheta)}</span></div>`;
}

// ---------- date pregătite ----------
const tipDupaNume = Object.fromEntries(TIPURI.map((t) => [t.nume, t]));
const folosite = {};
const PRODUSE = PRODUSE_BRUTE.filter((p) => p.nume && (p.marimi || []).length).map((p) => {
  let id = slug(p.nume);
  folosite[id] = (folosite[id] || 0) + 1;
  if (folosite[id] > 1) id += '-' + folosite[id];
  const t = tipDupaNume[p.tip] || {};
  const primaPoza = (p.marimi.find((m) => m.foto) || {});
  return {
    ...p, id,
    ocazii: p.ocazii || [],
    fundal: t.culoare || '#FCEEF2', floare: t.culoare_floare || '#C2457A',
    reducere: Math.max(0, Math.min(90, Number(p.reducere) || 0)),
    marimi: p.marimi.map((m) => {
      const intreg = Number(m.pret) || 0;
      const red = Math.max(0, Math.min(90, Number(p.reducere) || 0));
      return { ...m, pretIntreg: intreg, pret: red ? Math.round(intreg * (100 - red) / 100) : intreg, foto: m.foto || primaPoza.foto || '', foto_pozitie: m.foto ? m.foto_pozitie : primaPoza.foto_pozitie };
    }),
  };
});

// ---------- legături ----------
function link(pre, tinta, acasa) {
  if (!tinta) return '#';
  if (tinta === 'whatsapp') return `https://wa.me/${e(S.whatsapp)}?text=${encodeURIComponent('Bună ziua! Aș dori o ofertă pentru flori la un eveniment.')}`;
  if (/^(https?:|mailto:|tel:)/.test(tinta)) return tinta;
  if (tinta.startsWith('#')) return acasa ? tinta : pre + (VANZARE ? 'index.html' : '') + tinta;
  return pre + tinta.replace(/^\/|\/$/g, '') + '/' + (VANZARE ? 'index.html' : '');
}
const linkAcasa = (pre) => pre + (VANZARE ? 'index.html' : '') || './';

// ---------- componente ----------
function card(p, pre) {
  const etich = (p.reducere ? `<span class="badge pink">−${p.reducere}%</span>` : '') + (p.eticheta && !p.reducere ? `<span class="badge${p.eticheta_roz ? ' pink' : ''}">${e(p.eticheta)}</span>` : '');
  const preturiToate = p.marimi.map((m) => m.pret);
  const interval = p.marimi.length > 1 ? `<p class="range">${lei(Math.min(...preturiToate)).replace(' lei', '')}–${lei(Math.max(...preturiToate))}</p>` : '';
  const vederi = p.marimi.map((m, i) =>
    `<div class="size-view" data-i="${i}"${i ? ' hidden' : ''}>${ph({ fundal: p.fundal, floare: p.floare, eticheta: T.fotografie + ': ' + m.nume.toLowerCase(), marime: [34, 48, 64][Math.min(i, 2)], img: m.foto, pozitie: m.foto_pozitie, pre, alt: p.nume + ', ' + m.nume, sizes: '(max-width:700px) 50vw, 25vw' })}</div>`).join('');
  const butoane = p.marimi.map((m, i) => `<button type="button" data-m="${i}" aria-pressed="${i === 0}">${e(m.nume)}</button>`).join('');
  const preturi = p.marimi.map((m, i) => `<span data-i="${i}"${i ? ' hidden' : ''}>${m.pretIntreg !== m.pret ? `<s>${lei(m.pretIntreg)}</s> ` : ''}${lei(m.pret)}</span>`).join('');
  return `<article class="product" data-id="${p.id}" data-m="0">
  <div class="img">${etich}${vederi}</div>
  <h3>${e(p.nume)}</h3>${interval}<p class="desc">${e(p.descriere)}</p>
  <div class="sizes" role="group" aria-label="${e(T.marime)}">${butoane}</div>
  <div class="buy"><span class="price">${preturi}</span><button type="button" class="add" data-add="${p.id}">${e(T.adauga)}</button></div>
</article>`;
}

const ICONITE = [
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#F5C443"/><path d="M11 22h13v-8h5l4 5v3h-3m-13 0h6" fill="none" stroke="#3A2600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15" cy="25" r="2.4" fill="#3A2600"/><circle cx="28" cy="25" r="2.4" fill="#3A2600"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#F6AE8F"/><rect x="11" y="13" width="18" height="14" rx="2" fill="none" stroke="#4A1A0C" stroke-width="2"/><path d="M11 15l9 6 9-6" fill="none" stroke="#4A1A0C" stroke-width="2"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#B9A3E6"/><rect x="11" y="14" width="18" height="12" rx="2" fill="none" stroke="#24123F" stroke-width="2"/><path d="M11 18h18" stroke="#24123F" stroke-width="2"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#9CD3B5"/><path d="M20 11l2.6 5.6 6 .7-4.5 4 1.3 6L20 24.2 14.6 27.3l1.3-6-4.5-4 6-.7z" fill="#173326"/></svg>',
];

const titluZi = (t) => (String(t).includes('{zi}') ? `<span data-zi-tpl="${e(t)}">${e(String(t).replace('{zi}', T.azi))}</span>` : e(t));

function sectiuneSuna() {
  return `<section class="wrap section" id="suna">
  <div class="quick">
    <div><h2>${e(A.suna_titlu)}</h2><p>${e(A.suna_text)}</p></div>
    <form id="quickForm" novalidate>
      <label>${e(T.suna_nume)}<input name="nume" autocomplete="name" required></label>
      <label>${e(T.suna_telefon)}<input name="telefon" type="tel" inputmode="tel" autocomplete="tel" required></label>
      <label>${e(T.suna_mesaj)} <span class="opt" style="color:inherit;opacity:.8">${e(T.optional)}</span><input name="mesaj" placeholder="${e(T.suna_mesaj_exemplu)}"></label>
      <button class="btn light" type="submit">${e(T.suna_buton)}</button>
      <p class="error" id="quickError" hidden style="color:#fff"></p>
    </form>
  </div>
</section>`;
}
function sectiuneLivrare() {
  return `<section class="wrap section info" id="livrare">
  <div>
    <h2 style="font-size:clamp(2.2rem,4vw,3.2rem)">${e(T.livrare)}</h2>
    <p style="color:var(--muted);max-width:42ch;margin:.6rem 0 0">${e(A.livrare_text)}</p>
    <dl>${(A.livrare_detalii || []).map((d) => `<dt>${e(d.eticheta)}</dt><dd>${e(d.valoare)}</dd>`).join('')}</dl>
  </div>
  <div>
    <h2 style="font-size:clamp(2.2rem,4vw,3.2rem)">${e(T.intrebari_frecvente)}</h2>
    ${(A.intrebari || []).map((q) => `<details><summary>${e(q.intrebare)}</summary><p>${e(q.raspuns)}</p></details>`).join('\n    ')}
  </div>
</section>`;
}

// ---------- șablonul comun ----------
function layout({ titlu, descriere, pre, continut, acasa }) {
  const date = {
    setari: {
      whatsapp: S.whatsapp, oraLimita: Number(S.ora_limita) || 14, taxaLivrare: Number(S.taxa_livrare) || 0,
      livrareGratuitaPeste: Number(S.livrare_gratuita_peste) || 0,
      zileLivrare: (S.zile_livrare || []).map((z) => ZILE.indexOf(slug(z))).filter((z) => z > -1),
      intervale: S.intervale || [], telefon: S.telefon,
      metoda: VANZARE && S.comenzi_metoda === 'netlify' ? 'whatsapp' : (S.comenzi_metoda || 'netlify'),
      endpoint: S.comenzi_endpoint || '',
    },
    texte: T,
    produse: PRODUSE.map((p) => ({ id: p.id, nume: p.nume, fundal: p.fundal, floare: p.floare, marimi: p.marimi.map((m) => ({ nume: m.nume, pret: m.pret, img: m.foto ? urlPoza(m.foto, 200, pre) : '', poz: poz(m.foto_pozitie) })) })),
  };
  const formulareNetlify = VANZARE ? '' : `
<form name="comanda" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="bot-field"><input name="numar"><input name="nume"><input name="telefon"><input name="email"><input name="metoda"><input name="destinatar"><input name="telefon_destinatar"><input name="adresa"><input name="data"><input name="interval"><input name="felicitare"><input name="plata"><input name="observatii"><input name="produse"><input name="total">
</form>
<form name="suna-ma" data-netlify="true" netlify-honeypot="bot-field" hidden><input name="bot-field"><input name="nume"><input name="telefon"><input name="mesaj"></form>`;
  const logare = !VANZARE && acasa ? `
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
<script>if(window.netlifyIdentity){netlifyIdentity.on('init',function(u){if(!u)netlifyIdentity.on('login',function(){location.href='/admin/';});});}</script>` : '';
  return `<!DOCTYPE html>
<html lang="${e(T.limba || 'ro')}"${VANZARE ? '' : ' data-site="live"'}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(titlu)}</title>
<meta name="description" content="${e(descriere)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E💐%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${pre}assets/style.css">
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="floare" viewBox="0 0 100 100"><g fill="currentColor"><ellipse cx="50" cy="28" rx="13" ry="20"/><ellipse cx="50" cy="72" rx="13" ry="20"/><ellipse cx="28" cy="50" rx="20" ry="13"/><ellipse cx="72" cy="50" rx="20" ry="13"/><ellipse cx="34" cy="34" rx="12" ry="18" transform="rotate(-45 34 34)"/><ellipse cx="66" cy="34" rx="12" ry="18" transform="rotate(45 66 34)"/><ellipse cx="34" cy="66" rx="12" ry="18" transform="rotate(45 34 66)"/><ellipse cx="66" cy="66" rx="12" ry="18" transform="rotate(-45 66 66)"/></g><circle cx="50" cy="50" r="9" fill="#FCE7A6"/></symbol></svg>
${A.promotie && A.promotie.activa && A.promotie.text ? `<div class="promobar">${e(A.promotie.text)}</div>` : ''}
<div class="deliverybar" id="deliverybar">${e(A.livrare_text)}</div>
<header>
  <div class="wrap bar">
    <a class="logo" href="${linkAcasa(pre)}">${e(S.nume)}</a>
    <nav aria-label="Meniu principal"><ul>
      <li><a href="${link(pre, 'buchete')}">${e(T.meniu_buchete)}</a></li>
      <li><a href="${link(pre, '#ocazii', acasa)}">${e(T.meniu_ocazii)}</a></li>
      <li><a href="#suna">${e(T.meniu_suna)}</a></li>
      <li><a href="#livrare">${e(T.meniu_livrare)}</a></li>
    </ul></nav>
    <button class="cart-btn" id="openCart" aria-haspopup="dialog">${e(T.cos)} <span class="count" id="cartCount">0</span></button>
  </div>
  <div class="contactbar"><a href="tel:${e(S.telefon_link)}">${e(T.comanda_telefonic)}</a><a href="https://wa.me/${e(S.whatsapp)}" target="_blank" rel="noopener">${e(T.scrie_whatsapp)}</a></div>
</header>
<main>
${continut}
${sectiuneSuna()}
${sectiuneLivrare()}
</main>
<footer>
  <div class="wrap">
    <div class="foot">
      <div><span class="logo">${e(S.nume)}</span><p>${e(S.descriere)} ${e(S.adresa)}</p></div>
      <ul>
        <li><a href="${link(pre, 'buchete')}">${e(T.meniu_buchete)}</a></li>
        <li><a href="${link(pre, '#ocazii', acasa)}">${e(T.meniu_ocazii)}</a></li>
        <li><a href="#livrare">${e(T.meniu_livrare)}</a></li>
      </ul>
      <ul><li><a href="tel:${e(S.telefon_link)}">${e(S.telefon)}</a></li><li><a href="mailto:${e(S.email)}">${e(S.email)}</a></li><li>${e(S.program)}</li></ul>
    </div>
    <div class="legal"><span>© ${new Date().getFullYear()} ${e(S.nume)}</span>${S.demo ? `<span>${e(T.demo_nota)}</span>` : ''}</div>
  </div>
</footer>
<div class="overlay" id="overlay"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
  <div class="drawer-head"><h2 id="drawerTitle">${e(T.cos)}</h2><button class="x" id="closeCart" aria-label="Închide">×</button></div>
  <div class="drawer-body" id="drawerBody"></div>
  <div class="drawer-foot" id="drawerFoot"></div>
</aside>${formulareNetlify}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.VERBENA=${JSON.stringify(date).replace(/</g, '\\u003c')};</script>
<script src="${pre}assets/app.js"></script>${logare}
</body>
</html>
`;
}

// ---------- pagina principală ----------
function paginaAcasa() {
  const pre = '';
  const slideuri = (A.slideuri || []).map((s, i, toate) => {
    const Tag = i === 0 ? 'h1' : 'h2';
    return `<div class="slide" style="--bg:${e(s.fundal)};--fg:${e(s.culoare_text)}" aria-label="${i + 1} din ${toate.length}">
      <div class="txt"><${Tag}>${titluZi(s.titlu)}</${Tag}><p>${e(s.text)}</p>${s.buton ? `<div><a class="btn light" href="${e(link(pre, s.link, true))}"${s.link === 'whatsapp' ? ' target="_blank" rel="noopener"' : ''}>${e(s.buton)}</a></div>` : ''}</div>
      <div class="art">${ph({ fundal: s.fundal, floare: s.culoare_text, lumina: '#ffffff66', eticheta: T.fotografie, marime: 46, img: s.foto, pozitie: s.foto_pozitie, pre, alt: s.titlu.replace('{zi}', T.azi), sizes: '(max-width:760px) 100vw, 50vw' })}</div>
    </div>`;
  }).join('\n      ');
  const avantaje = (A.avantaje || []).slice(0, 4).map((a, i) => `<div>${ICONITE[i % 4]}<p style="margin:0"><strong>${e(a.titlu)}</strong><span>${e(a.text)}</span></p></div>`).join('');
  const tipuri = TIPURI.map((t) => `<a class="type" href="${link(pre, 'flori/' + slug(t.nume))}"><span class="circle">${ph({ fundal: t.culoare, floare: t.culoare_floare, marime: 52, img: t.foto, pozitie: t.foto_pozitie, pre, alt: t.nume, sizes: '120px' })}</span><b>${e(t.nume)}</b></a>`).join('');
  const ocazii = OCAZII.map((o) => `<a class="occ" style="--c:${e(o.culoare)}" href="${link(pre, 'ocazii/' + slug(o.nume))}"><h3>${e(o.nume)}</h3><span>${e(o.text)}</span></a>`).join('');
  const best = PRODUSE.filter((p) => p.cel_mai_iubit);
  const R = A.recomandare || {};
  const rec = R.activa ? PRODUSE.find((p) => p.nume === R.produs) : null;
  const recomandare = rec ? `<section class="wrap section" aria-labelledby="rec-sapt">
  <article class="product feature" data-id="${rec.id}" data-m="0">
    <div class="img">${rec.reducere ? `<span class="badge big">−${rec.reducere}%</span>` : ''}${rec.marimi.map((m, i) => `<div class="size-view" data-i="${i}"${i ? ' hidden' : ''}>${ph({ fundal: rec.fundal, floare: rec.floare, eticheta: T.fotografie + ': ' + m.nume.toLowerCase(), marime: [40, 52, 66][Math.min(i, 2)], img: m.foto, pozitie: m.foto_pozitie, pre, alt: rec.nume, sizes: '(max-width:760px) 100vw, 50vw' })}</div>`).join('')}</div>
    <div class="feature-txt">
      <p class="kicker" id="rec-sapt">${e(R.titlu || '')}</p>
      <h2>${e(rec.nume)}</h2>
      <p class="desc">${e(rec.descriere)}</p>
      <div class="sizes" role="group" aria-label="${e(T.marime)}">${rec.marimi.map((m, i) => `<button type="button" data-m="${i}" aria-pressed="${i === 0}">${e(m.nume)}</button>`).join('')}</div>
      <div class="buy"><span class="price">${rec.marimi.map((m, i) => `<span data-i="${i}"${i ? ' hidden' : ''}>${m.pretIntreg !== m.pret ? `<s>${lei(m.pretIntreg)}</s> ` : ''}${lei(m.pret)}</span>`).join('')}</span><button type="button" class="add" data-add="${rec.id}">${e(R.buton || T.adauga)}</button></div>
    </div>
  </article>
</section>` : '';
  const colectii = (A.colectii || []).map((c, ci) => {
    const lista = PRODUSE.filter((p) => (!c.tip || p.tip === c.tip) && (!c.ocazie || p.ocazii.includes(c.ocazie)));
    if (!lista.length) return '';
    const tinta = c.tip ? 'flori/' + slug(c.tip) : c.ocazie ? 'ocazii/' + slug(c.ocazie) : 'buchete';
    return `<section class="wrap section collection"${ci === 0 ? ' id="buchete"' : ''}>
  <div class="head-center"><h2>${e(c.titlu)}</h2><p>${e(c.text)}</p></div>
  <div class="grid">${lista.slice(0, 4).map((p) => card(p, pre)).join('')}</div>
  <p class="more"><a href="${link(pre, tinta)}">${e(T.vezi_mai_multe)} →</a></p>
</section>`;
  }).join('\n');
  const evenimente = (A.evenimente || []).length ? `<section class="wrap section" aria-labelledby="ev-titlu">
  <div class="head-center"><h2 id="ev-titlu">${e(A.evenimente_titlu)}</h2><p>${e(A.evenimente_text)}</p></div>
  <div class="events">${A.evenimente.map((v) => `<a class="event" href="${e(link(pre, v.link || 'whatsapp', true))}"${(v.link || 'whatsapp') === 'whatsapp' ? ' target="_blank" rel="noopener"' : ''}>
    ${ph({ fundal: v.culoare || '#F3EEF6', floare: '#B0215F', lumina: '#ffffffcc', marime: 50, img: v.foto, pozitie: v.foto_pozitie, pre, alt: v.titlu, sizes: '(max-width:760px) 100vw, 33vw' })}
    <span class="event-box"><b>${e(v.titlu)}</b><span>${e(v.subtitlu)}</span></span>
  </a>`).join('')}</div>
</section>` : '';
  const continut = `
<section class="wrap hero" aria-roledescription="carusel" aria-label="Colecții">
  <div class="slides" id="slides">
      ${slideuri}
  </div>
  ${(A.slideuri || []).length > 1 ? `<div class="hero-ctrl"><button class="arrow" id="prev" aria-label="${e(T.slide_anterior)}">‹</button><div class="dots" id="dots"></div><button class="arrow" id="next" aria-label="${e(T.slide_urmator)}">›</button></div>` : ''}
  <div class="trust">${avantaje}</div>
</section>

${recomandare}

<section class="wrap section" aria-labelledby="tipuri-titlu">
  <div class="head"><h2 id="tipuri-titlu">${e(T.alege_dupa_flori)}</h2></div>
  <div class="types" id="types">${tipuri}</div>
</section>

${colectii}

${best.length ? `<section class="wrap" aria-labelledby="best-titlu">
  <div class="head">
    <div><h2 id="best-titlu">${e(T.cele_mai_iubite)}</h2><p>${e(T.cele_mai_iubite_text)}</p></div>
    <div class="rail-arrows"><button class="arrow" data-rail="best" data-dir="-1" aria-label="${e(T.inapoi)}">‹</button><button class="arrow" data-rail="best" data-dir="1" aria-label="${e(T.inainte)}">›</button></div>
  </div>
  <div class="rail" id="best">${best.map((p) => card(p, pre)).join('')}</div>
</section>` : ''}

<section class="wrap section" id="ocazii" aria-labelledby="ocazii-titlu">
  <div class="head"><h2 id="ocazii-titlu">${e(T.pentru_fiecare_ocazie)}</h2></div>
  <div class="occasions">${ocazii}</div>
</section>

${evenimente}

${(A.recenzii || []).length ? `<section class="wrap section" aria-labelledby="rec-titlu" style="padding-bottom:0">
  <div class="head">
    <div><h2 id="rec-titlu">${e(T.ce_spun_clientii)}</h2><div class="score"><b>${e(A.recenzii_nota)}</b><span style="color:var(--muted)">${e(A.recenzii_numar)}</span></div></div>
    <div class="rail-arrows"><button class="arrow" data-rail="reviews" data-dir="-1" aria-label="${e(T.inapoi)}">‹</button><button class="arrow" data-rail="reviews" data-dir="1" aria-label="${e(T.inainte)}">›</button></div>
  </div>
  <div class="reviews" id="reviews">${A.recenzii.map((r) => `<div class="review"><div class="stars" aria-label="5 din 5">★★★★★</div><p>${e(r.text)}</p><cite>${e(r.autor)}</cite></div>`).join('')}</div>
</section>` : ''}`;
  return layout({ titlu: `${S.nume}, florărie cu livrare în oraș`, descriere: S.descriere, pre, continut, acasa: true });
}

// ---------- paginile de categorie ----------
function paginaCategorie({ fel, nume, text, culoare, lista, alte, adancime = 2 }) {
  const pre = '../'.repeat(adancime);
  const grup = fel === 'flori' ? T.flori : fel === 'ocazii' ? T.ocazii : '';
  const continut = `
<section class="wrap"><div class="cat-hero" style="--c:${e(culoare)}"><div class="in">
  <nav class="crumbs" aria-label="Unde ești"><a href="${linkAcasa(pre)}">${e(T.acasa)}</a>${grup ? ' / ' + e(grup) : ''}</nav>
  <h1>${e(nume)}</h1><p>${e(text)}</p>
</div></div></section>
<section class="wrap section">
  <div class="head"><h2>${lista.length === 1 ? e(T.un_buchet) : lista.length + ' ' + e(T.buchete)}</h2></div>
  ${lista.length ? `<div class="grid">${lista.map((p) => card(p, pre)).join('')}</div>` : `<p class="empty-filter">${e(T.nimic_aici)}</p>`}
</section>
${alte.length ? `<section class="wrap" style="padding-bottom:1rem">
  <div class="head"><h2 style="font-size:clamp(1.8rem,3vw,2.4rem)">${e(fel === 'flori' ? T.alte_flori : T.alte_ocazii)}</h2></div>
  <div class="cat-links">${alte.map((a) => `<a href="${link(pre, fel + '/' + slug(a.nume))}">${e(a.nume)}</a>`).join('')}</div>
</section>` : ''}`;
  return layout({ titlu: `${nume} | ${S.nume}`, descriere: `${text} ${S.nume}, livrare în oraș.`, pre, continut, acasa: false });
}

// ---------- scrierea fișierelor ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'src', 'style.css'), path.join(OUT, 'assets', 'style.css'));
fs.copyFileSync(path.join(__dirname, 'src', 'app.js'), path.join(OUT, 'assets', 'app.js'));
if (fs.existsSync(path.join(__dirname, 'images'))) fs.cpSync(path.join(__dirname, 'images'), path.join(OUT, 'images'), { recursive: true });
if (!VANZARE) fs.cpSync(path.join(__dirname, 'admin'), path.join(OUT, 'admin'), { recursive: true });

const scrie = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); console.log('✓ /' + rel.replace(/index\.html$/, '')); };
scrie('index.html', paginaAcasa());
scrie('buchete/index.html', paginaCategorie({ fel: 'buchete', nume: T.toate_buchetele, text: T.toate_text, culoare: '#FCEEF2', lista: PRODUSE, alte: [], adancime: 1 }));
TIPURI.forEach((t) => scrie(`flori/${slug(t.nume)}/index.html`, paginaCategorie({ fel: 'flori', nume: t.nume, text: t.text, culoare: t.culoare, lista: PRODUSE.filter((p) => p.tip === t.nume), alte: TIPURI.filter((x) => x !== t) })));
OCAZII.forEach((o) => scrie(`ocazii/${slug(o.nume)}/index.html`, paginaCategorie({ fel: 'ocazii', nume: o.nume, text: o.text + '.', culoare: o.culoare, lista: PRODUSE.filter((p) => p.ocazii.includes(o.nume)), alte: OCAZII.filter((x) => x !== o) })));
console.log(`Gata: ${2 + TIPURI.length + OCAZII.length} pagini în folderul ${path.basename(OUT)}.`);
