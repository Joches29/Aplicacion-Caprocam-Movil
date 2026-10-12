/**
 * ============================================================
 * SCREEN: ALERTAS
 * ============================================================
 *
 * Modulo independiente para ver todas las alertas por prioridad,
 * tipo y categoria.
 */

import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import CustomText from "../../../shared/components/Text";
import Icon from "../../../shared/components/Icons";

import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import { STYLE } from "../../../theme/style";

import useAlertasScreen from "../hooks/useAlertasScreen";

import {
  agruparPorCategoria,
  obtenerColorTipo,
  obtenerEstiloAlerta,
  obtenerIconoTipo,
  obtenerTituloTipo,
} from "../services/AlertasScreenService";

import { styles } from "../styles/AlertasStyle";

/*
============================================================
COMPONENTES INTERNOS
============================================================
*/

function ResumenAlertas({ grupos }) {
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <ResumenItem
          label="Criticas"
          value={grupos.critica.length}
          color={COLORS.error}
        />

        <ResumenItem
          label="Advertencias"
          value={grupos.advertencia.length}
          color={COLORS.warning}
        />

        <ResumenItem
          label="Info"
          value={grupos.info.length}
          color={COLORS.primary}
        />
      </View>
    </Card>
  );
}

function ResumenItem({ label, value, color }) {
  return (
    <View style={styles.summaryItem}>
      <CustomText size={22} color={color} style={styles.summaryValue}>
        {value}
      </CustomText>

      <CustomText
        size={12}
        color={COLORS.textTertiary}
        style={styles.summaryLabel}
      >
        {label}
      </CustomText>
    </View>
  );
}

function DropdownAlertas({
  tipo,
  alertas,
  abierto,
  onToggle,
  onDismiss,
  onPressAlerta,
}) {
  const color = obtenerColorTipo(tipo);
  const categorias = agruparPorCategoria(alertas);
  const nombresCategorias = Object.keys(categorias);
  const chevron = abierto === true ? ICONS.chevronUp : ICONS.chevronDown;

  return (
    <Card style={styles.dropdownCard}>
      <Button
        variant="ghost"
        style={[
          styles.dropdownHeader,
          {
            marginTop: 0,
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderWidth: 0,
            backgroundColor: "transparent",
          },
        ]}
        onPress={onToggle}
      >
        <View
          style={[
            styles.dropdownIconBox,
            {
              backgroundColor: COLORS.surface,
            },
          ]}
        >
          <Icon
            icon={obtenerIconoTipo(tipo)}
            size={20}
            color={color}
          />
        </View>

        <View style={styles.dropdownHeaderText}>
          <CustomText
            size={16}
            color={COLORS.textPrimary}
            style={styles.dropdownTitle}
          >
            {obtenerTituloTipo(tipo)}
          </CustomText>

          <CustomText
            size={12}
            color={COLORS.textTertiary}
            style={styles.dropdownSubtitle}
          >
            Separadas por categoria y ordenadas por prioridad
          </CustomText>
        </View>

        <View style={styles.counterBadge}>
          <CustomText size={13} color={color} weight="800">
            {alertas.length}
          </CustomText>
        </View>

        <Icon
          icon={chevron}
          size={22}
          color={COLORS.textTertiary}
        />
      </Button>

      {abierto === true && (
        <View style={styles.alertList}>
          {alertas.length === 0 && (
            <View style={styles.emptyBox}>
              <CustomText
                size={13}
                color={COLORS.textTertiary}
                align="center"
              >
                No hay alertas en esta categoria.
              </CustomText>
            </View>
          )}

          {nombresCategorias.map(function (categoria) {
            return (
              <View key={categoria}>
                <CustomText
                  size={12}
                  color={COLORS.textTertiary}
                  style={styles.categoryTitle}
                >
                  {categoria}
                </CustomText>

                {categorias[categoria].map(function (alerta) {
                  return (
                    <AlertaItem
                      key={alerta.id}
                      alerta={alerta}
                      onDismiss={onDismiss}
                      onPressAlerta={onPressAlerta}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function AlertaItem({
  alerta,
  onDismiss,
  onPressAlerta,
}) {
  return (
    <View style={obtenerEstiloAlerta(alerta.tipo)}>
      <Button
        variant="ghost"
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          minHeight: 0,
          marginTop: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          borderWidth: 0,
          backgroundColor: "transparent",
        }}
        onPress={function () {
          onPressAlerta(alerta);
        }}
      >
        <View style={styles.alertIconBox}>
          <Icon
            icon={alerta.icono}
            size={18}
            color={alerta.color}
          />
        </View>

        <View style={styles.alertContent}>
          <View style={styles.alertTitleRow}>
            <CustomText
              size={14}
              color={COLORS.textSecondary}
              style={styles.alertTitle}
            >
              {alerta.titulo}
            </CustomText>
          </View>

          <CustomText
            size={12}
            color={COLORS.textTertiary}
            style={styles.alertMessage}
          >
            {alerta.mensaje}
          </CustomText>

          {alerta.detalle !== "" && (
            <CustomText
              size={12}
              color={COLORS.textSecondary}
              style={styles.alertDetail}
            >
              {alerta.detalle}
            </CustomText>
          )}
        </View>
      </Button>

      <Button
        variant="ghost"
        style={[
          styles.dismissButton,
          {
            minHeight: 26,
            marginTop: 0,
            paddingHorizontal: 0,
            paddingVertical: 0,
            borderWidth: 0,
          },
        ]}
        onPress={function () {
          onDismiss(alerta.id);
        }}
      >
        <Icon
          icon={ICONS.close}
          size={16}
          color={COLORS.textTertiary}
        />
      </Button>
    </View>
  );
}

/*
============================================================
SCREEN PRINCIPAL
============================================================
*/

export default function AlertasScreen() {
  const {
    abiertos,
    grupos,
    loading,
    cargarPantalla,
    cambiarDropdown,
    descartar,
    irAAlerta,
  } = useAlertasScreen();

  return (
    <ScrollView
      style={STYLE.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={cargarPantalla}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={STYLE.contentWrapper}>
        <ResumenAlertas grupos={grupos} />

        <DropdownAlertas
          tipo="critica"
          alertas={grupos.critica}
          abierto={abiertos.critica}
          onToggle={function () {
            cambiarDropdown("critica");
          }}
          onDismiss={descartar}
          onPressAlerta={irAAlerta}
        />

        <DropdownAlertas
          tipo="advertencia"
          alertas={grupos.advertencia}
          abierto={abiertos.advertencia}
          onToggle={function () {
            cambiarDropdown("advertencia");
          }}
          onDismiss={descartar}
          onPressAlerta={irAAlerta}
        />

        <DropdownAlertas
          tipo="info"
          alertas={grupos.info}
          abierto={abiertos.info}
          onToggle={function () {
            cambiarDropdown("info");
          }}
          onDismiss={descartar}
          onPressAlerta={irAAlerta}
        />
      </View>
    </ScrollView>
  );
}