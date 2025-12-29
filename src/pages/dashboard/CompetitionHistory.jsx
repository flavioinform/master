import { useState, useEffect, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { Trophy, Calendar, Clock, Award, Download, Filter } from "lucide-react";
import * as XLSX from "xlsx";

export default function CompetitionHistory() {
    const { user } = useContext(AppContext);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterYear, setFilterYear] = useState("all");
    const [filterCompetition, setFilterCompetition] = useState("all");

    const loadHistory = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("competition_enrollments")
                .select(`
                    id, entry_time, result_time, status, created_at,
                    competition_events!inner(
                        id, event_number,
                        event_catalog(name, style, distance, category),
                        competition_stages!inner(
                            id, name, date,
                            competitions!inner(id, name, start_date, end_date, organizer)
                        )
                    )
                `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setEnrollments(data || []);
        } catch (err) {
            console.error("Error cargando historial:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const competitions = [...new Set(enrollments.map(e => e.competition_events.competition_stages.competitions.name))];
    const years = [...new Set(enrollments.map(e => new Date(e.competition_events.competition_stages.date).getFullYear()))];

    const filtered = enrollments.filter(e => {
        const year = new Date(e.competition_events.competition_stages.date).getFullYear();
        const compName = e.competition_events.competition_stages.competitions.name;

        if (filterYear !== "all" && year !== parseInt(filterYear)) return false;
        if (filterCompetition !== "all" && compName !== filterCompetition) return false;

        return true;
    });

    const exportToExcel = () => {
        if (filtered.length === 0) {
            alert("No hay registros para exportar");
            return;
        }

        const excelData = filtered.map(enr => ({
            "Competencia": enr.competition_events.competition_stages.competitions.name,
            "Etapa": enr.competition_events.competition_stages.name,
            "Fecha": new Date(enr.competition_events.competition_stages.date).toLocaleDateString(),
            "Prueba": `#${enr.competition_events.event_number} - ${enr.competition_events.event_catalog?.name}`,
            "Distancia": `${enr.competition_events.event_catalog?.distance}m`,
            "Estilo": enr.competition_events.event_catalog?.style,
            "Tiempo Entrada": enr.entry_time || "-",
            "Tiempo Resultado": enr.result_time || "-",
            "Estado": enr.status === "confirmed" ? "Confirmado" : "Pendiente"
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mi Historial");
        XLSX.writeFile(wb, `Mi_Historial_Competencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Cargando historial...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-2xl shadow-lg shadow-blue-500/20">
                                <Trophy className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mi Historial de Competencias</h1>
                                <p className="text-sm text-slate-500 font-medium mt-1">Registro completo de tus participaciones</p>
                            </div>
                        </div>

                        <button
                            onClick={exportToExcel}
                            disabled={filtered.length === 0}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Trophy className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Participaciones</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{enrollments.length}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-green-50 p-2 rounded-lg">
                                <Award className="h-5 w-5 text-green-600" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Con Resultado</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{enrollments.filter(e => e.result_time).length}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-purple-50 p-2 rounded-lg">
                                <Calendar className="h-5 w-5 text-purple-600" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Competencias</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900">{competitions.length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="h-5 w-5 text-slate-400" />
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Filtros</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Año</label>
                            <select
                                value={filterYear}
                                onChange={e => setFilterYear(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                            >
                                <option value="all">Todos los años</option>
                                {years.sort((a, b) => b - a).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Competencia</label>
                            <select
                                value={filterCompetition}
                                onChange={e => setFilterCompetition(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                            >
                                <option value="all">Todas las competencias</option>
                                {competitions.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="p-20 text-center">
                            <Trophy className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">No se encontraron registros</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <th className="px-6 py-4 text-left">Competencia</th>
                                        <th className="px-6 py-4 text-left">Etapa</th>
                                        <th className="px-6 py-4 text-left">Fecha</th>
                                        <th className="px-6 py-4 text-left">Prueba</th>
                                        <th className="px-6 py-4 text-left">T. Entrada</th>
                                        <th className="px-6 py-4 text-left">T. Resultado</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(enr => (
                                        <tr key={enr.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{enr.competition_events.competition_stages.competitions.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">{enr.competition_events.competition_stages.competitions.organizer}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">{enr.competition_events.competition_stages.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar className="h-4 w-4" />
                                                    <span className="font-medium">{new Date(enr.competition_events.competition_stages.date).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-blue-600">#{enr.competition_events.event_number} - {enr.competition_events.event_catalog?.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">{enr.competition_events.event_catalog?.distance}m {enr.competition_events.event_catalog?.style}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-slate-400" />
                                                    <span className="font-mono text-slate-600">{enr.entry_time || "00:00:00"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {enr.result_time ? (
                                                    <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                                                        <Award className="h-4 w-4 text-green-600" />
                                                        <span className="font-mono font-black text-green-700">{enr.result_time}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs font-medium">Sin resultado</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${enr.status === 'confirmed'
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
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

                {/* Results Summary */}
                {filtered.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
                        <p className="text-sm text-blue-900 font-medium">
                            Mostrando <span className="font-black">{filtered.length}</span> de <span className="font-black">{enrollments.length}</span> participaciones
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
