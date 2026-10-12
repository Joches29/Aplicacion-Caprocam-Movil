/**
 * ============================================================
 * HOOK USESIEMBRAACTIVAESTANQUE
 * ============================================================
 *
 * Valida si el estanque seleccionado tiene una siembra activa
 * registrada en SQLite. Reutilizable entre módulos: hoy lo usan
 * Raleo y Alimentación; sigue el mismo criterio que ya usaba
 * Densidad Poblacional (DensidadPoblacionalLocal.service.js ->
 * obtenerDatosBaseEstanque), para no duplicar la búsqueda tres
 * veces con posibilidad de que se desincronicen.
 *
 * Criterio de "siembra activa": una fila en `siembras` con
 * estanque_id igual al elegido y estado === 'Activa' (comparación
 * insensible a mayúsculas).
 *
 * Parámetros:
 * - estanqueId: id del estanque seleccionado (o null/"").
 * - etiquetaRegistro: texto que completa el mensaje de error,
 *   ej. "el raleo", "la alimentación". Debe calzar con la
 *   redacción "...antes de guardar {etiquetaRegistro}.".
 *
 * Retorna:
 * - tieneSiembraActiva: true si hay siembra activa, o si aún no
 *   hay estanque elegido (no bloquea antes de tiempo).
 * - cargandoSiembraActiva: true mientras se consulta SQLite.
 * - mensajeErrorSiembra: mensaje a mostrar, o null si todo bien.
 *
 * Ejemplo:
 * const { tieneSiembraActiva, mensajeErrorSiembra } =
 *   useSiembraActivaEstanque(form.estanque, "el raleo");
 */

import { useEffect, useState } from "react";
import { localApi } from "../../database/local/localApi.service";

const obtenerDataRespuesta = (respuesta) =>
    respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
        ? respuesta.data
        : respuesta;

function obtenerValor(objeto, llaves, valorDefecto = null) {
    if (!objeto) return valorDefecto;
    for (let i = 0; i < llaves.length; i += 1) {
        const llave = llaves[i];
        if (
            Object.prototype.hasOwnProperty.call(objeto, llave) &&
            objeto[llave] !== undefined &&
            objeto[llave] !== null
        ) {
            return objeto[llave];
        }
    }
    return valorDefecto;
}

function construirMensaje(etiquetaRegistro) {
    return (
        "El estanque seleccionado no tiene una siembra real registrada. " +
        `Debe registrar una siembra antes de guardar ${etiquetaRegistro}.`
    );
}

export function useSiembraActivaEstanque(estanqueId, etiquetaRegistro = "este registro") {
    // Por defecto true: mientras no haya estanque elegido, o mientras
    // se resuelve la consulta, no se bloquea el guardado por esta
    // validación (el resto de validaciones del formulario ya cubren
    // "estanque obligatorio").
    const [tieneSiembraActiva, setTieneSiembraActiva] = useState(true);
    const [cargandoSiembraActiva, setCargandoSiembraActiva] = useState(false);
    const [mensajeErrorSiembra, setMensajeErrorSiembra] = useState(null);

    useEffect(() => {
        if (!estanqueId) {
            setTieneSiembraActiva(true);
            setMensajeErrorSiembra(null);
            return undefined;
        }

        let activo = true;

        (async () => {
            try {
                setCargandoSiembraActiva(true);
                await localApi.inicializar();

                const respuesta = await localApi.siembras.obtenerTodos();
                const data = obtenerDataRespuesta(respuesta);
                const siembras = Array.isArray(data) ? data : [];

                const hayActiva = siembras.some((siembra) => {
                    const idEstanqueSiembra = obtenerValor(
                        siembra,
                        ["estanque_id", "estanqueId"],
                        null
                    );
                    const estado = String(obtenerValor(siembra, ["estado"], "")).toLowerCase();

                    return (
                        Number(idEstanqueSiembra) === Number(estanqueId) && estado === "activa"
                    );
                });

                if (!activo) return;

                setTieneSiembraActiva(hayActiva);
                setMensajeErrorSiembra(hayActiva ? null : construirMensaje(etiquetaRegistro));
            } catch (error) {
                if (activo) {
                    // Si la validación falla, se bloquea por seguridad
                    // en vez de dejar pasar un registro sin verificar.
                    setTieneSiembraActiva(false);
                    setMensajeErrorSiembra(
                        error?.message || "No se pudo validar la siembra del estanque seleccionado."
                    );
                }
            } finally {
                if (activo) setCargandoSiembraActiva(false);
            }
        })();

        return () => {
            activo = false;
        };
    }, [estanqueId, etiquetaRegistro]);

    return { tieneSiembraActiva, cargandoSiembraActiva, mensajeErrorSiembra };
}

export default useSiembraActivaEstanque;