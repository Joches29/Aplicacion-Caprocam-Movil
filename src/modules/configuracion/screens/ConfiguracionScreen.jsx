/**
 * ============================================================
 * COMPONENTE: ConfiguracionScreen.jsx
 * ============================================================
 *
 * Módulo: Configuración
 * Descripción:
 * Pantalla de sincronización con tres acciones:
 * - Sincronización completa (subir + bajar)
 * - Solo descargar catálogos (Nube -> Móvil)
 * - Solo subir pendientes (Móvil -> Nube)
 */

import React from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useConfiguracion } from "../hooks/useConfiguracion";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import CustomText from "../../../shared/components/Text";
import Title from "../../../shared/components/Title";
import Icon from "../../../shared/components/Icons";
import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import styles from "../styles/ConfiguracionScreen.styles";

const syncIcon    = ICONS.update        || { provider: "MaterialIcons", name: "update" };
const uploadIcon  = ICONS.upload        || { provider: "MaterialIcons", name: "cloud-upload" };
const downloadIcon= ICONS.download      || { provider: "MaterialIcons", name: "cloud-download" };
const alertIcon   = ICONS.alertTriangle || { provider: "Feather",        name: "alert-triangle" };
const checkIcon   = ICONS.check         || { provider: "Feather",        name: "check-circle" };

// Filas del resumen de descarga
const FILAS_RESUMEN = [
  { key: "fincasCount",        label: "Fincas" },
  { key: "estanquesCount",     label: "Estanques" },
  { key: "proveedoresCount",   label: "Proveedores" },
  { key: "productosCount",     label: "Productos" },
  { key: "compradoresCount",   label: "Compradores" },
  { key: "inventarioCount",    label: "Inventario" },
  { key: "equiposCount",       label: "Equipos" },
  { key: "tareasCount",        label: "Tareas" },
  { key: "colaboradoresCount", label: "Colaboradores" },
  { key: "laboratoriosCount",  label: "Laboratorios" },
  { key: "procedenciasCount",  label: "Procedencias" },
  { key: "proveedoresLarvaCount", label: "Prov. Larva" },
  { key: "lotesLarvaCount",    label: "Lotes de Larva" },
  { key: "precriasCount",      label: "Precrías" },
  { key: "siembrasCount",      label: "Siembras" },
];

export default function ConfiguracionScreen() {
  const {
    isLoading,
    loadingMsg,
    error,
    syncResult,
    uploadResult,
    handleSync,
    handleDescargar,
    handleSubir,
  } = useConfiguracion();

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── TARJETA SINCRONIZACIÓN COMPLETA ── */}
        <Card style={styles.syncCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Icon icon={syncIcon} size={26} color={COLORS.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Title level={3} color={COLORS.textPrimary}>
                Sincronización Completa
              </Title>
              <CustomText size={13} color={COLORS.textTertiary}>
                Sube los registros pendientes y descarga todos los catálogos actualizados del servidor.
              </CustomText>
            </View>
          </View>

          <View style={styles.actionContainer}>
            <Button
              variant="primary"
              disabled={isLoading}
              onPress={handleSync}
              style={[styles.syncButton, isLoading && styles.disabledButton]}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <CustomText size={15} color={COLORS.white} style={styles.loadingText}>
                    {loadingMsg || "Sincronizando..."}
                  </CustomText>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <Icon icon={syncIcon} size={18} color={COLORS.white} />
                  <CustomText size={15} color={COLORS.white} style={styles.buttonText}>
                    Sincronizar Todo
                  </CustomText>
                </View>
              )}
            </Button>
          </View>

          {/* Botones secundarios */}
          {!isLoading && (
            <View style={styles.secondaryButtons}>
              <Button
                variant="outline"
                disabled={isLoading}
                onPress={handleDescargar}
                style={styles.secondaryBtn}
              >
                <View style={styles.buttonRow}>
                  <Icon icon={downloadIcon} size={16} color={COLORS.primary} />
                  <CustomText size={14} color={COLORS.primary}>
                    Solo Descargar
                  </CustomText>
                </View>
              </Button>

              <Button
                variant="outline"
                disabled={isLoading}
                onPress={handleSubir}
                style={styles.secondaryBtn}
              >
                <View style={styles.buttonRow}>
                  <Icon icon={uploadIcon} size={16} color={COLORS.primary} />
                  <CustomText size={14} color={COLORS.primary}>
                    Solo Subir
                  </CustomText>
                </View>
              </Button>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Icon icon={alertIcon} size={20} color={COLORS.error} />
              <CustomText size={13} color={COLORS.error} style={styles.errorText}>
                {error}
              </CustomText>
            </View>
          )}

          {/* Resultado de subida */}
          {uploadResult && !isLoading && (
            <View style={[styles.successBox, { marginTop: 10 }]}>
              <View style={styles.statRow}>
                <Icon icon={uploadIcon} size={16} color={COLORS.success} />
                <CustomText size={14} color={COLORS.textSecondary} style={{ marginLeft: 6 }}>
                  Registros subidos al servidor:
                </CustomText>
                <CustomText size={14} color={COLORS.primary} bold>
                  {uploadResult.subidos ?? 0}
                </CustomText>
              </View>
            </View>
          )}

          {/* Resultado de descarga */}
          {syncResult && !isLoading && (
            <View style={styles.successBox}>
              <View style={[styles.statRow, { marginBottom: 6 }]}>
                <Icon icon={checkIcon} size={16} color={COLORS.success} />
                <Title level={5} color={COLORS.success} style={{ marginLeft: 6 }}>
                  Última Descarga Exitosa
                </Title>
              </View>

              {FILAS_RESUMEN.map(({ key, label }) =>
                (syncResult[key] ?? 0) > 0 ? (
                  <View style={styles.statRow} key={key}>
                    <CustomText size={13} color={COLORS.textSecondary}>
                      {label}:
                    </CustomText>
                    <CustomText size={13} color={COLORS.primary} bold>
                      {syncResult[key]}
                    </CustomText>
                  </View>
                ) : null
              )}

              <View style={[styles.statRow, { marginTop: 6 }]}>
                <CustomText size={11} color={COLORS.textTertiary}>
                  Fecha: {syncResult.fechaSync ? new Date(syncResult.fechaSync).toLocaleString() : "—"}
                </CustomText>
              </View>
            </View>
          )}
        </Card>

      </ScrollView>
    </View>
  );
}