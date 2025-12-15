import { useEffect, useMemo, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function Vouchers() {
  const { user } = useContext(AppContext);

  const [periodos, setPeriodos] = useState([]);
  const [periodoSel, setPeriodoSel] = useState(null);

  // Map: period_id -> voucher del usuario
  const [misVouchers, setMisVouchers] = useState(new Map());

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");

  const hoyISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = async () => {
    setLoading(true);
    setMsg("");
    setTipo("");

    try {
      // ✅ 1) Traer TODOS los períodos disponibles (activos y vigentes por fecha)
      // Si quieres mostrar activos aunque no estén vigentes, quita lte/gte.
      const { data: ps, error: e1 } = await supabase
        .from("payment_periods")
        .select("id,concepto,nombre,fecha_inicio,fecha_fin,monto,activo,created_at")
        .eq("activo", true)
        .lte("fecha_inicio", hoyISO)
        .gte("fecha_fin", hoyISO)
        .order("created_at", { ascending: false });

      if (e1) throw e1;

      const list = ps || [];
      setPeriodos(list);

      // Selección por defecto
      if (!periodoSel && list.length) setPeriodoSel(list[0]);
      if (periodoSel && !list.find((p) => p.id === periodoSel.id)) {
        setPeriodoSel(list[0] || null);
      }

      // ✅ 2) Traer MIS vouchers para esos períodos (de una vez)
      if (list.length) {
        const ids = list.map((p) => p.id);

        const { data: vs, error: e2 } = await supabase
          .from("vouchers")
          .select("id, period_id, archivo_path, estado, comentario, created_at, updated_at")
          .eq("user_id", user.id)
          .in("period_id", ids);

        if (e2) throw e2;

        const map = new Map();
        (vs || []).forEach((v) => map.set(v.period_id, v));
        setMisVouchers(map);
      } else {
        setMisVouchers(new Map());
      }
    } catch (err) {
      console.error(err);
      setMsg(err?.message || "Error cargando períodos.");
      setTipo("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const miVoucherActual = useMemo(() => {
    if (!periodoSel) return null;
    return misVouchers.get(periodoSel.id) || null;
  }, [misVouchers, periodoSel]);

  const subir = async () => {
    setMsg("");
    setTipo("");

    if (!periodoSel) {
      setMsg("No hay períodos disponibles.");
      setTipo("error");
      return;
    }
    if (!file) {
      setMsg("Selecciona un archivo (PDF/JPG/PNG).");
      setTipo("error");
      return;
    }

    try {
      setSubiendo(true);

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${periodoSel.id}/${crypto.randomUUID()}.${ext}`;

      // 1) subir a Storage
      const { error: upErr } = await supabase.storage
        .from("vouchers")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (upErr) throw upErr;

      // 2) guardar/actualizar fila en vouchers
      if (!miVoucherActual) {
        const { error: insErr } = await supabase.from("vouchers").insert({
          user_id: user.id,
          period_id: periodoSel.id,
          archivo_path: path,
          estado: "pendiente",
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
          })
          .eq("id", miVoucherActual.id);
        if (upErr2) throw upErr2;
      }

      setFile(null);
      setMsg("Comprobante enviado ✅ Quedó en revisión.");
      setTipo("success");
      await load();
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Error al subir el comprobante.");
      setTipo("error");
    } finally {
      setSubiendo(false);
    }
  };

  const verMiArchivo = async () => {
    if (!miVoucherActual?.archivo_path) return;

    const { data, error } = await supabase.storage
      .from("vouchers")
      .createSignedUrl(miVoucherActual.archivo_path, 60);

    if (error) {
      setMsg("No se pudo generar el link.");
      setTipo("error");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="min-h-screen flex-1 items-center justify-center bg-gradient-to-br p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vouchers / Comprobantes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Aquí verás todos los períodos disponibles y tu estado en cada uno.
          </p>
        </div>

        {msg && (
          <div
            className={`p-3 rounded-lg border text-sm ${
              tipo === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {msg}
          </div>
        )}

        {/* ✅ LISTA DE PERÍODOS */}
        {periodos.length === 0 ? (
          <div className="p-4 rounded-xl border bg-gray-50 text-sm text-gray-600">
            No hay períodos de pago abiertos actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {periodos.map((p) => {
              const selected = periodoSel?.id === p.id;
              const miV = misVouchers.get(p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPeriodoSel(p);
                    setFile(null);
                    setMsg("");
                    setTipo("");
                  }}
                  className={`text-left border rounded-xl p-4 transition ${
                    selected ? "border-blue-500 ring-2 ring-blue-100" : "hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {p.concepto ? `${p.concepto} — ` : ""}
                    {p.nombre}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {p.fecha_inicio} → {p.fecha_fin} • Monto: ${p.monto}
                  </p>

                  <p className="text-xs text-gray-500 mt-2">
                    Mi estado:{" "}
                    <b className="uppercase">
                      {miV?.estado || "sin comprobante"}
                    </b>
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ✅ PANEL DEL PERÍODO SELECCIONADO */}
        {periodoSel && (
          <div className="border rounded-2xl p-5 bg-gray-50 space-y-4">
            <div>
              <h2 className="text-lg font-bold">Período seleccionado</h2>
              <p className="text-sm text-gray-700">
                <b>{periodoSel.concepto ? `${periodoSel.concepto} — ` : ""}{periodoSel.nombre}</b>
              </p>
              <p className="text-sm text-gray-600">
                {periodoSel.fecha_inicio} → {periodoSel.fecha_fin} • Monto: ${periodoSel.monto}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subir comprobante (PDF/JPG/PNG)
              </label>

              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={subiendo}
                className="w-full"
              />

              <button
                onClick={subir}
                disabled={!file || subiendo}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {subiendo
                  ? "Subiendo..."
                  : miVoucherActual
                  ? "Reemplazar comprobante"
                  : "Subir comprobante"}
              </button>
            </div>

            <div className="bg-white rounded-xl border p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">
                  Mi estado: <span className="uppercase">{miVoucherActual?.estado || "sin comprobante"}</span>
                </p>
                {miVoucherActual?.comentario && (
                  <p className="text-sm text-gray-600 mt-1">
                    Comentario: {miVoucherActual.comentario}
                  </p>
                )}
                {miVoucherActual?.updated_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Actualizado: {new Date(miVoucherActual.updated_at).toLocaleString()}
                  </p>
                )}
              </div>

              <button
                onClick={verMiArchivo}
                disabled={!miVoucherActual?.archivo_path}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
              >
                Ver archivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
