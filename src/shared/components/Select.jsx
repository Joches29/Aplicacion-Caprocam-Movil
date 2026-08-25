/**
 * ============================================================
 * COMPONENTE SELECT
 * ============================================================
 *
 * Selector global para formularios y filtros.
 *
 * Responsabilidad:
 * - Usa Modal con ScrollView para no deformar las cards.
 * - Soporta required, submitted, error y helperText.
 * - Muestra borde rojo solo luego del intento de guardado o error manual.
 * - Mantiene maxHeight en 140 para mostrar pocas opciones.
 * - Muestra mensaje por defecto cuando no hay opciones.
 */

import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { COLORS } from "../../theme/colors";
import { TYPOGRAPHY } from "../../theme/typography";

const EMPTY_OPTIONS_MESSAGE = "No se encuentran opciones o valores";
const DROPDOWN_MAX_HEIGHT = 140;
const DROPDOWN_GAP = 6;
const SCREEN_MARGIN = 12;

function valueIsEmpty(value) {
  if (value === undefined) {
    return true;
  }

  if (value === null) {
    return true;
  }

  return String(value).trim() === "";
}

function getSafeOptions(options) {
  if (Array.isArray(options) !== true) {
    return [];
  }

  return options
    .filter(function (option) {
      return option !== undefined && option !== null;
    })
    .map(function (option, index) {
      if (typeof option === "string" || typeof option === "number") {
        return {
          label: String(option),
          value: option,
          optionKey: `${String(option)}-${index}`,
        };
      }

      const value =
        option.value ??
        option.id ??
        option.servidorId ??
        option.servidor_id ??
        option.codigo ??
        option.label ??
        `option-${index}`;

      const label =
        option.label ??
        option.nombre ??
        option.codigo ??
        option.descripcion ??
        value;

      return {
        ...option,
        label: String(label),
        value: value,
        optionKey: `${String(value ?? "option")}-${index}`,
      };
    });
}

function getSelectedLabel(options, value, placeholder) {
  let selectedLabel = placeholder;

  if (options.length === 0) {
    selectedLabel = EMPTY_OPTIONS_MESSAGE;
    return selectedLabel;
  }

  for (let index = 0; index < options.length; index++) {
    if (String(options[index].value) === String(value)) {
      selectedLabel = String(options[index].label);
    }
  }

  return selectedLabel;
}

