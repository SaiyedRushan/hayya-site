/*
 * The home page's moving parts. No framework and no build step: one module,
 * loaded after the page, that adds each piece where its markup exists.
 *
 * Prayer times use adhan-js 4.4.4, the version the app calculates with, and the
 * same per-country defaults (methodByCountry and madhabByCountry in the app),
 * so the phone on this page shows what Hayya would show.
 */
import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla, SunnahTimes } from './assets/vendor/adhan.esm.min.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const live = (key) => $$(`[data-live="${key}"]`);
const setLive = (key, text) => live(key).forEach((el) => { if (el.textContent !== text) el.textContent = text; });

/* ---------- Nav colour over the hero, and scroll reveals ---------- */

const nav = $('#nav');
const hero = $('.hero');
if (nav && hero) {
  new IntersectionObserver(([e]) => nav.classList.toggle('on-dark', e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe(hero);
}

const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-visible');
    revealer.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal').forEach((el) => revealer.observe(el));

/* ---------- Sound: one player for every ringtone on the page ---------- */

const audio = (() => {
  let el = null;
  let current = null;
  let onStop = null;
  function stop() {
    if (el) { el.pause(); el.currentTime = 0; }
    const done = onStop;
    current = null; onStop = null;
    done?.();
  }
  function play(id, { loop = false, stopped } = {}) {
    stop();
    el = el || new Audio();
    el.src = `audio/ringtone-${id}.mp3`;
    el.loop = loop;
    el.volume = 0.7;
    current = id; onStop = stopped;
    el.onended = () => { if (!el.loop) stop(); };
    el.play().catch(() => {});
  }
  return { play, stop, get current() { return current; } };
})();

/* ---------- Hero video ---------- */

const video = $('#promo');
if (video) {
  const soundBtn = $('#promo-sound');
  const playBtn = $('#promo-play');
  const setPlayBtn = () => {
    const paused = video.paused;
    playBtn.setAttribute('aria-pressed', String(paused));
    playBtn.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    playBtn.querySelector('span').textContent = paused ? 'Play' : 'Pause';
  };
  // Reduced motion: the poster stays until the visitor presses Play.
  if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
  video.addEventListener('play', setPlayBtn);
  video.addEventListener('pause', setPlayBtn);
  setPlayBtn();
  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) { audio.stop(); video.play().catch(() => {}); }
    soundBtn.setAttribute('aria-pressed', String(!video.muted));
    soundBtn.querySelector('use').setAttribute('href', video.muted ? '#i-sound-off' : '#i-sound-on');
    soundBtn.querySelector('span').textContent = video.muted ? 'Turn sound on' : 'Turn sound off';
  });
  playBtn.addEventListener('click', () => (video.paused ? video.play() : video.pause()));

  // A slight tilt that follows the pointer, on screens with one.
  const card = $('.video-card');
  if (!reduceMotion && matchMedia('(hover: hover) and (min-width: 1021px)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${(-6 + x * 10).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(3 - y * 8).toFixed(2)}deg`);
    });
  }
}

/* ---------- Prayer times ---------- */

const METHODS = [
  ['Egyptian', 'Egyptian General Authority'],
  ['MuslimWorldLeague', 'Muslim World League'],
  ['UmmAlQura', 'Umm al-Qura (Makkah)'],
  ['Karachi', 'University of Karachi'],
  ['NorthAmerica', 'ISNA (North America)'],
  ['Dubai', 'Dubai'],
  ['Kuwait', 'Kuwait'],
  ['Qatar', 'Qatar'],
  ['Singapore', 'Singapore'],
  ['Turkey', 'Turkey (Diyanet)'],
  ['Tehran', 'Tehran'],
  ['MoonsightingCommittee', 'Moonsighting Committee'],
];
const METHOD_BY_COUNTRY = {
  SA: 'UmmAlQura', YE: 'UmmAlQura', BH: 'UmmAlQura', OM: 'UmmAlQura', AE: 'Dubai', KW: 'Kuwait', QA: 'Qatar',
  EG: 'Egyptian', SD: 'Egyptian', LY: 'Egyptian', MA: 'Egyptian', SY: 'Egyptian', LB: 'Egyptian', JO: 'Egyptian', PS: 'Egyptian', IL: 'Egyptian',
  PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', LK: 'Karachi', NP: 'Karachi', MV: 'Karachi',
  SG: 'Singapore', MY: 'Singapore', ID: 'Singapore', BN: 'Singapore',
  TR: 'Turkey', IR: 'Tehran', AZ: 'Tehran',
  US: 'NorthAmerica', CA: 'NorthAmerica', MX: 'NorthAmerica', PR: 'NorthAmerica',
};
const HANAFI_COUNTRIES = new Set(['PK', 'IN', 'BD', 'AF', 'NP', 'TR', 'UZ', 'KZ', 'TJ', 'TM', 'KG', 'AL', 'XK', 'BA', 'MK', 'ME', 'RS', 'BG']);
const HIJRI_MONTHS = ['Muḥarram', 'Ṣafar', 'Rabīʿ al-Awwal', 'Rabīʿ al-Thānī', 'Jumādā al-Ūlā', 'Jumādā al-Thāniya', 'Rajab', 'Shaʿbān', 'Ramaḍān', 'Shawwāl', 'Dhū al-Qaʿda', 'Dhū al-Ḥijja'];
const ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const ARABIC = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء', Jumuah: 'الجمعة', LastThird: 'الثلث الأخير' };
const MAKKAH = { lat: 21.4225, lng: 39.8262, cc: 'SA', tz: 'Asia/Riyadh', city: 'Makkah' };

const visitorTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const hour12 = (() => {
  try {
    const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    return hc ? hc === 'h12' || hc === 'h11' : true;
  } catch { return true; }
})();
const regionName = (() => {
  try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); return (cc) => (cc ? dn.of(cc) : ''); } catch { return (cc) => cc || ''; }
})();

const place = {
  lat: MAKKAH.lat, lng: MAKKAH.lng, cc: MAKKAH.cc, tz: MAKKAH.tz,
  city: MAKKAH.city, country: regionName(MAKKAH.cc), source: 'fallback',
  method: 'UmmAlQura', madhab: 'shafi', methodTouched: false, madhabTouched: false,
};
const marks = {}; // 'YYYY-MM-DD:Asr' -> 1 prayed, 2 prayed late
let zones = {}; // time zone -> [lat, lng, country], from data/zones.json
let day = null; // today's computed times for the current place

const fmt = (() => {
  const cache = new Map();
  return (opts) => {
    const key = JSON.stringify(opts) + place.tz;
    if (!cache.has(key)) cache.set(key, new Intl.DateTimeFormat('en-US', { ...opts, timeZone: place.tz }));
    return cache.get(key);
  };
})();
const clock = (d) => fmt({ hour: 'numeric', minute: '2-digit', hour12 }).format(d);

