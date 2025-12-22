import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

export default function CrearConvocatoria() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [clubs, setClubs] = useState([]);
  const [newClub, setNewClub] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    organizer: "",
    start_date: "",
    end_date: "",
    status: "draft", // draft, open, closed, finished
    image_url: "",
  });

  const loadCompetitions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) setMsg("Error cargando competencias: " + error.message);
    else setCompetitions(data || []);
    setLoading(false);
  };

  const loadClubs = async () => {
    const { data } = await supabase.from("clubs").select("*").order("name");
    setClubs(data || []);
  };

  useEffect(() => {
    loadCompetitions();
    loadClubs();
  }, []);

  const openModal = (comp = null) => {
    if (comp) {
      setEditing(comp.id);
      setFormData({
        name: comp.name,
        organizer: comp.organizer,
        start_date: comp.start_date,
        end_date: comp.end_date,
        status: comp.status,
        image_url: comp.image_url || "",
      });
    } else {
      setEditing(null);
      setFormData({
        name: "",
        organizer: "",
        start_date: "",
        end_date: "",
        status: "draft",
        image_url: "",
      });
    }
    setShowModal(true);
  };

  const handleSaveClub = async (e) => {
    e.preventDefault();
    if (!newClub.trim()) return;

    const { error } = await supabase.from("clubs").insert({ name: newClub.trim() });
    if (error) {
      alert("Error creando club: " + error.message);
    } else {
      setNewClub("");
      setShowClubModal(false);
      loadClubs();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg("");

    if (editing) {
      const { error } = await supabase
        .from("competitions")
        .update(formData)
        .eq("id", editing);

      if (error) setMsg("Error actualizando: " + error.message);
      else {
        setShowModal(false);
        loadCompetitions();
      }
    } else {
      const { error } = await supabase
        .from("competitions")
        .insert(formData);

      if (error) setMsg("Error creando: " + error.message);
      else {
        setShowModal(false);
        loadCompetitions();
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar esta competencia? Se borrarán todas las etapas y pruebas.")) return;

    const { error } = await supabase.from("competitions").delete().eq("id", id);
    if (error) setMsg("Error eliminando: " + error.message);
    else loadCompetitions();
  };

  if (loading) return <div className="p-6">Cargando competencias...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Convocatorias</h1>
            <p className="text-sm text-gray-500">Crea y administra las competencias del club.</p>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow"
          >
            + Nueva Competencia
          </button>
        </div>

        {msg && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{msg}</div>}

        {/* List */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {competitions.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No hay competencias registradas. Crea la primera.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Organizador</th>
                  <th className="p-4">Fechas</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {competitions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4 text-gray-600">{c.organizer}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                        ${c.status === 'open' ? 'bg-green-100 text-green-700' :
                          c.status === 'draft' ? 'bg-gray-200 text-gray-700' :
                            'bg-red-100 text-red-700'}`
                      }>
                        {c.status === 'draft' ? 'Borrador' : c.status === 'open' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link
                        to={`/dashboard/directiva/competencia/${c.id}`}
                        className="text-blue-600 hover:underline font-medium text-sm"
                      >
                        Administrar
                      </Link>
                      <button onClick={() => openModal(c)} className="text-gray-500 hover:text-gray-800 text-sm">Editar</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? "Editar Competencia" : "Nueva Competencia"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700">Nombre del Evento</label>
                <input required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-gray-700">Club Organizador</label>
                  <button
                    type="button"
                    onClick={() => setShowClubModal(true)}
                    className="text-xs text-blue-600 hover:underline font-bold"
                  >
                    + Gestionar Clubes
                  </button>
                </div>
                <select
                  required
                  className="w-full border rounded p-2"
                  value={formData.organizer}
                  onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                >
                  <option value="">Seleccione un club...</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700">Fecha Inicio</label>
                  <input required type="date" className="w-full border rounded p-2" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700">Fecha Término</label>
                  <input required type="date" className="w-full border rounded p-2" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700">Estado</label>
                <select className="w-full border rounded p-2" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="draft">Borrador (Oculta)</option>
                  <option value="open">Abierta (Visible)</option>
                  <option value="closed">Cerrada (Visible, no inscripciones)</option>
                  <option value="finished">Finalizada</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Club Management Modal */}
      {showClubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Gestionar Clubes</h2>
              <button onClick={() => setShowClubModal(false)} className="text-gray-500 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSaveClub} className="flex gap-2 mb-6">
              <input
                className="flex-1 border-2 border-slate-100 rounded-xl p-2.5 outline-none focus:border-blue-500 transition-all font-bold"
                placeholder="Nombre del club..."
                value={newClub}
                onChange={e => setNewClub(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                Añadir
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 bg-slate-50/30">
              {clubs.length === 0 ? (
                <p className="p-8 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No hay clubes</p>
              ) : (
                clubs.map(c => (
                  <div key={c.id} className="p-4 flex justify-between items-center hover:bg-white transition-colors">
                    <span className="font-black text-slate-700 uppercase text-xs tracking-widest">{c.name}</span>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Eliminar club "${c.name}"?`)) {
                          const { error } = await supabase.from("clubs").delete().eq("id", c.id);
                          if (error) alert("Error: " + error.message);
                          else loadClubs();
                        }
                      }}
                      className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest"
                    >
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
