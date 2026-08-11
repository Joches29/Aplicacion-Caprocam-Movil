/**
 * ============================================================
 * HOOK DE REGISTRO DE VENTAS (SQLite Offline-First)
 * ============================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "expo-router";

import VentasLocalService from "../services/mantVentasLocal.service.js";
import { MantVentaDTO } from "../dtos/mantVenta.dto.js";
import { localApi } from "../../../database/local/localApi.service.js";
import { styles } from "../styles/VentaStyles.js";
import { COLORS } from "../../../theme/colors.js";
import Text from "../../../shared/components/Text.jsx";
import Icon from "../../../shared/components/Icons.jsx";

export const CLIENTE_GENERICO = {
  id: "cliente-generico",
  nombre: "Cliente genérico",
  telefono: "",
};

export const formatearMontoColones = (monto) => {
  const numero = Number(monto);
  if (Number.isNaN(numero)) return "₡0";
  return `₡${numero.toLocaleString("es-CR")}`;
};

const obtenerFechaActual = () => {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${dia}/${mes}/${anio}`;
};

const normalizarDecimal = (valor) => {
  const texto = String(valor ?? "").replace(",", ".");
  if (texto === "") return "";
  const numero = Number(texto);
  if (Number.isNaN(numero) || numero < 0) return "0";
  return texto;
};

const convertirFechaParaBackend = (fechaFormato) => {
  if (!fechaFormato) return new Date().toISOString();
  const partes = fechaFormato.split("/");
  if (partes.length !== 3) return new Date().toISOString();
  const [dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
};

const validarVentaFormulario = ({
  fincaSeleccionada,
  estanqueSeleccionado,
  pesoPromedio,
  kilosVendidos,
  precioKiloNumero,
  colaboradorSeleccionado,
  compradorSeleccionado,
}) => {
  const errores = {};
  if (!fincaSeleccionada) errores.finca = true;
  if (!estanqueSeleccionado) errores.estanque = true;

  const peso = Number(pesoPromedio);
  if (!pesoPromedio || Number.isNaN(peso) || peso <= 0) {
    errores.pesoPromedio = true;
  }

  const kilos = Number(kilosVendidos);
  if (kilosVendidos === "" || Number.isNaN(kilos) || kilos <= 0) {
    errores.kilosVendidos = true;
  }

  if (precioKiloNumero <= 0) {
    errores.precioKilo = true;
  }

  if (!compradorSeleccionado) {
    errores.comprador = true;
  }

  return errores;
};

export function useVenta() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [fincaSeleccionada, setFincaSeleccionada] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [pesoPromedio, setPesoPromedio] = useState("0.1");
  const [kilosVendidos, setKilosVendidos] = useState("0");
  const [precioKilo, setPrecioKilo] = useState("0");
  const [fechaVenta, setFechaVenta] = useState(obtenerFechaActual());
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState("");
  const [compradorSeleccionado, setCompradorSeleccionado] = useState("");

  const [colaboradores, setColaboradores] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [compradoresData, setCompradoresData] = useState([]);

  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [ventas, setVentas] = useState([]);

  const cargarCatalogos = useCallback(async () => {
    try {
      await localApi.inicializar();
      const [resColaboradores, resFincas, resEstanques, resCompradores] =
        await Promise.all([
          localApi.colaboradores?.obtenerTodos?.().catch(() => ({ data: [] })),
          localApi.fincas?.obtenerTodos?.().catch(() => ({ data: [] })),
          localApi.estanques?.obtenerTodos?.().catch(() => ({ data: [] })),
          localApi.compradores?.obtenerTodos?.().catch(() => ({ data: [] })),
        ]);

      setColaboradores(resColaboradores?.data || []);
      setFincas(resFincas?.data || []);
      setEstanques(resEstanques?.data || []);
      setCompradoresData(resCompradores?.data || []);
    } catch (error) {
      console.error("Error cargando catálogos SQLite:", error);
    }
  }, []);

  const opcionesFincas = useMemo(
    () =>
      fincas.map((finca) => ({
        label: finca.nombre_finca || finca.nombreFinca || finca.nombre || `Finca ${finca.id}`,
        value: String(finca.id),
      })),
    [fincas]
  );

  const estanquesFiltrados = useMemo(() => {
    if (!fincaSeleccionada) return [];

    return estanques
      .filter(
        (e) =>
          String(e.finca_id ?? e.idFinca ?? e.fincaId ?? e.finca) === String(fincaSeleccionada)
      )
      .map((e) => ({
        label: e.codigo || e.nombre || `Estanque ${e.id}`,
        value: String(e.id),
      }));
  }, [fincaSeleccionada, estanques]);

  const opcionesColaboradores = useMemo(
    () =>
      colaboradores.map((colaborador) => ({
        label: colaborador.nombre,
        value: String(colaborador.id),
      })),
    [colaboradores]
  );

  const opcionesCompradores = useMemo(
    () => [
      { label: "Cliente genérico", value: "cliente-generico" },
      ...compradoresData.map((comprador) => ({
        label: comprador.nombre || `Comprador ${comprador.id}`,
        value: String(comprador.id),
      })),
    ],
    [compradoresData]
  );

  const precioKiloNumero = Number(precioKilo || 0);
  const totalVenta = Number(kilosVendidos || 0) * precioKiloNumero;

  const gridStyle = useMemo(
    () => (isWide ? styles.inputRow : styles.inputGrid),
    [isWide]
  );

  const errorInputStyle = useMemo(
    () => ({
      borderColor: COLORS.error,
      backgroundColor: COLORS.surface,
    }),
    []
  );

  const limpiarError = useCallback((campo) => {
    setErrores((actual) => {
      if (!actual[campo]) return actual;
      return { ...actual, [campo]: false };
    });
  }, []);

  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
      setSubmitted(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successMessage, errorMessage]);

  const limpiarMensaje = useCallback(() => {
    setSuccessMessage("");
    setErrorMessage("");
    setSubmitted(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogos();
      return () => {
        limpiarMensaje();
      };
    }, [cargarCatalogos, limpiarMensaje])
  );

  const handlePesoPromedioChange = useCallback(
    (value) => {
      setPesoPromedio(normalizarDecimal(value));
      limpiarError("pesoPromedio");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleKilosVendidosChange = useCallback(
    (value) => {
      setKilosVendidos(normalizarDecimal(value));
      limpiarError("kilosVendidos");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleColaboradorChange = useCallback(
    (value) => {
      setColaboradorSeleccionado(value);
      limpiarError("colaborador");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleFincaChange = useCallback(
    (value) => {
      setFincaSeleccionada(value);
      setEstanqueSeleccionado("");
      limpiarError("finca");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handlePrecioChange = useCallback(
    (value) => {
      setPrecioKilo(String(Math.max(0, Math.round(Number(value) || 0))));
      limpiarError("precioKilo");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleCompradorChange = useCallback(
    (value) => {
      setCompradorSeleccionado(value);
      limpiarError("comprador");
      setSuccessMessage("");
      setErrorMessage("");
    },
    [limpiarError]
  );

  const handleFechaChange = useCallback((value) => {
    if (!value) {
      setFechaVenta(obtenerFechaActual());
      return;
    }
    setFechaVenta(value);
  }, []);

  const limpiarFormulario = useCallback(() => {
    setFincaSeleccionada("");
    setEstanqueSeleccionado("");
    setPesoPromedio("0.1");
    setKilosVendidos("0");
    setPrecioKilo("0");
    setFechaVenta(obtenerFechaActual());
    setColaboradorSeleccionado("");
    setCompradorSeleccionado("");
    setErrores({});
  }, []);

  const guardarVenta = useCallback(async () => {
    setSubmitted(true);
    setSuccessMessage("");
    setErrorMessage("");

    const nuevosErrores = validarVentaFormulario({
      fincaSeleccionada,
      estanqueSeleccionado,
      pesoPromedio,
      kilosVendidos,
      precioKiloNumero,
      colaboradorSeleccionado,
      compradorSeleccionado,
    });

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setErrorMessage("Rellenar campos obligatorios.");
      return;
    }

    setGuardando(true);

    const ventaDTO = new MantVentaDTO({
      finca: Number(fincaSeleccionada),
      estanque: Number(estanqueSeleccionado),
      colaborador: colaboradorSeleccionado ? Number(colaboradorSeleccionado) : null,
      comprador: compradorSeleccionado === "cliente-generico" ? null : Number(compradorSeleccionado),
      pesoPromedio: Number(pesoPromedio),
      cantVendida: Number(kilosVendidos),
      precioKilo: precioKiloNumero,
      fecha: convertirFechaParaBackend(fechaVenta),
    });

    try {
      await VentasLocalService.create(ventaDTO);
      setVentas((actual) => [ventaDTO, ...actual]);
      limpiarFormulario();
      setSuccessMessage("Venta guardada correctamente.");
    } catch (error) {
      setSubmitted(true);
      setErrorMessage("No fue posible guardar la venta.");
    } finally {
      setGuardando(false);
    }
  }, [
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    kilosVendidos,
    precioKiloNumero,
    colaboradorSeleccionado,
    compradorSeleccionado,
    fechaVenta,
    limpiarFormulario,
  ]);

  function SectionTitle({ icon, title }) {
    return (
      <View style={styles.sectionTitle}>
        <Icon
          icon={icon}
          size={18}
          color={COLORS.primary}
          style={styles.sectionIcon}
        />
        <Text style={styles.sectionText}>{title}</Text>
      </View>
    );
  }

  return {
    SectionTitle,
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    kilosVendidos,
    precioKilo,
    fechaVenta,
    colaboradorSeleccionado,
    compradorSeleccionado,

    submitted,
    successMessage,
    errorMessage,

    errores,
    guardando,
    gridStyle,
    errorInputStyle,
    opcionesFincas,
    estanquesFiltrados,
    opcionesColaboradores,
    opcionesCompradores,
    precioKiloNumero,
    totalVenta,
    ventas,
    setFechaVenta,
    setEstanqueSeleccionado,
    handleFincaChange,
    handlePesoPromedioChange,
    handleKilosVendidosChange,
    handlePrecioChange,
    handleCompradorChange,
    handleColaboradorChange,
    handleFechaChange,
    limpiarError,
    guardarVenta,
  };
}