/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: FisicoQuimicaLocalService.js
Autor: Brandon Valdelomar
Fecha: 03/08/2026
Modulo: Fisico Quimica (Movil)
Descripcion:
Reemplaza a FisicoQuimicaServices.js para el guardado,
edicion y consulta de lecturas fisico quimicas, trabajando
100% contra SQLite local (offline-first). Devuelve los
registros con la misma forma que ya usaban los hooks del
front web (ph/salinidad/temperatura/oxigenoDisuelto como
arreglos de {valor, etiqueta}), para minimizar cambios en
la capa de UI cuando se refactoricen los hooks.

IMPORTANTE - Decision de diseno (confirmar con el equipo si
hay dudas):
Las filas de fisico_quimico_detalle NO se sincronizan de
forma individual ni llevan su propio flujo pendiente_sync.
Solo la cabecera (fisico_quimico) participa del flujo de
sincronizacion (pendiente_sync/accion_sync). El servicio de
sync propio de este modulo, al subir una cabecera, vuelve a
leer sus detalles directamente de SQLite en ese momento y
arma el payload combinado. Por eso aqui, al "reemplazar
totalmente" los detalles en una actualizacion, se hace un
DELETE fisico + INSERT nuevo (no soft-delete), igual que
hace el backend real con fisico_quimico_detalle.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from '../../../database/local/localApi.service';
import { obtenerBaseLocal } from '../../../database/local/sqlite.database';
import { obtenerSesionOffline } from '../../../database/local/offlineAuth.service';
import { validarLecturaFisicoQuimica } from '../validaciones/fisicoQuimica.validaciones';

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

// Mapeo entre la clave que usa el front (oxigenoDisuelto) y el
// valor que exige tipo_medicion en la tabla local/backend
// (oxigeno). OJO con este mapeo, es la trampa mas facil de
// pisar: en la tabla es 'oxigeno', en el objeto de la app es
// 'oxigenoDisuelto'.
const MAPA_CAMPO_A_TIPO = {
    ph: 'ph',
    salinidad: 'salinidad',
    temperatura: 'temperatura',
    oxigenoDisuelto: 'oxigeno'
};

const MAPA_TIPO_A_CAMPO = {
    ph: 'ph',
    salinidad: 'salinidad',
    temperatura: 'temperatura',
    oxigeno: 'oxigenoDisuelto'
};

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene grupoDatos y colaborador de la sesion offline
 * activa. Lanza error si no hay sesion.
 * @returns {Promise<object>} {grupoDatos, colaboradorId}
 */
async function obtenerAutoriaOffline() {
    const sesion = await obtenerSesionOffline();

    if (!sesion.success || !sesion.data || !sesion.data.grupoDatos) {
        throw new Error('No hay sesion offline activa para registrar la lectura.');
    }

    return {
        grupoDatos: sesion.data.grupoDatos,
        colaboradorId: sesion.data.colaborador?.id ?? null
    };
}

/**
 * Busca localmente si ya existe una lectura activa para el
 * mismo grupoDatos + estanqueId + fecha. Regla de unicidad
 * manual (SQLite solo tiene indice regular, no UNIQUE).
 * @param {number} grupoDatos - Grupo de datos del colaborador.
 * @param {number} estanqueId - Id local del estanque.
 * @param {string} fecha - Fecha YYYY-MM-DD.
 * @param {number|null} idExcluir - Id local a excluir (para updates).
 * @returns {Promise<object|null>} Registro encontrado o null.
 */
async function buscarLecturaExistente(grupoDatos, estanqueId, fecha, idExcluir = null) {
    const respuesta = await localApi.fisicoQuimico.obtenerTodos({
        grupo_datos: grupoDatos,
        estanque_id: estanqueId,
        fecha_registro: fecha
    });

    if (!respuesta.success) {
        return null;
    }

    const encontrada = (respuesta.data || []).find((registro) => registro.id !== idExcluir);

    return encontrada || null;
}

/**
 * Convierte las filas de fisico_quimico_detalle al formato
 * {ph, salinidad, temperatura, oxigenoDisuelto} que espera
 * la UI (arreglos de {valor, etiqueta}).
 * @param {Array<object>} filasDetalle - Filas locales de detalle.
 * @returns {object} Mediciones agrupadas por tipo.
 */
function agruparDetallesLocal(filasDetalle = []) {
    const mediciones = { ph: [], salinidad: [], temperatura: [], oxigenoDisuelto: [] };

    for (const fila of filasDetalle) {
        const campo = MAPA_TIPO_A_CAMPO[fila.tipo_medicion];

        if (!campo) {
            continue;
        }

        mediciones[campo].push({
            valor: Number(fila.valor),
            etiqueta: fila.etiqueta
        });
    }

    return mediciones;
}

