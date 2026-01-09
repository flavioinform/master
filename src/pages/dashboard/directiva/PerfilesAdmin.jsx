import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { formatRut } from "@/lib/rutUtils";
import * as XLSX from 'xlsx';



const calcularCategoria = (fechaNacimiento) => {
  if (!fechaNacimiento) return "";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }

  if (edad < 18) return "Menor de 18";
  if (edad <= 24) return "18-24";
  if (edad <= 29) return "25-29";
  if (edad <= 34) return "30-34";
  if (edad <= 39) return "35-39";
  if (edad <= 44) return "40-44";
  if (edad <= 49) return "45-49";
  if (edad <= 54) return "50-54";
  if (edad <= 59) return "55-59";
  if (edad <= 64) return "60-64";
  if (edad <= 69) return "65-69";
  if (edad <= 74) return "70-74";
  if (edad <= 79) return "75-79";
  return "80+";
};

export default function PerfilesAdmin() {
  const { user } = useContext(AppContext);

  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [tipo, setTipo] = useState("");
  const [rolFilter, setRolFilter] = useState("todos"); // todos, socio, directiva
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ rut: "", nombre: "", email: "" });
  const [processing, setProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [searchRut, setSearchRut] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setMsg("");

    try {
      // 1️⃣ verificar rol
      const { data: perfil, error: e0 } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (e0) throw e0;
      if (perfil.rol !== "directiva") {
        setRol("socio");
        return;
      }

      setRol("directiva");

      // 2️⃣ cargar perfiles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, nombre_completo, rut, telefono, direccion, comuna, fecha_ingreso, fecha_nacimiento, talla, numero_cuenta, banco, rol, activo, created_at, nacionalidad, estado_civil")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (err) {
      setMsg(err.message || "Error cargando perfiles");
      setTipo("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const toggleActivo = async (id, activo) => {
    const { error } = await supabase
      .from("profiles")
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      setMsg("No se pudo cambiar el estado");
      setTipo("error");
    } else {
      load();
    }
  };

  const toggleRol = async (id, rolActual) => {
    const nuevo = rolActual === "directiva" ? "socio" : "directiva";

    const { error } = await supabase
      .from("profiles")
      .update({ rol: nuevo })
      .eq("id", id);

    if (error) {
      setMsg("No se pudo cambiar el rol");
      setTipo("error");
    } else {
      setMsg(`Rol cambiado a ${nuevo} exitosamente`);
      setTipo("success");
      load();
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserData.rut) return;

    setProcessing(true);
    setMsg("");

    try {
      const cleanRut = newUserData.rut.replace(/[^0-9kK]/g, "").toLowerCase();
      const defaultPassword = cleanRut.length >= 4 ? cleanRut.slice(-4) : "1234";
      const userEmail = newUserData.email || `${cleanRut}@master.cl`;

      const { error } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        rut: newUserData.rut,
        nombre_completo: newUserData.nombre,
        email: userEmail,
        password: defaultPassword,
        rol: "socio",
        activo: true,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setMsg("Usuario creado exitosamente. Contraseña por defecto: últimos 4 dígitos del RUT.");
      setTipo("success");
      setShowCreateModal(false);
      setNewUserData({ rut: "", nombre: "", email: "" });
      load();
    } catch (err) {
      setMsg(err.message || "Error al crear usuario");
      setTipo("error");
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!userToReset || !resetPassword) return;

    setResetting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ password: resetPassword })
        .eq("id", userToReset.id);

      if (error) throw error;

      setMsg(`Contraseña de ${userToReset.nombre_completo || userToReset.rut} restablacida ✅`);
      setTipo("success");
      setShowResetModal(false);
      setResetPassword("");
      setUserToReset(null);
    } catch (err) {
      setMsg(err.message || "Error al restablecer contraseña");
      setTipo("error");
    } finally {
      setResetting(false);
    }
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditForm({
      nombre_completo: user.nombre_completo || "",
      rut: user.rut || "",
      email: user.email || "",
      telefono: user.telefono || "",
      fecha_nacimiento: user.fecha_nacimiento || "",
      direccion: user.direccion || "",
      comuna: user.comuna || "",
      fecha_ingreso: user.fecha_ingreso || "",
      talla: user.talla || "",
      numero_cuenta: user.numero_cuenta || "",
      banco: user.banco || "",
      nacionalidad: user.nacionalidad || "Chilena",
      estado_civil: user.estado_civil || "",
    });
    setShowEditModal(true);
  };

  const [showProfessionModal, setShowProfessionModal] = useState(false);
  const [profesionesList, setProfesionesList] = useState([]);
  const [newProfessionName, setNewProfessionName] = useState("");

  const loadProfesiones = async () => {
    const { data } = await supabase.from("profesiones").select("*").order("nombre");
    if (data) setProfesionesList(data);
  };

  useEffect(() => {
    if (showProfessionModal) loadProfesiones();
  }, [showProfessionModal]);

  const handleAddProfession = async (e) => {
    e.preventDefault();
    if (!newProfessionName.trim()) return;

    const { error } = await supabase.from("profesiones").insert({ nombre: newProfessionName.trim() });
    if (error) {
      alert("Error al crear profesión: " + error.message);
    } else {
      setNewProfessionName("");
      loadProfesiones();
    }
  };

  const handleDeleteProfession = async (id) => {
    if (!window.confirm("¿Seguro de eliminar esta profesión?")) return;
    const { error } = await supabase.from("profesiones").delete().eq("id", id);
    if (!error) loadProfesiones();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!userToEdit) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...editForm,
          perfil_completo: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userToEdit.id);

      if (error) throw error;

      setMsg(`Perfil de ${editForm.nombre_completo || editForm.rut} actualizado ✅`);
      setTipo("success");
      setShowEditModal(false);
      setUserToEdit(null);
      setEditForm({});
      load();
    } catch (err) {
      setMsg(err.message || "Error al actualizar perfil");
      setTipo("error");
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = () => {
    try {
      // Preparar los datos para exportar
      const dataToExport = filteredItems.map(user => ({
        'Nombre Completo': user.nombre_completo || '',
        'RUT': user.rut || '',
        'Email': user.email || '',
        'Teléfono': user.telefono || '',
        'Fecha Nacimiento': user.fecha_nacimiento || '',
        'Dirección': user.direccion || '',
        'Comuna': user.comuna || '',
        'Fecha Ingreso': user.fecha_ingreso || '',
        'Categoría': calcularCategoria(user.fecha_nacimiento),
        'Profesión': user.profesion || '',
        'Nacionalidad': user.nacionalidad || '',
        'Estado Civil': user.estado_civil || '',
        'Talla': user.talla || '',
        'Número Cuenta': user.numero_cuenta || '',
        'Banco': user.banco || '',
        'Rol': user.rol || '',
        'Estado': user.activo ? 'Activo' : 'Bloqueado',
        'Fecha Creación': user.created_at ? new Date(user.created_at).toLocaleDateString('es-CL') : ''
      }));

      // Crear el libro de trabajo
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Socios');

      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 25 }, // Nombre Completo
        { wch: 15 }, // RUT
        { wch: 25 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 15 }, // Fecha Nacimiento
        { wch: 30 }, // Dirección
        { wch: 15 }, // Comuna
        { wch: 15 }, // Fecha Ingreso
        { wch: 15 }, // Categoría
        { wch: 20 }, // Profesión
        { wch: 15 }, // Nacionalidad
        { wch: 15 }, // Estado Civil
        { wch: 8 },  // Talla
        { wch: 18 }, // Número Cuenta
        { wch: 20 }, // Banco
        { wch: 12 }, // Rol
        { wch: 10 }, // Estado
        { wch: 15 }  // Fecha Creación
      ];
      worksheet['!cols'] = columnWidths;

      // Generar el archivo
      const fileName = `Socios_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setMsg(`✅ Archivo exportado: ${fileName}`);
      setTipo("success");
    } catch (error) {
      console.error('Error al exportar:', error);
      setMsg('Error al exportar el archivo Excel');
      setTipo('error');
    }
  };

  const comunasTarapaca = [
    "Iquique",
    "Alto Hospicio",
    "Pozo Almonte",
    "Camiña",
    "Colchane",
    "Huara",
    "Pica"
  ];

  const bancosChile = [
    "Banco de Chile",
    "Banco Estado",
    "Banco Santander",
    "Banco BCI",
    "Banco Scotiabank",
    "Banco Itaú",
    "Banco Security",
    "Banco Falabella",
    "Banco Ripley",
    "Banco Consorcio",
    "Banco Internacional",
    "Banco BICE",
    "Banco BTG Pactual",
    "Coopeuch",
    "Otro"
  ];

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // ... (previous loaders)

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredItems = items.filter(u => {
    const matchesRole = rolFilter === "todos" || u.rol === rolFilter;
    const matchesSearch = !searchRut || (u.rut && u.rut.toLowerCase().includes(searchRut.toLowerCase())) || (u.nombre_completo && u.nombre_completo.toLowerCase().includes(searchRut.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key] || "";
    let bValue = b[sortConfig.key] || "";

    if (sortConfig.key === 'created_at') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div className="p-6">Cargando...</div>;

  if (rol !== "directiva") {
    return (
      <div className="p-6 text-red-700 font-semibold">
        No tienes permisos para ver esta sección.
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Perfiles de usuarios</h1>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
          >
            <span>📊</span> Exportar Excel
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-sky-100 transition-all flex items-center gap-2"
          >
            <span>+</span> Crear Usuario
          </button>
        </div>
      </div>

      {
        msg && (
          <div
            className={`p-3 rounded-lg border text-sm ${tipo === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
              }`}
          >
            {msg}
          </div>
        )
      }

      {/* Search by RUT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
        <label className="text-sm font-semibold text-slate-600 mb-2 block">Buscar por RUT</label>
        <input
          type="text"
          placeholder="Ingresa el RUT para buscar..."
          value={searchRut}
          onChange={(e) => setSearchRut(formatRut(e.target.value))}
          className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          maxLength={12}
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setRolFilter("todos")}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${rolFilter === "todos"
            ? "bg-slate-900 text-white"
            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
        >
          Todos ({items.length})
        </button>
        <button
          onClick={() => setRolFilter("socio")}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${rolFilter === "socio"
            ? "bg-blue-600 text-white"
            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
        >
          Socios ({items.filter(u => u.rol === "socio").length})
        </button>
        <button
          onClick={() => setRolFilter("directiva")}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${rolFilter === "directiva"
            ? "bg-purple-600 text-white"
            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
        >
          Administradores ({items.filter(u => u.rol === "directiva").length})
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('nombre_completo')}>Nombre {sortConfig.key === 'nombre_completo' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('rut')}>RUT {sortConfig.key === 'rut' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Nro. Cuenta</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('banco')}>Banco {sortConfig.key === 'banco' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('rol')}>Rol {sortConfig.key === 'rol' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
              <th className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('activo')}>Estado {sortConfig.key === 'activo' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">
                  <div className="flex flex-col">
                    <span>{u.nombre_completo || "—"}</span>
                    <span className="text-xs text-slate-400">{u.email}</span>
                    {u.profesion && <span className="text-[10px] text-sky-600 font-bold uppercase">{u.profesion}</span>}
                  </div>
                </td>
                <td className="p-3">{u.rut || "—"}</td>
                <td className="p-3">{u.telefono || "—"}</td>
                <td className="p-3">{u.numero_cuenta || "—"}</td>
                <td className="p-3">{u.banco || "—"}</td>
                <td className="p-3">
                  <span className="font-semibold">{u.rol}</span>
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${u.activo
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                      }`}
                  >
                    {u.activo ? "Activo" : "Bloqueado"}
                  </span>
                </td>

                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => toggleRol(u.id, u.rol)}
                    className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-all"
                  >
                    {u.rol === "directiva" ? "Quitar Admin" : "Hacer Admin"}
                  </button>

                  <button
                    onClick={() => {
                      setUserToReset(u);
                      setShowResetModal(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-all"
                  >
                    Pass
                  </button>

                  <button
                    onClick={() => handleEditUser(u)}
                    className="px-3 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-all"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <p className="p-4 text-center text-gray-500">
            {searchRut ? "No se encontraron usuarios con ese RUT." : "No hay usuarios registrados."}
          </p>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <span className="text-sm text-slate-500 font-medium">
          Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredItems.length)} de {filteredItems.length}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            Anterior
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show pages around current page
            let p = currentPage - 2 + i;
            if (currentPage < 3) p = i + 1;
            if (currentPage > totalPages - 2) p = totalPages - 4 + i;

            if (p > 0 && p <= totalPages) {
              return (
                <button
                  key={p}
                  onClick={() => paginate(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold ${currentPage === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {p}
                </button>
              )
            }
            return null;
          })}

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal - Create User */}
      {
        showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 border border-sky-50 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nuevo Usuario</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUT (Obligatorio)</label>
                  <input
                    type="text"
                    placeholder="Ej: 11.222.333-k"
                    value={newUserData.rut}
                    onChange={(e) => setNewUserData({ ...newUserData, rut: formatRut(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl outline-none transition-all font-bold"
                    required
                    maxLength={12}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Nombre del socio"
                    value={newUserData.nombre}
                    onChange={(e) => setNewUserData({ ...newUserData, nombre: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Ej: socio@email.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-sky-500 focus:bg-white rounded-xl outline-none transition-all font-bold"
                  />
                </div>

                <p className="text-[10px] text-slate-400 font-bold leading-tight">
                  * La contraseña inicial serán los últimos 4 dígitos del RUT ingresado. Si no ingresas email, se generará uno automático.
                </p>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-3 bg-sky-600 text-white font-black rounded-xl hover:bg-sky-700 transition-all shadow-xl shadow-sky-100 uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {processing ? "Creando..." : "Crear Usuario"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {/* Modal - Reset Password */}
      {
        showResetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 border border-amber-50 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Reiniciar Contraseña</h3>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setUserToReset(null);
                    setResetPassword("");
                  }}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p className="text-sm text-amber-900 leading-tight">
                  Estás a punto de cambiar la contraseña de:
                  <br />
                  <span className="font-black uppercase">{userToReset?.nombre_completo || userToReset?.rut}</span>
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                  <input
                    type="text"
                    placeholder="Ingresa la nueva contraseña"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-xl outline-none transition-all font-bold"
                    required
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setUserToReset(null);
                      setResetPassword("");
                    }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="flex-1 py-3 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition-all shadow-xl shadow-amber-100 uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {resetting ? "Cambiando..." : "Confirmar Cambio"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {/* Modal - Edit User Profile */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyan-100 animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                <span className="bg-cyan-100 text-cyan-700 w-10 h-10 rounded-xl flex items-center justify-center text-lg">✏️</span>
                Editar Usuario
              </h3>
              <button onClick={() => { setShowEditModal(false); setUserToEdit(null); setEditForm({}); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all text-xl font-bold">✕</button>
            </div>

            <div className="p-8 space-y-8">
              <input type="hidden" value={editForm.id || ""} />
              <form onSubmit={handleSaveEdit} className="space-y-8">
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <h4 className="text-md font-black text-slate-700 uppercase tracking-tight mb-4">Información Personal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label><input type="text" value={editForm.nombre_completo || ""} onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUT</label><input type="text" value={editForm.rut || ""} onChange={(e) => setEditForm({ ...editForm, rut: formatRut(e.target.value) })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" /></div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email || ""}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        onBlur={(e) => {
                          // ✅ Auto-completar @gmail.com si no tiene @
                          let val = e.target.value;
                          if (val && val.trim() !== "" && !val.includes("@")) {
                            setEditForm({ ...editForm, email: val.trim() + "@gmail.com" });
                          }
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold"
                      />
                    </div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label><input type="text" value={editForm.telefono || ""} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Nacimiento</label><input type="date" value={editForm.fecha_nacimiento || ""} min="1920-01-01" max="2020-12-31" onChange={(e) => setEditForm({ ...editForm, fecha_nacimiento: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Talla Polera</label><select value={editForm.talla || ""} onChange={(e) => setEditForm({ ...editForm, talla: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold"><option value="">Selecciona talla</option><option value="XS">XS</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option></select></div>
                    <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label><input type="text" value={editForm.direccion || ""} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comuna</label><select value={editForm.comuna || ""} onChange={(e) => setEditForm({ ...editForm, comuna: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold"><option value="">Selecciona comuna</option>{comunasTarapaca.map(comuna => (<option key={comuna} value={comuna}>{comuna}</option>))}</select></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Ingreso al Club</label><input type="date" value={editForm.fecha_ingreso || ""} min="2008-08-23" max="2025-12-29" onChange={(e) => setEditForm({ ...editForm, fecha_ingreso: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" /></div>

                    {/* Nuevos Campos: Nacionalidad y Estado Civil */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nacionalidad</label>
                      <input type="text" value={editForm.nacionalidad || ""} onChange={(e) => setEditForm({ ...editForm, nacionalidad: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Civil</label>
                      <select value={editForm.estado_civil || ""} onChange={(e) => setEditForm({ ...editForm, estado_civil: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold">
                        <option value="">Selecciona</option>
                        <option value="Soltero/a">Soltero/a</option>
                        <option value="Casado/a">Casado/a</option>
                        <option value="Viudo/a">Viudo/a</option>
                        <option value="Divorciado/a">Divorciado/a</option>
                        <option value="Conviviente Civil">Conviviente Civil</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <h4 className="text-md font-black text-slate-700 uppercase tracking-tight mb-4">Datos Bancarios</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco</label><select value={editForm.banco || ""} onChange={(e) => setEditForm({ ...editForm, banco: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold"><option value="">Selecciona banco</option>{bancosChile.map(banco => (<option key={banco} value={banco}>{banco}</option>))}</select></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Cuenta</label><input type="text" value={editForm.numero_cuenta || ""} onChange={(e) => setEditForm({ ...editForm, numero_cuenta: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-cyan-500 rounded-xl outline-none transition-all font-bold" placeholder="Número de cuenta bancaria" /></div>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setShowEditModal(false); setUserToEdit(null); setEditForm({}); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-cyan-600 text-white font-black rounded-xl hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-100 uppercase tracking-widest text-xs disabled:opacity-50">{saving ? "Guardando..." : "Guardar Cambios"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

