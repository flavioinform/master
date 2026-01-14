import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import * as XLSX from "xlsx"; // ✅ Import XLSX

import {
  Calendar, DollarSign, User, Check, Clock, FileText, AlertCircle,
  ShieldCheck, CheckCircle2, History, Settings, Search, Download,
  CreditCard, Trash2, Edit, X, ChevronRight, Plus, Loader2,
  Tag, Settings2, Eye, Inbox, MessageSquare, Upload
} from "lucide-react";
import ImportUsersModal from "@/components/ImportUsersModal";
import master12Logo from "@/assets/galeria/master12.png";

const MESES = [
  { n: 1, name: "Enero" }, { n: 2, name: "Febrero" }, { n: 3, name: "Marzo" },
  { n: 4, name: "Abril" }, { n: 5, name: "Mayo" }, { n: 6, name: "Junio" },
  { n: 7, name: "Julio" }, { n: 8, name: "Agosto" }, { n: 9, name: "Septiembre" },
  { n: 10, name: "Octubre" }, { n: 11, name: "Noviembre" }, { n: 12, name: "Diciembre" }
];

const RANGE_ANIOS = Array.from({ length: 33 }, (_, i) => 2008 + i); // 2008 to 2040

// Helper to normalize RUT (remove non-alphanumeric, lowercase)
const normalizeRut = (rut) => {
  return String(rut || "").replace(/[^0-9kK]/g, "").toLowerCase();
};

