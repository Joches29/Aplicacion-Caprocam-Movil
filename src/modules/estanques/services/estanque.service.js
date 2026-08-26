import api from "../../../api/api";

function obtenerDataRespuesta(response) {
    if (response?.data?.data !== undefined) {
        return response.data.data;
    }

    if (response?.data?.datos !== undefined) {
        return response.data.datos;
    }

    if (response?.data !== undefined) {
        return response.data;
    }

    return [];
}

function construirErrorHttp(error, mensajeGenerico) {
    const status = error?.response?.status;
    const mensaje =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

    if (status === 500) {
        return new Error(mensajeGenerico);
    }

    if (status) {
        const err = new Error(mensaje || mensajeGenerico);
        err.status = status;
        return err;
    }

    return new Error(mensajeGenerico);
}

export const estanqueService = {
    getEstanques: async () => {
        try {
            const response = await api.get("/estanques");

            return obtenerDataRespuesta(response);
        } catch (error) {
            throw construirErrorHttp(error, "No se pudieron obtener los estanques.");
        }
    },

    getEstanqueById: async (id) => {
        try {
            const response = await api.get(`/estanques/${id}`);

            return obtenerDataRespuesta(response);
        } catch (error) {
            throw construirErrorHttp(error, "No se pudo obtener la informacion del estanque.");
        }
    },
};

export default estanqueService;