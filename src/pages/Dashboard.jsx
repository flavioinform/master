import { useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
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
    { title: "Mis Pagos", url: "/dashboard/vouchers", icon: FileText },
    { title: "Competencias", url: "/dashboard/convocatorias", icon: Trophy },
    { title: "Calendario", url: "/dashboard/calendario", icon: Calendar },
    { title: "Mi Perfil", url: "/dashboard/perfil", icon: User },
    { title: "Historial", url: "/dashboard/historial", icon: Clock },
  ];

  const menuDirectivaExtra = [
    { title: "Revisar Pagos", url: "/dashboard/directiva/vouchers", icon: Shield },
    { title: "Ver Socios", url: "/dashboard/directiva/perfiles", icon: Users },
    { title: "Gestionar Competencias", url: "/dashboard/directiva/CrearConvocatoria", icon: ClipboardPlus },
  ];

  const isDirectiva = rol === "directiva";
  const items = isDirectiva ? [...menuSocio, ...menuDirectivaExtra] : menuSocio;

  const isActive = (url) => location.pathname === url;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar - Olympic Style */}
      <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col relative overflow-hidden">
        {/* Decorative Olympic Rings Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="110" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
            <circle cx="75" cy="75" r="30" fill="none" stroke="currentColor" strokeWidth="6" />
          </svg>
        </div>

        {/* Header */}
        <div className="p-6 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-400 p-2.5 rounded-xl">
                <Waves className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase">Club Master</h1>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Swimming Excellence</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-6 py-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-sm"></div>
              <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-lg font-black shadow-lg">
                {nombreCompleto ? nombreCompleto.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Atleta</p>
              <p className="text-sm font-bold truncate text-white">{nombreCompleto || user?.email?.split('@')[0] || "Usuario"}</p>
            </div>
          </div>
          {isDirectiva && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-black uppercase tracking-wider">
              <Shield className="h-3 w-3" />
              Admin
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
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${active
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <item.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'} transition-colors`} />
                  <span className="text-sm font-bold">{item.title}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10 relative z-10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600/90 hover:bg-red-600 transition-all duration-200 text-sm font-bold shadow-lg"
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
