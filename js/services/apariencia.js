/* ============================
   Lucciano's Academy
   services/apariencia.js — Apariencia de la app en el celular

   "clasico" es lo de siempre; "glass" (Liquid Glass) vuelve la barra de
   abajo flotante y translúcida, y pone el encabezado y las tarjetas
   principales en vidrio. Es una preferencia personal del DISPOSITIVO
   (localStorage), igual que los accesos rápidos: no es un permiso ni se
   guarda en la planilla. Solo tiene efecto en pantallas chicas — los
   estilos viven dentro del breakpoint de celular en css/responsive.css
   y se activan con el atributo data-apariencia del <html>.
=============================*/

import { getItem, setItem } from "./storage.js";

const CLAVE = "apariencia";
export const APARIENCIAS = [
    { id: "clasico", etiqueta: "Clásico" },
    { id: "glass", etiqueta: "Liquid Glass" },
];

export function getApariencia() {
    const v = getItem(CLAVE, "clasico");
    return APARIENCIAS.some((a) => a.id === v) ? v : "clasico";
}

/** Pone o saca el atributo que activan los estilos. Se llama al
 *  arrancar la app y cada vez que se elige otra. */
export function aplicarApariencia(valor = getApariencia()) {
    if (valor === "glass") document.documentElement.setAttribute("data-apariencia", "glass");
    else document.documentElement.removeAttribute("data-apariencia");
}

export function setApariencia(valor) {
    setItem(CLAVE, valor);
    aplicarApariencia(valor);
}