/** The place's own calendar date, as numbers, for a moment. */
function localParts(d) {
  const parts = Object.fromEntries(fmt({ year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(d).map((p) => [p.type, p.value]));
  return { y: +parts.year, m: +parts.month, d: +parts.day, weekday: parts.weekday };
}

function params() {
  const p = (CalculationMethod[place.method] || CalculationMethod.MuslimWorldLeague)();
  p.madhab = place.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

function timesOn(offsetDays, now = new Date()) {
  const { y, m, d } = localParts(new Date(now.getTime() + offsetDays * 864e5));
  const pt = new PrayerTimes(new Coordinates(place.lat, place.lng), new Date(y, m - 1, d), params());
  return { pt, key: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

function computeDay(now = new Date()) {
  const today = timesOn(0, now);
  const yesterday = timesOn(-1, now);
  const tomorrow = timesOn(1, now);
  const friday = localParts(now).weekday === 'Fri';
  return { today, yesterday, tomorrow, friday, sunnah: new SunnahTimes(today.pt) };
}

function nextPrayer(now) {
  const t = day.today.pt;
  for (let i = 0; i < ORDER.length; i++) {
    const name = ORDER[i];
    const at = t[name.toLowerCase()];
    if (at > now) {
      const start = i === 0 ? day.yesterday.pt.isha : t[ORDER[i - 1].toLowerCase()];
      return { name, at, start };
    }
  }
  return { name: 'Fajr', at: day.tomorrow.pt.fajr, start: t.isha, tomorrow: true };
}

const label = (name) => (name === 'Dhuhr' && day?.friday ? 'Jumuʿah' : name);
const arabicFor = (name) => (name === 'Dhuhr' && day?.friday ? ARABIC.Jumuah : ARABIC[name]);

function countdown(secs) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

function hijri(d) {
  for (const cal of ['islamic-umalqura', 'islamic-civil']) {
    try {
      const f = new Intl.DateTimeFormat(`en-u-ca-${cal}-nu-latn`, { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: place.tz });
      const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
      const month = HIJRI_MONTHS[+p.month - 1];
      if (month && p.day && p.year) return `${+p.day} ${month} ${parseInt(p.year, 10)}`;
    } catch { /* try the next calendar */ }
  }
  return '';
}

/* The home screen's list of prayers */

const list = $('#prayer-list');

function renderList(now = new Date()) {
  if (!list || !day) return;
  const t = day.today.pt;
  const next = nextPrayer(now);
  const rows = [
    { name: 'Fajr', at: t.fajr },
    { name: 'Sunrise', at: t.sunrise, minor: true },
    { name: 'Dhuhr', at: t.dhuhr },
    { name: 'Asr', at: t.asr },
    { name: 'Maghrib', at: t.maghrib },
    { name: 'Isha', at: t.isha },
    { name: 'LastThird', at: day.sunnah.lastThirdOfTheNight, minor: true },
  ];
  list.innerHTML = '';
  for (const row of rows) {
    const li = document.createElement('li');
    const shown = row.name === 'LastThird' ? 'Last third' : label(row.name);
    const el = document.createElement(row.minor ? 'div' : 'button');
    el.className = 'prow';
    if (row.minor) el.classList.add('minor');
    else {
      el.type = 'button';
      el.dataset.prayer = row.name;
      const state = marks[`${day.today.key}:${row.name}`] || 0;
      if (state === 1) el.classList.add('done');
      if (state === 2) el.classList.add('late');
      if (row.at < now) el.classList.add('past');
      if (!next.tomorrow && next.name === row.name) el.classList.add('current');
      el.setAttribute('aria-label', `${shown} at ${clock(row.at)}. ${['Not marked', 'Marked as prayed', 'Marked as prayed late'][state]}. Tap to change.`);
    }
    el.innerHTML = `
      <span class="mark">${row.minor ? '' : '<svg aria-hidden="true"><use href="#i-check"/></svg>'}</span>
      <span class="pname">${shown} <span class="ar" lang="ar">${arabicFor(row.name)}</span></span>
      ${!row.minor && marks[`${day.today.key}:${row.name}`] === 2 ? '<span class="ptag">late</span>' : ''}
      <span class="ptime">${clock(row.at)}</span>`;
    li.append(el);
    list.append(li);
  }
}

list?.addEventListener('click', (e) => {
  const row = e.target.closest('button.prow');
  if (!row || !day) return;
  const key = `${day.today.key}:${row.dataset.prayer}`;
  marks[key] = ((marks[key] || 0) + 1) % 3;
  renderList();
  const fresh = list.querySelector(`[data-prayer="${row.dataset.prayer}"]`);
  if (marks[key]) fresh?.classList.add('pop');
  fresh?.focus();
});

/* Everything that changes once a second */

function tick() {
  if (!day) return;
  const now = new Date();
  const { y, m, d } = localParts(now);
  if (day.today.key !== `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`) {
    refresh();
    return;
  }
  const next = nextPrayer(now);
  const secs = (next.at - now) / 1000;
  const span = next.at - next.start;
  const pct = span > 0 ? Math.min(100, Math.max(4, ((now - next.start) / span) * 100)) : 100;
  // A phone's status bar shows the time without AM or PM.
  setLive('clock', clock(now).replace(/\s?[AP]M$/, ''));
  setLive('next-name', label(next.name));
  setLive('next-ar', arabicFor(next.name));
  setLive('next-time', clock(next.at));
  setLive('next-in', `in ${countdown(secs)}`);
  setLive('ring-prayer', label(next.name));
  setLive('next-line', `${label(next.name)} at ${clock(next.at)} · in ${countdown(secs)}`);
  live('next-bar').forEach((el) => { el.style.width = `${pct.toFixed(1)}%`; });
  // A prayer just came in: move the gold border along and dim the passed row.
  if (secs <= 0 || list?.querySelector('.current')?.dataset.prayer !== (next.tomorrow ? undefined : next.name)) renderList(now);
}

function refresh() {
  day = computeDay();
  const now = new Date();
  setLive('place-short', place.city);
  setLive('place', place.country && place.country !== place.city ? `${place.city}, ${place.country}` : place.city);
  setLive('hijri', hijri(now));
  setLive('date', `${fmt({ weekday: 'long' }).format(now)}\n${fmt({ month: 'long', day: 'numeric' }).format(now)}`);
  const sources = {
    zone: 'Worked out from your time zone, so it may be a few minutes off. For exact times, use your location.',
    gps: 'From your exact location. It stays on this page: the city name is looked up here, not sent anywhere.',
    search: 'From your city search.',
    fallback: 'Your time zone wasn\'t recognised, so these are Makkah\'s times. Use your location or search for your city.',
  };
  setLive('place-source', sources[place.source]);
  const methodName = METHODS.find(([id]) => id === place.method)?.[1] ?? place.method;
  setLive('method-note', place.methodTouched
    ? `Using ${methodName}.`
    : `${methodName} is the usual method in ${regionName(place.cc) || 'this country'}. Change it if your masjid uses another.`);

  const qibla = Qibla(new Coordinates(place.lat, place.lng));
  const grid = $('#today-grid');
  if (grid) {
    grid.innerHTML = `
      <div><dt>Hijri date</dt><dd>${hijri(now) || 'Not shown in this browser'}</dd></div>
      <div><dt>Sunrise</dt><dd>${clock(day.today.pt.sunrise)}</dd></div>
      <div><dt>Last third of the night</dt><dd>${clock(day.sunnah.lastThirdOfTheNight)}</dd></div>
      <div><dt>Qibla</dt><dd><span class="qibla-dial" aria-hidden="true"><i style="transform:rotate(${qibla.toFixed(1)}deg)"></i></span>${Math.round(qibla)}° from north</dd></div>`;
  }
  renderList(now);
  tick();
  $('.chip-next')?.removeAttribute('hidden');
  const chipK = $('.chip-next .chip-k');
  if (chipK) chipK.textContent = place.source === 'gps' || place.source === 'zone' ? 'Next prayer near you' : `Next prayer in ${place.city}`;
}

function applyCountryDefaults() {
  if (!place.methodTouched) place.method = METHOD_BY_COUNTRY[place.cc] || 'MuslimWorldLeague';
  if (!place.madhabTouched) place.madhab = HANAFI_COUNTRIES.has(place.cc) ? 'hanafi' : 'shafi';
  const m = $('#method'); if (m) m.value = place.method;
  const a = $('#madhab'); if (a) a.value = place.madhab;
}

async function startLiveTimes() {
  const methodSel = $('#method');
  if (methodSel) {
    methodSel.innerHTML = METHODS.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
    methodSel.addEventListener('change', () => { place.method = methodSel.value; place.methodTouched = true; refresh(); });
    $('#madhab').addEventListener('change', (e) => { place.madhab = e.target.value; place.madhabTouched = true; refresh(); });
  }
  try {
    zones = await (await fetch('data/zones.json')).json();
    const z = zones[visitorTz];
    if (z) {
      const parts = visitorTz.split('/');
      Object.assign(place, {
        lat: z[0], lng: z[1], cc: z[2], tz: visitorTz, source: 'zone',
        city: parts[parts.length - 1].replace(/_/g, ' '), country: regionName(z[2]),
      });
    }
  } catch { /* keep Makkah */ }
  applyCountryDefaults();
  refresh();
  setInterval(tick, 1000);
}

/* Exact location and city search */

// The visitor's city, found on this page: the nearest of GeoNames' towns of
// 15,000 people or more (data/cities.json). Fetched only when this button is
// pressed, so a location never has to be sent anywhere to be named.
let cities = null;
async function nearestCity(lat, lng) {
  cities ||= await (await fetch('data/cities.json')).json();
  const k = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let bestD = Infinity;
  for (const c of cities) {
    const dLat = c[1] - lat;
    const dLng = (((c[2] - lng + 540) % 360) - 180) * k;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best && { name: best[0], cc: best[3], km: Math.sqrt(bestD) * 111.2 };
}

$('#locate')?.addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const text = btn.querySelector('span');
  if (!navigator.geolocation) { setLive('place-source', 'This browser can\'t share a location. Search for your city instead.'); return; }
  btn.setAttribute('aria-busy', 'true');
  text.textContent = 'Finding your location…';
  const done = () => { btn.removeAttribute('aria-busy'); text.textContent = 'Use my exact location'; };
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    let near = null;
    try { near = await nearestCity(lat, lng); } catch { /* times still work without a name */ }
    done();
    Object.assign(place, {
      lat, lng, tz: visitorTz, source: 'gps',
      // Within 25 km it's your city; further out, the nearest town is a landmark, not an address.
      city: near ? (near.km > 25 ? `Near ${near.name}` : near.name) : 'Your location',
      country: near ? regionName(near.cc) : '',
      cc: near?.cc || zones[visitorTz]?.[2] || place.cc,
    });
    applyCountryDefaults();
    refresh();
  }, () => {
    done();
    setLive('place-source', 'Your browser didn\'t share your location. You can allow it in the address bar, or search for your city below.');
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
});

const cityForm = $('#city-form');
const results = $('#city-results');
cityForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#city-q').value.trim();
  if (q.length < 2) { results.innerHTML = '<li class="msg">Type at least two letters of the city\'s name.</li>'; return; }
  results.innerHTML = '<li class="msg">Searching…</li>';
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const found = data.results || [];
    if (!found.length) {
      results.innerHTML = `<li class="msg">No city called “${q.replace(/[<>&"]/g, '')}” was found. Check the spelling, or try a larger city nearby.</li>`;
      return;
    }
    results.innerHTML = '';
    for (const r of found) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const where = [r.admin1, r.country].filter(Boolean).join(', ');
      b.innerHTML = `<span></span><small></small>`;
      b.firstChild.textContent = r.name;
      b.lastChild.textContent = where;
      b.addEventListener('click', () => {
        Object.assign(place, {
          lat: r.latitude, lng: r.longitude, cc: (r.country_code || '').toUpperCase(), tz: r.timezone || visitorTz,
          source: 'search', city: r.name, country: r.country || regionName(r.country_code),
        });
        applyCountryDefaults();
        results.innerHTML = '';
        $('#city-q').value = '';
        refresh();
      });
      li.append(b);
      results.append(li);
    }
  } catch {
    results.innerHTML = '<li class="msg">The city search couldn\'t be reached. Check your connection and try again, or use your exact location.</li>';
  }
});