/**
 * Convierte una fila local de fisico_quimico + sus detalles
 * al objeto que espera la UI (mismo shape que la API real).
 * @param {object} filaLectura - Fila de fisico_quimico.
 * @param {Array<object>} filasDetalle - Filas de fisico_quimico_detalle.
 * @returns {object} Lectura en formato de la app.
 */
function mapearLecturaLocal(filaLectura, filasDetalle) {
    const mediciones = agruparDetallesLocal(filasDetalle);

    return {
        id: filaLectura.id,
        servidorId: filaLectura.servidor_id,
        uuid: filaLectura.uuid,
        grupoDatos: filaLectura.grupo_datos,
        fincaId: filaLectura.finca_id,
        estanqueId: filaLectura.estanque_id,
        fecha: filaLectura.fecha_registro,
        ph: mediciones.ph,
        salinidad: mediciones.salinidad,
        temperatura: mediciones.temperatura,
        oxigenoDisuelto: mediciones.oxigenoDisuelto,
        sincronizado: Boolean(filaLectura.sincronizado),
        creadoPorColaboradorId: filaLectura.creado_por_colaborador_id ?? null,
        creadoPorUsuarioId: filaLectura.creado_por_usuario_id ?? null
    };
}

/**
 * Inserta las filas de detalle para una lectura ya creada.
 * @param {number} lecturaIdLocal - Id local de fisico_quimico.
 * @param {object} datos - {ph, salinidad, temperatura, oxigenoDisuelto}
 * @param {object} autoria - {grupoDatos, colaboradorId} (colaboradorId offline).
 * @returns {Promise<void>} No retorna valor.
 */
async function insertarDetallesLocal(lecturaIdLocal, datos, autoria) {
    const camposMedicion = ['ph', 'salinidad', 'temperatura', 'oxigenoDisuelto'];

    for (const campo of camposMedicion) {
        const mediciones = datos[campo] || [];

        for (const medicion of mediciones) {
            await localApi.fisicoQuimicoDetalle.crear({
                lectura_id: lecturaIdLocal,
                tipo_medicion: MAPA_CAMPO_A_TIPO[campo],
                etiqueta: String(medicion.etiqueta),
                valor: Number(medicion.valor),
                creado_por_usuario_id: null,
                creado_por_colaborador_id: autoria.colaboradorId
            });
        }
    }
}

/**
 * Borra fisicamente (no soft-delete) los detalles previos de
 * una lectura, para poder reemplazarlos por completo. Ver
 * nota de diseno en la cabecera del archivo: los detalles no
 * llevan su propio ciclo de sincronizacion, por eso el borrado
 * fisico aqui es seguro y no rompe el flujo de sync.
 * @param {number} lecturaIdLocal - Id local de fisico_quimico.
 * @returns {Promise<void>} No retorna valor.
 */
