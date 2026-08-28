/**
 * ============================================================
 * HOOK DE PANTALLA DE ALERTAS
 * ============================================================
 *
 * Centraliza la logica de carga, agrupacion, descarte,
 * refresco y navegacion de las alertas.
 *
 * Trabaja con los datos locales obtenidos por useDashboard.
 */

import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";

import useDashboard from "../../dashboard/hooks/useDashboard";

import {
  agruparAlertasPorTipo,
  construirAlertasOperativas,
  descartarAlerta,
  filtrarAlertasDescartadas,
  obtenerAlertasDescartadas,
} from "../services/AlertasServices";

import {
  obtenerEstadoInicialDropdowns,
} from "../services/AlertasScreenService";

const obtenerListaSegura = (valor) =>
  Array.isArray(valor) ? valor : [];

export default function useAlertasScreen() {
  const router = useRouter();

  const {
    fincas,
    estanques,
    alimentaciones,
    siembras,
    inventario,
    equipos,
    enfermedades,
    parasitologias,
    fisicoQuimicos,
    loading,
    recargar,
  } = useDashboard();

  const [abiertos, setAbiertos] = useState(
    obtenerEstadoInicialDropdowns()
  );

  const [descartadas, setDescartadas] = useState([]);

  const cargarAlertasDescartadas = useCallback(async function () {
    const ids = await obtenerAlertasDescartadas();

    setDescartadas(Array.isArray(ids) ? ids : []);
  }, []);

  const cargarPantalla = useCallback(async function () {
    await recargar();
    await cargarAlertasDescartadas();
  }, [recargar, cargarAlertasDescartadas]);

  useFocusEffect(
    useCallback(function () {
      let activo = true;

      async function cargarDatos() {
        await recargar();

        const ids = await obtenerAlertasDescartadas();

        if (activo === true) {
          setDescartadas(Array.isArray(ids) ? ids : []);
        }
      }

      cargarDatos();

      return function () {
        activo = false;
      };
    }, [recargar])
  );

  const alertasBase = useMemo(function () {
    return construirAlertasOperativas({
      fincas: obtenerListaSegura(fincas),
      estanques: obtenerListaSegura(estanques),
      productosInventario: obtenerListaSegura(inventario),
      siembras: obtenerListaSegura(siembras),
      alimentaciones: obtenerListaSegura(alimentaciones),
      equipos: obtenerListaSegura(equipos),
      registrosEnfermedades: obtenerListaSegura(enfermedades),
      registrosParasitologia: obtenerListaSegura(parasitologias),
      registrosFisicoQuimicos: obtenerListaSegura(fisicoQuimicos),
    });
  }, [
    fincas,
    estanques,
    inventario,
    siembras,
    alimentaciones,
    equipos,
    enfermedades,
    parasitologias,
    fisicoQuimicos,
  ]);

  const alertas = useMemo(function () {
    return filtrarAlertasDescartadas(
      alertasBase,
      descartadas
    );
  }, [alertasBase, descartadas]);

  const grupos = useMemo(function () {
    return agruparAlertasPorTipo(alertas);
  }, [alertas]);

  function cambiarDropdown(tipo) {
    setAbiertos(function (actual) {
      return {
        ...actual,
        [tipo]: !actual[tipo],
      };
    });
  }

  async function descartar(id) {
    const ids = await descartarAlerta(id);

    setDescartadas(Array.isArray(ids) ? ids : []);
  }

  function irAAlerta(alerta) {
    if (!alerta?.modulo) return;

    if (alerta.modulo === "enfermedades") {
      if (alerta.registroId) {
        router.push({
          pathname: "/registros/EditarEnfermedad",
          params: {
            id: alerta.registroId,
          },
        });

        return;
      }

      router.push("/registros/Enfermedades");
      return;
    }

    if (alerta.modulo === "parasitologia") {
      if (alerta.registroId) {
        router.push({
          pathname: "/registros/EditarParasitologia",
          params: {
            id: alerta.registroId,
          },
        });

        return;
      }

      router.push("/registros/Parasitologia");
      return;
    }

    if (alerta.modulo === "fisicoQuimica") {
      if (alerta.registroId) {
        router.push({
          pathname: "/registros/EditarFisicoQuimica",
          params: {
            id: alerta.registroId,
          },
        });

        return;
      }

      router.push("/registros/FisicoQuimica");
      return;
    }

    if (alerta.modulo === "estanques") {
      if (alerta.registroId) {
        router.push({
          pathname: "/finca/detalleEstanque",
          params: {
            id: alerta.registroId,
          },
        });

        return;
      }

      router.push("/finca");
      return;
    }

    if (alerta.modulo === "siembra") {
      router.push("/siembra");
      return;
    }

    if (alerta.modulo === "alimentacion") {
      router.push("/registros/Alimentacion");
      return;
    }

    if (alerta.modulo === "inventario") {
      router.push("/inventarios");
      return;
    }

    if (alerta.modulo === "equipos") {
      router.push("/equipos");
    }
  }

  return {
    abiertos,
    grupos,
    loading,
    cargarPantalla,
    cambiarDropdown,
    descartar,
    irAAlerta,
  };
}