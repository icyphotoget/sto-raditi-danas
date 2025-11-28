// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient"); // Supabase JS client
const { runImporterFromApi } = require("./importerRunner"); // wrapper za importer

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

    // 1) Bazni upit: svi eventi, sortirani po start_time
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

    // 5) Filtriranje po datumu (samo ako je poslano)
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

/**
 * POST /api/ideas
 *
 * Prima:
 *  - mood        (string, npr "opušteno / lagano")
 *  - weather     ("sun" | "rain" | "cold" | "")
 *  - budget      ("free" | "low" | "normal" | "")
 *  - time        (minute, npr "60")
 *  - contextCity (grad, npr "Zagreb")
 *  - company     ("solo" | "couple" | "group" | "")
 *
 * Vraća: { ideas: [ { title, description, tags[] } ] }
 */
app.post("/api/ideas", async (req, res) => {
  try {
    const { mood, weather, budget, time, contextCity, company } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OPENAI_API_KEY nije postavljen na serveru" });
    }

    const prompt = `
Ti si AI asistent za preporuke aktivnosti za servis "Što raditi danas".

Korisnik ti je dao sljedeće podatke:
- Raspoloženje: ${mood || "-"}
- Vrijeme: ${weather || "-"}
- Budžet: ${budget || "-"}
- Vrijeme na raspolaganju (minute): ${time || "-"}
- Grad / lokacija: ${contextCity || "-"}
- S kim je: ${company || "-"}

Tvoj zadatak:
- Generiraj 6 konkretnih ideja što osoba može raditi danas.
- Kombiniraj "doma", "vani", "u gradu", ovisno o vremenu i budžetu.
- Ako je budžet "free" ili "low" -> prednost daj besplatnim ili jeftinim aktivnostima.
- Ako je vrijeme "rain" ili "cold" -> prednost aktivnostima u zatvorenom.
- Ako je company "solo" -> ideje za solo; "couple" -> u paru; "group" -> s ekipom.

Vrati odgovor isključivo kao validan JSON array bez ikakvog dodatnog teksta, u formatu:
[
  {
    "title": "kratak naslov ideje",
    "description": "konkretan opis što napraviti, praktično, max 3-4 rečenice",
    "tags": ["besplatno", "vanjsko", "solo"]
  },
  ...
]
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI API error:", response.status, text);
      return res.status(500).json({ error: "OpenAI API error" });
    }

    const data = await response.json();

    const rawContent =
      data?.choices?.[0]?.message?.content?.trim() || "[]";

    let ideas;
    try {
      ideas = JSON.parse(rawContent);
      if (!Array.isArray(ideas)) throw new Error("Not an array");
    } catch (e) {
      console.error("JSON parse error iz OpenAI odgovora:", e, rawContent);
      ideas = [];
    }

    res.json({
      ideas,
      meta: {
        count: ideas.length,
        mood,
        weather,
        budget,
        time,
        contextCity,
        company,
      },
    });
  } catch (err) {
    console.error("Greška u /api/ideas:", err);
    res.status(500).json({ error: "AI ideas error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});