/* ---------- The phone's call screen ---------- */

const screens = { home: $('#screen-home'), call: $('#screen-call'), after: $('#screen-after') };
const ringBtn = $('#ring');
let hangUpTimer = null;
let callFor = null;

function show(name) {
  for (const [k, el] of Object.entries(screens)) el?.classList.toggle('is-on', k === name);
}

function setRingBtn(ringing) {
  if (!ringBtn) return;
  ringBtn.classList.toggle('is-ringing', ringing);
  ringBtn.querySelector('span').innerHTML = ringing
    ? 'Stop the preview call'
    : 'Preview the call for <span data-live="ring-prayer"></span>';
  if (!ringing && day) setLive('ring-prayer', label(nextPrayer(new Date()).name));
}

function endCall() {
  clearTimeout(hangUpTimer);
  if (audio.current === 'phone') audio.stop();
  setRingBtn(false);
}

function after(html) {
  endCall();
  $('.after-inner', screens.after).innerHTML = html;
  show('after');
  $('.after-inner button', screens.after)?.focus({ preventScroll: true });
}

const backBtn = '<button type="button" class="after-btn ghost" data-after="home">Back to the home screen</button>';

function startCall() {
  if (!day) return;
  const next = nextPrayer(new Date());
  callFor = next;
  setLive('call-prayer', label(next.name));
  setLive('call-time', clock(next.at));
  show('call');
  setRingBtn(true);
  video && !video.muted && $('#promo-sound').click();
  audio.play('phone', { loop: true, stopped: () => setRingBtn(false) });
  // Like the real thing, an unanswered call hangs up after a while.
  hangUpTimer = setTimeout(() => after(`
    <div class="after-badge warn"><svg aria-hidden="true"><use href="#i-call"/></svg></div>
    <h3>Missed call: ${label(callFor.name)}</h3>
    <p>In the app it hangs up like this, then calls again a few minutes later, until you answer or the time for ${label(callFor.name)} ends.</p>
    ${backBtn}`), 30000);
}

ringBtn?.addEventListener('click', () => {
  if (ringBtn.classList.contains('is-ringing')) { endCall(); show('home'); return; }
  startCall();
});

