import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function Historial() {
  const { user } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [inscripciones, setInscripciones] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setMsg("");

      const { data, error } = await supabase
        .from("inscripciones")
        .select("id, estado, created_at, convocatorias(id, club, piscina, fecha_inicio, fecha_fin, estado)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      setInscripciones(data || []);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  if (loading) return <div className="p-6">Cargando historial...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Historial de inscripciones</h1>

      {msg && (
        <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
          {msg}
        </div>
      )}

      {inscripciones.length === 0 ? (
        <div className="text-sm text-gray-500">Aún no tienes inscripciones.</div>
      ) : (
        <div className="space-y-3">
          {inscripciones.map((i) => (
            <div key={i.id} className="bg-white rounded-2xl shadow border p-5">
              <p className="font-semibold">{i.convocatorias?.club}</p>
              <p className="text-sm text-gray-600">
                {i.convocatorias?.fecha_inicio} → {i.convocatorias?.fecha_fin}
              </p>
              <p className="text-xs mt-2">
                Estado inscripción: <b className="uppercase">{i.estado}</b>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
