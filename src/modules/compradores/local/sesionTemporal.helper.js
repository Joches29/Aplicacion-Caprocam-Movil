/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sesionTemporal.helper.js
Modulo: Compradores (uso temporal, no exclusivo del modulo)
Descripcion:
Resuelve grupoDatos/colaborador para escrituras locales
mientras no existe un flujo de login real (sin JWT todavia).
Intenta usar la sesion offline real si ya existe; si no,
cae a un grupoDatos de prueba fijo (mismo que usa Gerald en
su script de prueba: testLocalDb.service.js).

IMPORTANTE:
Esto es un parche temporal para poder probar el modulo de
Compradores de punta a punta sin login. Cuando Rodolfo termine
la migracion de api.js/login real, esta funcion deberia dejar
de usar el fallback fijo y depender solo de obtenerSesionOffline().
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { obtenerSesionOffline } from "../../../database/local/offlineAuth.service";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

// Mismo grupoDatos que usa Gerald en su script de prueba local.
// TEMPORAL: quitar cuando exista sesion real.
const GRUPO_DATOS_TEMPORAL = 1001;

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Descripcion:
 * Obtiene el contexto de sesion (grupoDatos, colaboradorId) para
 * usar en escrituras locales. Usa sesion offline real si existe;
 * si no, cae a un grupoDatos temporal fijo para poder probar.
 *
 * Parametros:
 * - Ninguno.
 *
 * Retorna:
 * - Objeto { grupoDatos, colaboradorId, esTemporal }.
 */
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

    // TEMPORAL: no hay sesion real todavia (no hay JWT, no hay login
    // offline probado). Se usa un grupoDatos fijo para poder seguir
    // trabajando y probando el modulo mientras tanto.
    return {
        grupoDatos: GRUPO_DATOS_TEMPORAL,
        colaboradorId: null,
        esTemporal: true
    };
};