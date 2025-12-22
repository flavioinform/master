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
    <div className="max-w-5xl mx-auto space-y-6">
      <style>{printStyles}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
        <div className="flex-1">
          <Link to="/dashboard/convocatorias" className="text-sm text-blue-600 hover:underline">← Volver a Lista</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{competition.name}</h1>
          <p className="text-gray-500">{competition.organizer} • {new Date(competition.start_date).toLocaleDateString()} al {new Date(competition.end_date).toLocaleDateString()}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
        >
          <span>📥</span> Descargar Ficha
        </button>
      </div>

      {/* Printable Ficha Card (Hidden by default, visible on print) */}
      <div id="print-ficha" className="hidden">
        <div className="border-[6px] border-slate-900 p-10 rounded-[40px] bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900/5 rounded-full -mr-32 -mt-32"></div>

          <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8 relative z-10">
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-2">Ficha de Atleta</h1>
              <p className="text-xl font-bold text-slate-500 tracking-widest uppercase">{competition.name}</p>
            </div>
            <div className="text-right">
              <div className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest">
                ID: {profile?.rut}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 relative z-10">
            <div className="space-y-8">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre Completo</label>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{profile?.nombre_completo}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">RUT</label>
                  <p className="text-xl font-bold text-slate-900">{profile?.rut}</p>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Talla</label>
                  <p className="text-xl font-bold text-slate-900">{profile?.talla || "—"}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-200">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm mb-6 border-b border-slate-200 pb-3">Pruebas Inscritas</h3>
              <div className="space-y-4">
                {stages.map(stage => {
                  const stageEvents = stage.competition_events.filter(evt => selectedEvents[evt.id]?.selected);
                  if (stageEvents.length === 0) return null;
                  return (
                    <div key={stage.id}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stage.name}</p>
                      {stageEvents.map(evt => (
                        <div key={evt.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                          <span className="text-sm font-bold text-slate-800">#{evt.event_number} {evt.event_catalog?.name}</span>
                          <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                            {selectedEvents[evt.id]?.time || "--:--"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between opacity-30">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Generado por Club Master System</p>
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg border text-sm ${tipo === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
          }`}>
          {msg}
        </div>
      )}

      {profileIncomplete && (
        <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
          Tu perfil está incompleto. Completa tu nombre, RUT, fecha de nacimiento y teléfono en tu perfil antes de inscribirte.
        </div>
      )}

      {/* User Info (Read-only) */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Tus Datos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Nombre Completo</label>
            <input className="w-full border rounded p-2 bg-gray-50" value={profile?.nombre_completo || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">RUT</label>
            <input className="w-full border rounded p-2 bg-gray-50" value={profile?.rut || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Fecha de Nacimiento</label>
            <input className="w-full border rounded p-2 bg-gray-50" value={profile?.fecha_nacimiento || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Teléfono</label>
            <input className="w-full border rounded p-2 bg-gray-50" value={profile?.telefono || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Talla Polera (Dato de Perfil)</label>
            <input className="w-full border rounded p-2 bg-gray-50" value={profile?.talla || "No especificada"} readOnly />
          </div>
        </div>
      </div>

      {/* Stages & Events */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Selecciona Etapas y Pruebas</h3>

        {stages.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay etapas configuradas para esta competencia.</p>
        ) : (
          <div className="space-y-3">
            {stages.map(stage => {
              const isStageSelected = selectedStages.has(stage.id);
              const isExpanded = expandedStages.has(stage.id);

              return (
                <div key={stage.id} className="border rounded-lg overflow-hidden">
                  {/* Stage Header */}
                  <div className="bg-gray-50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isStageSelected}
                        onChange={() => toggleStage(stage.id)}
                        className="h-5 w-5"
                        disabled={profileIncomplete}
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{stage.name}</h4>
                        <p className="text-xs text-gray-600">
                          {new Date(stage.date).toLocaleDateString()} • {stage.pool_type} • {stage.location}
                          {stage.start_time && ` • Inicio: ${stage.start_time}`}
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
                      className="text-blue-600 text-sm font-bold"
                    >
                      {isExpanded ? "▲ Ocultar" : "▼ Ver Pruebas"}
                    </button>
                  </div>

                  {/* Events List (Accordion) */}
                  {isExpanded && isStageSelected && (
                    <div className="p-4 bg-white border-t">
                      {stage.competition_events.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Sin pruebas asignadas.</p>
                      ) : (
                        <div className="space-y-2">
                          {stage.competition_events.map(evt => {
                            const eventData = selectedEvents[evt.id] || { selected: false, time: "" };

                            return (
                              <div key={evt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                                <input
                                  type="checkbox"
                                  checked={eventData.selected}
                                  onChange={() => toggleEvent(evt.id)}
                                  className="h-4 w-4"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    #{evt.event_number} - {evt.event_catalog?.name || "Prueba"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {evt.event_catalog?.distance}m {evt.event_catalog?.style}
                                  </p>
                                </div>
                                {eventData.selected && (
                                  <div className="flex flex-col md:flex-row gap-6">
                                    {/* Entry Time Selection */}
                                    <div className="flex gap-2 items-center">
                                      <div className="flex flex-col">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Min (Inscr.)</label>
                                        <select
                                          className="border rounded p-2 text-sm w-16"
                                          value={parseTime(eventData.time).minutes}
                                          onChange={(e) => updateTime(evt.id, parseInt(e.target.value), parseTime(eventData.time).seconds, parseTime(eventData.time).ms)}
                                        >
                                          {Array.from({ length: 60 }, (_, i) => (
                                            <option key={i} value={i}>{i}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <span className="text-lg font-bold mt-5">:</span>
                                      <div className="flex flex-col">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Seg (Inscr.)</label>
                                        <select
                                          className="border rounded p-2 text-sm w-16"
                                          value={parseTime(eventData.time).seconds}
                                          onChange={(e) => updateTime(evt.id, parseTime(eventData.time).minutes, parseInt(e.target.value), parseTime(eventData.time).ms)}
                                        >
                                          {Array.from({ length: 60 }, (_, i) => (
                                            <option key={i} value={i}>{i}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <span className="text-lg font-bold mt-5">.</span>
                                      <div className="flex flex-col">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mil</label>
                                        <select
                                          className="border rounded p-2 text-sm w-16"
                                          value={parseTime(eventData.time).ms}
                                          onChange={(e) => updateTime(evt.id, parseTime(eventData.time).minutes, parseTime(eventData.time).seconds, parseInt(e.target.value))}
                                        >
                                          {Array.from({ length: 100 }, (_, i) => (
                                            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Result Time Selection (New) */}
                                    <div className="flex gap-2 items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                      <div className="flex flex-col">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Min (Res)</label>
                                        <select
                                          className="border border-blue-200 rounded p-2 text-sm w-16 bg-white"
                                          value={parseTime(eventData.resultTime).minutes}
                                          onChange={(e) => updateResult(evt.id, parseInt(e.target.value), parseTime(eventData.resultTime).seconds, parseTime(eventData.resultTime).ms)}
                                        >
                                          {Array.from({ length: 60 }, (_, i) => (
                                            <option key={i} value={i}>{i}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <span className="text-lg font-bold mt-5 text-blue-400">:</span>
                                      <div className="flex flex-col">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Seg (Res)</label>
                                        <select
                                          className="border border-blue-200 rounded p-2 text-sm w-16 bg-white"
                                          value={parseTime(eventData.resultTime).seconds}
                                          onChange={(e) => updateResult(evt.id, parseTime(eventData.resultTime).minutes, parseInt(e.target.value), parseTime(eventData.resultTime).ms)}
                                        >
                                          {Array.from({ length: 60 }, (_, i) => (
                                            <option key={i} value={i}>{i}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <span className="text-lg font-bold mt-5 text-blue-400">.</span>
                                      <div className="flex flex-col">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Mil</label>
                                        <select
                                          className="border border-blue-200 rounded p-2 text-sm w-16 bg-white"
                                          value={parseTime(eventData.resultTime).ms}
                                          onChange={(e) => updateResult(evt.id, parseTime(eventData.resultTime).minutes, parseTime(eventData.resultTime).seconds, parseInt(e.target.value))}
                                        >
                                          {Array.from({ length: 100 }, (_, i) => (
                                            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                          ))}
                                        </select>
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

      {/* Action Buttons */}
      {!profileIncomplete && (
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Borrador"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Enviando..." : "Enviar Inscripción"}
          </button>
        </div>
      )}
    </div>
  );
}
