/**
 * ============================================================
 * STYLES: InventarioStyles
 * ============================================================
 *
 * Responsabilidad:
 * Estilos visuales de la pantalla de Inventarios (screens/InventarioScreen.jsx).
 *
 * Datos:
 * No aplica, solo estilos.
 *
 * Validaciones:
 * No aplica.
 *
 * Navegación:
 * No aplica.
 *
 * Dependencias:
 * theme/colors.js, theme/typography.js, theme/style.js.
 */

import { StyleSheet } from "react-native";
import { COLORS } from "../../../theme/colors";
import { TYPOGRAPHY } from "../../../theme/typography";
import { STYLE } from "../../../theme/style";

export const styles = StyleSheet.create({
  zonaFiltros: {
    marginTop: 12,
    gap: 10,
  },

  barraBusqueda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchBarContainer: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },

  filterButton: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    marginTop: 0,
    marginBottom: 0,
  },

  alertaBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
  },

  alertaTexto: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    flex: 1,
  },

  contadorResultados: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    flexShrink: 1,
  },

  botonAgregar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  floatingButtonWrapper: {
    position: "absolute",
    bottom: 72,
    left: 16,
    right: 16,
    alignItems: "center",
  },

  lista: {
    ...STYLE.contentWrapper,
    paddingBottom: 130,
  },

  tarjeta: {
    marginTop: 12,
    width: "100%",
    overflow: "hidden",
  },

  tarjetaStockBajo: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.error,
  },

  filaTituloIcono: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  nombreProducto: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    flexShrink: 1,
  },

  badgeStockBajo: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },

  badgeStockBajoTexto: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },

  badgeCategoria: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: 2,
  },

  badgeTexto: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },

  filasDetalle: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  filaDetalle: {
    width: "45%",
    gap: 2,
  },

  etiquetaDetalle: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },

  valorDetalle: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
});