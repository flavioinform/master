import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function ConvocatoriaInscripcion() {
  const { id: convocatoriaId } = useParams();
  const { user } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [convocatoria, setConvocatoria] = useState(null);
  const [campos, setCampos] = useState([]);
  const [respuesta, setRespuesta] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!convocatoriaId || !user?.id) return;

      setLoading(true);
      setMsg("");

      // 1) cargar convocatoria (con campos dinámicos)
      const { data: conv, error: e1 } = await supabase
        .from("convocatorias")
        .select("id, club, piscina, fecha_inicio, fecha_fin, estado, campos")
        .eq("id", convocatoriaId)
        .single();

      if (e1) {
        setMsg("No se pudo cargar la convocatoria. Revisa el ID o permisos (RLS).");
        setLoading(false);
        return;
      }

      setConvocatoria(conv);
      setCampos(Array.isArray(conv.campos) ? conv.campos : []);

      // 2) cargar profile del usuario (nombre y rut)
      const { data: prof, error: e2 } = await supabase
        .from("profiles")
        .select("nombre_completo, rut")
        .eq("id", user.id)
        .single();

      if (e2) {
        setMsg("No se pudo cargar tu perfil (nombre/rut). Completa tu perfil primero.");
      }

      setRespuesta((prev) => ({
        ...prev,
        nombre_completo: prof?.nombre_completo || "",
        rut: prof?.rut || "",
      }));

      setLoading(false);
    };

    run();
  }, [convocatoriaId, user?.id]);

  const handleInputChange = (key, value) => {
    setRespuesta((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    // Si tu tabla "inscripciones" ya tiene la columna de "respuesta_campos"
    const { error } = await supabase.from("inscripciones").insert({
      convocatoria_id: convocatoriaId,
      user_id: user.id,
      respuesta_campos: respuesta, // Se guarda el objeto con las respuestas
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Inscripción exitosa ✅");
  };

  if (!convocatoriaId) return <div className="p-6">Falta ID en la ruta.</div>;
  if (loading) return <div className="p-6">Cargando...</div>;

  if (!convocatoria) return <div className="p-6">No existe la convocatoria.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Inscripción a Convocatoria</h1>

      {msg && (
        <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800 text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow">
        <div>
          <label className="block text-sm font-medium">Nombre completo</label>
          <input
            type="text"
            value={respuesta.nombre_completo || ""}
            className="w-full border p-3 rounded-lg bg-gray-50"
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium">RUT</label>
          <input
            type="text"
            value={respuesta.rut || ""}
            className="w-full border p-3 rounded-lg bg-gray-50"
            readOnly
          />
        </div>

        {campos.map((campo) => (
          <div key={campo.key || campo.id}>
            <label className="block text-sm font-medium">{campo.label}</label>

            {campo.type === "text" && (
              <input
                type="text"
                value={respuesta[campo.key] || ""}
                onChange={(e) => handleInputChange(campo.key, e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
            )}

            {campo.type === "select" && (
              <select
                value={respuesta[campo.key] || ""}
                onChange={(e) => handleInputChange(campo.key, e.target.value)}
                className="w-full border p-3 rounded-lg"
              >
                <option value="">Selecciona...</option>
                {(campo.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {campo.type === "date" && (
              <input
                type="date"
                value={respuesta[campo.key] || ""}
                onChange={(e) => handleInputChange(campo.key, e.target.value)}
                className="w-full border p-3 rounded-lg"
              />
            )}
          </div>
        ))}

        <button type="submit" className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 w-full">
          Inscribirse
        </button>
      </form>
    </div>
  );
}
