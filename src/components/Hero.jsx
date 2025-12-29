import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

import heroImg1 from "../assets/heroImg/Screenshot 2025-12-17 205749.png";
import heroImg2 from "../assets/heroImg/Screenshot 2025-12-17 205926.png";
import heroImg3 from "../assets/heroImg/Screenshot 2025-12-17 205941.png";
import heroImg4 from "../assets/heroImg/Screenshot 2025-12-17 210839.png";

function Hero() {
  const slides = [
    {
      image: heroImg1,
      title: "Club Deportivo Master Iquique",
      subtitle: "Excelencia en Natación Competitiva y Formación Deportiva"
    },
    {
      image: heroImg2,
      title: "Trayectoria y Disciplina",
      subtitle: "Institución dedicada al alto rendimiento regional"
    },
    {
      image: heroImg3,
      title: "Compromiso con el Deporte",
      subtitle: "Representación oficial en torneos nacionales e internacionales"
    },
    {
      image: heroImg4,
      title: "Nuestra Identidad",
      subtitle: "Pasión por el agua, orgullo de nuestra ciudad"
    }
  ];

  return (
    <div className="w-full bg-white relative overflow-hidden">
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[600px] md:h-[550px] lg:h-[650px] flex items-center justify-center">

                {/* Background Design with Intense Professional Sky Blue */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-sky-100 to-sky-200 -z-10">
                  {/* Background pattern - subtle water */}
                  <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/water.png')]"></div>
                </div>

                {/* Decorative Accents */}
                <div className="hidden md:block absolute top-0 right-0 w-1/3 h-full bg-sky-500/10 -skew-x-12 transform translate-x-1/2"></div>
                <div className="hidden md:block absolute top-1/2 left-0 w-64 h-64 bg-sky-400/20 blur-[120px] rounded-full -translate-y-1/2"></div>

                {/* Main Content Container */}
                <div className="container mx-auto h-full flex flex-col-reverse lg:flex-row items-center justify-between gap-6 md:gap-12 px-4 md:px-12 lg:px-20 py-8 md:py-12 lg:py-0 relative z-10">

                  {/* Left: Typography */}
                  <div className="flex-1 text-center lg:text-left w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-sky-500 text-white rounded-lg mb-3 md:mb-6 shadow-md shadow-sky-200">
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Desde 23 Ago 2008</span>
                    </div>
                    <h1 className="text-2xl md:text-5xl lg:text-7xl font-black text-slate-900 mb-3 md:mb-6 leading-tight drop-shadow-sm">
                      {slide.title}
                    </h1>
                    <p className="text-sm md:text-2xl text-slate-600 mb-4 md:mb-10 max-w-xl font-bold leading-relaxed mx-auto lg:mx-0">
                      {slide.subtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 md:gap-5 justify-center lg:justify-start">
                      <a
                        href="/login"
                        className="px-6 py-3 md:px-10 md:py-4 bg-sky-600 text-white font-black rounded-xl hover:bg-sky-700 transition-all shadow-xl shadow-sky-200 text-xs md:text-sm tracking-widest uppercase hover:scale-105 active:scale-95"
                      >
                        Portal Socios
                      </a>
                      <a
                        href="#contacto"
                        className="px-6 py-3 md:px-10 md:py-4 bg-white border-2 border-sky-500 text-sky-600 font-black rounded-xl hover:bg-sky-50 transition-all text-xs md:text-sm tracking-widest uppercase shadow-sm hover:scale-105 active:scale-95"
                      >
                        Inscríbete
                      </a>
                    </div>
                  </div>

                  {/* Right: Natural Image Frame (No thick borders) */}
                  <div className="flex-1 w-full h-[350px] md:h-full md:max-h-[400px] lg:max-h-[80%] flex items-center justify-center lg:justify-end">
                    <div className="relative group p-1 w-full h-full">
                      {/* Subtle shadow glow */}
                      <div className="absolute inset-0 bg-sky-400/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] bg-white p-0.5 md:p-1 h-full">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover md:object-contain rounded-[1rem] md:rounded-[1.25rem] transition-transform duration-700 group-hover:scale-105"
                          loading="eager"
                        />
                      </div>

                      {/* Floating Foundation Badge - Hidden on small mobile */}
                      <div className="hidden sm:flex absolute -top-4 -right-4 bg-white border border-sky-100 shadow-xl px-3 py-1.5 md:px-4 md:py-2 rounded-xl items-center gap-2 group-hover:-translate-y-2 transition-transform duration-500">
                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                        <span className="text-sky-900 font-black text-[10px] md:text-xs uppercase tracking-widest">Est. 2008</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Cleaner Wave Separator */}
                <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none opacity-50">
                  <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full rotate-180">
                    <path d="M0 120L1440 120L1440 0C1440 0 1152 100 720 100C288 100 0 0 0 0L0 120Z" fill="white" />
                  </svg>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="hidden md:flex left-4 lg:left-8 w-10 h-10 md:w-12 md:h-12 bg-white/80 border-none text-sky-600 shadow-xl hover:bg-sky-500 hover:text-white transition-all backdrop-blur-sm" />
        <CarouselNext className="hidden md:flex right-4 lg:right-8 w-10 h-10 md:w-12 md:h-12 bg-white/80 border-none text-sky-600 shadow-xl hover:bg-sky-500 hover:text-white transition-all backdrop-blur-sm" />
      </Carousel>
    </div>
  );
}

export default Hero;