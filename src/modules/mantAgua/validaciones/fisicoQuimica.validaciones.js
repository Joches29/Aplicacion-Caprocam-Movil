/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: fisicoQuimica.validaciones.js
Autor: Brandon Valdelomar
Fecha: 03/08/2026
Modulo: Fisico Quimica (Movil)
Descripcion:
Reglas de negocio del modulo Fisico-Quimica reimplementadas
del lado del cliente. Espejo de fisicoQuimica.service.js y
fisicoQuimica.middleware.js del backend real, porque en
movil no hay backend en el camino inmediato (se trabaja
contra SQLite local).
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const TIPOS_MEDICION_VALIDOS = ['ph', 'salinidad', 'temperatura', 'oxigenoDisuelto'];

// Formato 24h HH:MM o HH:MM:SS, mismo criterio que el backend
// (services/fisicoQuimica.service.js).
const HORA_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Verifica si un valor esta vacio.
 * @param {*} valor - Valor a revisar.
 * @returns {boolean} true si esta vacio.
 */
export function isEmpty(valor) {
    if (valor === undefined || valor === null) {
        return true;
    }

    if (typeof valor === 'string' && valor.trim().length === 0) {
        return true;
    }

    return false;
}

/**
 * Valida que un valor sea numerico y finito.
 * @param {*} valor - Valor a validar.
 * @returns {boolean} true si es numerico.
 */
export function isNumeroValido(valor) {
    if (isEmpty(valor)) {
        return false;
    }

    return Number.isFinite(Number(valor));
}

/**
 * Valida que un valor sea numerico, entero y mayor a cero.
 * @param {*} valor - Valor a validar.
 * @returns {boolean} true si es valido.
 */
export function isIdValido(valor) {
    if (!isNumeroValido(valor)) {
        return false;
    }

    const numero = Number(valor);

    return Number.isInteger(numero) && numero > 0;
}

/**
 * Valida que una fecha tenga formato YYYY-MM-DD, sea real
 * y no sea posterior a la fecha actual. Mismo criterio
 * exacto que isFechaValida del backend.
 * @param {string} fecha - Fecha a validar.
 * @returns {boolean} true si es valida.
 */
export function isFechaValida(fecha) {
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const fechaIngresada = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(fechaIngresada.getTime())) {
        return false;
    }

    if (fechaIngresada.toISOString().slice(0, 10) !== fecha) {
        return false;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return fechaIngresada <= hoy;
}

/**
 * Valida la estructura de una medicion individual.
 * @param {object} medicion - Objeto {valor, etiqueta}.
 * @returns {boolean} true si es valida.
 */
export function isHoraValida(hora) {
    if (typeof hora !== 'string') {
        return false;
    }

    return HORA_REGEX.test(hora.trim());
}

/**
 * Valida la estructura de una medicion individual.
 * @param {object} medicion - Objeto {valor, etiqueta, horaMedicion}.
 * @param {boolean} requiereHora - Si true, horaMedicion es obligatoria.
 * @returns {boolean} true si es valida.
 */
export function isMedicionValida(medicion, requiereHora = false) {
    if (!medicion || typeof medicion !== 'object' || Array.isArray(medicion)) {
        return false;
    }

    if (!isNumeroValido(medicion.valor)) {
        return false;
    }

    if (isEmpty(medicion.etiqueta)) {
        return false;
    }

    const hora = medicion.horaMedicion;

    if (requiereHora) {
        return isHoraValida(hora);
    }

    // Hora opcional: si viene, debe ser valida.
    if (!isEmpty(hora) && !isHoraValida(hora)) {
        return false;
    }

    return true;
}

/**
 * Valida un arreglo de mediciones. Los arreglos vacios son
 * validos (parametro no registrado ese dia).
 * @param {Array} arreglo - Arreglo de mediciones.
 * @returns {boolean} true si el arreglo es valido o vacio.
 */
export function isArrayMedicionesValido(arreglo, requiereHora = false) {
    if (!Array.isArray(arreglo)) {
        return false;
    }

    if (arreglo.length === 0) {
        return true;
    }

    return arreglo.every((medicion) => isMedicionValida(medicion, requiereHora));
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Valida una lectura fisico quimica completa antes de
 * guardarla localmente. Junta TODOS los errores encontrados
 * (util para mostrar feedback offline mas completo que un
 * solo mensaje).
 * @param {object} lectura - {fincaId, estanqueId, fecha, ph, salinidad, temperatura, oxigenoDisuelto}
 * @returns {string[]} Lista de errores. Vacia si es valida.
 */
export function validarLecturaFisicoQuimica(lectura = {}) {
    const errores = [];
    const {
        fincaId,
        estanqueId,
        fecha,
        ph = [],
        salinidad = [],
        temperatura = [],
        oxigenoDisuelto = []
    } = lectura;

    if (!isIdValido(fincaId)) {
        errores.push('El fincaId no es valido.');
    }

    if (!isIdValido(estanqueId)) {
        errores.push('El estanqueId no es valido.');
    }

    if (!isFechaValida(fecha)) {
        errores.push('La fecha no es valida.');
    }

    const totalMediciones =
        (ph?.length || 0) +
        (salinidad?.length || 0) +
        (temperatura?.length || 0) +
        (oxigenoDisuelto?.length || 0);

    if (totalMediciones === 0) {
        errores.push('Debe incluir al menos una medicion.');
    }

    if (!isArrayMedicionesValido(ph)) {
        errores.push('El ph debe contener mediciones validas.');
    }

    if (!isArrayMedicionesValido(salinidad)) {
        errores.push('La salinidad debe contener mediciones validas.');
    }

    if (!isArrayMedicionesValido(temperatura)) {
        errores.push('La temperatura debe contener mediciones validas.');
    }

    // Oxigeno es el unico que exige hora, igual que el backend
    // (isOxigeno -> isArrayValido(oxigenoDisuelto, true)).
    if (!isArrayMedicionesValido(oxigenoDisuelto, true)) {
        errores.push(
            'Cada medicion de oxigeno disuelto requiere una hora valida (HH:MM).'
        );
    }

    return errores;
}

export { TIPOS_MEDICION_VALIDOS, HORA_REGEX };