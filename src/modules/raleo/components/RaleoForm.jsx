/**
 * ============================================================
 * COMPONENTE RALEOFORM
 * ============================================================
 *
 * Formulario de registro de raleo. Agrupa los campos de
 * finca/estanque y los parámetros del raleo, y aplica el contrato
 * visual de campos obligatorios: asterisco visible desde el primer
 * render, y borde rojo + mensaje de error solo después de que la
 * screen marque `submitted = true` y el campo resulte inválido.
 *
 * CAMBIO (documento de requerimientos):
 *
 * El usuario ahora digita los KILOGRAMOS RETIRADOS, no el
 * porcentaje. El porcentaje de raleo y la biomasa restante pasaron
 * a ser campos de solo lectura que calcula el sistema:
 *     porcentaje      = (kgRetirados / biomasaEstimada) x 100
 *     biomasaRestante = biomasaEstimada - kgRetirados
 *
 * CORREGIDO: este componente leia/escribia `form.biomasaAntes`,
 * un campo que no existe en el estado que expone useRaleo.js (el
 * campo real es `biomasaEstimada`, mismo nombre que usa
 * useRaleoScreen.js y RaleoLocal.service.js). Se unifica todo a
 * `biomasaEstimada`; el label visible ("Biomasa antes del raleo")
 * no cambia, solo el nombre interno del campo.
 *
 * Campos eliminados y por qué:
 * - "Porcentaje de raleo (%)": era un Input editable; el documento
 *   lo define como valor generado por fórmula. Sigue visible, pero
 *   como campo calculado de solo lectura.
 * - "Peso promedio estimado (g)": no aparece en los requerimientos.
 *   El peso que se debe guardar es el retirado en kg, que ahora es
 *   el campo "Cantidad retirada mediante raleo (kg)".
 * - "Objetivo del raleo" y toda la card "Método de Extracción":
 *   no aparecen en los requerimientos ni en el schema nuevo.
 *
 * Funcionalidad:
 * - Finca/estanque usan datos reales locales via
 *   useFincaEstanqueRaleo (SQLite).
 * - Todos los colores usados vienen de COLORS, sin valores
 *   hardcodeados.
 *
 * Props principales:
 * - form: objeto con los valores actuales del formulario.
 * - updateField: función (campo, valor) para actualizar el form.
 * - submitted: boolean, true cuando el usuario ya intentó guardar.
 * - errores: objeto { campo: mensaje } devuelto por validarForm().
 * - porcentajeCalculado / biomasaCalculada: valores derivados que
 *   entrega useRaleoScreen / useEditarRaleo; se muestran de solo
 *   lectura.
 *
 * Ejemplo:
 * <RaleoForm
 *   form={form}
 *   updateField={updateField}
 *   submitted={submitted}
 *   errores={errores}
 *   porcentajeCalculado={porcentajeRaleo}
 *   biomasaCalculada={biomasaRestante}
 * />
 */

import React from "react";
import { View } from "react-native";
import Card from "../../../shared/components/Card";
import Select from "../../../shared/components/Select";
import Input from "../../../shared/components/Input";
import DateInput from "../../../shared/components/DateInput";
import Text from "../../../shared/components/Text";
import Icon from "../../../shared/components/Icons";
import { COLORS } from "../../../theme/colors";
import { TYPOGRAPHY } from "../../../theme/typography";
import { ICONS } from "../../../theme/icons";
import { useFincaEstanqueRaleo } from "../hooks/useFincaEstanqueRaleo";
import { styles as formStyles } from "../styles/RaleoStyles";

const { bordeError, sectionTitleRow, sectionIcon } = formStyles;

function soloDecimal(valor, maxDigitos = 7) {
  /*
  Descripcion:
  Limpia lo que escribe el usuario en un campo decimal: descarta
  cualquier caracter que no sea numero o punto, evita mas de un
  punto decimal, evita ceros a la izquierda y limita la cantidad
  total de digitos.

  Parametros:
  - valor: Texto crudo recibido del Input.
  - maxDigitos: Maximo de digitos numericos permitidos.

  Retorna:
  - Texto normalizado, o null si excede el maximo (para que el
    llamador ignore el cambio y no borre lo ya escrito).
  */
  let limpio = valor.replace(/[^0-9.]/g, "");

  const partes = limpio.split(".");
  if (partes.length > 2) {
    limpio = `${partes[0]}.${partes.slice(1).join("")}`;
  }

  if (!limpio.includes(".")) {
    limpio = limpio.replace(/^0+(?=\d)/, "");
  }

  if (limpio.replace(".", "").length > maxDigitos) {
    return null;
  }

  return limpio;
}