screens.call?.addEventListener('click', (e) => {
  const action = e.target.closest('[data-call]')?.dataset.call;
  if (!action) return;
  const name = label(callFor.name);
  if (action === 'answer') {
    after(`
      <div class="after-badge"><svg aria-hidden="true"><use href="#i-check"/></svg></div>
      <h3>You answered ${name}</h3>
      <p>In the app, this logs ${name} as prayed and adds to your streak. Then you can play the full adhan while you make wudu.</p>
      ${backBtn}`);
  } else if (action === 'snooze') {
    after(`
      <div class="after-badge gold"><svg aria-hidden="true"><use href="#i-call"/></svg></div>
      <h3>Hayya will call again in 10 minutes</h3>
      <p>You can snooze once for each prayer. The next time ${name} calls, the button is gone.</p>
      ${backBtn}`);
  } else if (action === 'decline') {
    after(`
      <div class="after-badge warn"><svg aria-hidden="true"><use href="#i-call"/></svg></div>
      <h3>Why are you declining ${name}?</h3>
      <p>Pick a reason. Hayya keeps it, and you can read it later.</p>
      <div class="after-chips">
        <button type="button" data-reason="In a meeting">In a meeting</button>
        <button type="button" data-reason="Driving">Driving</button>
        <button type="button" data-reason="At the gym or outside">At the gym or outside</button>
      </div>
      <button type="button" class="after-btn primary" data-after="later">Call me back in 20 minutes</button>
      ${backBtn}`);
  }
});

screens.after?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !callFor) return;
  const name = label(callFor.name);
  if (btn.dataset.after === 'home') { show('home'); ringBtn?.focus({ preventScroll: true }); return; }
  if (btn.dataset.after === 'later') {
    after(`
      <div class="after-badge gold"><svg aria-hidden="true"><use href="#i-call"/></svg></div>
      <h3>Hayya will call again at ${clock(new Date(Date.now() + 20 * 60000))}</h3>
      <p>That's 20 minutes from now. In the app you can pick 20, 30, 40 or 60 minutes, as long as it's still inside ${name}'s time.</p>
      ${backBtn}`);
    return;
  }
  if (btn.dataset.reason) {
    after(`
      <div class="after-badge warn"><svg aria-hidden="true"><use href="#i-check"/></svg></div>
      <h3>Saved: “${btn.dataset.reason}”</h3>
      <p>In the app, ${name} is logged as declined with this reason, your streak starts again, and you can read the reason later in your history.</p>
      ${backBtn}`);
  }
});

/* ---------- How it works: the phone follows the step you're reading ---------- */

const storyImgs = $$('.story-frame img');
if (storyImgs.length) {
  const steps = $$('.story-step');
  const stepObs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = +e.target.dataset.step;
      steps.forEach((s) => s.classList.toggle('is-on', s === e.target));
      storyImgs.forEach((img, j) => img.classList.toggle('is-on', j === i));
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => stepObs.observe(s));
}

/* ---------- What's new: the line fills as you read, the cards light under the pointer ---------- */

const timeline = $('#timeline');
if (timeline) {
  let raf = 0;
  const fill = () => {
    raf = 0;
    const r = timeline.getBoundingClientRect();
    const seen = (innerHeight * 0.6 - r.top) / r.height;
    timeline.style.setProperty('--tl', Math.min(1, Math.max(0, seen)).toFixed(3));
  };
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(fill); }, { passive: true });
  fill();
  timeline.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.tl-body');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/* ---------- Watch screen tabs ---------- */

function swapImage(img, src, alt) {
  const next = new Image();
  next.src = src;
  (next.decode ? next.decode() : Promise.resolve()).catch(() => {}).then(() => {
    img.src = src;
    img.alt = alt;
    img.classList.remove('swap-in');
    void img.offsetWidth;
    img.classList.add('swap-in');
  });
}

for (const group of $$('[data-tabs]')) {
  const img = group.dataset.tabs === 'aw' ? $('#aw-img') : $('#wear-img');
  const tabs = $$('button', group);
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      swapImage(img, tab.dataset.src, tab.dataset.alt);
    });
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const to = tabs[(i + step + tabs.length) % tabs.length];
      to.focus();
      to.click();
    });
  });
}

/* ---------- Wear OS face picker ---------- */

const FACE_STYLES = [['digital', 'Digital'], ['analog', 'Analog'], ['arabic', 'Arabic numerals'], ['classic', 'Classic'], ['star', 'Eight-pointed star']];
const FACE_COLOURS = [
  ['green', 'Hayya green', '#123A2C'], ['emerald', 'Emerald', '#2F8A57'], ['amoled', 'AMOLED black', '#000000'],
  ['charcoal', 'Charcoal', '#2A2C2E'], ['navy', 'Navy', '#24446F'], ['slate', 'Slate', '#4C5C6B'],
  ['teal', 'Teal', '#1F7275'], ['burgundy', 'Burgundy', '#6E2236'], ['plum', 'Plum', '#5C2B67'],
  ['mocha', 'Mocha', '#6D4B33'], ['cream', 'Cream', '#F6F1E6'], ['silver', 'Silver', '#F0F0F0'],
];
const face = { style: 'digital', colour: 'green', aod: false };
const faceImg = $('#face-img');
if (faceImg) {
  const stylesEl = $('#face-styles');
  const coloursEl = $('#face-colours');
  stylesEl.innerHTML = FACE_STYLES.map(([id, name]) => `<button type="button" data-style="${id}" aria-pressed="${id === face.style}">${name}</button>`).join('');
  coloursEl.innerHTML = FACE_COLOURS.map(([id, name, hex]) => `<button type="button" data-colour="${id}" aria-pressed="${id === face.colour}" aria-label="${name}" title="${name}" style="background:${hex}"></button>`).join('');
  const updateFace = () => {
    const styleName = FACE_STYLES.find(([id]) => id === face.style)[1];
    const colourName = FACE_COLOURS.find(([id]) => id === face.colour)[1];
    $$('button', stylesEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === face.style)));
    $$('button', coloursEl).forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.colour === face.colour)); b.disabled = face.aod; });
    $('#face-colour-name').textContent = face.aod ? 'not used on the always-on screen' : colourName;
    const file = face.aod ? `${face.style}-always-on` : `${face.style}-${face.colour}`;
    const alt = face.aod
      ? `The Hayya watch face, ${styleName} style, on the dimmed always-on screen`
      : `The Hayya watch face, ${styleName} style in ${colourName}`;
    swapImage(faceImg, `watch/faces/${file}.webp`, alt);
  };
  stylesEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { face.style = b.dataset.style; updateFace(); } });
  coloursEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) { face.colour = b.dataset.colour; updateFace(); } });
  $('#face-aod').addEventListener('change', (e) => { face.aod = e.target.checked; updateFace(); });
}

