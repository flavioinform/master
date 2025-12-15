import { useEffect,  useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { AppContext } from "@/context/AppContext";

export default function ConvocatoriasList() {
  const { user } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [inscritasSet, setInscritasSet] = useState(new Set());
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg("");

      try {
        // 1) cargar convocatorias
        const { data: convocatorias, error: e1 } = await supabase
          .from("convocatorias")
          .select("id, club, piscina, fecha_inicio, fecha_fin, estado, created_at")
          .order("created_at", { ascending: false });

        if (e1) throw e1;

        const list = convocatorias || [];
        setItems(list);

        // 2) cargar inscripciones del usuario para esas convocatorias
        if (user?.id && list.length) {
          const ids = list.map((c) => c.id);

          const { data: insc, error: e2 } = await supabase
            .from("inscripciones")
            .select("convocatoria_id")
            .eq("user_id", user.id)
            .in("convocatoria_id", ids);

          if (e2) throw e2;

          setInscritasSet(new Set((insc || []).map((x) => x.convocatoria_id)));
        } else {
          setInscritasSet(new Set());
        }
      } catch (err) {
        setMsg(err?.message || "Error cargando convocatorias.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Convocatorias</h1>

      {msg && (
        <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
          {msg}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay convocatorias todavía.</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const yaInscrito = inscritasSet.has(c.id);

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.club}</p>
                    {yaInscrito && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                        INSCRITO
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    {c.piscina ? `${c.piscina} • ` : ""}
                    {c.fecha_inicio} → {c.fecha_fin} • <b>{c.estado}</b>
                  </p>
                </div>

                {yaInscrito ? (
                  <button
                    disabled
                    className="shrink-0 px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed"
                  >
                    Ya inscrito
                  </button>
                ) : (
                  <Link
                    to={`/dashboard/convocatorias/${c.id}`}
                    className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Ver / Inscribirme
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
