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

  const fincasMap = {};
  (fincas || []).forEach((f) => {
    const nombre = nombreFincaDeRegistro(f);
    if (f.id != null) fincasMap[Number(f.id)] = nombre;
    if (f.servidor_id != null) fincasMap[Number(f.servidor_id)] = nombre;
    if (f.servidorId != null) fincasMap[Number(f.servidorId)] = nombre;
  });

  const estanquesMap = {};
  (estanques || []).forEach((e) => {
    const codigo = codigoEstanqueDeRegistro(e);
    if (e.id != null) estanquesMap[Number(e.id)] = codigo;
    if (e.servidor_id != null) estanquesMap[Number(e.servidor_id)] = codigo;
    if (e.servidorId != null) estanquesMap[Number(e.servidorId)] = codigo;
  });

  const colaboradoresMap = {};
  (colaboradores || []).forEach((c) => {
    const nombre =
      nombreCompletoPersona(c) || c.nombre || `Colaborador #${c.id}`;
    if (c.id != null) colaboradoresMap[Number(c.id)] = nombre;
    if (c.servidor_id != null) colaboradoresMap[Number(c.servidor_id)] = nombre;
    if (c.servidorId != null) colaboradoresMap[Number(c.servidorId)] = nombre;
  });

  const productosMap = {};
  (productos || []).forEach((p) => {
    const nombre = nombreProductoDeRegistro(p);
    if (p.id != null) productosMap[Number(p.id)] = nombre;
    if (p.servidor_id != null) productosMap[Number(p.servidor_id)] = nombre;
    if (p.servidorId != null) productosMap[Number(p.servidorId)] = nombre;
  });

  const usuariosMap = {};
  (usuarios || []).forEach((u) => {
    const nombre =
      nombreCompletoPersona(u) ||
      u.nombre_usuario ||
      u.nombreUsuario ||
      `Usuario #${u.id}`;
    if (u.id != null) usuariosMap[Number(u.id)] = nombre;
    if (u.servidor_id != null) usuariosMap[Number(u.servidor_id)] = nombre;
    if (u.servidorId != null) usuariosMap[Number(u.servidorId)] = nombre;
  });

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
      "usuario_id",
      "usuarioId",
      "usuario",
      "idUsuario",
    ]);

    let nombreCreadoPor = "";
    if (idCreadoPorColab && colaboradoresMap[idCreadoPorColab]) {
      nombreCreadoPor = colaboradoresMap[idCreadoPorColab];
    } else if (idCreadoPorUsuario && usuariosMap[idCreadoPorUsuario]) {
      nombreCreadoPor = usuariosMap[idCreadoPorUsuario];
    } else if (idCreadoPorColab && usuariosMap[idCreadoPorColab]) {
      // Por si el id pertenecía a la tabla de usuarios
      nombreCreadoPor = usuariosMap[idCreadoPorColab];
    } else if (idCreadoPorUsuario && colaboradoresMap[idCreadoPorUsuario]) {
      // Por si el id pertenecía a la tabla de colaboradores
      nombreCreadoPor = colaboradoresMap[idCreadoPorUsuario];
    } else if (idColaborador && colaboradoresMap[idColaborador]) {
      nombreCreadoPor = colaboradoresMap[idColaborador];
    } else if (idColaborador && usuariosMap[idColaborador]) {
      nombreCreadoPor = usuariosMap[idColaborador];
    } else if (registro.responsable && String(registro.responsable).trim() !== "") {
      nombreCreadoPor = String(registro.responsable).trim();
    } else if (registro.nombreColaborador && registro.nombreColaborador !== "Desconocido") {
      nombreCreadoPor = registro.nombreColaborador;
    } else if (registro.creador && String(registro.creador).trim() !== "") {
      nombreCreadoPor = String(registro.creador).trim();
    } else if (idCreadoPorColab) {
      nombreCreadoPor = colaboradoresMap[idCreadoPorColab] || `Colaborador #${idCreadoPorColab}`;
    } else if (idCreadoPorUsuario) {
      nombreCreadoPor = usuariosMap[idCreadoPorUsuario] || `Usuario #${idCreadoPorUsuario}`;
    } else {
      nombreCreadoPor = "—";
    }

    const nombreColaborador =
      (idColaborador && colaboradoresMap[idColaborador]) ||
      (idColaborador && usuariosMap[idColaborador]) ||
      (idCreadoPorColab && colaboradoresMap[idCreadoPorColab]) ||
      (idCreadoPorUsuario && usuariosMap[idCreadoPorUsuario]) ||
      (nombreCreadoPor !== "—" ? nombreCreadoPor : null) ||
      registro.nombreColaborador ||
      registro.responsable ||
      "Desconocido";

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
      nombreColaborador,
      nombreProducto:
        registro.nombreProducto ||
        (idProducto && productosMap[idProducto]) ||
        "No encontrado",
      nombreCreadoPor,
    };
  });
}
