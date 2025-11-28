// importerCore.js
// Core logika importera koju koristimo i za CLI (importer.js) i za API endpoint.

require("dotenv").config();
const supabase = require("./supabaseClient");
const { fetchDemoEvents } = require("./scrapers/demoScraper");
const { fetchHtmlEvents } = require("./scrapers/htmlScraperExample");
const { fetchEntrioEvents } = require("./scrapers/entrioScraper");

// helper za parsiranje cijene
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n;
}

// Normalizacija eventa na format baze
function normalizeEvent(raw) {
  return {
    title: raw.title || "Bez naslova",
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
    source: raw.source || "unknown",
    source_id: raw.source_id || null,
    url: raw.url || null,
    image_url: raw.image_url || null,
  };
}

// Glavna funkcija: izvrši jedan import i vrati rezultat umjesto process.exit
async function runImportOnce() {
  console.log("Pokrećem importer (core)…");

  // 1) Demo eventi (lokalni)
  const demoEvents = fetchDemoEvents();

  // 2) HTML demo scraper (TimeOut ili neka druga stranica)
  const htmlEvents = await fetchHtmlEvents();

  // 3) Entrio – Događaji u Zagrebu
  const entrioZagreb = await fetchEntrioEvents("zagreb");

  // 4) Spoji sve u jedan niz
  const rawEvents = [...demoEvents, ...htmlEvents, ...entrioZagreb];

  console.log("Dohvatio sam", rawEvents.length, "raw event(a).");

  // 5) Normalizacija i filtriranje (mora postojati source_id)
  const normalized = rawEvents
    .map(normalizeEvent)
    .filter((ev) => ev.source_id !== null);

  console.log("Nakon normalizacije imam", normalized.length, "event(a).");

  if (normalized.length === 0) {
    console.log("Nema eventa za upis.");
    return { count: 0, rows: [] };
  }

  // 6) Upsert u Supabase
  const { data, error } = await supabase
    .from("events")
    .upsert(normalized, { onConflict: "source,source_id" })
    .select();

  if (error) {
    console.error("Greška kod upserta u Supabase:", error);
    throw error;
  }

  console.log("Upisano/azurirano event(a):", data.length);

  data.forEach((ev) => {
    console.log("-", ev.id, ev.title);
  });

  return { count: data.length, rows: data };
}

module.exports = {
  runImportOnce,
};