/* ---------- Ringtones ---------- */

const tones = $('#tones');
if (tones) {
  const reset = (btn) => {
    btn.setAttribute('aria-pressed', 'false');
    btn.closest('li').classList.remove('is-playing');
    btn.innerHTML = '<svg aria-hidden="true"><use href="#i-play"/></svg><span>Play</span>';
  };
  tones.addEventListener('click', (e) => {
    const btn = e.target.closest('.tone-btn');
    if (!btn) return;
    const playing = btn.getAttribute('aria-pressed') === 'true';
    if (playing) { audio.stop(); return; }
    if (screens.call?.classList.contains('is-on')) { endCall(); show('home'); }
    if (video && !video.muted) $('#promo-sound').click();
    audio.play(btn.dataset.tone, { stopped: () => reset(btn) });
    btn.setAttribute('aria-pressed', 'true');
    btn.closest('li').classList.add('is-playing');
    btn.innerHTML = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span>Stop</span>';
  });
}

/* ---------- Every dua ---------- */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'morning', label: 'Morning', places: ['morning'] },
  { id: 'evening', label: 'Evening', places: ['evening'] },
  { id: 'night', label: 'Before sleep', places: ['night'] },
  { id: 'after', label: 'After prayer', places: ['afterPrayer', 'afterFajrMaghrib', 'afterFajr'] },
  { id: 'journey', label: 'Setting off', places: ['journey'] },
  { id: 'alarm', label: 'To stop the alarm', places: ['alarm'] },
  { id: 'adhan', label: 'After the adhan', places: ['adhan'] },
];

