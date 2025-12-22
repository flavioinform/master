import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { sendAdminNotification } from "@/lib/email";

const MESES = [
  { n: 1, name: "Enero" }, { n: 2, name: "Febrero" }, { n: 3, name: "Marzo" },
  { n: 4, name: "Abril" }, { n: 5, name: "Mayo" }, { n: 6, name: "Junio" },
  { n: 7, name: "Julio" }, { n: 8, name: "Agosto" }, { n: 9, name: "Septiembre" },
  { n: 10, name: "Octubre" }, { n: 11, name: "Noviembre" }, { n: 12, name: "Diciembre" }
];

export default function Vouchers() {
  const { user } = useContext(AppContext);

  const [periodos, setPeriodos] = useState([]);
  const [periodoSel, setPeriodoSel] = useState(null);

  // Map: period_id -> Array de vouchers del usuario
  const [misVouchersMap, setMisVouchersMap] = useState(new Map());

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [subiendo, setSubiendo] = useState(false);

  // Estado para controlar qué cuota se está subiendo actualmente
  const [cuotaSubiendo, setCuotaSubiendo] = useState(null); // número de cuota (1, 2...)

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  // ========== FILTROS CATEGORIA Y MES ==========
  const [catFiltro, setCatFiltro] = useState("todas"); // todas | mensual | anual
  const [mesFiltro, setMesFiltro] = useState("todos"); // todos | 1 | 2 ... 12
  const [planCuotas, setPlanCuotas] = useState(1);


  const load = async () => {
    setLoading(true);
    setMsg("");
    setTipo("");

    try {
      // 1) Periodos activos
      const { data: ps, error: e1 } = await supabase
        .from("payment_periods")
        .select("id,concepto,nombre,fecha_inicio,fecha_fin,monto,activo,created_at")
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (e1) throw e1;
      const list = ps || [];
      setPeriodos(list);

      // 2) Mis vouchers (ahora con cuota_numero y total_cuotas)
      if (list.length) {
        const ids = list.map((p) => p.id);
        const { data: vs, error: e2 } = await supabase
          .from("vouchers")
          .select("id, period_id, archivo_path, estado, comentario, created_at, updated_at, cuota_numero, total_cuotas")
          .eq("user_id", user.id)
          .in("period_id", ids)
          .order("cuota_numero", { ascending: true });

        if (e2) throw e2;

        const map = new Map();
        (vs || []).forEach((v) => {
          const arr = map.get(v.period_id) || [];
          arr.push(v);
          map.set(v.period_id, arr);
        });
        setMisVouchersMap(map);
      } else {
        setMisVouchersMap(new Map());
      }
    } catch (err) {
      console.error(err);
      setMsg(err?.message || "Error cargando datos.");
      setTipo("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ PERIODOS FILTRADOS
  const periodosFiltrados = useMemo(() => {
    let list = periodos;

    if (catFiltro === "mensual") {
      list = list.filter(p => p.concepto?.toLowerCase().includes("mensual") || p.nombre?.toLowerCase().match(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i));
      if (mesFiltro !== "todos") {
        const mesNombre = MESES.find(m => m.n === parseInt(mesFiltro))?.name.toLowerCase();
        list = list.filter(p => p.nombre?.toLowerCase().includes(mesNombre));
      }
    } else if (catFiltro === "anual") {
      list = list.filter(p => p.concepto?.toLowerCase().includes("anual") || p.nombre?.toLowerCase().includes("anual"));
    }

    return list;
  }, [periodos, catFiltro, mesFiltro]);

  // Vouchers del periodo seleccionado
  const vouchersActuales = useMemo(() => {
    if (!periodoSel) return [];
    return misVouchersMap.get(periodoSel.id) || [];
  }, [misVouchersMap, periodoSel]);

  // Determinar el "Plan" actual (cuántas cuotas son en total)
  // Si ya existen vouchers, tomamos 'total_cuotas' del primero.
  // Si no existen, usamos el estado local 'planCuotas' que el usuario elige.
  const totalCuotasDefinido = useMemo(() => {
    if (vouchersActuales.length > 0) {
      return vouchersActuales[0].total_cuotas || 1;
    }
    return planCuotas;
  }, [vouchersActuales, planCuotas]);

  const subir = async (nroCuota) => {
    setMsg("");
    setTipo("");

    if (!periodoSel) return;
    if (!file) {
      setMsg("Debes seleccionar el archivo primero.");
      setTipo("error");
      return;
    }

    try {
      setSubiendo(true);
      setCuotaSubiendo(nroCuota);

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${periodoSel.id}/c${nroCuota}_${crypto.randomUUID()}.${ext}`;

      // 1) Subir
      const { error: upErr } = await supabase.storage
        .from("vouchers")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (upErr) throw upErr;

      // 2) Insertar o actualizar
      // Buscamos si ya existe voucher para esta cuota
      const existente = vouchersActuales.find((v) => v.cuota_numero === nroCuota);

      if (!existente) {
        const { error: insErr } = await supabase.from("vouchers").insert({
          user_id: user.id,
          period_id: periodoSel.id,
          archivo_path: path,
          estado: "pendiente",
          cuota_numero: nroCuota,
          total_cuotas: totalCuotasDefinido
        });
        if (insErr) throw insErr;
      } else {
        const { error: upErr2 } = await supabase
          .from("vouchers")
          .update({
            archivo_path: path,
            estado: "pendiente",
            comentario: null,
            revisado_por: null,
            total_cuotas: totalCuotasDefinido // Asegurar consistencia
          })
          .eq("id", existente.id);
        if (upErr2) throw upErr2;
      }

      setFile(null);
      setMsg(`¡Cuota ${nroCuota} subida exitosamente!`);
      setTipo("success");

      // Notificación al Admin
      try {
        await sendAdminNotification("template_voucher", {
          from_name: user.nombre || "Usuario",
          from_email: user.email || "No disponible",
          message: `Nuevo comprobante subido para ${periodoSel.concepto} (${periodoSel.nombre}) - Cuota ${nroCuota}.`,
          type: "Validación de Pago"
        });
      } catch (emailErr) {
        console.warn("No se pudo enviar notificación por email:", emailErr);
      }

      await load(); // Recargar para ver cambios
    } catch (err) {
      console.error(err);
      setMsg("Error al subir comprobante.");
      setTipo("error");
    } finally {
      setSubiendo(false);
      setCuotaSubiendo(null);
    }
  };

  const verArchivo = async (path) => {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("vouchers")
      .createSignedUrl(path, 60);

    if (error) {
      alert("Error generando link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  // Renderizar las tarjetas de cuotas
  const renderCuotas = () => {
    const slots = [];
    const montoTotal = periodoSel?.monto || 0;
    const montoCuota = Math.ceil(montoTotal / totalCuotasDefinido);

    for (let i = 1; i <= totalCuotasDefinido; i++) {
      const voucher = vouchersActuales.find((v) => v.cuota_numero === i);
      const isUploadingThis = cuotaSubiendo === i;

      let estadoColor = "bg-gray-100 text-gray-500";
      let estadoTexto = "PENDIENTE DE PAGO";
      if (voucher) {
        if (voucher.estado === "pendiente") { estadoColor = "bg-yellow-100 text-yellow-800"; estadoTexto = "EN REVISIÓN"; }
        if (voucher.estado === "aprobado") { estadoColor = "bg-green-100 text-green-800"; estadoTexto = "APROBADO"; }
        if (voucher.estado === "rechazado") { estadoColor = "bg-red-100 text-red-800"; estadoTexto = "RECHAZADO"; }
      }

      slots.push(
        <div key={i} className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-bold text-lg text-gray-800">Cuota {i} de {totalCuotasDefinido}</h4>
              <p className="text-blue-600 font-semibold">${montoCuota.toLocaleString()}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${estadoColor}`}>
              {estadoTexto}
            </span>
          </div>

          {/* Si ya hay voucher, mostrar acciones */}
          {voucher ? (
            <div className="space-y-3">
              {voucher.comentario && (
                <p className="text-sm bg-red-50 text-red-700 p-2 rounded">
                  ⚠️ {voucher.comentario}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => verArchivo(voucher.archivo_path)}
                  className="flex-1 bg-gray-800 text-white py-2 rounded text-sm hover:bg-gray-900"
                >
                  Ver Comprobante
                </button>
                {/* Permitir re-subir si está rechazado o pendiente? Digamos que siempre se puede corregir */}
                <label className="flex-1 bg-blue-50 text-blue-700 py-2 rounded text-sm text-center cursor-pointer border border-blue-200 hover:bg-blue-100">
                  {isUploadingThis ? "Subiendo..." : "Corregir"}
                  <input type="file" className="hidden" accept="image/*,application/pdf"
                    onChange={(e) => {
                      setFile(e.target.files?.[0]);
                      // Truco: UX instantánea
                    }}
                  />
                </label>
              </div>
              {/* Si seleccionó archivo para CORREGIR est cuota específica */}
              {file && !cuotaSubiendo && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">{file.name}</p>
                  <button
                    onClick={() => subir(i)}
                    className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
                  >
                    Confirmar subida Cuota {i}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Aún no hay voucher (Pagar)
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="text-center p-2">
                  <span className="text-2xl text-gray-400">📷</span>
                  <p className="text-xs text-gray-500 mt-1">Subir comprobante</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    setFile(e.target.files?.[0]);
                  }}
                />
              </label>
              {file && !cuotaSubiendo && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500 mb-1">{file.name}</p>
                  <button
                    onClick={() => subir(i)}
                    className="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 font-bold"
                  >
                    Enviar Cuota {i}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return slots;
  };

  if (loading) return <div className="p-10 text-xl text-center">Cargando pagos...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ENCABEZADO */}
        <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Mis Pagos y Comprobantes</h1>
          <p className="text-lg md:text-xl opacity-90">
            Gestiona tus pagos en cuotas de forma sencilla.
          </p>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-lg font-medium border-l-4 shadow-sm ${tipo === "error" ? "bg-red-50 border-red-600 text-red-900" : "bg-green-50 border-green-600 text-green-900"
            }`}>
            {msg}
          </div>
        )}

        {/* PASO 1: SELECCIÓN */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
              <h2 className="text-2xl font-bold text-gray-800">Selecciona el Pago</h2>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Filtros de Categoría */}
              <div className="flex gap-1 bg-white p-1 rounded-xl border shadow-sm">
                {["todas", "mensual", "anual"].map(c => (
                  <button
                    key={c}
                    onClick={() => { setCatFiltro(c); setMesFiltro("todos"); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${catFiltro === c ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {c === "todas" ? "Todos" : c === "mensual" ? "Mensuales" : "Anuales"}
                  </button>
                ))}
              </div>

              {/* Filtro de Mes (solo si es mensual) */}
              {catFiltro === "mensual" && (
                <select
                  className="border rounded-xl px-3 py-1.5 text-xs font-bold bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={mesFiltro}
                  onChange={e => setMesFiltro(e.target.value)}
                >
                  <option value="todos">Todos los meses</option>
                  {MESES.map(m => <option key={m.n} value={m.n}>{m.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {periodosFiltrados.length === 0 && (
              <div className="col-span-full py-10 text-center bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 font-medium italic">No se encontraron pagos activos en esta categoría.</p>
              </div>
            )}

            {periodosFiltrados.map((p) => {
              const misVs = misVouchersMap.get(p.id) || [];
              const isSelected = periodoSel?.id === p.id;

              // Resumen de estado
              const pagadas = misVs.filter(v => v.estado === 'aprobado').length;
              // Ojo: si no tiene vouchers, tomamos planCuotas (para vista previa) o 1
              const totalC = misVs.length > 0 ? misVs[0].total_cuotas : (isSelected ? planCuotas : 1);
              const avance = totalC > 0 ? Math.round((pagadas / totalC) * 100) : 0;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPeriodoSel(p);
                    setFile(null);
                    setMsg("");
                  }}
                  className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${isSelected
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-300"
                    : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {p.concepto}
                  </h3>
                  <p className="text-gray-600 font-medium mb-3">{p.nombre}</p>
                  <p className="text-2xl font-bold text-blue-700 mb-2">${p.monto.toLocaleString()}</p>

                  {/* Barra de progreso simple */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${avance}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 flex justify-between">
                    {misVs.length > 0
                      ? <span>{pagadas}/{totalC} aprobadas</span>
                      : <span>Sin iniciar</span>
                    }
                    {avance === 100 && misVs.length > 0 && <span className="text-green-600 font-bold">¡COMPLETO!</span>}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {periodoSel && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

            {/* PASO 2: CONFIGURACIÓN (SOLO SI NO HAY PAGOS AÚN) */}
            {vouchersActuales.length === 0 && (
              <section className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
                  <h2 className="text-xl font-bold text-gray-800">Plan de Cuotas</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center bg-blue-50 p-4 rounded-xl">
                  <label className="text-gray-700 font-medium">
                    ¿En cuántas cuotas vas a pagar?
                  </label>
                  <select
                    value={planCuotas}
                    onChange={(e) => setPlanCuotas(Number(e.target.value))}
                    className="p-3 pr-10 border-2 border-blue-200 rounded-lg font-bold text-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} Cuota{n > 1 ? 's' : ''}</option>)}
                  </select>
                  <div className="text-sm text-blue-800 ml-auto font-medium">
                    Pagarás <span className="font-bold text-lg">${Math.ceil(periodoSel.monto / planCuotas).toLocaleString()}</span> x {planCuotas} meses
                  </div>
                </div>
              </section>
            )}

            {/* PASO 3: GESTIÓN DE CUOTAS */}
            <section className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">{vouchersActuales.length === 0 ? 3 : 2}</div>
                <h2 className="text-xl font-bold text-gray-800">Tus Cuotas</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderCuotas()}
              </div>
            </section>

          </div>
        )}

      </div>
    </div>
  );
}
