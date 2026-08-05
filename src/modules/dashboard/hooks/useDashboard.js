/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: useDashboard.js
Autor: Gerald
Fecha: 04/08/2026
Modulo: Dashboard
Descripcion:
Centraliza la carga y el estado de los datos utilizados
por el Dashboard desde SQLite local.
//////////////////////////////////////////////////////////
*/

import { useCallback, useState } from "react";

import { useError } from "../../../shared/context/ErrorContext";
import DashboardLocalService from "../services/DashboardLocal.service";
import { adaptarDatosDashboard } from "../utils/DashboardAdapter";
import {
  obtenerResumenEnfermedadesVacio,
  obtenerResumenParasitologiasVacio,
} from "../utils/DashboardUtils";

/*
//////////////////////////////////////////////////////////
DATOS INICIALES
//////////////////////////////////////////////////////////
*/

function crearDatosIniciales() {
  return {
    fincas: [],
    estanques: [],
    alimentaciones: [],
    siembras: [],
    inventario: [],
    equipos: [],
    enfermedades: [],
    resumenEnfermedades: obtenerResumenEnfermedadesVacio(),
    parasitologias: [],
    resumenParasitologias: obtenerResumenParasitologiasVacio(),
    fisicoQuimicos: [],
  };
}

/*
//////////////////////////////////////////////////////////
PETICIONES LOCALES
//////////////////////////////////////////////////////////
*/

const PETICIONES_DASHBOARD = [
  {
    clave: "fincas",
    cargar: DashboardLocalService.getFincas,
    respaldo: [],
  },
  {
    clave: "estanques",
    cargar: DashboardLocalService.getEstanques,
    respaldo: [],
  },
  {
    clave: "alimentaciones",
    cargar: DashboardLocalService.getAlimentaciones,
    respaldo: [],
  },
  {
    clave: "siembras",
    cargar: DashboardLocalService.getSiembras,
    respaldo: [],
  },
  {
    clave: "inventario",
    cargar: DashboardLocalService.getInventario,
    respaldo: [],
    mostrarError: false,
  },
  {
    clave: "equipos",
    cargar: DashboardLocalService.getEquipos,
    respaldo: [],
  },
  {
    clave: "enfermedades",
    cargar: DashboardLocalService.getEnfermedades,
    respaldo: [],
  },
  {
    clave: "resumenEnfermedades",
    cargar: DashboardLocalService.getResumenEnfermedades,
    respaldo: obtenerResumenEnfermedadesVacio(),
  },
  {
    clave: "parasitologias",
    cargar: DashboardLocalService.getParasitologias,
    respaldo: [],
  },
  {
    clave: "resumenParasitologias",
    cargar: DashboardLocalService.getResumenParasitologias,
    respaldo: obtenerResumenParasitologiasVacio(),
  },
  {
    clave: "fisicoQuimicos",
    cargar: DashboardLocalService.getFisicoQuimicos,
    respaldo: [],
  },
];

/*
//////////////////////////////////////////////////////////
HOOK PRINCIPAL
//////////////////////////////////////////////////////////
*/

export default function useDashboard() {
  const { mostrarError } = useError();

  const [datos, setDatos] = useState(crearDatosIniciales);
  const [loading, setLoading] = useState(false);

  const cargarDatos = useCallback(async function () {
    try {
      setLoading(true);

      const resultados = await Promise.allSettled(
        PETICIONES_DASHBOARD.map(function (peticion) {
          return peticion.cargar();
        })
      );

      const datosLocales = {};
      let primerError = null;

      PETICIONES_DASHBOARD.forEach(function (peticion, index) {
        const resultado = resultados[index];

        datosLocales[peticion.clave] =
          resultado.status === "fulfilled"
            ? resultado.value
            : peticion.respaldo;

        if (
          primerError === null &&
          resultado.status === "rejected" &&
          peticion.mostrarError !== false
        ) {
          primerError = resultado.reason;
        }
      });

      setDatos(adaptarDatosDashboard(datosLocales));

      if (primerError !== null) {
        mostrarError(primerError);
      }

      return primerError === null;
    } catch (error) {
      mostrarError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [mostrarError]);

  return {
    ...datos,
    loading,
    recargar: cargarDatos,
  };
}