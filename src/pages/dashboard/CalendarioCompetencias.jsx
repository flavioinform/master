import { useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { AppContext } from "@/context/AppContext";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function CalendarioCompetencias() {
    const { user } = useContext(AppContext);
    const [competitions, setCompetitions] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCompetitions = async () => {
            if (!user?.id) return;

            try {
                const { data: comps } = await supabase
                    .from("competitions")
                    .select("id, name, organizer, start_date, end_date, status")
                    .in("status", ["open", "closed"]);

                setCompetitions(comps || []);
            } catch (error) {
                console.error("Error loading competitions:", error);
            } finally {
                setLoading(false);
            }
        };

        loadCompetitions();
    }, [user?.id]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const getCompetitionsForDate = (date) => {
        if (!date) return [];

        return competitions.filter(comp => {
            const startDate = new Date(comp.start_date);
            const endDate = new Date(comp.end_date);
            const checkDate = new Date(date);

            checkDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            return checkDate >= startDate && checkDate <= endDate;
        });
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 rounded-lg p-8 text-white border border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-8 w-8 text-white" />
                    <h1 className="text-3xl font-bold">Calendario de Competencias</h1>
                </div>
                <p className="text-slate-300">Visualiza todas las competencias programadas</p>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                        {monthName}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevMonth}
                            className="p-2 hover:bg-slate-100 rounded transition-colors border border-slate-200"
                        >
                            <ChevronLeft className="h-5 w-5 text-slate-700" />
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-2 hover:bg-slate-100 rounded transition-colors border border-slate-200"
                        >
                            <ChevronRight className="h-5 w-5 text-slate-700" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                        {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => (
                            <div key={day} className="p-3 text-center text-xs font-bold text-slate-700 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                        {days.map((date, index) => {
                            const dayCompetitions = date ? getCompetitionsForDate(date) : [];
                            const isToday = date && date.toDateString() === new Date().toDateString();

                            return (
                                <div
                                    key={index}
                                    className={`min-h-[120px] p-3 border-b border-r border-slate-200 ${!date ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'
                                        } ${isToday ? 'bg-blue-50' : ''}`}
                                >
                                    {date && (
                                        <>
                                            <div className={`text-base font-bold mb-2 ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                                                {date.getDate()}
                                            </div>
                                            <div className="space-y-1">
                                                {dayCompetitions.map(comp => (
                                                    <Link
                                                        key={comp.id}
                                                        to={`/dashboard/convocatorias/${comp.id}`}
                                                        className={`block text-xs p-2 rounded ${comp.status === 'open'
                                                                ? 'bg-slate-800 text-white hover:bg-slate-700'
                                                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                            }`}
                                                        title={`${comp.name} - ${comp.organizer}`}
                                                    >
                                                        <div className="font-bold truncate">{comp.name}</div>
                                                        <div className="text-[10px] opacity-75 truncate">{comp.organizer}</div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-800 rounded"></div>
                        <span className="text-slate-600 font-semibold">Inscripción Abierta</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-200 rounded"></div>
                        <span className="text-slate-600 font-semibold">Inscripción Cerrada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-50 border-2 border-blue-200 rounded"></div>
                        <span className="text-slate-600 font-semibold">Día Actual</span>
                    </div>
                </div>
            </div>

            {/* Competition List */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide">
                    Todas las Competencias
                </h2>

                {competitions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No hay competencias registradas</p>
                ) : (
                    <div className="space-y-3">
                        {competitions
                            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                            .map(comp => {
                                const startDate = new Date(comp.start_date);
                                const endDate = new Date(comp.end_date);
                                const isOpen = comp.status === 'open';

                                return (
                                    <Link
                                        key={comp.id}
                                        to={`/dashboard/convocatorias/${comp.id}`}
                                        className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 mb-1">{comp.name}</h3>
                                                <p className="text-sm text-slate-600 mb-2">{comp.organizer}</p>
                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    <span className="font-semibold">
                                                        📅 {startDate.toLocaleDateString('es-ES')} - {endDate.toLocaleDateString('es-ES')}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded font-bold uppercase ${isOpen ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                        {isOpen ? 'Abierta' : 'Cerrada'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-slate-400">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );
}
