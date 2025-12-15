 import { Link} from "react-router-dom";
//import Login from "@/pages/login";
// import { useContext } from "react";


function Navbar(){
   
    // falta aplicar logica 


  
    return(
      <div>
       <header className="bg-gradient-to-r from-blue-400 via-blue-200 to-white shadow-lg sticky top-0 z-50 border-b border-blue-500/50">
        <nav className=" container mx-auto px-6 py-6 ">

            <div className="flex items-center justify-between">
              
           
            <div className="flex items-center gap-2">
                <div className="p-2 rounded">
                    <span className="text-white font-bold text-3xl"> Master</span>
                </div>
            </div>

             <div className=" flex  text-blue-500 text-xl font-semibold items-center gap-50 ">
                <Link to="/registro" className=" hover:text-blue-400">
                  Registro
                </Link>
                {/* <Link to="7mision" className="text-blue hover:text-blue-400">
                  Mision
                </Link>
                <Link to="7servicios" className="text-blue hover:text-blue-400">
                  Servicios
                </Link> */}
               <Link to="/login" className="text-blue hover:text-blue-400">
  Iniciar sesión
</Link>
             </div>

            </div>
           
        </nav>

       </header>
      </div>
    )
}export default Navbar;