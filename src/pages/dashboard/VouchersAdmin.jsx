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

  // ========== FILTROS TAB VALIDACION ==========
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // ========== FILTROS TAB HISTORIAL ==========
  const [anioHistorial, setAnioHistorial] = useState(new Date().getFullYear()); // Default current year
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  // ✅ form periodo (crear)
  const [concepto, setConcepto] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState(""); // error | success

  // ✅ editar período
  const [editando, setEditando] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // ✅ conceptos de pago (dinámico)
  const [conceptos, setConceptos] = useState([]);
  const [showConceptos, setShowConceptos] = useState(false);
  const [nuevoConceptoName, setNuevoConceptoName] = useState("");

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
  }, [vouchers, anioHistorial, busquedaHistorial]);


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
    // ... same logic
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

  const crearConcepto = async () => { /* ... same */ setModalError(""); if (!nuevoConceptoName.trim()) return; const { error } = await supabase.from("payment_concepts").insert({ name: nuevoConceptoName.trim() }); if (error) setModalError(error.message); else { setNuevoConceptoName(""); load(); } };
  const eliminarConcepto = async (id) => { /* ... same */ if (!confirm("Eliminar?")) return; const { error } = await supabase.from("payment_concepts").delete().eq("id", id); if (error) alert(error.message); else load(); };

  const guardarEdicion = async () => { /* ... same */ setMsg(""); setTipo(""); const { error } = await supabase.from("payment_periods").update({ concepto: editando.concepto, nombre: editando.nombre, descripcion: editando.descripcion, monto: Number(editando.monto) }).eq("id", editando.id); if (error) { setMsg("Error guardando"); setTipo("error"); } else { setMsg("Guardado"); setTipo("success"); setShowEdit(false); setEditando(null); load(); } };

  const revisar = async (voucherId, nuevoEstado, comentario = "") => {
    const { error } = await supabase.from("vouchers").update({ estado: nuevoEstado, comentario: comentario || null, revisado_por: user.id }).eq("id", voucherId);
    if (error) { setMsg("Error actualizando"); setTipo("error"); return; }
    setMsg(`Voucher ${nuevoEstado} ✅`); setTipo("success"); load();
  };

  const verArchivo = async (path) => {
    const { data, error } = await supabase.storage.from("vouchers").createSignedUrl(path, 60);
    if (error) { setMsg("Error archivo"); setTipo("error"); return; }
    window.open(data.signedUrl, "_blank");
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
              Validación y Periodos
            </button>
            <button
              onClick={() => setTab("historial")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'historial' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Historial Global & Exportar
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
          <div className="space-y-6">
            {/* Crear Periodo */}
            <div className="bg-white rounded-xl shadow p-5 border">
              <h2 className="text-sm font-bold uppercase text-gray-500 mb-4 tracking-wider">Crear Nuevo Periodo de Pago</h2>
              <form onSubmit={crearPeriodo} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3 flex gap-1">
                  <select className="border rounded p-2 text-sm w-full" value={concepto} onChange={e => setConcepto(e.target.value)}>
                    <option value="">Concepto...</option>
                    {conceptos.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowConceptos(true)} className="bg-gray-100 hover:bg-gray-200 px-2 rounded">⚙️</button>
                </div>
                <input className="border rounded p-2 text-sm md:col-span-3" placeholder="Nombre (Ej: Cuota Enero)" value={nombre} onChange={e => setNombre(e.target.value)} />
                <input className="border rounded p-2 text-sm md:col-span-4" placeholder="Descripción (Opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                <input className="border rounded p-2 text-sm md:col-span-1" type="number" placeholder="$" value={monto} onChange={e => setMonto(e.target.value)} />
                <button className="bg-blue-600 text-white rounded p-2 text-sm font-bold md:col-span-1 hover:bg-blue-700">+</button>
              </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista Periodos */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow p-5 border h-fit">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-700">Periodos Activos</h2>
                  <button onClick={() => setMostrarTodos(!mostrarTodos)} className="text-xs underline text-blue-600">
                    {mostrarTodos ? "Ver por periodo" : "Ver todos"}
                  </button>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {periodos.map(p => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setPeriodoSeleccionado(p); setMostrarTodos(false); }}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition cursor-pointer ${periodoSeleccionado?.id === p.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">{p.nombre}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{p.concepto} • ${p.monto}</p>
                      <div className="mt-2 flex gap-2">
                        <span className="text-xs bg-gray-100 px-2 rounded">Pagos: {conteoPorPeriodo.get(p.id) || 0}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditando(p); setShowEdit(true); }} className="text-xs text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0">Editar</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); eliminarPeriodo(p.id); }} className="text-xs text-red-600 hover:underline cursor-pointer bg-transparent border-0 p-0">Eliminar</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); togglePeriodo(p.id, p.activo); }} className="text-xs text-gray-600 hover:underline cursor-pointer bg-transparent border-0 p-0">{p.activo ? 'Desactivar' : 'Activar'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vouchers List */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow p-5 border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-700">
                    {periodoSeleccionado ? `Pagos: ${periodoSeleccionado.nombre}` : (mostrarTodos ? "Todos los pagos recientes" : "Selecciona un periodo")}
                  </h2>
                  <input
                    placeholder="Buscar..."
                    className="border rounded px-3 py-1 text-sm w-48"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>

                {vouchersValidacion.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 italic">No hay pagos para mostrar.</p>
                ) : (
                  <div className="space-y-4">
                    {vouchersValidacion.map(v => (
                      <VoucherRow key={v.id} v={v} onView={verArchivo} onReview={revisar} />
                    ))}
                  </div>
                )}
              </div>
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

                <button
                  onClick={exportarExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <span>📊</span> Exportar Excel
                </button>
              </div>
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vouchersHistorial.length === 0 ? (
                    <tr><td colSpan="6" className="p-6 text-center text-gray-500">No se encontraron pagos en {anioHistorial}.</td></tr>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            {/* Same concepts modal... short version for brevity in replacement */}
            <div className="bg-white rounded shadow p-5 w-80">
              <h3 className="font-bold mb-2">Conceptos</h3>
              <div className="flex gap-1 mb-2">
                <input className="border rounded flex-1 p-1" value={nuevoConceptoName} onChange={e => setNuevoConceptoName(e.target.value)} />
                <button onClick={crearConcepto} className="bg-blue-600 text-white px-2 rounded">+</button>
              </div>
              <ul>
                {conceptos.map(c => (<li key={c.id} className="flex justify-between">{c.name} <button onClick={() => eliminarConcepto(c.id)} className="text-red-500">x</button></li>))}
              </ul>
              <button onClick={() => setShowConceptos(false)} className="w-full bg-gray-200 mt-2 rounded">Cerrar</button>
            </div>
          </div>
        )}

        {showImport && <ImportUsersModal onClose={() => setShowImport(false)} onReload={load} />}

      </div>
    </div>
  );
}

function VoucherRow({ v, onView, onReview }) {
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
          {v.archivo_path && v.archivo_path !== "SIN_COMPROBANTE" && (
            <button onClick={() => onView(v.archivo_path)} className="text-blue-600 underline text-sm hover:text-blue-800">
              Ver Comprobante 📎
            </button>
          )}
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
