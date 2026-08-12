import { ICONS } from "../../../theme/icons";

const iconoPorCategoria = [
  { match: ["alimentación", "alimentacion"], icon: ICONS.food },
  { match: ["tratamiento"], icon: ICONS.treatment },
  { match: ["químico", "quimico"], icon: ICONS.chemicalContainer },
  { match: ["fertilizante"], icon: ICONS.fertilizer },
  { match: ["antibiótico", "antibiotico"], icon: ICONS.microscope },
  { match: ["probiótico", "probiotico"], icon: ICONS.microscope },
  { match: ["mantenimiento"], icon: ICONS.tools },
];

export function getIconForCategory(categoria) {
  const cat = (categoria || "").toLowerCase();
  const encontrado = iconoPorCategoria.find(({ match }) =>
    match.some((palabra) => cat.includes(palabra)),
  );
  return encontrado ? encontrado.icon : ICONS.box;
}

const unidadesInvariables = ["kg", "g", "mg", "ml", "l", "cc"];
const vocales = "aeiouáéíóú";
const acentos = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

export function pluralizarPalabra(palabra) {
  if (!palabra || palabra.toLowerCase().endsWith("s")) return palabra;

  const ultima = palabra.charAt(palabra.length - 1).toLowerCase();
  if (vocales.includes(ultima)) {
    return `${palabra}s`;
  }

  const penultima = palabra.charAt(palabra.length - 2).toLowerCase();
  if (acentos[penultima]) {
    return `${palabra.slice(0, -2)}${acentos[penultima]}${ultima}es`;
  }
  return `${palabra}es`;
}

export function getPluralizedUnit(cantidad, unidad) {
  if (Number(cantidad) <= 1 || !unidad) return unidad;

  const [primeraPalabra, ...resto] = unidad.trim().split(" ");

  if (unidadesInvariables.includes(primeraPalabra.toLowerCase())) {
    return unidad;
  }

  const palabraPlural = pluralizarPalabra(primeraPalabra);
  return resto.length ? `${palabraPlural} ${resto.join(" ")}` : palabraPlural;
}
