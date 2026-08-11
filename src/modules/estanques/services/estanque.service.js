import api from "../../../api/api";

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
    /*
    OBTENER TODOS LOS ESTANQUES
    */
    getEstanques: async () => {
        try {
            const response = await api.get("/estanques");

            return response.data.data;
        } catch (error) {
            throw construirErrorHttp(error, "No se pudieron obtener los estanques.");
        }
    },

    /*
    OBTENER ESTANQUE POR ID
    */
    getEstanqueById: async (id) => {
        try {
            const response = await api.get(`/estanques/${id}`);

            return response.data.data;
        } catch (error) {
            throw construirErrorHttp(error, "No se pudo obtener la informacion del estanque.");
        }
    },
};