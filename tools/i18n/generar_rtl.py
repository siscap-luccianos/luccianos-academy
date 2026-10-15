#!/usr/bin/env python3
"""Genera css/rtl.css: la versión espejada (derecha a izquierda) de los estilos.

Uso (desde la raíz del repo): python3 tools/i18n/generar_rtl.py

Lee css/*.css y, por cada regla con propiedades direccionales (margin-left,
padding-right, left/right, text-align, border-left…, bordes redondeados por
esquina, translateX), escribe la regla espejada bajo `html[dir="rtl"]`. La hoja
solo se carga cuando el idioma activo es de derecha a izquierda (i18n.js), así
que para el resto de las personas no cambia nada. Se vuelve a correr cada vez
que cambian los estilos.
"""
import re, os, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ARCHIVOS = ["base.css", "variables.css", "layout.css", "components.css", "responsive.css"]
OUT = os.path.join(RAIZ, "css", "rtl.css")

def quitar_comentarios(s):
    return re.sub(r"/\*.*?\*/", "", s, flags=re.S)

def partir(s, sep):
    """Parte `s` por `sep` ignorando lo que esté entre paréntesis o comillas."""
    partes, nivel, comilla, actual = [], 0, None, ""
    for ch in s:
        if comilla:
            actual += ch
            if ch == comilla: comilla = None
            continue
        if ch in "\"'": comilla = ch; actual += ch; continue
        if ch == "(": nivel += 1
        elif ch == ")": nivel -= 1
        if ch == sep and nivel == 0:
            partes.append(actual); actual = ""
        else:
            actual += ch
    if actual.strip(): partes.append(actual)
    return partes

def bloques(s):
    """[(preludio, cuerpo)] del nivel actual."""
    res, i, n = [], 0, len(s)
    while i < n:
        j = s.find("{", i)
        if j == -1: break
        prel = s[i:j].strip()
        nivel, k = 1, j + 1
        while k < n and nivel:
            if s[k] == "{": nivel += 1
            elif s[k] == "}": nivel -= 1
            k += 1
        res.append((prel, s[j + 1:k - 1]))
        i = k
    return res

LADO = {"left": "right", "right": "left"}

def espejar_4(valor, tipo):
    v = valor.split()
    if tipo == "lados":                       # margin / padding: top right bottom left
        if len(v) == 4 and v[1] != v[3]: return f"{v[0]} {v[3]} {v[2]} {v[1]}"
        return None
    if tipo == "radio":                       # border-radius: tl tr br bl  (sin "/")
        if "/" in valor: return None
        if len(v) == 1: return None
        full = {2: [v[0], v[1], v[0], v[1]], 3: [v[0], v[1], v[2], v[1]], 4: v}[len(v)]
        tl, tr, br, bl = full
        nuevo = [tr, tl, bl, br]
        return None if nuevo == full else " ".join(nuevo)
    return None

def espejar_decl(prop, valor):
    """Devuelve la lista de declaraciones espejadas (o [])."""
    p, v = prop.strip().lower(), valor.strip()
    imp = ""
    if v.endswith("!important"): v, imp = v[:-10].strip(), " !important"
    m = re.fullmatch(r"(margin|padding)-(left|right)", p)
    if m:
        return [f"{m.group(1)}-{LADO[m.group(2)]}:{v}{imp}", f"{p}:0{imp}"]
    m = re.fullmatch(r"border-(left|right)(-(?:width|color|style))?", p)
    if m:
        out = [f"border-{LADO[m.group(1)]}{m.group(2) or ''}:{v}{imp}"]
        if not m.group(2): out.append(f"{p}:0{imp}")
        return out
    m = re.fullmatch(r"border-(top|bottom)-(left|right)-radius", p)
    if m:
        return [f"border-{m.group(1)}-{LADO[m.group(2)]}-radius:{v}{imp}", f"{p}:0{imp}"]
    if p in ("left", "right"):
        return [f"{LADO[p]}:{v}{imp}", f"{p}:auto{imp}"]
    if p == "text-align" and v in ("left", "right"):
        return [f"text-align:{LADO[v]}{imp}"]
    if p == "float" and v in ("left", "right"):
        return [f"float:{LADO[v]}{imp}"]
    if p in ("margin", "padding"):
        e = espejar_4(v, "lados")
        return [f"{p}:{e}{imp}"] if e else []
    if p == "border-radius":
        e = espejar_4(v, "radio")
        return [f"{p}:{e}{imp}"] if e else []
    if p == "transform" and "translateX" in v and "--tooltip-nudge" not in v:
        def inv(m2):
            num = m2.group(1)
            if num.strip("-+") in ("0", "50%"): return m2.group(0)   # 0 y centrado (50%) no cambian
            return "translateX(" + (num[1:] if num.startswith("-") else "-" + num) + ")"
        nuevo = re.sub(r"translateX\(([^)]*)\)", inv, v)
        return [f"transform:{nuevo}{imp}"] if nuevo != v else []
    return []

