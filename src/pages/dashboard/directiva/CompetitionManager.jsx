import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export default function CompetitionManager() {
    const { id } = useParams();
    const [competition, setCompetition] = useState(null);
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("stages");
    const [enrollments, setEnrollments] = useState([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);

    const [showStageModal, setShowStageModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedStage, setSelectedStage] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: c, error: e1 } = await supabase.from("competitions").select("*").eq("id", id).single();
            if (e1) throw e1;
            setCompetition(c);

            const { data: s, error: e2 } = await supabase
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

            if (e2) throw e2;

            const stagesSorted = (s || []).map(stage => ({
                ...stage,
                competition_events: (stage.competition_events || []).sort((a, b) => a.event_number - b.event_number)
            }));

            setStages(stagesSorted);
        } catch (err) {
            console.error("Error:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadEnrollments = async () => {
        setLoadingEnrollments(true);
        try {
            const { data, error } = await supabase
                .from("competition_enrollments")
                .select(`
          id, entry_time, result_time, status, created_at,
          profiles!inner(id, nombre_completo, rut, fecha_nacimiento, telefono, talla),
          competition_events!inner(
            id, event_number,
            event_catalog(name, style, distance, category),
            competition_stages!inner(
              id, name, date,
              competition_id
            )
          )
        `)
                .eq("competition_events.competition_stages.competition_id", id);

            if (error) throw error;
            setEnrollments(data || []);
        } catch (err) {
            console.error("Error cargando inscripciones:", err.message);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const exportToExcel = () => {
        if (enrollments.length === 0) {
            alert("No hay inscripciones para exportar");
            return;
        }

        const userMap = new Map();

        enrollments.forEach(enr => {
            const userId = enr.profiles.id;
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    nombre: enr.profiles.nombre_completo,
                    rut: enr.profiles.rut,
                    fecha_nacimiento: enr.profiles.fecha_nacimiento,
                    telefono: enr.profiles.telefono,
                    talla: enr.profiles.talla || "-",
                    events: []
                });
            }

            userMap.get(userId).events.push({
                stage: enr.competition_events.competition_stages.name,
                eventNumber: enr.competition_events.event_number,
                eventName: enr.competition_events.event_catalog.name,
                time: enr.entry_time || "Sin tiempo",
                status: enr.status
            });
        });

        const excelData = [];

        userMap.forEach((userData) => {
            userData.events.forEach((evt, idx) => {
                excelData.push({
                    "Nombre": idx === 0 ? userData.nombre : "",
                    "RUT": idx === 0 ? userData.rut : "",
                    "Fecha Nacimiento": idx === 0 ? userData.fecha_nacimiento : "",
                    "Teléfono": idx === 0 ? userData.telefono : "",
                    "Talla": idx === 0 ? userData.talla : "",
                    "Etapa": evt.stage,
                    "N° Prueba": evt.eventNumber,
                    "Prueba": evt.eventName,
                    "Tiempo": evt.time,
                    "Estado": evt.status
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inscripciones");
        XLSX.writeFile(wb, `Inscripciones_${competition.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    useEffect(() => {
        if (id) loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (activeTab === "enrollments" && id) {
            loadEnrollments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, id]);

    if (loading) return <div className="p-6">Cargando detalles...</div>;
    if (!competition) return <div className="p-6">Competencia no encontrada.</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                <div>
                    <Link to="/dashboard/directiva/CrearConvocatoria" className="text-sm text-blue-600 hover:underline">← Volver a Lista</Link>
                    <h1 className="text-3xl font-bold text-gray-900 mt-2">{competition.name}</h1>
                    <p className="text-gray-500">{competition.organizer} • {new Date(competition.start_date).toLocaleDateString()} al {new Date(competition.end_date).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-2 border-b">
                    <button
                        onClick={() => setActiveTab("stages")}
                        className={`px-4 py-2 font-bold ${activeTab === "stages" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
                    >
                        Etapas y Pruebas
                    </button>
                    <button
                        onClick={() => setActiveTab("enrollments")}
                        className={`px-4 py-2 font-bold ${activeTab === "enrollments" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
                    >
                        Inscripciones ({enrollments.length})
                    </button>
                </div>

                {activeTab === "stages" && (
                    <>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowStageModal(true)}
                                className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800"
                            >
                                + Agregar Etapa
                            </button>
                            <button
                                onClick={() => setShowManualModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                            >
                                <span>➕</span> Registro Manual (Histórico)
                            </button>
                        </div>

                        <div className="space-y-6">
                            {stages.length === 0 ? (
                                <div className="p-10 bg-white rounded-xl shadow text-center text-gray-500">
                                    No hay etapas configuradas. Agrega la primera etapa.
                                </div>
                            ) : (
                                stages.map(stage => (
                                    <StageCard
                                        key={stage.id}
                                        stage={stage}
                                        onAddEvent={() => { setSelectedStage(stage); setShowEventModal(true); }}
                                        onReload={loadData}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}

                {activeTab === "enrollments" && (
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold">Inscripciones</h3>
                                <p className="text-sm text-gray-500">Total: {enrollments.length} pruebas inscritas</p>
                            </div>
                            <button
                                onClick={exportToExcel}
                                disabled={enrollments.length === 0}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <span>📊</span> Exportar Excel
                            </button>
                        </div>

                        {loadingEnrollments ? (
                            <p className="text-center py-10 text-gray-500">Cargando inscripciones...</p>
                        ) : enrollments.length === 0 ? (
                            <p className="text-center py-10 text-gray-500">No hay inscripciones todavía.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-3 text-left">Nadador</th>
                                            <th className="p-3 text-left">RUT</th>
                                            <th className="p-3 text-center">Talla</th>
                                            <th className="p-3 text-left">Etapa</th>
                                            <th className="p-3 text-left">Prueba</th>
                                            <th className="p-3 text-left">T. Entrada</th>
                                            <th className="p-3 text-left">T. Resultado</th>
                                            <th className="p-3 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {enrollments.map(enr => (
                                            <tr key={enr.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium">{enr.profiles.nombre_completo}</td>
                                                <td className="p-3 text-gray-600">{enr.profiles.rut}</td>
                                                <td className="p-3 text-center font-bold text-blue-600">{enr.profiles.talla || "-"}</td>
                                                <td className="p-3 text-gray-600">{enr.competition_events.competition_stages.name}</td>
                                                <td className="p-3">
                                                    <div className="font-medium text-slate-800">#{enr.competition_events.event_number} - {enr.competition_events.event_catalog?.name}</div>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-slate-600">{enr.entry_time || "00:00:00"}</td>
                                                <td className="p-3 font-mono text-xs">
                                                    {enr.result_time ? (
                                                        <span className="font-black text-green-700 bg-green-50 px-2 py-1 rounded">{enr.result_time}</span>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px]">Sin resultado</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${enr.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                        }`}>
                                                        {enr.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showStageModal && <StageModal competitionId={id} onClose={() => setShowStageModal(false)} onReload={loadData} />}
            {showEventModal && selectedStage && <EventModal stage={selectedStage} onClose={() => setShowEventModal(false)} onReload={loadData} />}
            {showManualModal && <ManualRegistrationModal stages={stages} onClose={() => setShowManualModal(false)} onReload={loadEnrollments} />}

        </div>
    );
}

function StageCard({ stage, onAddEvent, onReload }) {
    const handleDelete = async () => {
        if (!confirm("¿Eliminar etapa y todas sus pruebas?")) return;
        await supabase.from("competition_stages").delete().eq("id", stage.id);
        onReload();
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm("¿Eliminar esta prueba?")) return;
        await supabase.from("competition_events").delete().eq("id", eventId);
        onReload();
    };

    return (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{stage.name}</h3>
                    <p className="text-xs text-gray-600">
                        {new Date(stage.date).toLocaleDateString()} • {stage.pool_type} • {stage.location}
                        {stage.start_time && ` • Inicio: ${stage.start_time}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDelete} className="text-red-500 text-xs font-bold hover:underline">Eliminar Etapa</button>
                </div>
            </div>

            <div className="p-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
                            <th className="text-left py-2">#</th>
                            <th className="text-left py-2">Prueba</th>
                            <th className="text-left py-2">Detalles</th>
                            <th className="text-right py-2">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stage.competition_events.length === 0 ? (
                            <tr><td colSpan="4" className="py-8 text-center text-gray-400 italic font-medium">Sin pruebas asignadas.</td></tr>
                        ) : (
                            stage.competition_events.map(ev => (
                                <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 font-black text-slate-400">#{ev.event_number}</td>
                                    <td className="py-3 font-bold text-slate-800">
                                        {ev.event_catalog?.name || "Prueba Desconocida"}
                                    </td>
                                    <td className="py-3 text-slate-500 text-xs font-semibold">
                                        {ev.event_catalog?.distance}m {ev.event_catalog?.style} ({ev.event_catalog?.category?.toUpperCase()})
                                    </td>
                                    <td className="py-3 text-right">
                                        <button onClick={() => handleDeleteEvent(ev.id)} className="text-red-400 hover:text-red-600 font-bold transition-colors">Eliminar</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="mt-4 pt-4 border-t text-center">
                    <button onClick={onAddEvent} className="text-blue-600 font-black uppercase text-[10px] tracking-widest hover:underline transition-all">
                        + Agregar Prueba a esta Etapa
                    </button>
                </div>
            </div>
        </div>
    );
}

function StageModal({ competitionId, onClose, onReload }) {
    const [form, setForm] = useState({ name: "", date: "", pool_type: "olimpica", location: "", start_time: "" });
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("competition_stages").insert({ ...form, competition_id: competitionId });
        if (error) alert(error.message);
        else { onClose(); onReload(); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="font-bold mb-4 uppercase tracking-tight text-slate-900">Nueva Etapa</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input required className="w-full border rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold" placeholder="Nombre (Ej: Etapa 1)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input required type="date" className="w-full border rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    <select className="w-full border rounded-lg p-2.5 font-bold" value={form.pool_type} onChange={e => setForm({ ...form, pool_type: e.target.value })}>
                        <option value="olimpica">Olímpica (50m)</option>
                        <option value="corta">Corta (25m)</option>
                        <option value="abierta">Aguas Abiertas</option>
                    </select>
                    <input required className="w-full border rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold" placeholder="Ubicación" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                    <input type="time" className="w-full border rounded-lg p-2.5 font-bold" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-100 px-6 py-2 rounded-lg font-bold">Cancelar</button>
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Crear Etapa</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EventModal({ stage, onClose, onReload }) {
    const [catalog, setCatalog] = useState([]);
    const [search, setSearch] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [newEvt, setNewEvt] = useState({ distance: 50, style: "libre", category: "mixto", is_relay: false });

    useEffect(() => {
        const fetchCatalog = async () => {
            const { data } = await supabase.from("event_catalog").select("*").order("distance");
            setCatalog(data || []);
        };
        fetchCatalog();
    }, []);

    const filtered = catalog.filter(c =>
        (c.name?.toLowerCase().includes(search.toLowerCase())) ||
        (c.style?.toLowerCase().includes(search.toLowerCase()))
    );

    const [isAddingMode, setIsAddingMode] = useState(false);

    const addEvent = async (catalogId) => {
        if (isAddingMode) return; // Prevenir múltiples clicks

        // 1. Validar si ya existe la prueba en esta etapa
        const yaExiste = stage.competition_events?.some(ev => ev.event_catalog?.id === catalogId);
        if (yaExiste) {
            alert("Esta prueba ya fue agregada a esta etapa.");
            return;
        }

        setIsAddingMode(true);
        try {
            // Fix: Calcular el siguiente número basado en el MÁXIMO existente para evitar duplicados si se borraron pruebas intermedias
            const maxNum = stage.competition_events?.reduce((max, ev) => Math.max(max, ev.event_number || 0), 0) || 0;
            const nextNum = maxNum + 1;

            const { error } = await supabase.from("competition_events").insert({
                stage_id: stage.id,
                catalog_id: catalogId,
                event_number: nextNum
            });

            if (error) throw error;
            await onReload(); // Esperar a que recargue para tener la lista actualizada
        } catch (err) {
            alert(err.message);
        } finally {
            setIsAddingMode(false);
        }
    };

    const createAndAdd = async () => {
        const { data, error } = await supabase.from("event_catalog").insert({
            ...newEvt
        }).select().single();
        if (error) { alert(error.message); return; }
        await addEvent(data.id);
        setIsCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-900">Agregar Pruebas a {stage.name}</h3>
                    <button onClick={onClose} className="text-gray-500 font-bold text-2xl">&times;</button>
                </div>

                <div className="p-4 border-b bg-white">
                    <div className="flex gap-2">
                        <input className="flex-1 border rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold" placeholder="Buscar prueba (ej: 50m libre)..." value={search} onChange={e => setSearch(e.target.value)} />
                        <button onClick={() => setIsCreating(!isCreating)} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-bold">
                            {isCreating ? "Volver a Lista" : "Crear Nueva"}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {isCreating ? (
                        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                            <h4 className="font-bold text-slate-800">Crear Nueva Prueba en Catálogo</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Distancia</label>
                                    <select className="w-full border rounded-lg p-2.5 font-bold" value={newEvt.distance} onChange={e => setNewEvt({ ...newEvt, distance: Number(e.target.value) })}>
                                        {[25, 50, 100, 200, 400, 800, 1500].map(d => <option key={d} value={d}>{d}m</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Estilo</label>
                                    <select className="w-full border rounded-lg p-2.5 font-bold" value={newEvt.style} onChange={e => setNewEvt({ ...newEvt, style: e.target.value })}>
                                        {['libre', 'pecho', 'espalda', 'mariposa', 'combinado', 'relevo'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
                                <select className="w-full border rounded-lg p-2.5 font-bold" value={newEvt.category} onChange={e => setNewEvt({ ...newEvt, category: e.target.value })}>
                                    {['damas', 'varones', 'mixto', 'todo_competidor'].map(c => <option key={c} value={c}>{c.toUpperCase().replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <button onClick={createAndAdd} className="w-full bg-blue-600 text-white font-black py-3 rounded-lg uppercase tracking-tight shadow-lg shadow-blue-100">Guardar y Agregar a Etapa</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filtered.map(item => {
                                const isAdded = stage.competition_events?.some(ev => ev.event_catalog?.id === item.id);
                                return (
                                    <div key={item.id} className={`bg-white p-4 rounded-xl border flex justify-between items-center transition-shadow ${isAdded ? 'opacity-50' : 'hover:shadow-md'}`}>
                                        <div>
                                            <p className="font-bold text-slate-900">{item.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category}</p>
                                        </div>
                                        <button
                                            onClick={() => addEvent(item.id)}
                                            disabled={isAdded || isAddingMode}
                                            className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isAdded
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                                                }`}
                                        >
                                            {isAdded ? "Agregado" : (isAddingMode ? "..." : "Agregar")}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ManualRegistrationModal({ stages, onClose, onReload }) {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [stageId, setStageId] = useState("");
    const [eventId, setEventId] = useState("");
    const [time, setTime] = useState("");
    const [resultTime, setResultTime] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (search.length < 3) return;
        setLoading(true);
        const { data } = await supabase
            .from("profiles")
            .select("id, nombre_completo, rut")
            .or(`nombre_completo.ilike.%${search}%,rut.ilike.%${search}%`)
            .limit(10);
        setUsers(data || []);
        setLoading(false);
    };

    const selectedStage = stages.find(s => s.id === stageId);
    const events = selectedStage ? selectedStage.competition_events : [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser || !eventId) return;

        const { error } = await supabase.from("competition_enrollments").insert({
            user_id: selectedUser.id,
            event_id: eventId,
            entry_time: time || "00:00:00",
            result_time: resultTime || null,
            status: "confirmed"
        });

        if (error) {
            if (error.code === "23505") {
                alert("Este socio ya se encuentra inscrito en esta prueba.");
            } else {
                alert(error.message);
            }
        } else {
            alert("Inscripción manual exitosa");
            onReload();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Registro Manual Histórico</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-slate-900 text-3xl font-light">&times;</button>
                </div>

                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Buscador de Socio */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Buscar Socio (Nombre o RUT)</label>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                placeholder="Escribe al menos 3 caracteres..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <button onClick={handleSearch} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                                {loading ? "..." : "Buscar"}
                            </button>
                        </div>
                    </div>

                    {/* Lista de Resultados */}
                    {users.length > 0 && !selectedUser && (
                        <div className="border-2 border-slate-50 rounded-xl divide-y divide-slate-50 text-sm max-h-40 overflow-y-auto bg-slate-50/50">
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUser(u)}
                                    className="w-full p-4 text-left hover:bg-white flex justify-between items-center group transition-all"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800">{u.nombre_completo}</p>
                                        <p className="text-xs text-slate-400 font-medium">{u.rut}</p>
                                    </div>
                                    <span className="text-blue-500 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Seleccionar</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Socio Seleccionado */}
                    {selectedUser && (
                        <div className="bg-blue-50 border-2 border-blue-100/50 p-4 rounded-2xl flex justify-between items-center animate-in fade-in zoom-in duration-300">
                            <div>
                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Socio Seleccionado</p>
                                <p className="font-black text-blue-900 text-lg">{selectedUser.nombre_completo}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm border border-blue-100">Cambiar</button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1. Seleccionar Etapa</label>
                            <select
                                required
                                className="w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none bg-white"
                                value={stageId}
                                onChange={e => { setStageId(e.target.value); setEventId(""); }}
                            >
                                <option value="">Seleccione etapa...</option>
                                {stages.map(s => <option key={s.id} value={s.id}>{s.name} ({new Date(s.date).toLocaleDateString()})</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">2. Seleccionar Prueba</label>
                            <select
                                required
                                className="w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm font-bold outline-none focus:border-blue-500 transition-all appearance-none bg-white disabled:opacity-50"
                                value={eventId}
                                onChange={e => setEventId(e.target.value)}
                                disabled={!stageId}
                            >
                                <option value="">Seleccione prueba...</option>
                                {events.map(ev => (
                                    <option key={ev.id} value={ev.id}>#{ev.event_number} - {ev.event_catalog?.name} ({ev.event_catalog?.distance}m {ev.event_catalog?.style})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">3. Tiempo de Entrada (Opcional)</label>
                            <input
                                className="w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm font-mono font-bold focus:border-blue-500 outline-none transition-all"
                                placeholder="00:00:00"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-green-600 uppercase tracking-[0.2em]">4. Tiempo de Resultado (Post-Competencia)</label>
                            <input
                                className="w-full border-2 border-green-100 rounded-xl p-3.5 text-sm font-mono font-bold focus:border-green-500 outline-none transition-all bg-green-50/30"
                                placeholder="00:00:00"
                                value={resultTime}
                                onChange={e => setResultTime(e.target.value)}
                            />
                            <p className="text-[9px] text-slate-400 font-medium">Agregar después de finalizada la competencia</p>
                        </div>

                        <div className="flex gap-3 pt-6">
                            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                            <button
                                type="submit"
                                disabled={!selectedUser || !eventId}
                                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                                Finalizar Registro
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
