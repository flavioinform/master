import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { sendAdminNotification } from "@/lib/email";
import { DollarSign, FileText, Inbox, Clock, ChevronDown } from "lucide-react";

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
  const [filesPorCuota, setFilesPorCuota] = useState({}); // { cuotaId: File }
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
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear()); // ✅ Filtro de Año
  const [planCuotas, setPlanCuotas] = useState(1);

  // ========== MES Y AÑO PARA PAGOS MENSUALES ==========
  // Para la visualización de "Cuota Mensual" en grid de 12 meses
  const [anioVisual, setAnioVisual] = useState(new Date().getFullYear());
  const aniosDisponibles = useMemo(() => {
    return Array.from({ length: 33 }, (_, i) => 2008 + i);
  }, []);

  // ✅ NUEVOS ESTADOS PARA PAGO MULTIPLE
  const [multiCuotas, setMultiCuotas] = useState(false);
  const [numCuotasAPagar, setNumCuotasAPagar] = useState(1);
  const [mesesCalculados, setMesesCalculados] = useState([]);

  // ✅ PERFIL DEL USUARIO (para filtrar por fecha de ingreso)
  const [userProfile, setUserProfile] = useState(null);




  const load = async () => {
    setLoading(true);
    setMsg("");
    setTipo("");

    try {
      // 0) Cargar perfil del usuario (para obtener fecha de ingreso)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("fecha_ingreso")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.warn("No se pudo cargar el perfil:", profileError);
      } else {
        setUserProfile(profile);
      }

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
          .select("id, period_id, archivo_path, estado, comentario, created_at, updated_at, cuota_numero, total_cuotas, mes, anio, monto_individual")
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

  // ✅ PERIODOS FILTRADOS (con filtro por fecha de ingreso)
  const periodosFiltrados = useMemo(() => {
    let list = periodos;

    // ✅ FILTRO DE INSCRIPCIÓN: Mostrar solo la inscripción que pagó, ocultar las demás
    // La inscripción es un pago único, solo se paga una vez
    const todasLasInscripciones = Array.from(misVouchersMap.values())
      .flat()
      .filter(v => {
        const periodo = periodos.find(p => p.id === v.period_id);
        return periodo?.concepto?.toLowerCase().includes("inscripción") ||
          periodo?.concepto?.toLowerCase().includes("inscripcion") ||
          periodo?.nombre?.toLowerCase().includes("inscripción") ||
          periodo?.nombre?.toLowerCase().includes("inscripcion");
      });

    // Encontrar la inscripción aprobada (si existe)
    const inscripcionAprobada = todasLasInscripciones.find(v => v.estado === "aprobado");

    if (inscripcionAprobada) {
      // Si ya tiene inscripción aprobada, solo mostrar ESA inscripción, ocultar las demás
      list = list.filter(p => {
        const esInscripcion = p.concepto?.toLowerCase().includes("inscripción") ||
          p.concepto?.toLowerCase().includes("inscripcion") ||
          p.nombre?.toLowerCase().includes("inscripción") ||
          p.nombre?.toLowerCase().includes("inscripcion");

        // Si no es inscripción, mostrar
        if (!esInscripcion) return true;

        // Si es inscripción, solo mostrar la que ya pagó
        return p.id === inscripcionAprobada.period_id;
      });
    }

    // Filtrar por fecha de ingreso del usuario
    if (userProfile?.fecha_ingreso) {
      const fechaIngreso = new Date(userProfile.fecha_ingreso);
      const mesIngreso = fechaIngreso.getMonth() + 1; // 1-12
      const anioIngreso = fechaIngreso.getFullYear();

      list = list.filter(periodo => {
        // Extraer año del nombre del periodo (ej: "Cuota Mensual 2024" -> 2024)
        const matchAnio = periodo.nombre?.match(/(20\d{2})/);
        const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : null;

        // Si no tiene año en el nombre, permitirlo (periodos genéricos)
        if (!anioPeriodo) return true;

        // Si el periodo es de un año anterior al ingreso, no mostrarlo
        if (anioPeriodo < anioIngreso) return false;

        // Si es del mismo año, verificar el mes
        if (anioPeriodo === anioIngreso) {
          // Extraer mes del nombre (ej: "Enero 2024" -> 1)
          const mesMatch = periodo.nombre?.toLowerCase().match(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/);
          if (mesMatch) {
            const mesPeriodo = MESES.find(m => m.name.toLowerCase() === mesMatch[0])?.n;
            if (mesPeriodo && mesPeriodo < mesIngreso) {
              return false; // Mes anterior al ingreso
            }
          }
        }

        // Si es de un año posterior o mismo año/mes válido, mostrarlo
        return true;
      });
    }

    // Aplicar filtros de categoría
    if (catFiltro === "mensual") {
      list = list.filter(p => p.concepto?.toLowerCase().includes("mensual") || p.nombre?.toLowerCase().match(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i));
      if (mesFiltro !== "todos") {
        const mesNombre = MESES.find(m => m.n === parseInt(mesFiltro))?.name.toLowerCase();
        list = list.filter(p => p.nombre?.toLowerCase().includes(mesNombre));
      }
    } else if (catFiltro === "anual") {
      list = list.filter(p => p.concepto?.toLowerCase().includes("anual") || p.nombre?.toLowerCase().includes("anual"));
    }

    // ✅ FILTRO DE AÑO (Nuevo)
    if (anioFiltro !== "todos") {
      list = list.filter(p => {
        // Regex más flexible: busca 20XX en cualquier parte, no solo con límites de palabra
        const matchAnio = p.nombre?.match(/(20\d{2})/);
        const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : null;
        // Si el periodo TIENE año, debe coincidir. Si no tiene, se muestra siempre (genérico).
        return !anioPeriodo || anioPeriodo === parseInt(anioFiltro);
      });
    }

    return list;
  }, [periodos, catFiltro, mesFiltro, anioFiltro, userProfile, misVouchersMap]);

  // Vouchers del periodo seleccionado
  const vouchersActuales = useMemo(() => {
    if (!periodoSel) return [];
    return misVouchersMap.get(periodoSel.id) || [];
  }, [periodoSel, misVouchersMap]);

  // ✅ EFECTO PARA CALCULAR CUOTAS EN MODO MULTI
  useEffect(() => {
    if (!multiCuotas || !periodoSel) {
      setMesesCalculados([]);
      return;
    }

    const esMensual = periodoSel.concepto?.toLowerCase().includes("mensual") || periodoSel.nombre?.toLowerCase().includes("mensual");
    const totalC = periodoSel.total_cuotas || 1;

    if (esMensual) {
      // ✅ Extraer el año del nombre del periodo
      const matchAnio = periodoSel.nombre?.match(/(20\d{2})/);
      const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : new Date().getFullYear();

      // Identificar el primer mes pendiente en el año del periodo
      const pagados = vouchersActuales.filter(v => v.anio === anioPeriodo).map(v => v.mes);

      // Determinar el mes de inicio basado en la fecha de ingreso del usuario
      let mesInicio = 1; // Por defecto, enero
      if (userProfile?.fecha_ingreso) {
        const fechaIngreso = new Date(userProfile.fecha_ingreso);
        const mesIngreso = fechaIngreso.getMonth() + 1; // 1-12
        const anioIngreso = fechaIngreso.getFullYear();

        // Si estamos viendo el año de ingreso, empezar desde el mes de ingreso
        if (anioPeriodo === anioIngreso) {
          mesInicio = mesIngreso;
        }
      }

      let primerMesPendiente = mesInicio;
      for (let m = mesInicio; m <= 12; m++) {
        if (!pagados.includes(m)) {
          primerMesPendiente = m;
          break;
        }
      }

      const nuevosMeses = [];
      let currMes = primerMesPendiente;
      let currAnio = anioPeriodo;

      for (let i = 0; i < numCuotasAPagar; i++) {
        // Solo agregar meses que estén dentro del año del periodo
        if (currMes <= 12 && currAnio === anioPeriodo) {
          nuevosMeses.push({ mes: currMes, anio: currAnio });
          currMes++;
        } else {
          // Si llegamos a un nuevo año, detener el cálculo
          break;
        }
      }
      setMesesCalculados(nuevosMeses);
    } else {
      // Lógica de cuotas genéricas
      const pagadas = vouchersActuales.map(v => v.cuota_numero);
      let proximaCuota = 1;
      for (let i = 1; i <= totalC; i++) {
        if (!pagadas.includes(i)) {
          proximaCuota = i;
          break;
        }
      }

      const nuevasCuotas = [];
      for (let i = 0; i < numCuotasAPagar; i++) {
        const nro = proximaCuota + i;
        if (nro <= totalC) {
          nuevasCuotas.push({ nro });
        }
      }
      setMesesCalculados(nuevasCuotas);
    }

  }, [multiCuotas, numCuotasAPagar, periodoSel, vouchersActuales, userProfile]);

  // Determinar el "Plan" actual (cuántas cuotas son en total)
  // Si ya existen vouchers, tomamos 'total_cuotas' del primero.
  // Si no existen, usamos el estado local 'planCuotas' que el usuario elige.
  const totalCuotasDefinido = useMemo(() => {
    if (vouchersActuales.length > 0) {
      return vouchersActuales[0].total_cuotas || 1;
    }
    return planCuotas;
  }, [vouchersActuales, planCuotas]);

  const subir = async (nroCuota, customMes = null, customAnio = null, cuotasArray = null) => {
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
      setCuotaSubiendo(cuotasArray ? "multi" : nroCuota);

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const pathPart = cuotasArray ? `multi_${Date.now()}` : (customAnio && customMes ? `${customAnio}/${customMes}` : `c${nroCuota}`);
      const path = `${user.id}/${periodoSel.id}/${pathPart}_${crypto.randomUUID()}.${ext}`;

      // 1) Subir
      const { error: upErr } = await supabase.storage
        .from("vouchers")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (upErr) throw upErr;

      // 2) Insertar o actualizar
      let listaCuotas = [];
      if (cuotasArray) {
        listaCuotas = cuotasArray.map(c => ({
          nro: c.nro || null,
          mes: c.mes || null,
          anio: c.anio || null
        }));
      } else {
        // Para pagos mensuales: nro debe ser null, solo usar mes/anio
        // Para pagos por cuotas: mes/anio deben ser null, solo usar nro
        listaCuotas = [{
          nro: (customMes && customAnio) ? null : nroCuota,
          mes: customMes || null,
          anio: customAnio || null
        }];
      }

      const insertPromises = listaCuotas.map(c => {
        const existente = c.mes && c.anio
          ? vouchersActuales.find(v => v.mes === c.mes && v.anio === c.anio)
          : vouchersActuales.find(v => v.cuota_numero === c.nro);

        if (!existente) {
          const insertData = {
            user_id: user.id,
            period_id: periodoSel.id,
            archivo_path: path,
            estado: "pendiente",
            cuota_numero: c.nro || null,
            total_cuotas: totalCuotasDefinido,
            mes: c.mes || null,
            anio: c.anio || null
          };
          return supabase.from("vouchers").insert(insertData);
        } else {
          const updateData = {
            archivo_path: path,
            estado: "pendiente",
            comentario: null,
            revisado_por: null,
            total_cuotas: totalCuotasDefinido
          };
          return supabase.from("vouchers").update(updateData).eq("id", existente.id);
        }
      });

      const results = await Promise.all(insertPromises);
      const errRes = results.find(r => r.error);
      if (errRes) throw errRes.error;

      setFile(null);
      // Limpiar el archivo específico de la cuota
      if (nroCuota && !cuotasArray) {
        setFilesPorCuota(prev => {
          const newFiles = { ...prev };
          delete newFiles[nroCuota];
          return newFiles;
        });
      }
      setMsg(cuotasArray ? `¡${cuotasArray.length} cuota(s) subida(s) exitosamente!` : `¡Cuota ${nroCuota} subida exitosamente!`);
      setTipo("success");
      setMultiCuotas(false);

      // Notificación al Admin
      try {
        const detalle = cuotasArray
          ? `${cuotasArray.length} cuotas (${cuotasArray[0].mes}/${cuotasArray[0].anio} en adelante)`
          : (customMes && customAnio
            ? `Mes: ${MESES[customMes - 1].name} ${customAnio}`
            : `Cuota ${nroCuota}`);

        await sendAdminNotification("template_voucher", {
          from_name: user.nombre_completo || user.nombre || "Usuario",
          from_email: user.email || "No disponible",
          message: `Nuevo comprobante subido para ${periodoSel.concepto} (${periodoSel.nombre}) - ${detalle}.`,
          type: "Validación de Pago"
        });
      } catch (emailErr) {
        console.warn("No se pudo enviar notificación por email:", emailErr);
      }

      await load();
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

  // Renderizar las tarjetas de cuotas - SENIOR PRO
  const renderCuotas = () => {
    const slots = [];
    const esCuotaMensual = periodoSel?.concepto?.toLowerCase().includes("mensual") || periodoSel?.nombre?.toLowerCase().includes("mensual");

    // ✅ Extraer el año del nombre del periodo
    const matchAnio = periodoSel?.nombre?.match(/(20\d{2})/);
    const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : new Date().getFullYear();

    let iteraciones = esCuotaMensual ? 12 : totalCuotasDefinido;
    let mesInicio = 1; // Por defecto, empezar desde Enero

    // Si es pago mensual y el usuario tiene fecha de ingreso, filtrar
    if (esCuotaMensual && userProfile?.fecha_ingreso) {
      const fechaIngreso = new Date(userProfile.fecha_ingreso);
      const mesIngreso = fechaIngreso.getMonth() + 1; // 1-12
      const anioIngreso = fechaIngreso.getFullYear();

      // Si estamos viendo el año de ingreso, empezar desde el mes de ingreso
      if (anioPeriodo === anioIngreso) {
        mesInicio = mesIngreso;
      }
      // Si estamos viendo un año anterior al ingreso, no mostrar nada
      else if (anioPeriodo < anioIngreso) {
        return (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400 font-bold text-lg">
              No puedes pagar meses anteriores a tu fecha de ingreso
            </p>
          </div>
        );
      }
    }

    const montoCuota = esCuotaMensual ? (periodoSel?.monto || 0) : Math.ceil((periodoSel?.monto || 0) / (totalCuotasDefinido || 1));

    for (let i = mesInicio; i <= iteraciones; i++) {
      const voucher = esCuotaMensual
        ? vouchersActuales.find(v => v.mes === i && v.anio === anioPeriodo)
        : vouchersActuales.find(v => v.cuota_numero === i);

      const isUploadingThis = cuotaSubiendo === i;
      const label = esCuotaMensual ? MESES[i - 1].name.toUpperCase() : `CUOTA ${i} DE ${totalCuotasDefinido}`;

      let estadoColor = "bg-slate-100 text-slate-400 border-slate-200";
      let estadoTexto = "PENDIENTE";
      if (voucher) {
        if (voucher.estado === "pendiente") { estadoColor = "bg-amber-100 text-amber-700 border-amber-500 shadow-sm"; estadoTexto = "EN REVISIÓN"; }
        if (voucher.estado === "aprobado") { estadoColor = "bg-emerald-100 text-emerald-700 border-emerald-500 shadow-sm"; estadoTexto = "APROBADO"; }
        if (voucher.estado === "rechazado") { estadoColor = "bg-rose-100 text-rose-700 border-rose-500 shadow-sm"; estadoTexto = "RECHAZADO"; }
      }

      slots.push(
        <div key={i} className={`bg-white border rounded-[1.5rem] p-3 md:p-4 transition-all shadow-sm hover:shadow-md flex flex-col justify-between min-h-[150px] group ${voucher?.estado === 'aprobado' ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 hover:border-blue-200'}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-black text-sm text-slate-900 leading-tight uppercase tracking-tight">{label}</h4>
              <span className={`text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest whitespace-nowrap ${estadoColor}`}>
                {estadoTexto}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-blue-400">$</span>
              <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {/* Si el voucher existe y tiene monto guardado, usar ese. Si no, usar monto calculado */}
                {(voucher && voucher.monto_individual) ? voucher.monto_individual.toLocaleString() : montoCuota.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4">
            {voucher ? (
              <div className="space-y-2">
                {/* Solo mostrar comentario si NO es importación Excel genérica */}
                {voucher.comentario && voucher.archivo_path !== "excel-import/historico" && (
                  <div className="bg-rose-50 text-rose-600 p-2 rounded-lg border border-rose-100 text-[9px] font-bold uppercase tracking-wider">
                    {voucher.comentario}
                  </div>
                )}

                {/* Si es importación Excel SIN comprobante real, mostrar mensaje especial */}
                {voucher.archivo_path === "excel-import/historico" && (
                  <div className="bg-gray-100 text-gray-600 p-4 rounded-xl border border-gray-200 text-xs font-bold uppercase tracking-wider text-center">
                    📋 COMPROBANTE NO VISIBLE
                  </div>
                )}

                {/* Mostrar botón Ver Comprobante si NO es importación Excel genérica */}
                {voucher.archivo_path !== "excel-import/historico" && (
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => verArchivo(voucher.archivo_path)}
                      className="w-full bg-slate-900 hover:bg-black text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                      Ver Comprobante
                    </button>
                    {/* ✅ Solo permitir cambiar archivo si está RECHAZADO */}
                    {voucher.estado === "rechazado" && !(periodoSel?.nombre?.toLowerCase().includes("histórico") || periodoSel?.concepto?.toLowerCase().includes("histórico")) && (
                      <label className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg text-[9px] font-black uppercase text-center cursor-pointer transition-all active:scale-95">
                        {isUploadingThis ? "Subiendo..." : "📤 Subir Nuevo Comprobante"}
                        <input type="file" className="hidden" accept="image/*,application/pdf"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                              setFilesPorCuota(prev => ({ ...prev, [i]: selectedFile }));
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
                {filesPorCuota[i] && !cuotaSubiendo && voucher.estado === "rechazado" && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg animate-in zoom-in-95">
                    <p className="text-[8px] font-bold text-blue-600 truncate mb-1.5 italic">{filesPorCuota[i].name}</p>
                    <button
                      onClick={() => {
                        setFile(filesPorCuota[i]);
                        setTimeout(() => {
                          esCuotaMensual ? subir(i, i, anioPeriodo) : subir(i);
                        }, 100);
                      }}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm shadow-blue-500/20"
                    >
                      Confirmar Subida
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-100 bg-slate-50/50 rounded-xl cursor-pointer hover:bg-white hover:border-blue-400 transition-all group overflow-hidden relative">
                  {(periodoSel?.nombre?.toLowerCase().includes("histórico") || periodoSel?.concepto?.toLowerCase().includes("histórico")) ? (
                    // ✅ MODO LECTURA para Históricos
                    <div className="text-center p-3 grayscale opacity-50 cursor-not-allowed">
                      <Clock className="h-4 w-4 text-slate-300 mx-auto mb-1" />
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pago Histórico</p>
                    </div>
                  ) : (
                    // ✅ MODO SUBIDA NORMAL
                    <>
                      <div className="text-center p-3 group-hover:scale-110 transition-transform">
                        <FileText className="h-4 w-4 text-slate-300 mx-auto mb-1" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subir Ahora</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) {
                            setFilesPorCuota(prev => ({ ...prev, [i]: selectedFile }));
                          }
                        }}
                      />
                    </>
                  )}
                </label>
                {filesPorCuota[i] && !cuotaSubiendo && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[8px] font-bold text-blue-600 truncate mb-2 italic">{filesPorCuota[i].name}</p>
                    <button
                      onClick={() => {
                        setFile(filesPorCuota[i]);
                        setTimeout(() => {
                          esCuotaMensual ? subir(i, i, anioPeriodo) : subir(i);
                        }, 100);
                      }}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      Enviar Cuota {i}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return slots;
  };

  if (loading) return <div className="p-10 text-xl text-center">Cargando pagos...</div>;

  return (
    <div className="min-h-screen bg-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">

        {/* ENCABEZADO - Clean Modern */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              <p className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">Estado de Cuenta</p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tight leading-none uppercase">
              Mis Pagos
            </h1>
            <p className="text-lg md:text-xl font-medium text-slate-400 max-w-xl">
              Gestiona tus comprobantes, revisa tus cuotas pendientes y mantén tu estado de socio al día.
            </p>
          </div>
          <div className="absolute top-0 right-0 p-10 opacity-5 blur-sm scale-150 rotate-12">
            <DollarSign className="w-64 h-64" />
          </div>
        </div>

        {msg && (
          <div className={`p-6 rounded-[1.5rem] border text-lg font-bold text-center animate-in zoom-in duration-300 ${tipo === "error" ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
            {msg.toUpperCase()}
          </div>
        )}

        {/* PASO 1: SELECCIÓN - Clean Modern */}
        <section className="bg-slate-50/50 border border-slate-100 rounded-[3rem] p-8 md:p-10 space-y-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">1</div>
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Selección de Cobro</h2>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">¿Qué deseas pagar hoy?</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              {/* Filtros de Categoría - Clean Modern */}
              <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                {["todas", "mensual", "anual"].map(c => (
                  <button
                    key={c}
                    onClick={() => { setCatFiltro(c); setMesFiltro("todos"); }}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${catFiltro === c ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {c === "todas" ? "Todos" : c === "mensual" ? "Mensual" : "Anual"}
                  </button>
                ))}
              </div>

              {/* Filtro de Mes - Clean Modern */}
              {catFiltro === "mensual" && (
                <div className="relative">
                  <select
                    className="bg-white border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 outline-none cursor-pointer appearance-none pr-12 shadow-sm focus:border-blue-600 transition-all uppercase"
                    value={mesFiltro}
                    onChange={e => setMesFiltro(e.target.value)}
                  >
                    <option value="todos">Todos los meses</option>
                    {MESES.map(m => <option key={m.n} value={m.n}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* ✅ Filtro de Año - Clean Modern */}
              <div className="relative">
                <select
                  className="bg-white border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 outline-none cursor-pointer appearance-none pr-12 shadow-sm focus:border-blue-600 transition-all uppercase"
                  value={anioFiltro}
                  onChange={e => setAnioFiltro(e.target.value)}
                >
                  <option value="todos">Todos los años</option>
                  {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {periodosFiltrados.length === 0 && (
              <div className="col-span-full py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                <p className="text-xl text-slate-300 font-bold italic uppercase tracking-widest">No hay cobros activos para esta categoría</p>
              </div>
            )}

            {periodosFiltrados.map((p) => {
              const misVs = misVouchersMap.get(p.id) || [];
              const isSelected = periodoSel?.id === p.id;

              // Resumen de estado
              const pagadas = misVs.filter(v => v.estado === 'aprobado').length;

              // ✅ Para pagos mensuales, el total siempre es 12 (meses del año)
              const esMensual = p.concepto?.toLowerCase().includes("mensual") || p.nombre?.toLowerCase().includes("mensual");
              let totalC;
              if (esMensual) {
                // Para pagos mensuales, contar cuántos meses debe pagar según su fecha de ingreso
                if (userProfile?.fecha_ingreso) {
                  const fechaIngreso = new Date(userProfile.fecha_ingreso);
                  const mesIngreso = fechaIngreso.getMonth() + 1;
                  const anioIngreso = fechaIngreso.getFullYear();

                  // Extraer año del periodo
                  const matchAnio = p.nombre?.match(/(20\d{2})/);
                  const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : new Date().getFullYear();

                  if (anioPeriodo === anioIngreso) {
                    // Si es el año de ingreso, contar desde el mes de ingreso hasta diciembre
                    totalC = 12 - mesIngreso + 1;
                  } else if (anioPeriodo > anioIngreso) {
                    // Si es un año posterior, son 12 meses completos
                    totalC = 12;
                  } else {
                    // Si es un año anterior (no debería pasar), 0
                    totalC = 0;
                  }
                } else {
                  // Si no hay fecha de ingreso, asumir 12 meses
                  totalC = 12;
                }
              } else {
                // Para pagos no mensuales, usar el valor guardado o el plan seleccionado
                totalC = misVs.length > 0 ? misVs[0].total_cuotas : (isSelected ? planCuotas : 1);
              }

              const avance = totalC > 0 ? Math.round((pagadas / totalC) * 100) : 0;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPeriodoSel(p);
                    setFile(null);
                    setMsg("");
                  }}
                  className={`text-left p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group shadow-sm ${isSelected
                    ? "border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/5 shadow-blue-500/10"
                    : "border-slate-100 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-1"
                    }`}
                >
                  <div className="space-y-4">
                    <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">{p.concepto}</span>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase leading-tight tracking-tight">
                      {p.nombre}
                    </h3>
                  </div>

                  <div className="my-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-blue-400">$</span>
                      <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {(() => {
                          // Calculate total paid by user for this period
                          const totalPagadoUser = misVs.reduce((acc, v) => acc + (v.monto_individual || 0), 0);
                          // If period amount is 0 (historical) or if user has paid MORE than 0, prefer showing what they paid/will pay?
                          // Logic: If period.monto is 0, definitely show totalPagadoUser.
                          // If period.monto > 0, usually we show the period price.
                          const amountToShow = p.monto > 0 ? p.monto : totalPagadoUser;
                          return amountToShow.toLocaleString();
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Barra de progreso Clean Modern */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">
                        {pagadas}/{totalC} Pagados
                      </span>
                      {avance === 100 && misVs.length > 0 ? (
                        <span className="text-emerald-500 font-black">Completado ✓</span>
                      ) : (
                        <span className="text-blue-600">{avance}%</span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${avance === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${avance}%` }}></div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-6 right-6 text-xl p-2 bg-blue-600 text-white rounded-xl shadow-lg animate-bounce">
                      ↓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {periodoSel && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12">

            {/* PASO 2: CONFIGURACIÓN - Clean Modern */}
            {vouchersActuales.length === 0 && !periodoSel.concepto?.toLowerCase().includes("mensual") && (
              <section className="bg-white border border-slate-100 p-8 md:p-10 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-6 mb-10">
                  <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">2</div>
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Plan de Cuotas</h2>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Configura tu forma de pago</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-8 md:p-10 rounded-3xl space-y-8">
                  <label className="text-xs font-black text-blue-900 uppercase tracking-[0.2em] block ml-1">
                    Selecciona el número de cuotas:
                  </label>
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="relative w-full md:w-80">
                      <select
                        value={planCuotas}
                        onChange={(e) => setPlanCuotas(Number(e.target.value))}
                        className="w-full p-5 border border-slate-200 rounded-2xl font-black text-xl bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all appearance-none pr-12"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} {n > 1 ? 'Cuotas' : 'Cuota'}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 w-full bg-white px-8 py-5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monto Mensual:</span>
                      <span className="text-2xl font-black text-blue-600">${Math.ceil(periodoSel.monto / planCuotas).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SELECCIÓN DE AÑO PARA CUOTAS MENSUALES - OCULTO PARA EVITAR CONFUSIÓN */}
            {/* El año se determina automáticamente del nombre del periodo */}
            {false && (periodoSel.concepto?.toLowerCase().includes("mensual") || periodoSel.nombre?.toLowerCase().includes("mensual")) && (
              <section className="bg-white border border-slate-100 p-8 md:p-10 rounded-[2.5rem] shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">2</div>
                    <div className="space-y-1">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Periodo de Pago</h2>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Filtra por año de emisión</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    <select
                      className="bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-12 py-4 text-sm font-black text-slate-900 outline-none cursor-pointer appearance-none shadow-sm focus:border-blue-600 focus:bg-white transition-all uppercase min-w-[200px]"
                      value={anioVisual}
                      onChange={e => setAnioVisual(Number(e.target.value))}
                    >
                      {aniosDisponibles.map(a => (
                        <option key={a} value={a}>AÑO {a}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* PASO 3: GESTIÓN DE CUOTAS - Clean Modern */}
            <section className="bg-white border border-slate-100 p-8 md:p-10 rounded-[2.5rem] shadow-sm space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
                    {vouchersActuales.length === 0 ? 3 : 2}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Registro de Cuotas</h2>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Sube tus comprobantes aquí</p>
                  </div>
                </div>

                {/* Toggle Multi-pago (Solo si es mensual) */}
                {(periodoSel.concepto?.toLowerCase().includes("mensual") || periodoSel.nombre?.toLowerCase().includes("mensual")) && (
                  <button
                    onClick={() => {
                      setMultiCuotas(!multiCuotas);
                      setFile(null);
                    }}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black border transition-all transform active:scale-95 shadow-sm ${multiCuotas
                      ? "bg-blue-600 text-white border-blue-500 shadow-blue-600/20"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-600 hover:text-blue-600"
                      }`}
                  >
                    <Inbox className="h-4 w-4" />
                    {multiCuotas ? "Modo Individual" : "Pagar Varios Meses"}
                  </button>
                )}
              </div>

              {/* Interfaz de Multi-pago - Clean Modern */}
              {multiCuotas && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-[2.5rem] p-8 md:p-10 animate-in zoom-in-95 duration-300 space-y-8">
                  <div className="flex items-center gap-4 border-b border-blue-100 pb-6">
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Pago Multifunción</h3>
                      <p className="text-xs font-medium text-blue-600/60 uppercase tracking-widest">Sube un comprobante para varios meses</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        1. Cantidad de cuotas
                      </label>
                      <input
                        type="number"
                        value={numCuotasAPagar}
                        onChange={(e) => {
                          const maxMeses = (() => {
                            if (!periodoSel || !userProfile?.fecha_ingreso) return 12;
                            const esMensual = periodoSel.concepto?.toLowerCase().includes("mensual") || periodoSel.nombre?.toLowerCase().includes("mensual");
                            if (!esMensual) return 12;

                            const fechaIngreso = new Date(userProfile.fecha_ingreso);
                            const mesIngreso = fechaIngreso.getMonth() + 1;
                            const anioIngreso = fechaIngreso.getFullYear();

                            const matchAnio = periodoSel?.nombre?.match(/(20\d{2})/);
                            const anioPeriodo = matchAnio ? parseInt(matchAnio[1]) : new Date().getFullYear();

                            if (anioPeriodo === anioIngreso) {
                              return 12 - mesIngreso + 1;
                            }
                            return 12;
                          })();
                          const val = Math.max(1, Math.min(maxMeses, parseInt(e.target.value) || 1));
                          setNumCuotasAPagar(val);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-gray-50 text-gray-800 text-center font-bold text-lg"
                        min="1"
                        max="12"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        2. Comprobante Único
                      </label>
                      <label className="flex flex-col items-center justify-center bg-white p-6 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:bg-white hover:border-blue-600 transition-all shadow-sm group h-[100px]">
                        <span className="text-xs font-black text-blue-600 uppercase text-center break-all opacity-80 group-hover:opacity-100">
                          {file ? file.name : "Seleccionar archivo..."}
                        </span>
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0])} />
                      </label>
                    </div>
                  </div>

                  {/* Preview de Meses */}
                  {mesesCalculados.length > 0 && (
                    <div className="bg-white border border-blue-100 p-6 rounded-2xl space-y-4 shadow-sm">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" /> Cubrirá los siguientes meses:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {mesesCalculados.map((m, i) => (
                          <div key={i} className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-sm font-bold text-blue-700 animate-in fade-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                            {MESES[m.mes - 1].name} {m.anio}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={() => subir(0, 0, 0, mesesCalculados)}
                      disabled={!file || subiendo}
                      className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                    >
                      {subiendo ? "Procesando..." : `Confirmar Pago de ${numCuotasAPagar} Meses`}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderCuotas()}
              </div>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
