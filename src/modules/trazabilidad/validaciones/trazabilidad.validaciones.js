/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: trazabilidad.validaciones.js
Modulo: Trazabilidad (Movil)
Descripcion:
Reglas de negocio del modulo Trazabilidad reimplementadas del
lado del cliente. Espejo de trazabilidad.service.js /
trazabilidad.middleware.js del backend real, porque en movil
no hay backend en el camino inmediato (se trabaja contra
SQLite local).

IMPORTANTE:
Trazabilidad es un modulo historico: el backend real NO tiene
PUT ni DELETE para /registrosTrazabilidad (no se edita ni se
borra un movimiento ya creado, ni fisica ni logicamente). Por
eso este archivo no valida "actualizar" ni "eliminar": esas
acciones estan bloqueadas explicitamente en TrazabilidadLocal
.service.js, no solo omitidas por falta de pantalla.

Cambio de schema (Gerald, 05/08/2026): ya no se valida
colaboradorId como campo de negocio, porque la columna
colaborador_id se elimino de la tabla trazabilidad. Quien
crea el registro se resuelve por auditoria (creado_por_
usuario_id / creado_por_colaborador_id), no por un campo
del formulario.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const TIPO_MOVIMIENTO_UNICO = "SIEMBRA";

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

    if (typeof valor === "string" && valor.trim().length === 0) {
        return true;
    }

    return false;
}

/**
 * Valida que un valor sea numerico, entero y mayor a cero.
 * Mismo criterio que isIdValido del backend real.
 * @param {*} valor - Valor a validar.
 * @returns {boolean} true si es un id valido.
 */
export function isIdValido(valor) {
    if (isEmpty(valor)) {
        return false;
    }

    const numero = Number(valor);

    return Number.isInteger(numero) && numero > 0;
}

/**
 * Valida que un valor sea numerico, finito y mayor a cero.
 * Usado para tamano, dias y pl.
 * @param {*} valor - Valor a validar.
 * @returns {boolean} true si es valido.
 */
export function isNumeroPositivo(valor) {
    if (isEmpty(valor)) {
        return false;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) && numero > 0;
}

/**
 * Valida que una fecha tenga formato YYYY-MM-DD, sea real y
 * no sea posterior a la fecha actual (se permiten fechas
 * pasadas, no futuras). Mismo criterio que isFechaValida
 * usado en Fisico-Quimica, para mantener el mismo estandar de
 * validacion de fecha en todo el proyecto.
 *
 * NOTA (06/08/2026): se probo restringir esto a "solo hoy"
 * por pedido inicial, pero se revirtio -- la regla real es
 * "no futura", igual que el resto del proyecto. El problema
 * de que la fecha de hoy no se guardaba solo no era de esta
 * validacion: era el bug cosmetico de DateInput.jsx (ver
 * TrazabilidadData.js, que ya arranca con getCurrentDate()
 * real en vez de "").
 * @param {string} fecha - Fecha a validar (YYYY-MM-DD).
 * @returns {boolean} true si es valida.
 */
export function isFechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
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

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Valida los campos de un registro de trazabilidad antes de
 * guardarlo localmente. Junta TODOS los errores encontrados
 * (feedback offline mas completo que un solo mensaje).
 * @param {object} datos - {fincaId, estanqueOrigenId,
 * estanqueDestinoId, colaboradorId, fecha, tamano, dias, pl}
 * @returns {string[]} Lista de errores. Vacia si es valido.
 */
export function validarCamposRegistro(datos = {}) {
    const errores = [];
    const {
        fincaId,
        estanqueOrigenId,
        estanqueDestinoId,
        fecha,
        tamano,
        dias,
        pl
    } = datos;

    if (!isIdValido(fincaId)) {
        errores.push("El fincaId no es valido.");
    }

    if (!isIdValido(estanqueOrigenId)) {
        errores.push("El estanqueOrigenId no es valido.");
    }

    if (!isIdValido(estanqueDestinoId)) {
        errores.push("El estanqueDestinoId no es valido.");
    }

    if (
        isIdValido(estanqueOrigenId) &&
        isIdValido(estanqueDestinoId) &&
        Number(estanqueOrigenId) === Number(estanqueDestinoId)
    ) {
        errores.push(
            "El estanque de origen no puede ser igual al de destino."
        );
    }

    if (!isFechaValida(fecha)) {
        errores.push("La fecha no es valida o es una fecha futura.");
    }

    if (!isNumeroPositivo(tamano)) {
        errores.push("El tamano debe ser un numero mayor a 0.");
    }

    if (!isNumeroPositivo(dias)) {
        errores.push("Los dias deben ser un numero mayor a 0.");
    }

    if (!isNumeroPositivo(pl)) {
        errores.push("El PL debe ser un numero mayor a 0.");
    }

    return errores;
}

