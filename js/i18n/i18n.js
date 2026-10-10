/* ============================
   Lucciano's Academy
   i18n/i18n.js — Idiomas (español / inglés)

   Cómo funciona, en corto:

   - El texto de la app está escrito en español dentro del código. En vez
     de reescribir cada pantalla, cuando el idioma es inglés un traductor
     recorre lo que se dibuja (textos, placeholders, títulos, tooltips) y
     cambia cada texto por su versión en inglés, buscándolo en un
     diccionario (i18n/en.js: "texto en español" → "English text").
     Los textos con partes variables ("{0} lecciones") se resuelven con
     patrones.
   - El contenido que viene de las planillas (lecciones, preguntas,
     tareas…) se traduce al leerlo, por texto exacto (i18n/en.contenido.js).
     Si el texto en español cambia en la planilla, deja de coincidir y se
     muestra en español: nunca un inglés viejo.
   - Un texto sin traducción se muestra en español. Nada se rompe.
   - Para quien usa la app en español NO se carga ningún diccionario ni se
     activa el traductor: cero costo y cero riesgo.

   Idioma: lo elige cada persona en Mi perfil (Automático / Español /
   English). "Automático" = inglés si su local es de Estados Unidos,
   español en cualquier otro caso.
=============================*/

import { getUsuarioActual } from "../services/auth.js";
import { paisDelNombre } from "../services/alcance.js";

const CLAVE = "faro_idioma"; // "auto" | "es" | "en"

let idiomaActivo = "es";
let diccionario = new Map();   // texto exacto → traducción
let patrones = [];             // [{ re, val }]
let contenido = new Map();     // texto exacto de un campo de planilla → traducción
let porMayuscula = null;       // índice en mayúsculas (se arma al primer uso)
let contenidoNorm = new Map(); // lo mismo, con los espacios normalizados (para buscar en el DOM)
let observador = null;
const cacheFallos = new Set();

/** Lo que la persona eligió en Mi perfil. */
export function idiomaElegido() {
    try {
        const v = localStorage.getItem(CLAVE);
        return v === "es" || v === "en" ? v : "auto";
    } catch {
        return "auto";
    }
}

export function guardarIdioma(valor) {
    try {
        if (valor === "es" || valor === "en") localStorage.setItem(CLAVE, valor);
        else localStorage.removeItem(CLAVE);
    } catch { /* sin almacenamiento: queda en automático */ }
}

/** El idioma que corresponde HOY a esta persona. */
export function idiomaEfectivo() {
    const elegido = idiomaElegido();
    if (elegido !== "auto") return elegido;
    const usuario = getUsuarioActual();
    const pais = usuario?.sucursal ? paisDelNombre(usuario.sucursal) : "";
    return pais === "Estados Unidos" ? "en" : "es";
}

export function idiomaActual() {
    return idiomaActivo;
}

/* ── Búsqueda ───────────────────────────────────────────── */

function compilarPatrones(dic) {
    const lista = [];
    for (const [clave, valor] of dic) {
        if (!/\{\d+\}/.test(clave)) continue;
        // Un patrón con casi nada de texto fijo ("{0} de {1}") coincidiría con
        // cualquier frase y la traduciría mal: se descarta.
        const letrasFijas = clave.replace(/\{\d+\}/g, "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, "").length;
        const abierto = /^\{\d+\}/.test(clave) && /\{\d+\}[^A-Za-z]*$/.test(clave);
        const empiezaConGrupo = /^\{\d+\}/.test(clave);
        if (letrasFijas < (empiezaConGrupo ? 6 : 4) || (abierto && letrasFijas < 12)) continue;
        // Cada {n} de la clave pasa a ser un grupo de la expresión; el valor
        // los referencia por el MISMO {n} (los números no tienen que ser
        // correlativos), así que se guarda a qué grupo corresponde cada uno.
        const grupos = new Map();
        const re = clave
            .split(/(\{\d+\})/)
            .map((parte) => {
                const m = parte.match(/^\{(\d+)\}$/);
                if (m) { grupos.set(Number(m[1]), grupos.size + 1); return "(.*?)"; }
                return parte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            })
            .join("");
        lista.push({ re: new RegExp(`^${re}$`), val: valor, grupos, peso: clave.replace(/\{\d+\}/g, "").length });
    }
    // Los más específicos primero (más texto fijo).
    lista.sort((a, b) => b.peso - a.peso);
    return lista;
}

function buscar(nucleo) {
    if (diccionario.has(nucleo)) return diccionario.get(nucleo);
    if (contenidoNorm.has(nucleo)) return contenidoNorm.get(nucleo);
    if (cacheFallos.has(nucleo)) return null;
    for (const p of patrones) {
        const m = nucleo.match(p.re);
        // Cada trozo variable capturado también se traduce por su cuenta
        // (ej. " o eliminarla" dentro de una frase más larga).
        if (m) return p.val.replace(/\{(\d+)\}/g, (_, i) => t(m[p.grupos.get(Number(i))] ?? ""));
    }
    // Numeración pegada al texto ("1. ¿Qué lleva…?", "2) Paso"): se traduce el resto.
    const num = nucleo.match(/^(\d+[.)]\s+)(.+)$/);
    if (num) {
        const r = buscar(num[2]);
        if (r != null) return num[1] + r;
    }
    // Textos armados con join(): listas ("Café, Heladería"), "A — B — C" o
    // "01 · Paso": cada elemento se traduce por su cuenta.
    for (const sep of [", ", " — ", " · "]) {
        if (!nucleo.includes(sep)) continue;
        const partes = nucleo.split(sep);
        const traducidas = partes.map((x) => buscar(x));
        if (traducidas.some((x) => x != null)) return partes.map((x, i) => traducidas[i] ?? x).join(sep);
    }
    // Nombres de producto que la planilla guarda en MAYÚSCULAS.
    if (nucleo === nucleo.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(nucleo)) {
        if (!porMayuscula) {
            porMayuscula = new Map();
            for (const [k, v] of [...diccionario, ...contenidoNorm]) porMayuscula.set(k.toUpperCase(), v);
        }
        const r = porMayuscula.get(nucleo);
        if (r != null) return r.toUpperCase();
    }
    cacheFallos.add(nucleo);
    return null;
}

