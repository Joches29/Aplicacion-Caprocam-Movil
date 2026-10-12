/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: fisicoQuimicaSync.service.js
Autor: Brandon Valdelomar
Fecha: 04/08/2026
Modulo: Fisico Quimica (Movil)
Descripcion:
Servicio de sincronizacion PROPIO de este modulo (no usa el
motor generico de ENDPOINTS_SYNC porque el backend real exige
una unica peticion combinando cabecera + detalles anidados,
distinto a como esta mapeado /fisico-quimico y
/fisico-quimico-detalle por separado).

Reglas replicadas de localCrud.service.js (Gerald):
- accion_sync = "CREATE" hasta el primer sync exitoso.
- accion_sync = "UPDATE" en ediciones posteriores al primer sync.
- accion_sync = "DELETE" solo si el registro YA tenia servidor_id
  (ya habia sido sincronizado antes de borrarlo).
- Si se crea y se borra localmente ANTES de sincronizar nunca
  (accion_sync sigue en "CREATE" pero activo=0), el backend
  nunca se entero de que existio: no se le avisa, se descarta
  local nada mas.

Politica post-sync (EXCEPCION confirmada por Gerald, 24/08/2026):
Fisico-Quimica NO borra el registro local tras sincronizar; solo
lo marca con sincronizado=1. Es distinto al resto de los modulos
y es intencional: al existir seleccion de fecha, el formulario
necesita poder precargar lecturas pasadas desde SQLite. Si se
borraran, el formulario apareceria vacio para una fecha ya
sincronizada y al guardar el backend reemplazaria por completo
los detalles existentes (perdida silenciosa de datos).
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import api from '../../../api/api';
import { localApi } from '../../../database/local/localApi.service';

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const TABLA_LECTURA = 'fisico_quimico';

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
 * Lee los detalles de una lectura DIRECTO de SQLite (no de la
 * cola de pendientes) y arma el objeto de mediciones que
 * espera el backend.
 * @param {number} lecturaIdLocal - Id local de fisico_quimico.
 * @returns {Promise<object>} {ph, salinidad, temperatura, oxigenoDisuelto}
 */
async function obtenerMedicionesParaPayload(lecturaIdLocal) {
    const mediciones = { ph: [], salinidad: [], temperatura: [], oxigenoDisuelto: [] };

    const respuesta = await localApi.fisicoQuimicoDetalle.obtenerTodos({
        lectura_id: lecturaIdLocal
    });

    if (!respuesta.success) {
        return mediciones;
    }

    for (const fila of respuesta.data || []) {
        const campo = MAPA_TIPO_A_CAMPO[fila.tipo_medicion];

        if (!campo) {
            continue;
        }

        const medicion = {
            valor: Number(fila.valor),
            etiqueta: fila.etiqueta
        };

        if (fila.hora_medicion) {
            medicion.horaMedicion = fila.hora_medicion;
        }

        mediciones[campo].push(medicion);
    }

    return mediciones;
}

/**
 * Sincroniza una unica lectura pendiente, decidiendo la accion
 * correcta segun su estado local (activo/servidor_id/accion_sync).
 * @param {object} registro - Fila cruda de fisico_quimico.
 * @returns {Promise<object>} Resultado {id, resultado, servidorId?}
 */
async function sincronizarUnaLectura(registro) {
    const fueBorradaLocal = Number(registro.activo) === 0;
    const yaEstabaEnServidor = Boolean(registro.servidor_id);

    // Caso 1: se creo y se borro localmente sin llegar nunca al
    // backend. No hay nada que avisarle al servidor.
    if (fueBorradaLocal && !yaEstabaEnServidor) {
        await localApi.fisicoQuimico.marcarSincronizado(registro.id, null);
        return { id: registro.id, resultado: 'descartada_local' };
    }

    // Caso 2: baja de una lectura que ya existia en el servidor.
    if (fueBorradaLocal && yaEstabaEnServidor) {
        await api.delete(`/lecturasFisicoQuimicas/${registro.servidor_id}`);
        await localApi.fisicoQuimico.marcarSincronizado(
            registro.id,
            registro.servidor_id
        );
        return { id: registro.id, resultado: 'eliminada_servidor' };
    }

    // Caso 3 y 4: creacion o actualizacion pendiente.
    const mediciones = await obtenerMedicionesParaPayload(registro.id);
    const payload = {
        fincaId: registro.finca_id,
        estanqueId: registro.estanque_id,
        fecha: registro.fecha_registro,
        ...mediciones
    };

    let servidorId = registro.servidor_id;

    if (!yaEstabaEnServidor) {
        const respuesta = await api.post('/lecturasFisicoQuimicas', payload);
        servidorId = respuesta.data?.data?.id;
    } else {
        await api.put(`/lecturasFisicoQuimicas/${servidorId}`, payload);
    }

    await localApi.fisicoQuimico.marcarSincronizado(registro.id, servidorId);

    return { id: registro.id, resultado: 'sincronizada', servidorId };
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Sincroniza TODAS las lecturas fisico quimicas pendientes con
 * el backend. No aborta ante un error individual: sigue con las
 * demas y reporta cuales fallaron, para no bloquear el resto de
 * la subida por una sola lectura problematica.
 * @returns {Promise<object>} {exitosas: [], fallidas: []}
 */
export async function sincronizarFisicoQuimicaPendientes() {
    const resumen = { exitosas: [], fallidas: [] };

    const pendientes = await localApi.sync.obtenerPendientes();

    if (!pendientes.success) {
        return resumen;
    }

    const registrosPendientes = (pendientes.data || [])
        .filter((item) => item.tabla === TABLA_LECTURA)
        .map((item) => item.registro);

    for (const registro of registrosPendientes) {
        try {
            const resultado = await sincronizarUnaLectura(registro);
            resumen.exitosas.push(resultado);
        } catch (error) {
            resumen.fallidas.push({
                id: registro.id,
                error: error?.response?.data?.message || error.message
            });
        }
    }

    return resumen;
}