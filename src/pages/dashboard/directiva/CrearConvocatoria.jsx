import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

const TIPOS = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "select", label: "Lista (Select)" },
  { value: "checkbox", label: "Checkbox" },
];

export default function CrearConvocatoria() {
  const { user } = useContext(AppContext);

  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ formulario
  const [club, setClub] = useState("");
  const [piscina, setPiscina] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [campos, setCampos] = useState([]);

  // ✅ listado convocatorias
  const [convocatorias, setConvocatorias] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // ✅ modo edición
  const [editId, setEditId] = useState(null); // si tiene valor => estamos editando

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  const setOk = (m) => {
    setMsg(m);
    setTipo("success");
  };
  const setErr = (m) => {
    setMsg(m);
    setTipo("error");
  };

  const resetForm = () => {
    setClub("");
    setPiscina("");
    setInicio("");
    setFin("");
    setCampos([]);
    setEditId(null);
  };

  // ✅ Cargar rol + convocatorias
  const loadAll = async () => {
    setLoading(true);
    setLoadingList(true);
    setMsg("");
    setTipo("");

    try {
      // 1) rol
      const { data: p, error: e0 } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (e0) throw e0;
      setRol(p.rol);

      // 2) convocatorias (todas o solo las del admin)
      const { data: cs, error: e1 } = await supabase
        .from("convocatorias")
        .select("id, club, piscina, fecha_inicio, fecha_fin, estado, campos, created_at, created_by")
        .order("created_at", { ascending: false });

      if (e1) throw e1;

      setConvocatorias(cs || []);
    } catch (err) {
      setErr(err?.message || "Error cargando datos.");
    } finally {
      setLoading(false);
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ campos dinámicos
  const addCampo = () => {
    setCampos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        key: "",
        label: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  };

  const delCampo = (id) => setCampos((prev) => prev.filter((c) => c.id !== id));
  const updateCampo = (id, patch) => {
    setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const camposValidados = useMemo(() => {
    const cleaned = campos
      .map((c) => ({
        id: c.id,
        key: (c.key || "").trim(),
        label: (c.label || "").trim(),
        type: c.type,
        required: !!c.required,
        options:
          c.type === "select"
            ? (c.options || []).map((x) => String(x).trim()).filter(Boolean)
            : [],
      }))
      .filter((c) => c.key && c.label);

    const keys = cleaned.map((c) => c.key);
    const unique = new Set(keys);
    const okUnique = unique.size === keys.length;

    return { cleaned, okUnique };
  }, [campos]);

  // ✅ Crear o Guardar Edición
  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    if (!club || !inicio || !fin) {
      setErr("Completa club, fecha inicio y fecha fin.");
      return;
    }

    if (!camposValidados.okUnique) {
      setErr("Las 'keys' de los campos deben ser únicas (sin repetir).");
      return;
    }

    const badSelect = camposValidados.cleaned.find(
      (c) => c.type === "select" && c.options.length === 0
    );
    if (badSelect) {
      setErr(`El campo "${badSelect.label}" es tipo Select y necesita opciones.`);
      return;
    }

    try {
      if (!editId) {
        // ✅ crear
        const { error } = await supabase.from("convocatorias").insert({
          club,
          piscina: piscina || null,
          fecha_inicio: inicio,
          fecha_fin: fin,
          estado: "abierta",
          created_by: user.id,
          campos: camposValidados.cleaned,
        });

        if (error) throw error;

        setOk("Convocatoria creada ✅");
        resetForm();
        await loadAll();
      } else {
        // ✅ actualizar
        const { error } = await supabase
          .from("convocatorias")
          .update({
            club,
            piscina: piscina || null,
            fecha_inicio: inicio,
            fecha_fin: fin,
            // estado: puedes mantenerlo o editarlo también
            campos: camposValidados.cleaned,
          })
          .eq("id", editId);

        if (error) throw error;

        setOk("Convocatoria actualizada ✅");
        resetForm();
        await loadAll();
      }
    } catch (err) {
      setErr(err?.message || "Error guardando convocatoria.");
    }
  };

  // ✅ Editar: cargar datos al formulario
  const editarConvocatoria = (c) => {
    setMsg("");
    setTipo("");
    setEditId(c.id);
    setClub(c.club || "");
    setPiscina(c.piscina || "");
    setInicio(c.fecha_inicio || "");
    setFin(c.fecha_fin || "");
    setCampos(Array.isArray(c.campos) ? c.campos : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Eliminar
  const eliminarConvocatoria = async (c) => {
    const ok = confirm(`¿Eliminar la convocatoria "${c.club}"? Esta acción no se puede deshacer.`);
    if (!ok) return;

    setMsg("");
    setTipo("");

    try {
      const { error } = await supabase.from("convocatorias").delete().eq("id", c.id);
      if (error) throw error;

      // si estabas editando esa misma, resetea
      if (editId === c.id) resetForm();

      setOk("Convocatoria eliminada ✅");
      await loadAll();
    } catch (err) {
      setErr(err?.message || "No se pudo eliminar.");
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (rol !== "directiva") return <div className="p-6 text-red-700 font-semibold">No tienes permisos.</div>;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {editId ? "Editar convocatoria" : "Crear convocatoria"}
        </h1>
        {editId && (
          <p className="text-sm text-gray-600 mt-1">
            Estás editando: <b>{club || "—"}</b>
          </p>
        )}
      </div>

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

      {/* ✅ FORM */}
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow p-6 space-y-6">
        {/* básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Club</label>
            <input
              className="w-full border rounded-lg p-3"
              value={club}
              onChange={(e) => setClub(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Piscina (opcional)</label>
            <input
              className="w-full border rounded-lg p-3"
              value={piscina}
              onChange={(e) => setPiscina(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Fecha inicio</label>
            <input
              type="date"
              className="w-full border rounded-lg p-3"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Fecha fin</label>
            <input
              type="date"
              className="w-full border rounded-lg p-3"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </div>
        </div>

        {/* dinámicos */}
        <div className="border rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Campos extra (personalizados)</h2>
            <button
              type="button"
              onClick={addCampo}
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900"
            >
              + Agregar campo
            </button>
          </div>

          {campos.length === 0 ? (
            <p className="text-sm text-gray-500 mt-3">No agregaste campos extra (opcional).</p>
          ) : (
            <div className="mt-4 space-y-4">
              {campos.map((c) => (
                <div key={c.id} className="border rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-1">
                      <label className="text-xs font-medium text-gray-600">Key (única)</label>
                      <input
                        className="w-full border rounded-lg p-2"
                        placeholder="ej: categoria"
                        value={c.key}
                        onChange={(e) => updateCampo(c.id, { key: e.target.value })}
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Sin espacios: usar_guion_bajo</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Etiqueta</label>
                      <input
                        className="w-full border rounded-lg p-2"
                        placeholder="Ej: Categoría"
                        value={c.label}
                        onChange={(e) => updateCampo(c.id, { label: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600">Tipo</label>
                      <select
                        className="w-full border rounded-lg p-2"
                        value={c.type}
                        onChange={(e) => updateCampo(c.id, { type: e.target.value })}
                      >
                        {TIPOS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!c.required}
                          onChange={(e) => updateCampo(c.id, { required: e.target.checked })}
                        />
                        Requerido
                      </label>

                      <button
                        type="button"
                        onClick={() => delCampo(c.id)}
                        className="ml-auto px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {c.type === "select" && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-600">
                        Opciones (separadas por coma)
                      </label>
                      <input
                        className="w-full border rounded-lg p-2"
                        placeholder="Ej: Infantil, Juvenil, Adulto"
                        value={(c.options || []).join(", ")}
                        onChange={(e) =>
                          updateCampo(c.id, {
                            options: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!camposValidados.okUnique && (
            <p className="text-sm text-red-600 mt-3">⚠️ Hay keys repetidas. Deben ser únicas.</p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
            {editId ? "Guardar cambios" : "Crear convocatoria"}
          </button>

          {editId && (
            <button
              type="button"
              onClick={() => resetForm()}
              className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg hover:bg-gray-300"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {/* ✅ LISTADO */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Convocatorias creadas</h2>
          <button
            type="button"
            onClick={loadAll}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
          >
            Recargar
          </button>
        </div>

        {loadingList ? (
          <div className="p-4 text-sm text-gray-500">Cargando lista...</div>
        ) : convocatorias.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No hay convocatorias todavía.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {convocatorias.map((c) => (
              <div
                key={c.id}
                className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{c.club}</p>
                  <p className="text-sm text-gray-600">
                    {c.piscina ? `${c.piscina} • ` : ""}
                    {c.fecha_inicio} → {c.fecha_fin} • <b>{c.estado}</b>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Campos extra: <b>{Array.isArray(c.campos) ? c.campos.length : 0}</b>
                  </p>
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => editarConvocatoria(c)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarConvocatoria(c)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
