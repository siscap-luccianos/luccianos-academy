/* ============================
   Lucciano's Academy
   pages/gestion.js — Responsables de Local y Turno — MAQUETA

   Pantalla de visualización, no funcional todavía: el usuario pidió
   "armar en repo algo para visualizar una idea" antes de decidir la
   estructura real. Tres áreas, tal como se definieron en conversación:

     1. Formación   — texto (liderazgo, feedback, indicadores...).
                       Solo TÍTULOS de tema por ahora, cada uno
                       "Próximamente" — sin inventar contenido.
     2. Gestión semanal — el checklist tipo calendario, por día
                       (arranca Domingo — más actividad, se cuenta
                       para recibir el lunes). Las tareas semanales
                       tienen un selector de "Día" propio, reasignable
                       sin tocar código. Check LOCAL (no se guarda, se
                       resetea al recargar) solo para que la
                       interacción se sienta real.
     3. ¿Qué hago si...? — guía situacional. Estructura fija por
                       situación (Qué hacer / Qué NO hacer / Cuándo
                       escalar / Herramienta relacionada), TODAS
                       marcadas "pendiente de contenido" — el usuario
                       va a traer el texto real (al menos el de
                       conflicto con cliente ya existe en un manual)
                       en una pasada aparte. Nada de esto es política
                       real todavía, es el molde nomás.

   Nada de esto está conectado a datos reales todavía (sin ruta en el
   menú a propósito — se navega escribiendo #/gestion). Cuando se
   decida la estructura final, esto se reemplaza por la versión real,
   probablemente viviendo dentro de Academia > "Responsables de Local
   y Turno" en vez de una ruta suelta.
=============================*/

import { Header } from "../components/header.js";
import { Icon } from "../components/icons.js";
import { exportarAPdf, membreteHtml } from "../services/exportarPdf.js";

/* ============================
   1. Formación — solo temas, sin contenido todavía
=============================*/
const TEMAS_FORMACION = [
    { icono: "trofeo", titulo: "Liderazgo y comunicación", detalle: "Cómo dar indicaciones claras y sostener al equipo en el día a día." },
    { icono: "comentario", titulo: "Feedback a tu equipo", detalle: "Cómo señalar lo que hay que corregir sin que se sienta un reto." },
    { icono: "idea", titulo: "Resolución de conflictos", detalle: "Herramientas generales para bajar tensión entre compañeros de equipo." },
    { icono: "dashboard", titulo: "Indicadores, costos y merma", detalle: "Cómo leer ticket promedio, hora pico y merma para decidir mejor." },
    { icono: "corazon", titulo: "Experiencia del cliente", detalle: "El estándar de atención que se espera de todo el local, no solo de vos." },
];

function temaFormacionHtml(t) {
    return `
        <div class="tema-formacion">
            <span class="tema-formacion-ico">${Icon(t.icono, { size: 18 })}</span>
            <span class="tema-formacion-txt">
                <strong>${t.titulo}</strong>
                <span>${t.detalle}</span>
            </span>
            <span class="badge-proximamente">Próximamente</span>
        </div>
    `;
}

/* ============================
   2. Gestión semanal — el checklist, ahora por día

   La semana arranca DOMINGO a propósito (pedido explícito): es el día
   de más actividad — ahí se cuenta para que el lunes entren los
   pedidos. "dia" en cada tarea semanal es solo el punto de partida,
   no algo fijo — el selector "Día" de cada tarjeta la mueve al
   momento, sin tocar código (mismo espíritu que "+ Agregar ítem").
=============================*/
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Aparecen los 7 días, cada día con SU PROPIO check — limpiar el
// abatidor el lunes no debería dar por hecha la limpieza del martes.
const TAREAS_DIARIAS = [
    { icono: "camara", titulo: "Control de pedidos y reclamos", detalle: "Con foto — gestionado acá mismo, sin depender de WhatsApp suelto." },
    {
        icono: "tacho",
        titulo: "Limpieza del equipamiento",
        detalle: "Tocá para desplegar y marcar cada equipo a medida que lo limpiás.",
        subitems: ["Abatidor", "Armario", "Vitrina"],
    },
];

// Un día de referencia cada una — reasignable con el selector de la
// propia tarjeta.
const TAREAS_SEMANALES = [
    { id: "horarios", icono: "calendario", titulo: "Armar los horarios del equipo", detalle: "Para la semana que arranca, según cómo vino la venta.", dia: "Domingo" },
    {
        id: "proveedores", icono: "caja", titulo: "Pedido a proveedores",
        detalle: "Tocá para desplegar y marcar cada uno a medida que hacés el pedido.", dia: "Domingo",
        subitems: ["Leche", "Crema", "Dore", "Barcena", "Limpieza", "Pastelería", "Rollos fiscales", "Posnet"],
    },
    { id: "fabrica", icono: "caja", titulo: "Pedido a fábrica", detalle: "Después de hacer el inventario. Revisar el sistema de venta saliente para no pasarse del pedido.", dia: "Domingo" },
];