/**
 * Determina el estado de ocupacion de un estanque a partir
 * del historial local de movimientos de trazabilidad.
 *
 * Regla (espejo de la regla real del backend): se busca el
 * ultimo movimiento (por fecha, luego por id) en el que el
 * estanque participa, ya sea como origen o como destino.
 * - Si el ultimo rol fue "destino": el estanque quedo
 *   ocupado (algo llego ahi y no se ha movido despues).
 * - Si el ultimo rol fue "origen", o el estanque nunca
 *   aparece en el historial: se considera libre.
 *
 * NOTA: esta funcion es "mejor esfuerzo" en un dispositivo
 * offline. Segun la respuesta del profesor (05/08/2026), solo
 * hay un colaborador por finca haciendo registros de
 * trazabilidad, por lo que no aplica el problema de
 * concurrencia entre dispositivos que se habia planteado
 * antes -- el historial local de ese colaborador ES, en la
 * practica, el historial completo relevante para su finca.
 *
 * @param {number} estanqueId - Id del estanque a revisar.
 * @param {Array<object>} historial - Movimientos locales de
 * trazabilidad (formato SQLite: estanque_origen_id,
 * estanque_destino_id, fecha).
 * @returns {"ocupado"|"libre"} Estado del estanque.
 */
export function obtenerEstadoEstanque(estanqueId, historial = []) {
    const id = Number(estanqueId);

    const movimientosDelEstanque = (historial || [])
        .filter((registro) => {
            return (
                Number(registro.estanque_origen_id) === id ||
                Number(registro.estanque_destino_id) === id
            );
        })
        .slice()
        .sort((a, b) => {
            const fechaA = String(a.fecha || "");
            const fechaB = String(b.fecha || "");

            if (fechaA !== fechaB) {
                return fechaA.localeCompare(fechaB);
            }

            return Number(a.id || 0) - Number(b.id || 0);
        });

    if (movimientosDelEstanque.length === 0) {
        return "libre";
    }

    const ultimoMovimiento =
        movimientosDelEstanque[movimientosDelEstanque.length - 1];

    if (Number(ultimoMovimiento.estanque_destino_id) === id) {
        return "ocupado";
    }

    return "libre";
}

/**
 * Valida que el estanque de destino este disponible para
 * recibir un nuevo movimiento, contra el historial local.
 * @param {number} estanqueDestinoId - Id del estanque destino.
 * @param {Array<object>} historial - Historial local de
 * trazabilidad.
 * @returns {string[]} Lista de errores. Vacia si esta libre.
 */
export function validarEstanqueDestinoDisponible(estanqueDestinoId, historial = []) {
    const estado = obtenerEstadoEstanque(estanqueDestinoId, historial);

    if (estado === "ocupado") {
        return [
            "El estanque de destino ya esta ocupado por otro " +
            "movimiento sin liberar. Este dispositivo valida " +
            "contra su propio historial local; si el servidor " +
            "tiene informacion mas reciente, la sincronizacion " +
            "puede rechazar igual este registro."
        ];
    }

    return [];
}

/**
 * Valida un registro de trazabilidad completo antes de
 * guardarlo localmente: campos + regla de ocupacion.
 * @param {object} datos - Datos del formulario.
 * @param {Array<object>} historial - Historial local de
 * trazabilidad, para validar ocupacion.
 * @returns {string[]} Lista de errores. Vacia si es valido.
 */
export function validarRegistroTrazabilidad(datos = {}, historial = []) {
    const erroresCampos = validarCamposRegistro(datos);

    if (erroresCampos.length > 0) {
        return erroresCampos;
    }

    return validarEstanqueDestinoDisponible(datos.estanqueDestinoId, historial);
}

export { TIPO_MOVIMIENTO_UNICO };