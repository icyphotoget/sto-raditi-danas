import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://sto-raditi-danas.onrender.com";

function getTodayRangeIso() {
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

export default function Home() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("Zagreb");
  const [todayEvents, setTodayEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    async function fetchTodayEventsForCity(cityName) {
      try {
        setLoadingEvents(true);
        setTodayEvents([]);

        const { from, to } = getTodayRangeIso();
        const params = new URLSearchParams();
        if (cityName) params.set("city", cityName);
        params.set("from", from);
        params.set("to", to);

        const res = await fetch(`${API_BASE}/api/events?${params.toString()}`);
        if (!res.ok) throw new Error("Ne mogu dohvatiti današnje događaje");

        const json = await res.json();
        setTodayEvents(json.data || []);
      } catch (err) {
        console.error(err);
        // tiho failamo, samo ne prikažemo sekciju
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchTodayEventsForCity(city);
  }, [city]);

  const hasEvents = todayEvents && todayEvents.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center">
      {/* HERO */}
      <section className="w-full py-20 md:py-24 px-4 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-10">
          {/* Tekst */}
          <div className="text-center md:text-left md:max-w-xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-50">
              Što raditi danas?
            </h1>

            <p className="mt-4 text-slate-400 text-lg">
              Otkrij najbolje događaje, izlaske, festivale, obiteljske
              aktivnosti i skrivene dragulje u tvom gradu — svaki dan.
            </p>

            {/* SEARCH BAR (za sada vizualni, UX hint) */}
            <div className="mt-6 w-full max-w-xl md:max-w-md mx-auto md:mx-0">
              <input
                type="text"
                placeholder="Pretraži događaje… (uskoro)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-3.5 px-5 rounded-xl bg-slate-900/60 border border-slate-700 text-sm md:text-base outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition placeholder:text-slate-500"
              />
            </div>

            {/* CTA GUMBI */}
            <div className="mt-6 flex flex-col items-center md:items-start gap-3 sm:flex-row sm:gap-4">
              <Link
                to="/events"
                className="px-6 py-3 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-sm md:text-base font-semibold hover:bg-emerald-500/30 transition"
              >
                Pogledaj sve događaje →
              </Link>

              <Link
                to="/ideas"
                className="px-6 py-3 rounded-full border border-slate-600 text-slate-200 text-sm md:text-base font-semibold hover:border-emerald-400 hover:text-emerald-200 transition"
              >
                Ne znam što bi → predloži mi
              </Link>
            </div>
          </div>

          {/* Dekor / preview kartica */}
          <div className="md:flex-1">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-1 rounded-3xl bg-emerald-500/20 blur-2xl opacity-60" />
              <div className="relative rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Brzi prijedlog
                    </p>
                    <p className="text-sm font-semibold text-slate-50">
                      Večeras u Zagrebu
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
                    live beta
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3">
                  Filtriramo događaje, vrijeme i tvoj mood — i nudimo ti par
                  konkretnih ideja što raditi danas.
                </p>

                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span>Koncerti, partyji i izlasci</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-lg">👨‍👩‍👧</span>
                    <span>Family & kids aktivnosti</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-lg">🎭</span>
                    <span>Kazalište, festivali, konferencije</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULARNE KATEGORIJE */}
      <section className="w-full max-w-6xl px-4 py-12 md:py-16">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-100">
            Popularne kategorije
          </h2>
          <Link
            to="/events"
            className="text-xs text-emerald-300 hover:text-emerald-200"
          >
            Pogledaj sve →
          </Link>
        </div>

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
              className="rounded-xl bg-slate-900 border border-slate-800 p-5 text-center hover:border-emerald-400 hover:bg-slate-900/80 transition flex flex-col items-center"
            >
              <span className="text-3xl md:text-4xl">{cat.icon}</span>
              <span className="mt-2 text-slate-200 font-semibold text-sm md:text-base">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* DANAŠNJI DOGAĐAJI (PREVIEW) */}
      <section className="w-full max-w-6xl px-4 pb-10 md:pb-16">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Danas u {city}
            </h2>
            <p className="text-xs text-slate-400">
              Brzi pogled u današnje događaje iz tvoje baze.
            </p>
          </div>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-400"
          >
            <option value="Zagreb">Zagreb</option>
            {/* lako kasnije dodaš druge gradove */}
          </select>
        </div>

        {loadingEvents && (
          <p className="text-xs text-slate-400">Učitavam današnje događaje…</p>
        )}

        {!loadingEvents && !hasEvents && (
          <p className="text-xs text-slate-500">
            Nema pronađenih događaja za danas u odabranom gradu ili još nisu u
            bazi. Pogledaj sve u{" "}
            <Link
              to="/events"
              className="text-emerald-300 hover:text-emerald-200"
            >
              pretraživaču događaja
            </Link>
            .
          </p>
        )}

        {!loadingEvents && hasEvents && (
          <div className="grid gap-3 md:grid-cols-2">
            {todayEvents.slice(0, 4).map((ev) => (
              <article
                key={ev.id}
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-50 line-clamp-1">
                    {ev.title}
                  </h3>
                  {ev.category && (
                    <span className="ml-2 rounded-full border border-slate-700 bg-slate-800 px-2 py-[1px] text-[10px] text-slate-300">
                      {ev.category}
                    </span>
                  )}
                </div>

                {ev.start_time && (
                  <p className="text-[11px] text-slate-400">
                    {formatDateTime(ev.start_time)}
                  </p>
                )}

                {ev.venue_name && (
                  <p className="text-[11px] text-slate-400">
                    {ev.venue_name}
                    {ev.city ? ` · ${ev.city}` : ""}
                  </p>
                )}

                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-[11px] text-emerald-300 hover:text-emerald-200"
                  >
                    Detalji & karte →
                  </a>
                )}
              </article>
            ))}
          </div>
        )}

        {hasEvents && (
          <div className="mt-4">
            <Link
              to="/events"
              className="inline-flex text-xs text-emerald-300 hover:text-emerald-200"
            >
              Vidi sve današnje događaje →
            </Link>
          </div>
        )}
      </section>

      {/* KAKO RADI */}
      <section className="w-full px-4 py-10 md:py-14 border-t border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-6">
            Kako radi sto-raditi-danas?
          </h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-2xl mb-1">1️⃣</p>
              <p className="font-semibold text-slate-50 mb-1">
                Ti odabereš raspoloženje
              </p>
              <p className="text-xs text-slate-400">
                Chill, nabrijano, solo, u paru ili s ekipom — i grad u kojem si.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-2xl mb-1">2️⃣</p>
              <p className="font-semibold text-slate-50 mb-1">
                Mi spojimo prognozu + bazu događaja
              </p>
              <p className="text-xs text-slate-400">
                Povlačimo tvoje evente + uzimamo u obzir vrijeme i budžet.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-2xl mb-1">3️⃣</p>
              <p className="font-semibold text-slate-50 mb-1">
                Dobiješ konkretne prijedloge
              </p>
              <p className="text-xs text-slate-400">
                5–10 ideja što raditi danas, plus listu događaja koji ti najviše
                pašu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DONJI CTA */}
      <section className="w-full py-10 px-4 text-center border-t border-slate-800 bg-slate-900/60">
        <h3 className="text-2xl md:text-3xl font-bold text-slate-100">
          Želiš svaki dan preporuke?
        </h3>
        <p className="mt-3 text-sm md:text-base text-slate-400 max-w-xl mx-auto">
          Uskoro dolazi mobilna aplikacija i još pametniji algoritmi. Za sada
          koristi web i testiraj bazu događaja + AI ideje.
        </p>

        <div className="mt-5 flex justify-center gap-3">
          <Link
            to="/ideas"
            className="px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/30 transition"
          >
            Isprobaj AI ideje
          </Link>
          <Link
            to="/events"
            className="px-5 py-2.5 rounded-full border border-slate-600 text-slate-200 text-sm font-semibold hover:border-emerald-400 hover:text-emerald-200 transition"
          >
            Pregledaj događaje
          </Link>
        </div>
      </section>
    </div>
  );
}
