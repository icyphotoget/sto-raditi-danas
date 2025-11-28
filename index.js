// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient"); // Supabase JS client
const { runImporterFromApi } = require("./importerRunner"); // novi wrapper za importer

const app = express();

app.use(cors());
app.use(express.json());

// Health check / test ruta
app.get("/", (req, res) => {
  res.json({ message: "Sto raditi danas API radi 👋 (Supabase HTTP verzija)" });
});

/**
 * GET /api/events
 *
 * Query parametri (svi opcionalni):
 *  - city       (npr. "Zagreb")
 *  - category   (npr. "KONCERT")
 *  - source     (npr. "entrio" ili "demo")
 *  - from       (ISO datum/vrijeme, npr. "2025-12-01T00:00:00.000Z")
 *  - to         (ISO datum/vrijeme)
 *
 * Ako se "from" i "to" ne pošalju → NE filtriramo po datumu,
 * nego vraćamo sve evente (uklj. one sa start_time = null).
 */
app.get("/api/events", async (req, res) => {
  try {
    const { city, category, source, from, to } = req.query;

    // 1) Bazni upit: svi eventi, sortirani po start_time (nullovi će završiti na vrhu ili dnu)
    let q = supabase
      .from("events")
      .select(
        "id, title, description, category, city, venue_name, start_time, end_time, price_min, price_max, lat, lng, source, source_id, url, image_url"
      )
      .order("start_time", { ascending: true })
      .limit(500);

    // 2) Filtriranje po gradu
    if (city) {
      q = q.eq("city", city);
    }

    // 3) Filtriranje po kategoriji
    if (category) {
      q = q.eq("category", category);
    }

    // 4) Filtriranje po izvoru (entrio, demo, ...)
    if (source) {
      q = q.eq("source", source);
    }

    // 5) Filtriranje po datumu samo ako je "from" / "to" poslano
    if (from) {
      q = q.gte("start_time", from);
    }
    if (to) {
      q = q.lte("start_time", to);
    }

    const { data, error } = await q;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Supabase query error" });
    }

    // frontend očekuje format: { data: [...] }
    res.json({ data: data || [] });
  } catch (err) {
    console.error("Greška u /api/events", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/import
 *
 * Pokreće importer (scrapere) kroz importerRunner.
 * Zaštita: moraš poslati tajni ključ, inače 401.
 *
 * Način poziva:
 *  - POST /api/import?secret=TAJNA
 *    ili
 *  - Header: x-import-secret: TAJNA
 *
 * TAJNA = vrijednost iz process.env.IMPORT_SECRET
 */
app.post("/api/import", async (req, res) => {
  try {
    const secretFromEnv = process.env.IMPORT_SECRET;
    const secretFromReq =
      req.query.secret || req.headers["x-import-secret"];

    if (secretFromEnv && secretFromReq !== secretFromEnv) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await runImporterFromApi();

    res.json({
      ok: true,
      imported: result.count,
    });
  } catch (err) {
    console.error("Greška u /api/import:", err);
    res.status(500).json({ error: "Importer error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});