// The app's search rules (lib/duaLibrary foldForSearch): case, Latin accents,
// Arabic vowel marks and letter variants all ignored.
const ARABIC_FOLD = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ة': 'ه' };
function fold(text) {
  let out = String(text).toLowerCase();
  try { out = out.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch { /* no Unicode data */ }
  out = out.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '').replace(/[ʿʾʼ’‘'`ʻ]/g, '');
  out = out.replace(/[ء-ي]/g, (c) => ARABIC_FOLD[c] ?? c);
  return out.replace(/[^\p{L}\p{N}\s]+/gu, '').replace(/\s+/g, ' ').trim();
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function startDuas() {
  const host = $('#duas-list');
  if (!host) return;
  let duas;
  try {
    const data = await (await fetch('data/duas.json')).json();
    duas = data.duas;
    startChecklist(duas, data.lists.night);
  } catch {
    host.innerHTML = '<p class="duas-empty">The duʿās couldn\'t be loaded. Reload the page to try again.</p>';
    return;
  }
  for (const d of duas) {
    d.placeIds = d.places.map((p) => p.id);
    d.hay = fold([d.title, d.transliteration, d.english, d.arabic, d.source, d.remark, ...d.keywords, ...d.places.map((p) => p.label)].join(' '));
  }
  $$('[data-dua-total]').forEach((el) => { el.textContent = String(duas.length); });

  let filter = 'all';
  let query = '';
  const chips = $('#dua-chips');
  const countIn = (f) => (f.places ? duas.filter((d) => d.placeIds.some((p) => f.places.includes(p))).length : duas.length);
  chips.innerHTML = FILTERS.map((f) => `<button type="button" data-filter="${f.id}" aria-pressed="${f.id === filter}">${f.label} <small>${countIn(f)}</small></button>`).join('');

  const card = (d) => `
    <details class="dua enter" id="dua-${d.id}">
      <summary>
        <span class="dua-head">
          <span class="dua-name"><span class="dua-title">${escapeHtml(d.title)}</span><span class="dua-places">${d.places.map((p) => escapeHtml(p.label)).join(' · ')}</span></span>
          ${d.repeat > 1 ? `<span class="dua-rep">${d.repeat} times</span>` : ''}
        </span>
        <span class="dua-peek" lang="ar">${escapeHtml(d.arabic.split('\n')[0])}</span>
        <span class="dua-more">Read the full duʿā</span>
      </summary>
      <div class="dua-body">
        <p class="dua-ar" lang="ar" dir="rtl">${escapeHtml(d.arabic)}</p>
        <p class="dua-tr">${escapeHtml(d.transliteration)}</p>
        <p class="dua-en">${escapeHtml(d.english)}</p>
        <p class="dua-src"><span>${escapeHtml(d.source)}</span>${d.remark ? `<span>${escapeHtml(d.remark)}</span>` : ''}</p>
      </div>
    </details>`;

  const render = () => {
    const f = FILTERS.find((x) => x.id === filter);
    const words = fold(query).split(' ').filter(Boolean);
    const shown = duas.filter((d) => (!f.places || d.placeIds.some((p) => f.places.includes(p))) && words.every((w) => d.hay.includes(w)));
    host.innerHTML = shown.length
      ? shown.map(card).join('')
      : `<p class="duas-empty">No duʿā matches “${escapeHtml(query)}”${f.places ? ` in ${f.label}` : ''}. Try another word, or choose All.</p>`;
    $$('.dua', host).forEach((el, i) => { el.style.animationDelay = `${Math.min(i, 12) * 30}ms`; });
    $('#dua-count').textContent = shown.length === duas.length ? `Showing all ${duas.length}` : `Showing ${shown.length} of ${duas.length}`;
  };

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.filter;
    $$('button', chips).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
  let typing = 0;
  $('#dua-q').addEventListener('input', (e) => {
    clearTimeout(typing);
    typing = setTimeout(() => { query = e.target.value; render(); }, 120);
  });
  const section = $('#duas');
  $('#show-translit').addEventListener('change', (e) => section.classList.toggle('no-translit', !e.target.checked));
  $('#show-meaning').addEventListener('change', (e) => section.classList.toggle('no-meaning', !e.target.checked));
  render();
}

/* ---------- Confetti, as the app throws it (lib/celebration, components/Confetti) ---------- */

const CONFETTI_COLOURS = ['#c8a352', '#e3c983', '#30a46c', '#0c2b21', '#dcc98f'];

function confetti() {
  if (reduceMotion) return; // The app drops nothing while Reduce Motion is on, either.
  const count = 88;
  const width = innerWidth;
  const height = innerHeight;
  const between = (lo, hi) => lo + (hi - lo) * Math.random();
  // One piece per band across the screen, in a shuffled order, so the shower
  // covers the width instead of clumping.
  const bands = [...Array(count).keys()].sort(() => Math.random() - 0.5);
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  let longest = 0;
  for (let i = 0; i < count; i++) {
    const round = Math.random() < 0.25;
    const size = between(6, 13);
    const tall = round ? size : between(12, 24);
    const drift = between(22, 60) * (Math.random() < 0.5 ? -1 : 1);
    const spin = between(360, 1080) * (Math.random() < 0.5 ? -1 : 1);
    const flips = Math.round(between(2, 6)) * 360;
    const delay = between(0, 900);
    const duration = between(1900, 3200);
    longest = Math.max(longest, delay + duration);
    const el = document.createElement('i');
    Object.assign(el.style, {
      left: `${Math.min(width, bands[i] * (width / count) + between(0, width / count))}px`,
      top: `${-tall - 4}px`, width: `${size}px`, height: `${tall}px`,
      borderRadius: round ? '50%' : '1.5px', background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length], opacity: '0',
    });
    layer.append(el);
    const fall = height + tall + 8;
    const at = (f, sway) => `translate(${sway}px, ${fall * f}px) rotateZ(${spin * f}deg) rotateX(${flips * f}deg)`;
    const timing = { duration, delay, fill: 'both', easing: 'linear' };
    el.animate([
      { transform: at(0, 0) }, { transform: at(0.25, drift) }, { transform: at(0.5, 0) },
      { transform: at(0.75, -drift) }, { transform: at(1, 0) },
    ], timing);
    el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], timing);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), longest + 100);
}

/* Two cannons in the bottom corners, fired once when you reach the end of the
   page. Each piece is simulated: a fast burst up and inwards, air drag that
   slows it within a fraction of a second, then a slow fluttering fall, the way
   paper confetti moves. */

function cannons() {
  if (reduceMotion) return;
  const W = innerWidth;
  const H = innerHeight;
  const G = 2.6 * H; // gravity, px/s²
  const DRAG = 7; // per second; falling speed settles at G / DRAG, about a third of the screen a second
  const between = (lo, hi) => lo + (hi - lo) * Math.random();
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  let longest = 0;
  for (const side of [-1, 1]) {
    const originX = side < 0 ? 0 : W;
    for (let i = 0; i < 75; i++) {
      const round = Math.random() < 0.25;
      const size = between(6, 12);
      const tall = round ? size : between(10, 20);
      const angle = (between(48, 82) * Math.PI) / 180; // above the ground, aimed inwards
      const speed = between(5, 8.8) * H;
      const duration = between(3.2, 4.4);
      const delay = between(0, 180);
      const spin = between(540, 1440) * (Math.random() < 0.5 ? -1 : 1);
      const flips = Math.round(between(2, 6)) * 360;
      const sway = between(12, 34);
      const phase = between(0, Math.PI * 2);
      longest = Math.max(longest, delay + duration * 1000);

      // Step the flight at 120 Hz and keep 24 points of it as keyframes.
      let x = 0; let y = 0;
      let vx = Math.cos(angle) * speed * -side;
      let vy = -Math.sin(angle) * speed;
      const dt = 1 / 120;
      const steps = Math.round(duration / dt);
      const frames = [];
      for (let n = 0; n <= steps; n++) {
        if (n % Math.round(steps / 24) === 0 || n === steps) {
          const f = n / steps;
          const t = n * dt;
          // The flutter only shows once it's drifting down.
          const flutter = Math.sin(t * 6 + phase) * sway * Math.min(1, t / 0.8);
          frames.push({
            transform: `translate(${(x + flutter).toFixed(1)}px, ${y.toFixed(1)}px) rotateZ(${(spin * f).toFixed(0)}deg) rotateX(${(flips * f).toFixed(0)}deg)`,
            opacity: f < 0.03 ? f / 0.03 : f > 0.75 ? Math.max(0, (1 - f) / 0.25) : 1,
            offset: f,
          });
        }
        vx += -DRAG * vx * dt;
        vy += (G - DRAG * vy) * dt;
        x += vx * dt;
        y += vy * dt;
      }
      const el = document.createElement('i');
      Object.assign(el.style, {
        left: `${originX - size / 2}px`, top: `${H}px`, width: `${size}px`, height: `${tall}px`,
        borderRadius: round ? '50%' : '1.5px', background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length], opacity: '0',
      });
      layer.append(el);
      el.animate(frames, { duration: duration * 1000, delay, fill: 'both', easing: 'linear' });
    }
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), longest + 100);
}

