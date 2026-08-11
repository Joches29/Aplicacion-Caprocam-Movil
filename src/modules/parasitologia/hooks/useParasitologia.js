/**
 * ============================================================
 * HOOK DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza el estado y las operaciones locales
 * correspondientes al modulo de parasitologia.
 *
 * Trabaja contra SQLite usando ParasitologiaLocalService.
 */

import { useEffect, useState } from "react";

import { useError } from "../../../shared/context/ErrorContext";
import ParasitologiaLocalService from "../services/ParasitologiaLocal.service";

/*
============================================================
CONSTANTES
============================================================
*/

const RESUMEN_INICIAL = {
    totalRegistros: 0,
    parasitosFrecuentes: [],
    gradosFrecuentes: [],
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
    if (!valor || typeof valor !== "object") {
        return RESUMEN_INICIAL;
    }

    return {
        ...RESUMEN_INICIAL,
        ...valor,
        parasitosFrecuentes: obtenerArraySeguro(valor.parasitosFrecuentes),
        gradosFrecuentes: obtenerArraySeguro(valor.gradosFrecuentes),
    };
};

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export default function useParasitologia() {
    const { mostrarError } = useError();

    const [registrosParasitologia, setRegistrosParasitologia] = useState([]);
    const [resumen, setResumen] = useState(RESUMEN_INICIAL);
    const [catalogoParasitos, setCatalogoParasitos] = useState([]);
    const [catalogoGrados, setCatalogoGrados] = useState([]);
    const [loading, setLoading] = useState(false);

    async function cargarDatos() {
        try {
            setLoading(true);

            const [
                registros,
                resumenLocal,
                catalogo,
                grados,
            ] = await Promise.all([
                ParasitologiaLocalService.getAll(),
                ParasitologiaLocalService.getResumenDashboard(),
                ParasitologiaLocalService.getCatalogo(),
                ParasitologiaLocalService.getCatalogoGrados(),
            ]);

            setRegistrosParasitologia(obtenerArraySeguro(registros));
            setResumen(obtenerResumenSeguro(resumenLocal));
            setCatalogoParasitos(obtenerArraySeguro(catalogo));
            setCatalogoGrados(obtenerArraySeguro(grados));
        } catch (error) {
            console.error("Error al cargar parasitologias locales", error);
            mostrarError(error);
        } finally {
            setLoading(false);
        }
    }

    async function buscarRegistro(id) {
        try {
            setLoading(true);

            return await ParasitologiaLocalService.getById(id);
        } catch (error) {
            console.error("Error al buscar parasitologia local", error);
            mostrarError(error);
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function guardarRegistro(registro) {
        try {
            setLoading(true);

            const nuevoRegistro = await ParasitologiaLocalService.create(
                registro
            );

            await cargarDatos();

            return nuevoRegistro;
        } catch (error) {
            console.error("Error al guardar parasitologia local", error);
            mostrarError(error);
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function actualizarRegistro(id, registro) {
        try {
            setLoading(true);

            const registroActualizado =
                await ParasitologiaLocalService.update(
                    id,
                    registro
                );

            await cargarDatos();

            return registroActualizado;
        } catch (error) {
            console.error("Error al actualizar parasitologia local", error);
            mostrarError(error);
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function eliminarRegistro(id) {
        try {
            setLoading(true);

            const registroEliminado =
                await ParasitologiaLocalService.deleteById(id);

            await cargarDatos();

            return registroEliminado;
        } catch (error) {
            console.error("Error al eliminar parasitologia local", error);
            mostrarError(error);
            return null;
        } finally {
            setLoading(false);
        }
    }

    useEffect(function () {
        cargarDatos();
    }, []);

    return {
        registrosParasitologia,
        resumen,
        catalogoParasitos,
        catalogoGrados,
        loading,

        recargar: cargarDatos,
        buscarRegistro,
        guardarRegistro,
        actualizarRegistro,
        eliminarRegistro,
    };
}