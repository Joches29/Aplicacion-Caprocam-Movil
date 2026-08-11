/**
 * ============================================================
 * HOOK DE EDICIÓN DE VENTA (SQLite Offline-First)
 * ============================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import VentasLocalService from "../services/mantVentasLocal.service.js";
import { MantVentaDTO } from "../dtos/mantVenta.dto.js";
import { localApi } from "../../../database/local/localApi.service.js";
import { styles } from "../styles/VentaStyles.js";
import { COLORS } from "../../../theme/colors.js";

const normalizarDecimal = (valor) => {
  const texto = String(valor ?? "").replace(",", ".");
  if (texto === "") return "";
  const numero = Number(texto);
  if (Number.isNaN(numero) || numero < 0) return "0";
  return texto;
};

const formatearFechaParaInput = (fechaOriginal) => {
  if (!fechaOriginal) return "";
  const partes = String(fechaOriginal).split("-");
  if (partes.length === 3) {
    const [anio, mes, dia] = partes;
    return `${dia.slice(0, 2)}/${mes}/${anio}`;
  }
  return String(fechaOriginal);
};

const convertirFechaParaBackend = (fechaFormato) => {
  if (!fechaFormato) return new Date().toISOString();
  const partes = fechaFormato.split("/");
  if (partes.length !== 3) return new Date().toISOString();
  const [dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
};

export function useVentaEditar({ id, onGuardado }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [ventaOriginal, setVentaOriginal] = useState(null);
  const [cargandoVenta, setCargandoVenta] = useState(true);

  const [fincaSeleccionada, setFincaSeleccionada] = useState("");
  const [estanqueSeleccionado, setEstanqueSeleccionado] = useState("");
  const [pesoPromedio, setPesoPromedio] = useState("0.1");
  const [kilosVendidos, setKilosVendidos] = useState("0");
  const [precioKilo, setPrecioKilo] = useState("0");
  const [fechaVenta, setFechaVenta] = useState("");
  const [compradorSeleccionado, setCompradorSeleccionado] = useState("");

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [compradoresData, setCompradoresData] = useState([]);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    try {
      await localApi.inicializar();
      const [resFincas, resEstanques, resCompradores] = await Promise.all([
        localApi.fincas?.obtenerTodos?.().catch(() => ({ data: [] })),
        localApi.estanques?.obtenerTodos?.().catch(() => ({ data: [] })),
        localApi.compradores?.obtenerTodos?.().catch(() => ({ data: [] })),
      ]);

      setFincas(resFincas?.data || []);
      setEstanques(resEstanques?.data || []);
      setCompradoresData(resCompradores?.data || []);
    } catch (error) {
      console.error("Error cargando catálogos SQLite:", error);
    }
  }, []);

    useEffect(() => {
    let activo = true;

    async function inicializar() {
      setCargandoVenta(true);
      await cargarCatalogos();

      if (!id) {
        setCargandoVenta(false);
        return;
      }

      try {
        await localApi.inicializar();
        const data = await VentasLocalService.getById(id);

        if (!activo) return;

        if (data) {
          setVentaOriginal(data);
          setFincaSeleccionada(String(data.finca ?? data.fincaId ?? ""));
          setEstanqueSeleccionado(String(data.estanque ?? data.estanqueId ?? ""));
          setPesoPromedio(String(data.pesoPromedio ?? "0.1"));
          setKilosVendidos(String(data.cantVendida ?? data.kilosVendidos ?? "0"));
          setPrecioKilo(String(data.precioKilo ?? "0"));
          setFechaVenta(formatearFechaParaInput(data.fecha));

          // Si el comprador es nulo o 0 en SQLite, asignamos "cliente-generico"
          const valComprador = data.comprador ?? data.compradorId;
          const compradorIdFinal =
            !valComprador || valComprador === "null" || valComprador === 0 || valComprador === "cliente-generico"
              ? "cliente-generico"
              : String(valComprador);

          setCompradorSeleccionado(compradorIdFinal);
        }
      } catch (error) {
        if (activo) {
          setMensaje("No fue posible cargar la información de la venta.");
          setTipoMensaje("error");
        }
      } finally {
        if (activo) setCargandoVenta(false);
      }
    }

    inicializar();
    return () => {
      activo = false;
    };
  }, [id, cargarCatalogos]);

  const opcionesFincas = useMemo(
    () =>
      fincas.map((f) => ({
        label: f.nombre_finca || f.nombreFinca || f.nombre || `Finca ${f.id}`,
        value: String(f.id),
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

  const limpiarError = useCallback((campo) => {
    setErrores((actual) => {
      if (!actual[campo]) return actual;
      return { ...actual, [campo]: false };
    });
  }, []);

  const handleFincaChange = useCallback(
    (value) => {
      setFincaSeleccionada(value);
      setEstanqueSeleccionado("");
      limpiarError("finca");
    },
    [limpiarError]
  );

  const handlePesoPromedioChange = useCallback(
    (value) => {
      setPesoPromedio(normalizarDecimal(value));
      limpiarError("pesoPromedio");
    },
    [limpiarError]
  );

  const handleKilosVendidosChange = useCallback(
    (value) => {
      setKilosVendidos(normalizarDecimal(value));
      limpiarError("kilosVendidos");
    },
    [limpiarError]
  );

  const handlePrecioChange = useCallback(
    (value) => {
      setPrecioKilo(String(Math.max(0, Math.round(Number(value) || 0))));
      limpiarError("precioKilo");
    },
    [limpiarError]
  );

  const handleCompradorChange = useCallback(
    (value) => {
      setCompradorSeleccionado(value);
      limpiarError("comprador");
    },
    [limpiarError]
  );

  const handleFechaChange = useCallback((value) => {
    setFechaVenta(value);
  }, []);

    const guardarCambios = useCallback(async () => {
    setMensaje("");
    setTipoMensaje("");

    const nuevosErrores = {};
    if (!fincaSeleccionada) nuevosErrores.finca = true;
    if (!estanqueSeleccionado) nuevosErrores.estanque = true;
    if (!pesoPromedio || Number(pesoPromedio) <= 0) nuevosErrores.pesoPromedio = true;
    if (!kilosVendidos || Number(kilosVendidos) <= 0) nuevosErrores.kilosVendidos = true;
    if (precioKiloNumero <= 0) nuevosErrores.precioKilo = true;
    if (!compradorSeleccionado) nuevosErrores.comprador = true;

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje("Rellenar campos obligatorios.");
      setTipoMensaje("error");
      return;
    }

    setGuardando(true);

    const ventaDTO = new MantVentaDTO({
      finca: Number(fincaSeleccionada),
      estanque: Number(estanqueSeleccionado),
      comprador: compradorSeleccionado === "cliente-generico" ? null : Number(compradorSeleccionado),
      pesoPromedio: Number(pesoPromedio),
      cantVendida: Number(kilosVendidos),
      precioKilo: precioKiloNumero,
      fecha: convertirFechaParaBackend(fechaVenta),
    });

    try {
      await localApi.inicializar();
      await VentasLocalService.update(Number(id), ventaDTO);
      setMensaje("Venta modificada correctamente.");
      setTipoMensaje("exito");
      if (typeof onGuardado === "function") {
        onGuardado({ success: true, message: "Venta modificada correctamente." });
      }
    } catch (error) {
      setMensaje("No se pudieron guardar los cambios de la venta.");
      setTipoMensaje("error");
    } finally {
      setGuardando(false);
    }
  }, [
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
    kilosVendidos,
    precioKiloNumero,
    compradorSeleccionado,
    fechaVenta,
    id,
    onGuardado,
  ]);

  return {
    ventaOriginal,
    cargandoVenta,
    fincaSeleccionada,
    estanqueSeleccionado,
    pesoPromedio,
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
    handleKilosVendidosChange,
    handlePrecioChange,
    handleCompradorChange,
    handleFechaChange,
    limpiarError,
    guardarCambios,
  };
}