PARES = [("margin-left", "margin-right"), ("padding-left", "padding-right"), ("left", "right"),
         ("border-left", "border-right"), ("border-left-width", "border-right-width"),
         ("border-left-color", "border-right-color"), ("border-left-style", "border-right-style"),
         ("border-top-left-radius", "border-top-right-radius"), ("border-bottom-left-radius", "border-bottom-right-radius")]
LADOS_SUELTOS = {x for par in PARES for x in par}

def procesar_regla(selectores, cuerpo, salida):
    decls = [d for d in partir(cuerpo, ";") if ":" in d]
    pares = []
    for d in decls:
        k, _, val = d.partition(":")
        pares.append((k.strip().lower(), val.strip()))
    props = dict(pares)
    # Centrado: left:50% + translateX(-50%) queda igual en los dos sentidos
    centrado = any(props.get(x, "").startswith("50%") for x in ("left", "right"))
    out = []
    # Propiedades por lado: si están las dos en la misma regla se intercambian
    # los valores; si está una sola, pasa al otro lado y se anula la original.
    for izq, der in PARES:
        if centrado and izq in ("left", "right"): continue
        vi, vd = props.get(izq), props.get(der)
        if vi is not None and vd is not None:
            if vi != vd: out += [f"{izq}:{vd}", f"{der}:{vi}"]
        elif vi is not None or vd is not None:
            lado = izq if vi is not None else der
            out += espejar_decl(lado, props[lado])
    for k, v in pares:
        if k in LADOS_SUELTOS: continue
        if centrado and k == "transform": continue
        out += espejar_decl(k, v)
    if not out: return
    sels = [s.strip() for s in partir(selectores, ",") if s.strip()]
    pref = ",\n".join(f'html[dir="rtl"] {s}' for s in sels)
    salida.append(pref + " {\n    " + ";\n    ".join(out) + ";\n}")

def recorrer(css, salida, envoltorio=None):
    for prel, cuerpo in bloques(css):
        if prel.startswith("@media") or prel.startswith("@supports"):
            interno = []
            recorrer(cuerpo, interno)
            if interno: salida.append(prel + " {\n" + "\n".join(interno) + "\n}")
        elif prel.startswith("@"):
            continue                       # keyframes, font-face…
        else:
            procesar_regla(prel, cuerpo, salida)

def main():
    salida = []
    for nombre in ARCHIVOS:
        ruta = os.path.join(RAIZ, "css", nombre)
        if not os.path.exists(ruta): continue
        css = quitar_comentarios(open(ruta, encoding="utf8").read())
        css = re.sub(r"@import[^;]*;", "", css)
        parte = []
        recorrer(css, parte)
        if parte: salida.append(f"/* {nombre} */\n" + "\n".join(parte))
    cab = '''/* ============================
   Lucciano's Academy
   css/rtl.css — estilos espejados para idiomas de derecha a izquierda (dariya)

   GENERADO por tools/i18n/generar_rtl.py a partir de css/*.css — no editar a
   mano. Solo se carga cuando el idioma activo es RTL (i18n/i18n.js).
=============================*/

/* El árabe es una escritura cursiva: separar las letras (tracking) la rompe. */
html[lang^="ar"] *, html[lang^="ar"] *::before, html[lang^="ar"] *::after { letter-spacing: 0 !important; }
html[lang^="ar"] body { line-height: 1.65; }

'''
    manual = os.path.join(os.path.dirname(__file__), "rtl_manual.css")
    extra = ("\n/* — ajustes a mano (tools/i18n/rtl_manual.css) — */\n" + open(manual, encoding="utf8").read()) if os.path.exists(manual) else ""
    open(OUT, "w", encoding="utf8").write(cab + "\n\n".join(salida) + "\n" + extra)
    print("OK →", OUT, f"({sum(x.count('html[dir=') for x in salida)} selectores)")

main()
