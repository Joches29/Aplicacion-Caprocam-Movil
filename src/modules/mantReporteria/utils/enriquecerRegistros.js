/**
 * ============================================================
 * UTIL: enriquecerRegistros (LOCAL / SQLite)
 * ============================================================
 * Resuelve nombres de finca, estanque, colaborador asignado
 * y "creado por" (colaborador o usuario admin) desde localApi.
 *
 */

import { obtenerCatalogosLocales } from "../services/ReporteriaLocal.service";

export function nombreCompletoPersona(persona) {
  if (!persona || typeof persona !== "object") return null;

  const nombre = persona.nombre ?? persona.name ?? "";
  const apellidos =
    persona.apellidos ??
    persona.apellido ??
    persona.lastName ??
    persona.last_name ??
    "";

  const completo = `${nombre} ${apellidos}`.trim();
  if (completo) return completo;

  return (
    persona.nombreCompleto ??
    persona.nombre_completo ??
    persona.nombreUsuario ??
    persona.nombre_usuario ??
    persona.username ??
    persona.usuario ??
    persona.email ??
    null
  );
}

function pickId(registro, keys) {
  for (const key of keys) {
    const valor = registro?.[key];
    if (valor === undefined || valor === null || String(valor).trim() === "") {
      continue;
    }
    const n = Number(valor);
    if (!Number.isNaN(n) && n !== 0) return n;
  }
  return null;
}

function nombreFincaDeRegistro(finca) {
  if (!finca) return null;
  return (
    finca.nombre_finca ??
    finca.nombreFinca ??
    finca.nombre ??
    null
  );
}

function codigoEstanqueDeRegistro(estanque) {
  if (!estanque) return null;
  return estanque.codigo ?? estanque.codigoEstanque ?? estanque.nombre ?? null;
}

function nombreProductoDeRegistro(producto) {
  if (!producto) return null;
  return producto.nombre ?? producto.nombreProducto ?? producto.name ?? null;
}

/**
 * Carga catálogos locales + enriquece registros con nombres legibles.
 */
export async function cargarYEnriquecerRegistros(registros = []) {
  const data = Array.isArray(registros) ? registros : [];

  const { fincas, estanques, colaboradores, productos, usuarios } =
    await obtenerCatalogosLocales();

  const fincasMap = Object.fromEntries(
    (fincas || []).map((f) => [Number(f.id), nombreFincaDeRegistro(f)])
  );

  const estanquesMap = Object.fromEntries(
    (estanques || []).map((e) => [Number(e.id), codigoEstanqueDeRegistro(e)])
  );

  const colaboradoresMap = Object.fromEntries(
    (colaboradores || []).map((c) => [
      Number(c.id),
      nombreCompletoPersona(c) || c.nombre || `Colaborador #${c.id}`,
    ])
  );

  const productosMap = Object.fromEntries(
    (productos || []).map((p) => [Number(p.id), nombreProductoDeRegistro(p)])
  );

  const usuariosMap = Object.fromEntries(
    (usuarios || []).map((u) => [
      Number(u.id),
      nombreCompletoPersona(u) ||
        u.nombre_usuario ||
        u.nombreUsuario ||
        `Usuario #${u.id}`,
    ])
  );

  return data.map((registro) => {
    const idFinca = pickId(registro, [
      "finca",
      "finca_id",
      "fincaId",
      "idFinca",
    ]);
    const idEstanque = pickId(registro, [
      "estanque",
      "estanque_id",
      "estanqueId",
      "idEstanque",
    ]);
    const idColaborador = pickId(registro, [
      "colaborador",
      "colaborador_id",
      "colaboradorId",
      "idColaborador",
    ]);
    const idProducto = pickId(registro, [
      "producto",
      "producto_id",
      "productoId",
      "idProducto",
    ]);
    const idCreadoPorColab = pickId(registro, [
      "creadoPorColaboradorId",
      "creado_por_colaborador_id",
      "creadoPorColaborador",
    ]);
    const idCreadoPorUsuario = pickId(registro, [
      "creadoPorUsuarioId",
      "creado_por_usuario_id",
      "creadoPorUsuario",
    ]);

    let nombreCreadoPor = "—";
    if (idCreadoPorColab && colaboradoresMap[idCreadoPorColab]) {
      nombreCreadoPor = colaboradoresMap[idCreadoPorColab];
    } else if (idCreadoPorUsuario) {
      nombreCreadoPor =
        usuariosMap[idCreadoPorUsuario] || `Usuario #${idCreadoPorUsuario}`;
    }

    return {
      ...registro,
      nombreFinca:
        registro.nombreFinca ||
        (idFinca && fincasMap[idFinca]) ||
        "No encontrada",
      codigoEstanque:
        registro.codigoEstanque ||
        (idEstanque && estanquesMap[idEstanque]) ||
        "No encontrado",
      nombreColaborador:
        registro.nombreColaborador ||
        registro.responsable ||
        (idColaborador && colaboradoresMap[idColaborador]) ||
        "Desconocido",
      nombreProducto:
        registro.nombreProducto ||
        (idProducto && productosMap[idProducto]) ||
        "No encontrado",
      nombreCreadoPor,
    };
  });
}
