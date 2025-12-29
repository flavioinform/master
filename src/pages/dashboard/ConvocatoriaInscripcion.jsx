import { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function ConvocatoriaInscripcion() {
  const { id } = useParams(); // Competition ID
  const { user } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stages, setStages] = useState([]);

  // Enrollment state
  const [selectedStages, setSelectedStages] = useState(new Set());
  const [selectedEvents, setSelectedEvents] = useState({}); // { eventId: { selected: bool, time: string } }
  const [expandedStages, setExpandedStages] = useState(new Set());

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg("");
      setTipo("");

      try {
        if (!id) throw new Error("Falta ID de competencia.");
        if (!user?.id) throw new Error("No hay sesión.");

        // 1) Load Competition
        const { data: comp, error: e1 } = await supabase
          .from("competitions")
          .select("*")
          .eq("id", id)
          .single();

        if (e1) throw e1;
        setCompetition(comp);

        // 2) Load Profile
        const { data: prof, error: e2 } = await supabase
          .from("profiles")
          .select("id, nombre_completo, rut, telefono, fecha_nacimiento, talla")
          .eq("id", user.id)
          .single();

        if (e2) throw e2;
        setProfile(prof);

        // 3) Load Stages with Events
        const { data: stgs, error: e3 } = await supabase
          .from("competition_stages")
          .select(`
            *,
            competition_events (
              id, event_number,
              event_catalog (
                id, name, style, distance, category
              )
            )
          `)
          .eq("competition_id", id)
          .order("date", { ascending: true });

        if (e3) throw e3;

        // Sort events within stages
        const sortedStages = (stgs || []).map(stage => ({
          ...stage,
          competition_events: (stage.competition_events || []).sort((a, b) => a.event_number - b.event_number)
        }));

        setStages(sortedStages);

        // 4) Load existing enrollments for this user
        const { data: enrollments, error: e4 } = await supabase
          .from("competition_enrollments")
          .select(`
            id, event_id, entry_time, result_time, status,
            competition_events!inner(
              id, stage_id
            )
          `)
          .eq("user_id", user.id);

        if (e4) throw e4;

        // Pre-fill selections
        const evtMap = {};
        const stgSet = new Set();

        (enrollments || []).forEach(enr => {
          const eventId = enr.event_id;
          const stageId = enr.competition_events?.stage_id;

          evtMap[eventId] = {
            selected: true,
            time: enr.entry_time || "",
            resultTime: enr.result_time || "",
            enrollmentId: enr.id
          };

          if (stageId) stgSet.add(stageId);
        });

        setSelectedEvents(evtMap);
        setSelectedStages(stgSet);

      } catch (err) {
        setMsg(err?.message || "Error cargando competencia.");
        setTipo("error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, user?.id]);

  const toggleStage = (stageId) => {
    setSelectedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
        // Also unselect all events in this stage
        const stage = stages.find(s => s.id === stageId);
        if (stage) {
          const newEvts = { ...selectedEvents };
          stage.competition_events.forEach(evt => {
            delete newEvts[evt.id];
          });
          setSelectedEvents(newEvts);
        }
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev => ({
      ...prev,
      [eventId]: prev[eventId]?.selected
        ? { ...prev[eventId], selected: false }
        : { selected: true, time: prev[eventId]?.time || "", enrollmentId: prev[eventId]?.enrollmentId }
    }));
  };

  const updateTime = (eventId, minutes, seconds, ms) => {
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    setSelectedEvents(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], time: timeString }
    }));
  };

  const updateResult = (eventId, minutes, seconds, ms) => {
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    setSelectedEvents(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], resultTime: timeString }
    }));
  };

  const parseTime = (timeString) => {
    if (!timeString) return { minutes: 0, seconds: 0, ms: 0 };
    // standard format: MM:SS.CC or legacy MM:SS
    const normalized = timeString.replace('.', ':');
    const parts = normalized.split(':');
    return {
      minutes: parseInt(parts[0] || 0),
      seconds: parseInt(parts[1] || 0),
      ms: parseInt(parts[2] || 0)
    };
  };

  // Styles for printing the "Ficha"
  const printStyles = `
    @media print {
      body * { visibility: hidden; }
      #print-ficha, #print-ficha * { visibility: visible; }
      #print-ficha {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 40px;
        background: white !important;
        display: block !important; /* Ensure it shows even if class is 'hidden' */
      }
      .no-print { display: none !important; }
    }
  `;

  const handleSave = async (submit = false) => {
    setSaving(true);
    setMsg("");
    setTipo("");

    try {
      // Get all selected events
      const toEnroll = Object.entries(selectedEvents)
        .filter(([_, data]) => data.selected)
        .map(([eventId, data]) => ({
          event_id: eventId,
          user_id: user.id,
          entry_time: data.time || null,
          result_time: data.resultTime || null,
          status: submit ? "confirmed" : "pending",
          enrollmentId: data.enrollmentId
        }));

      // Get all currently enrolled event IDs
      const currentEnrollments = Object.entries(selectedEvents)
        .filter(([_, data]) => data.enrollmentId)
        .map(([eventId, _]) => eventId);

      // Delete enrollments that are no longer selected
      const toDelete = currentEnrollments.filter(eventId => !selectedEvents[eventId]?.selected);

      if (toDelete.length > 0) {
        const deleteIds = toDelete.map(eventId => selectedEvents[eventId].enrollmentId).filter(Boolean);
        if (deleteIds.length > 0) {
          const { error: delError } = await supabase
            .from("competition_enrollments")
            .delete()
            .in("id", deleteIds);

          if (delError) throw delError;
        }
      }

      // Upsert new/updated enrollments
      if (toEnroll.length > 0) {
        const records = toEnroll.map(e => ({
          user_id: e.user_id,
          event_id: e.event_id,
          entry_time: e.entry_time,
          result_time: e.result_time,
          status: e.status
        }));

        const { error: upsertError } = await supabase
          .from("competition_enrollments")
          .upsert(records, { onConflict: "user_id,event_id" });

        if (upsertError) throw upsertError;
      }

      setMsg(submit ? "✅ Inscripción enviada correctamente" : "✅ Cambios guardados");
      setTipo("success");

      // Reload to refresh enrollment IDs
      setTimeout(() => window.location.reload(), 1500);

    } catch (err) {
      setMsg("Error: " + err.message);
      setTipo("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!competition) return <div className="p-6">Competencia no encontrada.</div>;

  const profileIncomplete = !profile?.nombre_completo || !profile?.rut || !profile?.fecha_nacimiento || !profile?.telefono;

  return (
    <div className="max-w-6xl mx-auto space-y-10 font-sans pb-20">
      <style>{printStyles}</style>

      {/* Header - Clean Modern */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 text-white relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex-1 space-y-4">
            <Link to="/dashboard/convocatorias" className="inline-block bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-xs font-black transition-all uppercase mb-4 backdrop-blur-sm border border-white/20 tracking-widest">
              ← Volver a lista
            </Link>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none mb-2">
              {competition.name}
            </h1>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              <p className="text-lg md:text-xl font-medium text-slate-400 uppercase tracking-widest">
                {competition.organizer} • {new Date(competition.start_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="group relative overflow-hidden bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/10 active:scale-95 whitespace-nowrap"
          >
            <span className="relative z-10 flex items-center gap-2 uppercase tracking-tight">
              <span className="text-2xl">📥</span> Descargar Ficha
            </span>
            <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0"></div>
          </button>
        </div>
      </div>

      {/* Printable Ficha Card (Clean Modern PRINT VERSION) */}
      <div id="print-ficha" className="hidden">
        <div className="border border-slate-200 p-16 rounded-[4rem] bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-slate-900/5 rounded-full -mr-40 -mt-40"></div>

          <div className="flex justify-between items-start mb-16 border-b border-slate-100 pb-12 relative z-10">
            <div>
              <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase mb-2 leading-none">Ficha de Atleta</h1>
              <p className="text-2xl font-black text-slate-400 tracking-widest uppercase">{competition.name}</p>
            </div>
            <div className="text-right">
              <div className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xl uppercase tracking-widest">
                RUT: {profile?.rut}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-16 relative z-10">
            <div className="space-y-12">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">NOMBRE COMPLETO</label>
                <p className="text-4xl font-black text-slate-900 leading-tight uppercase">{profile?.nombre_completo}</p>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">RUT IDENTIDAD</label>
                  <p className="text-2xl font-black text-slate-900">{profile?.rut}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">Talla Polera</label>
                  <p className="text-2xl font-black text-slate-900 uppercase">{profile?.talla || "—"}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-12 rounded-[3.5rem] border border-slate-100">
              <h3 className="font-black text-slate-900 uppercase tracking-[0.3em] text-xl mb-10 border-b border-slate-200 pb-6">Pruebas Inscritas</h3>
              <div className="space-y-8">
                {stages.map(stage => {
                  const stageEvents = stage.competition_events.filter(evt => selectedEvents[evt.id]?.selected);
                  if (stageEvents.length === 0) return null;
                  return (
                    <div key={stage.id} className="space-y-4">
                      <p className="text-sm font-black text-blue-600 uppercase tracking-[0.2em]">{stage.name}</p>
                      {stageEvents.map(evt => (
                        <div key={evt.id} className="flex justify-between items-center py-6 border-b border-slate-100 last:border-0">
                          <span className="text-xl font-black text-slate-700 uppercase">#{evt.event_number} {evt.event_catalog?.name}</span>
                          <span className="text-2xl font-black text-slate-900 bg-white px-5 py-2 rounded-xl border border-slate-200">
                            {selectedEvents[evt.id]?.time || "-- : --"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-20 flex items-center justify-between border-t border-slate-100 pt-10">
            <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Generado por Club Master System</p>
            <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-6 rounded-[1.5rem] border text-lg font-bold text-center animate-in zoom-in duration-300 ${tipo === "error" ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
          {msg.toUpperCase()}
        </div>
      )}

      {profileIncomplete && (
        <div className="p-6 rounded-[1.5rem] bg-rose-50 border border-rose-100 text-rose-700 text-lg font-black uppercase text-center animate-pulse">
          🚨 Tu perfil está incompleto. Por favor, actualiza tus datos antes de inscribirte.
        </div>
      )}

      {/* User Info (Read-only) - Clean Modern */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-10">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black">
            ID
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Datos del Atleta</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold text-slate-900 uppercase text-lg">
              {profile?.nombre_completo || ""}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">RUT Identidad</label>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold text-slate-900 text-lg uppercase">
              {profile?.rut || ""}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fecha de Nacimiento</label>
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold text-slate-900 text-lg uppercase tracking-widest">
              {profile?.fecha_nacimiento || ""}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Talla Polera</label>
            <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-5 font-black text-xl text-blue-600 uppercase text-center">
              {profile?.talla || "S/N"}
            </div>
          </div>
        </div>
      </div>

      {/* Stages & Events - Clean Modern */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-10">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black">
            02
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Selecciona tus Pruebas</h3>
        </div>

        {stages.length === 0 ? (
          <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
            <p className="text-xl text-slate-300 font-bold uppercase italic tracking-widest">No hay etapas configuradas</p>
          </div>
        ) : (
          <div className="space-y-6">
            {stages.map(stage => {
              const isStageSelected = selectedStages.has(stage.id);
              const isExpanded = expandedStages.has(stage.id);

              return (
                <div key={stage.id} className={`border rounded-[2rem] overflow-hidden transition-all duration-300 ${isStageSelected ? 'border-blue-200 shadow-md shadow-blue-500/5' : 'border-slate-100'}`}>
                  {/* Stage Header */}
                  <div className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors ${isStageSelected ? 'bg-blue-50/30' : 'bg-white'}`}>
                    <div className="flex items-center gap-6 flex-1">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isStageSelected}
                          onChange={() => toggleStage(stage.id)}
                          className="h-8 w-8 rounded-lg border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-500/10 cursor-pointer appearance-none border checked:bg-blue-600 checked:border-blue-600 transition-all"
                          disabled={profileIncomplete}
                        />
                        {isStageSelected && <span className="absolute inset-0 flex items-center justify-center text-white pointer-events-none text-xs font-black">✓</span>}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{stage.name}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">
                          {new Date(stage.date).toLocaleDateString()} • {stage.pool_type} • {stage.location}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedStages(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(stage.id)) newSet.delete(stage.id);
                        else newSet.add(stage.id);
                        return newSet;
                      })}
                      className={`px-6 py-3 rounded-xl text-xs font-black uppercase border transition-all ${isStageSelected ? 'bg-white border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-300'}`}
                    >
                      {isExpanded ? "▲ Contraer" : "▼ Ver Pruebas"}
                    </button>
                  </div>

                  {/* Events List (Accordion) */}
                  {isExpanded && (
                    <div className="p-8 bg-white border-t border-slate-50 space-y-6 animate-in slide-in-from-top-4 duration-300">
                      {!isStageSelected && (
                        <div className="bg-blue-50 text-blue-600 p-4 rounded-xl text-xs font-bold text-center uppercase tracking-widest border border-blue-100">
                          Marca la etapa arriba para habilitar la selección de pruebas
                        </div>
                      )}
                      {stage.competition_events.length === 0 ? (
                        <p className="text-sm text-slate-400 font-bold italic text-center py-6">Sin pruebas asignadas.</p>
                      ) : (
                        <div className={`space-y-4 ${!isStageSelected ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                          {stage.competition_events.map(evt => {
                            const eventData = selectedEvents[evt.id] || { selected: false, time: "" };

                            return (
                              <div key={evt.id} className={`p-6 rounded-2xl border transition-all flex flex-col xl:flex-row xl:items-center gap-6 ${eventData.selected ? 'border-blue-600 bg-blue-50/20' : 'border-slate-50 bg-white hover:border-slate-200'}`}>
                                <div className="flex items-center gap-5 flex-1">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={eventData.selected}
                                      onChange={() => toggleEvent(evt.id)}
                                      className="h-6 w-6 border border-slate-200 rounded-md cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-all"
                                    />
                                    {eventData.selected && <span className="absolute inset-0 flex items-center justify-center text-white pointer-events-none text-[10px] font-black">✓</span>}
                                  </div>
                                  <div className="flex-1 space-y-0.5">
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                      #{evt.event_number} - {evt.event_catalog?.name}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                      {evt.event_catalog?.distance}M {evt.event_catalog?.style}
                                    </p>
                                  </div>
                                </div>

                                {eventData.selected && (
                                  <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                                    {/* Entry Time Selection */}
                                    <div className="space-y-3 w-full md:w-auto">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Tiempo de Inscripción</label>
                                      <div className="flex gap-2 items-center justify-center">
                                        <div className="flex flex-col items-center">
                                          <select
                                            className="border border-slate-100 rounded-lg p-2 text-lg font-black bg-slate-50 w-16 outline-none focus:border-blue-600 transition-all appearance-none text-center"
                                            value={parseTime(eventData.time).minutes}
                                            onChange={(e) => updateTime(evt.id, parseInt(e.target.value), parseTime(eventData.time).seconds, parseTime(eventData.time).ms)}
                                          >
                                            {Array.from({ length: 60 }, (_, i) => (<option key={i} value={i}>{i}</option>))}
                                          </select>
                                          <span className="text-[8px] font-black mt-1 uppercase text-slate-300 tracking-tighter">min</span>
                                        </div>
                                        <span className="text-lg font-black text-slate-200">:</span>
                                        <div className="flex flex-col items-center">
                                          <select
                                            className="border border-slate-100 rounded-lg p-2 text-lg font-black bg-slate-50 w-16 outline-none focus:border-blue-600 transition-all appearance-none text-center"
                                            value={parseTime(eventData.time).seconds}
                                            onChange={(e) => updateTime(evt.id, parseTime(eventData.time).minutes, parseInt(e.target.value), parseTime(eventData.time).ms)}
                                          >
                                            {Array.from({ length: 60 }, (_, i) => (<option key={i} value={i}>{i}</option>))}
                                          </select>
                                          <span className="text-[8px] font-black mt-1 uppercase text-slate-300 tracking-tighter">seg</span>
                                        </div>
                                        <span className="text-lg font-black text-slate-200">.</span>
                                        <div className="flex flex-col items-center">
                                          <select
                                            className="border border-slate-100 rounded-lg p-2 text-lg font-black bg-slate-50 w-16 outline-none focus:border-blue-600 transition-all appearance-none text-center"
                                            value={parseTime(eventData.time).ms}
                                            onChange={(e) => updateTime(evt.id, parseTime(eventData.time).minutes, parseTime(eventData.time).seconds, parseInt(e.target.value))}
                                          >
                                            {Array.from({ length: 100 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, '0')}</option>))}
                                          </select>
                                          <span className="text-[8px] font-black mt-1 uppercase text-slate-300 tracking-tighter">mil</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="hidden md:block w-px h-10 bg-slate-100"></div>

                                    {/* Result Time Selection (Si existe) */}
                                    <div className="space-y-3 w-full md:w-auto">
                                      <label className="block text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] text-center">Tiempo Final (Post-Comp)</label>
                                      <div className="flex gap-2 items-center justify-center">
                                        <div className="flex flex-col items-center">
                                          <select
                                            className="border border-blue-50 rounded-lg p-2 text-sm font-black bg-blue-50/50 text-blue-600 w-14 outline-none appearance-none text-center"
                                            value={parseTime(eventData.resultTime).minutes}
                                            onChange={(e) => updateResult(evt.id, parseInt(e.target.value), parseTime(eventData.resultTime).seconds, parseTime(eventData.resultTime).ms)}
                                          >
                                            {Array.from({ length: 60 }, (_, i) => (<option key={i} value={i}>{i}</option>))}
                                          </select>
                                        </div>
                                        <span className="text-sm font-black text-blue-200">:</span>
                                        <div className="flex flex-col items-center">
                                          <select
                                            className="border border-blue-50 rounded-lg p-2 text-sm font-black bg-blue-50/50 text-blue-600 w-14 outline-none appearance-none text-center"
                                            value={parseTime(eventData.resultTime).seconds}
                                            onChange={(e) => updateResult(evt.id, parseTime(eventData.resultTime).minutes, parseInt(e.target.value), parseTime(eventData.resultTime).ms)}
                                          >
                                            {Array.from({ length: 60 }, (_, i) => (<option key={i} value={i}>{i}</option>))}
                                          </select>
                                        </div>
                                        <span className="text-sm font-black text-blue-200">.</span>
                                        <div className="flex flex-col items-center">
                                          <select
                                            className="border border-blue-50 rounded-lg p-2 text-sm font-black bg-blue-50/50 text-blue-600 w-14 outline-none appearance-none text-center"
                                            value={parseTime(eventData.resultTime).ms}
                                            onChange={(e) => updateResult(evt.id, parseTime(eventData.resultTime).minutes, parseTime(eventData.resultTime).seconds, parseInt(e.target.value))}
                                          >
                                            {Array.from({ length: 100 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, '0')}</option>))}
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons - Clean Modern */}
      {!profileIncomplete && (
        <div className="flex flex-col md:flex-row gap-6 p-10 bg-slate-900 border border-slate-800 rounded-[3rem] shadow-xl shadow-slate-200/50">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-8 rounded-2xl font-black text-xl border border-white/20 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest"
          >
            {saving ? "Guardando..." : "1. Guardar Borrador"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-8 rounded-2xl font-black text-xl shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest border border-blue-500"
          >
            {saving ? "Enviando..." : "2. Enviar Inscripción"}
          </button>
        </div>
      )}
    </div>
  );
}
