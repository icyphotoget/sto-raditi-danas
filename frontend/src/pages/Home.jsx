import { Link } from "react-router-dom";
import { useState } from "react";

export default function Home() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col items-center">
      {/* HERO */}
      <section className="w-full py-24 px-4 text-center bg-gradient-to-b from-slate-900 to-slate-950">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-50">
          Što raditi danas?
        </h1>

        <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">
          Otkrij najbolje događaje, izlaske, festivale, obiteljske aktivnosti i
          skrivene dragulje u tvom gradu — svaki dan.
        </p>

        {/* SEARCH BAR */}
        <div className="mt-10 w-full max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Pretraži događaje…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-4 px-6 rounded-xl bg-slate-900/60 border border-slate-700 text-lg outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
          />
        </div>

        <Link
          to="/events"
          className="inline-block mt-6 px-6 py-3 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition"
        >
          Pogledaj sve događaje →
        </Link>
      </section>

      {/* POPULARNE KATEGORIJE */}
      <section className="w-full max-w-6xl px-4 py-16">
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
      <section className="w-full py-20 px-4 text-center border-t border-slate-800 bg-slate-900/40">
        <h3 className="text-3xl font-bold text-slate-100">
          Želiš svaki dan preporuke?
        </h3>
        <p className="mt-3 text-slate-400">
          Uskoro dolazi mobilna aplikacija!
        </p>

        <button className="mt-6 px-8 py-3 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition">
          Pretplati me
        </button>
      </section>
    </div>
  );
}
