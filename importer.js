// importer.js
//
// 1) Uveze supabase client (isti koji backend koristi)
// 2) Uveze naše scrapere (demo + HTML + Entrio Puppeteer)
// 3) Normalizira podatke
// 4) Upsert-a u tablicu events (bez duplikata, po source + source_id)

require('dotenv').config();
const supabase = require('./supabaseClient');
const { fetchDemoEvents } = require('./scrapers/demoScraper');
const { fetchHtmlEvents } = require('./scrapers/htmlScraperExample');
const { fetchEntrioEvents } = require('./scrapers/entrioPuppeteerScraper');

// helper za pretvaranje broja
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

// Normalizacija eventa na format baze
function normalizeEvent(raw) {
  return {
    title: raw.title || 'Bez naslova',
    description: raw.description || null,
    category: raw.category || null,
    city: raw.city || null,
    venue_name: raw.venue_name || null,
    start_time: raw.start_time || null,
    end_time: raw.end_time || null,
    price_min: toNumberOrNull(raw.price_min),
    price_max: toNumberOrNull(raw.price_max),
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    source: raw.source || 'unknown',
    source_id: raw.source_id || null,
    url: raw.url || null,
    image_url: raw.image_url || null,
  };
}

async function runImport() {
  console.log('Pokrećem importer...');

  // 1) Demo eventi
  const demoEvents = fetchDemoEvents();

  // 2) HTML demo scraper (TimeOut)
  const htmlEvents = await fetchHtmlEvents();

  // 3) Entrio događaji (Puppeteer)
  const entrioZagreb = await fetchEntrioEvents('zagreb');

  // 4) Spoji sve u jedan array
  const rawEvents = [...demoEvents, ...htmlEvents, ...entrioZagreb];

  console.log('Dohvatio sam', rawEvents.length, 'raw event(a).');

  // 5) Normalizacija i filtriranje
  const normalized = rawEvents
    .map(normalizeEvent)
    .filter((ev) => ev.source_id !== null);

  console.log('Nakon normalizacije imam', normalized.length, 'event(a).');

  if (normalized.length === 0) {
    console.log('Nema eventa za upis.');
    process.exit(0);
  }

  // 6) Upsert u Supabase (bez duplikata)
  const { data, error } = await supabase
    .from('events')
    .upsert(normalized, { onConflict: 'source,source_id' })
    .select();

  if (error) {
    console.error('Greška kod upserta u Supabase:', error);
    process.exit(1);
  }

  console.log('Upisano/azurirano event(a):', data.length);

  data.forEach((ev) => {
    console.log('-', ev.id, ev.title);
  });

  process.exit(0);
}

runImport().catch((err) => {
  console.error('Fatalna greška u importeru:', err);
  process.exit(1);
});
