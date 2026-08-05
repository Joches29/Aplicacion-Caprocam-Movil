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

Politica post-sync (confirmada por Gerald para Fisicoquimicos,
04/08/2026): tras sincronizar con exito, se borra el registro
local con eliminarRegistroLocalDespuesSync (no se conserva con
sincronizado=1).
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import api from '../../../api/api';
import { localApi } from '../../../database/local/localApi.service';
import { eliminarRegistroLocalDespuesSync } from '../../../database/local/localCrud.service';

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

        mediciones[campo].push({
            valor: Number(fila.valor),
            etiqueta: fila.etiqueta
        });
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
        await eliminarRegistroLocalDespuesSync(TABLA_LECTURA, registro.id);
        return { id: registro.id, resultado: 'descartada_local' };
    }

    // Caso 2: baja de una lectura que ya existia en el servidor.
    if (fueBorradaLocal && yaEstabaEnServidor) {
        await api.delete(`/lecturasFisicoQuimicas/${registro.servidor_id}`);
        await eliminarRegistroLocalDespuesSync(TABLA_LECTURA, registro.id);
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
    await eliminarRegistroLocalDespuesSync(TABLA_LECTURA, registro.id);

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