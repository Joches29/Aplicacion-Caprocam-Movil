/**
 * ============================================================
 * COMPONENTE: TARJETA DE SIEMBRA / PRE-CRÍA
 * ============================================================
 *
 * Renderiza la tarjeta informativa de una siembra o pre-cría
 * dentro del listado principal del módulo.
 *
 * FUNCIONALIDAD:
 * - Muestra estanque, finca, estado, fechas, cantidades, lote y PL.
 * - Adapta la información mostrada según el tipo de registro
 *   (siembra o pre-cría).
 *
 * DATOS:
 * - Recibe el registro y el label de finca ya resuelto desde la
 *   screen/hook padre. No consulta el servicio directamente.
 *
 * DEPENDENCIAS:
 * - CardPress, Badge, Icon (shared/components).
 *
 * La lógica de negocio y la navegación permanecen fuera de este
 * componente, en el hook y en la screen correspondientes.
 */
import { View, Text } from "react-native";

import CardPress from "../../../shared/components/CardPress";
import Badge from "../../../shared/components/Badge";
import Icon from "../../../shared/components/Icons";

import { ICONS } from "../../../theme/icons";
import { COLORS } from "../../../theme/colors";
import { styles } from "../styles/SiembraListStyles";

export default function SiembraCard({
  registro,
  fincaLabel,
  estanqueLabel,
  onVerDetalle,
}) {
  const esPreCria = registro.tipoRegistro === "precria";

  return (
    <CardPress style={styles.card} onPress={onVerDetalle}>
      <View style={[styles.cardHeader, { flexDirection: "column", alignItems: "stretch", gap: 6 }]}>
        {/* Fila 1: Estanque + Badge Tipo */}
        <View style={[styles.cardTitleRow, { justifyContent: "space-between", width: "100%" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 }}>
            <Icon icon={ICONS.water} color={COLORS.primary} />
            <Text style={styles.cardTitle}>
              {estanqueLabel || (registro.estanque ? `Estanque ${registro.estanque}` : "Sin estanque")}
            </Text>
          </View>
          <Badge
            label={esPreCria ? "Pre-Cría" : "Siembra"}
            variant={esPreCria ? "warning" : undefined}
            style={styles.statusBadge}
            textStyle={styles.statusText}
          />
        </View>

        {/* Fila 2: Finca + Badge Estado */}
        <View style={[styles.cardSubtitleRow, { justifyContent: "space-between", width: "100%" }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.cardSubtitle}>{fincaLabel}</Text>
          </View>
          <Badge
            label={registro.estado}
            variant="success"
            style={styles.statusBadge}
            textStyle={styles.statusText}
          />
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoRowLabel}>
            <Text style={styles.infoLabel}>
              {esPreCria ? "Pre-Cría:" : "Siembra:"}
            </Text>
          </View>
          <Text style={styles.infoValue}>#{registro.siembraId}</Text>
        </View>

        {esPreCria ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLabel}>
                <Text style={styles.infoLabel}>Fecha de inicio:</Text>
              </View>
              <Text style={styles.infoValue}>{registro.fechaInicio}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoRowLabel}>
                <Text style={styles.infoLabel}>Día de ciclo:</Text>
              </View>
              <Text style={styles.infoValue}>
                {registro.diasCultivo} de {registro.duracionDias}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoRowLabel}>
                <Text style={styles.infoLabel}>Cantidad inicial:</Text>
              </View>
              <Text style={styles.infoValue}>
                {Number(registro.cantidadInicial ?? 0).toLocaleString()}{" "}
                camarones
              </Text>
            </View>

            {registro.estado === "Finalizada" && (
              <View style={styles.infoRow}>
                <View style={styles.infoRowLabel}>
                  <Text style={styles.infoLabel}>Cantidad final:</Text>
                </View>
                <Text style={styles.infoValue}>
                  {Number(registro.cantidadFinal ?? 0).toLocaleString()}{" "}
                  camarones
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLabel}>
                <Text style={styles.infoLabel}>Fecha:</Text>
              </View>
              <Text style={styles.infoValue}>{registro.fechaSiembra}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoRowLabel}>
                <Text style={styles.infoLabel}>Día de cultivo:</Text>
              </View>
              <Text style={styles.infoValue}>
                {registro.diasCultivo} de {registro.duracionCiclo}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoRowLabel}>
                <Text style={styles.infoLabel}>Cantidad sembrada:</Text>
              </View>
              <Text style={styles.infoValue}>
                {Number(registro.cantidadSembrada ?? 0).toLocaleString()}{" "}
                camarones
              </Text>
            </View>
          </>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoRowLabel}>
            <Text style={styles.infoLabel}>Lote:</Text>
          </View>
          <Text style={styles.infoValue}>{registro.codigoLoteLarva}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoRowLabel}>
            <Text style={styles.infoLabel}>PL:</Text>
          </View>
          <Text style={styles.infoValue}>
            {esPreCria
              ? registro.plFinal || registro.plInicial
              : registro.plSiembra || registro.plLarva}
          </Text>
        </View>
      </View>
    </CardPress>
  );
}
