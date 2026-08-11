/**
 * ============================================================
 * ESTILOS DEL MODULO PARASITOLOGIA
 * ============================================================
 *
 * Contiene solamente los estilos propios del formulario.
 * Los estilos generales provienen de theme/style.
 */

import { StyleSheet } from "react-native";

import { COLORS } from "../../../theme/colors";
import { TYPOGRAPHY } from "../../../theme/typography";

export const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },

    card: {
        width: "100%",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border ?? COLORS.inputBorder ?? "#E5E7EB",
        borderRadius: 14,
    },

    alert: {
        width: "100%",
        marginBottom: 16,
    },

    alertText: {
        lineHeight: 18,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
    },

    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },

    sectionTitle: {
        marginLeft: 8,
        textTransform: "uppercase",
        fontFamily: TYPOGRAPHY.fontFamily.bold,
    },

    label: {
        color: COLORS.textPrimary,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
    },

    campoConError: {
        borderColor: COLORS.error,
    },

    disabledInput: {
        backgroundColor: COLORS.surface ?? "#F8FAFC",
        color: COLORS.textTertiary,
    },

    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },

    outlinePrimaryButton: {
        width: "100%",
        minHeight: 50,
        borderRadius: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.white,
    },

    inlineButtonContentCentered: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    saveText: {
        fontFamily: TYPOGRAPHY.fontFamily.bold,
    },
});