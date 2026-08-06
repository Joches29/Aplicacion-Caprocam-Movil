/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: DashboardAlertas.jsx
Autor: Gerald Andres Alfaro Solorzano
Fecha: 05/08/2026
Modulo: Dashboard
Descripcion:
Renderiza el resumen de alertas operativas mostrando solo
la cantidad por categoria. El detalle completo se consulta
desde el portal de Alertas.
//////////////////////////////////////////////////////////
*/

import { View } from "react-native";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Icon from "../../../shared/components/Icons";
import CustomText from "../../../shared/components/Text";
import Title from "../../../shared/components/Title";

import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import { obtenerResumenAlertas } from "../utils/DashboardUtils";
import { styles } from "../styles/DashboardStyle";

function obtenerCantidadPorTipo(grupos, tipo) {
  const grupo = grupos.find((item) => item.tipo === tipo);

  return grupo && Array.isArray(grupo.alertas) ? grupo.alertas.length : 0;
}

function ResumenAlertaItem({ icono, titulo, cantidad, color }) {
  return (
    <View style={styles.alertDropdownHeader}>
      <View style={styles.alertDropdownLeft}>
        <Icon icon={icono} size={18} color={color} />

        <CustomText
          size={14}
          color={COLORS.textSecondary}
          style={styles.alertDropdownTitle}
        >
          {titulo}
        </CustomText>
      </View>

      <View style={styles.alertDropdownRight}>
        <CustomText size={14} color={color} weight="900">
          {cantidad}
        </CustomText>
      </View>
    </View>
  );
}

export default function DashboardAlertas({ alertas, onViewAll }) {
  const alertasSeguras = Array.isArray(alertas) ? alertas : [];
  const grupos = obtenerResumenAlertas(alertasSeguras);

  const totalCriticas = obtenerCantidadPorTipo(grupos, "critica");
  const totalAdvertencias = obtenerCantidadPorTipo(grupos, "advertencia");
  const totalInfo = obtenerCantidadPorTipo(grupos, "info");
  const totalAlertas = totalCriticas + totalAdvertencias + totalInfo;

  return (
    <Card style={styles.alertsCard}>
      <View style={styles.alertsHeader}>
        <View style={styles.alertsTitleBox}>
          <View style={styles.alertsIconBox}>
            <Icon
              icon={ICONS.notification || ICONS.alertTriangle}
              size={20}
              color={COLORS.warning}
            />
          </View>

          <View style={styles.alertsTextBox}>
            <Title level={6} style={styles.alertsTitle}>
              Alertas operativas
            </Title>

            <CustomText size={12} color={COLORS.textTertiary} numberOfLines={1}>
              Resumen por categoria
            </CustomText>
          </View>
        </View>

        <View style={styles.alertsCounter}>
          <CustomText size={13} weight="800" color={COLORS.warning}>
            {totalAlertas}
          </CustomText>
        </View>
      </View>

      <ResumenAlertaItem
        icono={ICONS.shieldAlert || ICONS.alertTriangle || ICONS.notification}
        titulo="Criticas"
        cantidad={totalCriticas}
        color={COLORS.error}
      />

      <ResumenAlertaItem
        icono={ICONS.alertTriangle || ICONS.notification}
        titulo="Advertencias"
        cantidad={totalAdvertencias}
        color={COLORS.warning}
      />

      <ResumenAlertaItem
        icono={ICONS.info || ICONS.notification}
        titulo="Informativas"
        cantidad={totalInfo}
        color={COLORS.primary}
      />

      <Button
        variant="outline"
        style={styles.viewAllAlertsButton}
        onPress={onViewAll}
      >
        <View style={styles.inlineButtonContentCentered}>
          <Icon
            icon={ICONS.notification || ICONS.alertTriangle}
            size={18}
            color={COLORS.primary}
          />

          <CustomText
            size={14}
            color={COLORS.primary}
            style={styles.viewAllAlertsText}
          >
            Ver todas las alertas
          </CustomText>
        </View>
      </Button>
    </Card>
  );
}