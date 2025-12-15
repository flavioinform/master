import { useContext, useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { AppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import {
  Home,
  Inbox,
  Calendar,
  Search,
  Settings,
  LogOut,
  Users,
  ClipboardPlus,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function Dashboard() {
  const { user, logout } = useContext(AppContext);

  const [rol, setRol] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      if (!user?.id) return;

      setLoadingRole(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("rol, nombre_completo")
        .eq("id", user.id)
        .single();

      if (!error) setRol(data?.rol || "socio");
      else setRol("socio");

      setLoadingRole(false);
    };

    loadRole();
  }, [user?.id]);

  // ✅ Menú base (socio)
  const menuSocio = [
    { title: "Inicio", url: "/dashboard", icon: Home },
    { title: "Vouchers", url: "/dashboard/vouchers", icon: Inbox },
    { title: "Convocatorias", url: "/dashboard/convocatorias", icon: Calendar },
    { title: "Perfil", url: "/dashboard/perfil", icon: Search },
    { title: "Historial", url: "/dashboard/historial", icon: Settings },
  ];

  // ✅ Menú Directiva (extra)
  const menuDirectivaExtra = [
    { title: "Voucher Admin", url: "/dashboard/directiva/vouchers", icon: ShieldCheck },
    { title: "Ver perfiles", url: "/dashboard/directiva/perfiles", icon: Users },
    { title: "Crear convocatoria", url: "/dashboard/directiva/CrearConvocatoria", icon: ClipboardPlus },
  ];

  const isDirectiva = rol === "directiva";

  const items = isDirectiva ? [...menuSocio, ...menuDirectivaExtra] : menuSocio;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar>
        <SidebarContent>
          {/* Saludo */}
          <SidebarGroup>
            <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-4 py-3 text-sm">
                <p className="text-muted-foreground">Bienvenido</p>
                <p className="font-semibold">{user?.email || "Usuario"} 👋</p>

                <p className="mt-1 text-xs text-gray-500">
                  Rol:{" "}
                  <span className="font-semibold">
                    {loadingRole ? "cargando..." : rol}
                  </span>
                </p>
              </div>

             
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Menú */}
          <SidebarGroup>
            <SidebarGroupLabel>Menú</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              {isDirectiva && (
                <div className="px-4 pt-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Panel Directiva habilitado</span>
                  </div>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
           <div className="px-4 pb-3">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
        </SidebarContent>
      </Sidebar>

      {/* Contenido */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
