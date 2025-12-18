import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";

export default function Historial() {
  const { user } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [inscripciones, setInscripciones] = useState([]);
  const [pagos2024, setPagos2024] = useState([]);
  const [pagos2025, setPagos2025] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setMsg("");

      try {
        // 1. Fetch Inscripciones
        const { data: dataInsc, error: errInsc } = await supabase
          .from("inscripciones")
          .select("id, estado, created_at, convocatorias(id, club, piscina, fecha_inicio, fecha_fin, estado)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (errInsc) throw errInsc;
        setInscripciones(dataInsc || []);

        // 2. Fetch Vouchers (Pagos)
        // We link with payment_periods to get the date
        const { data: dataVouchers, error: errVouchers } = await supabase
          .from("vouchers")
          .select("id, estado, total_cuotas, cuota_numero, archivo_path, created_at, payment_periods(nombre, fecha_inicio, concepto, monto)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (errVouchers) throw errVouchers;

        // 3. Filter by Year
        const p24 = [];
        const p25 = [];

        (dataVouchers || []).forEach(v => {
          const fecha = v.payment_periods?.fecha_inicio;
          if (fecha) {
            const year = new Date(fecha).getFullYear();
            if (year === 2024) p24.push(v);
            if (year === 2025) p25.push(v);
          }
        });

        setPagos2024(p24);
        setPagos2025(p25);

      } catch (error) {
        setMsg(error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading) return <div className="p-6">Cargando historial...</div>;

  return (
    <div className="max-w-6xl space-y-10 pb-12">

      {/* SECCION PAGOS */}
      <div>
        <h1 className="text-3xl font-bold mb-6 border-b pb-2">Historial de Pagos</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 2024 */}
          <div className="bg-gray-50 p-6 rounded-2xl border">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Año 2024</h2>
            {pagos2024.length === 0 ? (
              <p className="text-gray-500 italic">No hay pagos registrados.</p>
            ) : (
              <div className="space-y-3">
                {pagos2024.map(p => <PagoCard key={p.id} p={p} />)}
              </div>
            )}
          </div>

          {/* 2025 */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h2 className="text-xl font-bold mb-4 text-blue-800">Año 2025</h2>
            {pagos2025.length === 0 ? (
              <p className="text-blue-600 italic">No hay pagos registrados.</p>
            ) : (
              <div className="space-y-3">
                {pagos2025.map(p => <PagoCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCION INSCRIPCIONES */}
      <div>
        <h2 className="text-2xl font-bold mb-4 border-b pb-2">Historial de Inscripciones</h2>

        {msg && (
          <div className="mb-4 p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
            {msg}
          </div>
        )}

        {inscripciones.length === 0 ? (
          <div className="text-sm text-gray-500">Aún no tienes inscripciones.</div>
        ) : (
          <div className="space-y-3">
            {inscripciones.map((i) => (
              <div key={i.id} className="bg-white rounded-2xl shadow-sm border p-5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{i.convocatorias?.club}</p>
                  <p className="text-sm text-gray-600">
                    Piscina: {i.convocatorias?.piscina}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${i.estado === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {i.estado}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(i.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PagoCard({ p }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-start">
      <div>
        <p className="font-bold text-gray-800">{p.payment_periods?.nombre}</p>
        <p className="text-xs text-gray-500 uppercase">{p.payment_periods?.concepto}</p>
        <p className="text-sm mt-1">
          {p.total_cuotas ? `Cuota ${p.cuota_numero}/${p.total_cuotas}` : 'Pago único'}
        </p>
      </div>
      <div className="text-right">
        <span className={`block px-2 py-1 rounded text-xs font-bold uppercase mb-1 ${p.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
            p.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
          {p.estado}
        </span>
        <a
          href={p.archivo_path} // Normally we'd need a signed URL, but here we assume public or user has access
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 underline hover:text-blue-800"
        >
          Ver comprobante
        </a>
      </div>
    </div>
  )
}
