/**
 * ============================================================
 * HOOK DE DETALLE DE VENTA
 * ============================================================
 *
 * Centraliza el estado y las operaciones locales
 * correspondientes al modulo de ventas.
 *
 * Trabaja contra SQLite usando VentaLocalService.
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
import { ICONS } from "../../../theme/icons";
import { COLORS } from "../../../theme/colors.js";
import { styles } from "../styles/VentaStyles.js";

/*
============================================================
HELPERS
============================================================
*/

function formatearMontoColones(value) {
  const numero = Math.round(Number(value) || 0);
  return `₡ ${String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/
export function useDetalleVenta({ onEdit, success, message } = {}) {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [ventas, setVentas] = useState([]);
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

  const { mostrarError } = useError();

  useEffect(() => {
    let activo = true;
    async function cargarCatalogosLocales() {
      try {
        await localApi.inicializar();
        const [resFincas, resEstanques] = await Promise.all([
          localApi.fincas.obtenerTodos(),
          localApi.estanques.obtenerTodos(),
        ]);
        if (activo) {
          setFincas(resFincas.data || []);
          setEstanques(resEstanques.data || []);
        }
      } catch (error) {
        console.error(error);
      }
    }
    cargarCatalogosLocales();
    return () => { activo = false; };
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarVentas = useCallback(async () => {
    try {
      await localApi.inicializar();
      const data = await VentasLocalService.getAll();
      setVentas(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const fincaInicial =
    typeof params.fincaFiltro === "string" ? params.fincaFiltro : "";
  const estanqueInicial =
    typeof params.estanqueFiltro === "string" ? params.estanqueFiltro : "";

  const [fincaFiltro, setFincaFiltro] = useState(fincaInicial);
  const [estanqueFiltro, setEstanqueFiltro] = useState(estanqueInicial);

  const opcionesFincas = useMemo(
    () => fincas.map((finca) => ({
      label: finca.nombre_finca || `Finca ${finca.id}`,
      value: String(finca.id),
    })),
    [fincas]
  );

  const opcionesEstanques = useMemo(() => {
    if (!fincaFiltro) return [];
    return estanques
      .filter((estanque) => Number(estanque.finca_id) === Number(fincaFiltro))
      .map((estanque) => ({
        label: estanque.codigo || `Estanque ${estanque.id}`,
        value: String(estanque.id),
      }));
  }, [fincaFiltro, estanques]);

  const ventasFiltradas = useMemo(() => {
    return (ventas || []).filter((venta) => {
      const coincideFinca = !fincaFiltro || Number(venta.finca) === Number(fincaFiltro);
      const coincideEstanque =
        !estanqueFiltro || Number(venta.estanque) === Number(estanqueFiltro);
      return coincideFinca && coincideEstanque;
    });
  }, [ventas, fincaFiltro, estanqueFiltro]);

  const hayFiltro = Boolean(fincaFiltro && estanqueFiltro);

  const mensajeDetalle = hayFiltro
    ? "Mostrando solo las ventas de la finca y estanque seleccionados."
    : "Seleccione una finca y un estanque para ver su historial de ventas.";

  const descripcionEliminar = useMemo(() => {
    if (!ventaSeleccionada) return "";
    const finca = fincas.find((item) => Number(item.id) === Number(ventaSeleccionada.finca));
    const estanque = estanques.find(
      (item) => Number(item.id) === Number(ventaSeleccionada.estanque)
    );
    return `${finca?.nombre_finca ?? "Finca"} • ${estanque?.codigo ?? "Estanque"}`;
  }, [ventaSeleccionada, fincas, estanques]);

  const handleFincaChange = useCallback((value) => {
    setFincaFiltro(value);
    setEstanqueFiltro("");
  }, []);

  const handleEstanqueChange = useCallback((value) => {
    setEstanqueFiltro(value);
  }, []);

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

  function TarjetaVenta({ venta }) {
    const finca = fincas.find((item) => Number(item.id) === Number(venta.finca));
    const estanque = estanques.find((item) => Number(item.id) === Number(venta.estanque));

    return (
      <Card style={styles.tarjeta}>
        <View style={styles.tarjetaEncabezado}>
          <Text style={styles.nombreProducto}>
            {finca?.nombre_finca ?? "Finca"} • {estanque?.codigo ?? "Estanque"}
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
          <FilaDetalle
            etiqueta="Fecha"
            valor={new Date(venta.fecha).toLocaleDateString("es-CR")}
          />
          <FilaDetalle
            etiqueta="Total"
            valor={formatearMontoColones(venta.total)}
          />
          <FilaDetalle etiqueta="Kilos" valor={`${venta.cantVendida} kg`} />
          <FilaDetalle
            etiqueta="Precio/kg"
            valor={`₡ ${Number(venta.precioKilo).toLocaleString("es-CR")}`}
          />
        </View>
      </Card>
    );
  }

  function abrirModalEliminar(venta) {
    setVentaSeleccionada(venta);
    setModalVisible(true);
  }

  function cancelarEliminar() {
    setModalVisible(false);
    setVentaSeleccionada(null);
  }

  async function confirmarEliminar() {
    if (!ventaSeleccionada) return;
    setEliminando(true);
    try {
      await VentasLocalService.deleteById(ventaSeleccionada.id);
      setVentas((actual) =>
        actual.filter((venta) => venta.id !== ventaSeleccionada.id)
      );
    } catch (error) {
      mostrarError(error);
    } finally {
      setEliminando(false);
      setModalVisible(false);
      setVentaSeleccionada(null);
    }
  }

  return {
    SectionTitle,
    FilaDetalle,
    TarjetaVenta,
    ventas,
    fincaFiltro,
    estanqueFiltro,
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