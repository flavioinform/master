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
    numero_cuenta: "",
    banco: "",
    email: "",
    talla: "",
  });

  const bancosChile = [
    "Banco de Chile",
    "Banco Estado",
    "Banco Santander",
    "Banco BCI",
    "Banco Scotiabank",
    "Banco Itaú",
    "Banco Security",
    "Banco Falabella",
    "Banco Ripley",
    "Banco Consorcio",
    "Banco Internacional",
    "Banco BICE",
    "Banco BTG Pactual",
    "Coopeuch",
    "Otro"
  ];

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    setTipo("");

    const { data, error } = await supabase
      .from("profiles")
      .select("nombre_completo,rut,fecha_nacimiento,telefono,direccion,numero_cuenta,banco,email,talla")
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
        numero_cuenta: data.numero_cuenta || "",
        banco: data.banco || "",
        email: data.email || "",
        talla: data.talla || "",
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

    setMsg("Configuración guardada ✅");
    setTipo("success");
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 border-b pb-4">Configuración de Cuenta</h1>

      {msg && (
        <div
          className={`p-4 rounded-xl border-2 animate-in fade-in slide-in-from-top-4 duration-300 font-medium ${tipo === "error"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-green-50 border-green-200 text-green-700"
            }`}
        >
          {msg}
        </div>
      )}

      <form onSubmit={guardar} className="space-y-6">
        {/* Información Personal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            Información Personal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Nombre completo</label>
              <input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.nombre_completo}
                onChange={(e) => onChange("nombre_completo", e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Correo Electrónico</label>
              <input type="email" className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="usuario@ejemplo.com" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">RUT</label>
              <input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.rut}
                onChange={(e) => onChange("rut", e.target.value)} placeholder="Sin puntos y sin guión" />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Fecha nacimiento</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.fecha_nacimiento}
                onChange={(e) => onChange("fecha_nacimiento", e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Teléfono</label>
              <input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.telefono}
                onChange={(e) => onChange("telefono", e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Talla Polera</label>
              <select className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center]"
                value={form.talla}
                onChange={(e) => onChange("talla", e.target.value)}>
                <option value="">Selecciona tu talla</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Dirección</label>
              <input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.direccion}
                onChange={(e) => onChange("direccion", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Datos Bancarios */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
            Datos Bancarios (Para Reembolsos)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Banco</label>
              <select className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center]"
                value={form.banco}
                onChange={(e) => onChange("banco", e.target.value)}>
                <option value="">Selecciona tu banco</option>
                {bancosChile.map(banco => (
                  <option key={banco} value={banco}>{banco}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Número de Cuenta</label>
              <input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.numero_cuenta}
                onChange={(e) => onChange("numero_cuenta", e.target.value)} placeholder="Número de cuenta bancaria" />
            </div>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-lg">
          Guardar Cambios
        </button>
      </form>
    </div>
  );
}