export default function RaleoForm({
  form = {},
  updateField = () => {},
  submitted = false,
  errores = {},
  porcentajeCalculado = "",
  biomasaCalculada = "",
}) {
  const invalidoFinca = submitted && !!errores.finca;
  const invalidoEstanque = submitted && !!errores.estanque;
  const invalidoFecha = submitted && !!errores.fecha;
  const invalidoBiomasaEstimada = submitted && !!errores.biomasaEstimada;
  const invalidoKgRetirados = submitted && !!errores.kgRetirados;

  const { fincasOptions, estanquesOptions } = useFincaEstanqueRaleo(form.finca);

  const handleFincaChange = (idFinca) => {
    updateField("finca", idFinca);
    updateField("estanque", "");
  };

  return (
    <View>
      <Card>
        <View style={sectionTitleRow}>
          <Icon icon={ICONS.calendar} size={18} color={COLORS.primary} style={sectionIcon} />
          <Text size={18} weight="700" color={COLORS.textSecondary}>
            Información General
          </Text>
        </View>

        <DateInput
          label="Fecha del Raleo *"
          value={form.fecha ?? ""}
          onChangeText={(v) => updateField("fecha", v)}
          labelStyle={{ fontFamily: TYPOGRAPHY.fontFamily.medium }}
          inputStyle={invalidoFecha ? bordeError : null}
        />

        <Select
          label="Finca *"
          value={form.finca}
          onChange={handleFincaChange}
          options={fincasOptions}
          placeholder="Seleccionar finca"
          selectStyle={invalidoFinca ? bordeError : null}
        />

        <Select
          label="Estanque *"
          value={form.estanque}
          onChange={(v) => updateField("estanque", v)}
          options={estanquesOptions}
          placeholder="Seleccionar estanque"
          selectStyle={invalidoEstanque ? bordeError : null}
        />
      </Card>

      <Card>
        <View style={sectionTitleRow}>
          <Icon icon={ICONS.raleo} size={18} color={COLORS.primary} style={sectionIcon} />
          <Text size={18} weight="700" color={COLORS.textSecondary}>
            Parámetros del Raleo
          </Text>
        </View>

        <Input
          label="Biomasa antes del raleo (kg) *"
          placeholder="Ej: 2000"
          value={String(form.biomasaEstimada ?? "")}
          keyboardType="decimal-pad"
          onChangeText={(v) => {
            const limpio = soloDecimal(v);
            if (limpio !== null) updateField("biomasaEstimada", limpio);
          }}
          style={invalidoBiomasaEstimada ? bordeError : null}
          error={submitted ? (errores.biomasaEstimada || "") : ""}
        />

        <Input
          label="Cantidad retirada mediante raleo (kg) *"
          placeholder="Ej: 1000"
          value={String(form.kgRetirados ?? "")}
          keyboardType="decimal-pad"
          onChangeText={(v) => {
            const limpio = soloDecimal(v);
            if (limpio !== null) updateField("kgRetirados", limpio);
          }}
          style={invalidoKgRetirados ? bordeError : null}
          error={submitted ? (errores.kgRetirados || "") : ""}
        />

        {/*
          Campos calculados por el sistema. No se digitan y no se
          envian tal cual al backend: se recalculan al guardar, para
          que exista una sola fuente de verdad (calcularRaleo).
        */}
        <Input
          label="Porcentaje de raleo (%)"
          value={porcentajeCalculado !== "" ? `${porcentajeCalculado} %` : ""}
          placeholder="Se calcula automáticamente"
          editable={false}
        />

        <Input
          label="Biomasa restante (kg)"
          value={biomasaCalculada !== "" ? `${biomasaCalculada} kg` : ""}
          placeholder="Se calcula automáticamente"
          editable={false}
        />
      </Card>

      <Card>
        <View style={sectionTitleRow}>
          <Icon icon={ICONS.clipboard} size={18} color={COLORS.primary} style={sectionIcon} />
          <Text size={18} weight="700" color={COLORS.textSecondary}>
            Observaciones
          </Text>
        </View>

        <Input
          label="Notas adicionales"
          placeholder="Ingrese observaciones del raleo"
          value={form.observaciones ?? ""}
          onChangeText={(v) => updateField("observaciones", v)}
        />
      </Card>
    </View>
  );
}