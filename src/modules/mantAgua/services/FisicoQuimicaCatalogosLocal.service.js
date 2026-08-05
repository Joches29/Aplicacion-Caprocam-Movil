/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: FisicoQuimicaCatalogosLocal.service.js
Autor: <tu nombre>
Fecha: 04/08/2026
Modulo: Fisico Quimica (Movil)
Descripcion:
Reemplaza la parte de FisicoQuimicaServices.js que traia
fincas/estanques del backend (api.get, fincaService). Los
catalogos ya estan descargados en SQLite por
descargarDatosInicialesLocal() (compartido, no se toca aqui),
asi que solo se consultan localmente.
//////////////////////////////////////////////////////////
*/

import { localApi } from '../../../database/local/localApi.service';
import { obtenerSesionOffline } from '../../../database/local/offlineAuth.service';

/**
 * Lista las fincas del grupo de datos de la sesion offline
 * activa, en el mismo formato {label, value} que usaba la
 * version que pegaba al backend.
 * @returns {Promise<Array<{label:string,value:number}>>} Opciones.
 */
export async function obtenerOpcionesFincasLocal() {
    const sesion = await obtenerSesionOffline();

    if (!sesion.success || !sesion.data?.grupoDatos) {
        return [];
    }

    const respuesta = await localApi.fincas.obtenerTodos({
        grupo_datos: sesion.data.grupoDatos
    });

    if (!respuesta.success) {
        return [];
    }

    return (respuesta.data || []).map((finca) => ({
        label: finca.nombre_finca,
        value: finca.id
    }));
}

/**
 * Lista los estanques de una finca local, mismo formato
 * {label, value} que la version que pegaba al backend.
 * @param {number} fincaId - Id local de la finca.
 * @returns {Promise<Array<{label:string,value:number}>>} Opciones.
 */
export async function obtenerEstanquesPorFincaLocal(fincaId) {
    if (!fincaId) {
        return [];
    }

    const respuesta = await localApi.estanques.obtenerTodos({
        finca_id: fincaId
    });

    if (!respuesta.success) {
        return [];
    }

    return (respuesta.data || []).map((estanque) => ({
        label: `${estanque.codigo} (${estanque.tipo_estanque})`,
        value: estanque.id
    }));
}