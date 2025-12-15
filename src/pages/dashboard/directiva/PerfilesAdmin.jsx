import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function PerfilesAdmin() {
  const { user } = useContext(AppContext);

  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");

    try {
      // 1️⃣ verificar rol
      const { data: perfil, error: e0 } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (e0) throw e0;
      if (perfil.rol !== "directiva") {
        setRol("socio");
        return;
      }

      setRol("directiva");

      // 2️⃣ cargar perfiles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, nombre_completo, rut, telefono, rol, activo, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (err) {
      setMsg(err.message || "Error cargando perfiles");
      setTipo("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const toggleActivo = async (id, activo) => {
    const { error } = await supabase
      .from("profiles")
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      setMsg("No se pudo cambiar el estado");
      setTipo("error");
    } else {
      load();
    }
  };

//   const toggleRol = async (id, rolActual) => {
//     const nuevo = rolActual === "directiva" ? "socio" : "directiva";

//     const { error } = await supabase
//       .from("profiles")
//       .update({ rol: nuevo })
//       .eq("id", id);

//     if (error) {
//       setMsg("No se pudo cambiar el rol");
//       setTipo("error");
//     } else {
//       load();
//     }
//   };

  if (loading) return <div className="p-6">Cargando...</div>;

  if (rol !== "directiva") {
    return (
      <div className="p-6 text-red-700 font-semibold">
        No tienes permisos para ver esta sección.
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Perfiles de usuarios</h1>

      {msg && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            tipo === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">RUT</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.nombre_completo || "—"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.rut || "—"}</td>
                <td className="p-3">{u.telefono || "—"}</td>
                <td className="p-3">
                  <span className="font-semibold">{u.rol}</span>
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      u.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.activo ? "Activo" : "Bloqueado"}
                  </span>
                </td>

                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => toggleActivo(u.id, u.activo)}
                    className={`px-3 py-1 rounded-lg text-white ${
                      u.activo
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>

                  {/* <button
                    onClick={() => toggleRol(u.id, u.rol)}
                    className="px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-black"
                  >
                    Cambiar rol
                  </button> */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <p className="p-4 text-center text-gray-500">
            No hay usuarios registrados.
          </p>
        )}
      </div>
    </div>
  );
}
