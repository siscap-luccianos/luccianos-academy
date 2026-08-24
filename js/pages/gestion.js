/* ============================
   Lucciano's Academy
   pages/gestion.js — Guía de Gestión (Encargados) — MAQUETA

   Pantalla de visualización, no funcional todavía: el usuario pidió
   "armar en repo algo para visualizar una idea" antes de decidir la
   estructura real — así que estas 6 tareas son las que él mismo
   enumeró tal cual, agrupadas por frecuencia, con un check LOCAL (no
   se guarda en ningún lado, se resetea al recargar) solo para que la
   interacción se sienta real al probarla.

   Nada de esto está conectado a datos reales todavía (sin ruta en el
   menú a propósito — se navega escribiendo #/gestion). Cuando se
   decida la estructura final, esto se reemplaza por la versión real.
=============================*/

import { Header } from "../components/header.js";
import { Icon } from "../components/icons.js";

/** Tal cual las enumeró el usuario — no inventar tareas nuevas acá. */
const GRUPOS = [
    {
        titulo: "Domingos",
        tareas: [
            {
                icono: "calendario",
                titulo: "Armar los horarios del equipo",
                detalle: "Para la semana que arranca, según cómo vino la venta.",
            },
        ],
    },
    {
        titulo: "Semanal",
        tareas: [
            {
                icono: "caja",
                titulo: "Pedido a proveedores",
                detalle: "Leche, crema, dore, barcena, limpieza, pastelería, rollos fiscales y posnet.",
            },
            {
                icono: "caja",
                titulo: "Pedido a fábrica",
                detalle: "Después de hacer el inventario. Revisar el sistema de venta saliente para no pasarse del pedido.",
            },
        ],
    },
    {
        titulo: "Cuando lo pida Admin",
        tareas: [
            {
                icono: "documento",
                titulo: "Reportes fiscales",
                detalle: "Según lo solicite Administración.",
            },
        ],
    },
    {
        titulo: "Todos los días",
        tareas: [
            {
                icono: "camara",
                titulo: "Control de pedidos y reclamos",
                detalle: "Con foto — gestionado acá mismo, sin depender de WhatsApp suelto.",
            },
            {
                icono: "tacho",
                titulo: "Limpieza del equipamiento",
                detalle: "Asegurar que se cumpla todos los días, no solo en la apertura.",
            },
        ],
    },
];

function tareaHtml(t, idGrupo, idTarea) {
    const id = `tarea-${idGrupo}-${idTarea}`;
    return `
        <label class="tarea-gestion" for="${id}">
            <input type="checkbox" id="${id}" class="tarea-gestion-check">
            <span class="tarea-gestion-ico">${Icon(t.icono, { size: 18 })}</span>
            <span class="tarea-gestion-txt">
                <strong>${t.titulo}</strong>
                <span>${t.detalle}</span>
            </span>
        </label>
    `;
}

export async function Gestion() {
    return `
        ${Header("Guía de Gestión", "Encargados — Responsable de local y de turno")}

        <div class="aviso-maqueta">
            ${Icon("idea", { size: 16 })}
            <p>Vista previa para decidir la estructura — todavía no guarda nada ni trae datos reales. Los checks se resetean al recargar.</p>
        </div>

        ${GRUPOS.map((g, ig) => `
            <div class="section">
                <h3>${g.titulo}</h3>
                <div class="lista-tareas-gestion">
                    ${g.tareas.map((t, it) => tareaHtml(t, ig, it)).join("")}
                </div>
            </div>
        `).join("")}
    `;
}

export function bindGestion() {
    document.querySelectorAll(".tarea-gestion-check").forEach((chk) => {
        chk.addEventListener("change", () => {
            chk.closest(".tarea-gestion").classList.toggle("hecha", chk.checked);
        });
    });
}