/** Traduce un texto suelto (mensajes de alert/confirm, textos armados en JS). */
export function t(texto) {
    if (idiomaActivo !== "en" || typeof texto !== "string") return texto;
    const m = texto.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const nucleo = m[2].replace(/\s+/g, " ");
    if (!nucleo) return texto;
    const r = buscar(nucleo);
    return r == null ? texto : m[1] + r + m[3];
}

/** Traduce el campo de una planilla (lección, pregunta, tarea…). */
export function tc(texto) {
    if (idiomaActivo !== "en" || typeof texto !== "string" || !texto) return texto;
    return contenido.get(texto.trim()) ?? contenido.get(texto) ?? texto;
}

/* ── Traductor del DOM ──────────────────────────────────── */

const ATRIBUTOS = ["placeholder", "title", "aria-label", "alt", "data-tooltip-texto"];
const SELECTOR_ATR = ATRIBUTOS.map((a) => `[${a}]`).join(",");
const IGNORAR = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

function traducirNodoTexto(nodo) {
    const p = nodo.parentElement;
    if (!p || IGNORAR.has(p.tagName) || p.closest("[data-no-traducir]")) return;
    const nuevo = t(nodo.nodeValue);
    if (nuevo !== nodo.nodeValue) nodo.nodeValue = nuevo;
}

function traducirAtributos(el) {
    for (const a of ATRIBUTOS) {
        const v = el.getAttribute?.(a);
        if (v) {
            const nuevo = t(v);
            if (nuevo !== v) el.setAttribute(a, nuevo);
        }
    }
}

function traducirArbol(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { traducirNodoTexto(raiz); return; }
    if (raiz.nodeType !== 1) return;
    if (IGNORAR.has(raiz.tagName) || raiz.closest?.("[data-no-traducir]")) return;
    traducirAtributos(raiz);
    raiz.querySelectorAll?.(SELECTOR_ATR).forEach(traducirAtributos);
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = caminante.nextNode())) traducirNodoTexto(n);
}

function alMutar(registros) {
    observador.disconnect();
    try {
        for (const r of registros) {
            if (r.type === "childList") r.addedNodes.forEach(traducirArbol);
            else if (r.type === "characterData") traducirNodoTexto(r.target);
            else if (r.type === "attributes") traducirAtributos(r.target);
        }
        if (document.title) document.title = t(document.title);
    } finally {
        observarDOM();
    }
}

function observarDOM() {
    observador.observe(document.documentElement, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ATRIBUTOS,
    });
}

/* ── Fechas y números en el idioma activo ───────────────── */

let localesParcheados = false;
function parchearLocales() {
    if (localesParcheados) return;
    localesParcheados = true;
    const mapa = (loc) => (typeof loc === "string" && /^es\b/i.test(loc) ? "en-US" : loc);
    for (const [proto, nombres] of [
        [Date.prototype, ["toLocaleDateString", "toLocaleString", "toLocaleTimeString"]],
        [Number.prototype, ["toLocaleString"]],
    ]) {
        for (const nombre of nombres) {
            const original = proto[nombre];
            proto[nombre] = function (loc, ...resto) {
                return original.call(this, idiomaActivo === "en" ? mapa(loc) : loc, ...resto);
            };
        }
    }
    const DTF = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function (loc, ...resto) { return new DTF(idiomaActivo === "en" ? mapa(loc) : loc, ...resto); };
    Intl.DateTimeFormat.prototype = DTF.prototype;
    Intl.DateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
}

function parchearDialogos() {
    for (const nombre of ["alert", "confirm", "prompt"]) {
        const original = window[nombre].bind(window);
        window[nombre] = (mensaje, ...resto) => original(t(String(mensaje ?? "")), ...resto);
    }
}

/* ── Arranque ───────────────────────────────────────────── */

let diccionariosCargados = false;
async function cargarDiccionarios() {
    if (diccionariosCargados) return;
    const [ui, cont] = await Promise.all([import("./en.js"), import("./en.contenido.js")]);
    diccionario = new Map(Object.entries(ui.default));
    contenido = new Map(Object.entries(cont.default));
    contenidoNorm = new Map([...contenido].map(([k, v]) => [k.replace(/\s+/g, " ").trim(), v]));
    patrones = compilarPatrones(diccionario);
    diccionariosCargados = true;
}

/** Llamar UNA vez al arrancar la app, antes de dibujar la primera pantalla. */
export async function iniciarI18n() {
    const idioma = idiomaEfectivo();
    document.documentElement.lang = idioma;
    if (idioma !== "en") { idiomaActivo = "es"; return; }

    await cargarDiccionarios();
    idiomaActivo = "en";
    parchearLocales();
    parchearDialogos();
    observador = new MutationObserver(alMutar);
    traducirArbol(document.body);
    observarDOM();
}

/** Si el idioma que corresponde cambió (ej. alguien inició sesión), recarga
 *  para que toda la pantalla —incluidos los datos ya leídos— salga en el
 *  idioma correcto. */
export function recargarSiCambioElIdioma() {
    if (idiomaEfectivo() !== idiomaActivo) window.location.reload();
}
