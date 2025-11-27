// scrapers/demoScraper.js
//
// Ovo je "lažni" scraper - simulira prave podatke koje bi povukao s neke web stranice.
// Kasnije ćemo ovo zamijeniti pravim fetch + cheerio scrapingom.

function fetchDemoEvents() {
  // Ovdje vratiš niz eventa onako kako si ih "scrapao"
  // Format je 'sirovi' (raw), ne mora savršeno odgovarati bazi.
  const now = new Date();

  const events = [
    {
      title: 'Koncert: Novi demo bend',
      description: 'Još jedan super rock koncert.',
      category: 'koncert',
      city: 'Zagreb',
      venue_name: 'Boogaloo',
      // danas navečer
      start_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0).toISOString(),
      price_min: 8,
      price_max: 15,
      lat: 45.81,
      lng: 15.98,
      source: 'demo-site',
      source_id: 'demo-site-1',
      url: 'https://example.com/koncert-novi-demo',
      image_url: 'https://via.placeholder.com/400x250?text=Koncert+demo',
    },
    {
      title: 'Obiteljski dan u Maksimiru',
      description: 'Program za djecu i roditelje, igra, radionice i piknik.',
      category: 'family',
      city: 'Zagreb',
      venue_name: 'Park Maksimir',
      // sutra ujutro
      start_time: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        10,
        0
      ).toISOString(),
      price_min: 0,
      price_max: 0,
      lat: 45.825,
      lng: 16.02,
      source: 'demo-site',
      source_id: 'demo-site-2',
      url: 'https://example.com/obiteljski-dan',
      image_url: 'https://via.placeholder.com/400x250?text=Family',
    },
  ];

  return events;
}

module.exports = {
  fetchDemoEvents,
};