async function borrarDetallesLocalFisico(lecturaIdLocal) {
    const db = await obtenerBaseLocal();

    await db.runAsync(
        'DELETE FROM fisico_quimico_detalle WHERE lectura_id = ?',
        [lecturaIdLocal]
    );
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Busca la lectura de un estanque en una fecha especifica.
 * Equivalente local de getLecturaPorEstanqueYFecha.
 * @param {number} estanqueId - Id local del estanque.
 * @param {string} fecha - Fecha YYYY-MM-DD.
 * @returns {Promise<object|null>} Lectura encontrada o null.
 */
export async function getLecturaPorEstanqueYFechaLocal(estanqueId, fecha) {
    const { grupoDatos } = await obtenerAutoriaOffline();

    const existente = await buscarLecturaExistente(grupoDatos, estanqueId, fecha);

    if (!existente) {
        return null;
    }

    const detalles = await localApi.fisicoQuimicoDetalle.obtenerTodos({
        lectura_id: existente.id
    });

    return mapearLecturaLocal(existente, detalles.success ? detalles.data : []);
}

/**
 * Busca una lectura por su id local. Equivalente local de
 * getLecturaPorId.
 * @param {number} id - Id local de fisico_quimico.
 * @returns {Promise<object|null>} Lectura encontrada o null.
 */
export async function getLecturaPorIdLocal(id) {
    const respuesta = await localApi.fisicoQuimico.obtenerPorId(id);

    if (!respuesta.success || !respuesta.data) {
        return null;
    }

    const detalles = await localApi.fisicoQuimicoDetalle.obtenerTodos({
        lectura_id: id
    });

    return mapearLecturaLocal(respuesta.data, detalles.success ? detalles.data : []);
}

/**
 * Obtiene TODAS las lecturas fisico quimicas locales, con sus
 * mediciones (ph/salinidad/temperatura/oxigenoDisuelto) ya
 * agrupadas por lectura. Equivalente local de getLecturas()
 * (web), usado por Reporteria para listar los registros sin
 * un id o fecha especifica.
 * @returns {Promise<Array<object>>} Lecturas en formato de la app.
 */
export async function getLecturasLocal() {
    const respuesta = await localApi.fisicoQuimico.obtenerTodos();

    if (!respuesta.success) {
        return [];
    }

    const cabeceras = respuesta.data || [];

    const lecturas = await Promise.all(
        cabeceras.map(async (cabecera) => {
            const detalles = await localApi.fisicoQuimicoDetalle.obtenerTodos({
                lectura_id: cabecera.id
            });

            return mapearLecturaLocal(cabecera, detalles.success ? detalles.data : []);
        })
    );

    return lecturas;
}

/**
 * Crea una lectura fisico quimica local con sus mediciones.
 * Valida datos y la regla de unicidad (grupoDatos, estanqueId,
 * fecha) antes de insertar. Equivalente local de guardarLectura
 * / crearLectura.
 * @param {object} datos - {fincaId, estanqueId, fecha, ph, salinidad, temperatura, oxigenoDisuelto}
 * @returns {Promise<object>} Lectura creada, ya con sus mediciones.
 */
export async function guardarLecturaLocal(datos) {
    const errores = validarLecturaFisicoQuimica(datos);

    if (errores.length > 0) {
        throw new Error(errores[0]);
    }

    const autoria = await obtenerAutoriaOffline();

    const existente = await buscarLecturaExistente(
        autoria.grupoDatos,
        datos.estanqueId,
        datos.fecha
    );

    if (existente) {
        throw new Error('Ya existe una lectura para ese estanque en esa fecha.');
    }

    const creada = await localApi.fisicoQuimico.crear({
        grupo_datos: autoria.grupoDatos,
        finca_id: datos.fincaId,
        estanque_id: datos.estanqueId,
        fecha_registro: datos.fecha,
        creado_por_usuario_id: null,
        creado_por_colaborador_id: autoria.colaboradorId
    });

    if (!creada.success) {
        throw new Error(creada.message || 'No se pudo crear la lectura local.');
    }

    await insertarDetallesLocal(creada.data.id, datos, autoria);

    return getLecturaPorIdLocal(creada.data.id);
}

/**
 * Actualiza una lectura existente y reemplaza TOTALMENTE sus
 * mediciones (borrado + insercion), igual que el PUT real del
 * backend. Equivalente local de actualizarLectura.
 * @param {number} id - Id local de fisico_quimico.
 * @param {object} datos - {fincaId, estanqueId, fecha, ph, salinidad, temperatura, oxigenoDisuelto}
 * @returns {Promise<object>} Lectura actualizada.
 */
export async function actualizarLecturaLocal(id, datos) {
    const errores = validarLecturaFisicoQuimica(datos);

    if (errores.length > 0) {
        throw new Error(errores[0]);
    }

    const autoria = await obtenerAutoriaOffline();

    const posibleDuplicado = await buscarLecturaExistente(
        autoria.grupoDatos,
        datos.estanqueId,
        datos.fecha,
        id
    );

    if (posibleDuplicado) {
        throw new Error('Ya existe otra lectura para ese estanque en esa fecha.');
    }

    const actualizada = await localApi.fisicoQuimico.actualizar(id, {
        finca_id: datos.fincaId,
        estanque_id: datos.estanqueId,
        fecha_registro: datos.fecha
    });

    if (!actualizada.success) {
        throw new Error(actualizada.message || 'No se pudo actualizar la lectura local.');
    }

    await borrarDetallesLocalFisico(id);
    await insertarDetallesLocal(id, datos, autoria);

    return getLecturaPorIdLocal(id);
}

/**
 * Elimina (soft-delete) una lectura local. Los detalles se
 * borran fisicamente porque no tienen ciclo de sync propio.
 * Equivalente local de eliminarLectura.
 * @param {number} id - Id local de fisico_quimico.
 * @returns {Promise<boolean>} true si se elimino correctamente.
 */
export async function eliminarLecturaLocal(id) {
    await borrarDetallesLocalFisico(id);

    const eliminada = await localApi.fisicoQuimico.eliminar(id);

    if (!eliminada.success) {
        throw new Error(eliminada.message || 'No se pudo eliminar la lectura local.');
    }

    return true;
}