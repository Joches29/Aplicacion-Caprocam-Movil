/**
 * ============================================================
 * ESTILOS LISTADO DE SIEMBRAS
 * ============================================================
 *
 * Contiene los estilos visuales utilizados por la pantalla
 * de listado de siembras.
 *
 * Incluye:
 * - Encabezado de contenido.
 * - Tarjetas de siembra.
 * - Información resumida.
 * - Botones y estados visuales.
 *
 * Utiliza estilos globales de colores y tipografía.
 */
import { StyleSheet } from "react-native";

import { COLORS } from "../../../theme/colors";
import { TYPOGRAPHY } from "../../../theme/typography";

export const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  contentHeader: {
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    flex: 1,
  },
  newButton: {
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 0,
    alignSelf: "stretch",
  },
  newButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    textAlign: "center",
    flexShrink: 0,
  },
  newButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newButtonCompact: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  barraBusqueda: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
    width: "100%",
  },
  searchBarContainer: {
    flex: 1,
    minHeight: 44,
  },
  filterColumn: {
    width: 160,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    marginTop: 0,
    gap: 8,
  },
  filterButton: {
    alignSelf: "stretch",
    minHeight: 44,
    marginTop: 0,
  },
  buttonRow: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  contadorResultados: {
    marginBottom: 12,
    color: COLORS.textTertiary,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },
  card: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    flexShrink: 1,
  },
  cardSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  cardSubtitle: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    flexShrink: 1,
  },
  infoRowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  typeBadgeSiembra: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeSiembraText: {
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 11,
  },
  typeBadgePreCria: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgePreCriaText: {
    color: COLORS.warning,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 11,
  },
  statusBadge: {
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: COLORS.success,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 11,
  },
  cardBody: {
    gap: 8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  infoLabel: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },
  infoValue: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    textAlign: "right",
  },
  detailButton: {
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 0,
  },
  detailButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  detailButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
});
