import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { Calendar, DollarSign, User, Check, Clock, FileText } from "lucide-react";

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

export default function PagosMensuales() {
    const { user } = useContext(AppContext);

    const [loading, setLoading] = useState(true);
    const [socios, setSocios] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [periodos, setPeriodos] = useState([]); // ✅ Cargar periodos para validación
    const [periodoId, setPeriodoId] = useState(""); // ✅ Periodo seleccionado manualmente
    const [periodoEncontrado, setPeriodoEncontrado] = useState(null); // ✅ El periodo que corresponde a la selección auto

    // Form state
    const [socioSeleccionado, setSocioSeleccionado] = useState("");
    const [monto, setMonto] = useState("");
    const [estado, setEstado] = useState("pagado");
    const [comprobante, setComprobante] = useState(null);
    // Observaciones field removed
    const [cantidadCuotas, setCantidadCuotas] = useState(1);
    const [cuotasCalculadas, setCuotasCalculadas] = useState([]);

    // ✅ Estados para modo de comprobante
    const [modoComprobante, setModoComprobante] = useState("unico"); // "unico" | "individual"
    const [comprobantesIndividuales, setComprobantesIndividuales] = useState({}); // { 0: File, 1: File, ... }
    const [socioProfile, setSocioProfile] = useState(null); // ✅ Perfil del socio seleccionado

    const [msg, setMsg] = useState("");
    const [tipo, setTipo] = useState("");
    const [guardando, setGuardando] = useState(false);

    // Filtros para historial
    const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
    const [filtroMes, setFiltroMes] = useState("todos");
    const [busqueda, setBusqueda] = useState("");

    // State for Searchable Socio Select
    const [busquedaSocio, setBusquedaSocio] = useState("");
    const [mostrarDropdownSocios, setMostrarDropdownSocios] = useState(false);

    // State for Manual Payment Date
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

    // Helper to filter socios
    const sociosFiltrados = socios.filter(s =>
        s.nombre_completo?.toLowerCase().includes(busquedaSocio.toLowerCase()) ||
        s.rut?.toLowerCase().includes(busquedaSocio.toLowerCase())
    );

    useEffect(() => {
        if (!periodoId) return;
        const period = periodos.find(p => p.id === periodoId);

        const isSpecificMonth = period && MESES.some(m => period.nombre?.toLowerCase().includes(m.nombre.toLowerCase()));

        if (isSpecificMonth) {
            setCantidadCuotas(1);
        }
    }, [periodoId]);

    // Generar años (5 años atrás y 5 adelante)
    const anioActual = new Date().getFullYear();
    const anios = Array.from({ length: 11 }, (_, i) => anioActual - 5 + i);

    useEffect(() => {
        if (user?.id) cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            // Cargar socios
            const { data: sociosData, error: sociosError } = await supabase
                .from("profiles")
                .select("id, nombre_completo, rut")
                .eq("activo", true)
                .order("nombre_completo");

            if (sociosError) throw sociosError;
            setSocios(sociosData || []);

            // Cargar pagos
            await cargarPagos();
        } catch (error) {
            console.error("Error cargando datos:", error);
            setMsg("Error al cargar datos");
            setTipo("error");
        } finally {
            setLoading(false);
        }
    };

    const cargarPagos = async () => {
        try {
            // ✅ Cargar Periodos Activos
            const { data: periodosData } = await supabase
                .from("payment_periods")
                .select("*")
                .eq("activo", true);
            setPeriodos(periodosData || []);

            // ✅ Cargar Vouchers (Unified System)
            const { data, error } = await supabase
                .from("vouchers")
                .select("*")
                .not("mes", "is", null)
                .order("anio", { ascending: false })
                .order("mes", { ascending: false });

            if (error) throw error;

            // ✅ Cargar perfiles y periodos por separado para evitar errores de relación
            if (data && data.length > 0) {
                const userIds = [...new Set(data.map(v => v.user_id))];
                const periodIds = [...new Set(data.map(v => v.period_id).filter(Boolean))];

                const { data: profilesData } = await supabase
                    .from("profiles")
                    .select("id, nombre_completo, rut")
                    .in("id", userIds);

                const { data: periodsData } = await supabase
                    .from("payment_periods")
                    .select("id, nombre, concepto, monto")
                    .in("id", periodIds);

                // Mapear los datos manualmente
                const enrichedData = data.map(voucher => ({
                    ...voucher,
                    profiles: profilesData?.find(p => p.id === voucher.user_id),
                    payment_periods: periodsData?.find(p => p.id === voucher.period_id)
                }));

                setPagos(enrichedData);
            } else {
                setPagos([]);
            }
        } catch (error) {
            console.error("Error cargando pagos:", error);
            console.error("Error details:", error.message, error.code, error.details);
        }
    };

    // ✅ Efecto: Calcular cuotas automáticamente al cambiar socio, periodo o cantidad
    useEffect(() => {
        const calcularProximasCuotas = async () => {
            if (!socioSeleccionado || !periodoId) {
                setCuotasCalculadas([]);
                return;
            }

            try {
                // ✅ 0. Cargar perfil del socio para obtener fecha de ingreso
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("fecha_ingreso")
                    .eq("id", socioSeleccionado)
                    .single();

                if (!profileError && profile) {
                    setSocioProfile(profile);
                }

                // 1. Obtener el último pago para este socio y periodo
                const { data: ultimoPago, error: queryError } = await supabase
                    .from("vouchers")
                    .select("cuota_numero, total_cuotas, mes, anio")
                    .eq("user_id", socioSeleccionado)
                    .eq("period_id", periodoId)
                    .order("anio", { ascending: false })
                    .order("mes", { ascending: false })
                    .order("cuota_numero", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (queryError) {
                    console.warn("Error consultando último pago:", queryError);
                }

                const period = periodos.find(p => p.id === periodoId);
                const esMensual = period?.concepto?.toLowerCase().includes("mensual") ||
                    period?.nombre?.toLowerCase().includes("mensual") ||
                    MESES.some(m => period?.nombre?.toLowerCase().includes(m.nombre.toLowerCase()));
                const totalC = period?.total_cuotas || 1;

                let nuevasCuotas = [];

                if (esMensual) {
                    // LÓGICA MENSUAL (1-12)
                    let proximoMes = 1;
                    let proximoAnio = new Date().getFullYear();

                    // ✅ MODIFICACIÓN CRÍTICA: Prioridad al mes explícito del periodo
                    // Si el periodo se llama "Pagos-Marzo2025", forzamos Marzo 2025
                    const mesEspecifico = MESES.find(m => period.nombre.toLowerCase().includes(m.nombre.toLowerCase()));
                    // Regex corregido: detectar año incluso si está pegado al texto (ej: Enero2025)
                    const anioEspecificoMatch = period.nombre.match(/(20\d{2})/);
                    const anioEspecifico = anioEspecificoMatch ? parseInt(anioEspecificoMatch[1]) : null;

                    if (mesEspecifico && anioEspecifico) {
                        // Caso 1: Periodo ESPECÍFICO (Ej: Marzo 2025) -> Forzar ese mes/año
                        proximoMes = mesEspecifico.numero;
                        proximoAnio = anioEspecifico;
                        // NO aplicamos lógica de siguiente mes ni de fecha ingreso aquí
                        // porque el admin explícitamente eligió "Marzo 2025"
                    } else {
                        // Caso 2: Periodo GENÉRICO (Ej: Cuota Mensual 2025) -> Calcular siguiente disponible
                        if (ultimoPago && ultimoPago.mes) {
                            proximoMes = ultimoPago.mes + 1;
                            proximoAnio = ultimoPago.anio;
                            if (proximoMes > 12) {
                                proximoMes = 1;
                                proximoAnio++;
                            }
                        } else {
                            if (anioEspecifico) proximoAnio = anioEspecifico;
                            // Si es genérico y no tiene pagos previos, empieza en Enero (o según fecha ingreso abajo)
                        }

                        // ✅ Si el socio tiene fecha de ingreso, ajustar el mes inicial SOLO para periodos genéricos
                        if (profile?.fecha_ingreso) {
                            const fechaIngreso = new Date(profile.fecha_ingreso);
                            const mesIngreso = fechaIngreso.getMonth() + 1;
                            const anioIngreso = fechaIngreso.getFullYear();

                            // Si el próximo mes calculado es anterior a la fecha de ingreso, ajustar
                            if (proximoAnio < anioIngreso || (proximoAnio === anioIngreso && proximoMes < mesIngreso)) {
                                proximoMes = mesIngreso;
                                proximoAnio = anioIngreso;
                            }
                        }
                    }

                    let currMes = proximoMes;
                    let currAnio = proximoAnio;
                    for (let i = 0; i < cantidadCuotas; i++) {
                        // ✅ Validar límite razonable (ej: 2040)
                        if (currAnio > 2040) break;

                        // ✅ NUEVO: Si el periodo es de un año específico (ej: 2026), NO pasar al siguiente año
                        if (anioEspecifico && currAnio > anioEspecifico) break;

                        nuevasCuotas.push({ mes: currMes, anio: currAnio, cuota_numero: null, label: MESES[currMes - 1].nombre });
                        currMes++;
                        if (currMes > 12) { currMes = 1; currAnio++; }
                    }
                } else {
                    // LÓGICA POR NRO DE CUOTA (1..N)
                    let proximaCuota = 1;
                    if (ultimoPago && ultimoPago.cuota_numero) {
                        proximaCuota = ultimoPago.cuota_numero + 1;
                    }

                    for (let i = 0; i < cantidadCuotas; i++) {
                        const nro = proximaCuota + i;
                        if (nro <= totalC || totalC === 1) {
                            nuevasCuotas.push({ cuota_numero: nro, label: `Cuota ${nro}` });
                        }
                    }
                }
                setCuotasCalculadas(nuevasCuotas);

                // ✅ Auto-corrige el input si el usuario pide más cuotas de las posibles (ej: pide 17 pero el año acaba en 12)
                if (nuevasCuotas.length > 0 && nuevasCuotas.length < cantidadCuotas) {
                    setCantidadCuotas(nuevasCuotas.length);
                }

            } catch (err) {
                console.error("Error calculando cuotas:", err);
            }
        };

        calcularProximasCuotas();
    }, [socioSeleccionado, periodoId, cantidadCuotas, periodos]);

    const registrarPago = async (e) => {
        e.preventDefault();
        setMsg("");
        setTipo("");

        if (!socioSeleccionado || !monto || !periodoId || cuotasCalculadas.length === 0) {
            setMsg("Por favor completa todos los campos obligatorios");
            setTipo("error");
            return;
        }

        setGuardando(true);

        try {
            // ✅ Subir comprobantes según el modo seleccionado
            let comprobantesUrls = {}; // { 0: "path/to/file1", 1: "path/to/file2", ... }

            if (modoComprobante === "unico" && comprobante) {
                // Modo único: un archivo para todas las cuotas
                const ext = comprobante.name.split(".").pop();
                const first = cuotasCalculadas[0];
                const fileName = `${socioSeleccionado}/${first.anio}/${first.mes}_multi_${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("vouchers")
                    .upload(fileName, comprobante);

                if (uploadError) throw uploadError;

                // Asignar el mismo path a todas las cuotas
                cuotasCalculadas.forEach((_, idx) => {
                    comprobantesUrls[idx] = fileName;
                });

            } else if (modoComprobante === "individual") {
                // Modo individual: subir cada archivo por separado
                for (let idx = 0; idx < cuotasCalculadas.length; idx++) {
                    const file = comprobantesIndividuales[idx];
                    if (file) {
                        const ext = file.name.split(".").pop();
                        const cuota = cuotasCalculadas[idx];
                        const fileName = `${socioSeleccionado}/${cuota.anio}/${cuota.mes}_${Date.now()}_${idx}.${ext}`;

                        const { error: uploadError } = await supabase.storage
                            .from("vouchers")
                            .upload(fileName, file);

                        if (uploadError) throw uploadError;
                        comprobantesUrls[idx] = fileName;
                    }
                }
            }

            // ✅ Verificar qué cuotas ya existen para evitar duplicados
            const { data: cuotasExistentes, error: queryError } = await supabase
                .from("vouchers")
                .select("mes, anio, cuota_numero")
                .eq("user_id", socioSeleccionado)
                .eq("period_id", periodoId);

            console.log("🔍 Cuotas existentes en BD:", cuotasExistentes);
            console.log("🔍 Cuotas calculadas:", cuotasCalculadas);

            if (queryError) {
                console.error("Error consultando cuotas existentes:", queryError);
            }

            // Filtrar solo las cuotas que NO existen
            const cuotasNuevas = cuotasCalculadas.filter((cuota, idx) => {
                const yaExiste = cuotasExistentes?.some(existente => {
                    // Para pagos mensuales, comparar mes y año
                    if (cuota.mes && cuota.anio) {
                        return existente.mes === cuota.mes && existente.anio === cuota.anio;
                    }
                    // Para pagos por cuota, comparar número de cuota
                    if (cuota.cuota_numero) {
                        return existente.cuota_numero === cuota.cuota_numero;
                    }
                    return false;
                });

                return !yaExiste;
            });



            if (cuotasNuevas.length === 0) {
                throw new Error("Todas las cuotas seleccionadas ya están registradas para este socio.");
            }

            // Registrar solo las cuotas nuevas

            // Insertar pagos en VOUCHERS (Unified) - Loop por cada cuota NUEVA
            const insertPromises = cuotasNuevas.map((cuota) => {
                // Encontrar el índice original de esta cuota para obtener el archivo correcto
                const idxOriginal = cuotasCalculadas.findIndex(c =>
                    c.mes === cuota.mes && c.anio === cuota.anio && c.cuota_numero === cuota.cuota_numero
                );

                const voucherData = {
                    user_id: socioSeleccionado,
                    period_id: periodoId,
                    mes: cuota.mes || null,
                    anio: cuota.anio || null,
                    cuota_numero: cuota.cuota_numero || null,
                    monto_individual: parseFloat(monto), // ✅ Monto por cuota (sin dividir)
                    estado: estado === 'pagado' ? 'aprobado' : 'pendiente',
                    archivo_path: comprobantesUrls[idxOriginal] || null, // ✅ Comprobante del índice original
                    comentario: null, // Observaciones removed
                    revisado_por: estado === 'pagado' ? user.id : null,
                    total_cuotas: periodos.find(p => p.id === periodoId)?.total_cuotas || 1
                };

                // Insertar cuota nueva

                return supabase
                    .from("vouchers")
                    .insert({ ...voucherData, created_at: new Date(fechaPago).toISOString() });
            });

            const results = await Promise.all(insertPromises);

            // Revisar errores en los resultados
            const errorResult = results.find(r => r.error);
            if (errorResult) {
                console.error("❌ Error en inserción:", errorResult.error);
                if (errorResult.error.code === "23505") {
                    throw new Error("Error al registrar: posible duplicado detectado.");
                }
                throw errorResult.error;
            }



            setMsg(`✅ ${cuotasNuevas.length} cuota(s) registrada(s) exitosamente${cuotasNuevas.length < cuotasCalculadas.length ? ` (${cuotasCalculadas.length - cuotasNuevas.length} ya existían)` : ''}`);
            setTipo("success");

            // Limpiar formulario
            setSocioSeleccionado("");
            setMonto("");
            setPeriodoId("");
            setComprobante(null);
            setComprobantesIndividuales({}); // ✅ Limpiar comprobantes individuales
            setModoComprobante("unico"); // ✅ Resetear a modo único
            // Observaciones reset removed
            setCantidadCuotas(1);

            // Recargar pagos
            await cargarPagos();

            // ✅ Recargar página tras éxito (Refresh)
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error("Error registrando pago:", error);
            setMsg(error.message || "Error al registrar el pago");
            setTipo("error");
        } finally {
            setGuardando(false);
        }
    };

    const eliminarPago = async (id) => {
        if (!confirm("¿Estás seguro de eliminar este pago?")) return;

        try {
            const { error } = await supabase
                .from("vouchers")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setMsg("Pago eliminado correctamente");
            setTipo("success");
            await cargarPagos();
        } catch (error) {
            console.error("Error eliminando pago:", error);
            setMsg("Error al eliminar el pago");
            setTipo("error");
        }
    };

    // Filtrar pagos
    const pagosFiltrados = pagos.filter(p => {
        // ✅ 1. Prioridad: Socio seleccionado en formulario (Ignora todo lo demás)
        if (socioSeleccionado) {
            return p.user_id === socioSeleccionado;
        }

        const matchBusqueda = !busqueda ||
            p.profiles?.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.profiles?.rut?.toLowerCase().includes(busqueda.toLowerCase());

        // ✅ 2. Si hay búsqueda manual, ignorar filtros de año/mes
        if (busqueda && matchBusqueda) return true;
        if (busqueda && !matchBusqueda) return false;

        const matchAnio = filtroAnio === "todos" || p.anio === parseInt(filtroAnio);
        const matchMes = filtroMes === "todos" || p.mes === parseInt(filtroMes);

        return matchAnio && matchMes;
    });

    // Calcular totales
    const totalRecaudado = pagosFiltrados
        .filter(p => p.estado === "pagado" || p.estado === "aprobado")
        .reduce((sum, p) => sum + parseFloat(p.monto_individual || 0), 0);

    if (loading) return <div className="p-6">Cargando...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 text-white shadow-2xl">
                <h1 className="text-4xl font-black mb-2">💰 Pagos Mensuales</h1>
                <p className="text-blue-100 text-lg">Sistema simplificado para registrar cuotas mensuales</p>


            </div>

            {/* Mensaje */}
            {msg && (
                <div className={`p-6 rounded-2xl border-2 text-lg font-bold animate-in fade-in ${tipo === "error"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-green-50 border-green-300 text-green-700"
                    }`}>
                    {msg}
                </div>
            )}

            {/* Formulario de Registro */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-blue-100">
                <h2 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
                    <div className="bg-blue-600 p-3 rounded-xl">
                        <DollarSign className="h-8 w-8 text-white" />
                    </div>
                    Registrar Nuevo Pago
                </h2>

                <form onSubmit={registrarPago} className="space-y-6">
                    {/* Grid Principal - 3 Columnas en Desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Columna 1: Fecha de Pago */}
                        <div>
                            <label className="block text-xl font-bold text-gray-700 mb-3">
                                <Calendar className="inline h-6 w-6 mr-2" />
                                Fecha de Pago
                            </label>
                            <input
                                type="date"
                                value={fechaPago}
                                onChange={(e) => setFechaPago(e.target.value)}
                                className="w-full text-xl p-4 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-bold"
                                required
                            />
                        </div>

                        {/* Columna 2: Socio Searchable */}
                        <div className="relative">
                            <label className="block text-xl font-bold text-gray-700 mb-3">
                                <User className="inline h-6 w-6 mr-2" />
                                Socio
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por Nombre o RUT..."
                                    value={busquedaSocio}
                                    onFocus={() => setMostrarDropdownSocios(true)}
                                    onClick={() => setMostrarDropdownSocios(true)}
                                    onChange={(e) => {
                                        setBusquedaSocio(e.target.value);
                                        setMostrarDropdownSocios(true);
                                        if (e.target.value === "") setSocioSeleccionado("");
                                    }}
                                    className="w-full text-xl p-4 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-bold"
                                />
                                {socioSeleccionado && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSocioSeleccionado("");
                                            setBusquedaSocio("");
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                    >
                                        <span className="text-xl font-bold">✕</span>
                                    </button>
                                )}
                            </div>

                            {mostrarDropdownSocios && busquedaSocio && !socioSeleccionado && (
                                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                    {sociosFiltrados.length > 0 ? (
                                        sociosFiltrados.map(socio => (
                                            <button
                                                key={socio.id}
                                                type="button"
                                                onClick={() => {
                                                    setSocioSeleccionado(socio.id);
                                                    setBusquedaSocio(`${socio.nombre_completo} - ${socio.rut}`);
                                                    setMostrarDropdownSocios(false);
                                                }}
                                                className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                                            >
                                                <div className="font-bold text-gray-800">{socio.nombre_completo}</div>
                                                <div className="text-sm text-gray-500">{socio.rut}</div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-gray-500 italic text-center">No se encontraron socios</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Columna 3: Tipo de Pago */}
                        <div>
                            <label className="block text-xl font-bold text-gray-700 mb-3">
                                <FileText className="inline h-6 w-6 mr-2" />
                                Tipo de Pago
                            </label>
                            <select
                                value={periodoId}
                                onChange={(e) => {
                                    const pid = e.target.value;
                                    setPeriodoId(pid);
                                    const sel = periodos.find(p => p.id === pid);
                                    if (sel) setMonto(sel.monto);
                                }}
                                className="w-full text-xl p-4 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-bold"
                                required
                            >
                                <option value="">Selecciona el tipo de pago...</option>
                                {periodos.filter(p => {
                                    if (!socioProfile?.fecha_ingreso) return true;
                                    const [y, m] = socioProfile.fecha_ingreso.split("-").map(Number);
                                    const anioIngreso = y;
                                    const mesIngreso = m;
                                    const matchAnio = p.nombre?.match(/(20\d{2})/);
                                    const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : null;
                                    if (!anioPeriodo) return true;
                                    if (anioPeriodo < anioIngreso) return false;
                                    if (anioPeriodo === anioIngreso) {
                                        const mesPeriodo = MESES.find(m => p.nombre?.toLowerCase().includes(m.nombre.toLowerCase()));
                                        if (mesPeriodo && mesPeriodo.numero < mesIngreso) return false;
                                    }
                                    return true;
                                }).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} ({p.concepto}) - ${p.monto.toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fila 2 - Columna 1: Cantidad de Cuotas */}
                        <div>
                            <label className="block text-xl font-bold text-gray-700 mb-3">
                                <DollarSign className="inline h-6 w-6 mr-2" />
                                Cantidad de Cuotas
                            </label>
                            <input
                                type="number"
                                value={cantidadCuotas}
                                onChange={(e) => setCantidadCuotas(Math.max(1, parseInt(e.target.value) || 1))}
                                className={`w-full text-xl p-4 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-bold ${periodos.find(p => p.id === periodoId && MESES.some(m => p.nombre?.toLowerCase().includes(m.nombre.toLowerCase())))
                                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                    : ""
                                    }`}
                                min="1"
                                required
                                disabled={periodos.find(p => p.id === periodoId && MESES.some(m => p.nombre?.toLowerCase().includes(m.nombre.toLowerCase())))}
                            />
                            {periodos.find(p => p.id === periodoId && MESES.some(m => p.nombre?.toLowerCase().includes(m.nombre.toLowerCase()))) && (
                                <p className="text-sm text-blue-600 mt-2 font-bold ml-1">🔒 Fijo en 1 cuota</p>
                            )}
                        </div>

                        {/* Fila 2 - Columna 2: Monto por Cuota */}
                        <div>
                            <label className="block text-xl font-bold text-gray-700 mb-3">
                                <DollarSign className="inline h-6 w-6 mr-2" />
                                Monto por Cuota
                            </label>
                            <input
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="w-full text-xl p-4 border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-bold"
                                placeholder="15000"
                                min="0"
                                step="100"
                                required
                            />
                        </div>

                        {/* Fila 2 - Columna 3: Estado */}
                        <div>
                            <label className="block text-xl font-bold text-gray-700 mb-3">Estado</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEstado("pagado")}
                                    className={`flex-1 p-4 rounded-xl font-black text-lg transition-all ${estado === "pagado"
                                        ? "bg-green-600 text-white shadow-lg scale-105"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <Check className="inline h-5 w-5 mr-1" />
                                    Pagado
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEstado("pendiente")}
                                    className={`flex-1 p-4 rounded-xl font-black text-lg transition-all ${estado === "pendiente"
                                        ? "bg-yellow-500 text-white shadow-lg scale-105"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <Clock className="inline h-5 w-5 mr-1" />
                                    Pendiente
                                </button>
                            </div>
                        </div>

                        {/* Fila 3 - Columna Completa: Comprobante */}
                        <div className="md:col-span-3 bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-300">
                            <label className="block text-xl font-bold text-gray-700 mb-4">
                                Comprobante (Opcional)
                            </label>

                            <div className="flex gap-4 mb-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModoComprobante("unico");
                                        setComprobantesIndividuales({});
                                    }}
                                    className={`flex-1 p-3 rounded-xl font-bold transition-all ${modoComprobante === "unico"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                        }`}
                                >
                                    📄 Un comprobante general
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModoComprobante("individual");
                                        setComprobante(null);
                                    }}
                                    className={`flex-1 p-3 rounded-xl font-bold transition-all ${modoComprobante === "individual"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                        }`}
                                >
                                    📑 Comprobante por cuota
                                </button>
                            </div>

                            {modoComprobante === "unico" ? (
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setComprobante(e.target.files[0])}
                                    className="w-full text-lg p-3 border border-gray-300 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            ) : (
                                <div className="space-y-3">
                                    {cuotasCalculadas.length === 0 ? (
                                        <p className="text-gray-400 italic text-center">
                                            Selecciona un socio y periodo para ver las cuotas
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {cuotasCalculadas.map((cuota, idx) => (
                                                <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-gray-200">
                                                    <span className="font-bold text-gray-700 text-sm">
                                                        {MESES.find(m => m.numero === cuota.mes)?.nombre} {cuota.anio}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => {
                                                            setComprobantesIndividuales(prev => ({
                                                                ...prev,
                                                                [idx]: e.target.files[0]
                                                            }));
                                                        }}
                                                        className="text-xs p-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Preview de Cuotas */}
                        {cuotasCalculadas.length > 0 && (
                            <div className="md:col-span-3 bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 mt-4">
                                <h3 className="text-xl font-black text-blue-900 mb-4 flex items-center gap-2">
                                    <Calendar className="h-6 w-6" />
                                    Distribución de Cuotas ({cuotasCalculadas.length})
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {cuotasCalculadas.map((c, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm text-center">
                                            <div className="text-blue-600 font-black">{MESES.find(m => m.numero === c.mes)?.nombre}</div>
                                            <div className="text-gray-500 font-bold">{c.anio}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-blue-800">Monto por cuota:</span>
                                        <span className="text-xl font-black text-blue-600">
                                            ${monto ? parseFloat(monto).toLocaleString('es-CL') : '0'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-blue-800">Total a registrar:</span>
                                        <span className="text-2xl font-black text-blue-600">
                                            ${monto && cuotasCalculadas.length > 0 ? (parseFloat(monto) * cuotasCalculadas.length).toLocaleString('es-CL') : '0'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Observaciones - Full Width */}
                        {/* Observaciones Removed */}
                        <div className="md:col-span-3"></div>

                    </div>

                    {/* Botón Submit */}
                    <button
                        type="submit"
                        disabled={guardando}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-2xl font-black py-4 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {guardando ? "Guardando..." : "✅ Registrar Pago"}
                    </button>
                </form>
            </div>

            {/* Historial de Pagos */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-gray-800">📋 Historial de Pagos</h2>
                    <div className="bg-blue-600 text-white px-6 py-3 rounded-xl">
                        <span className="text-sm font-bold">Total Recaudado</span>
                        <div className="text-2xl font-black">${totalRecaudado.toLocaleString()}</div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <select
                        value={filtroAnio}
                        onChange={(e) => setFiltroAnio(e.target.value)}
                        className="p-3 border-2 border-gray-300 rounded-xl font-bold"
                    >
                        <option value="todos">Todos los años</option>
                        {anios.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>

                    <select
                        value={filtroMes}
                        onChange={(e) => setFiltroMes(e.target.value)}
                        className="p-3 border-2 border-gray-300 rounded-xl font-bold"
                    >
                        <option value="todos">Todos los meses</option>
                        {MESES.map(m => (
                            <option key={m.numero} value={m.numero}>{m.nombre}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Buscar socio..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="md:col-span-2 p-3 border-2 border-gray-300 rounded-xl"
                    />
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 text-left font-black">Socio</th>
                                <th className="p-4 text-left font-black">Mes/Año</th>
                                <th className="p-4 text-left font-black">Monto</th>
                                <th className="p-4 text-left font-black">Estado</th>
                                <th className="p-4 text-center font-black">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {pagosFiltrados.map(pago => (
                                <tr key={pago.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-bold">{pago.profiles?.nombre_completo}</div>
                                        <div className="text-sm text-gray-500">{pago.profiles?.rut}</div>
                                    </td>
                                    <td className="p-4 font-bold">
                                        {MESES.find(m => m.numero === pago.mes)?.nombre} {pago.anio}
                                        <div className="text-xs text-gray-400 font-normal">{pago.payment_periods?.nombre}</div>
                                    </td>
                                    <td className="p-4 font-black text-lg text-blue-600">
                                        ${(pago.monto_individual || pago.payment_periods?.monto || 0).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-4 py-2 rounded-full font-bold text-sm ${pago.estado === "pagado"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-yellow-100 text-yellow-700"
                                            }`}>
                                            {pago.estado === "aprobado" || pago.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-wrap gap-2">
                                            {pago.installments?.map((c, i) => (
                                                <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                                    {c.label || (c.month ? `${MESES[c.month - 1].nombre} ${c.year}` : `Cuota ${c.installment_number}`)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {pagosFiltrados.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-xl">
                                {socioSeleccionado ? "Usuario sin registro de pagos" : "No hay pagos registrados"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