// Sin día — dispara cuando Administración lo pide, no entra en el
// ciclo semanal (por eso tiene su propia pestaña aparte, no un día).
const TAREAS_BAJO_DEMANDA = [
    { icono: "documento", titulo: "Reportes fiscales", detalle: "Según lo solicite Administración." },
];

function selectorDiaHtml(t) {
    return `
        <div class="tarea-gestion-dia-control">
            <label>Día
                <select class="select-dia-tarea">
                    ${DIAS.map((d) => `<option value="${d}"${d === t.dia ? " selected" : ""}>${d}</option>`).join("")}
                </select>
            </label>
        </div>
    `;
}

function tareaHtml(t, idUnico, { esSemanal = false } = {}) {
    const id = `tarea-${idUnico}`;
    const atrSemanal = esSemanal ? ` data-tarea-semanal="${t.id}"` : "";

    if (t.subitems) {
        return `
            <div class="tarea-gestion tarea-gestion-desplegable" data-desplegable${atrSemanal}>
                <button type="button" class="tarea-gestion-header" data-toggle-desplegable>
                    <span class="tarea-gestion-ico">${Icon(t.icono, { size: 18 })}</span>
                    <span class="tarea-gestion-txt">
                        <strong>${t.titulo}</strong>
                        <span>${t.detalle}</span>
                    </span>
                    <span class="tarea-gestion-progreso" data-progreso>0/${t.subitems.length}</span>
                    <span class="tarea-gestion-chevron">${Icon("flecha-der", { size: 16 })}</span>
                </button>
                <div class="tarea-gestion-subitems" data-subitems>
                    ${t.subitems.map((s, is) => `
                        <label class="subitem-gestion" for="${id}-${is}">
                            <input type="checkbox" id="${id}-${is}" class="subitem-gestion-check">
                            <span>${s}</span>
                        </label>
                    `).join("")}
                    <div class="subitem-gestion-agregar">
                        <input type="text" class="input-subitem-nuevo" placeholder="Agregar ítem…">
                        <button type="button" class="btn-agregar-subitem" data-agregar-subitem>+</button>
                    </div>
                </div>
                ${esSemanal ? selectorDiaHtml(t) : ""}
            </div>
        `;
    }

    if (esSemanal) {
        return `
            <div class="tarea-gestion tarea-gestion-simple-semanal"${atrSemanal}>
                <label class="tarea-gestion-label" for="${id}">
                    <input type="checkbox" id="${id}" class="tarea-gestion-check">
                    <span class="tarea-gestion-ico">${Icon(t.icono, { size: 18 })}</span>
                    <span class="tarea-gestion-txt">
                        <strong>${t.titulo}</strong>
                        <span>${t.detalle}</span>
                    </span>
                </label>
                ${selectorDiaHtml(t)}
            </div>
        `;
    }

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

/* ============================
   3. ¿Qué hago si...? — molde fijo, sin contenido todavía

   Mismas 5 columnas para TODAS las situaciones a propósito — así el
   día que se carga el contenido real, es llenar el molde, no
   inventar el formato de nuevo cada vez. "fuente" queda documentado
   acá mismo (no en el HTML) para saber de un vistazo qué situación
   ya tiene material real esperando y cuál hay que redactar de cero.
=============================*/
const SITUACIONES_QUE_HAGO_SI = [
    {
        icono: "corazon",
        titulo: "Conflicto con un cliente",
        fuente: "Ya existe contenido real en Manuales (Atención al Cliente) — pendiente traerlo acá, no inventar de nuevo.",
    },
    {
        icono: "usuarios",
        titulo: "Falta de personal",
        fuente: "Sin fuente todavía — hay que definir el criterio con el usuario, situación por situación.",
    },
];

const CAMPOS_QUE_HAGO_SI = [
    { clave: "queHacer", label: "Qué hacer" },
    { clave: "queNoHacer", label: "Qué NO hacer" },
    { clave: "cuandoEscalar", label: "Cuándo escalar" },
    { clave: "herramienta", label: "Herramienta relacionada" },
];

function situacionQueHagoSiHtml(s, idx) {
    return `
        <div class="situacion-gestion" data-desplegable>
            <button type="button" class="situacion-gestion-header" data-toggle-desplegable>
                <span class="tarea-gestion-ico">${Icon(s.icono, { size: 18 })}</span>
                <span class="tarea-gestion-txt">
                    <strong>${s.titulo}</strong>
                    <span>${s.fuente}</span>
                </span>
                <span class="tarea-gestion-chevron">${Icon("flecha-der", { size: 16 })}</span>
            </button>
            <div class="situacion-gestion-cuerpo" data-subitems>
                ${CAMPOS_QUE_HAGO_SI.map((c) => `
                    <div class="situacion-gestion-campo">
                        <strong>${c.label}</strong>
                        <p class="situacion-gestion-pendiente">Pendiente de contenido.</p>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

/* ============================
   Página
=============================*/
const TABS = [
    { id: "formacion", label: "Formación" },
    { id: "semanal", label: "Gestión semanal" },
    { id: "quehagosi", label: "¿Qué hago si...?" },
];

export async function Gestion() {
    return `
        ${Header("Responsables de Local y Turno", "Responsable de local y responsable de turno")}

        <div class="aviso-maqueta">
            ${Icon("idea", { size: 16 })}
            <p>Vista previa para decidir la estructura — Formación y "¿Qué hago si...?" son solo el molde, todavía sin contenido real. Los checks de Gestión semanal se resetean al recargar.</p>
        </div>

        <div class="tabs-gestion" id="tabs-gestion">
            ${TABS.map((t, i) => `<button class="tab-gestion${i === 0 ? " activa" : ""}" data-vista-gestion="${t.id}">${t.label}</button>`).join("")}
        </div>

        <div data-panel-gestion="formacion">
            <div class="section">
                <div class="lista-temas-formacion">
                    ${TEMAS_FORMACION.map(temaFormacionHtml).join("")}
                </div>
            </div>
        </div>

        <div data-panel-gestion="semanal" style="display:none">
            <button type="button" class="btn btn-secondary" id="btn-exportar-gestion" style="margin-bottom:18px">
                ${Icon("descargar", { size: 16 })} Exportar a PDF
            </button>

            <div class="tabs-gestion" id="tabs-dias-gestion">
                ${DIAS.map((d, i) => `<button class="tab-gestion${i === 0 ? " activa" : ""}" data-vista-dia="${d}">${d}</button>`).join("")}
                <button class="tab-gestion" data-vista-dia="bajo-demanda">Cuando lo pidan</button>
            </div>

            <div id="contenido-gestion-imprimible">
                ${membreteHtml("Guía de Gestión")}
                ${DIAS.map((d, i) => `
                    <div class="section" data-panel-dia="${d}" style="${i === 0 ? "" : "display:none"}">
                        <h3>${d}</h3>
                        <div class="lista-tareas-gestion">
                            ${TAREAS_DIARIAS.map((t, it) => tareaHtml(t, `diaria-${it}-${d}`)).join("")}
                            ${TAREAS_SEMANALES.filter((t) => t.dia === d).map((t) => tareaHtml(t, `semanal-${t.id}`, { esSemanal: true })).join("")}
                        </div>
                    </div>
                `).join("")}
                <div class="section" data-panel-dia="bajo-demanda" style="display:none">
                    <h3>Cuando lo pidan</h3>
                    <div class="lista-tareas-gestion">
                        ${TAREAS_BAJO_DEMANDA.map((t, it) => tareaHtml(t, `demanda-${it}`)).join("")}
                    </div>
                </div>
            </div>
        </div>

        <div data-panel-gestion="quehagosi" style="display:none">
            <div class="section">
                <div class="lista-situaciones-gestion">
                    ${SITUACIONES_QUE_HAGO_SI.map(situacionQueHagoSiHtml).join("")}
                </div>
            </div>
        </div>
    `;
}

export function bindGestion() {
    // Tabs: mostrar/ocultar paneles, nada más — cada panel ya vino
    // renderizado entero desde Gestion(), no hay fetch por tab.
    const tabs = document.getElementById("tabs-gestion");
    tabs?.querySelectorAll("[data-vista-gestion]").forEach((btn) => {
        btn.addEventListener("click", () => {
            tabs.querySelectorAll("[data-vista-gestion]").forEach((b) => b.classList.remove("activa"));
            btn.classList.add("activa");
            const vista = btn.dataset.vistaGestion;
            document.querySelectorAll("[data-panel-gestion]").forEach((panel) => {
                panel.style.display = panel.dataset.panelGestion === vista ? "" : "none";
            });
        });
    });

    // Pills de días (Domingo primero) — mismo patrón que los tabs de
    // área, anidado adentro de "Gestión semanal".
    const tabsDias = document.getElementById("tabs-dias-gestion");
    tabsDias?.querySelectorAll("[data-vista-dia]").forEach((btn) => {
        btn.addEventListener("click", () => {
            tabsDias.querySelectorAll("[data-vista-dia]").forEach((b) => b.classList.remove("activa"));
            btn.classList.add("activa");
            const dia = btn.dataset.vistaDia;
            document.querySelectorAll("[data-panel-dia]").forEach((panel) => {
                panel.style.display = panel.dataset.panelDia === dia ? "" : "none";
            });
        });
    });

    // Selector "Día" de una tarea semanal — mueve la tarjeta ENTERA
    // (no la recrea) al panel del día elegido, así no pierde su
    // estado de tildado/desplegado. Pedido explícito: control propio
    // sobre el día, sin depender de un pedido de código cada vez.
    document.querySelectorAll(".select-dia-tarea").forEach((select) => {
        select.addEventListener("change", () => {
            const tarea = select.closest("[data-tarea-semanal]");
            const listaDestino = document.querySelector(`[data-panel-dia="${select.value}"] .lista-tareas-gestion`);
            if (!tarea || !listaDestino) return;
            listaDestino.appendChild(tarea);
            tabsDias?.querySelector(`[data-vista-dia="${select.value}"]`)?.click();
        });
    });

    document.querySelectorAll(".tarea-gestion-check").forEach((chk) => {
        chk.addEventListener("change", () => {
            chk.closest(".tarea-gestion").classList.toggle("hecha", chk.checked);
        });
    });

    // Tareas con sub-ítems (ej. "Pedido a proveedores", "Limpieza del
    // equipamiento") y situaciones de "¿Qué hago si...?" comparten el
    // mismo patrón desplegable: tocar el encabezado abre/cierra lo de
    // abajo.
    document.querySelectorAll("[data-desplegable]").forEach((tarjeta) => {
        const header = tarjeta.querySelector("[data-toggle-desplegable]");
        const contenedorSubitems = tarjeta.querySelector("[data-subitems]");
        const progreso = tarjeta.querySelector("[data-progreso]");

        header.addEventListener("click", () => {
            tarjeta.classList.toggle("desplegada");
        });

        if (!contenedorSubitems || !progreso) return; // situación de "¿Qué hago si...?": no tiene checklist derivado.

        // Recalcula SIEMPRE contra lo que hay en el DOM en ese momento
        // (no una lista capturada al abrir la página) — así "16/16"
        // en vez de "0/8" cuando el usuario agregó ítems nuevos, sin
        // tener que pedírmelo cada vez.
        function actualizarProgreso() {
            const subitems = contenedorSubitems.querySelectorAll(".subitem-gestion-check");
            const hechos = Array.from(subitems).filter((s) => s.checked).length;
            progreso.textContent = `${hechos}/${subitems.length}`;
            tarjeta.classList.toggle("hecha", subitems.length > 0 && hechos === subitems.length);
        }

        // Un solo listener por delegación cubre los checkboxes de
        // siempre Y los que se agreguen después — no hace falta
        // reenganchar nada cuando crece la lista.
        contenedorSubitems.addEventListener("change", (e) => {
            if (e.target.classList.contains("subitem-gestion-check")) actualizarProgreso();
        });

        const inputNuevo = tarjeta.querySelector(".input-subitem-nuevo");
        const filaAgregar = tarjeta.querySelector(".subitem-gestion-agregar");

        function agregarSubitem() {
            const texto = (inputNuevo.value || "").trim();
            if (!texto) return;
            const idNuevo = `subitem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const label = document.createElement("label");
            label.className = "subitem-gestion";
            label.setAttribute("for", idNuevo);
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.id = idNuevo;
            chk.className = "subitem-gestion-check";
            const span = document.createElement("span");
            span.textContent = texto; // textContent, nunca innerHTML — no confiar en lo que tipeó el usuario acá
            label.append(chk, span);
            contenedorSubitems.insertBefore(label, filaAgregar);
            inputNuevo.value = "";
            inputNuevo.focus();
            actualizarProgreso();
        }

        tarjeta.querySelector("[data-agregar-subitem]")?.addEventListener("click", agregarSubitem);
        inputNuevo?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); agregarSubitem(); }
        });
    });

    // "Exportar a PDF" — solo la Gestión semanal (es la única parte
    // operativa, lo que se "lleva al sistema" después de hacer la
    // ronda). exportarAPdf() copia el innerHTML tal cual está en el
    // DOM — un checkbox tildado a mano cambia su propiedad .checked
    // pero NO el atributo checked="" que queda en el HTML serializado,
    // así que sin este paso el PDF salía con TODO destildado por más
    // que se hubiera marcado todo. Se sincroniza el atributo con el
    // estado real justo antes de exportar.
    document.getElementById("btn-exportar-gestion")?.addEventListener("click", () => {
        document.querySelectorAll("#contenido-gestion-imprimible input[type=checkbox]").forEach((chk) => {
            if (chk.checked) chk.setAttribute("checked", "checked");
            else chk.removeAttribute("checked");
        });
        exportarAPdf("contenido-gestion-imprimible", "Guía de Gestión");
    });
}
