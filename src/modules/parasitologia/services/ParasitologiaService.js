/**
 * ============================================================
 * SERVICE DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza las peticiones HTTP del modulo de parasitologia.
 * Se usa principalmente para sincronizar registros locales
 * pendientes desde SQLite hacia el backend.
 *
 * El token JWT se agrega automaticamente desde api.js.
 */

import api from "../../../api/api.js";

/*
============================================================
HELPERS
============================================================
*/

function construirErrorHttp(error, mensajeGenerico) {
    const status = error?.response?.status;

    const mensaje =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;

    if (status === 500) {
        return new Error(mensajeGenerico);
    }

    if (status) {
        const err = new Error(mensaje || mensajeGenerico);
        err.status = status;
        return err;
    }

    return new Error(mensaje || mensajeGenerico);
}

/*
============================================================
OBTENER TODAS LAS PARASITOLOGIAS
============================================================
*/

async function getAll(filtros = {}) {
    try {
        const response = await api.get("/parasitologias", {
            params: filtros,
        });

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al obtener parasitologias."
        );
    }
}

/*
============================================================
OBTENER UNA PARASITOLOGIA POR ID
============================================================
*/

async function getById(id) {
    try {
        const response = await api.get(`/parasitologias/${id}`);

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al obtener la parasitologia."
        );
    }
}

/*
============================================================
CREAR UNA PARASITOLOGIA
============================================================
*/

async function create(parasitologiaDTO) {
    try {
        const response = await api.post("/parasitologias", parasitologiaDTO);

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al crear la parasitologia."
        );
    }
}

/*
============================================================
ACTUALIZAR UNA PARASITOLOGIA
============================================================
*/

async function update(id, parasitologiaDTO) {
    try {
        const response = await api.put(
            `/parasitologias/${id}`,
            parasitologiaDTO
        );

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al actualizar la parasitologia."
        );
    }
}

/*
============================================================
ELIMINAR UNA PARASITOLOGIA
============================================================
*/

async function deleteById(id) {
    try {
        const response = await api.delete(`/parasitologias/${id}`);

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al eliminar la parasitologia."
        );
    }
}

/*
============================================================
OBTENER RESUMEN DE PARASITOLOGIAS
============================================================
*/

async function getResumenDashboard(filtros = {}) {
    try {
        const response = await api.get("/parasitologias/resumen", {
            params: filtros,
        });

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al obtener el resumen de parasitologias."
        );
    }
}

/*
============================================================
OBTENER CATALOGO DE PARASITOS
============================================================
*/

async function getCatalogo() {
    try {
        const response = await api.get("/parasitologias/catalogo");

        return response.data.data;
    } catch (error) {
        throw construirErrorHttp(
            error,
            "Error al obtener el catalogo de parasitos."
        );
    }
}

/*
============================================================
OBTENER CATALOGO LOCAL DE GRADOS
============================================================
*/

async function getCatalogoGrados() {
    return [
        "bajo",
        "medio",
        "alto",
    ];
}

/*
============================================================
EXPORT
============================================================
*/

const parasitologiaService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    getResumenDashboard,
    getCatalogo,
    getCatalogoGrados,
};

export default parasitologiaService;