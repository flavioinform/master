import React from 'react';
import { Waves } from 'lucide-react';
import { Link } from 'react-router-dom';


// Import images from assets
import dir1 from '@/assets/directiva/WhatsApp Image 2025-12-22 at 1.36.21 AM (1).jpeg';
import dir2 from '@/assets/directiva/WhatsApp Image 2025-12-22 at 1.36.21 AM.jpeg';
import dir3 from '@/assets/directiva/WhatsApp Image 2025-12-22 at 1.36.22 AM.jpeg';
import dir4 from '@/assets/directiva/WhatsApp Image 2025-12-22 at 1.36.29 AM.jpeg';
import dir5 from '@/assets/directiva/grimanesa.png';
const Nosotros = () => {
    const directiva = [
        { nombre: "Mirtha Mera", cargo: "Presidente", foto: dir2 },
        { nombre: "Amalia Pinto", cargo: "Secretario", foto: dir1 },
        { nombre: "Gina Vargas", cargo: "Tesorero", foto: dir3 },
        { nombre: "Gisselle Chaparro", cargo: "Director", foto: dir4 },
        { nombre: "Grimanesa Peña", cargo: "Director", foto: dir5 },

    ];

    const valores = [
        {
            title: "Inclusión",
            desc: "Abiertos a nadadores de todos los niveles que busquen mejorar y compartir en un ambiente de respeto.",
            accent: "border-blue-200 bg-blue-50/30"
        },
        {
            title: "Perseverancia",
            desc: "Fomentamos la constancia como motor fundamental de la formación deportiva y personal.",
            accent: "border-cyan-200 bg-cyan-50/30"
        },
        {
            title: "Compañerismo",
            desc: "El espíritu deportivo y el apoyo mutuo son la base de nuestra convivencia diaria en el agua.",
            accent: "border-slate-200 bg-slate-50/30"
        }
    ];

    return (
        <div className="bg-white min-h-screen overflow-x-hidden">
            {/* Hero Section with Parallax-like effect */}
            <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-slate-50 transition-transform duration-1000">
                    <img
                        src="https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80"
                        alt="Piscina Iquique"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white"></div>
                </div>

                <div className="relative z-10 text-center px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                        Desde 2008
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-none">
                        Club Máster <br />
                        <span className="text-cyan-500">Iquique</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium tracking-tight">
                        Excelencia en natación competitiva y formación deportiva regional.
                    </p>
                </div>

                {/* Decorative floating line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
            </section>

            <div className="container mx-auto px-6 pb-24">
                {/* History Block - Clean & Minimal */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-32">
                    <div className="animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
                        <div className="w-12 h-1 bg-blue-500 mb-8"></div>
                        <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight uppercase leading-[0.9]">
                            Trayectoria y <br />
                            <span className="text-cyan-500 text-3xl">Compromiso Deportivo</span>
                        </h2>
                        <div className="space-y-6 text-slate-500 text-lg font-medium leading-relaxed">
                            <p>
                                El 23 de agosto de 2008 nace en Iquique un espacio para la natación de alto rendimiento enfocado en la categoría Máster. Nuestra visión fue clara: crear una comunidad que uniera la técnica competitiva con el bienestar integral.
                            </p>
                            <p>
                                A lo largo de los años, hemos consolidado una comunidad de aproximadamente 80 socios activos, participando en los eventos más importantes de Chile y promoviendo la vida sana a través del deporte acuático.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-1000 delay-500">
                        <div className="p-1 w-full h-full bg-slate-100 rounded-[2rem] overflow-hidden">
                            <div className="bg-white w-full h-full rounded-[1.8rem] p-8 flex flex-col justify-center border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-500 group">
                                <span className="text-4xl font-black text-blue-600 mb-1 group-hover:scale-110 transition-transform inline-block">2008</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Año de Fundación</span>
                            </div>
                        </div>
                        <div className="p-1 w-full h-full bg-cyan-50 rounded-[2rem] overflow-hidden mt-8 md:mt-12">
                            <div className="bg-white w-full h-full rounded-[1.8rem] p-8 flex flex-col justify-center border border-cyan-100 shadow-sm hover:shadow-xl hover:border-cyan-200 transition-all duration-500 group">
                                <span className="text-4xl font-black text-cyan-500 mb-1 group-hover:scale-110 transition-transform inline-block">+80</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Socios Activos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Values Section - No Icons, High Contrast Typography */}
                <section className="mb-32">
                    <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Nuestra Esencia</h2>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">Valores que nos impulsan</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {valores.map((val, idx) => (
                            <div key={idx} className="relative group p-10 rounded-[2.5rem] border border-slate-100 bg-white shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-700">
                                <div className="absolute top-0 right-10 -mt-4 bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full opacity-0 group-hover:opacity-100 group-hover:-mt-6 transition-all duration-500 tracking-widest">
                                    VALOR {idx + 1}
                                </div>
                                <h4 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">{val.title}</h4>
                                <p className="text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-6 group-hover:border-blue-400 transition-colors duration-500">
                                    "{val.desc}"
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Directiva Section - Modern & Clean Transitions */}
                <section className="mb-32 animate-in fade-in duration-1000">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="max-w-xl">
                            <h2 className="text-sm font-black text-cyan-600 uppercase tracking-[0.4em] mb-4">Liderazgo</h2>
                            <h3 className="text-4xl font-black text-slate-900 tracking-tight">Nuestra Directiva</h3>
                        </div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-xs text-right hidden md:block">
                            Compromiso institucional para el crecimiento del club.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {directiva.map((miembro, idx) => (
                            <div key={idx} className="group relative transition-all duration-700">
                                <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group-hover:shadow-2xl group-hover:border-blue-200 transition-all duration-700">
                                    <img
                                        src={miembro.foto}
                                        alt={miembro.nombre}
                                        className="w-full h-full object-cover transition-all duration-1000 grayscale group-hover:grayscale-0 group-hover:scale-105"
                                    />
                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700"></div>

                                    <div className="absolute inset-x-0 bottom-0 p-8 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1">{miembro.cargo}</p>
                                        <h4 className="text-lg font-black tracking-tight">{miembro.nombre}</h4>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Closing - Subtle & Sophisticated */}
                <section className="bg-slate-50 border border-slate-100 rounded-[3rem] p-16 md:p-32 text-center relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>

                    <div className="relative z-10 animate-in fade-in zoom-in-95 duration-1000">
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-10 tracking-tighter uppercase">
                            Ven al <br />
                            <span className="text-blue-600">Agua</span>
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto text-lg font-bold mb-12 opacity-80 uppercase tracking-widest">
                            Seguimos potenciando la comunidad deportiva de Iquique.
                        </p>
                        <Link
                            to="/#contacto"
                            className="relative px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-[0.3em] overflow-hidden group/btn hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 hover:-translate-y-1 inline-block"
                        >
                            <span className="relative z-10 text-xs">Unirse Ahora</span>
                            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                        </Link>
                    </div>
                </section>
            </div>

            {/* Custom Animations styles injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-from-bottom { from { transform: translateY(2rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 1s ease-out forwards; }
                .animate-slide-up { animation: slide-in-from-bottom 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default Nosotros;
