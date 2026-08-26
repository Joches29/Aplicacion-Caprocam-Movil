/**
 * ============================================================
 * HOOK DE DETALLE DE VENTAS (SQLite Offline-First)
 * ============================================================
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { useError } from "../../../shared/context/ErrorContext.js";

import VentasLocalService from "../services/mantVentasLocal.service.js";
import { localApi } from "../../../database/local/localApi.service.js";

import Text from "../../../shared/components/Text.jsx";
import Icon from "../../../shared/components/Icons.jsx";
import Card from "../../../shared/components/Card.jsx";
import Button from "../../../shared/components/Button.jsx";
import { ICONS } from "../../../theme/icons.js";
import { COLORS } from "../../../theme/colors.js";
import { styles } from "../styles/VentaStyles.js";
import { formatearMontoColones } from "./useVenta.js";

export function useDetalleVenta({ onEdit, success, message } = {}) {
  const { mostrarError } = useError();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [fincaFiltro, setFincaFiltro] = useState("");
  const [estanqueFiltro, setEstanqueFiltro] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");

  const [ventas, setVentas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [compradores, setCompradores] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Manejo de mensaje de éxito (auto-ocultar a los 3s) — lógica nueva del web
  const [mostrarExito, setMostrarExito] = useState(
    success === "1" && Boolean(message)
  );

  useEffect(() => {
    if (success !== "1" || !message) {
      setMostrarExito(false);
      return;
    }

    setMostrarExito(true);
    const timer = setTimeout(() => setMostrarExito(false), 3000);
    return () => clearTimeout(timer);
  }, [success, message]);

  useEffect(() => {
    if (params?.fincaId) setFincaFiltro(String(params.fincaId));
    if (params?.estanqueId) setEstanqueFiltro(String(params.estanqueId));
  }, [params?.fincaId, params?.estanqueId]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      await localApi.inicializar();
      const [resVentas, resFincas, resEstanques, resCompradores] =
        await Promise.all([
          VentasLocalService.getAll().catch(() => []),
          localApi.fincas?.obtenerTodos?.().then((r) => r.data).catch(() => []),
          localApi.estanques?.obtenerTodos?.().then((r) => r.data).catch(() => []),
          localApi.compradores?.obtenerTodos?.().then((r) => r.data).catch(() => []),
        ]);

      setVentas(Array.isArray(resVentas) ? resVentas : []);
      setFincas(Array.isArray(resFincas) ? resFincas : []);
      setEstanques(Array.isArray(resEstanques) ? resEstanques : []);
      setCompradores(Array.isArray(resCompradores) ? resCompradores : []);
    } catch (error) {
      mostrarError(error);
    } finally {
      setCargando(false);
    }
  }, [mostrarError]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const opcionesFincas = useMemo(
    () => [
      { label: "Todas las fincas", value: "" },
      ...fincas.map((f) => ({
        label: f.nombre_finca || f.nombreFinca || f.nombre || `Finca ${f.id}`,
        value: String(f.id),
      })),
    ],
    [fincas]
  );

  const opcionesEstanques = useMemo(() => {
    const base = [{ label: "Todos los estanques", value: "" }];
    if (!fincaFiltro) return base;

    const filtrados = estanques
      .filter(
        (e) =>
          String(e.finca_id ?? e.idFinca ?? e.fincaId ?? e.finca) === String(fincaFiltro)
      )
      .map((e) => ({
        label: e.codigo || e.nombre || `Estanque ${e.id}`,
        value: String(e.id),
      }));

    return [...base, ...filtrados];
  }, [fincaFiltro, estanques]);

  const handleFincaChange = useCallback((value) => {
    setFincaFiltro(value);
    setEstanqueFiltro("");
  }, []);

  const handleEstanqueChange = useCallback((value) => {
    setEstanqueFiltro(value);
  }, []);

  const abrirModalEliminar = useCallback((venta) => {
    setVentaSeleccionada(venta);
    setModalVisible(true);
  }, []);

  const cancelarEliminar = useCallback(() => {
    setVentaSeleccionada(null);
    setModalVisible(false);
  }, []);

  const confirmarEliminar = useCallback(async () => {
    if (!ventaSeleccionada) return;
    setEliminando(true);
    try {
      await VentasLocalService.deleteById(ventaSeleccionada.id);
      setVentas((prev) => prev.filter((v) => String(v.id) !== String(ventaSeleccionada.id)));
      setModalVisible(false);
      setVentaSeleccionada(null);
    } catch (error) {
      mostrarError(error);
    } finally {
      setEliminando(false);
    }
  }, [ventaSeleccionada, mostrarError]);

  const ventasProcesadas = useMemo(() => {
    return ventas.map((v) => {
      const fincaObj = fincas.find(
        (f) => String(f.id) === String(v.finca || v.fincaId)
      );
      const estanqueObj = estanques.find(
        (e) => String(e.id) === String(v.estanque || v.estanqueId)
      );
      const compradorObj = compradores.find(
        (c) => String(c.id) === String(v.comprador || v.compradorId)
      );

      return {
        ...v,
        nombreFinca: fincaObj
          ? fincaObj.nombre_finca || fincaObj.nombreFinca || fincaObj.nombre
          : "Finca",
        nombreEstanque: estanqueObj
          ? estanqueObj.codigo || estanqueObj.nombre
          : "Estanque",
        nombreComprador:
          !v.comprador || v.comprador === "cliente-generico" || !compradorObj
            ? "Cliente genérico"
            : compradorObj.nombre,
      };
    });
  }, [ventas, fincas, estanques, compradores]);

  const ventasFiltradas = useMemo(() => {
    return ventasProcesadas.filter((v) => {
      if (fincaFiltro && String(v.finca || v.fincaId) !== String(fincaFiltro)) {
        return false;
      }
      if (
        estanqueFiltro &&
        String(v.estanque || v.estanqueId) !== String(estanqueFiltro)
      ) {
        return false;
      }
      if (fechaFiltro && v.fecha) {
        if (!v.fecha.includes(fechaFiltro)) return false;
      }
      return true;
    });
  }, [ventasProcesadas, fincaFiltro, estanqueFiltro, fechaFiltro]);

  // hayFiltro + mensajeDetalle (lógica nueva del web)
  const hayFiltro = Boolean(fincaFiltro && estanqueFiltro);

  const mensajeDetalle = useMemo(() => {
    if (hayFiltro) {
      return "Mostrando solo las ventas de la finca y estanque seleccionados.";
    }
    if (fincaFiltro) {
      return "Mostrando ventas de la finca seleccionada.";
    }
    return "Seleccione una finca y un estanque para ver su historial de ventas.";
  }, [fincaFiltro, estanqueFiltro, hayFiltro]);

  // descripcionEliminar más descriptiva (finca • estanque)
  const descripcionEliminar = useMemo(() => {
    if (!ventaSeleccionada) return "la venta";

    const finca = fincas.find(
      (item) => String(item.id) === String(ventaSeleccionada.finca || ventaSeleccionada.fincaId)
    );
    const estanque = estanques.find(
      (item) => String(item.id) === String(ventaSeleccionada.estanque || ventaSeleccionada.estanqueId)
    );

    const nombreFinca = finca?.nombre_finca || finca?.nombreFinca || finca?.nombre || "Finca";
    const nombreEstanque = estanque?.codigo || estanque?.nombre || "Estanque";

    return `${nombreFinca} • ${nombreEstanque}`;
  }, [ventaSeleccionada, fincas, estanques]);

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

  function FilaDetalle({ etiqueta, valor }) {
    return (
      <View style={styles.filaDetalle}>
        <Text
          size={12}
          color={COLORS.textTertiary}
          style={styles.etiquetaDetalle}
        >
          {etiqueta}
        </Text>
        <Text
          size={14}
          weight="600"
          color={COLORS.textSecondary}
          style={styles.valorDetalle}
        >
          {valor}
        </Text>
      </View>
    );
  }

  // TarjetaVenta ampliada con los campos nuevos del web
  function TarjetaVenta({ venta }) {
    return (
      <Card style={styles.tarjeta}>
        <View style={styles.tarjetaEncabezado}>
          <Text style={styles.nombreProducto}>
            {venta.nombreFinca} • {venta.nombreEstanque}
          </Text>
          <View style={styles.buttonsCrud}>
            <Button
              style={styles.delete}
              onPress={() => abrirModalEliminar(venta)}
            >
              <Icon icon={ICONS.delete} style={[styles.deleteIcon]} size={15} />
              <Text size={15} style={{ color: COLORS.error }}>
                Eliminar
              </Text>
            </Button>
            <Button style={styles.edit} onPress={() => onEdit?.(venta.id)}>
              <Icon icon={ICONS.edit} style={styles.editIcon} size={16} />
              <Text size={15} style={{ color: COLORS.primary }}>
                Editar
              </Text>
            </Button>
          </View>
        </View>
        <View style={styles.filasDetalle}>
          <FilaDetalle etiqueta="Cliente" valor={venta.nombreComprador} />
          <FilaDetalle
            etiqueta="Fecha"
            valor={venta.fecha ? new Date(venta.fecha).toLocaleDateString("es-CR") : "-"}
          />
          <FilaDetalle
            etiqueta="Peso promedio"
            valor={
              venta.pesoPromedio != null && venta.pesoPromedio !== ""
                ? `${Number(venta.pesoPromedio).toLocaleString("es-CR")} g`
                : "-"
            }
          />
          <FilaDetalle etiqueta="Kilos" valor={`${venta.cantVendida} kg`} />
          <FilaDetalle
            etiqueta="Precio/kg"
            valor={`₡ ${Number(venta.precioKilo || 0).toLocaleString("es-CR")}`}
          />
          <FilaDetalle
            etiqueta="Total"
            valor={formatearMontoColones(venta.total)}
          />
        </View>
      </Card>
    );
  }

  return {
    SectionTitle,
    FilaDetalle,
    TarjetaVenta,
    cargando,
    fincaFiltro,
    estanqueFiltro,
    fechaFiltro,
    setFincaFiltro,
    setEstanqueFiltro,
    setFechaFiltro,
    opcionesFincas,
    opcionesEstanques,
    ventasFiltradas,
    mensajeDetalle,
    hayFiltro,
    isWide,
    modalVisible,
    descripcionEliminar,
    eliminando,
    confirmarEliminar,
    cancelarEliminar,
    handleFincaChange,
    handleEstanqueChange,
    mostrarExito,
    mensajeExito: message,
  };
}