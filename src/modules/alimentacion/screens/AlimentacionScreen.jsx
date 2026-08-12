/*============================================================
 * SCREEN ALIMENTACIONSCREEN
 * ============================================================
 *
 * Pantalla principal del módulo de Alimentación. Toda la lógica
 * (estado del formulario, guardado y feedback del proceso) vive
 * en hooks/useAlimentacionScreen.js; esta screen solo arma la UI
 * a partir de lo que ese hook retorna.
 *
 * QUITADO: ya no espera un `loading` de listado completo antes de
 * mostrar el formulario (useAlimentacionScreen ya no carga la
 * lista de alimentaciones; ver ese hook para el detalle).
 *
 * Funcionalidad:
 * - Los mensajes de éxito, validación y error se muestran dentro
 *   del formulario, inmediatamente antes del botón Guardar, igual
 *   que en el módulo de Crecimiento.
 * - Después de guardar, el usuario permanece en el módulo para
 *   poder registrar varias alimentaciones consecutivas.
 * - Usa NavbarRegistro (header celeste con botón volver) en vez
 *   del Header.jsx compartido: Header.jsx está diseñado para
 *   pantallas de login (logo + título + subtítulo centrados),
 *   no para navegación con botón volver + ruta contextual.
 *
 * Props principales:
 * - navigation: objeto de navegación (opcional).
 * - onBack: callback opcional para volver atrás.
 *
 * Ejemplo:
 * <AlimentacionScreen navigation={navigation} />
 */

import React from "react";
import { View } from "react-native";
import useAlimentacionScreen from "../hooks/useAlimentacionScreen";
import GestionAlimentacion from "./GestionAlimentacion";
import NavbarRegistro from "../../../shared/components/NavbarRegistro";
import { STYLE } from "../../../theme/style";

export default function AlimentacionScreen({ navigation, onBack }) {
  const {
    form,
    updateField,
    submitted,
    errores,
    alerta,
    handleGuardar,
  } = useAlimentacionScreen(navigation);

  return (
    <>
      <NavbarRegistro
        Titulo="Alimentación"
        Subtitulo="Registro de alimentación"
        Icono="food"
      />

      <View style={STYLE.container}>
        <GestionAlimentacion
          form={form}
          updateField={updateField}
          submitted={submitted}
          errores={errores}
          handleGuardar={handleGuardar}
          alerta={alerta}
          onBack={onBack}
        />
      </View>
    </>
  );
}