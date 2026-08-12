/**
 * =========================================================================
 * PANTALLA EDITAR SIEMBRA
 * =========================================================================
 *
 * Pantalla encargada de mostrar el formulario editable de una siembra
 * o pre-cría existente, y de guardar o finalizar los cambios.
 *
 * FUNCIONALIDAD:
 *
 * 1. Carga la información de una siembra o pre-cría seleccionada
 *    (mediante el mismo hook que usa el detalle, useDetalleSiembra,
 *    que ya trabaja 100% contra los datos locales/offline del
 *    dispositivo - SiembraLocalService, PrecriaLocalService, etc.).
 *
 * 2. Al montar, activa el modo edición del hook (iniciarEdicion) para
 *    que el formulario arranque habilitado sin necesidad de un paso
 *    intermedio.
 *
 * 3. Renderiza las secciones del formulario en modo edición:
 *      - Información general.
 *      - Datos de larva.
 *      - Cálculo de población.
 *
 * 4. Permite guardar o cancelar los cambios realizados.
 *
 * 5. Si la pantalla recibe el param "finalizar" (llega desde el botón
 *    "Finalizar Pre-Cría" del Detalle), el botón de guardar ejecuta
 *    handleFinalizarPreCria en vez de guardar - mismo formulario,
 *    distinta acción de submit.
 *
 * 6. Cuando la Siembra viene de una Pre-Cría (pasoPorPrecria === "si"),
 *    el resumen embebido de Pre-Cría y la sección "Datos de larva"
 *    quedan siempre en modo lectura, sin importar que el resto del
 *    formulario esté en edición — son datos heredados, no propios de
 *    esta Siembra.
 *
 * 7. Al guardar o finalizar con éxito, o al cancelar, vuelve a la
 *    pantalla anterior (router.back()). El caso "finalizar" navega
 *    por su cuenta (handleFinalizarPreCria ya redirige a la pantalla
 *    de Nueva Siembra), así que aquí solo se vuelve atrás para el
 *    guardado normal y para cancelar.
 *
 * LÓGICA:
 * - La gestión del estado, validaciones y acciones se realiza mediante:
 *  -useDetalleSiembra.
 *
 * COMPONENTES UTILIZADOS:
 *
 * - Card.
 * - Button.
 * - Alert.
 * - Componentes de sección del módulo Siembra.
 *
 * NAVEGACIÓN:
 * - Pantalla anterior (router.back())
 *      Se vuelve aquí al guardar/finalizar con éxito, o al cancelar.
 *
 * DEPENDENCIAS PRINCIPALES:
 *
 * - useDetalleSiembra.
 * - InformacionGeneralSection.
 * - DatosLarvaSection.
 * - CalculoPoblacionSection.
 * - PreCriaSection.
 * - Componentes compartidos:
 *      - Card, Button, Alert, Icon, NavbarRegistro.
 *
 * IMPORTANTE:
 *
 * - No contiene reglas de negocio.
 * - No realiza cálculos directamente.
 * - Comparte el hook con DetalleSiembraScreen: separar en dos pantallas
 *   evita combinar "editar" y "detalle" en un mismo screen, según el
 *   estándar de una ventana por operación CRUD.
 *
 * =========================================================================
 */
import React, { useRef, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ScrollView } from "react-native";

import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import Alert from "../../../shared/components/Alert";
import Icon from "../../../shared/components/Icons";
import NavbarRegistro from "../../../shared/components/NavbarRegistro";
import Text from "../../../shared/components/Text";
import Modal from "../../../shared/components/Modal";
import Title from "../../../shared/components/Title";

import InformacionGeneralSection from "../components/InformacionGeneralSection";
import DatosLarvaSection from "../components/DatosLarvaSection";
import CalculoPoblacionSection from "../components/CalculoPoblacionSection";
import PreCriaSection from "../components/PreCriaSection";

import { ICONS } from "../../../theme/icons";
import { COLORS } from "../../../theme/colors";
import { styles } from "../styles/DetalleSiembraStyles";
import { STYLE } from "../../../theme/style";

import useDetalleSiembra from "../hooks/useDetalleSiembra";

