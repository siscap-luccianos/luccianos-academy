#!/usr/bin/env python3
"""Ajustes de criterio sobre el Excel de inglés (EE. UU.) devuelto por la revisión.

Uso: python3 tools/i18n/ajustes_en.py "entrada.xlsx" "salida.xlsx" ["cambios.csv"]

Decisiones (2026-10-14):
- Exam (no "assessment"), Store (no "branch"), ice cream (no "gelato"; se
  conserva "Gelato" solo donde el español también lo dice: "Gelato Shake").
- Los ejemplos de dinero pasan a dólares realistas (el español sigue en pesos).
- Dos frases con terminación de plural en español se reescriben (ver motor i18n).
"""
import csv, re, sys
from openpyxl import load_workbook

COLS = {"Pantallas": (2, [4]), "Lecciones": (6, [7]), "Tareas y otros": (3, [4]), "Examen": (3, [4, 6, 8, 10])}
# En Examen la columna "es" de cada traducción es la anterior (3→4, 5→6, 7→8, 9→10)

def mayus_como(orig, nuevo):
    return nuevo[0].upper() + nuevo[1:] if orig[0].isupper() else nuevo

def terminos(es, t):
    # exam / store
    t = re.sub(r"\b([Aa])ssessment(s?)\b", lambda m: mayus_como(m.group(0), "exam" + m.group(2)), t)
    t = re.sub(r"\bASSESSMENTS?\b", lambda m: "EXAMS" if m.group(0).endswith("S") and len(m.group(0)) > 10 else "EXAM", t)
    t = re.sub(r"\bBRANCH(ES)?\b", lambda m: "STORES" if m.group(1) else "STORE", t)
    t = re.sub(r"\b([Bb])ranch(es)?\b", lambda m: mayus_como(m.group(0), "store" + ("s" if m.group(2) else "")), t)
    # ice cream — salvo el producto "Gelato Shake", que se llama así también en español
    PROT = "\u0001"
    t = re.sub(r"\bGelato Shakes?\b", lambda m: m.group(0).replace("Gelato", PROT), t)
    t = re.sub(r"\b([Aa]) (gelatos?)\b", lambda m: ("An" if m.group(1) == "A" else "an") + " " + ("ice creams" if m.group(2).endswith("s") else "ice cream"), t)
    t = re.sub(r"\b[Gg]elatos\b", "ice creams", t)
    def g(m):
        if m.group(0)[0] == "G":
            antes, despues = m.string[:m.start()], m.string[m.end():]
            # título (Master Gelato Maker) → "Ice Cream"; inicio de oración → "Ice cream"
            if re.search(r"[A-Z]\w* $", antes) or re.match(r" [A-Z]", despues):
                return "Ice Cream"
            return "Ice cream"
        return "ice cream"
    t = re.sub(r"\b[Gg]elato\b", g, t)
    t = re.sub(r"\bGELATOS?\b", "ICE CREAM", t)         # textos en MAYÚSCULAS
    t = t.replace(PROT, "Gelato")
    return t

DINERO = [
    ("$1,000,000 ÷ 500 tickets = $2,000 average ticket", "$5,000 ÷ 500 tickets = $10 average ticket"),
    ("$1,000,000/500 tickets ($2,000 each) vs. $1,000,000/250 tickets ($4,000 each)", "$5,000/500 tickets ($10 each) vs. $5,000/250 tickets ($20 each)"),
    ("price $5,000, cost $1,500", "price $5.00, cost $1.50"),
]
FRASES = {
    # {2} era una terminación de plural en español ("acotado/acotados"); en inglés no existe
    "{0} producto{1} acotado{2}": "{0} product{1} restricted",
    # "depende/dependen" no se puede resolver con una terminación en inglés
    "Hay {0} {1} que depende{2} de ella:": "There are {0} {1} depending on it:",
    # "Te falta(n): …" — {0} era el verbo en español (falta/faltan), que en inglés no hace falta
    "Para participar necesitás aprobar el examen de todos tus módulos. Te {0}: {1}.": "To take part you need to pass the exam for all your modules. Still missing: {1}.",
    "Para participar del Desafío Diario necesitás aprobar el examen de todos tus módulos. Te {0}: {1}.": "To take part in the Daily Challenge you need to pass the exam for all your modules. Still missing: {1}.",
    # "excluido/excluidos": en inglés el adjetivo no cambia
    "· {0} excluido{1}": "· {0} excluded",
}

# Textos que el código arma por partes y que el Excel no traía (se agregan como filas nuevas)
EXTRA_UI = {
    "versiones": "versions",
    # Tarjeta "Idiomas — vista previa" de Configuración (Admin)
    "Idiomas — vista previa": "Languages — preview",
    "Los idiomas están abiertos: el inglés lo puede elegir cualquier persona en Mi perfil → Idioma, y el dariya solo los locales de Marruecos.": "Languages are open: anyone can choose English in My Profile → Language, and Darija is only for stores in Morocco.",
    "Por ahora el inglés y el dariya los ven solo vos y las personas que elijas acá (lo eligen en Mi perfil → Idioma). Para el resto la app sigue igual, en español.": "For now, English and Darija are visible only to you and the people you choose here (they pick them in My Profile → Language). For everyone else the app stays the same, in Spanish.",
    "Listo. Esas personas ya pueden elegir el idioma en Mi perfil (si tenían la app abierta, que la recarguen).": "Done. Those people can now choose the language in My Profile (if they had the app open, they should reload it).",
}

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    wb = load_workbook(sys.argv[1])
    log = []
    for hoja, (col_es, cols_t) in COLS.items():
        ws = wb[hoja]
        for r in range(2, ws.max_row + 1):
            for ct in cols_t:
                ce = ct - 1 if hoja == "Examen" else col_es
                es, t = ws.cell(r, ce).value, ws.cell(r, ct).value
                if not es or not t: continue
                nuevo = terminos(str(es), str(t))
                for a, b in DINERO: nuevo = nuevo.replace(a, b)
                if hoja == "Pantallas" and str(es) in FRASES: nuevo = FRASES[str(es)]
                if nuevo != t:
                    ws.cell(r, ct).value = nuevo
                    log.append([hoja, ws.cell(r, 1).value, str(es)[:70].replace("\n", " / "), str(t)[:100].replace("\n", " / "), nuevo[:100].replace("\n", " / ")])
    ws = wb["Pantallas"]
    existentes = {str(ws.cell(r, 2).value) for r in range(2, ws.max_row + 1)}
    for i, (es, en) in enumerate(EXTRA_UI.items(), 1):
        if es not in existentes:
            ws.append([f"UI-X{i:03d}", es, "js/pages/academia.js (parte de una frase)", en, "Agregado en el ajuste"])
            log.append(["Pantallas", f"UI-X{i:03d}", es, "(no existía)", en])
    wb.save(sys.argv[2])
    if len(sys.argv) > 3:
        with open(sys.argv[3], "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["Hoja", "ID", "Español", "Antes", "Después"]); w.writerows(log)
    print(f"{len(log)} traducciones ajustadas → {sys.argv[2]}")

main()
