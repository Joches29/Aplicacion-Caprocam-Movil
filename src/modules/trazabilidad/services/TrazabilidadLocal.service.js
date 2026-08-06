/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: TrazabilidadLocal.service.js
Modulo: Trazabilidad (Movil)
Descripcion:
Version SQLite (offline-first) del service de Trazabilidad.
Reemplaza las llamadas HTTP directas por lectura/escritura en
la base local, siguiendo el mismo patron ya usado por Raleo
(RaleoLocal.service.js) y Fisico-Quimica.

Decisiones de diseno especificas de este modulo (documentadas
para el PR, pendientes de opinion del equipo):

1. Trazabilidad NO usa "eliminarRegistroLocalDespuesSync" tras
   subir un registro. La politica general del proyecto borra el
   residuo local apenas se sincroniza, para no llenar el
   telefono de datos viejos -- pero en Trazabilidad se necesita
   mantener el historial local para: (a) la pantalla de listado
   (debe mostrar lo descargado, con o sin conexion), y (b) la
   validacion de "estanque destino ocupado", que consulta el
   historial local en vez de un catalogo aparte. Como solo hay
   un colaborador por finca haciendo estos registros (respuesta
   del profesor, 05/08/2026), el historial local nunca crece sin
   control -- es acotado a esa finca.

2. Trazabilidad es CREATE-only contra el backend real (no hay
   PUT ni DELETE en /registrosTrazabilidad). Por eso
   actualizarRegistroLocal/eliminarRegistroLocal de este archivo
   estan bloqueados a proposito, no solo ausentes.

