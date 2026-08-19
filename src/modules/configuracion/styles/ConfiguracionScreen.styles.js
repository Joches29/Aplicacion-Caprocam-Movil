/**
 * ============================================================
 * ESTILOS: ConfiguracionScreen.styles.js
 * ============================================================
 *
 * Módulo: Configuración
 * Descripción:
 * Hoja de estilos correspondiente a la pantalla ConfiguracionScreen.
 * Separada del componente para mantener el principio de separación
 * de responsabilidades y facilitar el mantenimiento visual.
 */

import { StyleSheet } from "react-native";
import { COLORS } from "../../../theme/colors";

const styles = StyleSheet.create({

  syncCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  actionContainer: {
    marginVertical: 12,
  },
  syncButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
  },
  successBox: {
    backgroundColor: COLORS.successLight || "#CDEDD5",
    padding: 14,
    borderRadius: 8,
    marginTop: 14,
  },
  successTitle: {
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
    secondaryButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  secondaryBtn: {
    flex: 1,
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  }
});

export default styles;