export default function Select({
  label = "",
  value = "",
  options = [],
  onChange,
  placeholder = "Seleccione una opcion",
  disabled = false,
  required = false,
  submitted = false,
  error = "",
  helperText = "",
  containerStyle,
  selectStyle,
  labelStyle,
  optionStyle,
  optionTextStyle,
  selectedTextStyle,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });

  const selectRef = useRef(null);
  const finalOptions = getSafeOptions(options);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  let showError = false;

  if (error !== "") {
    showError = true;
  }

  if (submitted === true && required === true && valueIsEmpty(value) === true) {
    showError = true;
  }

  function openOptions() {
    if (disabled === true) {
      return;
    }

    if (open === true) {
      closeOptions();
      return;
    }

    if (selectRef.current === null) {
      setOpen(true);
      return;
    }

    selectRef.current.measureInWindow(function (x, y, width, height) {
      const spaceBelow = windowHeight - (y + height);

      const openUpward =
        spaceBelow < DROPDOWN_MAX_HEIGHT + SCREEN_MARGIN &&
        y > spaceBelow;

      let top = y + height + DROPDOWN_GAP;

      if (openUpward === true) {
        top =
          y -
          DROPDOWN_GAP -
          Math.min(DROPDOWN_MAX_HEIGHT, y - SCREEN_MARGIN);
      }

      let left = x;

      if (left + width > windowWidth - SCREEN_MARGIN) {
        left = windowWidth - SCREEN_MARGIN - width;
      }

      if (left < SCREEN_MARGIN) {
        left = SCREEN_MARGIN;
      }

      setPosition({
        top: top,
        left: left,
        width: width,
        openUpward: openUpward,
      });

      setOpen(true);
    });
  }

  function closeOptions() {
    setOpen(false);
  }

  function handleSelect(optionValue) {
    if (onChange) {
      onChange(optionValue);
    }

    closeOptions();
  }

  const selectStyles = [styles.select];
  const selectedTextStyles = [styles.selectedText];

  if (disabled === true) {
    selectStyles.push(styles.disabledSelect);
  }

  if (showError === true) {
    selectStyles.push(styles.selectError);
  }

  if (valueIsEmpty(value) === true) {
    selectedTextStyles.push(styles.placeholderText);
  }

  if (finalOptions.length === 0) {
    selectedTextStyles.push(styles.emptySelectedText);
  }

  if (selectStyle) {
    selectStyles.push(selectStyle);
  }

  if (selectedTextStyle) {
    selectedTextStyles.push(selectedTextStyle);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label !== "" && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required === true && <Text style={styles.requiredMark}> *</Text>}
        </Text>
      )}

      <Pressable
        ref={selectRef}
        style={selectStyles}
        onPress={openOptions}
        disabled={disabled}
        accessibilityRole="button"
      >
        <Text style={selectedTextStyles} numberOfLines={1}>
          {getSelectedLabel(finalOptions, value, placeholder)}
        </Text>

        <Text style={styles.arrow}>{open === true ? "▴" : "▾"}</Text>
      </Pressable>

      <Modal
        transparent={true}
        visible={open}
        animationType="fade"
        onRequestClose={closeOptions}
        statusBarTranslucent={true}
      >
        <Pressable style={styles.modalBackground} onPress={closeOptions}>
          <View
            style={[
              styles.optionsContainer,
              {
                top: position.top,
                left: position.left,
                width: position.width,
              },
            ]}
            onStartShouldSetResponder={function () {
              return true;
            }}
          >
            <Pressable style={styles.closeRow} onPress={closeOptions}>
              <Text style={styles.closeRowText}>Cerrar ✕</Text>
            </Pressable>

            <ScrollView
              style={styles.optionsScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {finalOptions.length === 0 && (
                <View style={styles.emptyOption}>
                  <Text style={styles.emptyOptionText}>
                    {EMPTY_OPTIONS_MESSAGE}
                  </Text>
                </View>
              )}

              {finalOptions.map(function (option, index) {
                const optionStyles = [styles.option];
                const optionKey =
                  option.optionKey ??
                  `${String(option.value ?? "option")}-${index}`;

                if (String(option.value) === String(value)) {
                  optionStyles.push(styles.selectedOption);
                }

                if (optionStyle) {
                  optionStyles.push(optionStyle);
                }

                return (
                  <Pressable
                    key={optionKey}
                    style={optionStyles}
                    onPress={function () {
                      handleSelect(option.value);
                    }}
                  >
                    <Text style={[styles.optionText, optionTextStyle]}>
                      {String(option.label ?? "")}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {showError === true && error !== "" && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {showError === false && helperText !== "" && (
        <Text style={styles.helperTextStyle}>{helperText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  requiredMark: {
    color: COLORS.black,
  },

  select: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.inputBorder || COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  selectError: {
    borderColor: COLORS.error,
  },

  disabledSelect: {
    backgroundColor: COLORS.surface,
    opacity: 0.7,
  },

  selectedText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },

  placeholderText: {
    color: COLORS.textQuaternary,
  },

  emptySelectedText: {
    color: COLORS.textTertiary,
  },

  arrow: {
    marginLeft: 8,
    fontSize: 18,
    color: COLORS.textTertiary,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  optionsContainer: {
    position: "absolute",
    maxHeight: DROPDOWN_MAX_HEIGHT + 40,
    borderWidth: 1,
    borderColor: COLORS.inputBorder || COLORS.secondary,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },

  closeRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || COLORS.secondary,
    backgroundColor: COLORS.surface || COLORS.white,
    alignItems: "flex-end",
  },

  closeRowText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },

  optionsScroll: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },

  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || COLORS.secondary,
  },

  selectedOption: {
    backgroundColor: COLORS.primaryLight,
  },

  optionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },

  emptyOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },

  emptyOptionText: {
    fontSize: 15,
    color: COLORS.textTertiary,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },

  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.error,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },

  helperTextStyle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },
});