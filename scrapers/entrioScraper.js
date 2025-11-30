// scrapers/entrioPuppeteerScraper.js
//
// Entrio scraper preko Puppeteera (headless browser).
// 1) ode na kolekciju događaja za Zagreb
// 2) skupi listu event linkova + osnovne info
// 3) za svaki event otvori njegovu stranicu i pokupi og:image (image_url)

const puppeteer = require("puppeteer");

const COLLECTION_URL =
  "https://www.entrio.hr/collections/dogadjaji-u-zagrebu";

async function fetchEntrioEvents(city = "zagreb") {
  console.log("Puppeteer Entrio scraper – otvaram kolekciju:", COLLECTION_URL);

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

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.setExtraHTTPHeaders({
    "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  try {
    // 1) Otvori kolekciju
    await page.goto(COLLECTION_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // malo scrollanje da se učita infinite list
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    // 2) Skupi osnovne podatke s listing stranice
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
          image_url: null, // popunit ćemo kasnije
        });
      });

      return results;
    });

    console.log("Puppeteer Entrio scraper – pronađeno linkova:", events.length);

    // 3) Za svaki event otvori njegovu stranicu i pokupi og:image
    let index = 0;
    for (const ev of events) {
      index += 1;
      console.log(
        `Scrapam detalje (${index}/${events.length}):`,
        ev.url.slice(0, 80)
      );

      try {
        await page.goto(ev.url, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        const details = await page.evaluate(() => {
          // og:image
          const ogImg =
            document.querySelector('meta[property="og:image"]') ||
            document.querySelector('meta[name="og:image"]');

          const imageUrl = ogImg ? ogImg.content : null;

          // pokušaj venue naziva (ovo je heuristika, možeš kasnije prilagoditi)
          const venueSelectorCandidates = [
            '[data-testid="venue-name"]',
            ".event-venue",
            ".venue",
            ".event-location",
          ];

          let venueName = null;
          for (const sel of venueSelectorCandidates) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
              venueName = el.textContent.trim();
              break;
            }
          }

          return {
            imageUrl: imageUrl || null,
            venueName: venueName || null,
          };
        });

        if (details.imageUrl) {
          ev.image_url = details.imageUrl;
        }

        if (details.venueName && !ev.venue_name) {
          ev.venue_name = details.venueName;
        }

        // mali delay da ne rokamo Entrio prebrzo
        await new Promise((res) => setTimeout(res, 400));
      } catch (err) {
        console.error("Greška pri scrapanju detalja za", ev.url, err.message);
      }
    }

    console.log(
      "Puppeteer Entrio scraper – gotovo, eventa:",
      events.length
    );

    await browser.close();
    return events;
  } catch (err) {
    console.error("Puppeteer Entrio scraper – FATAL ERROR:", err);
    await browser.close();
    throw err;
  }
}

module.exports = {
  fetchEntrioEvents,
};
