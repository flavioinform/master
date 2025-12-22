import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import * as XLSX from "xlsx"; // ✅ Import XLSX

import ImportUsersModal from "@/components/ImportUsersModal";

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

  const MESES = [
    { n: 1, name: "Enero" }, { n: 2, name: "Febrero" }, { n: 3, name: "Marzo" },
    { n: 4, name: "Abril" }, { n: 5, name: "Mayo" }, { n: 6, name: "Junio" },
    { n: 7, name: "Julio" }, { n: 8, name: "Agosto" }, { n: 9, name: "Septiembre" },
    { n: 10, name: "Octubre" }, { n: 11, name: "Noviembre" }, { n: 12, name: "Diciembre" }
  ];

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
        .select("id, user_id, period_id, archivo_path, estado, comentario, created_at, updated_at, cuota_numero, total_cuotas")
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
    rows = rows.filter(v => {
      const pDate = v.payment_periods?.fecha_inicio || v.created_at;
      if (!pDate) return false;
      // ✅ Fix: Handle date string directly to avoid Timezone shift (e.g. 2024-01-01 -> 2023-12-31)
      const yearStr = String(pDate).split('-')[0];
      return parseInt(yearStr) === parseInt(anioHistorial);
    });

    // Filter by Month (Historial)
    if (mesHistorial !== "todos") {
      rows = rows.filter(v => {
        const pDate = v.payment_periods?.fecha_inicio || v.created_at;
        if (!pDate) return false;
        const month = new Date(pDate).getUTCMonth() + 1; // getUTCMonth is safer for ISO dates
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
      const pDate = v.payment_periods?.fecha_inicio || v.created_at;
      return v.estado === "aprobado" && pDate && String(pDate).split('-')[0] === String(anioHistorial);
    });

    const totalAnual = delAnio.reduce((acc, v) => acc + (v.payment_periods?.monto || 0), 0);

    // Solo del mes seleccionado (si es "todos", es igual al anual pero mejor mostrar por separado si aplica)
    let totalMensual = 0;
    if (mesHistorial !== "todos") {
      const delMes = delAnio.filter(v => {
        const pDate = v.payment_periods?.fecha_inicio || v.created_at;
        const m = new Date(pDate).getUTCMonth() + 1;
        return m === parseInt(mesHistorial);
      });
      totalMensual = delMes.reduce((acc, v) => acc + (v.payment_periods?.monto || 0), 0);
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
      "Monto": v.payment_periods?.monto || 0,
      "Cuota": v.total_cuotas ? `${v.cuota_numero}/${v.total_cuotas}` : "Única",
      "Estado": v.estado
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Pagos_${anioHistorial}`);
    XLSX.writeFile(wb, `Reporte_Pagos_${anioHistorial}.xlsx`);
  };


  const crearPeriodo = async (e) => {
    e.preventDefault();
    // ... same logic
    setMsg(""); setTipo("");
    if (!concepto || !nombre) { setMsg("Falta Concepto/Nombre"); setTipo("error"); return; }
    if (monto === "" || Number(monto) < 0) { setMsg("Monto inválido"); setTipo("error"); return; }

    const { error } = await supabase.from("payment_periods").insert({
      concepto, nombre, descripcion: descripcion || null, fecha_inicio: new Date().toISOString(), // Use Current Date for ordering
      monto: Number(monto), activo: true, created_by: user.id,
    });
    if (error) { setMsg(error.message); setTipo("error"); return; }
    setConcepto(""); setNombre(""); setDescripcion(""); setMonto("");
    setMsg("Periodo creado"); setTipo("success"); load();
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
      concepto: editando.concepto,
      nombre: editando.nombre,
      descripcion: editando.descripcion,
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
      const { error } = await supabase.from("vouchers").update({
        created_at: vEdit.created_at,
        cuota_numero: Number(vEdit.cuota_numero),
        total_cuotas: Number(vEdit.total_cuotas),
        estado: vEdit.estado,
        comentario: vEdit.comentario
      }).eq("id", vEdit.id);

      if (error) throw error;

      // Si se editó el monto del periodo asociado (opcional, para conveniencia del admin)
      if (vEdit.payment_periods?.monto !== undefined) {
        await supabase.from("payment_periods").update({ monto: Number(vEdit.payment_periods.monto) }).eq("id", vEdit.period_id);
      }

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

  if (loading) return <div className="p-6">Cargando...</div>;
  if (rol !== "directiva") return <div className="p-6 text-red-700">Acceso denegado.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER & TABS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Panel Directiva</h1>
            <p className="text-sm text-gray-500">Gestión de periodos y validación de pagos.</p>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
            <button
              onClick={() => setTab("validacion")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'validacion' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Validación de Pagos
            </button>
            <button
              onClick={() => setTab("historial")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'historial' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Historial Global
            </button>
            <button
              onClick={() => setTab("config")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'config' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              🛠️ Configuración
            </button>
          </div>

          <button
            onClick={() => setShowImport(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 text-sm"
          >
            <span>📂</span> Importar Excel
          </button>
        </div>

        {msg && <div className={`p-3 rounded-lg border text-sm ${tipo === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>{msg}</div>}

        {/* ===================== TAB VALIDACION ===================== */}
        {tab === "validacion" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Sidebar: Periodos para Validar */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow p-5 border h-fit sticky top-6">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-700">Seleccionar Periodo</h2>
                  <button onClick={() => setMostrarTodos(!mostrarTodos)} className="text-xs underline text-blue-600">
                    {mostrarTodos ? "Ver por periodo" : "Ver todos los pendientes"}
                  </button>
                </div>

                {/* Filtros rápidos en Validación */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {["todas", "mensual", "anual"].map(c => (
                    <button
                      key={c}
                      onClick={() => { setCatFiltro(c); setMesFiltro("todos"); }}
                      className={`flex-1 px-2 py-1 rounded-md text-[10px] uppercase font-bold transition ${catFiltro === c ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {c === "todas" ? "Todos" : c === "mensual" ? "Mensual" : "Anual"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {periodosFiltrados.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No hay periodos activos.</p>
                ) : (
                  periodosFiltrados.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setPeriodoSeleccionado(p); setMostrarTodos(false); }}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition cursor-pointer ${periodoSeleccionado?.id === p.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">{p.nombre}</span>
                        {conteoPorPeriodo.get(p.id) > 0 && (
                          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-1.5 rounded-full flex items-center justify-center">
                            {conteoPorPeriodo.get(p.id)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tight">{p.concepto}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Main: Vouchers List */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-5 border min-h-[500px]">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="font-bold text-gray-800 text-lg">
                  {periodoSeleccionado ? `Validando: ${periodoSeleccionado.nombre}` : (mostrarTodos ? "Todos los pagos pendientes" : "Selecciona un periodo a la izquierda")}
                </h2>
                <div className="relative">
                  <input
                    placeholder="Buscar socio o RUT..."
                    className="border rounded-full px-4 py-2 text-sm w-64 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
                </div>
              </div>

              {vouchersValidacion.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-4">✨</span>
                  <p className="italic">No hay pagos pendientes de revisión para esta selección.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vouchersValidacion.map(v => (
                    <VoucherRow
                      key={v.id}
                      v={v}
                      onView={verArchivo}
                      onReview={revisar}
                      onDownload={descargarArchivo}
                      onDelete={eliminarVoucher}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB HISTORIAL COMPLETO ===================== */}
        {tab === "historial" && (
          <div className="bg-white rounded-xl shadow p-6 border space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Historial Global de Pagos</h2>
                <p className="text-sm text-gray-500">Visualiza y exporta todos los pagos registrados por año.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-lg p-2 text-sm font-bold bg-gray-50"
                  value={anioHistorial}
                  onChange={e => setAnioHistorial(e.target.value)}
                >
                  <option value="2024">Año 2024</option>
                  <option value="2025">Año 2025</option>
                  <option value="2026">Año 2026</option>
                </select>

                <select
                  className="border rounded-lg p-2 text-sm font-bold bg-gray-50"
                  value={mesHistorial}
                  onChange={e => setMesHistorial(e.target.value)}
                >
                  <option value="todos">Todos los meses</option>
                  {MESES.map(m => <option key={m.n} value={m.n}>{m.name}</option>)}
                </select>

                <button
                  onClick={exportarExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <span>📊</span> Exportar Excel
                </button>

                <button
                  onClick={() => setShowManual(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100"
                >
                  <span>📝</span> Registrar Pago Manual
                </button>
              </div>
            </div>

            {/* Tarjetas de Totales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Recaudación Total Año {anioHistorial}</p>
                  <h3 className="text-2xl font-black">${statsHistorial.totalAnual.toLocaleString()}</h3>
                </div>
                <div className="bg-blue-500/30 p-3 rounded-xl text-2xl">💰</div>
              </div>

              {mesHistorial !== "todos" && (
                <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Recaudación {MESES.find(m => m.n === parseInt(mesHistorial))?.name}</p>
                    <h3 className="text-2xl font-black">${statsHistorial.totalMensual.toLocaleString()}</h3>
                  </div>
                  <div className="bg-emerald-500/30 p-3 rounded-xl text-2xl">📅</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                placeholder="Filtrar por nombre, RUT o concepto..."
                className="border rounded-lg p-2 w-full max-w-md"
                value={busquedaHistorial}
                onChange={e => setBusquedaHistorial(e.target.value)}
              />
            </div>

            {/* Tabla Simple */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Usuario / RUT</th>
                    <th className="p-3">Periodo</th>
                    <th className="p-3">Cuota</th>
                    <th className="p-3">Monto</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vouchersHistorial.length === 0 ? (
                    <tr><td colSpan="7" className="p-6 text-center text-gray-500">No se encontraron pagos en {anioHistorial}.</td></tr>
                  ) : (
                    vouchersHistorial.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="p-3">{new Date(v.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="font-bold">{v.profiles?.nombre_completo}</div>
                          <div className="text-xs text-gray-500">{v.profiles?.rut}</div>
                        </td>
                        <td className="p-3">
                          <div>{v.payment_periods?.nombre}</div>
                          <div className="text-xs text-gray-500">{v.payment_periods?.concepto}</div>
                        </td>
                        <td className="p-3">
                          {v.total_cuotas ? `${v.cuota_numero}/${v.total_cuotas}` : 'N/A'}
                        </td>
                        <td className="p-3">${v.payment_periods?.monto}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${v.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                            v.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {v.estado}
                          </span>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-2">
                          {v.archivo_path && v.archivo_path !== "SIN_COMPROBANTE" && (
                            <>
                              <button
                                onClick={() => verArchivo(v.archivo_path)}
                                className="text-gray-400 hover:text-blue-600 transition h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-50"
                                title="Ver Comprobante"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => descargarArchivo(v.archivo_path)}
                                className="text-gray-400 hover:text-green-600 transition h-8 w-8 flex items-center justify-center rounded-lg hover:bg-green-50"
                                title="Descargar Comprobante"
                              >
                                📥
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { setVEdit(v); setShowVEdit(true); }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold underline px-2"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarVoucher(v.id, v.archivo_path)}
                            className="text-red-400 hover:text-red-700 transition h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50"
                            title="Eliminar Registro"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-right text-xs text-gray-500">
              Total registros: {vouchersHistorial.length}
            </div>
          </div>
        )}


        {/* MODALES EXTRAS (Editar, Conceptos, Import) Mantenidos igual... */}
        {showEdit && editando && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow max-w-lg w-full p-6 space-y-4">
              <h3 className="text-lg font-bold">Editar Periodo</h3>
              <input className="border rounded p-2 w-full" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} />
              <input className="border rounded p-2 w-full" type="number" value={editando.monto} onChange={e => setEditando({ ...editando, monto: e.target.value })} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowEdit(false)} className="bg-gray-200 px-3 py-1 rounded">Cancelar</button>
                <button onClick={guardarEdicion} className="bg-blue-600 text-white px-3 py-1 rounded">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {showConceptos && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Gestionar Conceptos</h3>
                <button onClick={() => setShowConceptos(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
              </div>

              {modalError && <div className="bg-red-50 text-red-700 p-2 rounded text-xs mb-3">{modalError}</div>}

              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Nuevo concepto..."
                  value={nuevoConceptoName}
                  onChange={e => setNuevoConceptoName(e.target.value)}
                />
                <button onClick={crearConcepto} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+</button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {conceptos.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">No hay conceptos definidos.</p>
                ) : (
                  conceptos.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                      <span>{c.name}</span>
                      <button onClick={() => eliminarConcepto(c.id)} className="text-red-500 hover:text-red-700 p-1">🗑️</button>
                    </div>
                  ))
                )}
              </div>

              <button onClick={() => setShowConceptos(false)} className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {showImport && <ImportUsersModal onClose={() => setShowImport(false)} onReload={load} />}

        {/* MODAL EDITAR VOUCHER INDIVIDUAL (HISTORIAL) */}
        {showVEdit && vEdit && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-bold text-gray-800">Editar Pago Individual</h3>
                <button onClick={() => setShowVEdit(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuario</label>
                  <p className="text-sm font-medium">{vEdit.profiles?.nombre_completo || "Desconocido"}</p>
                  <p className="text-xs text-gray-400">{vEdit.profiles?.rut}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Registro</label>
                    <input
                      type="date"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={vEdit.created_at?.slice(0, 10)}
                      onChange={e => setVEdit({ ...vEdit, created_at: new Date(e.target.value).toISOString() })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                    <select
                      className="w-full border rounded-lg p-2 text-sm font-bold"
                      value={vEdit.estado}
                      onChange={e => setVEdit({ ...vEdit, estado: e.target.value })}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="rechazado">Rechazado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cuota</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={vEdit.cuota_numero || 1}
                      onChange={e => setVEdit({ ...vEdit, cuota_numero: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">De (Total)</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={vEdit.total_cuotas || 1}
                      onChange={e => setVEdit({ ...vEdit, total_cuotas: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto ($)</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm font-bold text-blue-700 bg-blue-50"
                      value={vEdit.payment_periods?.monto || 0}
                      onChange={e => setVEdit({ ...vEdit, payment_periods: { ...vEdit.payment_periods, monto: e.target.value } })}
                    />
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Nota: Cambiar esto afecta a todos en este periodo ({vEdit.payment_periods?.nombre}).</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observación Admin</label>
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm"
                    rows="2"
                    placeholder="Ej: Pago validado por transferencia directa..."
                    value={vEdit.comentario || ""}
                    onChange={e => setVEdit({ ...vEdit, comentario: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Comprobante / Foto</label>
                  <div className="flex items-center gap-3">
                    {vEdit.archivo_path && vEdit.archivo_path !== "SIN_COMPROBANTE" ? (
                      <button
                        type="button"
                        onClick={() => verArchivo(vEdit.archivo_path)}
                        className="text-xs bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                      >
                        📎 Ver actual
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin archivo</span>
                    )}

                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition flex-1 text-center">
                      {subiendoAdmin ? "Subiendo..." : "Subir/Cambiar Foto"}
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={subirReciboAdmin} disabled={subiendoAdmin} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button onClick={() => setShowVEdit(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition">
                  Cancelar
                </button>
                <button onClick={guardarEdicionVoucher} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-200">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL REGISTRO MANUAL */}
        {showManual && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-bold text-gray-800">Registrar Pago Manual</h3>
                <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
              </div>

              <form onSubmit={registrarPagoManual} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar y Seleccionar Usuario</label>
                  {!usuarioManualSeleccionado ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Escribe RUT o Nombre para buscar..."
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none"
                        value={filtroUsuarioManual}
                        onChange={e => setFiltroUsuarioManual(e.target.value)}
                        autoFocus
                      />
                      {filtroUsuarioManual.length > 1 && (
                        <div className="border rounded-lg max-h-40 overflow-y-auto divide-y bg-white shadow-inner">
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
                                className="p-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center transition"
                              >
                                <span>{u.nombre_completo}</span>
                                <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500">{u.rut}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3 rounded-xl">
                      <div>
                        <div className="font-bold text-blue-800 text-sm">{usuarioManualSeleccionado.nombre_completo}</div>
                        <div className="text-xs text-blue-600">{usuarioManualSeleccionado.rut}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUsuarioManualSeleccionado(null);
                          setManualData({ ...manualData, user_id: "" });
                        }}
                        className="bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Periodo de Pago</label>
                    <button
                      type="button"
                      onClick={() => setCrearNuevoPeriodo(!crearNuevoPeriodo)}
                      className="text-[10px] font-bold text-blue-600 hover:underline uppercase"
                    >
                      {crearNuevoPeriodo ? "← Seleccionar existente" : "+ Crear nuevo periodo"}
                    </button>
                  </div>

                  {!crearNuevoPeriodo ? (
                    <select
                      required={!crearNuevoPeriodo}
                      className="w-full border rounded-lg p-2 text-sm"
                      value={manualData.period_id}
                      onChange={e => setManualData({ ...manualData, period_id: e.target.value })}
                    >
                      <option value="">-- Seleccionar Periodo --</option>
                      {periodos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.concepto})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          {!crearNuevoConceptoManual ? (
                            <div className="flex gap-1">
                              <select
                                className="border rounded-lg p-2 text-sm flex-1"
                                value={nuevoPeriodoData.concepto}
                                onChange={e => setNuevoPeriodoData({ ...nuevoPeriodoData, concepto: e.target.value })}
                              >
                                <option value="">Concepto...</option>
                                {conceptos.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => setCrearNuevoConceptoManual(true)}
                                className="bg-gray-100 hover:bg-gray-200 px-2 rounded-lg text-xs"
                                title="Nuevo Concepto"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <input
                                placeholder="Nuevo concepto..."
                                className="border border-blue-300 rounded-lg p-2 text-sm flex-1 bg-blue-50"
                                value={nuevoConceptoNombreManual}
                                onChange={e => setNuevoConceptoNombreManual(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!nuevoConceptoNombreManual.trim()) return;
                                  const { data, error } = await supabase.from("payment_concepts").insert({ name: nuevoConceptoNombreManual.trim() }).select().single();
                                  if (error) alert(error.message);
                                  else {
                                    setConceptos([...conceptos, data].sort((a, b) => a.name.localeCompare(b.name)));
                                    setNuevoPeriodoData({ ...nuevoPeriodoData, concepto: data.name });
                                    setCrearNuevoConceptoManual(false);
                                    setNuevoConceptoNombreManual("");
                                  }
                                }}
                                className="bg-blue-600 text-white px-2 rounded-lg text-xs font-bold"
                              >
                                OK
                              </button>
                              <button type="button" onClick={() => setCrearNuevoConceptoManual(false)} className="bg-gray-200 px-2 rounded-lg text-xs">✕</button>
                            </div>
                          )}
                        </div>
                        <input
                          placeholder="Nombre (Ej: Cuota Marzo 2023)"
                          className="border rounded-lg p-2 text-sm"
                          value={nuevoPeriodoData.nombre}
                          onChange={e => setNuevoPeriodoData({ ...nuevoPeriodoData, nombre: e.target.value })}
                        />
                      </div>
                      <input
                        type="number"
                        placeholder="Monto $"
                        className="w-full border rounded-lg p-2 text-sm"
                        value={nuevoPeriodoData.monto}
                        onChange={e => setNuevoPeriodoData({ ...nuevoPeriodoData, monto: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between">
                    <span>Subir Comprobante (Opcional)</span>
                    {archivoManual && <span className="text-blue-600">✓ Seleccionado</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onChange={e => setArchivoManual(e.target.files[0])}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cuota Nro</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={manualData.cuota_numero}
                      onChange={e => setManualData({ ...manualData, cuota_numero: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Cuotas</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={manualData.total_cuotas}
                      onChange={e => setManualData({ ...manualData, total_cuotas: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Pago</label>
                    <input
                      type="date"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={manualData.created_at}
                      onChange={e => setManualData({ ...manualData, created_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                    <select
                      className="w-full border rounded-lg p-2 text-sm font-bold"
                      value={manualData.estado}
                      onChange={e => setManualData({ ...manualData, estado: e.target.value })}
                    >
                      <option value="aprobado">Aprobado</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comentario / Nota</label>
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm"
                    rows="2"
                    value={manualData.comentario}
                    onChange={e => setManualData({ ...manualData, comentario: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowManual(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-200">
                    Registrar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================== TAB CONFIGURACIÓN ===================== */}
        {tab === "config" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Crear Periodo Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">⚙️</div>
              <h2 className="text-lg font-black uppercase text-blue-900 mb-6 flex items-center gap-2">
                <span className="bg-blue-600 text-white p-1.5 rounded-lg text-sm">＋</span>
                Nuevo Tipo de Pago / Periodo
              </h2>

              <form onSubmit={crearPeriodo} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Concepto Base</label>
                  <div className="flex gap-1">
                    <select className="flex-1 border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none transition" value={concepto} onChange={e => setConcepto(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {conceptos.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowConceptos(true)} className="bg-gray-100 hover:bg-blue-100 text-blue-600 px-3 rounded-xl transition" title="Configurar Conceptos">⚙️</button>
                  </div>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nombre Descriptivo</label>
                  <input className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Ej: Cuota Enero 2025" value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>

                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Descripción corta (opcional)</label>
                  <input className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Detalles extra..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Monto ($)</label>
                  <input className="w-full border rounded-xl p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none transition font-bold text-blue-700" type="number" placeholder="0" value={monto} onChange={e => setMonto(e.target.value)} />
                </div>

                <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-3 font-bold md:col-span-1 shadow-lg shadow-blue-100 transition flex items-center justify-center">
                  <span className="text-xl">＋</span>
                </button>
              </form>
            </div>

            {/* Listado de Periodos Existentes */}
            <div className="bg-white rounded-2xl shadow-lg border p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Gestión de Periodos</h2>
                  <p className="text-sm text-gray-500">Activa, desactiva o edita los planes de pago existentes.</p>
                </div>
                <div className="flex gap-2">
                  <select className="border rounded-lg px-3 py-1 text-xs bg-gray-50" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
                    <option value="todas">Todas las categorías</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-y">
                    <tr>
                      <th className="px-6 py-4">Nombre / Concepto</th>
                      <th className="px-6 py-4">Monto</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {periodosFiltrados.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">No hay periodos configurados.</td></tr>
                    ) : (
                      periodosFiltrados.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-800">{p.nombre}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.concepto}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-gray-700">${p.monto.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => togglePeriodo(p.id, p.activo)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition shadow-sm ${p.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              {p.activo ? '● Activo' : '○ Inactivo'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setEditando(p); setShowEdit(true); }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition" title="Editar">✏️</button>
                              <button onClick={() => eliminarPeriodo(p.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition" title="Eliminar">🗑️</button>
                            </div>
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
      </div>
    </div>
  );
}

function VoucherRow({ v, onView, onReview, onDownload, onDelete }) {
  const [comentario, setComentario] = useState(v.comentario || "");

  return (
    <div className="border rounded-xl p-4 md:p-5 bg-white shadow-sm hover:shadow transition">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">
            {v.profiles?.nombre_completo || "Usuario Desconocido"}
          </h3>
          <p className="text-sm text-gray-500 font-mono">{v.profiles?.email} • {v.profiles?.rut}</p>
          {(v.profiles?.numero_cuenta || v.profiles?.banco) && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">Cuenta:</span> {v.profiles?.numero_cuenta || "N/A"} • <span className="font-semibold">Banco:</span> {v.profiles?.banco || "N/A"}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
              {v.payment_periods?.nombre}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Monto: ${v.payment_periods?.monto}
            </span>
            {v.total_cuotas && (
              <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold">
                Cuota {v.cuota_numero}/{v.total_cuotas}
              </span>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Enviado: {new Date(v.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${v.estado === 'aprobado' ? 'bg-green-100 text-green-700' : v.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {v.estado}
          </span>
          <div className="flex gap-2">
            {v.archivo_path && v.archivo_path !== "SIN_COMPROBANTE" && (
              <>
                <button
                  onClick={() => onView(v.archivo_path)}
                  className="text-blue-600 hover:text-blue-800 transition"
                  title="Ver Comprobante"
                >
                  👁️
                </button>
                <button
                  onClick={() => onDownload(v.archivo_path)}
                  className="text-green-600 hover:text-green-800 transition"
                  title="Descargar Comprobante"
                >
                  📥
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(v.id, v.archivo_path)}
              className="text-red-400 hover:text-red-700 transition"
              title="Eliminar Registro"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Acciones de Revisión */}
      <div className="mt-4 pt-4 border-t flex flex-col md:flex-row gap-3 items-center">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm w-full"
          placeholder="Observación (opcional)..."
          value={comentario}
          onChange={e => setComentario(e.target.value)}
        />
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => onReview(v.id, "aprobado", comentario)} className="flex-1 md:w-24 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium">Aprobar</button>
          <button onClick={() => onReview(v.id, "rechazado", comentario)} className="flex-1 md:w-24 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium">Rechazar</button>
        </div>
      </div>
    </div>
  );
}
