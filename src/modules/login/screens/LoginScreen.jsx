/**
 * ============================================================
 * PANTALLA: LOGIN
 * ============================================================
 *
 * Selecciona un colaborador y valida su PIN para continuar.
 * @dependencies - Alert, Avatar, Button, Card, Icon, Modal, Text, Title, Input, SearchBar, useLoginFlow
 * @validations - El PIN debe contener 4 dígitos obligatoriamente.
 * @navigation - Navega a la pantalla principal si el login es exitoso.
 */

import { useState } from "react";
import { View, ScrollView, Alert as RNAlert } from "react-native";

import Alert from "../../../shared/components/Alert";
import Avatar from "../../../shared/components/Avatar";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Icon from "../../../shared/components/Icons";
import Modal from "../../../shared/components/Modal";
import Text from "../../../shared/components/Text";
import Title from "../../../shared/components/Title";
import Input from "../../../shared/components/Input";

import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import { LOGIN_MESSAGES } from "../constants/authMessages";
import { useLoginFlow } from "../hooks/useLoginFlow";
import SearchBar from "../../../shared/components/SearchBar";
import styles from "../styles/loginStyles";
import { STYLE } from "../../../theme/style";

/**
 * LoginScreen
 *
 * Composición principal de la pantalla.
 */
export default function LoginScreen({ onLoginSuccess = () => { } }) {
  const loginFlow = useLoginFlow({ onLoginSuccess });

  return (
    <View style={STYLE.container}>
      <ScrollView
        contentContainerStyle={STYLE.contentWrapper}
        showsVerticalScrollIndicator={false}
      >
        <LoginHeader formattedDate={loginFlow.formattedDate} />

        <WorkerSection
          workers={loginFlow.filteredWorkers}
          loading={loginFlow.loading}
          error={loginFlow.error}
          selectedWorker={loginFlow.selectedWorker}
          onSelectWorker={loginFlow.setSelectedWorker}
          onSyncData={loginFlow.handleSyncData}
          onRefreshWorkers={loginFlow.refetch}
          searchText={loginFlow.workerSearchText}
          onSearchTextChange={loginFlow.setWorkerSearchText}
          isFormValid={loginFlow.isFormValid}
          onContinue={loginFlow.openPinModal}
        />
      </ScrollView>

      <PinModal
        visible={loginFlow.isPinModalVisible}
        pinCode={loginFlow.pinCode}
        pinError={loginFlow.pinError}
        isAuthenticating={loginFlow.isAuthenticating}
        onClose={loginFlow.closePinModal}
        onPinChange={loginFlow.handlePinChange}
        onSubmit={loginFlow.submitPin}
      />
    </View>
  );
}

/**
 * LoginHeader
 *
 * Tarjeta superior con identidad de la app y fecha.
 */
function LoginHeader({ formattedDate }) {
  return (
    <Card style={styles.heroCard}>
      <View style={styles.logoContainer}>
        <Icon icon={ICONS.shrimp} size={32} color={COLORS.primary} />
      </View>

      <Title
        level={1}
        color={COLORS.textPrimary}
        align="center"
        style={styles.companyName}
      >
        {LOGIN_MESSAGES.COMPANY_NAME}
      </Title>

      <Text
        size={13}
        color={COLORS.textTertiary}
        align="center"
        style={styles.dateText}
      >
        {formattedDate}
      </Text>
    </Card>
  );
}

/**
 * WorkerSection
 *
 * Lista a los colaboradores disponibles, con búsqueda, sincronización
 * y selección para continuar al PIN.
 */
