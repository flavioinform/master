import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { Calendar, DollarSign, Check, Clock, Upload } from "lucide-react";

const MESES = [
    { numero: 1, nombre: "Enero" },
    { numero: 2, nombre: "Febrero" },
    { numero: 3, nombre: "Marzo" },
    { numero: 4, nombre: "Abril" },
    { numero: 5, nombre: "Mayo" },
    { numero: 6, nombre: "Junio" },
    { numero: 7, nombre: "Julio" },
    { numero: 8, nombre: "Agosto" },
    { numero: 9, nombre: "Septiembre" },
    { numero: 10, nombre: "Octubre" },
    { numero: 11, nombre: "Noviembre" },
    { numero: 12, nombre: "Diciembre" }
];

export default function MisCuotas() {
    const { user } = useContext(AppContext);

    const [loading, setLoading] = useState(true);
    const [pagos, setPagos] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    // Form state
    const [mes, setMes] = useState("");
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [monto, setMonto] = useState("15000");
    const [comprobante, setComprobante] = useState(null);

    const [msg, setMsg] = useState("");
    const [tipo, setTipo] = useState("");
    const [guardando, setGuardando] = useState(false);

    const anioActual = new Date().getFullYear();
    const anios = [anioActual - 1, anioActual, anioActual + 1];

    useEffect(() => {
        if (user?.id) cargarMisPagos();
    }, [user?.id]);

    const cargarMisPagos = async () => {
        setLoading(true);
        try {
            // Cargar perfil del usuario
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("fecha_ingreso")
                .eq("id", user.id)
                .single();

            if (!profileError && profile) {
                setUserProfile(profile);
            }

            // Cargar pagos
            const { data, error } = await supabase
                .from("monthly_payments")
                .select("*")
                .eq("user_id", user.id)
                .order("anio", { ascending: false })
                .order("mes", { ascending: false });

            if (error) throw error;
            setPagos(data || []);
        } catch (error) {
            console.error("Error cargando pagos:", error);
        } finally {
            setLoading(false);
        }
    };

    const registrarMiPago = async (e) => {
        e.preventDefault();
        setMsg("");
        setTipo("");

        if (!mes || !anio || !monto) {
            setMsg("Por favor completa todos los campos");
            setTipo("error");
            return;
        }

        if (!comprobante) {
            setMsg("Por favor sube un comprobante de pago");
            setTipo("error");
            return;
        }

        setGuardando(true);

        try {
            // Subir comprobante
            const ext = comprobante.name.split(".").pop();
            const fileName = `${user.id}/${anio}/${mes}_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("vouchers")
                .upload(fileName, comprobante);

            if (uploadError) throw uploadError;

            // Insertar pago
            const { error: insertError } = await supabase
                .from("monthly_payments")
                .insert({
                    user_id: user.id,
                    mes: parseInt(mes),
                    anio: parseInt(anio),
                    monto: parseFloat(monto),
                    estado: "pendiente", // Los socios registran como pendiente
                    comprobante_path: fileName
                });

            if (insertError) {
                if (insertError.code === "23505") {
                    throw new Error("Ya registraste un pago para este mes y año");
                }
                throw insertError;
            }

            setMsg("✅ Pago registrado exitosamente. Espera la validación del administrador.");
            setTipo("success");

            // Limpiar formulario
            setMes("");
            setMonto("15000");
            setComprobante(null);
            setShowForm(false);

            // Recargar pagos
            await cargarMisPagos();
        } catch (error) {
            console.error("Error registrando pago:", error);
            setMsg(error.message || "Error al registrar el pago");
            setTipo("error");
        } finally {
            setGuardando(false);
        }
    };

    const verComprobante = async (path) => {
        try {
            const { data, error } = await supabase.storage
                .from("vouchers")
                .createSignedUrl(path, 60);

            if (error) throw error;
            window.open(data.signedUrl, "_blank");
        } catch (error) {
            alert("Error al abrir comprobante");
        }
    };

    // Agrupar pagos por año
    const pagosPorAnio = pagos.reduce((acc, pago) => {
        if (!acc[pago.anio]) acc[pago.anio] = [];
        acc[pago.anio].push(pago);
        return acc;
    }, {});

    if (loading) return <div className="p-6 text-2xl">Cargando...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl">
                <h1 className="text-5xl font-black mb-2">💳 Mis Cuotas Mensuales</h1>
                <p className="text-cyan-100 text-xl">Registra y consulta tus pagos de forma simple</p>
            </div>

            {/* Mensaje */}
            {msg && (
                <div className={`p-6 rounded-2xl border-2 text-xl font-bold animate-in fade-in ${tipo === "error"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-green-50 border-green-300 text-green-700"
                    }`}>
                    {msg}
                </div>
            )}

            {/* Botón Registrar Pago */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-3xl font-black py-8 rounded-3xl hover:shadow-2xl hover:scale-105 transition-all"
                >
                    ➕ Registrar Nuevo Pago
                </button>
            )}

            {/* Formulario */}
            {showForm && (
                <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-green-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-black text-gray-800">Registrar Pago</h2>
                        <button
                            onClick={() => setShowForm(false)}
                            className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={registrarMiPago} className="space-y-6">
                        {/* Mes */}
                        <div>
                            <label className="block text-2xl font-black text-gray-700 mb-3">
                                📅 ¿Qué mes vas a pagar?
                            </label>
                            <select
                                value={mes}
                                onChange={(e) => setMes(e.target.value)}
                                className="w-full text-2xl p-6 border-4 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-500 focus:border-green-500 font-bold"
                                required
                            >
                                <option value="">Selecciona el mes...</option>
                                {MESES.filter(m => {
                                    if (!userProfile?.fecha_ingreso) return true;
                                    const fechaIngreso = new Date(userProfile.fecha_ingreso);
                                    const mesIngreso = fechaIngreso.getMonth() + 1;
                                    const anioIngreso = fechaIngreso.getFullYear();

                                    // Si el año seleccionado es anterior al ingreso, no mostrar
                                    if (parseInt(anio) < anioIngreso) return false;

                                    // Si es el mismo año, solo mostrar meses desde el ingreso
                                    if (parseInt(anio) === anioIngreso) {
                                        return m.numero >= mesIngreso;
                                    }

                                    // Si es año posterior, mostrar todos
                                    return true;
                                }).map(m => (
                                    <option key={m.numero} value={m.numero}>
                                        {m.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Año */}
                        <div>
                            <label className="block text-2xl font-black text-gray-700 mb-3">
                                📆 ¿De qué año?
                            </label>
                            <select
                                value={anio}
                                onChange={(e) => setAnio(e.target.value)}
                                className="w-full text-2xl p-6 border-4 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-500 focus:border-green-500 font-bold"
                                required
                            >
                                {anios.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="block text-2xl font-black text-gray-700 mb-3">
                                💵 ¿Cuánto pagaste?
                            </label>
                            <input
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="w-full text-2xl p-6 border-4 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-500 focus:border-green-500 font-bold"
                                placeholder="15000"
                                min="0"
                                step="100"
                                required
                            />
                        </div>

                        {/* Comprobante */}
                        <div>
                            <label className="block text-2xl font-black text-gray-700 mb-3">
                                📸 Sube tu comprobante de pago
                            </label>
                            <div className="border-4 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                                <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setComprobante(e.target.files[0])}
                                    className="w-full text-xl file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-xl file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                    required
                                />
                                {comprobante && (
                                    <p className="mt-4 text-green-600 font-bold text-xl">
                                        ✅ {comprobante.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex-1 bg-gray-200 text-gray-700 text-2xl font-black py-6 rounded-2xl hover:bg-gray-300 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardando}
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-2xl font-black py-6 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {guardando ? "Guardando..." : "✅ Registrar"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Historial por Año */}
            {Object.keys(pagosPorAnio).sort((a, b) => b - a).map(anio => (
                <div key={anio} className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
                    <h2 className="text-3xl font-black text-gray-800 mb-6">📅 Año {anio}</h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {MESES.filter(mes => {
                            if (!userProfile?.fecha_ingreso) return true;
                            const fechaIngreso = new Date(userProfile.fecha_ingreso);
                            const mesIngreso = fechaIngreso.getMonth() + 1;
                            const anioIngreso = fechaIngreso.getFullYear();

                            // Si el año del historial es anterior al ingreso, no mostrar
                            if (parseInt(anio) < anioIngreso) return false;

                            // Si es el mismo año, solo mostrar meses desde el ingreso
                            if (parseInt(anio) === anioIngreso) {
                                return mes.numero >= mesIngreso;
                            }

                            // Si es año posterior, mostrar todos
                            return true;
                        }).map(mes => {
                            const pago = pagosPorAnio[anio].find(p => p.mes === mes.numero);

                            return (
                                <div
                                    key={mes.numero}
                                    className={`p-6 rounded-2xl border-4 transition-all ${pago
                                        ? pago.estado === "pagado"
                                            ? "bg-green-50 border-green-300"
                                            : "bg-yellow-50 border-yellow-300"
                                        : "bg-gray-50 border-gray-200"
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">
                                            {pago
                                                ? pago.estado === "pagado"
                                                    ? "✅"
                                                    : "⏳"
                                                : "⚪"}
                                        </div>
                                        <div className="font-black text-xl mb-1">{mes.nombre}</div>
                                        {pago && (
                                            <>
                                                <div className="text-2xl font-black text-blue-600">
                                                    ${pago.monto.toLocaleString()}
                                                </div>
                                                <div className={`text-sm font-bold mt-2 ${pago.estado === "pagado" ? "text-green-700" : "text-yellow-700"
                                                    }`}>
                                                    {pago.estado === "pagado" ? "Pagado" : "Pendiente"}
                                                </div>
                                                {pago.comprobante_path && (
                                                    <button
                                                        onClick={() => verComprobante(pago.comprobante_path)}
                                                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-bold underline"
                                                    >
                                                        Ver comprobante
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {pagos.length === 0 && (
                <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-2xl text-gray-400 font-bold">
                        Aún no tienes pagos registrados
                    </p>
                    <p className="text-xl text-gray-400 mt-2">
                        Haz clic en "Registrar Nuevo Pago" para comenzar
                    </p>
                </div>
            )}
        </div>
    );
}
