import { useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { Trophy, TrendingUp, Medal, Target, Users, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardHome() {
    const { user } = useContext(AppContext);
    const [stats, setStats] = useState({
        pagosPendientes: 0,
        competenciasActivas: 0,
        inscripciones: 0,
        perfilCompleto: false
    });
    const [loading, setLoading] = useState(true);
    const [nombreCompleto, setNombreCompleto] = useState("");

    useEffect(() => {
        const loadStats = async () => {
            if (!user?.id) return;

            try {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("nombre_completo, perfil_completo")
                    .eq("id", user.id)
                    .single();

                setNombreCompleto(profile?.nombre_completo || "");

                const { data: vouchers } = await supabase
                    .from("vouchers")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("estado", "pendiente");

                const { data: competitions } = await supabase
                    .from("competitions")
                    .select("id")
                    .eq("status", "open");

                const { data: enrollments } = await supabase
                    .from("competition_enrollments")
                    .select("id")
                    .eq("user_id", user.id);

                setStats({
                    pagosPendientes: vouchers?.length || 0,
                    competenciasActivas: competitions?.length || 0,
                    inscripciones: enrollments?.length || 0,
                    perfilCompleto: profile?.perfil_completo || false
                });
            } catch (error) {
                console.error("Error loading stats:", error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [user?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 font-sans pb-20 animate-in fade-in duration-700">

            {/* Header - Clean Modern */}
            <div className="bg-blue-400 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">Panel de Control</p>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tight leading-none">
                        ¡Hola, {nombreCompleto.split(' ')[0] || "Atleta"}!
                    </h1>
                    <p className="text-lg md:text-xl font-medium text-slate-400 max-w-xl text-white">
                        Bienvenido de nuevo. Aquí tienes un resumen de tu estado actual y próximas actividades.
                    </p>
                </div>
            </div>

            {/* Stats Grid - Clean Modern */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Pagos */}
                <Link to="/dashboard/vouchers" className="group">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all h-full flex flex-col justify-between group-active:scale-95">
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <span className="text-4xl font-black text-slate-900">{stats.pagosPendientes}</span>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pagos</h3>
                            <p className="text-lg font-black text-slate-900">Por Revisar</p>
                        </div>
                    </div>
                </Link>

                {/* Competencias */}
                <Link to="/dashboard/convocatorias" className="group">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all h-full flex flex-col justify-between group-active:scale-95">
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <span className="text-4xl font-black text-slate-900">{stats.competenciasActivas}</span>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Eventos</h3>
                            <p className="text-lg font-black text-slate-900">Competencias</p>
                        </div>
                    </div>
                </Link>

                {/* Inscripciones */}
                <Link to="/dashboard/convocatorias" className="group">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all h-full flex flex-col justify-between group-active:scale-95">
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <Medal className="h-6 w-6" />
                            </div>
                            <span className="text-4xl font-black text-slate-900">{stats.inscripciones}</span>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actividad</h3>
                            <p className="text-lg font-black text-slate-900">Inscripciones</p>
                        </div>
                    </div>
                </Link>

                {/* Perfil */}
                <Link to="/dashboard/perfil" className="group">
                    <div className={`rounded-3xl p-6 border transition-all h-full flex flex-col justify-between group-active:scale-95 shadow-sm hover:shadow-md ${stats.perfilCompleto
                        ? 'bg-white border-slate-100 hover:border-blue-100'
                        : 'bg-rose-50 border-rose-100 animate-pulse'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <div className={`p-3 rounded-2xl text-white ${stats.perfilCompleto ? 'bg-blue-600' : 'bg-rose-600'}`}>
                                <Target className="h-6 w-6" />
                            </div>
                            <span className={`text-4xl font-black ${stats.perfilCompleto ? 'text-slate-900' : 'text-rose-900'}`}>
                                {stats.perfilCompleto ? '✓' : '!'}
                            </span>
                        </div>
                        <div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 ${stats.perfilCompleto ? 'text-slate-400' : 'text-rose-400'}`}>Estado</h3>
                            <p className={`text-lg font-black ${stats.perfilCompleto ? 'text-slate-900' : 'text-rose-700'}`}>
                                {stats.perfilCompleto ? 'Perfil Completo' : 'Completar Perfil'}
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Quick Actions - Clean Modern */}
                <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            Acciones Rápidas
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link to="/dashboard/vouchers" className="bg-white border border-slate-100 p-6 rounded-2xl hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/5 transition-all flex flex-col gap-4 group active:scale-95">
                            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase leading-none mb-1">Pagos</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subir Comprobante</p>
                            </div>
                        </Link>

                        <Link to="/dashboard/convocatorias" className="bg-white border border-slate-100 p-6 rounded-2xl hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/5 transition-all flex flex-col gap-4 group active:scale-95">
                            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase leading-none mb-1">Eventos</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inscripciones</p>
                            </div>
                        </Link>

                        <Link to="/dashboard/perfil" className="bg-white border border-slate-100 p-6 rounded-2xl hover:border-amber-600 hover:shadow-lg hover:shadow-amber-500/5 transition-all flex flex-col gap-4 group active:scale-95">
                            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl w-fit group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase leading-none mb-1">Mi Perfil</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Editar Mis Datos</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Info Card - Clean Modern */}
                <div className="lg:col-span-4 bg-blue-400 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                    <div className="relative z-10 space-y-4">
                        <Trophy className="h-12 w-12 text-blue-200 mb-2" />
                        <h3 className="text-2xl font-black uppercase tracking-tight">Próximas metas</h3>
                        <p className="text-blue-100 font-medium leading-relaxed">
                            Mantén tu perfil actualizado y tus pagos al día para no perderte ninguna competencia importante.
                        </p>
                    </div>
                </div>
            </div>

            {/* Alert Banner - Clean Modern */}
            {!stats.perfilCompleto && (
                <div className="bg-rose-50 border border-rose-200 rounded-[2.5rem] p-8 md:p-10 text-rose-900 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <AlertCircle className="h-32 w-32" />
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
                            <AlertCircle className="h-10 w-10 text-rose-600" />
                        </div>
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Perfil Incompleto</h3>
                            <p className="text-sm md:text-lg font-medium opacity-80 max-w-xl">
                                Es obligatorio completar todos tus datos personales y bancarios para poder participar en los eventos oficiales.
                            </p>
                        </div>
                        <Link
                            to="/dashboard/perfil"
                            className="bg-rose-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95 uppercase whitespace-nowrap"
                        >
                            Completar Ahora
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