const pageEnd = $('.site-foot');
if (pageEnd) {
  const endObs = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    endObs.disconnect();
    cannons();
  }, { threshold: 0.9 });
  // Only once the visitor has scrolled, so a short window can't fire it on load.
  addEventListener('scroll', () => endObs.observe(pageEnd), { once: true, passive: true });
}

/* ---------- The before-sleep checklist, one tick from finished ---------- */

function startChecklist(duas, ids) {
  const listEl = $('#cl-list');
  if (!listEl || !ids?.length) return;
  const byId = Object.fromEntries(duas.map((d) => [d.id, d]));
  const items = ids.map((id) => byId[id]).filter(Boolean);
  const counts = {};
  const oneLeft = () => items.forEach((d, i) => { counts[d.id] = i === items.length - 1 ? 0 : d.repeat; });
  oneLeft();

  const doneCount = () => items.filter((d) => counts[d.id] >= d.repeat).length;
  const tick = '<svg aria-hidden="true"><use href="#i-check"/></svg>';

  const render = (popId) => {
    const done = doneCount();
    const complete = done === items.length;
    const left = items.length - done;
    $('#cl-sub').textContent = complete ? `All ${items.length} said` : `${done} of ${items.length} · ${left} left`;
    $('#cl-all').textContent = complete ? 'Clear all' : 'Mark all as done';
    listEl.innerHTML = items.map((d) => {
      const n = counts[d.id];
      const isDone = n >= d.repeat;
      const started = n > 0 && !isDone;
      const face = isDone ? tick : started ? `${n}/${d.repeat}` : d.repeat > 1 ? `×${d.repeat}` : '';
      return `
        <button type="button" role="checkbox" aria-checked="${isDone}" data-id="${d.id}"
          class="cl-card${isDone ? ' done' : ''}${started ? ' started' : ''}${popId === d.id ? ' pop' : ''}"
          aria-label="${escapeHtml(d.title)}, said ${n} of ${d.repeat} ${d.repeat === 1 ? 'time' : 'times'}">
          <span class="cl-tick">${face}</span>
          <span class="cl-name">${escapeHtml(d.title)}</span>
          <span class="cl-hint">${isDone ? '' : d.repeat > 1 ? 'Tap to count' : 'Tap when said'}</span>
          <span class="cl-ar" lang="ar">${escapeHtml(d.arabic.split('\n')[0])}</span>
        </button>`;
    }).join('') + (complete ? `<div class="cl-finish${popId ? ' enter' : ''}"><span lang="ar">تقبل الله</span><small>May Allah accept it from you</small></div>` : '');
  };

  // Show the list scrolled to its end, where the one still to say is.
  const toEnd = () => { listEl.scrollTop = listEl.scrollHeight; };

  listEl.addEventListener('click', (e) => {
    const card = e.target.closest('.cl-card');
    if (!card) return;
    const d = byId[card.dataset.id];
    const wasComplete = doneCount() === items.length;
    // A tap counts one more; a tap on a finished card starts it again.
    counts[d.id] = counts[d.id] >= d.repeat ? 0 : counts[d.id] + 1;
    render(d.id);
    listEl.querySelector(`[data-id="${d.id}"]`)?.focus({ preventScroll: true });
    if (!wasComplete && doneCount() === items.length) {
      toEnd();
      confetti();
      navigator.vibrate?.(40);
    }
  });

  $('#cl-all').addEventListener('click', () => {
    const complete = doneCount() === items.length;
    items.forEach((d) => { counts[d.id] = complete ? 0 : d.repeat; });
    render(complete ? null : 'all');
    if (!complete) { toEnd(); confetti(); navigator.vibrate?.(40); }
  });

  $('#cl-reset').addEventListener('click', () => { oneLeft(); render(); toEnd(); });

  render();
  toEnd();
}

/* ---------- The picture rail ---------- */

const rail = $('#rail');
if (rail) {
  const prev = $('.rail-btn.prev');
  const nextBtn = $('.rail-btn.next');
  const sync = () => {
    prev.disabled = rail.scrollLeft < 10;
    nextBtn.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 10;
  };
  $$('.rail-btn').forEach((b) => b.addEventListener('click', () => {
    const fig = rail.querySelector('figure');
    rail.scrollBy({ left: (+b.dataset.rail) * (fig.getBoundingClientRect().width + 22) });
  }));
  rail.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  sync();
}

startLiveTimes();
startDuas();
