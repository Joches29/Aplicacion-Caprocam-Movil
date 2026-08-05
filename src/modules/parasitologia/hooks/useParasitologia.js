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
  totalMuestreados: 0,
  totalInfectados: 0,
  totalCamaronesMuestreados: 0,
  totalCamaronesInfectados: 0,
  porcentajePromedio: 0,
  promedioInfeccion: 0,
  gradoPromedio: 0,
  parasitosFrecuentes: [],
  gradosFrecuentes: [],
};

/*
============================================================
HELPERS
============================================================
*/

const obtenerArraySeguro = (valor) => Array.isArray(valor) ? valor : [];

const obtenerResumenSeguro = (valor) =>
  valor && typeof valor === "object" ? valor : RESUMEN_INICIAL;

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
  const [loading, setLoading] = useState(false);

  async function cargarDatos() {
    try {
      setLoading(true);

      const [registros, resumenLocal, catalogo] = await Promise.all([
        ParasitologiaLocalService.getAll(),
        ParasitologiaLocalService.getResumenDashboard(),
        ParasitologiaLocalService.getCatalogo(),
      ]);

      setRegistrosParasitologia(obtenerArraySeguro(registros));
      setResumen(obtenerResumenSeguro(resumenLocal));
      setCatalogoParasitos(obtenerArraySeguro(catalogo));
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

      const nuevoRegistro = await ParasitologiaLocalService.create(registro);

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

      const registroActualizado = await ParasitologiaLocalService.update(
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

      const registroEliminado = await ParasitologiaLocalService.deleteById(id);

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
    loading,
    recargar: cargarDatos,
    buscarRegistro,
    guardarRegistro,
    actualizarRegistro,
    eliminarRegistro,
  };
}