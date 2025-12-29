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
import Nosotros from "./pages/Nosotros";
import Mision from "./pages/Mision";

// Socio
import Vouchers from "@/pages/dashboard/Vouchers";
import Perfil from "@/pages/dashboard/Perfil";
import MisCuotas from "@/pages/dashboard/MisCuotas";

// Convocatorias
import ConvocatoriasList from "@/pages/dashboard/ConvocatoriasList";
import ConvocatoriaInscripcion from "@/pages/dashboard/ConvocatoriaInscripcion";
import CompetitionHistory from "@/pages/dashboard/CompetitionHistory";

// Directiva
import VouchersAdmin from "@/pages/dashboard/VouchersAdmin";
import PagosMensuales from "@/pages/dashboard/directiva/PagosMensuales";
import CrearConvocatoria from "@/pages/dashboard/directiva/CrearConvocatoria";
import CompetitionManager from "@/pages/dashboard/directiva/CompetitionManager";
import PerfilesAdmin from "@/pages/dashboard/directiva/PerfilesAdmin";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import CalendarioCompetencias from "@/pages/dashboard/CalendarioCompetencias";
import CambioPassword from "@/pages/dashboard/CambioPassword";

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

          {/* <Route
            path="/registro"
            element={
              <>
                <Navbar />
                <Registro />
              </>
            }
          /> */}

          <Route
            path="/nosotros"
            element={
              <>
                <Navbar />
                <Nosotros />
              </>
            }
          />

          <Route
            path="/mision"
            element={
              <>
                <Navbar />
                <Mision />
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
            <Route index element={<DashboardHome />} />
            {/* Socio */}
            <Route path="mis-cuotas" element={<MisCuotas />} />
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="historial" element={<Historial />} />
            <Route path="cambio-password" element={<CambioPassword />} />

            {/* Convocatorias */}
            <Route path="convocatorias" element={<ConvocatoriasList />} />
            <Route path="convocatorias/:id" element={<ConvocatoriaInscripcion />} />

            {/* Calendario */}
            <Route path="calendario" element={<CalendarioCompetencias />} />

            {/* Historial de Competencias */}
            <Route path="historial-competencias" element={<CompetitionHistory />} />

            {/* Directiva */}
            <Route
              path="directiva/pagos-mensuales"
              element={
                <DirectivaRoute>
                  <PagosMensuales />
                </DirectivaRoute>
              }
            />

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

            <Route
              path="directiva/competencia/:id"
              element={
                <DirectivaRoute>
                  <CompetitionManager />
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
