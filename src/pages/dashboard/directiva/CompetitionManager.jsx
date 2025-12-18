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
    const [selectedStage, setSelectedStage] = useState(null);
    const [msg, setMsg] = useState("");

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
            setMsg("Error: " + err.message);
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
          id, entry_time, status, created_at,
          profiles!inner(id, nombre_completo, rut, fecha_nacimiento, telefono),
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
            setMsg("Error cargando inscripciones: " + err.message);
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

        userMap.forEach((userData, userId) => {
            userData.events.forEach((evt, idx) => {
                excelData.push({
                    "Nombre": idx === 0 ? userData.nombre : "",
                    "RUT": idx === 0 ? userData.rut : "",
                    "Fecha Nacimiento": idx === 0 ? userData.fecha_nacimiento : "",
                    "Teléfono": idx === 0 ? userData.telefono : "",
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
    }, [id]);

    useEffect(() => {
        if (activeTab === "enrollments" && id) {
            loadEnrollments();
        }
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
                                            <th className="p-3 text-left">Etapa</th>
                                            <th className="p-3 text-left">Prueba</th>
                                            <th className="p-3 text-left">Tiempo</th>
                                            <th className="p-3 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {enrollments.map(enr => (
                                            <tr key={enr.id} className="hover:bg-gray-50">
                                                <td className="p-3">{enr.profiles.nombre_completo}</td>
                                                <td className="p-3 text-gray-600">{enr.profiles.rut}</td>
                                                <td className="p-3 text-gray-600">{enr.competition_events.competition_stages.name}</td>
                                                <td className="p-3">
                                                    <div className="font-medium">#{enr.competition_events.event_number} - {enr.competition_events.event_catalog.name}</div>
                                                </td>
                                                <td className="p-3 font-mono">{enr.entry_time || "Sin tiempo"}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${enr.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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

        </div>
    );
}

function StageCard({ stage, onAddEvent, onReload }) {
    const handleDelete = async () => {
        if (!confirm("Eliminar etapa?")) return;
        await supabase.from("competition_stages").delete().eq("id", stage.id);
        onReload();
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm("Eliminar prueba?")) return;
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
                    <button onClick={handleDelete} className="text-red-500 text-xs hover:underline">Eliminar Etapa</button>
                </div>
            </div>

            <div className="p-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-500 uppercase text-xs border-b">
                            <th className="text-left py-2">#</th>
                            <th className="text-left py-2">Prueba</th>
                            <th className="text-left py-2">Detalles</th>
                            <th className="text-right py-2">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stage.competition_events.length === 0 ? (
                            <tr><td colSpan="4" className="py-4 text-center text-gray-400 italic">Sin pruebas asignadas.</td></tr>
                        ) : (
                            stage.competition_events.map(ev => (
                                <tr key={ev.id}>
                                    <td className="py-2 font-bold text-gray-700">{ev.event_number}</td>
                                    <td className="py-2 font-medium">
                                        {ev.event_catalog?.name || "Prueba Desconocida"}
                                    </td>
                                    <td className="py-2 text-gray-500 text-xs">
                                        {ev.event_catalog?.distance}m {ev.event_catalog?.style}
                                    </td>
                                    <td className="py-2 text-right">
                                        <button onClick={() => handleDeleteEvent(ev.id)} className="text-red-500 hover:text-red-700">x</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="mt-4 pt-2 border-t text-center">
                    <button onClick={onAddEvent} className="text-blue-600 font-bold hover:underline text-sm">+ Agregar Prueba a esta Etapa</button>
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
                <h3 className="font-bold mb-4">Nueva Etapa</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input required className="w-full border rounded p-2" placeholder="Nombre (Ej: Etapa 1)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input required type="date" className="w-full border rounded p-2" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    <select className="w-full border rounded p-2" value={form.pool_type} onChange={e => setForm({ ...form, pool_type: e.target.value })}>
                        <option value="olimpica">Olímpica (50m)</option>
                        <option value="corta">Corta (25m)</option>
                        <option value="abierta">Aguas Abiertas</option>
                    </select>
                    <input required className="w-full border rounded p-2" placeholder="Ubicación" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                    <input type="time" className="w-full border rounded p-2" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 px-3 py-1 rounded">Cancelar</button>
                        <button className="bg-black text-white px-3 py-1 rounded">Crear</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EventModal({ stage, onClose, onReload }) {
    const [catalog, setCatalog] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const [isCreating, setIsCreating] = useState(false);
    const [newEvt, setNewEvt] = useState({ distance: 50, style: "libre", category: "mixto", is_relay: false });

    useEffect(() => {
        const fetchCatalog = async () => {
            const { data } = await supabase.from("event_catalog").select("*").order("distance");
            setCatalog(data || []);
        };
        fetchCatalog();
    }, []);

    const filtered = catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const addEvent = async (catalogId) => {
        const currentCount = stage.competition_events?.length || 0;
        const nextNum = currentCount + 1;

        const { error } = await supabase.from("competition_events").insert({
            stage_id: stage.id,
            catalog_id: catalogId,
            event_number: nextNum
        });

        if (error) alert(error.message);
        else {
            onReload();
        }
    };

    const createAndAdd = async () => {
        const { data, error } = await supabase.from("event_catalog").insert(newEvt).select().single();
        if (error) { alert(error.message); return; }

        await addEvent(data.id);
        setIsCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold">Agregar Pruebas a {stage.name}</h3>
                    <button onClick={onClose} className="text-gray-500 font-bold text-xl">&times;</button>
                </div>

                <div className="p-4 border-b bg-white">
                    <div className="flex gap-2">
                        <input className="flex-1 border rounded p-2" placeholder="Buscar prueba (ej: 50m libre)..." value={search} onChange={e => setSearch(e.target.value)} />
                        <button onClick={() => setIsCreating(!isCreating)} className="bg-blue-600 text-white px-3 rounded text-sm font-bold">
                            {isCreating ? "Volver a Lista" : "Crear Nueva"}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {isCreating ? (
                        <div className="bg-white p-4 rounded shadow border space-y-3">
                            <h4 className="font-bold text-gray-700">Crear Nueva Prueba (Catálogo)</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <select className="border rounded p-2" value={newEvt.distance} onChange={e => setNewEvt({ ...newEvt, distance: Number(e.target.value) })}>
                                    {[25, 50, 100, 200, 400, 800, 1500].map(d => <option key={d} value={d}>{d}m</option>)}
                                </select>
                                <select className="border rounded p-2" value={newEvt.style} onChange={e => setNewEvt({ ...newEvt, style: e.target.value })}>
                                    {['libre', 'pecho', 'espalda', 'mariposa', 'combinado', 'relevo'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </select>
                                <select className="border rounded p-2" value={newEvt.category} onChange={e => setNewEvt({ ...newEvt, category: e.target.value })}>
                                    {['damas', 'varones', 'mixto', 'todo_competidor'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <button onClick={createAndAdd} className="w-full bg-green-600 text-white font-bold py-2 rounded">Guardar y Agregar</button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(item => (
                                <div key={item.id} className="bg-white p-3 rounded border flex justify-between items-center hover:shadow-sm">
                                    <div>
                                        <p className="font-bold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">ID: {item.id.slice(0, 6)}</p>
                                    </div>
                                    <button onClick={() => addEvent(item.id)} className="bg-gray-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 font-bold text-sm">Agregar +</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
