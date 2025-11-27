// scrapers/entrioScraper.js
//
// Scraper za Entrio kolekciju "Događaji u Zagrebu".
// URL: https://www.entrio.hr/collections/dogadjaji-u-zagrebu

const cheerio = require('cheerio');

const fetchFn =
  global.fetch ||
  ((...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args)));

async function fetchEntrioEvents(city = 'zagreb') {
  const url = 'https://www.entrio.hr/collections/dogadjaji-u-zagrebu';

  console.log('Dohvaćam Entrio kolekciju za:', city, '->', url);

  const response = await fetchFn(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  if (!response.ok) {
    console.error('Ne mogu dohvatiti Entrio:', response.status);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const events = [];

  // Svaki event je link na /event/xxxx
  $('a[href^="/event/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const fullUrl = 'https://www.entrio.hr' + href;

    const fullText = $(el).text().trim().replace(/\s+/g, ' ');
    if (!fullText) return;

    // Pokušaj izvući datum na početku (npr. "20.12.2025.")
    const dateMatch = fullText.match(/(\d{2}\.\d{2}\.\d{4}\.)/);
    const datePart = dateMatch ? dateMatch[1] : null;
    let start_time = null;

    if (datePart) {
      const [day, month, year] = datePart
        .replace(/\.$/, '')
        .split('.')
        .filter(Boolean);
      if (day && month && year) {
        const d = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          20,
          0
        ); // 20:00 kao default
        if (!isNaN(d.getTime())) {
          start_time = d.toISOString();
        }
      }
    }

    // Title = sve iza datuma, ako ga ima
    let title = fullText;
    if (datePart) {
      title = fullText.replace(datePart, '').trim();
    }

    const cityName = 'Zagreb';

    events.push({
      title,
      description: null,
      category: 'entrio', // kasnije: pametnije (koncert/party/...)
      city: cityName,
      venue_name: null,
      start_time,
      price_min: null,
      price_max: null,
      lat: null,
      lng: null,
      source: 'entrio',
      source_id: `entrio-${href}`, // jedinstveno po linku
      url: fullUrl,
      image_url: null,
    });
  });

  console.log('Entrio scraper – scrapano eventa:', events.length);
  return events;
}

module.exports = {
  fetchEntrioEvents,
};
