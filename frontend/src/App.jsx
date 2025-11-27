import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Events from "./pages/Events";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
