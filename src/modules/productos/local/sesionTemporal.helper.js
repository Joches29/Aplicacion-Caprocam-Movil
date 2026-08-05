/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sesionTemporal.helper.js
Modulo: Productos (uso temporal, no exclusivo del modulo)
Descripcion:
Resuelve grupoDatos/colaborador para escrituras locales de
Productos mientras no hay un flujo de login real conectado a este
service. Usa sesion offline real si existe; si no, cae a un
grupoDatos de prueba fijo (1001, el mismo que usa el colaborador
de prueba real "Gerald Alfaro" creado por
database/local/testLocalDb.service.js).
//////////////////////////////////////////////////////////
*/

import { obtenerSesionOffline } from "../../../database/local/offlineAuth.service";

// Confirmado en log real: Gerald Alfaro se crea con grupo_datos 1001.
const GRUPO_DATOS_TEMPORAL = 1001;

export const obtenerContextoLocal = async () => {
    try {
        const sesion = await obtenerSesionOffline();

        if (sesion?.success && sesion.data?.grupoDatos) {
            return {
                grupoDatos: sesion.data.grupoDatos,
                colaboradorId: sesion.data.colaborador?.id ?? null,
                esTemporal: false
            };
        }
    } catch (err) {
        console.log("No se pudo leer sesion offline real, usando temporal:", err);
    }

    return {
        grupoDatos: GRUPO_DATOS_TEMPORAL,
        colaboradorId: null,
        esTemporal: true
    };
};