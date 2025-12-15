import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function Perfil() {
  const { user } = useContext(AppContext);

  const [form, setForm] = useState({
    nombre_completo: "",
    rut: "",
    fecha_nacimiento: "",
    telefono: "",
    direccion: "",
  });

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    setTipo("");

    const { data, error } = await supabase
      .from("profiles")
      .select("nombre_completo,rut,fecha_nacimiento,telefono,direccion")
      .eq("id", user.id)
      .single();

    if (error) {
      setMsg(error.message);
      setTipo("error");
    } else if (data) {
      setForm({
        nombre_completo: data.nombre_completo || "",
        rut: data.rut || "",
        fecha_nacimiento: data.fecha_nacimiento || "",
        telefono: data.telefono || "",
        direccion: data.direccion || "",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    const { error } = await supabase
      .from("profiles")
      .update({
        ...form,
        perfil_completo: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMsg(error.message);
      setTipo("error");
      return;
    }

    setMsg("Perfil guardado ✅");
    setTipo("success");
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

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

      <form onSubmit={guardar} className="bg-white rounded-2xl shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Nombre completo</label>
          <input className="w-full border rounded-lg p-3" value={form.nombre_completo}
            onChange={(e) => onChange("nombre_completo", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">RUT</label>
          <input className="w-full border rounded-lg p-3" value={form.rut}
            onChange={(e) => onChange("rut", e.target.value)} placeholder="Sin puntos y sin guión" />
        </div>

        <div>
          <label className="text-sm font-medium">Fecha nacimiento</label>
          <input type="date" className="w-full border rounded-lg p-3" value={form.fecha_nacimiento}
            onChange={(e) => onChange("fecha_nacimiento", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Teléfono</label>
          <input className="w-full border rounded-lg p-3" value={form.telefono}
            onChange={(e) => onChange("telefono", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Dirección</label>
          <input className="w-full border rounded-lg p-3" value={form.direccion}
            onChange={(e) => onChange("direccion", e.target.value)} />
        </div>

        <button className="md:col-span-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
