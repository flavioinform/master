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
    <div className="max-w-6xl mx-auto space-y-10 font-sans pb-20">

      {/* Header - Clean Modern */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              <p className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">Eventos Deportivos</p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none mb-2">
              Próximas Competencias
            </h1>
            <p className="text-lg md:text-xl font-medium text-slate-400 max-w-xl">
              Explora y participa en los eventos más importantes del club.
            </p>
          </div>
          <div className="text-7xl opacity-10 blur-[1px] transform rotate-12 scale-150">🏆</div>
        </div>
      </div>

      {msg && (
        <div className="p-6 rounded-[1.5rem] border border-rose-100 bg-rose-50 text-rose-700 text-lg font-bold text-center animate-in zoom-in">
          {msg.toUpperCase()}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
          <p className="text-xl font-black text-slate-300 uppercase tracking-widest italic">No hay competencias disponibles en este momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {items.map((c) => {
            const yaInscrito = enrolledSet.has(c.id);
            const isClosed = c.status === 'closed';

            return (
              <div
                key={c.id}
                className={`group bg-white rounded-[2rem] border transition-all duration-300 p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-sm ${isClosed ? 'opacity-60 bg-slate-50' : 'border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1'}`}
              >
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-700 transition-colors">{c.name}</h2>
                    <div className="flex gap-2">
                      {yaInscrito && (
                        <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-wider shadow-sm animate-in fade-in slide-in-from-right-4">
                          Inscrito ✓
                        </span>
                      )}
                      {isClosed && (
                        <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-xl border border-slate-200 font-black text-[10px] uppercase tracking-wider shadow-sm">
                          Cerrada 🔒
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Organización</p>
                      <p className="text-base font-bold text-slate-700">{c.organizer}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100"></div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fechas</p>
                      <p className="text-sm font-bold text-slate-700">
                        {new Date(c.start_date).toLocaleDateString()} al {new Date(c.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    to={`/dashboard/convocatorias/${c.id}`}
                    className={`inline-block w-full lg:w-auto px-10 py-5 rounded-2xl font-black text-sm transition-all text-center uppercase tracking-widest shadow-lg active:scale-95 ${yaInscrito || isClosed
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                      : 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 shadow-blue-500/20'
                      }`}
                  >
                    {yaInscrito || isClosed ? "Ver Detalles" : "Inscribirme Ahora"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
