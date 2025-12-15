import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function VouchersAdmin() {
  const { user } = useContext(AppContext);

  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  const [periodos, setPeriodos] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  // ✅ filtro
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false); // ✅ opcional: ver todos

  // ✅ form periodo (crear)
  const [concepto, setConcepto] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [monto, setMonto] = useState("");

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState(""); // error | success

  // ✅ editar período
  const [editando, setEditando] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

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

      // 2) periodos
      const { data: p, error: e1 } = await supabase
        .from("payment_periods")
        .select("id, concepto, nombre, descripcion, fecha_inicio, fecha_fin, monto, activo, created_at")
        .order("created_at", { ascending: false });

      if (e1) throw e1;
      setPeriodos(p || []);

      // 3) vouchers (sin join)
      const { data: v, error: e2 } = await supabase
        .from("vouchers")
        .select("id, user_id, period_id, archivo_path, estado, comentario, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (e2) throw e2;

      // 4) traer perfiles y periodos relacionados y unir en frontend
      const userIds = [...new Set((v || []).map((x) => x.user_id))];
      const periodIds = [...new Set((v || []).map((x) => x.period_id))];

      const [{ data: profs, error: e3 }, { data: per, error: e4 }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, nombre_completo, email").in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
        periodIds.length
          ? supabase.from("payment_periods").select("id, concepto, nombre").in("id", periodIds)
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

  // ✅ contadores por período (para mostrar "cuántos pagos")
  const conteoPorPeriodo = useMemo(() => {
    const map = new Map();
    for (const v of vouchers) {
      map.set(v.period_id, (map.get(v.period_id) || 0) + 1);
    }
    return map;
  }, [vouchers]);

  // ✅ vouchers filtrados: SOLO por período seleccionado (para NO mezclar)
  const vouchersFiltrados = useMemo(() => {
    let rows = vouchers;

    // si NO mostrarTodos, obligamos selección de período
    if (!mostrarTodos) {
      if (!periodoSeleccionado) return []; // ✅ no mostrar nada hasta elegir
      rows = rows.filter((v) => v.period_id === periodoSeleccionado.id);
    } else {
      // modo ver todos (opcional)
      if (periodoSeleccionado) rows = rows.filter((v) => v.period_id === periodoSeleccionado.id);
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

  const crearPeriodo = async (e) => {
    e.preventDefault();
    setMsg("");
    setTipo("");

    if (!concepto || !nombre || !inicio || !fin) {
      setMsg("Completa: Concepto, Nombre, Inicio y Fin.");
      setTipo("error");
      return;
    }

    if (monto === "" || Number(monto) < 0) {
      setMsg("Monto inválido.");
      setTipo("error");
      return;
    }

    const { error } = await supabase.from("payment_periods").insert({
      concepto,
      nombre,
      descripcion: descripcion || null,
      fecha_inicio: inicio,
      fecha_fin: fin,
      monto: Number(monto),
      activo: true,
      created_by: user.id,
    });

    if (error) {
      setMsg(error.message);
      setTipo("error");
      return;
    }

    setConcepto("");
    setNombre("");
    setDescripcion("");
    setInicio("");
    setFin("");
    setMonto("");

    setMsg("Período creado ✅");
    setTipo("success");
    load();
  };

  const togglePeriodo = async (id, activoActual) => {
    const { error } = await supabase
      .from("payment_periods")
      .update({ activo: !activoActual })
      .eq("id", id);

    if (error) {
      setMsg("No se pudo cambiar el estado del período.");
      setTipo("error");
      return;
    }
    load();
  };

  const eliminarPeriodo = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este período?")) return;

    const { error } = await supabase.from("payment_periods").delete().eq("id", id);

    if (error) {
      setMsg("No se pudo eliminar el período.");
      setTipo("error");
      return;
    }

    if (periodoSeleccionado?.id === id) setPeriodoSeleccionado(null);

    setMsg("Período eliminado ✅");
    setTipo("success");
    load();
  };

  const guardarEdicion = async () => {
    setMsg("");
    setTipo("");

    if (!editando?.concepto || !editando?.nombre || !editando?.fecha_inicio || !editando?.fecha_fin) {
      setMsg("Completa: Concepto, Nombre, Inicio y Fin.");
      setTipo("error");
      return;
    }

    if (editando.monto === "" || Number(editando.monto) < 0) {
      setMsg("Monto inválido.");
      setTipo("error");
      return;
    }

    const { error } = await supabase
      .from("payment_periods")
      .update({
        concepto: editando.concepto,
        nombre: editando.nombre,
        descripcion: editando.descripcion || null,
        fecha_inicio: editando.fecha_inicio,
        fecha_fin: editando.fecha_fin,
        monto: Number(editando.monto),
      })
      .eq("id", editando.id);

    if (error) {
      setMsg("Error al guardar cambios.");
      setTipo("error");
      return;
    }

    setMsg("Período actualizado ✅");
    setTipo("success");
    setShowEdit(false);
    setEditando(null);
    load();
  };

  const revisar = async (voucherId, nuevoEstado, comentario = "") => {
    const { error } = await supabase
      .from("vouchers")
      .update({
        estado: nuevoEstado,
        comentario: comentario || null,
        revisado_por: user.id,
      })
      .eq("id", voucherId);

    if (error) {
      setMsg("Error al actualizar voucher.");
      setTipo("error");
      return;
    }

    setMsg(`Voucher ${nuevoEstado} ✅`);
    setTipo("success");
    load();
  };

  const verArchivo = async (path) => {
    const { data, error } = await supabase.storage.from("vouchers").createSignedUrl(path, 60);

    if (error) {
      setMsg("No se pudo abrir el archivo.");
      setTipo("error");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  if (rol !== "directiva") {
    return (
      <div className="p-6">
        <p className="text-red-700 font-semibold">No tienes permisos (solo directiva).</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Panel Directiva: Pagos & Vouchers</h1>

          {msg && (
            <div
              className={`mt-3 p-3 rounded-lg border text-sm ${
                tipo === "error"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-700"
              }`}
            >
              {msg}
            </div>
          )}
        </div>

        {/* ===================== */}
        {/* Crear período */}
        {/* ===================== */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">Crear “espacio de pago”</h2>

          <form onSubmit={crearPeriodo} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              className="border rounded-lg p-3 md:col-span-2"
              placeholder="Concepto (Ej: Cuota mensual / Torneo / Uniforme)"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
            />
            <input
              className="border rounded-lg p-3 md:col-span-2"
              placeholder="Nombre (Ej: Enero 2026 / Torneo Verano 2026)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            <textarea
              className="border rounded-lg p-3 md:col-span-4"
              rows={3}
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />

            <input className="border rounded-lg p-3" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <input className="border rounded-lg p-3" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            <input className="border rounded-lg p-3" type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" />

            <button className="md:col-span-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
              Crear período
            </button>
          </form>
        </div>

        {/* ===================== */}
        {/* Periodos -> seleccionas 1 y recien abajo ves usuarios */}
        {/* ===================== */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Períodos (elige uno)</h2>
              <p className="text-sm text-gray-600">
                Así no se mezclan todos los usuarios. Selecciona un período y abajo verás solo sus vouchers.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarTodos((s) => !s);
                  setPeriodoSeleccionado(null);
                  setBusqueda("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
              >
                {mostrarTodos ? "Modo: solo por período" : "Modo: ver todos (opcional)"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPeriodoSeleccionado(null);
                  setBusqueda("");
                  setMostrarTodos(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {periodos.map((p) => {
              const selected = periodoSeleccionado?.id === p.id;
              const count = conteoPorPeriodo.get(p.id) || 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPeriodoSeleccionado(p);
                    setBusqueda("");
                  }}
                  className={`text-left border rounded-xl p-4 transition ${
                    selected ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {p.concepto} — {p.nombre}
                      </p>
                      {p.descripcion && <p className="text-sm text-gray-600 mt-1">{p.descripcion}</p>}
                      <p className="text-sm text-gray-600 mt-1">
                        {p.fecha_inicio} → {p.fecha_fin} • ${p.monto}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Activo: {p.activo ? "Sí" : "No"} • Pagos: <b>{count}</b>
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditando({
                            ...p,
                            fecha_inicio: p.fecha_inicio || "",
                            fecha_fin: p.fecha_fin || "",
                            monto: p.monto ?? 0,
                          });
                          setShowEdit(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarPeriodo(p.id);
                        }}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-black"
                      >
                        Eliminar
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePeriodo(p.id, p.activo);
                        }}
                        className={`px-3 py-2 rounded-lg text-white ${
                          p.activo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {p.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {periodos.length === 0 && <p className="text-sm text-gray-500 mt-3">No hay períodos aún.</p>}
        </div>

        {/* ===================== */}
        {/* Lista de vouchers filtrados (no mezclados) */}
        {/* ===================== */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold">Usuarios que pagaron</h2>
              {!mostrarTodos && !periodoSeleccionado ? (
                <p className="text-sm text-gray-600">Selecciona un período arriba para ver sus vouchers.</p>
              ) : (
                <p className="text-sm text-gray-600">
                  {periodoSeleccionado
                    ? `Período: ${periodoSeleccionado.concepto} — ${periodoSeleccionado.nombre}`
                    : "Mostrando todos (modo opcional)"}
                </p>
              )}
            </div>

            <input
              className="border rounded-lg p-2 w-full md:w-72"
              placeholder="Buscar por nombre, email o estado..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              disabled={!mostrarTodos && !periodoSeleccionado}
            />
          </div>

          {(!mostrarTodos && !periodoSeleccionado) ? (
            <div className="p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
               Elige un período para cargar la lista.
            </div>
          ) : vouchersFiltrados.length === 0 ? (
            <p className="text-sm text-gray-500">No hay vouchers para este filtro.</p>
          ) : (
            <div className="space-y-4">
              {vouchersFiltrados.map((v) => (
                <VoucherRow key={v.id} v={v} onView={verArchivo} onReview={revisar} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===================== */}
      {/* Modal Editar Período */}
      {/* ===================== */}
      {showEdit && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold">Editar período</h2>

            <div>
              <label className="text-xs text-gray-600 font-medium">Concepto</label>
              <input
                className="w-full border rounded-lg p-3"
                value={editando.concepto || ""}
                onChange={(e) => setEditando({ ...editando, concepto: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 font-medium">Nombre</label>
              <input
                className="w-full border rounded-lg p-3"
                value={editando.nombre || ""}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 font-medium">Descripción</label>
              <textarea
                className="w-full border rounded-lg p-3"
                rows={3}
                value={editando.descripcion || ""}
                onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 font-medium">Fecha inicio</label>
                <input
                  type="date"
                  className="border rounded-lg p-3 w-full"
                  value={editando.fecha_inicio || ""}
                  onChange={(e) => setEditando({ ...editando, fecha_inicio: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">Fecha fin</label>
                <input
                  type="date"
                  className="border rounded-lg p-3 w-full"
                  value={editando.fecha_fin || ""}
                  onChange={(e) => setEditando({ ...editando, fecha_fin: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 font-medium">Monto</label>
              <input
                type="number"
                className="w-full border rounded-lg p-3"
                value={editando.monto ?? 0}
                onChange={(e) => setEditando({ ...editando, monto: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowEdit(false);
                  setEditando(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancelar
              </button>

              <button
                onClick={guardarEdicion}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VoucherRow({ v, onView, onReview }) {
  const [comentario, setComentario] = useState(v.comentario || "");

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <p className="font-semibold">
            {v.profiles?.nombre_completo || v.profiles?.email || v.user_id}
          </p>

          <p className="text-xs text-gray-500">{new Date(v.created_at).toLocaleString()}</p>

          <p className="text-sm mt-2">
            Pago:{" "}
            <b>
              {v.payment_periods?.concepto || "—"} — {v.payment_periods?.nombre || "—"}
            </b>
          </p>

          <p className="text-sm mt-1">
            Estado: <b className="uppercase">{v.estado}</b>
          </p>
        </div>

        <button
          onClick={() => onView(v.archivo_path)}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
        >
          Ver archivo
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Comentario (opcional)</label>
        <input
          className="w-full border rounded-lg p-2"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Ej: Falta nombre, imagen borrosa, etc."
        />
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onReview(v.id, "aprobado", comentario)}
          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Aprobar
        </button>
        <button
          onClick={() => onReview(v.id, "rechazado", comentario)}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
        >
          Rechazar
        </button>
        <button
          onClick={() => onReview(v.id, "pendiente", comentario)}
          className="flex-1 bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600"
        >
          Pendiente
        </button>
      </div>
    </div>
  );
}
