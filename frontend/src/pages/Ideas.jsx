import { useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://sto-raditi-danas.onrender.com";

const MOOD_OPTIONS = [
  { value: "", label: "Bilo kako" },
  { value: "chill", label: "Opušteno / lagano" },
  { value: "energetic", label: "Aktivno / nabrijano" },
];

const WEATHER_OPTIONS = [
  { value: "", label: "Svejedno" },
  { value: "sun", label: "Sunce / ok vrijeme" },
  { value: "rain", label: "Kiša / ružno" },
  { value: "cold", label: "Zima / hladno" },
];

const BUDGET_OPTIONS = [
  { value: "", label: "Svejedno" },
  { value: "free", label: "Besplatno" },
  { value: "low", label: "Jeftino" },
  { value: "normal", label: "Normalan budžet" },
];

const COMPANY_OPTIONS = [
  { value: "", label: "Svejedno" },
  { value: "solo", label: "Solo" },
  { value: "couple", label: "U paru" },
  { value: "group", label: "S ekipom" },
];

export default function Ideas() {
  const [mood, setMood] = useState("");
  const [weather, setWeather] = useState("");
  const [budget, setBudget] = useState("");
  const [time, setTime] = useState("60");
  const [city, setCity] = useState("Zagreb");
  const [company, setCompany] = useState("");
  const [includeEventsToday, setIncludeEventsToday] = useState(true);

  const [ideas, setIdeas] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState(null);

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
      // ne rušimo glavnu grešku, samo log
    } finally {
      setLoadingEvents(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setIdeas([]);
      setTodayEvents([]);

      const res = await fetch(`${API_BASE}/api/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          weather,
          budget,
          time,
          contextCity: city,
          company,
        }),
      });

      if (!res.ok) {
        throw new Error("Ne mogu dohvatiti ideje");
      }

      const json = await res.json();
      setIdeas(json.ideas || []);

      if (includeEventsToday) {
        await fetchTodayEventsForCity(city);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Greška");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Što raditi danas? 🎯
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Upiši kako se osjećaš, kakvo je vrijeme i koliko imaš vremena –
          dobit ćeš konkretne ideje što raditi sada. Opcionalno možeš uključiti
          i stvarne događaje za danas u tvom gradu.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mb-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2"
        >
          {/* Raspoloženje */}
          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400 uppercase tracking-wide">
              Raspoloženje
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {MOOD_OPTIONS.map((opt) => (
                <option key={opt.value || "any-mood"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Vrijeme */}
          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400 uppercase tracking-wide">
              Vrijeme vani
            </label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {WEATHER_OPTIONS.map((opt) => (
                <option key={opt.value || "any-weather"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Budžet */}
          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400 uppercase tracking-wide">
              Budžet
            </label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {BUDGET_OPTIONS.map((opt) => (
                <option key={opt.value || "any-budget"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* S kim? */}
          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400 uppercase tracking-wide">
              S kim si?
            </label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            >
              {COMPANY_OPTIONS.map((opt) => (
                <option key={opt.value || "any-company"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grad */}
          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400 uppercase tracking-wide">
              Grad / lokacija
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="Zagreb"
            />
          </div>

          {/* Koliko imaš vremena */}
          <div className="flex flex-col gap-1 text-xs">
            <label className="text-slate-400 uppercase tracking-wide">
              Koliko imaš vremena? (minute)
            </label>
            <input
              type="number"
              min="15"
              max="480"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          {/* Uključi današnje događaje */}
          <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeEventsToday}
                onChange={(e) => setIncludeEventsToday(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
              />
              <span>U obzir uzmi i današnje događaje u gradu</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {loading ? "Tražim ideje..." : "Predloži aktivnosti"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* AI IDEJE */}
        {ideas.length > 0 && (
          <div className="mb-8 space-y-3">
            {ideas.map((idea, idx) => (
              <article
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <h2 className="text-sm font-semibold text-slate-50 mb-1">
                  {idea.title}
                </h2>
                <p className="text-xs text-slate-400 whitespace-pre-line">
                  {idea.description}
                </p>
                {idea.tags && idea.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {idea.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-700 bg-slate-800 px-2 py-[2px] text-[10px] text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* DANAŠNJI DOGAĐAJI */}
        {includeEventsToday && (loadingEvents || todayEvents.length > 0) && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              Događaji danas koji ti možda pašu
            </h2>

            {loadingEvents && (
              <p className="text-xs text-slate-400 mb-2">
                Učitavam današnje događaje…
              </p>
            )}

            {!loadingEvents && todayEvents.length === 0 && (
              <p className="text-xs text-slate-500">
                Nema pronađenih događaja za danas u odabranom gradu ili nisu
                još u bazi.
              </p>
            )}

            {!loadingEvents && todayEvents.length > 0 && (
              <div className="space-y-2">
                {todayEvents.slice(0, 8).map((ev) => (
                  <article
                    key={ev.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-50 line-clamp-1">
                        {ev.title}
                      </div>
                      {ev.category && (
                        <span className="ml-2 rounded-full border border-slate-700 bg-slate-800 px-2 py-[1px] text-[10px] text-slate-300">
                          {ev.category}
                        </span>
                      )}
                    </div>
                    {ev.venue_name && (
                      <div className="text-[11px] text-slate-400">
                        {ev.venue_name}
                        {ev.city ? ` · ${ev.city}` : ""}
                      </div>
                    )}
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-[11px] text-emerald-300 hover:text-emerald-200"
                      >
                        Detalji & karte →
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && ideas.length === 0 && !error && (
          <p className="text-xs text-slate-500">
            Ispuni formu iznad i dobit ćeš 5–10 konkretnih prijedloga što raditi
            danas, a po želji i listu današnjih događaja iz tvoje baze.
          </p>
        )}
      </main>
    </div>
  );
}
