// frontend/src/pages/Events.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://sto-raditi-danas.onrender.com";

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
      0, 0, 0
    );
    const to = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23, 59, 59
    );
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (filter === "weekend") {
    const day = now.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    const daysUntilSunday = (7 - day + 7) % 7;

    const saturday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilSaturday,
      0, 0, 0
    );
    const sunday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilSunday,
      23, 59, 59
    );

    return { from: saturday.toISOString(), to: sunday.toISOString() };
  }

  return { from: null, to: null };
}

function matchesTab(ev, tab) {
  if (tab === "all") return true;

  const cat = (ev.category || "").toUpperCase();
  const text = `${(ev.title || "").toLowerCase()} ${(ev.description || "").toLowerCase()}`;

  if (tab === "nightlife") {
    if (["KONCERT", "DJ PARTY", "PLESNJAK", "FESTIVAL"].includes(cat)) return true;
    if (text.match(/party|rave|club|klub|boogaloo|gallery|katran|doček|nova godina/)) return true;
    return false;
  }

  if (tab === "family") {
    if (text.match(/djeca|kids|obitelj|family|radionice|klinci/)) return true;
    return false;
  }

  if (tab === "culture") {
    if (["PREDSTAVA", "KONFERENCIJA"].includes(cat)) return true;
    if (text.match(/kazališ|predavanje|izložb|muzej|klasičn|festival/)) return true;
    return false;
  }

  if (tab === "sport") {
    if (cat === "SPORT") return true;
    if (text.match(/turnir|utrka|maraton|nogomet|košarka|trčanje/)) return true;
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

  // Učitaj tab iz URL-a
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

      const res = await fetch(`${API_BASE}/api/events?${params.toString()}`);
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
  }, [city, category, dateFilter]);

  function handleTabClick(tabId) {
    setActiveTab(tabId);

    const params = new URLSearchParams(location.search);
    if (tabId === "all") params.delete("tab");
    else params.set("tab", tabId);

    navigate({
      pathname: location.pathname,
      search: params.toString(),
    }, { replace: true });
  }

  const filteredEvents = events.filter((ev) => matchesTab(ev, activeTab));
  const activeTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Događaji</h1>
            <p className="text-sm text-slate-400">Filtriraj po gradu, kategoriji i datumu.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">

            {/* Grad */}
            <div className="flex flex-col text-xs">
              <span className="mb-1 text-slate-400 uppercase">Grad</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-emerald-400"
              >
                {CITY_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Kategorija */}
            <div className="flex flex-col text-xs">
              <span className="mb-1 text-slate-400 uppercase">Kategorija</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-emerald-400"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div className="flex flex-col text-xs">
              <span className="mb-1 text-slate-400 uppercase">Period</span>
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
          <p className="mt-1 text-[11px] text-slate-500">{activeTabDef.subtitle}</p>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-6xl px-4 py-6">

        {/* Status */}
        <div className="mb-4 text-xs text-slate-400 flex justify-between">
          <span>
            Prikazujem{" "}
            <strong className="text-slate-100">{filteredEvents.length}</strong>{" "}
            događaja
          </span>
          <button
            onClick={fetchEvents}
            className="rounded-full border border-slate-700 px-3 py-1 hover:border-emerald-400 hover:text-emerald-300"
          >
            Osvježi
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-sm text-slate-400 mb-4">Učitavam događaje…</p>
        )}

        {/* Empty */}
        {!loading && filteredEvents.length === 0 && (
          <p className="text-sm text-slate-400">
            Nema događaja za ovaj filter. Promijeni tab, grad, kategoriju ili period.
          </p>
        )}

        {/* GRID */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => {
            const imageUrl =
              ev.image_url || ev.image || ev.photo_url || null;

            return (
              <article
                key={ev.id}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden"
              >
                {/* IMAGE */}
                <div className="h-40 bg-slate-800">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-500">
                      Nema slike
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="p-3 text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-semibold text-slate-50 line-clamp-2">
                      {ev.title}
                    </h3>

                   {/* CATEGORY BADGE – prikazuj samo ako nije entrio / demo / unknown */}
{ev.category &&
  !["entrio", "demo", "unknown"].includes(ev.category.toLowerCase()) && (
    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-[1px] text-[10px] text-slate-300">
      {ev.category}
    </span>
  )}
                  </div>

                  {ev.start_time && (
                    <p className="text-[11px] text-slate-400">
                      {formatDateTime(ev.start_time)}
                    </p>
                  )}

                  {(ev.venue_name || ev.city) && (
                    <p className="text-[11px] text-slate-500">
                      {ev.venue_name}
                      {ev.city ? ` · ${ev.city}` : ""}
                    </p>
                  )}

                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 text-[11px] text-emerald-300 hover:text-emerald-200"
                    >
                      Detalji & karte →
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
