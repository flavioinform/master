import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

export default function ImportUsersModal({ onClose, onReload }) {
    const [mode, setMode] = useState("socios"); // 'socios' | 'pagos'
    const [year, setYear] = useState(new Date().getFullYear()); // For payments

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [logs, setLogs] = useState([]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMsg("Leyendo archivo...");
        setLogs([]);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) throw new Error("Archivo vacío.");

                setMsg(`Procesando ${data.length} filas...`);

                if (mode === "socios") {
                    await processSocios(data);
                } else {
                    await processPagos(data);
                }

            } catch (err) {
                console.error(err);
                setMsg("Error: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processSocios = async (data) => {
        const rowsToInsert = [];
        // Process rows for Users
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
            setMsg("No hay datos válidos."); return;
        }

        const { error } = await supabase.from("profiles").upsert(rowsToInsert, { onConflict: 'rut' });

        if (error) {
            setMsg("Error: " + error.message);
        } else {
            setMsg(`✅ Se importaron ${rowsToInsert.length} socios.`);
            if (onReload) onReload();
        }
    };

    const processPagos = async (data) => {
        // 1. Find or Create Period "Histórico [Year]"
        const periodName = `Histórico ${year}`;

        // Check if exists
        let { data: existingPeriod, error: ep } = await supabase
            .from("payment_periods")
            .select("id")
            .eq("nombre", periodName)
            .single();

        let periodId = existingPeriod?.id;

        if (!periodId) {
            setLogs(prev => [...prev, `Creando periodo automático: ${periodName}...`]);
            // Create it
            const { data: newPeriod, error: en } = await supabase.from("payment_periods").insert({
                concepto: "Histórico",
                nombre: periodName,
                descripcion: "Importación masiva de pagos históricos",
                monto: 0, // Variable
                fecha_inicio: `${year}-01-01`,
                fecha_fin: `${year}-12-31`,
                activo: true
            }).select("id").single();

            if (en) throw new Error("No se pudo crear el periodo histórico: " + en.message);
            periodId = newPeriod.id;
        }

        // 2. Process Vouchers
        const vouchersToInsert = [];
        const ruts = data.map(r => (r.RUT || "").trim()).filter(r => r);

        // Fetch all profiles to map RUT -> ID
        // (Performance optimization: fetch only needed RUTs would be better but simple fetch all is fine for <10k users)
        const { data: profiles, error: eu } = await supabase.from("profiles").select("id, rut");
        if (eu) throw eu;

        const rutMap = new Map();
        profiles.forEach(p => {
            if (!p.rut) return; // ✅ Skip profiles without RUT in DB
            // Map both raw and clean RUT
            rutMap.set(p.rut.toLowerCase(), p.id);
            rutMap.set(p.rut.replace(/\./g, "").replace(/-/g, "").toLowerCase(), p.id);
        });

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rawRut = String(row.RUT || "").trim(); // ✅ Ensure String from Excel
            const monto = row.Pago || row.Monto || 0;

            if (!rawRut) continue;

            const userId = rutMap.get(rawRut.toLowerCase()) || rutMap.get(rawRut.replace(/\./g, "").replace(/-/g, "").toLowerCase());

            if (userId && monto > 0) {
                vouchersToInsert.push({
                    user_id: userId,
                    period_id: periodId,
                    estado: 'aprobado',
                    archivo_path: "SIN_COMPROBANTE", // Bypass NOT NULL constraint
                    comentario: `Importado ${new Date().toLocaleDateString()}`,
                    created_at: `${year}-01-01T12:00:00+00:00`
                });
            } else {
                if (!userId) setLogs(prev => [...prev, `RUT no encontrado: ${rawRut}`]);
            }
        }

        if (vouchersToInsert.length === 0) {
            setMsg("No se generaron pagos. Verifica los RUTs.");
            return;
        }

        const { error: ev } = await supabase.from("vouchers").insert(vouchersToInsert);
        if (ev) {
            setMsg("Error insertando pagos: " + ev.message);
        } else {
            setMsg(`✅ Se importaron ${vouchersToInsert.length} pagos para el año ${year}.`);
            if (onReload) onReload();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Herramienta de Importación</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* TABS */}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-2 font-medium ${mode === 'socios' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setMode('socios')}
                    >
                        Socios (RUT/Nombre)
                    </button>
                    <button
                        className={`flex-1 py-2 font-medium ${mode === 'pagos' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setMode('pagos')}
                    >
                        Pagos Históricos (RUT/Monto)
                    </button>
                </div>

                <div className="text-sm text-gray-600">
                    {mode === 'socios' ? (
                        <p>Excel con columnas: <b>Nombre, Paterno, Materno, RUT, Email</b>.</p>
                    ) : (
                        <div className="space-y-2">
                            <p>Excel con columnas: <b>RUT, Pago</b>.</p>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                <span className="font-bold">Asignar al Año:</span>
                                <input
                                    type="number"
                                    className="border rounded p-1 w-20"
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                />
                                <span className="text-xs text-gray-500">(Se creará "Histórico {year}")</span>
                            </div>
                        </div>
                    )}
                </div>

                {msg && (
                    <div className={`p-3 rounded text-sm ${msg.includes("Error") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                        {msg}
                    </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="w-full"
                    />
                </div>

                {logs.length > 0 && (
                    <div className="bg-gray-100 p-3 rounded text-xs text-gray-700 max-h-40 overflow-y-auto space-y-1">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
