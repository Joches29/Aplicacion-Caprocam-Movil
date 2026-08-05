/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: comprador.service.js
Modulo: Compradores
Descripcion:
Version SQLite (offline-first) del service de Compradores.
Reemplaza temporalmente las llamadas HTTP directas por lectura/
escritura en la base local, para poder trabajar y probar sin
depender del backend ni de un JWT real.

IMPORTANTE:
- Mantiene exactamente los mismos nombres de funcion y la misma
  forma de los datos que la version anterior (comprador.service.api.js,
  que queda guardada como respaldo/referencia), para no tener que
  tocar ninguno de los hooks que ya consumen este service.
- No hay sincronizacion con el backend todavia: esto solo guarda
  y lee de SQLite local. La sincronizacion (subir lo pendiente a
  /compradores) es un paso aparte, pendiente.
- grupoDatos/colaboradorId salen de local/sesionTemporal.helper.js
  (dentro de este mismo modulo, no en database/local), que usa
  sesion offline real si existe, o un valor fijo de prueba si
  todavia no hay login (ver ese archivo para el detalle).
- Este archivo se encarga solo de inicializar la base SQLite
  (asegurarBaseInicializada), en vez de agregar esa llamada al
  _layout.jsx global. La funcion de Gerald es idempotente (CREATE
  TABLE IF NOT EXISTS), asi que no hay problema en llamarla desde
  aca sin tocar ningun archivo compartido del proyecto.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import { obtenerContextoLocal } from "../local/sesionTemporal.helper";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

// Evita llamar inicializar() en cada operacion; solo la primera
// vez que se usa el service en la sesion de la app.
let baseInicializada = false;

async function asegurarBaseInicializada() {
  if (baseInicializada) return;
  await localApi.inicializar();
  baseInicializada = true;
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

export const compradorService = {

  getCompradores: async () => {
    await asegurarBaseInicializada();
    const { grupoDatos } = await obtenerContextoLocal();

    const resultado = await localApi.compradores.obtenerTodos({
      grupo_datos: grupoDatos,
      estado: "ACTIVO",
    });

    if (!resultado?.success) {
      throw new Error("No se pudieron obtener los compradores.");
    }

    return resultado.data;
  },

  getCompradorPorId: async (id) => {
    await asegurarBaseInicializada();
    const resultado = await localApi.compradores.obtenerPorId(Number(id));

    if (!resultado?.success) {
      throw new Error("No se pudo obtener el comprador.");
    }

    if (!resultado.data) {
      const noEncontrado = new Error("Comprador no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    return resultado.data;
  },

  crearComprador: async (datos) => {
    await asegurarBaseInicializada();
    const { grupoDatos, colaboradorId } = await obtenerContextoLocal();

    if (!datos.nombre || (!datos.cedula && !datos.telefono)) {
      const err = new Error("Faltan campos requeridos: nombre y cedula o telefono.");
      err.response = { status: 400 };
      throw err;
    }

    const resultado = await localApi.compradores.crear({
      grupo_datos: grupoDatos,
      nombre: datos.nombre,
      cedula: datos.cedula || null,
      telefono: datos.telefono || null,
      correo: datos.correo || null,
      direccion: datos.direccion || null,
      notas: datos.notas || null,
      estado: "ACTIVO",
      creado_por_colaborador_id: colaboradorId,
    });

    if (!resultado?.success) {
      throw new Error("No se pudo crear el comprador.");
    }

    return resultado.data;
  },

  actualizarComprador: async (id, datos) => {
    await asegurarBaseInicializada();
    const resultado = await localApi.compradores.actualizar(Number(id), {
      nombre: datos.nombre,
      cedula: datos.cedula,
      telefono: datos.telefono,
      correo: datos.correo || null,
      direccion: datos.direccion || null,
      notas: datos.notas || null,
    });

    if (!resultado?.success) {
      const noEncontrado = new Error("Comprador no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    return resultado.data;
  },

  desactivarComprador: async (id) => {
    await asegurarBaseInicializada();
    const resultado = await localApi.compradores.eliminar(Number(id));

    if (!resultado?.success) {
      const noEncontrado = new Error("Comprador no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    return resultado.data;
  },
};

export function mapComprador(apiComprador) {
  if (!apiComprador) return null;
  return {
    id: apiComprador.id,
    nombre: apiComprador.nombre,
    cedula: apiComprador.cedula,
    telefono: apiComprador.telefono,
    correo: apiComprador.correo ?? "",
    direccion: apiComprador.direccion ?? "",
    notas: apiComprador.notas ?? "",
    iniciales: obtenerIniciales(apiComprador.nombre),
  };
}

function obtenerIniciales(nombre = "") {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  const primera = palabras[0][0] ?? "";
  const segunda = palabras.length > 1 ? palabras[1][0] ?? "" : "";
  return (primera + segunda).toUpperCase();
}