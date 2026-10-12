/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: useDashboardScreen.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 04/08/2026
Modulo: Dashboard
Descripcion:
Centraliza la logica de interfaz, calculos, alertas,
navegacion y actualizacion automatica del Dashboard
utilizando datos locales preparados desde SQLite.
//////////////////////////////////////////////////////////
*/

import { useCallback, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { useError } from "../../../shared/context/ErrorContext";
import {
  construirAlertasOperativas,
  descartarAlerta,
  filtrarAlertasDescartadas,
  obtenerAlertasDescartadas,
} from "../../alertas/services/AlertasServices";

import useDashboard from "./useDashboard";
import {
  construirFincasDashboard,
  obtenerAlimentacionSemanal,
  obtenerTotalCasosSanitarios,
  obtenerUltimosRegistros,
} from "../utils/DashboardUtils";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const ALERTAS_ABIERTAS_INICIALES = {
  critica: true,
  advertencia: true,
  info: false,
};

/*
//////////////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////////////
*/

const obtenerListaSegura = (valor) => (Array.isArray(valor) ? valor : []);

const obtenerObjetoSeguro = (valor) =>
  valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};

/*
//////////////////////////////////////////////////////////
HOOK PRINCIPAL
//////////////////////////////////////////////////////////
*/

export default function useDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { mostrarError } = useError();

  const {
    fincas,
    estanques,
    alimentaciones,
    siembras,
    inventario,
    equipos,
    enfermedades,
    resumenEnfermedades,
    parasitologias,
    resumenParasitologias,
    fisicoQuimicos,
    loading,
    recargar,
  } = useDashboard();

  const [selectedCard, setSelectedCard] = useState(null);
  const [alertasAbiertas, setAlertasAbiertas] = useState(
    ALERTAS_ABIERTAS_INICIALES
  );
  const [alertasDescartadas, setAlertasDescartadas] = useState([]);

  /*
  //////////////////////////////////////////////////////////
  DATOS SEGUROS
  //////////////////////////////////////////////////////////
  */

  const fincasSeguras = useMemo(
    () => obtenerListaSegura(fincas),
    [fincas]
  );

  const estanquesSeguros = useMemo(
    () => obtenerListaSegura(estanques),
    [estanques]
  );

  const alimentacionesSeguras = useMemo(
    () => obtenerListaSegura(alimentaciones),
    [alimentaciones]
  );

  const siembrasSeguras = useMemo(
    () => obtenerListaSegura(siembras),
    [siembras]
  );

  const inventarioSeguro = useMemo(
    () => obtenerListaSegura(inventario),
    [inventario]
  );

  const equiposSeguros = useMemo(
    () => obtenerListaSegura(equipos),
    [equipos]
  );

  const enfermedadesSeguras = useMemo(
    () => obtenerListaSegura(enfermedades),
    [enfermedades]
  );

  const parasitologiasSeguras = useMemo(
    () => obtenerListaSegura(parasitologias),
    [parasitologias]
  );

  const fisicoQuimicosSeguros = useMemo(
    () => obtenerListaSegura(fisicoQuimicos),
    [fisicoQuimicos]
  );

  const resumenEnfermedadesSeguro = useMemo(
    () => obtenerObjetoSeguro(resumenEnfermedades),
    [resumenEnfermedades]
  );

  const resumenParasitologiasSeguro = useMemo(
    () => obtenerObjetoSeguro(resumenParasitologias),
    [resumenParasitologias]
  );

  /*
  //////////////////////////////////////////////////////////
  CALCULOS DEL DASHBOARD
  //////////////////////////////////////////////////////////
  */

  const fincasDashboard = useMemo(function () {
    return construirFincasDashboard(fincasSeguras, estanquesSeguros);
  }, [fincasSeguras, estanquesSeguros]);

  const alimentacionSemanal = useMemo(function () {
    return obtenerAlimentacionSemanal(alimentacionesSeguras);
  }, [alimentacionesSeguras]);

  const totalCasosSanitarios = useMemo(function () {
    return obtenerTotalCasosSanitarios(
      resumenEnfermedadesSeguro,
      resumenParasitologiasSeguro
    );
  }, [resumenEnfermedadesSeguro, resumenParasitologiasSeguro]);

  const alertasBase = useMemo(function () {
    return construirAlertasOperativas({
      productosInventario: inventarioSeguro,
      siembras: siembrasSeguras,
      alimentaciones: alimentacionesSeguras,
      estanques: estanquesSeguros,
      equipos: equiposSeguros,
      registrosEnfermedades: enfermedadesSeguras,
      registrosParasitologia: parasitologiasSeguras,
      registrosFisicoQuimicos: fisicoQuimicosSeguros,
    });
  }, [
    inventarioSeguro,
    siembrasSeguras,
    alimentacionesSeguras,
    estanquesSeguros,
    equiposSeguros,
    enfermedadesSeguras,
    parasitologiasSeguras,
    fisicoQuimicosSeguros,
  ]);

  const alertasDashboard = useMemo(function () {
    return filtrarAlertasDescartadas(
      alertasBase,
      alertasDescartadas
    ).slice(0, 10);
  }, [alertasBase, alertasDescartadas]);

  const ultimosRegistros = useMemo(function () {
    return obtenerUltimosRegistros(
      alimentacionesSeguras,
      siembrasSeguras,
      enfermedadesSeguras,
      parasitologiasSeguras,
      fisicoQuimicosSeguros
    );
  }, [
    alimentacionesSeguras,
    siembrasSeguras,
    enfermedadesSeguras,
    parasitologiasSeguras,
    fisicoQuimicosSeguros,
  ]);

  /*
  //////////////////////////////////////////////////////////
  CARGA DE DATOS Y ALERTAS
  //////////////////////////////////////////////////////////
  */

  const cargarAlertasDescartadas = useCallback(async function () {
    try {
      const ids = await obtenerAlertasDescartadas();

      setAlertasDescartadas(Array.isArray(ids) ? ids : []);
    } catch (error) {
      mostrarError(error);
    }
  }, [mostrarError]);

  useFocusEffect(
    useCallback(function () {
      recargar();
      cargarAlertasDescartadas();
    }, [recargar, cargarAlertasDescartadas])
  );

  /*
  //////////////////////////////////////////////////////////
  ACCIONES DE INTERFAZ
  //////////////////////////////////////////////////////////
  */

  const manejarSeleccionCard = useCallback(function (cardId) {
    setSelectedCard(function (cardActual) {
      return cardActual === cardId ? null : cardId;
    });
  }, []);

  const alternarAlertas = useCallback(function (tipo) {
    setAlertasAbiertas(function (estadoActual) {
      return {
        ...estadoActual,
        [tipo]: !estadoActual[tipo],
      };
    });
  }, []);

  const descartarAlertaDashboard = useCallback(async function (id) {
    try {
      const ids = await descartarAlerta(id);

      setAlertasDescartadas(Array.isArray(ids) ? ids : []);
    } catch (error) {
      mostrarError(error);
    }
  }, [mostrarError]);

  /*
  //////////////////////////////////////////////////////////
  NAVEGACION
  //////////////////////////////////////////////////////////
  */

  const irAAlertas = useCallback(function () {
    router.push("/alertas");
  }, [router]);

  const irACasoSanitario = useCallback(function (caso) {
    if (!caso?.registroId) {
      return;
    }

    if (caso.tipo === "parasitologia") {
      router.push({
        pathname: "/registros/EditarParasitologia",
        params: {
          id: caso.registroId,
        },
      });

      return;
    }

    if (caso.tipo === "enfermedad") {
      router.push({
        pathname: "/registros/EditarEnfermedad",
        params: {
          id: caso.registroId,
        },
      });
    }
  }, [router]);

  const irAAlerta = useCallback(function (alerta) {
    if (!alerta?.modulo) {
      return;
    }

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

    if (alerta.modulo === "inventario") {
      router.push("/inventarios");
      return;
    }

    if (alerta.modulo === "equipos") {
      router.push("/equipos");
    }
  }, [router]);

  /*
  //////////////////////////////////////////////////////////
  RETORNO
  //////////////////////////////////////////////////////////
  */

  return {
    selectedCard,
    alertasAbiertas,
    alertasDescartadas,
    cargando: loading,
    isTablet: width >= 720,

    fincasData: fincasSeguras,
    fincasDashboard,
    estanquesData: estanquesSeguros,

    alimentaciones: alimentacionesSeguras,
    alimentacionSemanal,
    siembrasData: siembrasSeguras,
    productosInventario: inventarioSeguro,
    equiposData: equiposSeguros,

    registrosEnfermedades: enfermedadesSeguras,
    resumenEnfermedades: resumenEnfermedadesSeguro,
    registrosParasitologia: parasitologiasSeguras,
    resumenParasitologia: resumenParasitologiasSeguro,
    registrosFisicoQuimicos: fisicoQuimicosSeguros,

    totalCasosSanitarios,
    alertasDashboard,
    ultimosRegistros,

    recargar,
    manejarSeleccionCard,
    alternarAlertas,
    descartarAlertaDashboard,

    irAAlertas,
    irACasoSanitario,
    irAAlerta,
  };
}