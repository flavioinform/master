import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Navbar from "./components/Navbar";

import ProtectedRoute from "@/components/ProtectedRoute";
import DirectivaRoute from "@/components/DirectivaRoute";
import { SidebarProvider } from "@/components/ui/sidebar";

import Home from "./pages/Home";
import Login from "@/pages/login";
import Registro from "@/pages/registro";
import Dashboard from "@/pages/Dashboard";
import Historial from "./pages/dashboard/Historial";

// Socio
import Vouchers from "@/pages/dashboard/Vouchers";
import Perfil from "@/pages/dashboard/Perfil";

// Convocatorias
import ConvocatoriasList from "@/pages/dashboard/ConvocatoriasList";
import ConvocatoriaInscripcion from "@/pages/dashboard/ConvocatoriaInscripcion";

// Directiva
import VouchersAdmin from "@/pages/dashboard/VouchersAdmin";
import CrearConvocatoria from "@/pages/dashboard/directiva/CrearConvocatoria";
import PerfilesAdmin from "@/pages/dashboard/directiva/PerfilesAdmin";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* ================== PÚBLICAS (SIN SIDEBAR) ================== */}
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <Home />
              </>
            }
          />

          <Route
            path="/login"
            element={
              <>
                <Navbar />
                <Login />
              </>
            }
          />

          <Route
            path="/registro"
            element={
              <>
                <Navbar />
                <Registro />
              </>
            }
          />

          {/* ================== PRIVADAS (CON SIDEBAR) ================== */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <Dashboard />
                </SidebarProvider>
              </ProtectedRoute>
            }
          >
            {/* Inicio dashboard */}
             <Route 
              index 
              element={
                <div className="p-6 bg-white rounded-2xl shadow">
                  <h2 className="text-xl font-semibold">Bienvenido a Club Master Iquique</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Aquí puedes gestionar tu perfil, vouchers, y las convocatorias. 
                    Accede a todas las funcionalidades de tu cuenta y más.
                  </p>
                  {/* Agrega cualquier otro contenido aquí */}
                  <div className="mt-6">
                    <p className="font-medium">Explora las siguientes secciones:</p>
                    <ul className="list-disc pl-6">
                      <li>Gestión de vouchers</li>
                      <li>Perfil y datos </li>
                      <li>Historial de inscripciones</li>
                    </ul>
                  </div>
                </div>
              } 
            />
            {/* Socio */}
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="historial" element={<Historial />} />

            {/* Convocatorias */}
            <Route path="convocatorias" element={<ConvocatoriasList />} />
            <Route path="convocatorias/:id" element={<ConvocatoriaInscripcion />} />

            {/* Directiva */}
            <Route
              path="directiva/vouchers"
              element={
                <DirectivaRoute>
                  <VouchersAdmin />
                </DirectivaRoute>
              }
            />

            <Route
              path="directiva/CrearConvocatoria"
              element={
                <DirectivaRoute>
                  <CrearConvocatoria />
                </DirectivaRoute>
              }
            />

            {/* ✅ AHORA SÍ FUNCIONA CON /dashboard/directiva/perfiles */}
            <Route
              path="directiva/perfiles"
              element={
                <DirectivaRoute>
                  <PerfilesAdmin />
                </DirectivaRoute>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<div className="p-10">Ruta no encontrada</div>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