3. Este service depende de infraestructura de sesion que, al
   momento de escribir esto (05/08/2026), existe pero todavia
   no se llena en ningun lado del login (ver sessionUtils.js:
   nadie llama AsyncStorage.setItem para 'caprocam_colaborador
   _actual' / 'caprocam_grupo_datos' / 'caprocam_finca_id' hoy).
   Mientras eso no se conecte, grupo_datos cae al default (1) y
   creado_por_colaborador_id queda null. No es un bug de este
   modulo, es una dependencia del modulo Login que hay que
   avisar en el PR.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import { obtenerCamposAuditoria } from "../../../shared/utils/sessionUtils";
import {
    validarRegistroTrazabilidad,
    obtenerEstadoEstanque,
    TIPO_MOVIMIENTO_UNICO
} from "../validaciones/trazabilidad.validaciones";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Extrae el arreglo de datos de una respuesta local estandar.
 * @param {object} respuesta - Respuesta de localApi/localCrud.
 * @returns {Array} Arreglo de registros, o vacio si fallo.
 */
const obtenerDatosRespuesta = (respuesta) => {
    if (!respuesta || respuesta.success !== true) {
        return [];
    }

    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

/**
 * Convierte un registro de trazabilidad de SQLite (columnas en
 * snake_case) a la forma que ya consumen los hooks/pantallas
 * del modulo (camelCase), para no tener que tocar la UI.
 * @param {object} registro - Fila cruda de SQLite.
 * @returns {object} Registro en formato de vista.
 */
const mapearRegistroAVista = (registro) => {
    if (!registro) {
        return registro;
    }

    return {
        id: registro.id,
        servidorId: registro.servidor_id,
        fincaId: registro.finca_id,
        estanqueOrigenId: registro.estanque_origen_id,
        estanqueDestinoId: registro.estanque_destino_id,
        colaboradorId: registro.colaborador_id,
        fecha: registro.fecha,
        tamano: registro.tamano,
        dias: registro.dias,
        pl: registro.pl,
        tipoMovimiento: registro.tipo_movimiento,
        creadoPorUsuarioId: registro.creado_por_usuario_id,
        creadoPorColaboradorId: registro.creado_por_colaborador_id,
        pendienteSync: registro.pendiente_sync === 1,
        sincronizado: registro.sincronizado === 1,
        // Se conservan las columnas crudas por si algun consumidor
        // futuro las necesita (por ejemplo, validaciones de ocupacion
        // que trabajan directo contra el formato SQLite).
        _crudo: registro
    };
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene el historial local de trazabilidad tal como esta
 * en SQLite (formato crudo, snake_case). Usado internamente
 * para validar ocupacion de estanques.
 * @returns {Promise<Array<object>>} Historial local crudo.
 */
export async function obtenerHistorialLocalCrudo() {
    const respuesta = await localApi.trazabilidad.obtenerTodos();

    return obtenerDatosRespuesta(respuesta);
}

/**
 * Obtiene el historial local de trazabilidad, mapeado a
 * formato de vista (camelCase), ordenado del mas reciente
 * al mas antiguo (igual que hacia el listado via API).
 * @returns {Promise<Array<object>>} Historial en formato de vista.
 */
export async function obtenerRegistrosLocal() {
    const crudos = await obtenerHistorialLocalCrudo();

    return crudos.map(mapearRegistroAVista);
}

/**
 * Obtiene un registro local por su id (id local de SQLite,
 * no servidor_id -- funciona igual haya o no sincronizado).
 * @param {number} id - Id local del registro.
 * @returns {Promise<object|null>} Registro en formato de vista.
 */
export async function obtenerRegistroLocalPorId(id) {
    const respuesta = await localApi.trazabilidad.obtenerPorId(Number(id));

    if (!respuesta || respuesta.success !== true || !respuesta.data) {
        return null;
    }

    return mapearRegistroAVista(respuesta.data);
}

/**
 * Crea un registro de trazabilidad local, pendiente de
 * sincronizar. Revalida campos y la regla de "estanque
 * destino ocupado" contra el historial local antes de
 * insertar (ver cabecera de archivo, punto 1).
 * @param {object} datos - {fincaId, estanqueOrigenId,
 * estanqueDestinoId, colaboradorId, fecha, tamano, dias, pl}
 * (fecha ya en formato YYYY-MM-DD).
 * @returns {Promise<object>} {exito, errores, registro}.
 */
export async function crearRegistroLocal(datos = {}) {
    const historial = await obtenerHistorialLocalCrudo();
    const errores = validarRegistroTrazabilidad(datos, historial);

    if (errores.length > 0) {
        return {
            exito: false,
            errores,
            registro: null
        };
    }

    const camposAuditoria = await obtenerCamposAuditoria();

    const datosParaGuardar = {
        finca_id: Number(datos.fincaId),
        estanque_origen_id: Number(datos.estanqueOrigenId),
        estanque_destino_id: Number(datos.estanqueDestinoId),
        colaborador_id: datos.colaboradorId ? Number(datos.colaboradorId) : null,
        fecha: datos.fecha,
        tamano: Number(datos.tamano),
        dias: Number(datos.dias),
        pl: Number(datos.pl),
        tipo_movimiento: TIPO_MOVIMIENTO_UNICO,
        grupo_datos: camposAuditoria.grupo_datos,
        creado_por_usuario_id: camposAuditoria.creado_por_usuario_id,
        creado_por_colaborador_id: camposAuditoria.creado_por_colaborador_id
    };

    const respuesta = await localApi.trazabilidad.crear(datosParaGuardar);

    if (!respuesta || respuesta.success !== true) {
        return {
            exito: false,
            errores: [respuesta?.message || "No se pudo guardar el registro local."],
            registro: null
        };
    }

    return {
        exito: true,
        errores: [],
        registro: mapearRegistroAVista(respuesta.data)
    };
}

/**
 * Bloqueado a proposito: Trazabilidad es historico, el
 * backend real no tiene PUT para /registrosTrazabilidad. No
 * se debe permitir editar un registro ya creado, ni siquiera
 * localmente, para no generar un accion_sync=UPDATE que el
 * backend rechazaria al sincronizar.
 * @throws {Error} Siempre. Esta operacion no esta permitida.
 */
export async function actualizarRegistroLocal() {
    throw new Error(
        "Trazabilidad no permite editar registros: es un modulo " +
        "historico y el backend real no tiene PUT para " +
        "/registrosTrazabilidad."
    );
}

/**
 * Bloqueado a proposito: mismo motivo que
 * actualizarRegistroLocal, el backend real no tiene DELETE
 * para /registrosTrazabilidad.
 * @throws {Error} Siempre. Esta operacion no esta permitida.
 */
export async function eliminarRegistroLocal() {
    throw new Error(
        "Trazabilidad no permite eliminar registros: es un " +
        "modulo historico y el backend real no tiene DELETE " +
        "para /registrosTrazabilidad."
    );
}

/**
 * Devuelve el estado de ocupacion ("ocupado"/"libre") de un
 * estanque, consultando el historial local. Expuesto por si
 * la UI quiere mostrarlo antes del envio del formulario (por
 * ejemplo, deshabilitar un estanque destino en el selector).
 * @param {number} estanqueId - Id del estanque a revisar.
 * @returns {Promise<"ocupado"|"libre">} Estado del estanque.
 */
export async function obtenerEstadoEstanqueLocal(estanqueId) {
    const historial = await obtenerHistorialLocalCrudo();

    return obtenerEstadoEstanque(estanqueId, historial);
}
