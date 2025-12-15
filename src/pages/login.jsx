import { useState, useContext } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Login() {
  const [correo, setCorreo] = useState("");
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correo,
        password: password,
      });

      if (error) {
        setMensaje("Datos incorrectos.");
        setTipo("error");
        return;
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
         nombre: data.user.user_metadata?.full_name || "",
      };

      login(userData);

      setMensaje(`Bienvenido/a ${data.user.email}`);
      setTipo("success");

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setMensaje("Error al iniciar sesión. Revisa consola y tu conexión.");
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
            <p className="text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                required
                autoComplete="current-password"
              />
            </div>

            {mensaje && (
              <div
                className={`p-4 rounded-lg border ${
                  tipo === "error"
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
              className="w-full bg-blue-300  hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
            <span className="text-blue-300">
              No tienes cuenta aun. Registrate <a href="/registro" className="text-blue-800">aqui</a>
            </span>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
