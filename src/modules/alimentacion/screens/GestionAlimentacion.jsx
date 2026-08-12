/**
 * ============================================================
 * SCREEN GESTIONALIMENTACION
 * ============================================================
 *
 * Compone el formulario de registro dentro de la pantalla de
 * Alimentación. No contiene lógica de negocio propia: recibe
 * todo (datos, callbacks y estado de validación) desde
 * AlimentacionScreen.
 *
 * QUITADO: AlimentacionStats (fila de tarjetas con
 * registros-de-hoy/kg-suministrados/estanques-activos) se retiró
 * del módulo. Sobrecargaba la pantalla en móvil, ya que para
 * calcular esos 3 números requería traer TODOS los registros de
 * alimentación en una pantalla que solo sirve para crear uno
 * nuevo. Junto con el componente se quitó `calcularStats` y las
 * props `alimentaciones`/`errorListado` que solo alimentaban esa
 * sección.
 *
 * Props principales:
 * - form / updateField: estado y setter del formulario.
 * - submitted / errores: estado de validación, se reenvían tal
 *   cual a AlimentacionForm.
 * - alerta: { visible, variant, mensaje } feedback de guardado.
 * - handleGuardar: callback del botón de guardar.
 * - onBack: callback opcional de navegación hacia atrás.
 *
 * Ejemplo:
 * <GestionAlimentacion
 *   form={form}
 *   updateField={updateField}
 *   submitted={submitted}
 *   errores={errores}
 *   alerta={alerta}
 *   handleGuardar={handleGuardar}
 * />
 */

import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView } from "react-native";

import AlimentacionForm from "../components/AlimentacionForm";

import Text from "../../../shared/components/Text";
import Alert from "../../../shared/components/Alert";
import Button from "../../../shared/components/Button";
import Icon from "../../../shared/components/Icons";

import { styles } from "../styles/AlimentacionStyles";
import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import { STYLE } from "../../../theme/style";

export default function GestionAlimentacion({
  form,
  updateField,
  submitted,
  errores,
  alerta,
  handleGuardar,
}) {
  const [catalogoErrors, setCatalogoErrors] = useState({
    infoGeneral: "",
    consumo: "",
  });

  const scrollRef = useRef(null);
  const catalogoError = catalogoErrors.infoGeneral || catalogoErrors.consumo;
  // Prioridad: alerta de guardado > error de catálogos.
  const alertVisible = alerta.visible || !!catalogoError;
  const alertMessage = alerta.visible ? alerta.mensaje : catalogoError;
  const alertVariant = alerta.visible ? alerta.variant : "danger";

  useEffect(() => {
    if (alertVisible) {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }
  }, [alertVisible]);

  return (
    <ScrollView
      ref={scrollRef}
      style={STYLE.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={STYLE.contentWrapper}>
        <AlimentacionForm
          form={form}
          updateField={updateField}
          submitted={submitted}
          errores={errores}
          onCatalogoErrorChange={(section, message) =>
            setCatalogoErrors((prev) => ({
              ...prev,
              [section]: message || "",
            }))
          }
        />

        {alertVisible && (
          <Alert
            variant={alertVariant}
            message={alertMessage}
            style={styles.alert}
          />
        )}

        <Button
          variant="outline"
          onPress={handleGuardar}
          style={styles.submitButton}
        >
          <View style={styles.buttonContent}>
            <Icon
              icon={ICONS.save}
              size={24}
              color={COLORS.primary}
            />

            <Text style={styles.buttonText}>
              Registrar Alimentación
            </Text>
          </View>
        </Button>

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
}