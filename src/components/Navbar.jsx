import { Link } from "react-router-dom";
import logo from "../assets/galeria/master12.png";

function Navbar() {
  return (
    <div className="sticky top-0 z-50 bg-white shadow-[0_4px_20px_-10px_rgba(14,165,233,0.15)] border-b border-sky-50">
      <header className="container mx-auto px-6 py-3">
        <nav className="flex items-center justify-between">

          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-sky-50 p-1 rounded-xl group-hover:bg-sky-100 transition-colors">
              <img src={logo} alt="Club Master Iquique" className="h-10 w-auto" />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-900 font-black text-xl leading-none uppercase tracking-tighter">
                Master <span className="text-sky-600">Iquique</span>
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                Club Deportivo
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-10">
            <Link to="/nosotros" className="text-slate-600 font-bold text-sm uppercase tracking-widest hover:text-sky-600 transition-colors">
              Nosotros
            </Link>
            <Link to="/mision" className="text-slate-600 font-bold text-sm uppercase tracking-widest hover:text-sky-600 transition-colors">
              Misión
            </Link>
            <Link to="/#contacto" className="text-slate-600 font-bold text-sm uppercase tracking-widest hover:text-sky-600 transition-colors">
              Contáctanos
            </Link>
          </div>

          {/* Auth Button */}
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-sky-100 hover:scale-105 active:scale-95"
            >
              Portal Socios
            </Link>
          </div>

        </nav>
      </header>
    </div>
  );
}

export default Navbar;