import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Ideas from "./pages/Ideas"; // 👈 NOVO

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/ideas" element={<Ideas />} /> {/* 👈 NOVO */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
