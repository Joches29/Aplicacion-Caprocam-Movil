/**
 * ============================================================
 * HOOK DE FÍSICO-QUÍMICO
 * ============================================================
 *
 * Autocontenido: carga, eliminación y alert (SQLite / local).
 * Enriquece: nombreFinca, codigoEstanque, nombreColaborador, nombreCreadoPor
 * Adaptado al patrón offline de EnfermedadesLocal.
 */
import { useState, useEffect } from "react";
import { obtenerDetalleReporte } from "../services/detalleReporte.service.js";
import { eliminarRegistroLocal } from "../services/ReporteriaLocal.service.js";
import useModalEliminar from "../hooks/useModalEliminar.js";
import { cargarYEnriquecerRegistros } from "../utils/enriquecerRegistros.js";
import { useError } from "../../../shared/context/ErrorContext.js";

export default function useFisicoQuimico(fincaId, estanqueId, onAlertChange) {
  const [lecturas, setLecturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const { mostrarError } = useError();

  async function cargarLecturas() {
    try {
      setLoading(true);

      const data = await obtenerDetalleReporte({
        tipoRegistro: "fisico_quimico",
        fincaId,
        estanqueId,
      });

      const enriquecidos = await cargarYEnriquecerRegistros(data);
      setLecturas(enriquecidos);
    } catch (error) {
      mostrarError(error);
      setLecturas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fincaId && estanqueId) {
      cargarLecturas();
    }
  }, [fincaId, estanqueId]);

  async function eliminarLectura(id) {
    await eliminarRegistroLocal("fisico_quimico", id);
    await cargarLecturas();
    setAlert("deleted");
  }

  const {
    modalVisible,
    itemSeleccionado: lecturaSeleccionada,
    loadingEliminar,
    abrirModalEliminar,
    cancelarEliminar,
    confirmarEliminar,
  } = useModalEliminar(eliminarLectura);

  useEffect(() => {
    onAlertChange?.(alert);
  }, [alert]);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 3000);
    return () => clearTimeout(timer);
  }, [alert]);

  return {
    lecturas,
    loading,
    alert,
    modalVisible,
    lecturaSeleccionada,
    loadingEliminar,
    abrirModalEliminar,
    cancelarEliminar,
    confirmarEliminar,
  };
}