function WorkerSection({
  workers,
  loading,
  error,
  selectedWorker,
  onSelectWorker,
  onSyncData,
  onRefreshWorkers,
  searchText,
  onSearchTextChange,
  isFormValid,
  onContinue,
}) {
  // Estado de sincronización basado en el resultado real de onSyncData()
  const [syncStatus, setSyncStatus] = useState(null); // null | 'success' | 'danger'
  const [syncMessage, setSyncMessage] = useState("");

  // Estados para el Modal de Sincronización
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cedula, setCedula] = useState("");
  const [syncPin, setSyncPin] = useState("");

  const handleOpenSyncModal = () => {
    setCedula("");
    setSyncPin("");
    setIsSyncModalVisible(true);
  };

  const handleCloseSyncModal = () => {
    if (!isSyncing) {
      setIsSyncModalVisible(false);
    }
  };

  /**
   * handleConfirmSync()
   * Ejecuta la sincronización real enviando Cédula y PIN al servicio.
   */
  const handleConfirmSync = async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    setSyncMessage("");

    try {
      // Enviamos la cédula y el PIN al hook / servicio
      const result = await onSyncData({ cedula, pin: syncPin });

      setIsSyncModalVisible(false);

      if (result && result.success) {
        setSyncStatus("success");
        setSyncMessage(result.message || "Sincronización completada con éxito.");
      } else {
        setSyncStatus("danger");
        setSyncMessage(result?.message || "No se pudo sincronizar los datos.");
      }
    } catch (err) {
      setIsSyncModalVisible(false);
      setSyncStatus("danger");
      setSyncMessage(
        err?.message || "Error de conexión o fallo al sincronizar con el servidor."
      );
    } finally {
      setIsSyncing(false);

      // Auto-ocultar el mensaje después de unos segundos
      setTimeout(() => {
        setSyncStatus(null);
        setSyncMessage("");
      }, 5000);
    }
  };

  return (
    <Card style={styles.sectionCard}>
      {syncStatus === "success" && (
        <Alert
          variant="success"
          message={syncMessage}
          style={styles.syncAlert}
        />
      )}

      {syncStatus === "danger" && (
        <Alert
          variant="danger"
          message={syncMessage}
          style={styles.syncAlert}
        />
      )}

      <Title level={4} color={COLORS.textPrimary} align="center">
        {LOGIN_MESSAGES.WORKER_TITLE}
      </Title>

      <Button
        onPress={handleOpenSyncModal}
        variant="outline"
        style={styles.syncButton}
      >
        <View style={styles.buttonContent}>
          <Icon
            icon={ICONS.refresh || ICONS.update}
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.buttonText}>
            {LOGIN_MESSAGES.SYNC_BUTTON_TEXT}
          </Text>
        </View>
      </Button>

      <SearchBar
        value={searchText}
        onChangeText={onSearchTextChange}
        placeholder={LOGIN_MESSAGES.SEARCH_PLACEHOLDER}
        containerStyle={styles.searchContainer}
      />

      {loading && <SectionStatus message={LOGIN_MESSAGES.LOADING} />}

      {error && (
        <Alert
          variant="danger"
          message="No se encontraron colaboradores."
          style={styles.syncAlert}
          textStyle={styles.errorText}
        />
      )}

      {!loading && !error && (
        <View style={styles.workersList}>
          {workers.length === 0 ? (
            <View
              style={[
                styles.workersScroll,
                syncStatus && styles.workersScrollCompressed,
                styles.centerContent,
              ]}
            >
              <SectionStatus message={LOGIN_MESSAGES.NO_WORKERS_FOUND} />
            </View>
          ) : (
            <ScrollView
              style={[
                styles.workersScroll,
                syncStatus && styles.workersScrollCompressed,
              ]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {workers.map((worker) => (
                <WorkerItem
                  key={worker.id}
                  worker={worker}
                  isSelected={selectedWorker === worker.id}
                  onPress={() => onSelectWorker(worker.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.actionSection}>
        <Button
          onPress={onContinue}
          variant="outline"
          disabled={!isFormValid}
          style={styles.continueButton}
        >
          <View style={styles.buttonContent}>
            <Icon
              icon={ICONS.enter}
              size={18}
              color={isFormValid ? COLORS.primary : COLORS.textTertiary}
            />
            <Text
              style={[
                styles.buttonText,
                !isFormValid && { color: COLORS.textTertiary },
              ]}
            >
              {LOGIN_MESSAGES.BUTTON_TEXT}
            </Text>
          </View>
        </Button>
      </View>

      <SyncModal
        visible={isSyncModalVisible}
        cedula={cedula}
        syncPin={syncPin}
        isSyncing={isSyncing}
        onClose={handleCloseSyncModal}
        onCedulaChange={setCedula}
        onPinChange={setSyncPin}
        onSubmit={handleConfirmSync}
      />
    </Card>
  );
}

/**
 * WorkerItem
 *
 * Botón tocable para seleccionar un colaborador.
 */
function WorkerItem({ worker, isSelected, onPress }) {
  return (
    <Button onPress={onPress} variant="outline" style={styles.workerButton}>
      <Card
        style={[styles.workerCard, isSelected && styles.workerCardSelected]}
      >
        <Avatar
          name={worker.name}
          size={48}
          backgroundColor={isSelected ? COLORS.primary : COLORS.secondary}
          textColor={isSelected ? COLORS.white : COLORS.textPrimary}
        />

        <View style={styles.workerInfo}>
          <Text size={15} weight="700" color={COLORS.textPrimary}>
            {worker.name}
          </Text>

          <Text size={13} color={COLORS.textTertiary}>
            {worker.role}
          </Text>
        </View>

        {isSelected && (
          <View style={styles.selectionBadge}>
            <Text size={14} weight="700" color={COLORS.white}>
              ✓
            </Text>
          </View>
        )}
      </Card>
    </Button>
  );
}

/**
 * SectionStatus
 *
 * Mensaje centrado para carga o error.
 */
function SectionStatus({ message, error = false }) {
  return (
    <Text
      size={14}
      color={error ? COLORS.error : COLORS.textTertiary}
      align="center"
      style={styles.statusText}
    >
      {message}
    </Text>
  );
}

/**
 * PinModal
 *
 * Modal para ingresar el PIN de 4 dígitos.
 */
function PinModal({
  visible,
  pinCode,
  pinError,
  isAuthenticating,
  onClose,
  onPinChange,
  onSubmit,
}) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showCloseButton
      closeText="Cancelar"
      containerStyle={styles.modalContainer}
      overlayStyle={styles.modalOverlay}
      buttonStyle={styles.cancelButtonOutline}
      buttonTextStyle={styles.cancelButtonTextOutline}
    >
      <Title
        level={5}
        color={COLORS.textPrimary}
        align="center"
        style={styles.modalTitle}
      >
        Digite su PIN
      </Title>
      <Input
        value={pinCode}
        onChangeText={onPinChange}
        placeholder="0000"
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        autoFocus={visible}
        editable={!isAuthenticating}
        containerStyle={styles.pinInputContainer}
        style={[styles.pinInput, { fontFamily: "Roboto" }]}
      />
      {pinError !== "" && (
        <Alert
          variant="danger"
          message={pinError}
          style={styles.pinErrorAlert}
        />
      )}
      <Button
        onPress={onSubmit}
        variant="outline"
        disabled={pinCode.length !== 4 || isAuthenticating}
      >
        Ingresar
      </Button>
    </Modal>
  );
}

/**
 * SyncModal
 *
 * Solicita Cédula (visible, máx 9 dígitos) y PIN antes de sincronizar.
 */
function SyncModal({
  visible,
  cedula,
  syncPin,
  isSyncing,
  onClose,
  onCedulaChange,
  onPinChange,
  onSubmit,
}) {
  // Validación de 9 dígitos para la cédula y 4 para el PIN
  const isFormValid = cedula.trim().length === 9 && syncPin.length === 4;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showCloseButton={!isSyncing}
      closeText="Cancelar"
      containerStyle={styles.modalContainer}
      overlayStyle={styles.modalOverlay}
      buttonStyle={styles.cancelButtonOutline}
      buttonTextStyle={styles.cancelButtonTextOutline}
    >
      <Title
        level={5}
        color={COLORS.textPrimary}
        align="center"
        style={styles.modalTitle}
      >
        Sincronizar Colaborador
      </Title>

      <Input
        value={cedula}
        onChangeText={onCedulaChange}
        placeholder="Cédula"
        keyboardType="number-pad"
        maxLength={9}
        editable={!isSyncing}
        containerStyle={styles.pinInputContainer}
        style={[styles.pinInput, { fontFamily: "Roboto" }]}
      />

      <Input
        value={syncPin}
        onChangeText={onPinChange}
        placeholder="PIN"
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        editable={!isSyncing}
        containerStyle={styles.pinInputContainer}
        style={[styles.pinInput, { fontFamily: "Roboto" }]}
      />

      <Button
        onPress={onSubmit}
        variant="outline"
        disabled={!isFormValid || isSyncing}
      >
        {isSyncing ? "Sincronizando..." : "Sincronizar"}
      </Button>
    </Modal>
  );
}