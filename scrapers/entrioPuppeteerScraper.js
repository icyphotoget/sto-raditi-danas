// scrapers/entrioPuppeteerScraper.js
//
// 1) Puppeteer otvori listing "događaji u Zagrebu" i pokupi sve /event/ linkove + naslov + datum
// 2) Za svaki event napravimo obični HTTP GET (axios) i iz HTML-a izvlačimo <meta property="og:image">
//    + pokušamo venue_name
//
// Ovo vraća niz objekata koji su kompatibilni s normalizeEvent() u importerCore.js

const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");

const COLLECTION_URL =
  "https://www.entrio.hr/collections/dogadjaji-u-zagrebu";

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
  "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
};

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// 2) Detalji eventa preko običnog HTTP poziva (bez Puppeteera)
async function fetchEventDetailsViaHttp(url) {
  try {
    const res = await axios.get(url, {
      headers: COMMON_HEADERS,
      timeout: 30000,
    });

    const $ = cheerio.load(res.data);

    // og:image
    const ogImg =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content") ||
      null;

    // heuristika za venue
    const venueSelectors = [
      '[data-testid="venue-name"]',
      ".event-header__venue",
      ".event-venue",
      ".venue",
      ".event-location",
    ];

    let venueName = null;
    for (const sel of venueSelectors) {
      const txt = $(sel).first().text().trim();
      if (txt) {
        venueName = txt;
        break;
      }
    }

    return {
      imageUrl: ogImg || null,
      venueName: venueName || null,
    };
  } catch (err) {
    console.error("Greška kod HTTP detalja za", url, "-", err.message);
    return {
      imageUrl: null,
      venueName: null,
    };
  }
}

async function fetchEntrioEvents(city = "zagreb") {
  console.log("Entrio Puppeteer+HTTP scraper – otvaram listing:", COLLECTION_URL);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(COMMON_HEADERS["User-Agent"]);
  await page.setExtraHTTPHeaders({
    "Accept-Language": COMMON_HEADERS["Accept-Language"],
  });

  try {
    // 1) Otvorimo kolekciju
    await page.goto(COLLECTION_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Scroll da se sve učita (infinite list)
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 250);
      });
    });

    // Pokupi sve /event/ linkove i osnovne info
    const events = await page.evaluate(() => {
      const results = [];
      const allLinks = Array.from(document.querySelectorAll("a"));
      const eventLinks = allLinks.filter(
        (a) => a.href && a.href.includes("/event/")
      );

      const seen = new Set();

      eventLinks.forEach((a) => {
        const href = a.getAttribute("href") || a.href;
        if (!href) return;

        const fullUrl = href.startsWith("http")
          ? href
          : "https://www.entrio.hr" + href;

        if (seen.has(fullUrl)) return;
        seen.add(fullUrl);

        const fullText = a.innerText.trim().replace(/\s+/g, " ");
        if (!fullText) return;

        // pokušaj ulovit datum (npr. 20.12.2025.)
        const dateMatch = fullText.match(/(\d{2}\.\d{2}\.\d{4}\.)/);
        const datePart = dateMatch ? dateMatch[1] : null;
        let start_time = null;

        if (datePart) {
          const cleaned = datePart.replace(/\.$/, "");
          const [day, month, year] = cleaned.split(".").filter(Boolean);
          if (day && month && year) {
            const d = new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              20,
              0
            );
            if (!Number.isNaN(d.getTime())) {
              start_time = d.toISOString();
            }
          }
        }

        let title = fullText;
        if (datePart) {
          title = fullText.replace(datePart, "").trim();
        }

        results.push({
          title: title || "Bez naslova",
          description: null,
          category: "entrio",
          city: "Zagreb",
          venue_name: null,
          start_time,
          price_min: null,
          price_max: null,
          lat: null,
          lng: null,
          source: "entrio",
          source_id: `entrio-${href}`,
          url: fullUrl,
          image_url: null, // popunit ćemo nakon HTTP detalja
        });
      });

      return results;
    });

    console.log("Entrio scraper – pronađeno event linkova:", events.length);

    // 2) Za SVAKI event preko HTTP-a pokupimo og:image + venue
    let idx = 0;
    for (const ev of events) {
      idx += 1;
      console.log(
        `HTTP detalji (${idx}/${events.length}):`,
        ev.url.slice(0, 100)
      );

      const details = await fetchEventDetailsViaHttp(ev.url);

      if (details.imageUrl) {
        ev.image_url = details.imageUrl;
      }

      if (details.venueName && !ev.venue_name) {
        ev.venue_name = details.venueName;
      }

      // mali delay da budemo pristojni prema serveru
      await sleep(250);
    }

    console.log("Entrio scraper – gotovo, eventa:", events.length);
    await browser.close();
    return events;
  } catch (err) {
    console.error("Entrio scraper – FATAL ERROR:", err);
    await browser.close();
    throw err;
  }
}

module.exports = {
  fetchEntrioEvents,
};
