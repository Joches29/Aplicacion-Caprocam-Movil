/**
 * ============================================================
 * HOOK EDICION DE RALEO
 * ============================================================
 *
 * Centraliza la lógica para editar registros locales de raleo
 * usando SQLite.
 *
 * RECONECTADO: la version "web" de este hook cargaba y guardaba
 * el registro con Raleo.service.js (HTTP). Se restaura el uso de
 * RaleoLocalService (SQLite), igual que useRaleoScreen.js para
 * crear, e igual que la version local original de este modulo.
 *
 * CORREGIDO: RaleoForm.jsx y este hook leian/escribian
 * `form.biomasaAntes`, un campo que no existe en el estado que
 * expone useRaleo.js (el campo real es `biomasaEstimada`). Se
 * unifica todo a `biomasaEstimada`.
 *
 * Mantiene la misma API que espera EditarRaleoScreen:
 *
 * - form
 * - updateField
 * - porcentajeRaleo
 * - biomasaRestante
 * - submitted
 * - errores
 * - alerta
 * - handleGuardar
 * - cargando
 *
 * Flujo:
 *
 * EditarRaleoScreen
 *        |
 *        ↓
 * useEditarRaleo
 *        |
 *        ↓
 * RaleoLocalService
 *        |
 *        ↓
 * SQLite
 *
 * ============================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import useRaleo from "./useRaleo";
import { calcularRaleo } from "./useRaleoScreen";

import RaleoLocalService from "../services/RaleoLocal.service";

import { localApi } from "../../../database/local/localApi.service";
import { useError } from "../../../shared/context/ErrorContext.js";

/*
============================================================
HELPERS
============================================================
*/

function obtenerValor(objeto, llaves, valorDefecto = null) {
    if (!objeto) return valorDefecto;
    for (let i = 0; i < llaves.length; i++) {
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

/*
============================================================
FECHAS
============================================================
*/

function formatearFechaUI(fecha) {
    if (!fecha) return "";
    if (
        typeof fecha === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(fecha)
    ) {
        const [anio, mes, dia] = fecha
            .slice(0, 10)
            .split("-");
        return `${dia}/${mes}/${anio}`;
    }
    return fecha;
}

function convertirFechaBackend(fecha) {
    if (!fecha) return "";
    if (
        fecha.includes("-") &&
        !fecha.includes("/")
    ) {
        return fecha.slice(0, 10);
    }
    const partes = fecha.split("/");
    if (partes.length !== 3) {
        return fecha;
    }
    const [dia, mes, anio] = partes;
    return `${anio}-${mes}-${dia}`;
}

/*
============================================================
MAPPER FORMULARIO
============================================================
*/

function registroAForm(registro) {
    if (!registro) return {};
    return {
        finca: String(
            obtenerValor(registro, ["fincaId", "finca_id"], "")
        ),
        estanque: String(
            obtenerValor(registro, ["estanqueId", "estanque_id"], "")
        ),
        fecha: formatearFechaUI(
            obtenerValor(registro, ["fecha"], "")
        ),
        biomasaEstimada: String(
            obtenerValor(
                registro,
                ["biomasaEstimada", "biomasa_estimada"],
                ""
            )
        ),
        kgRetirados: String(
            obtenerValor(
                registro,
                ["kgRetirados", "kg_retirados"],
                ""
            )
        ),
        observaciones: obtenerValor(
            registro,
            ["observaciones"],
            ""
        ),
    };
}

/*
============================================================
DTO UPDATE
============================================================
*/

function formADto(form, porcentajeRaleo, biomasaRestante) {
    /*
    Solo se envian los datos que el usuario captura mas los
    calculados (porcentaje y biomasa restante), calculados con
    la misma formula que en el alta (calcularRaleo), para que
    exista una sola fuente de verdad.
    */
    return {
        fincaId: Number(form.finca),
        estanqueId: Number(form.estanque),
        fecha: convertirFechaBackend(form.fecha),
        biomasaEstimada: Number(form.biomasaEstimada),
        kgRetirados: Number(form.kgRetirados),
        porcentaje: porcentajeRaleo !== "" ? Number(porcentajeRaleo) : null,
        biomasaRestante: biomasaRestante !== "" ? Number(biomasaRestante) : null,
        observaciones:
            form.observaciones?.trim()
                ? form.observaciones.trim()
                : "No se realizan observaciones",
    };
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/
export default function useEditarRaleo(
    registroId,
    onGuardado
) {
    const {
        form,
        updateField,
        validarForm
    } = useRaleo();

    const { mostrarError } = useError();

    const [
        submitted,
        setSubmitted
    ] = useState(false);
    const [
        errores,
        setErrores
    ] = useState({});
    const [
        alerta,
        setAlerta
    ] = useState({
        visible: false,
        variant: "success",
        mensaje: ""
    });
    const [
        cargando,
        setCargando
    ] = useState(true);

    /*
    ========================================================
    CARGAR REGISTRO
    ========================================================
    */

    useEffect(() => {
        let activo = true;
        async function cargarRegistro() {
            if (!registroId) {
                setCargando(false);
                return;
            }
            try {
                setCargando(true);
                await localApi.inicializar();
                const registro =
                    await RaleoLocalService.getById(
                        registroId
                    );
                if (
                    !activo ||
                    !registro
                ) {
                    return;
                }
                const datos =
                    registroAForm(registro);
                Object.entries(datos)
                    .forEach(
                        ([campo, valor]) => {
                            updateField(
                                campo,
                                valor
                            );
                        }
                    );
            }
            catch (error) {
                console.error(
                    "Error cargando raleo local:",
                    error
                );
                if (activo) {
                    setAlerta({
                        visible: true,
                        variant: "danger",
                        mensaje:
                            "No se pudo cargar el registro."
                    });
                }
            }
            finally {
                if (activo) {
                    setCargando(false);
                }
            }
        }
        cargarRegistro();
        return () => {
            activo = false;
        };
    }, [registroId]);

    /*
    ========================================================
    CALCULOS DEL RALEO
    ========================================================
    */
    const { porcentaje: porcentajeRaleo, biomasaRestante } = useMemo(
        () => calcularRaleo(form.biomasaEstimada, form.kgRetirados),
        [form.biomasaEstimada, form.kgRetirados]
    );

    /*
    ========================================================
    GUARDAR CAMBIOS
    ========================================================
    */

    const handleGuardar = useCallback(
        async () => {
            setSubmitted(true);

            const resultado =
                validarForm();

            setErrores(resultado.errores);
            if (!resultado.valido) {
                setAlerta({
                    visible: true,
                    variant: "danger",
                    mensaje:
                        "Rellene los datos requeridos correctamente."
                });
                return;
            }

            try {
                await RaleoLocalService.update(
                    registroId,
                    formADto(form, porcentajeRaleo, biomasaRestante)
                );
                setAlerta({
                    visible: true,
                    variant: "success",
                    mensaje:
                        "Raleo actualizado correctamente."
                });
                if (
                    typeof onGuardado === "function"
                ) {
                    onGuardado();
                }
            }
            catch (error) {
                console.error(
                    "Error actualizando raleo local:",
                    error
                );
                mostrarError?.(error);
                setAlerta({
                    visible: true,
                    variant: "danger",
                    mensaje:
                        "No se pudo actualizar el raleo."
                });
            }
        },
        [registroId, form, porcentajeRaleo, biomasaRestante, validarForm, onGuardado, mostrarError]);

    return {
        form,
        updateField,
        porcentajeRaleo,
        biomasaRestante,
        submitted,
        errores,
        alerta,
        handleGuardar,
        cargando
    };
}