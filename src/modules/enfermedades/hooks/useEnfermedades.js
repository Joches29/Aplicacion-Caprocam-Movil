/**
 * =============================================================
 * HOOK DE ENFERMEDADES
 * =============================================================
 *
 * Centraliza el estado y las operaciones locales
 * correspondientes al modulo de enfermedades.
 *
 * Trabaja contra SQLite usando EnfermedadesLocalService.
 */

import { useEffect, useState } from "react";

import { useError } from "../../../shared/context/ErrorContext";
import EnfermedadesLocalService from "../services/EnfermedadesLocal.service";

/*
============================================================
CONSTANTES
============================================================
*/

const RESUMEN_INICIAL = {
    totalCasos: 0,
    enfermedadesFrecuentes: [],
    severidadesFrecuentes: [],
};

/*
============================================================
HELPERS
============================================================
*/

const obtenerArraySeguro = (valor) => {
    if (Array.isArray(valor)) {
        return valor;
    }

    return [];
};

const obtenerResumenSeguro = (valor) => {
    if (valor && typeof valor === "object") {
        return {
            totalCasos: valor.totalCasos ?? 0,
            enfermedadesFrecuentes: obtenerArraySeguro(
                valor.enfermedadesFrecuentes
            ),
            severidadesFrecuentes: obtenerArraySeguro(
                valor.severidadesFrecuentes
            ),
        };
    }

    return RESUMEN_INICIAL;
};

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export default function useEnfermedades() {
    const { mostrarError } = useError();

    const [enfermedades, setEnfermedades] = useState([]);
    const [resumen, setResumen] = useState(RESUMEN_INICIAL);
    const [catalogoEnfermedades, setCatalogoEnfermedades] = useState([]);
    const [catalogoSeveridades, setCatalogoSeveridades] = useState([]);
    const [loading, setLoading] = useState(false);

    async function cargarDatos() {
        try {
            setLoading(true);

            const [
                registros,
                resumenLocal,
                enfermedadesCatalogo,
                severidadesCatalogo,
            ] = await Promise.all([
                EnfermedadesLocalService.getAll(),
                EnfermedadesLocalService.getResumenDashboard(),
                EnfermedadesLocalService.getCatalogo(),
                EnfermedadesLocalService.getCatalogoSeveridades(),
            ]);

            setEnfermedades(obtenerArraySeguro(registros));
            setResumen(obtenerResumenSeguro(resumenLocal));
            setCatalogoEnfermedades(obtenerArraySeguro(enfermedadesCatalogo));
            setCatalogoSeveridades(obtenerArraySeguro(severidadesCatalogo));
        } catch (error) {
            console.error("Error al cargar enfermedades locales", error);
            mostrarError(error);
        } finally {
            setLoading(false);
        }
    }

    async function buscarEnfermedad(id) {
        try {
            setLoading(true);

            return await EnfermedadesLocalService.getById(id);
        } catch (error) {
            console.error("Error al buscar la enfermedad local", error);
            mostrarError(error);

            return null;
        } finally {
            setLoading(false);
        }
    }

    async function guardarEnfermedad(registro) {
        try {
            setLoading(true);

            const nuevaEnfermedad = await EnfermedadesLocalService.create(
                registro
            );

            await cargarDatos();

            return nuevaEnfermedad;
        } catch (error) {
            console.error("Error al guardar la enfermedad local", error);
            mostrarError(error);

            return null;
        } finally {
            setLoading(false);
        }
    }

    async function actualizarEnfermedad(id, registro) {
        try {
            setLoading(true);

            const enfermedadActualizada = await EnfermedadesLocalService.update(
                id,
                registro
            );

            await cargarDatos();

            return enfermedadActualizada;
        } catch (error) {
            console.error("Error al actualizar la enfermedad local", error);
            mostrarError(error);

            return null;
        } finally {
            setLoading(false);
        }
    }

    async function eliminarEnfermedad(id) {
        try {
            setLoading(true);

            const enfermedadEliminada = await EnfermedadesLocalService.deleteById(
                id
            );

            await cargarDatos();

            return enfermedadEliminada;
        } catch (error) {
            console.error("Error al eliminar la enfermedad local", error);
            mostrarError(error);

            return null;
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    return {
        enfermedades,
        resumen,
        catalogoEnfermedades,
        catalogoSeveridades,
        loading,

        recargar: cargarDatos,
        buscarEnfermedad,
        guardarEnfermedad,
        actualizarEnfermedad,
        eliminarEnfermedad,
    };
}