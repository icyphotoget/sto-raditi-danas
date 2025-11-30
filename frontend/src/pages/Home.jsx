// frontend/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("hr-HR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayRange() {
  const now = new Date();
  const from = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );
  const to = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [topEvents, setTopEvents] = useState([]);
  const [loadingTop, setLoadingTop] = useState(false);
  const [errorTop, setErrorTop] = useState(null);

  useEffect(() => {
    async function fetchTop() {
      try {
        setLoadingTop(true);
        setErrorTop(null);

        const { from, to } = getTodayRange();
        const params = new URLSearchParams();

        // ako želiš samo Zagreb, ostavi ovu liniju
        params.set("city", "Zagreb");

        params.set("from", from);
        params.set("to", to);

        const res = await fetch(`${API_BASE}/api/events?${params.toString()}`);
        if (!res.ok) throw new Error("Greška pri dohvaćanju događaja");

        const json = await res.json();
        const events = (json.data || [])
          .filter((ev) => ev.start_time) // moraju imati vrijeme
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
          )
          .slice(0, 3); // TOP 3

        setTopEvents(events);
      } catch (e) {
        console.error(e);
        setErrorTop(e.message || "Greška");
      } finally {
        setLoadingTop(false);
      }
    }

    fetchTop();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <section className="w-full py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="mx-auto max-w-6xl grid gap-10 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-50">
              Što raditi danas?
            </h1>

            <p className="mt-4 text-slate-400 text-lg max-w-xl">
              Dnevne preporuke događaja, izlasaka, festivala i obiteljskih
              aktivnosti u tvom gradu. Nema scrollanja po milijun stranica – sve
              na jednom mjestu.
            </p>

            {/* SEARCH BAR (za buduće pretraživanje) */}
            <div className="mt-8 w-full max-w-xl">
              <input
                type="text"
                placeholder="Pretraži događaje… (uskoro)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-4 px-6 rounded-xl bg-slate-900/70 border border-slate-700 text-lg outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/events"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition"
              >
                Pogledaj sve događaje →
              </Link>

              <Link
                to="/ideas"
                className="inline-flex items-center justify-center px-5 py-3 rounded-full border border-slate-700 text-slate-200 text-sm font-medium hover:border-emerald-400 hover:text-emerald-200 transition"
              >
                Ne znaš što bi? AI prijedlozi →
              </Link>
            </div>

           
          </div>

          {/* BOX: kratki highlight */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">
              Danas u gradu
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Pregled najzanimljivijih događaja danas u Zagrebu. Od kluba do
              stand-upa i obiteljskih aktivnosti.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              
              <li>• Pametni filteri za izlaske, obitelj, kulturu i sport</li>
              <li>• AI ideje kad nemaš pojma što bi radio</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TOP 3 DANAŠNJA DOGAĐAJA */}
      <section className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-50">
              Top 3 događaja danas
            </h2>
            <p className="text-sm text-slate-400">
              Brzi pregled onoga što se događa večeras – bez skrolanja po
              kilometrima liste.
            </p>
          </div>
          <Link
            to="/events?tab=nightlife"
            className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
          >
            Vidi sve današnje događaje →
          </Link>
        </div>

        {/* status */}
        {loadingTop && (
          <p className="mt-4 text-sm text-slate-400">Učitavam današnje događaje…</p>
        )}
        {errorTop && !loadingTop && (
          <p className="mt-4 text-sm text-red-300">
            Ne mogu dohvatiti top događaje: {errorTop}
          </p>
        )}
        {!loadingTop && !errorTop && topEvents.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Danas još nemamo niti jedan događaj u bazi. Probaj kasnije ili
            pogledaj sve događaje.
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {topEvents.map((ev) => {
            const category =
              ev.category &&
              ev.category.toLowerCase() !== "entrio" &&
              ev.category.trim() !== ""
                ? ev.category
                : null;

            const source =
              ev.source &&
              ev.source.toLowerCase() !== "entrio" &&
              ev.source.trim() !== ""
                ? ev.source
                : null;

            return (
              <article
                key={ev.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm shadow-slate-950/40"
              >
                <div className="h-36 w-full bg-slate-800">
                  {ev.image_url ? (
                    <img
                      src={ev.image_url}
                      alt={ev.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      Nema slike
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                    {category && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        {category}
                      </span>
                    )}
                    {/* na početnoj ne prikazujemo “entrio” ni ako je source */}
                    {source && (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-400">
                        {source}
                      </span>
                    )}
                    {ev.city && (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">
                        {ev.city}
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-50">
                    {ev.title}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-400">
                    {ev.venue_name && (
                      <div>
                        <span className="text-slate-500">Lokacija: </span>
                        <span>{ev.venue_name}</span>
                      </div>
                    )}
                    {ev.start_time && (
                      <div>
                        <span className="text-slate-500">Vrijeme: </span>
                        <span>{formatDateTime(ev.start_time)}</span>
                      </div>
                    )}
                    {ev.price_min !== null && (
                      <div>
                        <span className="text-slate-500">Cijena: </span>
                        {ev.price_max && ev.price_max !== ev.price_min ? (
                          <span>
                            {ev.price_min} – {ev.price_max} €
                          </span>
                        ) : (
                          <span>od {ev.price_min} €</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        Detalji & karte →
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* POPULARNE KATEGORIJE */}
      <section className="w-full max-w-6xl px-4 py-12 mx-auto border-t border-slate-800">
        <h2 className="text-2xl font-bold mb-6 text-slate-100">
          Popularne kategorije
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Izlasci", icon: "🎉", link: "/events?tab=nightlife" },
            { name: "Family & Kids", icon: "👨‍👩‍👧", link: "/events?tab=family" },
            { name: "Kultura", icon: "🎭", link: "/events?tab=culture" },
            { name: "Sport", icon: "⚽", link: "/events?tab=sport" },
          ].map((cat) => (
            <Link
              key={cat.name}
              to={cat.link}
              className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center hover:border-emerald-400 hover:bg-slate-900/80 transition flex flex-col items-center"
            >
              <span className="text-4xl">{cat.icon}</span>
              <span className="mt-2 text-slate-200 font-semibold">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-16 px-4 text-center border-t border-slate-800 bg-slate-900/40">
        <h3 className="text-3xl font-bold text-slate-100">
          Želiš svaki dan preporuke?
        </h3>
        <p className="mt-3 text-slate-400">
          Uskoro dolazi mobilna aplikacija i newsletter sa dnevnim prijedlozima.
        </p>

        <button className="mt-6 px-8 py-3 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition">
          Pretplati me
        </button>
      </section>
    </div>
  );
}
