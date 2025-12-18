import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { AppContext } from "@/context/AppContext";

export default function ConvocatoriasList() {
  const { user } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [enrolledSet, setEnrolledSet] = useState(new Set());
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg("");

      try {
        // 1) Load competitions (only open/published ones)
        const { data: competitions, error: e1 } = await supabase
          .from("competitions")
          .select("id, name, organizer, start_date, end_date, status")
          .in("status", ["open", "closed"]) // Show open and closed (but not draft)
          .order("start_date", { ascending: false });

        if (e1) throw e1;

        const list = competitions || [];
        setItems(list);

        // 2) Check which competitions user is enrolled in
        if (user?.id && list.length) {
          const compIds = list.map((c) => c.id);

          // Get unique competition IDs from enrollments
          const { data: enrollments, error: e2 } = await supabase
            .from("competition_enrollments")
            .select("event_id, competition_events!inner(stage_id, competition_stages!inner(competition_id))")
            .eq("user_id", user.id);

          if (e2) throw e2;

          // Extract competition IDs
          const enrolled = new Set();
          (enrollments || []).forEach(e => {
            const compId = e.competition_events?.competition_stages?.competition_id;
            if (compId) enrolled.add(compId);
          });

          setEnrolledSet(enrolled);
        } else {
          setEnrolledSet(new Set());
        }
      } catch (err) {
        setMsg(err?.message || "Error cargando competencias.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Competencias</h1>

      {msg && (
        <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
          {msg}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay competencias disponibles.</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const yaInscrito = enrolledSet.has(c.id);
            const isClosed = c.status === 'closed';

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.name}</p>
                    {yaInscrito && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                        INSCRITO
                      </span>
                    )}
                    {isClosed && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                        CERRADA
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    {c.organizer} • {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}
                  </p>
                </div>

                {yaInscrito || isClosed ? (
                  <Link
                    to={`/dashboard/convocatorias/${c.id}`}
                    className="shrink-0 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
                  >
                    Ver Detalles
                  </Link>
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
