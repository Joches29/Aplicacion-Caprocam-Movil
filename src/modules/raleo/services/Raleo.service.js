/**
 * ============================================================
 * SERVICE RALEO.SERVICE
 * ============================================================
 *
 * Centraliza las peticiones HTTP del modulo de enfermedades.
 * 
 */

import api from "../../../api/api.js";

async function getAll() {
  try {
    const response = await api.get("/raleo");
    return response.data.data;
  } catch (error) {
    console.error(
      "Error al obtener los raleos",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getById(id) {
  try {
    const response = await api.get(`/raleo/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(
      "Error al obtener el raleo",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function create(raleoDTO) {
  try {
    const response = await api.post("/raleo", raleoDTO);
    return response.data.data;
  } catch (error) {
    console.error(
      "Error al crear el raleo",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function update(id, raleoDTO) {
  try {
    const response = await api.put(`/raleo/${id}`, raleoDTO);
    return response.data.data;
  } catch (error) {
    console.error(
      "Error al actualizar el raleo",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function deleteById(id) {
  try {
    const response = await api.delete(`/raleo/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(
      "Error al eliminar el raleo",
      error.response?.data || error.message
    );
    throw error;
  }
}

const raleoService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
};

export default raleoService;
