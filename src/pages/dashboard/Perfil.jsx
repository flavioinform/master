import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { formatRut } from "@/lib/rutUtils";

export default function Perfil() {
  const { user } = useContext(AppContext);

  const [form, setForm] = useState({
    nombre_completo: "",
    rut: "",
    fecha_nacimiento: "",
    telefono: "",
    direccion: "",
    comuna: "",
    fecha_ingreso: "",
    numero_cuenta: "",
    banco: "",
    email: "",
    talla: "",
  });

  const comunasTarapaca = [
    "Iquique",
    "Alto Hospicio",
    "Pozo Almonte",
    "Camiña",
    "Colchane",
    "Huara",
    "Pica"
  ];

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchRut, setSearchRut] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [editingOtherUser, setEditingOtherUser] = useState(false);

  const checkAdminRole = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    setIsAdmin(data?.rol === "directiva");
  };

  const load = async (userId = null) => {
    setLoading(true);
    setMsg("");
    setTipo("");

    const targetId = userId || user.id;
    setSelectedUserId(targetId);
    setEditingOtherUser(!!userId && userId !== user.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("nombre_completo,rut,fecha_nacimiento,telefono,direccion,comuna,fecha_ingreso,numero_cuenta,banco,email,talla")
      .eq("id", targetId)
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
        comuna: data.comuna || "",
        fecha_ingreso: data.fecha_ingreso || "",
        numero_cuenta: data.numero_cuenta || "",
        banco: data.banco || "",
        email: data.email || "",
        talla: data.talla || "",
      });
    }

    setLoading(false);
  };

  const searchUsers = async (rut) => {
    if (!rut || rut.length < 1) {
      setSearchResults([]);
      return;
    }

    // Limpiar el RUT de puntos y guiones para la búsqueda
    const cleanedRut = rut.replace(/\./g, '').replace(/-/g, '');

    console.log('🔍 Buscando:', { original: rut, cleaned: cleanedRut });

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre_completo, rut, email")
        .or(`rut.ilike.%${rut}%,rut.ilike.%${cleanedRut}%,nombre_completo.ilike.%${rut}%`)
        .limit(10);

      if (error) {
        console.error('❌ Error en búsqueda:', error);
        setSearchResults([]);
        return;
      }

      console.log('📊 Resultados encontrados:', data?.length || 0, data);
      setSearchResults(data || []);
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      setSearchResults([]);
    }
  };

  const selectUser = (userId) => {
    load(userId);
    setSearchRut("");
    setSearchResults([]);
  };

  const resetToMyProfile = () => {
    load(user.id);
    setSearchRut("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (user?.id) {
      checkAdminRole();
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAdmin && searchRut) {
        searchUsers(searchRut);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRut, isAdmin]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    const targetId = selectedUserId || user.id;

    // Limpiar datos: convertir strings vacíos a null para campos de fecha
    const cleanedForm = {
      ...form,
      fecha_nacimiento: form.fecha_nacimiento || null,
      fecha_ingreso: form.fecha_ingreso || null,
      perfil_completo: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(cleanedForm)
      .eq("id", targetId);

    if (error) {
      setMsg(error.message);
      setTipo("error");
      return;
    }

    setMsg(editingOtherUser ? "Perfil actualizado ✅" : "Configuración guardada ✅");
    setTipo("success");
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Configuración de Cuenta</h1>
        <a
          href="https://drive.google.com/file/d/1CmP0ghICjEqGLuuwmswwNyQtxTq0hF0m/view?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>?</span> Ayuda
        </a>
      </div>

      {/* Admin Search Bar */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl shadow-sm border border-cyan-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-cyan-900 uppercase tracking-wider">🔍 Buscar Socio (ADMIN)</h3>
            {editingOtherUser && (
              <button
                type="button"
                onClick={resetToMyProfile}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all"
              >
                Volver a Mi Perfil
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Ingresa el RUT para buscar..."
              value={searchRut}
              onChange={(e) => setSearchRut(formatRut(e.target.value))}
              className="w-full border border-cyan-300 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-semibold bg-white"
              maxLength={12}
            />

            {/* Search Results Dropdown */}
            {searchRut && searchRut.length >= 1 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-cyan-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {(() => {
                  console.log('🎨 Renderizando dropdown, resultados:', searchResults.length, searchResults);
                  return searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => selectUser(result.id)}
                        className="w-full text-left px-4 py-3 hover:bg-cyan-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="font-bold text-slate-900">{result.nombre_completo || "Sin nombre"}</div>
                        <div className="text-sm text-slate-600">RUT: {result.rut}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 text-center">
                      Buscando...
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {editingOtherUser && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-bold text-blue-900">
                ⚠️ Estás editando el perfil de: <span className="uppercase">{form.nombre_completo || form.rut}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {msg && (
        <div
          className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 duration-300 font-medium ${tipo === "error"
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
              <input
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.nombre_completo}
                onChange={(e) => onChange("nombre_completo", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Correo Electrónico</label>
              <input
                type="email"
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">RUT</label>
              <input
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.rut}
                onChange={(e) => onChange("rut", formatRut(e.target.value))}
                placeholder="12.345.678-9"
                maxLength={12}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Fecha nacimiento</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.fecha_nacimiento}
                onChange={(e) => onChange("fecha_nacimiento", e.target.value)}
                min="1920-01-01"
                max="2020-12-31"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Teléfono</label>
              <input
                type="tel"
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.telefono}
                onChange={(e) => onChange("telefono", e.target.value.replace(/[^0-9+]/g, ''))}
                maxLength={15}
                placeholder="+56912345678"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Talla Polera</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center]"
                value={form.talla}
                onChange={(e) => onChange("talla", e.target.value)}
              >
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
              <input
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.direccion}
                onChange={(e) => onChange("direccion", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Comuna</label>
              <select
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center]"
                value={form.comuna}
                onChange={(e) => onChange("comuna", e.target.value)}
              >
                <option value="">Selecciona tu comuna</option>
                {comunasTarapaca.map((comuna) => (
                  <option key={comuna} value={comuna}>{comuna}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Fecha de Ingreso al Club</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.fecha_ingreso}
                onChange={(e) => onChange("fecha_ingreso", e.target.value)}
                min="2008-08-23"
                max={new Date().toISOString().split('T')[0]}
              />
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
              <select
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center]"
                value={form.banco}
                onChange={(e) => onChange("banco", e.target.value)}
              >
                <option value="">Selecciona tu banco</option>
                {bancosChile.map((banco) => (
                  <option key={banco} value={banco}>{banco}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Número de Cuenta</label>
              <input
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                value={form.numero_cuenta}
                onChange={(e) => onChange("numero_cuenta", e.target.value)}
                placeholder="Número de cuenta bancaria"
              />
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

