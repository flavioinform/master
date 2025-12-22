import React from 'react';
import { Link } from 'react-router-dom';

const Mision = () => {
    return (
        <div className="bg-white min-h-screen">
            {/* Hero Section - Consistent with Nosotros */}
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

            {/* Ultra-Minimalist Mission Content */}
            <div className="container mx-auto px-6 py-24 flex items-center justify-center">
                <div className="max-w-4xl text-center animate-in fade-in duration-1000 delay-300">
                    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.6em] mb-12">Nuestra Misión</h2>

                    <p className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.2] tracking-tighter">
                        Liderar el desarrollo de la natación máster en Iquique, proporcionando excelencia técnica y calidez humana para representar con orgullo nuestra <span className="text-cyan-500 font-black">Tierra de Campeones</span>.
                    </p>

                    <div className="mt-20 h-px w-16 bg-slate-100 mx-auto"></div>
                    <p className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Master Iquique • 2008</p>
                </div>
            </div>

            {/* Closing CTA - Consistent with Nosotros */}
            <div className="container mx-auto px-6 pb-24">
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
        </div>
    );
};

export default Mision;
