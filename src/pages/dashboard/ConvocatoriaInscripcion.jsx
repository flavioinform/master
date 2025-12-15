import { useEffect, useMemo, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

function toCSV(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export default function ConvocatoriaInscripcion() {
  const { id } = useParams();
  const { user } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [convocatoria, setConvocatoria] = useState(null);
  const [campos, setCampos] = useState([]);
  const [perfil, setPerfil] = useState(null);

  const [yaInscrito, setYaInscrito] = useState(false);
  const [inscripcionExistente, setInscripcionExistente] = useState(null);

  const [respuesta, setRespuesta] = useState({});
  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg("");
      setTipo("");

      try {
        if (!id) throw new Error("Falta ID en la ruta.");
        if (!user?.id) throw new Error("No hay sesión.");

        // ✅ 0) Ver si ya está inscrito
        const { data: insc, error: e0 } = await supabase
          .from("inscripciones")
          .select("id, estado, respuesta_campos, created_at")
          .eq("convocatoria_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (e0) throw e0;

        if (insc) {
          setYaInscrito(true);
          setInscripcionExistente(insc);
          if (insc.respuesta_campos) setRespuesta(insc.respuesta_campos);
        } else {
          setYaInscrito(false);
          setInscripcionExistente(null);
        }

        // 1) convocatoria
        const { data: c, error: e1 } = await supabase
          .from("convocatorias")
          .select("id, club, piscina, fecha_inicio, fecha_fin, estado, campos")
          .eq("id", id)
          .single();

        if (e1) throw e1;
        setConvocatoria(c);
        setCampos(Array.isArray(c?.campos) ? c.campos : []);

        // 2) perfil (✅ ahora incluye fecha_nacimiento y telefono)
        const { data: p, error: e2 } = await supabase
          .from("profiles")
          .select("id, nombre_completo, rut, email, fecha_nacimiento, telefono")
          .eq("id", user.id)
          .single();

        if (e2) throw e2;
        setPerfil(p);

        // 3) prefill (solo si NO hay inscripción previa o si falta)
        setRespuesta((prev) => ({
          ...prev,
          nombre_completo: prev?.nombre_completo ?? p?.nombre_completo ?? "",
          rut: prev?.rut ?? p?.rut ?? "",
          fecha_nacimiento: prev?.fecha_nacimiento ?? (p?.fecha_nacimiento ?? ""),
          telefono: prev?.telefono ?? (p?.telefono ?? ""),
        }));
      } catch (err) {
        setMsg(err?.message || "Error cargando convocatoria.");
        setTipo("error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, user?.id]);

  // ✅ ahora exige también fecha_nacimiento y telefono
  const perfilIncompleto = useMemo(() => {
    return (
      !perfil?.nombre_completo ||
      !perfil?.rut ||
      !perfil?.fecha_nacimiento ||
      !perfil?.telefono
    );
  }, [perfil]);

  const handleInputChange = (key, value) => {
    setRespuesta((prev) => ({ ...prev, [key]: value }));
  };

  const descargarFichaCSV = () => {
    const base = [
      ["convocatoria_id", convocatoria?.id],
      ["club", convocatoria?.club],
      ["fecha_inicio", convocatoria?.fecha_inicio],
      ["fecha_fin", convocatoria?.fecha_fin],
      ["nombre_completo", respuesta.nombre_completo],
      ["rut", respuesta.rut],
      ["fecha_nacimiento", respuesta.fecha_nacimiento],
      ["telefono", respuesta.telefono],
    ];

    const extra = (campos || []).map((c) => [c.key, respuesta[c.key] ?? ""]);
    const csv = toCSV([...base, ...extra]);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ficha_${convocatoria?.club || "convocatoria"}_${convocatoria?.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    if (yaInscrito) {
      setMsg("Ya estás inscrito en esta convocatoria.");
      setTipo("error");
      return;
    }

    if (perfilIncompleto) {
      setMsg("Tu perfil está incompleto (nombre, RUT, fecha nacimiento o teléfono). Completa tu perfil primero.");
      setTipo("error");
      return;
    }

    const faltan = (campos || [])
      .filter((c) => c.required)
      .filter((c) => {
        const v = respuesta[c.key];
        return v === undefined || v === null || String(v).trim() === "";
      });

    if (faltan.length) {
      setMsg(`Faltan campos requeridos: ${faltan.map((x) => x.label).join(", ")}`);
      setTipo("error");
      return;
    }

    const { error } = await supabase.from("inscripciones").insert({
      convocatoria_id: id,
      user_id: user.id,
      estado: "borrador",
      respuesta_campos: respuesta,
    });

    if (error) {
      setMsg(error.message);
      setTipo("error");
      return;
    }

    setMsg("Inscripción exitosa ✅");
    setTipo("success");
    setYaInscrito(true);
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!convocatoria) return <div className="p-6">No se encontró la convocatoria.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inscripción a Convocatoria</h1>
          <p className="text-sm text-gray-600">
            {convocatoria.club} • {convocatoria.fecha_inicio} → {convocatoria.fecha_fin}
          </p>
        </div>

        <button
          onClick={descargarFichaCSV}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
        >
          Descargar ficha (CSV)
        </button>
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

      {yaInscrito && (
        <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-green-700 text-sm">
          ✅ Ya estás inscrito en esta convocatoria.
          {inscripcionExistente?.created_at ? (
            <div className="text-xs mt-1 text-green-800">
              Fecha: {new Date(inscripcionExistente.created_at).toLocaleString()}
            </div>
          ) : null}
        </div>
      )}

      {perfilIncompleto && (
        <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
          Tu perfil está incompleto: falta nombre, RUT, fecha de nacimiento o teléfono. Completa tu perfil primero.
        </div>
      )}

      {yaInscrito ? null : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Nombre completo</label>
              <input
                className="w-full border p-3 rounded-lg bg-gray-50"
                value={respuesta.nombre_completo || ""}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium">RUT</label>
              <input
                className="w-full border p-3 rounded-lg bg-gray-50"
                value={respuesta.rut || ""}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Fecha de nacimiento</label>
              <input
                type="date"
                className="w-full border p-3 rounded-lg bg-gray-50"
                value={respuesta.fecha_nacimiento || ""}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Teléfono</label>
              <input
                className="w-full border p-3 rounded-lg bg-gray-50"
                value={respuesta.telefono || ""}
                readOnly
              />
            </div>
          </div>

          {(campos || []).map((campo) => (
            <div key={campo.id}>
              <label className="block text-sm font-medium">
                {campo.label} {campo.required ? <span className="text-red-600">*</span> : null}
              </label>

              {campo.type === "text" && (
                <input
                  className="w-full border p-3 rounded-lg"
                  value={respuesta[campo.key] || ""}
                  onChange={(e) => handleInputChange(campo.key, e.target.value)}
                />
              )}

              {campo.type === "number" && (
                <input
                  type="number"
                  className="w-full border p-3 rounded-lg"
                  value={respuesta[campo.key] ?? ""}
                  onChange={(e) => handleInputChange(campo.key, e.target.value)}
                />
              )}

              {campo.type === "date" && (
                <input
                  type="date"
                  className="w-full border p-3 rounded-lg"
                  value={respuesta[campo.key] || ""}
                  onChange={(e) => handleInputChange(campo.key, e.target.value)}
                />
              )}

              {campo.type === "select" && (
                <select
                  className="w-full border p-3 rounded-lg"
                  value={respuesta[campo.key] || ""}
                  onChange={(e) => handleInputChange(campo.key, e.target.value)}
                >
                  <option value="">Selecciona...</option>
                  {(campo.options || []).map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {campo.type === "checkbox" && (
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!respuesta[campo.key]}
                    onChange={(e) => handleInputChange(campo.key, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Sí</span>
                </label>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={perfilIncompleto}
            className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg hover:bg-blue-700 w-full"
          >
            Inscribirse
          </button>
        </form>
      )}
    </div>
  );
}
