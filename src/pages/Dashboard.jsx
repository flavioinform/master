import { useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import master12Logo from "@/assets/galeria/master12.png";
import {
  Home,
  FileText,
  Trophy,
  User,
  Clock,
  Shield,
  Users,
  ClipboardPlus,
  LogOut,
  Waves,
  Calendar,
  CreditCard,
  DollarSign,
} from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useContext(AppContext);
  const location = useLocation();

  const [rol, setRol] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [nombreCompleto, setNombreCompleto] = useState("");

  useEffect(() => {
    const loadRole = async () => {
      if (!user?.id) return;

      setLoadingRole(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("rol, nombre_completo")
        .eq("id", user.id)
        .single();

      if (!error) {
        setRol(data?.rol || "socio");
        setNombreCompleto(data?.nombre_completo || "");
      } else {
        setRol("socio");
      }

      setLoadingRole(false);
    };

    loadRole();
  }, [user?.id]);

  const menuSocio = [
    { title: "Inicio", url: "/dashboard", icon: Home },
    { title: "Mi Perfil", url: "/dashboard/perfil", icon: User },
    { title: "Cambio Contraseña", url: "/dashboard/cambio-password", icon: Shield },
    { title: "Mis Pagos", url: "/dashboard/vouchers", icon: FileText },
    { title: "Competencias", url: "/dashboard/convocatorias", icon: Trophy },
    { title: "Historial Competencias", url: "/dashboard/historial-competencias", icon: Trophy },
    { title: "Calendario", url: "/dashboard/calendario", icon: Calendar },

    // { title: "Historial", url: "/dashboard/historial", icon: Clock },

  ];

  const menuDirectivaExtra = [
    { title: "Pagos Mensuales", url: "/dashboard/directiva/pagos-mensuales", icon: DollarSign },
    { title: "Revisar Pagos", url: "/dashboard/directiva/vouchers", icon: Shield },
    { title: "Ver Socios", url: "/dashboard/directiva/perfiles", icon: Users },
    { title: "Gestionar Competencias", url: "/dashboard/directiva/CrearConvocatoria", icon: ClipboardPlus },
  ];

  const isDirectiva = rol === "directiva";
  const items = isDirectiva ? [...menuSocio, ...menuDirectivaExtra] : menuSocio;

  const isActive = (url) => location.pathname === url;

  return (

    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Professional Light Celeste Theme */}
      <aside className="w-72 bg-gradient-to-b from-blue-50/80 to-white text-slate-600 flex flex-col relative overflow-hidden shadow-sm border-r border-blue-100/50">
        {/* Decorative Light Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full text-blue-200">
            <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="110" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="75" cy="75" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
          </svg>
        </div>
        <div className="p-7 border-t border-blue-100/50 relative z-10 ">
          <button
            onClick={logout}
            className="w-full flex items-left justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 text-sm font-bold shadow-xl shadow-slate-900/10"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>

        {/* Header */}
        <div className="p-6 border-b border-blue-100/50 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400 rounded-xl blur-lg opacity-20"></div>
              <div className="relative bg-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                <img src={master12Logo} alt="Club Master" className="h-7 w-7" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase text-slate-800">Club Master</h1>
              <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-widest leading-none">Swimming Excellence</p>
            </div>
          </div>

        </div>

        {/* User Profile */}
        <div className="px-6 py-5 border-b border-blue-100/50 relative z-10 bg-white/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400 rounded-full blur-md opacity-20"></div>
              <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-blue-500/10">
                {nombreCompleto ? nombreCompleto.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Atleta</p>
              <p className="text-sm font-bold truncate text-slate-800">{nombreCompleto || user?.email?.split('@')[0] || "Usuario"}</p>
            </div>
          </div>

          {isDirectiva && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500 text-white text-[9px] font-black uppercase tracking-wider shadow-md shadow-cyan-500/20">
              <Shield className="h-2.5 w-2.5" />
              Directiva
            </div>



          )}

        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto relative z-10">
          <div className="space-y-1">
            {items.map((item) => {
              const active = isActive(item.url);
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active
                    ? 'bg-white text-blue-600 shadow-md shadow-blue-500/5 border border-blue-50'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'
                    }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'bg-transparent text-slate-400 group-hover:text-cyan-500'}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-sm ${active ? 'font-black' : 'font-semibold'}`}>{item.title}</span>
                  {active && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-100/50 relative z-10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all duration-300 text-sm font-bold shadow-xl shadow-slate-900/10"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {items.find(item => isActive(item.url))?.title || "Dashboard"}
              </h2>
              <p className="text-sm text-slate-500 font-medium">Gestiona tu actividad deportiva</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">En línea</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
