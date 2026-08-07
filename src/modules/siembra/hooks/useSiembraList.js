/**
 * ============================================================
 * HOOK DE LISTADO DE SIEMBRAS
 * ============================================================
 *
 * Centraliza el estado y la lógica del listado de siembras y
 * pre-crías: carga de datos, búsqueda, filtros y el ocultado
 * automático de registros ya finalizados.
 *
 * FUNCIONALIDAD:
 * - Se suscribe a los cambios del servicio de siembras.
 * - Traduce los campos crudos del backend (snake_case: finca_id,
 *   fecha_siembra, pl_siembra, etc.) al formato que espera
 *   SiembraCard (camelCase, PL como "PL8", fechas en dd/mm/aaaa)
 * - Enriquece cada registro con el nombre real de finca y estanque
 *   (fincaLabel/estanqueLabel) usando el catálogo de
 *   fincaEstanqueLocal, ya que el backend solo devuelve los ids.
 * - Administra el texto de búsqueda y los filtros aplicados.
 * - Calcula el listado final a mostrar (siembrasFiltradas).
 * - Oculta del listado principal las siembras y pre-crías que ya
 *   completaron su ciclo, para que no se acumulen tarjetas de
 *   registros finalizados en la pantalla principal:
 *     - Pre-Cría: se oculta cuando fue finalizada explícitamente
 *       (estado === "Finalizada", vía el botón "Finalizar Pre-Cría").
 *     - Siembra: se oculta al alcanzar el 100% del ciclo
 *       (día actual >= duración del ciclo), ya que este módulo no
 *       cuenta con una acción de cierre equivalente a la de Pre-Cría.
 *
 * La pantalla utiliza este hook para renderizar el listado y
 * solo conserva la navegación (useRouter).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation, useRouter } from "expo-router";
import { calcularProgresoCiclo } from "./siembraCalculos";
import SiembraLocalService from "../services/SiembraLocal.services";
import PrecriaLocalService from "../services/PrecriaLocal.service";
import LoteLarvaLocalService from "../services/LoteLarvaLocal.service";
import EstanqueLocalService from "../../../modules/estanques/services/EstanqueLocal.service";
import FincaLocalService from "../../../modules/finca/services/fincaLocal.service";
import { formatearFechaDesdeISO } from "./dateUtils";
import { localApi } from "../../../database/local/localApi.service";


function adaptarSiembraLocalABackend(s) {
  return {
    ...s,
    id: s.id,
    finca_id: s.fincaId,
    estanque_id: s.estanqueId,
    fecha_siembra: s.fechaSiembra,
    cantidad_sembrada: s.cantidadSembrada,
    pl_siembra: s.plSiembra,
    precria_id: s.precriaId,
    lote_larva_id: s.loteLarvaId,
    duracion_ciclo: s.duracionCiclo,
    estado: s.estado,
  };
}

function haFinalizado(registro) {
  if (registro.tipoRegistro === "precria")
    return registro.estado === "Finalizada";
  return calcularProgresoCiclo(registro).progreso >= 100;
}

export default function useSiembraList() {
  const router = useRouter();
  const navigation = useNavigation();

  const [registros, setRegistros] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState({ categories: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const tiposRegistro = [
    { label: "Siembra", value: "siembra" },
    { label: "Pre-Cría", value: "precria" },
  ];

  function obtenerNombresFincaEstanque(registro) {
    const fincaId = registro.finca_id ?? registro.fincaId;
    const estanqueId = registro.estanque_id ?? registro.estanqueId;
    const finca = fincas.find(
      (f) => String(f.id) === String(fincaId) || String(f.servidorId) === String(fincaId)
    );
    const estanque = estanques.find(
      (e) => String(e.id) === String(estanqueId) || String(e.servidorId) === String(estanqueId)
    );
    return {
      fincaLabel: finca?.nombreFinca || finca?.codigoCBO || (fincaId ? `Finca #${fincaId}` : "Sin finca"),
      estanqueLabel: estanque?.codigo || (estanqueId ? `Estanque #${estanqueId}` : "Sin estanque"),
    };
  }

  function obtenerDatosLote(loteLarvaId, lotesPorId) {
    const lote = lotesPorId ? lotesPorId[loteLarvaId] : null;
    return {
      codigoLoteLarva: lote?.codigoLote || "",
      plLarva: lote?.plInicial != null ? `PL${lote.plInicial}` : "",
    };
  }


  function mapSiembraParaCard(s, lotesPorId) {
    const base = {
      ...s,
      tipoRegistro: "siembra",
      siembraId: s.id,
      estanque: s.estanque_id,
      fechaSiembra: formatearFechaDesdeISO(s.fecha_siembra),
      cantidadSembrada: s.cantidad_sembrada,
      plSiembra: s.pl_siembra != null ? `PL${s.pl_siembra}` : "",
      diasMaduracion: s.duracion_ciclo || 90, 
      ...obtenerDatosLote(s.lote_larva_id, lotesPorId),
    };
    const { diaActual, totalDias } = calcularProgresoCiclo(base);
    return { ...base, diasCultivo: diaActual, duracionDias: totalDias };
  }

  function mapPrecriaParaCard(p, lotesPorId) {
    const base = {
      ...p,
      tipoRegistro: "precria",
      siembraId: p.id,
      finca_id: p.fincaId,
      estanque_id: p.estanqueId,
      estanque: p.estanqueId,
      fechaInicio: formatearFechaDesdeISO(p.fechaInicio),
      cantidadInicial: p.cantidadInicial,
      cantidadFinal: p.cantidadFinal,
      plInicial: p.plInicial != null ? `PL${p.plInicial}` : "",
      plFinal: p.plFinal != null ? `PL${p.plFinal}` : "",
      duracionDias: p.duracionDias,
      ...obtenerDatosLote(p.loteLarvaId, lotesPorId),
    };
    const { diaActual, totalDias } = calcularProgresoCiclo(base);
    return { ...base, diasCultivo: diaActual, duracionDias: totalDias };
  }

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      await localApi.inicializar();

      const [siembras, precrias, lotes, fincasRes, estanquesRes] = await Promise.all([
        SiembraLocalService.getAll(),
        PrecriaLocalService.getAll(),
        LoteLarvaLocalService.getAll(),
        FincaLocalService.getFincas(),
        EstanqueLocalService.getEstanques(),
      ]);

      setFincas(fincasRes || []);
      setEstanques(estanquesRes || []);

      const lotesPorId = {};
      (lotes || []).forEach((lote) => {
        lotesPorId[lote.id] = lote;
      });

      setRegistros([
        ...(siembras || []).map(adaptarSiembraLocalABackend).map((s) => mapSiembraParaCard(s, lotesPorId)),
        ...(precrias || []).map((p) => mapPrecriaParaCard(p, lotesPorId))
      ]);
    } catch (err) {
      console.error("Error al cargar siembras locales", err);
      setError("No fue posible cargar las siembras.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const unsubscribe = navigation.addListener("focus", cargar);
    return unsubscribe;
  }, [navigation, cargar]);

  const siembrasFiltradas = useMemo(() => {
    return registros
      .filter((r) => !haFinalizado(r))
      .map((r) => ({ ...r, ...obtenerNombresFincaEstanque(r) }))
      .filter((r) => {
        const texto = busqueda.toLowerCase();
        const coincideTexto =
          !texto ||
          r.estanqueLabel.toLowerCase().includes(texto) ||
          r.fincaLabel.toLowerCase().includes(texto);

        const registroTipo = r.tipoRegistro || "siembra";
        const coincideTipo =
          filtros.categories.length === 0 ||
          filtros.categories.includes(registroTipo);

        return coincideTexto && coincideTipo;
      });
  }, [busqueda, filtros, registros, fincas, estanques]);

  const handleNuevaSiembra = useCallback(
    () => router.push("/siembra/nueva"),
    [router],
  );
  const handleDetalleSiembra = useCallback(
    (registro) =>
      router.push({
        pathname: "/siembra/detalle",
        params: { id: registro.id, tipoRegistro: registro.tipoRegistro },
      }),
    [router],
  );

  return {
    siembrasFiltradas,
    busqueda,
    setBusqueda,
    filtros,
    setFiltros,
    tiposRegistro,
    cargando,
    error,
    handleNuevaSiembra,
    handleDetalleSiembra,
    recargar: cargar,
  };
}