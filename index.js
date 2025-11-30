// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");
const { runImporterFromApi } = require("./importerRunner");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Sto raditi danas API radi 👋 (Supabase HTTP verzija)" });
});

/**
 * GET /api/events
 */
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

    if (city) q = q.eq("city", city);
    if (category) q = q.eq("category", category);
    if (source) q = q.eq("source", source);
    if (from) q = q.gte("start_time", from);
    if (to) q = q.lte("start_time", to);

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
 * POST /api/import  (scraper trigger)
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
 * POST /api/ideas  → AI generirane ideje
 *
 * Body:
 *  - mood
 *  - weather
 *  - budget
 *  - time
 *  - contextCity
 *  - company
 */
app.post("/api/ideas", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY nije postavljen");
      return res.status(500).json({ error: "AI konfiguracija nije postavljena (nema OPENAI_API_KEY)" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};

    const {
      mood = "",
      weather = "any",
      budget = "any",
      time,
      contextCity = "Zagreb",
      company = "any",
    } = body;

    console.log("AI IDEAS request:", body);

    // Prompt za model
    const userPayload = {
      mood,
      weather,
      budget,
      time: Number(time) || 60,
      city: contextCity,
      company,
    };

    const prompt = `
Ti si osobni asistent za slobodno vrijeme u Hrvatskoj.

Na temelju sljedećih informacija generiraj 5–10 konkretnih aktivnosti što osoba može raditi SADA:

- raspoloženje (mood)
- vrijeme vani (weather: sun, rain, cold, any)
- budžet (budget: free, low, normal, any)
- vrijeme na raspolaganju u minutama (time)
- grad (city)
- s kim je (company: solo, couple, group, any)

Vrati isključivo JSON ovog oblika:

{
  "ideas": [
    {
      "title": "Kratka šetnja Bundekom + kava",
      "description": "Vrlo konkretan opis što napraviti, gdje otići, koliko traje, zašto je to dobro u ovom kontekstu.",
      "tags": ["besplatno", "vanjsko", "lagano"]
    }
  ]
}

- title neka bude kratak i jasan (max 80 znakova)
- description neka bude praktičan, konkretan, bez generičkih fraza
- tags su kratke riječi na hrvatskom: tip (npr. "vanjsko", "unutra", "hrana", "društvo", "romantično", "obitelj", "sport"), budžet ("besplatno", "jeftino", "normalno", "skuplje"), vibe ("chill", "aktivno" itd.)
- Ako je grad Zagreb, slobodno spomeni konkretne lokacije (Bundek, Jarun, Maksimir, Centar, kvartovi...) ako ima smisla.
- Ako je budžet "free" ili "low", izbjegavaj skupe prijedloge.
- Ako je vrijeme "rain" ili "cold", fokusiraj se više na indoor aktivnosti.

SVE vrati kao validan JSON objekt, bez dodatnog teksta, bez objašnjenja izvan JSON-a.
Ulazni podaci (user context) su:
${JSON.stringify(userPayload)}
`;

    // Poziv prema OpenAI (chat.completions)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "Ti si pametan, praktičan asistent za slobodno vrijeme." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("OpenAI error:", response.status, txt);
      return res
        .status(500)
        .json({ error: "AI servis je vratio grešku", details: txt });
    }

    const data = await response.json();

    let content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("OpenAI: nema contenta u odgovoru", data);
      return res.status(500).json({ error: "AI odgovor je prazan" });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Ne mogu parsirati AI JSON content:", content);
      return res.status(500).json({ error: "AI je vratio neispravan JSON" });
    }

    // Osiguraj da uvijek postoji ideas array
    if (!Array.isArray(parsed.ideas)) {
      parsed.ideas = [];
    }

    res.json({
      ideas: parsed.ideas,
      meta: {
        count: parsed.ideas.length,
        ...userPayload,
      },
    });
  } catch (err) {
    console.error("Greška u /api/ideas:", err);
    res.status(500).json({ error: "Greška pri AI generiranju ideja" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});
