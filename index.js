// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient"); // Supabase JS client
const { runImporterFromApi } = require("./importerRunner"); // wrapper za importer
const OpenAI = require("openai");

// --- AI KLIJENT (OpenRouter preko OpenAI SDK-a) -----------------------------

// U Render env var postavi:
// OPENAI_API_KEY = tvoj OpenRouter key
// (npr. sk-or-v1-....)
const openai =
  process.env.OPENAI_API_KEY
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        // bitno: usmjeravamo OpenAI SDK na OpenRouter
        baseURL: "https://openrouter.ai/api/v1",
      })
    : null;

// model možeš promijeniti kroz env ako želiš
const OPENROUTER_MODEL =
  process.env.OPENAI_MODEL || "openai/gpt-4.1";

const app = express();

app.use(cors());
app.use(express.json());

// Health check / test ruta
app.get("/", (req, res) => {
  res.json({
    message: "Sto raditi danas API radi 👋 (Supabase HTTP verzija)",
  });
});


// ---------------------------------------------------------------------------
// GET /api/events
// ---------------------------------------------------------------------------
//
// Query parametri (svi opcionalni):
//  - city       (npr. "Zagreb")
//  - category   (npr. "KONCERT")
//  - source     (npr. "entrio" ili "demo")
//  - from       (ISO datum/vrijeme, npr. "2025-12-01T00:00:00.000Z")
//  - to         (ISO datum/vrijeme)
//
// Ako se "from" i "to" ne pošalju → NE filtriramo po datumu,
// nego vraćamo sve evente (uklj. one sa start_time = null).
// ---------------------------------------------------------------------------
app.get("/api/events", async (req, res) => {
  try {
    const { city, category, source, from, to } = req.query;

    let q = supabase
      .from("events")
      .select(
        "id, title, description, category, city, venue_name, start_time, end_time, price_min, price_max, lat, lng, source, source_id, url, image_url"
      )
      .order("start_time", { ascending: true })
      .limit(500);

    if (city) {
      q = q.eq("city", city);
    }

    if (category) {
      q = q.eq("category", category);
    }

    if (source) {
      q = q.eq("source", source);
    }

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


// ---------------------------------------------------------------------------
// POST /api/import
// ---------------------------------------------------------------------------
//
// Pokreće importer (scrapere) kroz importerRunner.
// Zaštita: moraš poslati tajni ključ, inače 401.
//
// Način poziva:
//  - POST /api/import?secret=TAJNA
//    ili
//  - Header: x-import-secret: TAJNA
//
// TAJNA = vrijednost iz process.env.IMPORT_SECRET
// ---------------------------------------------------------------------------
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


// ---------------------------------------------------------------------------
// Pomoćna funkcija: fallback ideje bez AI (ako nema key-a ili AI pukne)
// ---------------------------------------------------------------------------
function buildFallbackIdeas(payload) {
  const { mood, weather, budget, time, contextCity, company } = payload;
  const ideas = [];

  const city = contextCity || "tvoj grad";
  const t = Number(time) || 60;
  const isShort = t <= 60;
  const isCheap = budget === "low" || budget === "free";
  const isIndoorWeather = weather === "rain" || weather === "cold";

  const moodStr = (mood || "").toLowerCase();
  const isChill = /opušten|opusteno|relax|smireno|chill/.test(moodStr);

  function add(title, description, tags = []) {
    ideas.push({ title, description, tags });
  }

  if (!isIndoorWeather) {
    add(
      `Šetnja po kvartu + kratka kava`,
      `Izađi ${isShort ? "na 20–30 minuta" : "na sat vremena"} u šetnju kroz ${city}, 
svrati u jedan kafić u kojem nikad nisi bio i napravi mali mentalni reset.`,
      ["šetnja", "vanjsko", isCheap ? "jeftino" : "normalno"]
    );
  }

  if (isIndoorWeather || isChill) {
    add(
      "Mini kućni projekt",
      `Odaberi jedan mali zadatak (polica, ladica, dio stola) i sredi ga do kraja u jednom komadu. 
Mali cilj, ali ogroman osjećaj zadovoljstva kad je gotovo.`,
      ["doma", "diy", "besplatno"]
    );
  }

  add(
    "Mikro cilj za danas",
    "Postavi si jedan mali cilj koji možeš riješiti u manje od 30 minuta (poziv, mail, poruka, plan za vikend) i odradi ga odmah.",
    ["mindset", "mini-zadatak"]
  );

  return ideas;
}


// ---------------------------------------------------------------------------
// POST /api/ideas  (AI preko OpenRoutera + fallback)
// ---------------------------------------------------------------------------
//
// Prima:
//  - mood        (string, npr "opušteno")
//  - weather     ("sun" | "rain" | "cold" | "any")
//  - budget      ("free" | "low" | "normal" | "any")
//  - time        (minute, npr 60)
//  - contextCity (grad, npr "Zagreb")
//  - company     ("solo" | "couple" | "group" | "any")
//
// Vraća: { ideas: [ { title, description, tags[] } ], meta: {...} }
// ---------------------------------------------------------------------------
app.post("/api/ideas", async (req, res) => {
  const payload = req.body || {};
  const { mood, weather, budget, time, contextCity, company } = payload;

  try {
    // ako nema AI klijenta → odmah fallback
    if (!openai) {
      const ideas = buildFallbackIdeas(payload);
      return res.json({
        ideas,
        meta: {
          from: "fallback",
          mood,
          weather,
          budget,
          time,
          contextCity,
          company,
        },
      });
    }

    const systemPrompt = `
Ti si asistent za preporuke aktivnosti "Što raditi danas?" za korisnike u Hrvatskoj.
Na temelju zadanog raspoloženja, vremena, budžeta, vremena na raspolaganju,
grada i s kim je osoba, osmislit ćeš 5–10 konkretnih prijedloga aktivnosti.

Vrste prijedloga:
- kratki izlasci (šetnja, kava, park, kvart)
- aktivnosti doma (diy, kuhanje, declutter, vježba)
- isprobavanje novih mjesta (restoran, kafić, muzej, kvart)
- druženje s ekipom ili u paru
- solo reset (šetnja bez mobitela, fokus na jedan zadatak, učenje nečeg novog)

OBAVEZNO vrati čist JSON u formatu:

{
  "ideas": [
    {
      "title": "kratki naslov",
      "description": "konkretan opis aktivnosti, 2-4 rečenice, bez formatiranja",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Bez dodatnog teksta prije ili poslije JSON-a.
Opis neka bude praktičan i razumljiv, na hrvatskom jeziku.
`;

    const userContent = {
      mood: mood || "",
      weather: weather || "",
      budget: budget || "",
      time: time || "",
      contextCity: contextCity || "",
      company: company || "",
    };

    const completion = await openai.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Ovo su ulazni podaci korisnika (JSON):\n" +
            JSON.stringify(userContent),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 700,
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";

    let ideas = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.ideas)) {
        ideas = parsed.ideas;
      }
    } catch (e) {
      console.warn("Parse AI response failed, using fallback ideas:", e);
      ideas = buildFallbackIdeas(payload);
    }

    if (!ideas || ideas.length === 0) {
      ideas = buildFallbackIdeas(payload);
    }

    res.json({
      ideas,
      meta: {
        from: "ai-openrouter",
        model: OPENROUTER_MODEL,
        mood,
        weather,
        budget,
        time,
        contextCity,
        company,
      },
    });
  } catch (err) {
    // npr. 429, quota, bilo što → ne rušimo front, damo fallback
    console.error("Greška u /api/ideas (AI):", err?.response?.data || err);

    const ideas = buildFallbackIdeas(payload);

    res.status(200).json({
      ideas,
      meta: {
        from: "fallback-error",
        errorType: err?.response?.status || err?.name || "unknown",
        mood,
        weather,
        budget,
        time,
        contextCity,
        company,
      },
    });
  }
});


// ---------------------------------------------------------------------------
// START SERVERA
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});