export default function EditarSiembraScreen() {
  const { id, finalizar, tipoRegistro } = useLocalSearchParams();
  const router = useRouter();
  const [saliendo, setSaliendo] = React.useState(false);
  const esFinalizar = finalizar === "1";

  const {
    siembra,
    formData,
    fincas,
    estanques,
    proveedoresLarva,
    laboratoriosLarva,
    procedenciasLarva,
    plLarva,
    tecnicasCultivo,
    isEditing,
    mensaje,
    mensajeVariant,
    handleChange,
    handleChangeFinca,
    handleChangeEstanque,
    guardar,
    handleFinalizarPreCria,
    guardando,
    confirmarFinalizar,
    setConfirmarFinalizar,
    iniciarEdicion,
    cancelarEdicion,
    handleAgregarProveedorLarva,
    handleAgregarLaboratorioLarva,
    handleAgregarProcedenciaLarva,
    handleEditarProveedorLarva,
    handleEditarLaboratorioLarva,
    handleEditarProcedenciaLarva,
    handleEliminarProveedorLarva,
    handleEliminarLaboratorioLarva,
    handleEliminarProcedenciaLarva,
    todosEstanques,
    fieldHelpers,
    fincaLabel,
    estanqueLabel,
    scrollRef,
    handlePresionarGuardar,
  } = useDetalleSiembra(id, tipoRegistro, esFinalizar);

  // El hook nace en modo lectura (isEditing = false): esta pantalla
  // existe solo para editar, así que en cuanto haya datos cargados
  // activamos el modo edición automáticamente, una sola vez.
  const empezoEdicionRef = useRef(false);
  useEffect(() => {
    if (!empezoEdicionRef.current && siembra && formData) {
      empezoEdicionRef.current = true;
      iniciarEdicion();
    }
  }, [siembra, formData, iniciarEdicion]);

  // El resultado de guardar/actualizar (éxito o error de la operación,
  // ya pasadas las validaciones de campos) se muestra en la pantalla
  // principal, no aquí. Los errores de validación de campos nunca
  // pasan por "guardando" (se detectan antes de llamar al backend),
  // así que siguen mostrándose en este formulario para que la persona
  // pueda corregirlos. El caso "finalizar" pre-cría ya navega por su
  // cuenta dentro del hook (con su propio mensaje de éxito), así que
  // se excluye acá para no duplicar la navegación.
  //
  // "saliendo" se calcula de forma síncrona durante el render (no en
  // un useEffect) apenas "guardando" pasa de true a false con un
  // mensaje listo. Si se calculara en un efecto, esta pantalla
  // alcanza a pintar el Alert de "editado correctamente" un instante
  // antes de navegar - por eso no se usa useEffect para esto.
  const estabaGuardandoRef = useRef(false);
  const guardandoAnteriorRef = useRef(guardando);
  if (guardandoAnteriorRef.current !== guardando) {
    guardandoAnteriorRef.current = guardando;
    if (guardando) {
      estabaGuardandoRef.current = true;
    } else if (estabaGuardandoRef.current) {
      estabaGuardandoRef.current = false;
      if (!esFinalizar && mensaje !== "" && !saliendo) {
        setSaliendo(true);
      }
    }
  }

  // La navegación en sí (efecto secundario real) sigue viviendo en un
  // efecto, ya sucede después de que "saliendo" ya ocultó el Alert.
  useEffect(() => {
    if (!saliendo) return;
    router.replace({
      pathname: "/siembra",
      params: { mensajeExito: mensaje, mensajeVariant },
    });
  }, [saliendo, mensaje, mensajeVariant, router]);

  if (!siembra || !formData) {
    return (
      <NavbarRegistro
        Titulo="Editar"
        Subtitulo="Cargando información..."
        Icono="shrimp"
      />
    );
  }

  return (
    <>
      <NavbarRegistro
        Titulo={
          formData.tipoRegistro === "precria"
            ? "Editar Pre-Cría"
            : "Editar Siembra"
        }
        Subtitulo={`${estanqueLabel} – ${fincaLabel}`}
        Icono="shrimp"
      />
      <ScrollView
        ref={scrollRef}
        style={STYLE.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={STYLE.contentWrapper}>
          {formData.tipoRegistro === "precria" ? (
            <>
              <PreCriaSection
                formData={formData}
                onChange={handleChange}
                onChangeFinca={handleChangeFinca}
                onChangeEstanque={handleChangeEstanque}
                fincas={fincas}
                estanques={estanques}
                mode="edit"
                fieldHelpers={fieldHelpers}
                isAutonomous={true}
                plOptions={plLarva}
              />
              <DatosLarvaSection
                formData={formData}
                onChange={handleChange}
                proveedoresLarva={proveedoresLarva}
                laboratoriosLarva={laboratoriosLarva}
                procedenciasLarva={procedenciasLarva}
                plLarva={plLarva}
                mode="edit"
                fieldHelpers={fieldHelpers}
                onAgregarProveedor={handleAgregarProveedorLarva}
                onAgregarLaboratorio={handleAgregarLaboratorioLarva}
                onAgregarProcedencia={handleAgregarProcedenciaLarva}
                onEditarProveedor={handleEditarProveedorLarva}
                onEditarLaboratorio={handleEditarLaboratorioLarva}
                onEditarProcedencia={handleEditarProcedenciaLarva}
                onEliminarProveedor={handleEliminarProveedorLarva}
                onEliminarLaboratorio={handleEliminarLaboratorioLarva}
                onEliminarProcedencia={handleEliminarProcedenciaLarva}
              />
            </>
          ) : (
            <>
              <InformacionGeneralSection
                formData={formData}
                onChange={handleChange}
                onChangeFinca={handleChangeFinca}
                onChangeEstanque={handleChangeEstanque}
                fincas={fincas}
                estanques={estanques}
                tecnicasCultivo={tecnicasCultivo}
                mode="edit"
                fieldHelpers={fieldHelpers}
              />
              {formData.pasoPorPrecria === "si" && formData.precriaId && (
                <PreCriaSection
                  formData={formData}
                  mode="view"
                  fieldHelpers={fieldHelpers}
                />
              )}
              <DatosLarvaSection
                formData={formData}
                onChange={handleChange}
                proveedoresLarva={proveedoresLarva}
                laboratoriosLarva={laboratoriosLarva}
                procedenciasLarva={procedenciasLarva}
                plLarva={plLarva}
                mode={formData.pasoPorPrecria === "si" ? "view" : "edit"}
                fieldHelpers={fieldHelpers}
                onAgregarProveedor={handleAgregarProveedorLarva}
                onAgregarLaboratorio={handleAgregarLaboratorioLarva}
                onAgregarProcedencia={handleAgregarProcedenciaLarva}
                onEditarProveedor={handleEditarProveedorLarva}
                onEditarLaboratorio={handleEditarLaboratorioLarva}
                onEditarProcedencia={handleEditarProcedenciaLarva}
                onEliminarProveedor={handleEliminarProveedorLarva}
                onEliminarLaboratorio={handleEliminarLaboratorioLarva}
                onEliminarProcedencia={handleEliminarProcedenciaLarva}
              />
              <CalculoPoblacionSection
                formData={formData}
                onChange={handleChange}
                mode="edit"
                fieldHelpers={fieldHelpers}
              />
            </>
          )}

          {mensaje !== "" && !saliendo && (
            <Alert
              message={mensaje}
              variant={mensajeVariant}
              style={[
                styles.alert,
                mensajeVariant === "success" && styles.alertSuccess,
              ]}
              textStyle={{ textAlign: "center" }}
            />
          )}

          <View style={styles.actions}>
            <Button
              style={styles.button}
              onPress={esFinalizar ? () => setConfirmarFinalizar(true) : handlePresionarGuardar}
              disabled={guardando}
              textStyle={styles.textoBoton}
              variant="outline"
            >
              <View style={styles.buttonContent}>
                <Icon
                  icon={esFinalizar ? ICONS.check : ICONS.save}
                  color={COLORS.primary}
                />
                <Text style={styles.textoBoton}>
                  {guardando
                    ? esFinalizar
                      ? "Finalizando..."
                      : "Actualizando..."
                    : esFinalizar
                      ? "Finalizar Pre-Cría"
                      : formData.tipoRegistro === "precria"
                        ? "Actualizar Pre-Cría"
                        : "Actualizar Siembra"}
                </Text>
              </View>
            </Button>

          </View>

        </View>
      </ScrollView>

      {esFinalizar && (
        <Modal
          visible={confirmarFinalizar}
          onClose={() => setConfirmarFinalizar(false)}
          closeText="Cancelar"
          containerStyle={STYLE.contentWrapper}
          buttonStyle={styles.modalCancelButton}
          buttonTextStyle={styles.modalCancelButtonText}
        >
          <Title level={3} style={styles.modalTitle}>
            ¿Finalizar Pre-Cría?
          </Title>
          <Text style={styles.modalMessage}>
            Esta acción no se puede deshacer.
          </Text>
          <Button
            style={styles.modalConfirmButton}
            onPress={() => {
              setConfirmarFinalizar(false);
              handlePresionarGuardar();
            }}
          >
            <Text style={styles.modalConfirmButtonText}>Sí, finalizar</Text>
          </Button>
        </Modal>
      )}
    </>
  );
}