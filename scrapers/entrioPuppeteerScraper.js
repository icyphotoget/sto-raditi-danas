// scrapers/entrioPuppeteerScraper.js
//
// Entrio scraper preko Puppeteera (pravi browser u headless modu).

const puppeteer = require('puppeteer');

async function fetchEntrioEvents(city = 'zagreb') {
  const url = 'https://www.entrio.hr/collections/dogadjaji-u-zagrebu';
  console.log('Puppeteer Entrio scraper – otvaram:', url);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7',
  });

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // malo scrollanje da se stranica "razbudi"
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

  const events = await page.evaluate(() => {
    const results = [];

    const allLinks = Array.from(document.querySelectorAll('a'));
    const eventLinks = allLinks.filter((a) =>
      a.href && a.href.includes('/event/')
    );

    console.log('DEBUG: ukupno linkova:', allLinks.length);
    console.log('DEBUG: event linkova:', eventLinks.length);

    eventLinks.forEach((a, idx) => {
      const href = a.getAttribute('href') || a.href;
      if (!href) return;

      const fullUrl = href.startsWith('http')
        ? href
        : 'https://www.entrio.hr' + href;

      const fullText = a.innerText.trim().replace(/\s+/g, ' ');
      if (!fullText) return;

      // pokušaj ulovit datum (npr. 20.12.2025.)
      const dateMatch = fullText.match(/(\d{2}\.\d{2}\.\d{4}\.)/);
      const datePart = dateMatch ? dateMatch[1] : null;
      let start_time = null;

      if (datePart) {
        const cleaned = datePart.replace(/\.$/, '');
        const [day, month, year] = cleaned.split('.').filter(Boolean);
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
        title = fullText.replace(datePart, '').trim();
      }

      results.push({
        title: title || 'Bez naslova',
        description: null,
        category: 'entrio',
        city: 'Zagreb',
        venue_name: null,
        start_time,
        price_min: null,
        price_max: null,
        lat: null,
        lng: null,
        source: 'entrio',
        source_id: `entrio-${href}`,
        url: fullUrl,
        image_url: null,
      });
    });

    return results;
  });

  await browser.close();

  console.log('Puppeteer Entrio scraper – scrapano eventa:', events.length);
  return events;
}

module.exports = {
  fetchEntrioEvents,
};
