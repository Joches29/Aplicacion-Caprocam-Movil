/**
 * ============================================================
 * PANTALLA TrazabilidadScreen
 * ============================================================
 *
 * Descripción:
 * Muestra el listado histórico de movimientos de trazabilidad entre estanques con búsqueda y filtros.
 *
 * @dependencies useTrazabilidadList, CardPress, Button, Alert, SearchBar, FilterButton
 * @validations Búsqueda por texto y filtros combinados.
 * @navigation Redirige a /trazabilidad/agregar y /trazabilidad/[id].
 */
import { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { styles } from "../styles/TrazabilidadStyles";
import { STYLE } from "../../../theme/style";

import Alert from "../../../shared/components/Alert";
import Button from "../../../shared/components/Button";
import CardPress from "../../../shared/components/CardPress";
import EmptyState from "../../../shared/components/EmptyState";
import Icon from "../../../shared/components/Icons";
import Text from "../../../shared/components/Text";
import { ICONS } from "../../../theme/icons";
import { COLORS } from "../../../theme/colors";

import SearchBar from "../../../shared/components/SearchBar";
import FilterButton from "../components/FilterButton";
import { useTrazabilidadList, formatRegistroForView } from "../hooks/useTrazabilidadList";

// Alto aproximado del bloque flotante inferior: paddingTop (10) +
// altura del boton (~46) + paddingBottom (18).
const ALTO_BOTON_FLOTANTE = 74;

export default function TrazabilidadScreen() {
  // Espacio que ocupa la barra de gestos del sistema abajo.
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams();
  const [visibleSuccessMessage, setVisibleSuccessMessage] = useState(
    typeof params.successMessage === "string" ? params.successMessage : ""
  );

   const {
    busqueda,
    setBusqueda,
    filtros,
    setFiltros,
    registrosFiltrados,
    fincas,
    colaboradores,
    hayFiltrosActivos,
    limpiarBusqueda,
    nuevoRegistro,
    abrirDetalle,
    errorCarga,
    sesionExpirada,
    cerrarErrorCarga,
    irALogin,

  } = useTrazabilidadList();

  useEffect(() => {
    const successMessage =
      typeof params.successMessage === "string" ? params.successMessage : "";

    if (!successMessage) {
      setVisibleSuccessMessage("");
      return;
    }

    setVisibleSuccessMessage(successMessage);
    const timer = setTimeout(() => setVisibleSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [params.successMessage]);

  function renderRegistro(registro) {
    const r = formatRegistroForView(registro);
    return (
      <CardPress style={styles.card} onPress={() => abrirDetalle(r.id)} key={r.id}>
          <View style={styles.cardHeader}>
            <Text style={styles.fincaText}>{r.fincaNombre}</Text>
            <Text style={styles.fechaText}>{r.fechaFormatted || r.fecha}</Text>
          </View>

          <Text style={styles.colaboradorText}>
            {r.responsableTexto || `Responsable: ${r.colaboradorNombre}`}
          </Text>

          <View style={styles.movimiento}>
            <Text style={styles.estanqueText} numberOfLines={1}>
              {r.estanqueOrigenLabel}
            </Text>

            <Icon
              icon={ICONS.arrowLongRight}
              size={32}
              color={COLORS.primary}
              style={styles.flechaIcon}
            />

            <Text style={styles.estanqueText} numberOfLines={1}>
              {r.estanqueDestinoLabel}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.dato}>
              <Text style={styles.datoLabel}>PL</Text>
              <Text style={styles.datoValor}>
                {r.plFormatted}
              </Text>
            </View>

            <View style={styles.dato}>
              <Text style={styles.datoLabel}>Tamaño</Text>
              <Text style={styles.datoValor}>{r.tamanoFormatted}</Text>
            </View>

            <View style={styles.dato}>
              <Text style={styles.datoLabel}>Días</Text>
              <Text style={styles.datoValor}>{registro.dias}</Text>
            </View>
          </View>
        </CardPress>
      );
  }

  return (
    <View style={STYLE.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          /*
          El boton "Registrar movimiento" flota ENCIMA de la lista, asi
          que hay que reservarle espacio abajo o el ultimo registro
          queda tapado y no se puede leer por mas que se scrollee.

          ALTO_BOTON_FLOTANTE es la altura real del bloque (sus
          paddings + la altura del boton), y se le suma el inset de la
          barra de gestos del dispositivo.
          */
          { paddingBottom: ALTO_BOTON_FLOTANTE + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={STYLE.contentWrapper}>
          {visibleSuccessMessage ? (
            <Alert
              variant="success"
              message={visibleSuccessMessage}
              style={styles.successAlert}
            />
          ) : null}

          {errorCarga !== "" && (
            <>
              <Alert
                variant="danger"
                message={errorCarga}
                style={styles.successAlert}
              />
              {sesionExpirada ? (
                <Button variant="outline" onPress={irALogin} style={styles.errorAlertButton}>
                  Ir a iniciar sesión
                </Button>
              ) : (
                <Button variant="outline" onPress={cerrarErrorCarga} style={styles.errorAlertButton}>
                  Cerrar
                </Button>
              )}
            </>
          )}


          <View style={styles.busquedaRow}>
            <SearchBar
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar por finca, estanque o responsable..."
              containerStyle={styles.searchBarContainer}
            />

            <FilterButton
              fincas={fincas}
              colaboradores={colaboradores}
              activeFilters={filtros}
              onApply={setFiltros}
              style={styles.filterButton}
            />
          </View>

          <Text style={styles.contadorResultados}>
            {registrosFiltrados.length} registro
            {registrosFiltrados.length === 1 ? "" : "s"} encontrado
            {registrosFiltrados.length === 1 ? "" : "s"}
          </Text>

          <View style={styles.lista}>
            {registrosFiltrados.length === 0 ? (
              <EmptyState
                title={
                  hayFiltrosActivos
                    ? "Sin resultados"
                    : "Aún no hay registros"
                }
                description={
                  hayFiltrosActivos
                    ? "No se encontraron registros con los criterios seleccionados."
                    : "Cuando registres un movimiento de pre-cría a engorde, aparecerá aquí."
                }
                action={
                  hayFiltrosActivos ? (
                    <Button variant="outline" onPress={limpiarBusqueda}>
                      Limpiar búsqueda
                    </Button>
                  ) : undefined
                }
                style={styles.vacioContainer}
                titleStyle={styles.vacioTitulo}
                descriptionStyle={styles.vacioTexto}
              >
                <Icon
                  icon={ICONS.transfer}
                  size={48}
                  style={styles.vacioIcono}
                />
              </EmptyState>
            ) : (
              registrosFiltrados.map(renderRegistro)
            )}
          </View>

        </View>
      </ScrollView>
      <View
        style={[
          styles.floatingButtonContainer,
          // Se suma el inset real del dispositivo para que el boton no
          // quede debajo de la barra de gestos del sistema.
          { paddingBottom: styles.floatingButtonContainer.paddingBottom + insets.bottom },
        ]}
      >
        <Button variant="outline" onPress={nuevoRegistro} style={styles.fullButton}>
          + Registrar movimiento
        </Button>
      </View>
    </View>
  );
}