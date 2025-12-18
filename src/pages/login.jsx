import { useState, useContext } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Login() {
  function cleanRut(rut) {
    return rut.replace(/[^0-9kK]/g, "").toLowerCase();
  }

  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AppContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");
    setCargando(true);

    const rutLimpio = cleanRut(rut);
    if (!rutLimpio) {
      setMensaje("Por favor ingresa un RUT válido.");
      setTipo("error");
      setCargando(false);
      return;
    }

    // Custom Auth: Query Profile Table directly
    try {
      // Search for matches on 'rut' column. 
      // We check if it matches the Clean version OR the Original version the user typed.
      const matchQuery = `rut.eq.${rutLimpio},rut.eq.${rut}`;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(matchQuery)
        .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple match (unlikely) or none.

      if (error || !data) {
        setMensaje("Usuario no encontrado.");
        setTipo("error");
        setCargando(false);
        return;
      }

      // Check Password
      // Note: In a real app we would hash this. Here we compare plain text as requested.
      if (data.password !== password) {
        setMensaje("Contraseña incorrecta.");
        setTipo("error");
        setCargando(false);
        return;
      }

      // Login Success
      const userData = {
        id: data.id,
        email: data.email,
        nombre: data.nombre_completo,
        rol: data.rol
      };

      login(userData);

      setMensaje("Bienvenido/a");
      setTipo("success");

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión.");
      setTipo("error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Iniciar sesión</h1>
            <p className="text-gray-500">Ingresa tu RUT y contraseña (últimos 4 dígitos)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RUT</label>
              <input
                type="text"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="Ej: 11.222.333-k"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Últimos 4 dígitos de tu RUT"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                required
                autoComplete="current-password"
              />
            </div>

            {mensaje && (
              <div
                className={`p-4 rounded-lg border ${tipo === "error"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-700"
                  }`}
              >
                <p className="font-medium">{mensaje}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 transition-colors"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
            <span className="text-center block mt-4 text-sm text-gray-600">
              ¿No tienes cuenta? <a href="/registro" className="text-blue-600 font-bold hover:underline">Regístrate aquí</a>
            </span>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
