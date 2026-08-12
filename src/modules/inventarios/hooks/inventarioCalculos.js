/**
 * Convierte un string "dd/mm/aaaa" a Date para poder comparar fechas.
 * No usa regex, solo split. Devuelve null si el string viene vacío o
 * mal formado (así el filtro simplemente no aplica en vez de romper).
 */
export function parsearFechaDDMMAAAA(fecha) {
  if (!fecha) return null;
  const partes = fecha.split("/");
  if (partes.length !== 3) return null;

  const [dia, mes, anio] = partes.map(Number);
  if (!dia || !mes || !anio) return null;

  return new Date(anio, mes - 1, dia);
}
