import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

import banner1 from "../assets/images/banne1.svg"
// import mentorimg1 from "../assets/servicios/mt3.jpg";
// import mentorimg2 from "../assets/servicios/mt7.svg";





function hero(){
return(
<div className="flex justify-center items-center ">
          <Carousel className="w-full  ">
            <CarouselContent>
              <CarouselItem className="flex items-center justify-center h-200 bg-white shadow">
                 <img
              src={banner1}
              alt="Mentoría"
              className="w-full object-cover "
            />


                 {/* <div className="absolute bottom-0 left-0 right-0 h-12 overflow-hidden">
                <svg 
                  className="absolute top-0 left-0 w-full h-12" 
                  viewBox="0 0 1440 48" 
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M0,24 Q360,48 720,24 T1440,24 L1440,48 L0,48 Z" 
                    className="fill-white"
                  />
                </svg>
              </div> */}
              </CarouselItem>

              <CarouselItem className="flex items-center justify-center h-100 bg-white rounded-xl shadow">
                  <img
              src={banner1}
              alt="Mentoría"
              className="w-full h-full object-cover "
            />
              </CarouselItem>

              <CarouselItem className="flex items-center justify-center h-100 bg-white rounded-xl shadow">
                    <img
              src={banner1}
              alt="Mentoría"
              className="w-full h-full object-cover "
            />
              </CarouselItem>
            </CarouselContent>

            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
)
}export default hero;