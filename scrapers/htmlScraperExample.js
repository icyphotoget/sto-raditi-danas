// scrapers/htmlScraperExample.js
//
// Demo HTML scraper (TimeOut ili bilo koja druga stranica).
// Pokazuje kako koristiti fetch + cheerio u Node-u.

const cheerio = require('cheerio');

// fetch – radi i ako imaš global fetch (Node 18+), i ako koristiš node-fetch
const fetchFn =
  global.fetch ||
  ((...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args)));

async function fetchHtmlEvents() {
  const url = 'https://www.timeout.com/croatia/things-to-do'; // demo URL

  console.log('Dohvaćam HTML sa:', url);

  const response = await fetchFn(url);
  if (!response.ok) {
    console.error('Ne mogu dohvatiti HTML:', response.status);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const events = [];

  // Ovo je samo DEMO selektor – možda neće naći puno, ali bitno je da kod radi.
  $('.card-content').each((i, el) => {
    const title = $(el).find('h3').text().trim();
    const description = $(el).find('p').first().text().trim();
    const image_url = $(el).find('img').attr('src') || null;

    if (!title) return;

    const start_time = new Date().toISOString(); // demo datum

    events.push({
      title,
      description: description || null,
      category: 'razno',
      city: 'Zagreb',
      venue_name: null,
      start_time,
      price_min: null,
      price_max: null,
      lat: null,
      lng: null,
      source: 'timeout-demo',
      source_id: `timeout-${i}`,
      url,
      image_url,
    });
  });

  console.log('HTML scraper – scrapano eventa:', events.length);
  return events;
}

module.exports = {
  fetchHtmlEvents,
};
