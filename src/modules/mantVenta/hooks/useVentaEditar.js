/**
 * ============================================================
 * HOOK DE VENTA EDITAR
 * ============================================================
 *
 * Centraliza el estado y las operaciones locales
 * correspondientes al modulo de ventas.
 *
 * Trabaja contra SQLite usando VentaLocalService.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import VentasLocalService from "../services/mantVentasLocal.service.js";
import { MantVentaDTO } from "../dtos/mantVenta.dto.js";
import { localApi } from "../../../database/local/localApi.service.js";
import {
  normalizarDecimal,
  formatearFechaParaInput,
  convertirFechaParaBackend,
  validarVentaFormulario,
} from "./useVenta.js";

/**
============================================================
HELPERS
============================================================
*/

function formatearFechaDesdeBackend(fechaBackend) {
  if (!fechaBackend) return "";
  const soloFecha = String(fechaBackend).split("T")[0];
  return formatearFechaParaInput(soloFecha);
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export function useVentaEditar({ id, onGuardado } = {}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const ventaId = id ?? null;

  const [ventaOriginal, setVentaOriginal] = useState(null);
  const [cargandoVenta, setCargandoVenta] = useState(true);
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [compradoresData, setCompradoresData] = useState([]);

  const [fincaSeleccionada, setFincaSeleccionadaState] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [pesoPromedio, setPesoPromedio] = useState("0.1");
  const [tamanoPromedio, setTamanoPromedio] = useState("0.1");
  const [kilosVendidos, setKilosVendidos] = useState("0");
  const [precioKilo, setPrecioKilo] = useState("0");
  const [fechaVenta, setFechaVenta] = useState("");
  const [compradorSeleccionado, setCompradorSeleccionado] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargarCatalogosLocales() {
      try {
        await localApi.inicializar();
        const [resFincas, resEstanques, resCompradores] = await Promise.all([
          localApi.fincas.obtenerTodos(),
          localApi.estanques.obtenerTodos(),
          localApi.compradores.obtenerTodos(),
        ]);

        if (activo) {
          setFincas(resFincas.data || []);
          setEstanques(resEstanques.data || []);
          setCompradoresData(resCompradores.data || []);
        }
      } catch (error) {
        console.error(error);
      }
    }
    cargarCatalogosLocales();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    async function cargarVenta() {
      if (!ventaId) {
        setCargandoVenta(false);
        return;
      }
      try {
        await localApi.inicializar();
        const venta = await VentasLocalService.getById(ventaId);
        if (!activo || !venta) return;

        setVentaOriginal(venta);
        setFincaSeleccionadaState(venta?.finca ? String(venta.finca) : "");
        setEstanqueSeleccionado(venta?.estanque ? String(venta.estanque) : "");
        setPesoPromedio(String(venta?.pesoPromedio ?? "0.1"));
        setTamanoPromedio(String(venta?.tamanoPromedio ?? "0.1"));
        setKilosVendidos(String(venta?.cantVendida ?? "0"));
        setPrecioKilo(String(venta?.precioKilo ?? "0"));
        setFechaVenta(formatearFechaDesdeBackend(venta?.fecha));
        setCompradorSeleccionado(venta?.comprador ? String(venta.comprador) : "");
      } catch (error) {
        setTipoMensaje("error");
        setMensaje("No se pudo cargar la venta local.");
      } finally {
        if (activo) setCargandoVenta(false);
      }
    }
    cargarVenta();
    return () => { activo = false; };
  }, [ventaId]);

  const opcionesFincas = useMemo(
    () => fincas.map((finca) => ({
      label: finca.nombre_finca || `Finca ${finca.id}`,
      value: String(finca.id),
    })),
    [fincas]
  );

  const estanquesFiltrados = useMemo(() => {
    if (!fincaSeleccionada) return [];
    return estanques
      .filter((estanque) => Number(estanque.finca_id) === Number(fincaSeleccionada))
      .map((estanque) => ({
        label: estanque.codigo || `Estanque ${estanque.id}`,
        value: String(estanque.id),
      }));
  }, [fincaSeleccionada, estanques]);

  const opcionesCompradores = useMemo(
    () => compradoresData.map((comprador) => ({
      label: comprador.nombre || `Comprador ${comprador.id}`,
      value: String(comprador.id),
    })),
    [compradoresData]
  );

  const priceKiloNumero = Number(precioKilo || 0);
  const totalVenta = Number(kilosVendidos || 0) * priceKiloNumero;

  const limpiarError = useCallback((campo) => {
    setErrores((actual) => {
      if (!actual[campo]) return actual;
      return { ...actual, [campo]: false };
    });
  }, []);

  const handleFincaChange = useCallback((value) => {
    setFincaSeleccionadaState(value);
    setEstanqueSeleccionado("");
    limpiarError("finca");
  }, [limpiarError]);

  const handlePesoPromedioChange = useCallback((value) => {
    setPesoPromedio(normalizarDecimal(value));
    limpiarError("pesoPromedio");
  }, [limpiarError]);

  const handleTamanoPromedioChange = useCallback((value) => {
    setTamanoPromedio(normalizarDecimal(value));
    limpiarError("tamanoPromedio");
  }, [limpiarError]);

  const handleKilosVendidosChange = useCallback((value) => {
    setKilosVendidos(normalizarDecimal(value));
    limpiarError("kilosVendidos");
  }, [limpiarError]);

  const handlePrecioChange = useCallback((value) => {
    setPrecioKilo(String(Math.max(0, Math.round(Number(value) || 0))));
    limpiarError("precioKilo");
  }, [limpiarError]);

  const handleCompradorChange = useCallback((value) => {
    setCompradorSeleccionado(value);
    limpiarError("comprador");
  }, [limpiarError]);

  const guardarCambios = useCallback(async () => {
    const nuevosErrores = validarVentaFormulario({
      fincaSeleccionada,
      estanqueSeleccionado,
      pesoPromedio,
      tamanoPromedio,
      kilosVendidos,
      precioKiloNumero: priceKiloNumero,
      compradorSeleccionado,
    });

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setTipoMensaje("error");
      setMensaje("Completa los datos obligatorios para guardar los cambios.");
      return;
    }

    if (!ventaId) return;

    setGuardando(true);

    const ventaDTO = new MantVentaDTO({
      finca: Number(fincaSeleccionada),
      estanque: Number(estanqueSeleccionado),
      comprador: compradorSeleccionado ? Number(compradorSeleccionado) : null,
      pesoPromedio: Number(pesoPromedio),
      tamanoPromedio: Number(tamanoPromedio),
      cantVendida: Number(kilosVendidos),
      precioKilo: priceKiloNumero,
      fecha: convertirFechaParaBackend(fechaVenta),
    });

    try {
      await VentasLocalService.update(ventaId, ventaDTO);
      setTipoMensaje("success");
      setMensaje("Venta actualizada correctamente.");
      onGuardado?.({
        success: true,
        message: "Venta actualizada correctamente.",
      });
    } catch (error) {
      setTipoMensaje("error");
      setMensaje(error?.message || "Ocurrió un error.");
    } finally {
      setGuardando(false);
    }
  }, [
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    tamanoPromedio,
    kilosVendidos,
    priceKiloNumero,
    compradorSeleccionado,
    fechaVenta,
    ventaId,
    onGuardado,
  ]);

  return {
    ventaOriginal,
    cargandoVenta,
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    tamanoPromedio,
    kilosVendidos,
    precioKilo,
    fechaVenta,
    compradorSeleccionado,
    mensaje,
    tipoMensaje,
    errores,
    guardando,
    isWide,
    opcionesFincas,
    estanquesFiltrados,
    opcionesCompradores,
    totalVenta,
    setEstanqueSeleccionado,
    handleFincaChange,
    handlePesoPromedioChange,
    handleTamanoPromedioChange,
    handleKilosVendidosChange,
    handlePrecioChange,
    handleCompradorChange,
    limpiarError,
    guardarCambios,
  };
}