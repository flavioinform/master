import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState(""); // "error" | "success"
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AppContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");
    setCargando(true);

    // ✅ Validaciones
    if (password.length < 6) {
      setMensaje("La contraseña debe tener al menos 6 caracteres.");
      setTipo("error");
      setCargando(false);
      return;
    }

    if (password !== password2) {
      setMensaje("Las contraseñas no coinciden.");
      setTipo("error");
      setCargando(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password,
        options: {
          data: { full_name: nombre },
        },
      });

      if (error) throw error;

      // 🔸 OJO: en muchos casos Supabase requiere confirmación por correo.
      // Si quieres igual guardar algo en context:
      if (data?.user) {
        login({ id: data.user.id, email: data.user.email, nombre });
      }

      setMensaje("Registro exitoso. Revisa tu correo si te pide confirmación.");
      setTipo("success");

      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setMensaje(err.message || "Error al registrar.");
      setTipo("error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Registro</h1>

        {mensaje && (
          <div
            className={`mb-4 text-sm text-center p-3 rounded-lg border ${
              tipo === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />

          <input
            type="email"
            placeholder="Correo electrónico"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="w-full p-3 border rounded-lg"
            autoComplete="email"
            required
          />

          {/* ✅ Password con Ver/Ocultar */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg pr-20"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-9 px-3 text-sm text-gray-600 hover:text-gray-900 rounded-md"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirmar contraseña"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full p-3 border rounded-lg"
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-300 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? "Registrando..." : "Registrarse"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Registro;
