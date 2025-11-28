// frontend/src/pages/Events.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 👇 OVDJE JE BITNA PROMJENA
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://sto-raditi-danas.onrender.com";

const CITY_OPTIONS = [
  { value: "", label: "Svi gradovi" },
  { value: "Zagreb", label: "Zagreb" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Sve kategorije" },
  { value: "KONCERT", label: "Koncerti" },
  { value: "DJ PARTY", label: "Party / DJ" },
  { value: "STAND-UP KOMEDIJA", label: "Stand-up" },
  { value: "FESTIVAL", label: "Festivali" },
  { value: "PREDSTAVA", label: "Predstave" },
  { value: "OSTALO", label: "Ostalo" },
];

const DATE_FILTERS = [
  { value: "all", label: "Svi datumi" },
  { value: "today", label: "Danas" },
  { value: "weekend", label: "Ovaj vikend" },
];

const TABS = [
  { id: "all", label: "Sve", subtitle: "Svi događaji" },
  { id: "nightlife", label: "Izlasci", subtitle: "Koncerti, partyji, klubovi" },
  { id: "family", label: "Family & kids", subtitle: "Obitelj, djeca, radionice" },
  { id: "culture", label: "Kultura", subtitle: "Predstave, festivali, konferencije" },
  { id: "sport", label: "Sport", subtitle: "Utrke, turniri i rekreacija" },
];

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

function getDateRange(filter) {
  const now = new Date();

  if (filter === "today") {
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

  if (filter === "weekend") {
    const day = now.getDay(); // 0 = ned, 6 = sub
    const daysUntilSaturday = (6 - day + 7) % 7;
    const daysUntilSunday = (7 - day + 7) % 7;

    const saturday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilSaturday,
      0,
      0,
      0
    );
    const sunday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilSunday,
      23,
      59,
      59
    );

    return { from: saturday.toISOString(), to: sunday.toISOString() };
  }

  return { from: null, to: null };
}

// Helper: odluči u koji tab spada event
function matchesTab(ev, tab) {
  if (tab === "all") return true;

  const cat = (ev.category || "").toUpperCase();
  const title = (ev.title || "").toLowerCase();
  const desc = (ev.description || "").toLowerCase();
  const text = `${title} ${desc}`;

  if (tab === "nightlife") {
    if (["KONCERT", "DJ PARTY", "PLESNJAK", "FESTIVAL"].includes(cat)) return true;
    if (
      text.match(
        /party|rave|club|klub|doček|nova godina|boogaloo|gallery club|lift club|katran/
      )
    ) {
      return true;
    }
    return false;
  }

  if (tab === "family") {
    if (
      text.match(
        /obitelj|obiteljski|djeca|djecji|klinac|klinci|kids|family|obiteljske ulaznice|muzej smijeha|božićna čarolija|iluzionist|magicomed/
      )
    ) {
      return true;
    }
    return false;
  }

  if (tab === "culture") {
    if (["PREDSTAVA", "KONFERENCIJA"].includes(cat)) return true;
    if (
      text.match(
        /kazališ|kazalište|konferencij|predavanje|izložb|festival|muzej|klasičn|klavir/
      )
    ) {
      return true;
    }
    return false;
  }

  if (tab === "sport") {
    if (cat === "SPORT") return true;
    if (
      text.match(
        /turnir|maraton|utrka|trčanje|trcanje|nogomet|košarka|kosarka|fitness|crossfit/
      )
    ) {
      return true;
    }
    return false;
  }

  return true;
}

export default function Events() {
  const location = useLocation();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("Zagreb");
  const [category, setCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState(null);

  // ⬇ na učitavanje stranice čitamo ?tab= iz URL-a
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  async function fetchEvents() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (city) params.set("city", city);
      if (category) params.set("category", category);

      const { from, to } = getDateRange(dateFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const url = `${API_BASE}/api/events?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Greška pri dohvaćanju događaja");

      const json = await res.json();
      setEvents(json.data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Greška");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, category, dateFilter]);

  // Klik na tab → promijeni state + napiši u URL ?tab=
  function handleTabClick(tabId) {
    setActiveTab(tabId);

    const params = new URLSearchParams(location.search);
    if (tabId === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }

    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
      },
      { replace: true }
    );
  }

  const filteredEvents = events.filter((ev) => matchesTab(ev, activeTab));
  const activeTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Događaji</h1>
            <p className="text-sm text-slate-400">
              Filtriraj po gradu, kategoriji, datumu i tipu izlaska.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
            {/* Grad */}
            <div className="flex flex-col text-xs">
              <span className="mb-1 text-slate-400 uppercase tracking-wide">
                Grad
              </span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              >
                {CITY_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategorija */}
            <div className="flex flex-col text-xs">
              <span className="mb-1 text-slate-400 uppercase tracking-wide">
                Kategorija
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value || "all-cat"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div className="flex flex-col text-xs">
              <span className="mb-1 text-slate-400 uppercase tracking-wide">
                Period
              </span>
              <div className="flex gap-2">
                {DATE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setDateFilter(f.value)}
                    className={`rounded-full px-3 py-1 text-xs border transition ${
                      dateFilter === f.value
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                        : "border-slate-700 text-slate-300 hover:border-emerald-400 hover:text-emerald-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TABOVI */}
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`rounded-full border px-3 py-1 transition ${
                  activeTab === tab.id
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-300 hover:border-emerald-400 hover:text-emerald-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {activeTabDef.subtitle}
          </p>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Status */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div>
            Prikazujem{" "}
            <span className="font-semibold text-slate-100">
              {filteredEvents.length}
            </span>{" "}
            događaja
            {city ? (
              <>
                {" "}
                za <span className="font-semibold">{city}</span>
              </>
            ) : null}
            {category ? (
              <>
                {" "}
                u kategoriji{" "}
                <span className="font-semibold">{category}</span>
              </>
            ) : null}
            {activeTab !== "all" ? (
              <>
                {" "}
                (tab:{" "}
                <span className="font-semibold">{activeTabDef.label}</span>)
              </>
            ) : null}
            {dateFilter !== "all" ? (
              <>
                {" "}
                ({DATE_FILTERS.find((f) => f.value === dateFilter)?.label})
              </>
            ) : null}
          </div>
          <button
            onClick={fetchEvents}
            className="text-xs rounded-full border border-slate-700 px-3 py-1 hover:border-emerald-400 hover:text-emerald-300"
          >
            Osvježi podatke
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-4 text-sm text-slate-400">Učitavam događaje…</div>
        )}

        {/* Empty / Grid */}
        {filteredEvents.length === 0 && !loading ? (
          <div className="mt-10 text-center text-sm text-slate-400">
            Trenutno nema događaja za ovaj filter. Probaj promijeniti tab,
            grad, kategoriju ili period.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((ev) => (
              <article
                key={ev.id}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-sm shadow-slate-950/50"
              >
                {/* Slika */}
                <div className="h-40 w-full bg-slate-800">
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

                {/* Content */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                    {ev.category && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        {ev.category}
                      </span>
                    )}
                    {ev.source && (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-400">
                        {ev.source}
                      </span>
                    )}
                    {ev.city && (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300">
                        {ev.city}
                      </span>
                    )}
                  </div>

                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-50">
                    {ev.title}
                  </h2>

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

                  {ev.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-slate-400">
                      {ev.description}
                    </p>
                  )}

                  <div className="mt-auto pt-2">
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
