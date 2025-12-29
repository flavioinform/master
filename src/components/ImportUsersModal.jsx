import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

export default function ImportUsersModal({ onClose, onReload }) {
    const [mode, setMode] = useState("socios"); // 'socios' | 'pagos'
    const [year, setYear] = useState(new Date().getFullYear()); // For payments
    const [month, setMonth] = useState(new Date().getMonth() + 1); // For payments (1-12)

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [logs, setLogs] = useState([]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMsg("LECTURA EN CURSO...");
        setLogs([]);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) throw new Error("EL ARCHIVO ESTÁ VACÍO.");

                setMsg(`PROCESANDO ${data.length} FILAS...`);

                if (mode === "socios") {
                    await processSocios(data);
                } else {
                    await processPagos(data);
                }

            } catch (err) {
                console.error(err);
                setMsg("⚠️ ERROR: " + err.message.toUpperCase());
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processSocios = async (data) => {
        const rowsToInsert = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rut = (row.RUT || "").trim();
            if (!rut) continue;

            const cleanRut = rut.replace(/\./g, "").replace(/-/g, "").toLowerCase();
            const password = cleanRut.length >= 4 ? cleanRut.slice(-4) : "1234";

            rowsToInsert.push({
                nombre_completo: `${row.Nombre || ""} ${row.Paterno || ""} ${row.Materno || ""}`.trim(),
                rut: rut,
                email: (row.Email || `${cleanRut}@club.local`).toLowerCase(),
                rol: "socio",
                activo: true,
                password: password
            });
        }

        if (rowsToInsert.length === 0) {
            setMsg("🚨 NO SE ENCONTRARON DATOS VÁLIDOS."); return;
        }

        const { error } = await supabase.from("profiles").upsert(rowsToInsert, { onConflict: 'rut' });

        if (error) {
            setMsg("🚨 ERROR AL GUARDAR: " + error.message.toUpperCase());
        } else {
            setMsg(`✅ ¡ÉXITO! SE IMPORTARON ${rowsToInsert.length} SOCIOS.`);
            if (onReload) onReload();
        }
    };

    const processPagos = async (data) => {
        const periodName = `Histórico ${year}`;
        let { data: existingPeriod } = await supabase
            .from("payment_periods")
            .select("id")
            .eq("nombre", periodName)
            .single();

        let periodId = existingPeriod?.id;

        if (!periodId) {
            setLogs(prev => [...prev, `CREANDO PERIODO: ${periodName}...`]);
            const { data: newPeriod, error: en } = await supabase.from("payment_periods").insert({
                concepto: "Histórico",
                nombre: periodName,
                descripcion: "Importación masiva",
                monto: 0,
                fecha_inicio: `${year}-01-01`,
                fecha_fin: `${year}-12-31`,
                activo: true
            }).select("id").single();

            if (en) throw new Error("NO SE PUDO CREAR PERIODO: " + en.message);
            periodId = newPeriod.id;
        }

        const vouchersToInsert = [];
        const { data: profiles, error: eu } = await supabase.from("profiles").select("id, rut");
        if (eu) throw eu;

        const rutMap = new Map();
        profiles.forEach(p => {
            if (!p.rut) return;
            rutMap.set(p.rut.toLowerCase(), p.id);
            rutMap.set(p.rut.replace(/\./g, "").replace(/-/g, "").toLowerCase(), p.id);
        });

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rawRut = String(row.RUT || "").trim();
            const monto = row.Pago || row.Monto || 0;

            if (!rawRut) continue;

            const userId = rutMap.get(rawRut.toLowerCase()) || rutMap.get(rawRut.replace(/\./g, "").replace(/-/g, "").toLowerCase());

            if (userId && monto > 0) {
                vouchersToInsert.push({
                    user_id: userId,
                    period_id: periodId,
                    estado: 'aprobado',
                    archivo_path: "SIN_COMPROBANTE",
                    comentario: `Importado ${new Date().toLocaleDateString()}`,
                    created_at: `${year}-${String(month).padStart(2, '0')}-01T12:00:00+00:00`,
                    mes: month,
                    anio: year
                });
            } else {
                if (!userId) setLogs(prev => [...prev, `RUT NO ENCONTRADO: ${rawRut}`]);
            }
        }

        if (vouchersToInsert.length === 0) {
            setMsg("🚨 NO SE GENERARON PAGOS. REVISAR RUTS.");
            return;
        }

        const { error: ev } = await supabase.from("vouchers").insert(vouchersToInsert);
        if (ev) {
            setMsg("🚨 ERROR AL INSERTAR: " + ev.message.toUpperCase());
        } else {
            setMsg(`✅ ¡ÉXITO! ${vouchersToInsert.length} PAGOS IMPORTADOS (${year}).`);
            if (onReload) onReload();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-8 md:p-12 space-y-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>

                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Importación Masiva</h3>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Carga de datos desde Excel</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 w-12 h-12 rounded-xl flex items-center justify-center transition-all border border-slate-100"
                    >
                        <span className="text-2xl">✕</span>
                    </button>
                </div>

                {/* TABS - Clean Modern */}
                <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    <button
                        className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'socios'
                            ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                            : 'text-slate-400 hover:text-slate-600'}`}
                        onClick={() => setMode('socios')}
                    >
                        1. Importar Socios
                    </button>
                    <button
                        className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'pagos'
                            ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                            : 'text-slate-400 hover:text-slate-600'}`}
                        onClick={() => setMode('pagos')}
                    >
                        2. Historial de Pagos
                    </button>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] space-y-4">
                    {mode === 'socios' ? (
                        <div className="space-y-2">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Requisitos del Excel</p>
                            <p className="text-lg font-bold text-slate-700 leading-tight">
                                Las columnas deben ser: <span className="text-blue-600">Nombre, Paterno, Materno, RUT, Email</span>
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Requisitos del Excel</p>
                                <p className="text-lg font-bold text-slate-700 leading-tight">
                                    Las columnas deben ser: <span className="text-blue-600">RUT, Pago</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2 bg-white border border-blue-100 p-5 rounded-2xl shadow-sm">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Año:</span>
                                    <select
                                        className="border-none bg-slate-50 rounded-lg px-4 py-2 text-xl font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none text-center"
                                        value={year}
                                        onChange={e => setYear(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 33 }, (_, i) => 2008 + i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2 bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mes:</span>
                                    <select
                                        className="border-none bg-slate-50 rounded-lg px-4 py-2 text-xl font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-center"
                                        value={month}
                                        onChange={e => setMonth(Number(e.target.value))}
                                    >
                                        <option value={1}>Enero</option>
                                        <option value={2}>Febrero</option>
                                        <option value={3}>Marzo</option>
                                        <option value={4}>Abril</option>
                                        <option value={5}>Mayo</option>
                                        <option value={6}>Junio</option>
                                        <option value={7}>Julio</option>
                                        <option value={8}>Agosto</option>
                                        <option value={9}>Septiembre</option>
                                        <option value={10}>Octubre</option>
                                        <option value={11}>Noviembre</option>
                                        <option value={12}>Diciembre</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {msg && (
                    <div className={`p-6 rounded-2xl border text-sm font-bold text-center animate-in slide-in-from-top-2 ${msg.includes("ERROR") || msg.includes("🚨") ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                        {msg}
                    </div>
                )}

                <div className="relative group">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center bg-slate-50/30 group-hover:bg-blue-50/30 group-hover:border-blue-200 transition-all">
                        <div className="space-y-4">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                <span className="text-4xl">📂</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-lg font-black text-slate-900 uppercase tracking-tight block">
                                    {loading ? "Procesando Archivo..." : "Selecciona tu Archivo"}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                                    Formatos soportados: .xlsx, .xls, .csv
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {logs.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs font-bold text-slate-400 max-h-32 overflow-y-auto space-y-1 font-mono">
                        {logs.map((l, i) => <div key={i} className="flex gap-2"><span className="text-blue-500">›</span> {l}</div>)}
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all border border-slate-200"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 border border-blue-500"
                    >
                        Cerrar y Volver
                    </button>
                </div>
            </div>
        </div>
    );
}
