import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { formatRut } from "@/lib/rutUtils";



const calcularCategoria = (fechaNacimiento) => {
  if (!fechaNacimiento) return "";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }

  if (edad < 18) return "Menor de 18";
  if (edad <= 24) return "18-24";
  if (edad <= 29) return "25-29";
  if (edad <= 34) return "30-34";
  if (edad <= 39) return "35-39";
  if (edad <= 44) return "40-44";
  if (edad <= 49) return "45-49";
  if (edad <= 54) return "50-54";
  if (edad <= 59) return "55-59";
  if (edad <= 64) return "60-64";
  if (edad <= 69) return "65-69";
  if (edad <= 74) return "70-74";
  if (edad <= 79) return "75-79";
  return "80+";
};

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
        telefono: data.telefono || "+569", // ✅ Default prefix
        direccion: data.direccion || "",
        comuna: data.comuna || "Iquique", // Default Iquique
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

  const onChange = (k, v) => setForm((p) => {
    const newState = { ...p, [k]: v };

    // ✅ Auto-fill CuentaRUT if Banco Estado is selected
    if (k === "banco" && v === "Banco Estado") {
      // Extraer RUT sin dígito verificador y sin puntos
      const rutLimpio = p.rut.replace(/\./g, "").split("-")[0];
      if (rutLimpio) {
        newState.numero_cuenta = rutLimpio;
      }
    }
    return newState;
  });

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    // Validación de Email
    if (form.email && !form.email.endsWith("@gmail.com")) {
      setMsg("⚠️ El correo debe ser @gmail.com");
      setTipo("error");
      return;
    }

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

    <div className="max-w-[95%] mx-auto space-y-6 pb-8">
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configuración de Cuenta</h1>
          <p className="text-slate-500 text-sm font-medium">Gestiona tu información personal y bancaria</p>
        </div>
        <a
          href="https://drive.google.com/file/d/1CmP0ghICjEqGLuuwmswwNyQtxTq0hF0m/view?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-sky-50 text-sky-600 hover:bg-sky-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
        >
          <span className="w-5 h-5 bg-sky-600 text-white rounded-full flex items-center justify-center text-xs">?</span> Ayuda
        </a>
      </div>

      {/* Admin Search Bar */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl shadow-sm border border-cyan-100 p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-100 rounded-bl-full -z-10 opacity-50"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-cyan-700 uppercase tracking-widest flex items-center gap-2">
              <span className="text-lg">🔍</span> Buscar Socio
            </h3>
            {editingOtherUser && (
              <button
                type="button"
                onClick={resetToMyProfile}
                className="px-4 py-2 bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50 text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Volver a Mi Perfil
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Ingresa el RUT o Nombre para buscar..."
              value={searchRut}
              onChange={(e) => {
                const val = e.target.value;
                // Si empieza con número, asumimos que es RUT y formateamos. Si no, dejamos texto libre (nombre).
                if (/^\d/.test(val)) {
                  setSearchRut(formatRut(val));
                } else {
                  setSearchRut(val);
                }
              }}
              className="w-full border-none bg-white rounded-xl p-4 pl-5 shadow-sm ring-1 ring-cyan-200 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
              maxLength={40} // Aumentado para permitir nombres largos
            />

            {/* Search Results Dropdown */}
            {searchRut && searchRut.length >= 1 && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-64 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => selectUser(result.id)}
                      className="w-full text-left px-5 py-4 hover:bg-cyan-50/50 transition-colors border-b border-slate-50 last:border-b-0 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">{result.nombre_completo || "Sin nombre"}</div>
                        <div className="text-xs font-bold text-slate-400">RUT: {result.rut}</div>
                      </div>
                      <span className="text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-8 text-sm text-slate-400 text-center italic font-medium">
                    No se encontraron resultados...
                  </div>
                )}
              </div>
            )}
          </div>

          {editingOtherUser && (
            <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm border border-cyan-200 rounded-xl flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-xs font-bold text-cyan-800 uppercase tracking-wide">MODO EDICIÓN ADMIN</p>
                <p className="text-sm text-slate-600 font-medium">
                  Estás editando el perfil de: <span className="font-bold text-slate-900">{form.nombre_completo || form.rut}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {msg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${tipo === "error"
            ? "bg-rose-50 border-rose-100 text-rose-700"
            : "bg-emerald-50 border-emerald-100 text-emerald-700"
            }`}
        >
          <span className="text-xl">{tipo === "error" ? "🚨" : "✅"}</span>
          <span className="font-semibold">{msg}</span>
        </div>
      )}

      <form onSubmit={guardar} className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Información Personal (Takes 3 columns on large screens) */}
        <div className="xl:col-span-3 bg-white rounded-[1.5rem] shadow-sm ring-1 ring-slate-100 p-6">
          <h2 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
            Información Personal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nombre completo</label>
              <input
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all font-semibold text-slate-700 text-sm"
                value={form.nombre_completo}
                onChange={(e) => onChange("nombre_completo", e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">RUT</label>
              <input
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all font-bold text-slate-700 text-sm"
                value={form.rut}
                onChange={(e) => onChange("rut", formatRut(e.target.value))}
                placeholder="12.345.678-9"
                maxLength={12}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email</label>
              <div className="relative">
                <input
                  type="email"
                  className={`w-full bg-slate-50 border-none ring-1 rounded-xl p-2.5 focus:ring-2 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm ${form.email && !form.email.endsWith("@gmail.com")
                    ? "ring-amber-300 focus:ring-amber-500/30"
                    : "ring-slate-200 focus:ring-blue-500/30"
                    }`}
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="user@gmail.com"
                />
                {!form.email?.endsWith("@gmail.com") && form.email?.length > 0 && (
                  <div className="absolute right-2.5 top-2.5 text-amber-500 text-xs" title="Se recomienda usar @gmail.com">
                    ⚠️
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Teléfono</label>
              <input
                type="tel"
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all font-mono font-medium text-slate-700 text-sm"
                value={form.telefono}
                onChange={(e) => {
                  // Mantiene rigurosamente el +569
                  let raw = e.target.value.replace(/[^0-9]/g, '');

                  // Si el usuario borra todo o intenta borrar el 569, lo restauramos
                  if (!raw.startsWith('569')) {
                    raw = '569' + raw.replace(/^56?/, '');
                  }

                  // Limitar largo máximo si es necesario (ej: 569 + 8 dígitos = 11 chars)
                  if (raw.length > 11) raw = raw.slice(0, 11);

                  onChange("telefono", '+' + raw);
                }}
                onKeyDown={(e) => {
                  // Evitar borrar el prefijo con backspace si SOLO queda el prefijo (+569 son 4 chars)
                  if (e.key === 'Backspace' && e.target.value.length <= 4) {
                    e.preventDefault();
                  }
                }}
                maxLength={12} // +569 12345678 (12 chars)
                placeholder="+569"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Fecha nacimiento</label>
              <input
                type="date"
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm"
                value={form.fecha_nacimiento}
                onChange={(e) => onChange("fecha_nacimiento", e.target.value)}
                min="1920-01-01"
                max="2020-12-31"
              />
            </div>

            {/* ✅ Categoría Calculada */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Categoría</label>
              <input
                className="w-full bg-slate-100 border-none ring-1 ring-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-500 text-sm cursor-not-allowed"
                value={calcularCategoria(form.fecha_nacimiento)}
                readOnly
                placeholder="Calculada autom."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Talla</label>
              <select
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all appearance-none font-medium text-slate-700 text-sm"
                value={form.talla}
                onChange={(e) => onChange("talla", e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {["XS", "S", "M", "L", "XL", "XXL"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Dirección</label>
              <input
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm"
                value={form.direccion}
                onChange={(e) => onChange("direccion", e.target.value)}
                placeholder="Calle..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Comuna</label>
              <select
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all appearance-none font-medium text-slate-700 text-sm"
                value={form.comuna}
                onChange={(e) => onChange("comuna", e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {comunasTarapaca.map((comuna) => (
                  <option key={comuna} value={comuna}>{comuna}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Ingreso al Club</label>
              <input
                type="date"
                className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/30 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm"
                value={form.fecha_ingreso}
                onChange={(e) => onChange("fecha_ingreso", e.target.value)}
                min="2008-08-23"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        {/* Datos Bancarios & Save Button (Takes 1 column on large screens) */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-[1.5rem] shadow-sm ring-1 ring-slate-100 p-6 h-full">
            <h2 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
              Datos Bancarios
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Banco</label>
                <select
                  className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:bg-white outline-none transition-all appearance-none font-medium text-slate-700 text-sm"
                  value={form.banco}
                  onChange={(e) => onChange("banco", e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {bancosChile.map((banco) => (
                    <option key={banco} value={banco}>{banco}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">N° Cuenta</label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-cyan-500/30 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm"
                    value={form.numero_cuenta}
                    onChange={(e) => onChange("numero_cuenta", e.target.value)}
                    placeholder="1234..."
                  />
                </div>
                {form.banco === "Banco Estado" && (
                  <p className="text-[9px] font-extrabold text-cyan-600 mt-1.5 leading-tight">
                    * CuentaRUT: usar RUT sin dígito verif.
                  </p>
                )}
              </div>
            </div>
          </div>

          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <span>💾</span> Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
