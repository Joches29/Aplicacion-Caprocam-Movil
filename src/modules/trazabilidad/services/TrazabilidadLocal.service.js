/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: TrazabilidadLocal.service.js
Modulo: Trazabilidad (Movil)
Descripcion:
Version SQLite offline-first del service de Trazabilidad.
Permite consultar el historial local y crear registros nuevos
pendientes de sincronizacion.
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

const obtenerDatosRespuesta = (respuesta) => {
    if (!respuesta || respuesta.success !== true) {
        return [];
    }

    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

const tieneValor = (valor) => {
    return valor !== undefined && valor !== null && String(valor).trim() !== "";
};

const convertirNumero = (valor) => {
    if (!tieneValor(valor)) {
        return null;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? null : numero;
};

const normalizarCampoAuditoria = (valor) => {
    const numero = convertirNumero(valor);

    return numero === null ? null : numero;
};

const normalizarGrupoDatos = (valor) => {
    const numero = convertirNumero(valor);

    return numero === null ? 1 : numero;
};

const mapearRegistroAVista = (registro) => {
    if (!registro) {
        return registro;
    }

    return {
        id: registro.id,
        servidorId: registro.servidor_id,
        servidor_id: registro.servidor_id,
        fincaId: registro.finca_id,
        finca_id: registro.finca_id,
        estanqueOrigenId: registro.estanque_origen_id,
        estanque_origen_id: registro.estanque_origen_id,
        estanqueDestinoId: registro.estanque_destino_id,
        estanque_destino_id: registro.estanque_destino_id,
        fecha: registro.fecha,
        tamano: registro.tamano,
        dias: registro.dias,
        pl: registro.pl,
        tipoMovimiento: registro.tipo_movimiento,
        tipo_movimiento: registro.tipo_movimiento,
        creadoPorUsuarioId: registro.creado_por_usuario_id,
        creado_por_usuario_id: registro.creado_por_usuario_id,
        creadoPorColaboradorId: registro.creado_por_colaborador_id,
        creado_por_colaborador_id: registro.creado_por_colaborador_id,
        pendienteSync: registro.pendiente_sync === 1,
        sincronizado: registro.sincronizado === 1,
        _crudo: registro
    };
};

const prepararDatosParaGuardar = async (datos) => {
    const camposAuditoria = await obtenerCamposAuditoria();

    return {
        finca_id: convertirNumero(datos.fincaId),
        estanque_origen_id: convertirNumero(datos.estanqueOrigenId),
        estanque_destino_id: convertirNumero(datos.estanqueDestinoId),
        fecha: datos.fecha,
        tamano: convertirNumero(datos.tamano),
        dias: convertirNumero(datos.dias),
        pl: convertirNumero(datos.pl),
        tipo_movimiento: TIPO_MOVIMIENTO_UNICO,
        grupo_datos: normalizarGrupoDatos(camposAuditoria.grupo_datos),
        creado_por_usuario_id: normalizarCampoAuditoria(camposAuditoria.creado_por_usuario_id),
        creado_por_colaborador_id: normalizarCampoAuditoria(camposAuditoria.creado_por_colaborador_id)
    };
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

export async function obtenerHistorialLocalCrudo() {
    const respuesta = await localApi.trazabilidad.obtenerTodos();

    return obtenerDatosRespuesta(respuesta);
}

export async function obtenerRegistrosLocal() {
    const crudos = await obtenerHistorialLocalCrudo();

    return crudos.map(mapearRegistroAVista);
}

export async function obtenerRegistroLocalPorId(id) {
    const respuesta = await localApi.trazabilidad.obtenerPorId(Number(id));

    if (!respuesta || respuesta.success !== true || !respuesta.data) {
        return null;
    }

    return mapearRegistroAVista(respuesta.data);
}

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

    const datosParaGuardar = await prepararDatosParaGuardar(datos);
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

export async function actualizarRegistroLocal() {
    throw new Error(
        "Trazabilidad no permite editar registros porque es un modulo historico."
    );
}

export async function eliminarRegistroLocal() {
    throw new Error(
        "Trazabilidad no permite eliminar registros porque es un modulo historico."
    );
}

export async function obtenerEstadoEstanqueLocal(estanqueId) {
    const historial = await obtenerHistorialLocalCrudo();

    return obtenerEstadoEstanque(estanqueId, historial);
}