export default function VouchersAdmin() {
  const { user } = useContext(AppContext);

  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showImport, setShowImport] = useState(false);
  const [tab, setTab] = useState("validacion"); // ✅ Tabs: validacion | historial

  const [periodos, setPeriodos] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]); // ✅ Todos los perfiles para registro manual

  // ========== FILTROS TAB VALIDACION ==========
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // ========== FILTROS TAB HISTORIAL ==========
  const [anioHistorial, setAnioHistorial] = useState(new Date().getFullYear()); // Default current year
  const [mesHistorial, setMesHistorial] = useState("todos"); // todos | 1 | 2 ... 12
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  // ✅ form periodo (crear)
  const [concepto, setConcepto] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState(""); // error | success

  // ========== FILTROS CATEGORIA Y MES ==========
  const [catFiltro, setCatFiltro] = useState("todas"); // todas | mensual | anual
  const [mesFiltro, setMesFiltro] = useState("todos"); // todos | 1 | 2 ... 12

  // ✅ Estado para creación de periodo (modificado)
  const [anioCreacion, setAnioCreacion] = useState(new Date().getFullYear());



  // ✅ editar período
  const [editando, setEditando] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // ✅ editar voucher (pago individual)
  const [vEdit, setVEdit] = useState(null);
  const [showVEdit, setShowVEdit] = useState(false);
  const [subiendoAdmin, setSubiendoAdmin] = useState(false);

  // ✅ registro manual
  const [showManual, setShowManual] = useState(false);
  const [filtroUsuarioManual, setFiltroUsuarioManual] = useState("");
  const [usuarioManualSeleccionado, setUsuarioManualSeleccionado] = useState(null); // Profile completo seleccionado
  const [crearNuevoPeriodo, setCrearNuevoPeriodo] = useState(false);
  const [crearNuevoConceptoManual, setCrearNuevoConceptoManual] = useState(false);
  const [nuevoConceptoNombreManual, setNuevoConceptoNombreManual] = useState("");
  const [nuevoPeriodoData, setNuevoPeriodoData] = useState({ concepto: "", nombre: "", monto: "" });
  const [archivoManual, setArchivoManual] = useState(null);
  const [manualData, setManualData] = useState({
    user_id: "",
    period_id: "",
    cuota_numero: 1,
    total_cuotas: 1,
    mes: null,
    anio: new Date().getFullYear(),
    estado: "aprobado",
    comentario: "Registro manual admin",
    created_at: new Date().toISOString().slice(0, 10)
  });

  const [conceptos, setConceptos] = useState([]);
  const [showConceptos, setShowConceptos] = useState(false);
  const [nuevoConceptoName, setNuevoConceptoName] = useState("");
  const [modalError, setModalError] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    setTipo("");



    try {
      // 1) rol
      const { data: profile, error: e0 } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (e0) throw e0;
      setRol(profile.rol);

      // 1.5) conceptos
      const { data: c, error: ec } = await supabase
        .from("payment_concepts")
        .select("*")
        .order("name", { ascending: true });

      if (ec) console.warn("Error conceptos", ec);
      setConceptos(c || []);

      // 2) periodos
      const { data: p, error: e1 } = await supabase
        .from("payment_periods")
        .select("*")
        .order("created_at", { ascending: false });

      if (e1) throw e1;
      setPeriodos(p || []);

      // 2.5) todos los perfiles (para dropdown manual)
      const { data: ap, error: eap } = await supabase
        .from("profiles")
        .select("id, nombre_completo, rut, email")
        .order("nombre_completo", { ascending: true });
      if (eap) console.warn("Error allProfiles", eap);
      setAllProfiles(ap || []);

      // 3) vouchers (sin join)
      // Fetch ALL vouchers to be able to show history
      const { data: v, error: e2 } = await supabase
        .from("vouchers")
        .select("id, user_id, period_id, archivo_path, estado, comentario, created_at, updated_at, cuota_numero, total_cuotas, monto_individual, mes, anio")
        .order("created_at", { ascending: false });

      if (e2) throw e2;

      // 4) traer perfiles y periodos relacionados
      const userIds = [...new Set((v || []).map((x) => x.user_id))];
      const periodIds = [...new Set((v || []).map((x) => x.period_id))];

      const [{ data: profs, error: e3 }, { data: per, error: e4 }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, nombre_completo, email, rut, numero_cuenta, banco").in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
        periodIds.length
          ? supabase.from("payment_periods").select("id, concepto, nombre, fecha_inicio, fecha_fin, monto").in("id", periodIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (e3) throw e3;
      if (e4) throw e4;

      const profMap = new Map((profs || []).map((x) => [x.id, x]));
      const perMap = new Map((per || []).map((x) => [x.id, x]));

      const merged = (v || []).map((row) => ({
        ...row,
        profiles: profMap.get(row.user_id) || null,
        payment_periods: perMap.get(row.period_id) || null,
      }));

      setVouchers(merged);
    } catch (err) {
      setMsg(err?.message || "Error inesperado.");
      setTipo("error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ IMPORTAR EXCEL HISTÓRICO (Flexible)
  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Obtener nombre del archivo sin extensión
    const nombreArchivo = file.name.replace(/\.[^/.]+$/, "");

    // Pedir año
    const anio = prompt("¿De qué año es este Excel histórico?", new Date().getFullYear());
    if (!anio || isNaN(parseInt(anio))) {
      alert("Año inválido");
      e.target.value = '';
      return;
    }

    // Pedir mes
    const mesTexto = prompt(
      "¿De qué mes es este Excel histórico?\n\n" +
      "1 = Enero, 2 = Febrero, 3 = Marzo, 4 = Abril\n" +
      "5 = Mayo, 6 = Junio, 7 = Julio, 8 = Agosto\n" +
      "9 = Septiembre, 10 = Octubre, 11 = Noviembre, 12 = Diciembre",
      new Date().getMonth() + 1
    );

    const mes = parseInt(mesTexto);
    if (!mes || mes < 1 || mes > 12) {
      alert("Mes inválido. Debe ser un número entre 1 y 12");
      e.target.value = '';
      return;
    }

    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // Pedir nombre del periodo (sugerir nombre del archivo)
    const nombrePeriodo = prompt(
      "¿Cómo se llama el periodo?\n(Presiona Enter para usar el nombre del archivo)",
      nombreArchivo
    );

    if (!nombrePeriodo) {
      e.target.value = '';
      return;
    }

    const confirmImport = window.confirm(
      `¿Confirmas importar este Excel?\n\nPeriodo: ${nombrePeriodo}\nAño: ${anio}\nMes: ${mesesNombres[mes - 1]}`
    );

    if (!confirmImport) {
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);

      // Leer archivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log("📊 Datos del Excel:", jsonData);

      if (jsonData.length === 0) {
        alert("El archivo está vacío");
        setLoading(false);
        e.target.value = '';
        return;
      }

      // Buscar periodo por nombre (flexible: case-insensitive y trim)
      // Primero intentar búsqueda exacta
      let { data: periodo, error: periodoError } = await supabase
        .from("payment_periods")
        .select("id, nombre")
        .eq("nombre", nombrePeriodo.trim())
        .maybeSingle();

      // Si no se encuentra, intentar búsqueda case-insensitive
      if (!periodo) {
        const { data: allPeriods } = await supabase
          .from("payment_periods")
          .select("id, nombre");

        // Buscar coincidencia ignorando mayúsculas/minúsculas y espacios extra
        const nombreNormalizado = nombrePeriodo.trim().toLowerCase().replace(/\s+/g, ' ');
        periodo = allPeriods?.find(p =>
          p.nombre.trim().toLowerCase().replace(/\s+/g, ' ') === nombreNormalizado
        );

        if (periodo) {
          console.log(`✅ Periodo encontrado (búsqueda flexible): "${periodo.nombre}"`);
        }
      } else {
        console.log(`✅ Periodo encontrado (búsqueda exacta): "${periodo.nombre}"`);
      }

      // Si no existe, ofrecer crearlo
      if (periodoError || !periodo) {
        const confirmarCrear = window.confirm(
          `No se encontró el periodo "${nombrePeriodo}".\n\n¿Deseas crearlo ahora?`
        );

        if (!confirmarCrear) {
          alert("Importación cancelada. Crea el periodo primero en la sección de Periodos.");
          e.target.value = '';
          setLoading(false);
          return;
        }

        // Crear periodo
        const { data: nuevoPeriodo, error: createError } = await supabase
          .from("payment_periods")
          .insert({
            nombre: nombrePeriodo,
            monto: 0, // Se puede ajustar después
            activo: true,
            concepto: "Histórico"
          })
          .select()
          .single();

        if (createError) {
          alert("Error creando periodo: " + createError.message);
          e.target.value = '';
          setLoading(false);
          return;
        }

        periodo = nuevoPeriodo;
        console.log("✅ Periodo creado:", periodo);
      } else {
        console.log("✅ Periodo encontrado:", periodo);
      }

      // 3. Pre-cargar usuarios para validación rápida y normalizada
      const { data: allProfilesDB, error: errProfs } = await supabase
        .from("profiles")
        .select("id, rut");

      if (errProfs) {
        throw new Error("Error cargando perfiles: " + errProfs.message);
      }

      const rutMap = new Map();
      allProfilesDB.forEach(p => {
        if (p.rut) {
          rutMap.set(normalizeRut(p.rut), p.id);
        }
      });

      // Procesar cada fila
      let exitosos = 0;
      let errores = 0;
      const erroresDetalle = [];

      for (const row of jsonData) {
        try {
          const rawRut = row.RUT?.toString().trim();
          // Flexible amount field (monto, Monto, Pago, pago)
          const monto = parseFloat(row.monto || row.Monto || row.Pago || row.pago);

          if (!rawRut || !monto || isNaN(monto)) {
            console.warn("⚠️ Fila inválida:", row);
            errores++;
            erroresDetalle.push(`Fila inválida: ${JSON.stringify(row)}`);
            continue;
          }

          const cleanRut = normalizeRut(rawRut);
          const userId = rutMap.get(cleanRut);

          if (!userId) {
            console.warn(`⚠️ Usuario no encontrado: ${rawRut} (Normalizado: ${cleanRut})`);
            errores++;
            erroresDetalle.push(`Usuario no encontrado: ${rawRut}`);
            continue;
          }

          // Insertar voucher
          const { error: insertError } = await supabase
            .from("vouchers")
            .insert({
              user_id: userId,
              period_id: periodo.id,
              monto_individual: monto,
              estado: "aprobado",
              mes: mes,
              anio: parseInt(anio),
              cuota_numero: null,
              archivo_path: "excel-import/historico",
              comentario: `Importado desde Excel: ${nombreArchivo}`,
              revisado_por: user.id
            });

          if (insertError) {
            console.error(`❌ Error insertando ${rawRut}:`, insertError);
            errores++;
            erroresDetalle.push(`Error insertando ${rawRut}: ${insertError.message}`);
          } else {
            exitosos++;
            console.log(`✅ Importado: ${rawRut} - $${monto}`);
          }
        } catch (err) {
          console.error("❌ Error procesando fila:", row, err);
          errores++;
          erroresDetalle.push(`Error procesando: ${JSON.stringify(row)}`);
        }
      }

      // Mostrar resumen
      let mensaje = `Importación completada:\n\n✅ ${exitosos} registros exitosos\n❌ ${errores} errores`;

      if (erroresDetalle.length > 0 && erroresDetalle.length <= 10) {
        mensaje += "\n\nErrores:\n" + erroresDetalle.slice(0, 10).join("\n");
      } else if (erroresDetalle.length > 10) {
        mensaje += "\n\n(Revisa la consola para ver todos los errores)";
        console.log("Errores detallados:", erroresDetalle);
      }

      alert(mensaje);

      // Recargar datos
      await load();

      // Limpiar input
      e.target.value = '';
    } catch (error) {
      console.error("❌ Error leyendo Excel:", error);
      alert("Error al leer el archivo Excel:\n" + error.message);
      e.target.value = '';
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ contadores por período
  const conteoPorPeriodo = useMemo(() => {
    const map = new Map();
    for (const v of vouchers) {
      map.set(v.period_id, (map.get(v.period_id) || 0) + 1);
    }
    return map;
  }, [vouchers]);

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

  // ✅ VOUCHERS FILTRADOS (Tab Validación)
  const vouchersValidacion = useMemo(() => {
    let rows = vouchers;

    // Default: Show only pending/rejected or specific period?
    // Current logic: Filter by Selected Period OR Show All

    if (!mostrarTodos) {
      if (!periodoSeleccionado) return []; // Empty until selected
      rows = rows.filter((v) => v.period_id === periodoSeleccionado.id);
    } else {
      // Show All, but usually we focus on 'Validación' tab often on "Pendientes"? 
      // User didn't specify, keeping logic same as before.
    }

    const q = busqueda.trim().toLowerCase();
    if (q) {
      rows = rows.filter((v) => {
        const nom = (v.profiles?.nombre_completo || "").toLowerCase();
        const em = (v.profiles?.email || "").toLowerCase();
        const est = (v.estado || "").toLowerCase();
        return nom.includes(q) || em.includes(q) || est.includes(q);
      });
    }

    return rows;
  }, [vouchers, periodoSeleccionado, busqueda, mostrarTodos]);


  // ✅ VOUCHERS HISTORIAL (Tab Historial Global)
  const vouchersHistorial = useMemo(() => {
    let rows = vouchers;

    // Filter by Year
    // For monthly payments (with mes/anio fields), use anio field
    // For installment payments, use created_at year
    rows = rows.filter(v => {
      // If it has anio field (monthly payment), use that
      if (v.anio !== null && v.anio !== undefined) {
        return parseInt(v.anio) === parseInt(anioHistorial);
      }
      // Otherwise use created_at
      const pDate = v.created_at;
      if (!pDate) return false;
      const yearStr = String(pDate).split('-')[0];
      return parseInt(yearStr) === parseInt(anioHistorial);
    });

    // Filter by Month (Historial)
    // For monthly payments (with mes field), use mes field
    // For installment payments, use created_at month
    if (mesHistorial !== "todos") {
      rows = rows.filter(v => {
        // If it has mes field (monthly payment), use that
        if (v.mes !== null && v.mes !== undefined) {
          return parseInt(v.mes) === parseInt(mesHistorial);
        }
        // Otherwise use created_at
        const pDate = v.created_at;
        if (!pDate) return false;
        const month = new Date(pDate).getUTCMonth() + 1;
        return month === parseInt(mesHistorial);
      });
    }

    // Search
    const q = busquedaHistorial.trim().toLowerCase();
    if (q) {
      rows = rows.filter((v) => {
        const nom = (v.profiles?.nombre_completo || "").toLowerCase();
        const rut = (v.profiles?.rut || "").toLowerCase();
        const con = (v.payment_periods?.concepto || "").toLowerCase();
        return nom.includes(q) || rut.includes(q) || con.includes(q);
      });
    }

    return rows;
  }, [vouchers, anioHistorial, mesHistorial, busquedaHistorial]);

  // ✅ TOTALES (Basados en vouchers aprobados)
  const statsHistorial = useMemo(() => {
    // Todos los del año (independiente del mes seleccionado)
    const delAnio = vouchers.filter(v => {
      if (v.estado !== "aprobado") return false;

      // Use anio field if available (monthly payment), otherwise use created_at
      if (v.anio !== null && v.anio !== undefined) {
        return parseInt(v.anio) === parseInt(anioHistorial);
      }

      const pDate = v.created_at;
      return pDate && String(pDate).split('-')[0] === String(anioHistorial);
    });

    // Use individual amount if it exists, otherwise use period amount
    const totalAnual = delAnio.reduce((acc, v) => {
      const monto = v.monto_individual !== undefined && v.monto_individual !== null
        ? v.monto_individual
        : (v.payment_periods?.monto || 0);
      return acc + monto;
    }, 0);

    // Solo del mes seleccionado (si es "todos", es igual al anual pero mejor mostrar por separado si aplica)
    let totalMensual = 0;
    if (mesHistorial !== "todos") {
      const delMes = delAnio.filter(v => {
        // Use mes field if available (monthly payment), otherwise use created_at
        if (v.mes !== null && v.mes !== undefined) {
          return parseInt(v.mes) === parseInt(mesHistorial);
        }

        const pDate = v.created_at;
        const m = new Date(pDate).getUTCMonth() + 1;
        return m === parseInt(mesHistorial);
      });
      totalMensual = delMes.reduce((acc, v) => {
        const monto = v.monto_individual !== undefined && v.monto_individual !== null
          ? v.monto_individual
          : (v.payment_periods?.monto || 0);
        return acc + monto;
      }, 0);
    }

    return { totalAnual, totalMensual };
  }, [vouchers, anioHistorial, mesHistorial]);


  const exportarExcel = () => {
    if (vouchersHistorial.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataToExport = vouchersHistorial.map(v => ({
      "Fecha Pago": new Date(v.created_at).toLocaleDateString(),
      "RUT": v.profiles?.rut || v.user_id,
      "Nombre": v.profiles?.nombre_completo || "Desconocido",
      "Concepto": v.payment_periods?.concepto || "N/A",
      "Periodo": v.payment_periods?.nombre || "N/A",
      "Monto": v.monto_individual !== undefined && v.monto_individual !== null ? v.monto_individual : (v.payment_periods?.monto || 0),
      "Cuota": v.total_cuotas ? `${v.cuota_numero}/${v.total_cuotas}` : "Única",
      "Mes Corresp.": v.mes ? MESES.find(m => m.n === v.mes)?.name : "N/A",
      "Año Corresp.": v.anio || "N/A",
      "Estado": v.estado
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Pagos_${anioHistorial}`);
    XLSX.writeFile(wb, `Reporte_Pagos_${anioHistorial}.xlsx`);
  };


  const crearPeriodo = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    if (!concepto || !monto) {
      setMsg("Falta Concepto o Monto");
      setTipo("error");
      return;
    }

    // 1. Generar nombre automático
    const anioVal = anioCreacion || new Date().getFullYear();
    const nombreFinal = `${concepto} ${anioVal}`;

    const { error } = await supabase.from("payment_periods").insert({
      concepto,
      nombre: nombreFinal,
      descripcion: descripcion || null,
      fecha_inicio: new Date().toISOString(),
      monto: Number(monto),
      activo: true,
      created_by: user.id,
    });

    if (error) { setMsg(error.message); setTipo("error"); return; }

    setConcepto("");
    setNombre("");
    setDescripcion("");
    setMonto("");
    setMsg(`✅ Periodo creado: ${nombreFinal}`);
    setTipo("success");
    load();
  };

  const togglePeriodo = async (id, activoActual) => {
    const { error } = await supabase.from("payment_periods").update({ activo: !activoActual }).eq("id", id);
    if (error) { setMsg("Error al actualizar"); setTipo("error"); return; }
    load();
  };

  const eliminarPeriodo = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    const { error } = await supabase.from("payment_periods").delete().eq("id", id);
    if (error) { setMsg("Error al eliminar"); setTipo("error"); return; }
    if (periodoSeleccionado?.id === id) setPeriodoSeleccionado(null);
    load();
  };

  const crearConcepto = async () => {
    setModalError("");
    if (!nuevoConceptoName.trim()) return;
    const { error } = await supabase.from("payment_concepts").insert({ name: nuevoConceptoName.trim() });
    if (error) setModalError(error.message);
    else {
      setNuevoConceptoName("");
      load();
    }
  };
  const eliminarConcepto = async (id) => {
    if (!confirm("¿Eliminar este concepto?")) return;
    const { error } = await supabase.from("payment_concepts").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  };

  const guardarEdicion = async () => {
    setMsg(""); setTipo("");
    const { error } = await supabase.from("payment_periods").update({
      nombre: editando.nombre,
      monto: Number(editando.monto)
    }).eq("id", editando.id);

    if (error) {
      setMsg("Error guardando cambios");
      setTipo("error");
    } else {
      setMsg("Cambios guardados ✅");
      setTipo("success");
      setShowEdit(false);
      setEditando(null);
      load();
    }
  };

  const revisar = async (voucherId, nuevoEstado, comentario = "") => {
    const { error } = await supabase.from("vouchers").update({ estado: nuevoEstado, comentario: comentario || null, revisado_por: user.id }).eq("id", voucherId);
    if (error) { setMsg("Error actualizando"); setTipo("error"); return; }
    setMsg(`Voucher ${nuevoEstado} ✅`); setTipo("success"); load();
  };

  const guardarEdicionVoucher = async () => {
    if (!vEdit) return;
    setMsg(""); setTipo("");
    try {
      const updateData = {
        created_at: vEdit.created_at,
        cuota_numero: Number(vEdit.cuota_numero),
        total_cuotas: Number(vEdit.total_cuotas),
        estado: vEdit.estado,
        comentario: vEdit.comentario,
        mes: vEdit.mes ? Number(vEdit.mes) : null,
        anio: vEdit.anio ? Number(vEdit.anio) : null
      };

      // Add individual amount if it exists
      if (vEdit.monto_individual !== undefined && vEdit.monto_individual !== null) {
        updateData.monto_individual = Number(vEdit.monto_individual);
      }

      const { error } = await supabase.from("vouchers").update(updateData).eq("id", vEdit.id);

      if (error) throw error;

      setMsg("Pago actualizado ✅"); setTipo("success");
      setShowVEdit(false); setVEdit(null);
      load();
    } catch (err) {
      setMsg(err.message || "Error al actualizar pago");
      setTipo("error");
    }
  };

  const subirReciboAdmin = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !vEdit) return;
    setSubiendoAdmin(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${vEdit.user_id}/${vEdit.period_id}/admin_${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("vouchers").upload(path, file);
      if (upErr) throw upErr;

      const { error: updateErr } = await supabase.from("vouchers").update({ archivo_path: path }).eq("id", vEdit.id);
      if (updateErr) throw updateErr;

      setVEdit({ ...vEdit, archivo_path: path });
      setMsg("Comprobante subido ✅"); setTipo("success");
    } catch (err) {
      alert("Error subiendo: " + err.message);
    } finally {
      setSubiendoAdmin(false);
    }
  };

  const verArchivo = async (path) => {
    const { data, error } = await supabase.storage.from("vouchers").createSignedUrl(path, 60);
    if (error) { setMsg("Error archivo"); setTipo("error"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const descargarArchivo = async (path) => {
    try {
      const { data, error } = await supabase.storage.from("vouchers").download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = path.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Error al descargar: " + err.message);
    }
  };

  const eliminarVoucher = async (id, path) => {
    if (!confirm("¿Estás seguro de eliminar este registro de pago? Esta acción no se puede deshacer.")) return;
    try {
      // 1. Eliminar de DB
      const { error: eDb } = await supabase.from("vouchers").delete().eq("id", id);
      if (eDb) throw eDb;

      // 2. Eliminar de Storage si no es genérico
      if (path && path !== "SIN_COMPROBANTE") {
        await supabase.storage.from("vouchers").remove([path]);
      }

      setMsg("Registro eliminado correctamente");
      setTipo("success");
      load();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const registrarPagoManual = async (e) => {
    e.preventDefault();
    setMsg(""); setTipo("");
    setSubiendoAdmin(true);

    if (!manualData.user_id) {
      alert("Debes seleccionar un Usuario");
      setSubiendoAdmin(false);
      return;
    }

    try {
      let finalPeriodId = manualData.period_id;

      // Si el admin eligió crear un nuevo periodo on-the-fly
      if (crearNuevoPeriodo) {
        if (!nuevoPeriodoData.nombre || !nuevoPeriodoData.concepto) {
          alert("Falta Nombre o Concepto para el nuevo periodo");
          setSubiendoAdmin(false);
          return;
        }
        const { data: nPer, error: ePer } = await supabase.from("payment_periods").insert({
          concepto: nuevoPeriodoData.concepto,
          nombre: nuevoPeriodoData.nombre,
          monto: Number(nuevoPeriodoData.monto) || 0,
          activo: true,
          created_by: user.id,
          fecha_inicio: new Date(manualData.created_at).toISOString()
        }).select().single();

        if (ePer) throw ePer;
        finalPeriodId = nPer.id;
      }

      if (!finalPeriodId) {
        alert("Debes seleccionar un Periodo o crear uno nuevo");
        setSubiendoAdmin(false);
        return;
      }

      // Subir archivo si hay
      let pathFinal = "SIN_COMPROBANTE";
      if (archivoManual) {
        const fileExt = archivoManual.name.split('.').pop();
        const fileName = `${manualData.user_id}_manual_${Math.random()}.${fileExt}`;
        const { error: errorUp } = await supabase.storage.from("vouchers").upload(fileName, archivoManual);
        if (errorUp) throw errorUp;
        pathFinal = fileName;
      }

      const { error } = await supabase.from("vouchers").insert({
        user_id: manualData.user_id,
        period_id: finalPeriodId,
        cuota_numero: Number(manualData.cuota_numero),
        total_cuotas: Number(manualData.total_cuotas),
        mes: manualData.mes ? Number(manualData.mes) : null,
        anio: manualData.anio ? Number(manualData.anio) : null,
        estado: manualData.estado,
        comentario: manualData.comentario,
        created_at: new Date(manualData.created_at).toISOString(),
        archivo_path: pathFinal
      });

      if (error) throw error;

      setMsg("Pago registrado con éxito ✅");
      setTipo("success");
      setShowManual(false);
      setCrearNuevoPeriodo(false);
      setNuevoPeriodoData({ concepto: "", nombre: "", monto: "" });
      setUsuarioManualSeleccionado(null);
      setFiltroUsuarioManual("");
      setArchivoManual(null);
      load();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubiendoAdmin(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
  if (rol !== "directiva") return <div className="p-10 text-center text-red-600 font-black text-xl">Acceso denegado.</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Administración</h1>
                <a
                  href="https://drive.google.com/file/d/1ooq_i3KKRiLDLRkiucTM2iUMx_PkryLR/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1"
                >
                  <span>?</span> Ayuda
                </a>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Panel de Finanzas y Control de Socios</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => document.getElementById('excel-import-2024').click()}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-500/25 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" /> IMPORTAR EXCEL HISTÓRICO
            </button>
            <input
              id="excel-import-2024"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              className="hidden"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {/* Navigation Tabs */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 mb-10">
          {[
            { id: "validacion", label: "Validación", icon: CheckCircle2 },
            { id: "historial", label: "Historial Global", icon: History },
            { id: "config", label: "Periodos y Ajustes", icon: Settings },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-bold transition-all ${tab === t.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`mb-10 p-6 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm ${tipo === "error" ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
            }`}>
            <div className={`p-2 rounded-lg ${tipo === "error" ? "bg-rose-100" : "bg-emerald-100"}`}>
              {tipo === "error" ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
            </div>
            <p className="text-sm font-black uppercase tracking-tight">{msg}</p>
          </div>
        )}

        {/* ===================== TAB VALIDACION ===================== */}
        {tab === "validacion" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar: Period Selection */}
            <aside className="lg:col-span-3 space-y-6">
              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
                <header className="px-8 py-6 border-b border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Selección de Periodo
                  </h3>
                </header>

                <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                  <button
                    onClick={() => { setPeriodoSeleccionado(null); setMostrarTodos(true); }}
                    className={`w-full group px-6 py-4 rounded-xl text-left transition-all ${mostrarTodos ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-50 text-slate-600"
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-tight">TODOS LOS PERIODOS</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${mostrarTodos ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  <div className="h-px bg-slate-50 my-2 mx-4" />

                  {periodos.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPeriodoSeleccionado(p); setMostrarTodos(false); }}
                      className={`w-full group px-6 py-4 rounded-xl text-left transition-all border ${periodoSeleccionado?.id === p.id && !mostrarTodos
                        ? "bg-white border-blue-600 ring-2 ring-blue-500/10 shadow-sm"
                        : "bg-white border-transparent hover:bg-slate-50"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-sm font-black uppercase tracking-tight leading-none mb-1 ${periodoSeleccionado?.id === p.id && !mostrarTodos ? "text-blue-600" : "text-slate-900"
                            }`}>
                            {p.nombre}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{p.concepto}</div>
                        </div>
                        {conteoPorPeriodo.get(p.id) > 0 && (
                          <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full ring-1 ring-blue-200">
                            {conteoPorPeriodo.get(p.id)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Validation Content */}
            <div className="lg:col-span-9 space-y-8">
              {/* Toolbar */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    className="w-full bg-slate-50 border border-slate-100 py-4 pl-14 pr-6 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase placeholder:text-slate-300"
                    placeholder="BUSCAR SOCIO POR NOMBRE O RUT..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viendo:</span>
                  <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    {mostrarTodos ? "Todos" : periodoSeleccionado?.nombre}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="grid grid-cols-1 gap-6 pb-20">
                {vouchersValidacion.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-20 text-center animate-in fade-in duration-700">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <CheckCircle2 className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Sin Vouchers Pendientes</h3>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-wide">¡Todo al día por aquí!</p>
                  </div>
                ) : (
                  vouchersValidacion.map(v => (
                    <VoucherCard
                      key={v.id}
                      v={v}
                      onReview={revisar}
                      onDelete={eliminarVoucher}
                      onEdit={() => { setVEdit(v); setShowVEdit(true); }}
                      onView={verArchivo}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB HISTORIAL ===================== */}
        {tab === "historial" && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header with Filters */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Historial Global</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Registros históricos de pagos</p>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex bg-slate-50 border border-slate-200 p-2 rounded-xl gap-2">
                  <select
                    className="bg-transparent text-sm font-bold text-slate-700 px-4 py-2 outline-none"
                    value={anioHistorial}
                    onChange={e => setAnioHistorial(e.target.value)}
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>AÑO {y}</option>)}
                    <option disabled>──────────</option>
                    {RANGE_ANIOS.filter(y => y < 2024 || y > 2030).map(y => <option key={y} value={y}>AÑO {y}</option>)}
                  </select>
                  <div className="w-px h-6 bg-slate-200 self-center"></div>
                  <select
                    className="bg-transparent text-sm font-bold text-slate-700 px-4 py-2 outline-none"
                    value={mesHistorial}
                    onChange={e => setMesHistorial(e.target.value)}
                  >
                    <option value="todos">TODOS LOS MESES</option>
                    {MESES.map(m => <option key={m.n} value={m.n}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>

                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                >
                  <Download className="h-4 w-4" />
                  EXPORTAR EXCEL
                </button>
              </div>
            </div>

            {/* Stats resumidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <History className="h-20 w-20 text-slate-900" />
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Total Recaudado Anual</p>
                <h3 className="text-5xl font-black text-slate-900">${statsHistorial.totalAnual.toLocaleString()}</h3>
              </div>

              <div className="bg-blue-600 border border-blue-500 p-8 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-20 w-20 text-white" />
                </div>
                <p className="text-sm font-black text-blue-100 uppercase tracking-widest mb-2">Recaudación del Mes</p>
                <h3 className="text-5xl font-black text-white">${statsHistorial.totalMensual.toLocaleString()}</h3>
              </div>
            </div>

            {/* Tabla de Registros */}
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <th className="px-8 py-6">Periodo</th>
                      <th className="px-8 py-6">Socio</th>
                      <th className="px-8 py-6">Concepto / Detalles</th>
                      <th className="px-8 py-6">Monto</th>
                      <th className="px-8 py-6 text-center">Comprobante</th>
                      <th className="px-8 py-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vouchersHistorial.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-8 py-20 text-center text-slate-400 font-medium italic">
                          No se encontraron registros para el periodo seleccionado.
                        </td>
                      </tr>
                    ) : (
                      vouchersHistorial.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <img src={master12Logo} alt="Club Master" className="h-6 w-6" />
                              <div>
                                {v.mes && v.anio ? (
                                  <div className="text-sm font-black text-slate-900">
                                    {MESES.find(m => m.n === v.mes)?.name} {v.anio}
                                  </div>
                                ) : v.anio ? (
                                  <div className="text-sm font-black text-slate-900">{v.anio}</div>
                                ) : (
                                  <div className="text-sm font-bold text-slate-400">
                                    {new Date(v.created_at).toLocaleDateString("es-CL", { month: "short", year: "numeric" })}
                                  </div>
                                )}
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Subido: {new Date(v.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-black text-slate-900 uppercase tracking-tight">{v.profiles?.nombre_completo}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">{v.profiles?.rut}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-blue-600 uppercase tracking-wide">{v.payment_periods?.nombre}</span>
                              {v.total_cuotas && (
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                                  CUOTA {v.cuota_numero}/{v.total_cuotas}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-lg font-black text-slate-900">${v.monto_individual?.toLocaleString() || v.payment_periods?.monto?.toLocaleString()}</span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            {v.archivo_path && v.archivo_path !== "SIN_COMPROBANTE" && v.archivo_path !== "excel-import/historico" ? (
                              <button
                                onClick={() => verArchivo(v.archivo_path)}
                                className="w-10 h-10 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all mx-auto"
                                title="Ver Comprobante"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-black text-slate-300">SIN ARCHIVO</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-center">
                            <button
                              onClick={() => { setVEdit(v); setShowVEdit(true); }}
                              className="w-10 h-10 bg-white border border-slate-200 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 rounded-xl flex items-center justify-center transition-all mx-auto"
                              title="Editar Pago"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* MODALES EXTRAS (Editar, Conceptos, Import) Mantenidos igual... */}
        {/* MODALES EXTRAS (Editar, Conceptos, Import, Manual, Edit Voucher) */}
        {/* Edit Plan Modal */}
        {showEdit && editando && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
              <header className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Editar Plan de Pago</h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">ESTÁS MODIFICANDO: {editando.nombre}</p>
                </div>
                <button onClick={() => setShowEdit(false)} className="bg-white p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nombre del Plan</label>
                  <input
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all uppercase"
                    value={editando.nombre}
                    onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Monto Total ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    <input
                      className="w-full bg-blue-50/50 border border-blue-100 pl-12 pr-4 py-4 rounded-xl font-black text-blue-600 outline-none"
                      type="number"
                      value={editando.monto}
                      onChange={e => setEditando({ ...editando, monto: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={guardarEdicion}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                  >
                    GUARDAR CAMBIOS
                  </button>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showConceptos && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
              <header className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Gestionar Categorías</h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">CONCEPTOS DE PAGO DISPONIBLES</p>
                </div>
                <button onClick={() => setShowConceptos(false)} className="bg-white p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="p-8 space-y-6">
                {modalError && (
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 animate-in shake duration-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-xs font-bold uppercase">{modalError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Agregar Nuevo Concepto</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input
                        className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-4 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase placeholder:text-slate-300"
                        placeholder="EJ: MATRÍCULA, MENSUALIDAD..."
                        value={nuevoConceptoName}
                        onChange={e => setNuevoConceptoName(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={crearConcepto}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-black text-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {conceptos.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-100 transition-all">
                      <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">{c.name}</span>
                      <button
                        onClick={() => eliminarConcepto(c.id)}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:border-rose-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowConceptos(false)}
                  className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest mt-4"
                >
                  CERRAR GESTIÓN
                </button>
              </div>
            </div>
          </div>
        )}

        {showImport && <ImportUsersModal onClose={() => setShowImport(false)} onReload={load} />}

        {showVEdit && vEdit && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white max-h-[90vh] flex flex-col">
              <header className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Editar Registro de Pago</h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase">ID VOUCHER: {vEdit.id?.substring(0, 8)}</p>
                </div>
                <button onClick={() => setShowVEdit(false)} className="bg-white p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Estado de Validación</label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <select
                      className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-3.5 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase appearance-none"
                      value={vEdit.estado}
                      onChange={e => setVEdit({ ...vEdit, estado: e.target.value })}
                    >
                      <option value="pendiente">🕒 Pendiente de Revisión</option>
                      <option value="aprobado">✅ Pago Aprobado</option>
                      <option value="rechazado">❌ Pago Rechazado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cuota Número</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-xl text-sm font-black text-slate-900 outline-none text-center focus:bg-white transition-all"
                      value={vEdit.cuota_numero || 1}
                      onChange={e => setVEdit({ ...vEdit, cuota_numero: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Monto Cobrado ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input
                        type="number"
                        className="w-full bg-blue-50/50 border border-blue-100 pl-11 pr-6 py-3.5 rounded-xl text-sm font-black text-blue-600 outline-none"
                        value={vEdit.monto_individual !== undefined && vEdit.monto_individual !== null ? vEdit.monto_individual : (vEdit.payment_periods?.monto || 0)}
                        onChange={e => setVEdit({ ...vEdit, monto_individual: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mes Asociado</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <select
                        className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-3.5 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase appearance-none"
                        value={vEdit.mes || ""}
                        onChange={e => setVEdit({ ...vEdit, mes: e.target.value || null })}
                      >
                        <option value="">GENERAL / N/A</option>
                        {MESES.map(m => <option key={m.n} value={m.n}>{m.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Año Asociado</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <select
                        className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-xl text-sm font-black text-slate-900 outline-none focus:bg-white transition-all appearance-none text-center"
                        value={vEdit.anio || ""}
                        onChange={e => setVEdit({ ...vEdit, anio: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">AÑO...</option>
                        {RANGE_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Comentarios / Observaciones</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                    <textarea
                      className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-4 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white transition-all min-h-[100px]"
                      placeholder="Escribe un mensaje para el socio..."
                      value={vEdit.comentario || ""}
                      onChange={e => setVEdit({ ...vEdit, comentario: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Comprobante Adjunto</p>
                  <div className="flex flex-col gap-2">
                    {vEdit.archivo_path && vEdit.archivo_path !== "SIN_COMPROBANTE" && (
                      <button
                        type="button"
                        onClick={() => verArchivo(vEdit.archivo_path)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 p-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" /> VER ARCHIVO ACTUAL
                      </button>
                    )}
                    <label className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl text-xs font-black uppercase text-center cursor-pointer transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" /> {subiendoAdmin ? "SUBIENDO..." : "REEMPLAZAR COMPROBANTE"}
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={subirReciboAdmin} disabled={subiendoAdmin} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 shrink-0">
                <button
                  onClick={guardarEdicionVoucher}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase"
                >
                  GUARDAR TODOS LOS CAMBIOS
                </button>
                <button
                  onClick={() => setShowVEdit(false)}
                  className="w-full bg-white border border-slate-200 text-slate-400 p-3 rounded-xl text-xs font-bold uppercase hover:text-slate-900 transition-all"
                >
                  CANCELAR EDICIÓN
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Manual Registration Modal */}
        {showManual && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white max-h-[90vh] flex flex-col">
              <header className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Registrar Pago Manual</h3>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">REGISTRO INTERNO DE TESORERÍA</p>
                </div>
                <button onClick={() => setShowManual(false)} className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                  <X className="h-6 w-6" />
                </button>
              </header>

              <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                <form onSubmit={registrarPagoManual} className="space-y-8">
                  {/* User Search */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. Seleccionar Socio</label>
                    {!usuarioManualSeleccionado ? (
                      <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          className="w-full bg-slate-50 border border-slate-200 py-4 pl-14 pr-6 rounded-2xl text-base font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase placeholder:text-slate-300"
                          placeholder="BUSCAR POR NOMBRE O RUT..."
                          value={filtroUsuarioManual}
                          onChange={e => setFiltroUsuarioManual(e.target.value)}
                        />
                        {filtroUsuarioManual.length > 1 && (
                          <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-3xl overflow-hidden z-[110] shadow-2xl max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                            {allProfiles
                              .filter(u => {
                                const q = filtroUsuarioManual.toLowerCase();
                                return u.nombre_completo?.toLowerCase().includes(q) || u.rut?.toLowerCase().includes(q);
                              })
                              .map(u => (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setUsuarioManualSeleccionado(u);
                                    setManualData({ ...manualData, user_id: u.id });
                                    setFiltroUsuarioManual("");
                                  }}
                                  className="p-5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center transition-colors"
                                >
                                  <div>
                                    <div className="font-black text-slate-900 text-sm uppercase">{u.nombre_completo}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-0.5">{u.rut}</div>
                                  </div>
                                  <Plus className="h-4 w-4 text-blue-600" />
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-black">
                            {usuarioManualSeleccionado.nombre_completo?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 uppercase text-sm">{usuarioManualSeleccionado.nombre_completo}</div>
                            <div className="text-xs font-bold text-blue-600">{usuarioManualSeleccionado.rut}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUsuarioManualSeleccionado(null);
                            setManualData({ ...manualData, user_id: "" });
                          }}
                          className="text-[10px] font-black text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-600 hover:text-white transition-all uppercase shadow-sm"
                        >
                          CAMBIAR
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">2. Periodo / Concepto</label>
                      <div className="relative">
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <select
                          required
                          className="w-full bg-slate-50 border border-slate-200 py-4 pl-14 pr-6 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase appearance-none"
                          value={manualData.period_id}
                          onChange={e => {
                            const pid = e.target.value;
                            // Fix: Ensure loose comparison in case id is number and value is string
                            const p = periodos.find(x => String(x.id) === String(pid));

                            let update = { period_id: pid, monto_individual: p ? p.monto : "" };

                            // Auto-detect Month and Year from Period Name
                            if (p && p.nombre) {
                              const nameLower = p.nombre.toLowerCase();

                              // Find Month
                              const foundMes = MESES.find(m => nameLower.includes(m.name.toLowerCase()));
                              if (foundMes) {
                                update.mes = foundMes.n;
                              }

                              // Find Year (simple 4 digit check starting with 20)
                              const foundYear = nameLower.match(/20\d{2}/);
                              if (foundYear) {
                                update.anio = Number(foundYear[0]);
                              }
                            }

                            setManualData(prev => ({ ...prev, ...update }));
                          }}
                        >
                          <option value="">ELIJA...</option>
                          {periodos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">3. Monto del Pago</label>
                      <div className="relative">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <input
                          type="number"
                          className="w-full bg-blue-50/50 border border-blue-100 py-4 pl-14 pr-6 rounded-2xl text-lg font-black text-blue-600 outline-none"
                          value={manualData.monto_individual || ""}
                          onChange={e => setManualData({ ...manualData, monto_individual: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mes y Año (Solo si es mensual o si se desea especificar) */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mes (Opcional)</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white transition-all uppercase appearance-none text-center"
                        value={manualData.mes || ""}
                        onChange={e => setManualData({ ...manualData, mes: e.target.value || null })}
                      >
                        <option value="">GENERAL</option>
                        {MESES.map(m => <option key={m.n} value={m.n}>{m.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Año</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white transition-all appearance-none text-center"
                        value={manualData.anio}
                        onChange={e => setManualData({ ...manualData, anio: e.target.value })}
                      >
                        {RANGE_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cuotas */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cuota Nº</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl text-sm font-black text-slate-900 outline-none text-center"
                        value={manualData.cuota_numero}
                        onChange={e => setManualData({ ...manualData, cuota_numero: e.target.value })}
                        min="1"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Total Cuotas</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl text-sm font-black text-slate-900 outline-none text-center"
                        value={manualData.total_cuotas}
                        onChange={e => setManualData({ ...manualData, total_cuotas: e.target.value })}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">4. Comprobante (Opcional)</label>
                    <label className="group relative block p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all">
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6 text-slate-400" />
                        </div>
                        <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">
                          {archivoManual ? archivoManual.name : "Subir Comprobante (PDF/JPG)"}
                        </span>
                      </div>
                      <input type="file" className="hidden" onChange={e => setArchivoManual(e.target.files[0])} />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={subiendoAdmin}
                      className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black text-lg transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {subiendoAdmin ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            PROCESANDO...
                          </>
                        ) : "REGISTRAR PAGO AHORA"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManual(false)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 p-4 rounded-xl font-bold transition-all uppercase text-xs"
                    >
                      CANCELAR REGISTRO
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}


        {/* ===================== TAB CONFIGURACIÓN ===================== */}
        {tab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
            {/* Crear Periodo Card */}
            <div className="lg:col-span-12 xl:col-span-5">
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Nuevo Plan de Pago</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Configurar cobro recurrente u ocasional</p>
                </div>

                <form onSubmit={crearPeriodo} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Concepto de Pago</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <select
                          className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-3.5 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase appearance-none"
                          value={concepto}
                          onChange={e => setConcepto(e.target.value)}
                          required
                        >
                          <option value="">Selecciona concepto...</option>
                          {conceptos.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConceptos(true)}
                        className="bg-white border border-slate-200 p-3.5 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-colors shadow-sm active:scale-95"
                        title="Gestionar Conceptos"
                      >
                        <Settings2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Año</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <select
                        className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-3.5 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase appearance-none"
                        value={anioCreacion}
                        onChange={e => setAnioCreacion(e.target.value)}
                        required
                      >
                        {RANGE_ANIOS.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Monto ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input
                        className="w-full bg-blue-50/50 border border-blue-100 pl-11 pr-6 py-3.5 rounded-xl text-sm font-black text-blue-600 outline-none"
                        type="number"
                        placeholder="0"
                        value={monto}
                        onChange={e => setMonto(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <Eye className="h-10 w-10 text-slate-900" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Vista Previa del Nombre:</p>
                    <div className="text-sm font-black text-slate-900 uppercase">
                      {concepto ? `${concepto} ${anioCreacion}` : "ESPERANDO DATOS..."}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase text-xs tracking-wider"
                  >
                    CREAR PLAN DE PAGO
                  </button>
                </form>
              </div>
            </div>

            {/* Listado de Periodos Existentes */}
            <div className="lg:col-span-12 xl:col-span-7">
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-8 flex flex-col h-full">
                <header className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Planes Activos</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Inventario de cobros configurados</p>
                  </div>
                  <select
                    className="bg-slate-50 border border-slate-100 px-4 py-2 text-[10px] font-black rounded-lg uppercase outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                    value={catFiltro}
                    onChange={e => setCatFiltro(e.target.value)}
                  >
                    <option value="todas">FILTRAR: TODOS</option>
                    <option value="mensual">MENSUALES</option>
                    <option value="anual">ANUALES / GENERAL</option>
                  </select>
                </header>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {periodosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-200 gap-4">
                      <Inbox className="h-16 w-16" />
                      <p className="text-sm font-black uppercase tracking-widest italic">No hay planes registrados</p>
                    </div>
                  ) : (
                    periodosFiltrados.map(p => (
                      <div key={p.id} className="p-6 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all flex flex-col sm:flex-row justify-between items-center gap-6 group">
                        <div className="flex items-center gap-5">
                          <div className={`w-3 h-3 rounded-full ring-4 ${p.activo ? "bg-emerald-500 ring-emerald-50" : "bg-rose-500 ring-rose-50"}`}></div>
                          <div>
                            <div className="text-base font-black text-slate-900 uppercase leading-none mb-1 group-hover:text-blue-600 transition-colors">{p.nombre}</div>
                            <div className="flex gap-3 items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded">{p.concepto}</span>
                              <span className="text-xs font-black text-blue-600">${p.monto.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePeriodo(p.id, p.activo)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${p.activo ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white" : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                              }`}
                          >
                            {p.activo ? "ACTIVO" : "PAUSADO"}
                          </button>
                          <button
                            onClick={() => { setEditando(p); setShowEdit(true); }}
                            className="w-10 h-10 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all active:scale-90"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => eliminarPeriodo(p.id)}
                            className="w-10 h-10 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all active:scale-90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function VoucherCard({ v, onView, onReview, onDownload, onDelete, onEdit }) {
  const [comentario, setComentario] = useState(v.comentario || "");

  return (
    <div className={`border p-6 rounded-[2rem] shadow-sm space-y-6 animate-in fade-in duration-500 hover:shadow-md transition-all group ${v.estado === 'aprobado'
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-white border-slate-200'
      }`}>
      <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
        {/* Info Socio */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black group-hover:scale-110 transition-transform">
            {v.profiles?.nombre_completo?.charAt(0) || "U"}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{v.profiles?.nombre_completo}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{v.profiles?.rut}</p>
          </div>
        </div>

        {/* Detalles Voucher */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
            {v.payment_periods?.nombre}
          </span>
          <span className="bg-blue-50 text-blue-600 border border-blue-100 px-4 py-1.5 rounded-lg text-xs font-black">
            ${(v.monto_individual || v.payment_periods?.monto || 0).toLocaleString()}
          </span>
          {v.total_cuotas > 0 && (
            <span className="bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-lg text-[10px] font-black text-slate-500 uppercase">
              CUOTA {v.cuota_numero}/{v.total_cuotas}
            </span>
          )}
          {v.mes && (
            <span className="bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-lg text-[10px] font-black text-amber-600 uppercase">
              MES: {MESES.find(m => m.n === v.mes)?.name}
            </span>
          )}
          {v.anio && (
            <span className="bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-lg text-[10px] font-black text-indigo-600 uppercase">
              AÑO: {v.anio}
            </span>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="flex gap-2">
          {v.archivo_path && v.archivo_path !== "SIN_COMPROBANTE" && (
            <button
              onClick={() => onView(v.archivo_path)}
              className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm"
              title="VER COMPROBANTE"
            >
              <FileText className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(v.id, v.archivo_path)}
            className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Acción de Validación */}
      <div className="pt-6 border-t border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <input
              className="w-full bg-slate-50 border border-slate-100 pl-11 pr-6 py-3.5 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all uppercase placeholder:text-slate-300"
              placeholder="Nota para el socio..."
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onReview(v.id, "aprobado", comentario)}
              className="flex-1 md:flex-none px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 uppercase tracking-wider"
            >
              APROBAR
            </button>
            <button
              onClick={() => onReview(v.id, "rechazado", comentario)}
              className="flex-1 md:flex-none px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20 transition-all active:scale-95 uppercase tracking-wider"
            >
              RECHAZAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
