/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: DashboardEstadisticas.jsx
Autor: Gerald Andres Alfaro Solorzano
Fecha: 04/08/2026
Modulo: Dashboard
Descripcion:
Renderiza las tarjetas de resumen general del Dashboard
y muestra el panel seleccionado debajo de la card activa.
//////////////////////////////////////////////////////////
*/

import { View } from "react-native";

import Button from "../../../shared/components/Button";
import Icon from "../../../shared/components/Icons";
import CustomText from "../../../shared/components/Text";

import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import { styles } from "../styles/DashboardStyle";

function StatCard({
  id,
  selectedId,
  onPress,
  icon,
  value,
  label,
  cardStyle,
  iconStyle,
  iconColor,
  isTablet,
}) {
  const cardStyles = [
    styles.statCard,
    cardStyle,
    isTablet ? styles.statCardTablet : null,
    selectedId === id ? styles.statCardActive : null,
  ];

  return (
    <Button variant="ghost" style={cardStyles} onPress={() => onPress(id)}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconBox, iconStyle]}>
          <Icon icon={icon} size={22} color={iconColor} />
        </View>

        <Icon
          icon={selectedId === id ? ICONS.chevronUp : ICONS.chevronDown}
          size={18}
          color={COLORS.textTertiary}
        />
      </View>

      <View style={styles.statBottom}>
        <CustomText style={styles.statValue}>
          {value}
        </CustomText>

        <CustomText
          size={12}
          color={COLORS.textTertiary}
          style={styles.statLabel}
        >
          {label}
        </CustomText>
      </View>
    </Button>
  );
}

function PanelDebajoCard({ id, selectedId, children }) {
  if (selectedId !== id || !children) {
    return null;
  }

  return (
    <View style={styles.statPanelInline}>
      {children}
    </View>
  );
}

export default function DashboardEstadisticas({
  selectedCard,
  isTablet,
  totalFincas,
  totalEstanques,
  totalCasosSanitarios,
  onSelect,
  panelSeleccionado,
}) {
  return (
    <View style={[styles.statsGrid, isTablet ? styles.statsGridTablet : null]}>
      <StatCard
        id="fincas"
        selectedId={selectedCard}
        onPress={onSelect}
        icon={ICONS.home}
        value={totalFincas}
        label="Fincas registradas"
        cardStyle={styles.cardBlue}
        iconStyle={styles.iconBlue}
        iconColor={COLORS.primary}
        isTablet={isTablet}
      />

      <PanelDebajoCard id="fincas" selectedId={selectedCard}>
        {panelSeleccionado}
      </PanelDebajoCard>

      <StatCard
        id="estanques"
        selectedId={selectedCard}
        onPress={onSelect}
        icon={ICONS.waterFlow}
        value={totalEstanques}
        label="Estanques registrados"
        cardStyle={styles.cardIndigo}
        iconStyle={styles.iconIndigo}
        iconColor={COLORS.primary}
        isTablet={isTablet}
      />

      <PanelDebajoCard id="estanques" selectedId={selectedCard}>
        {panelSeleccionado}
      </PanelDebajoCard>

      <StatCard
        id="casos"
        selectedId={selectedCard}
        onPress={onSelect}
        icon={ICONS.shieldAlert}
        value={totalCasosSanitarios}
        label="Casos sanitarios"
        cardStyle={styles.cardYellow}
        iconStyle={styles.iconYellow}
        iconColor={COLORS.warning}
        isTablet={isTablet}
      />

      <PanelDebajoCard id="casos" selectedId={selectedCard}>
        {panelSeleccionado}
      </PanelDebajoCard>
    </View>
  );
}