/**
 * ============================================================
 * HOOK DE DETALLE DE SIEMBRA
 * ============================================================
 *
 * Centraliza la lógica de consulta y edición de una siembra existente.
 *
 * FUNCIONALIDAD:
 * - Carga la información de la siembra seleccionada, junto con su
 *   Lote de Larva asociado (proveedor/laboratorio/procedencia/código
 *   viven en esa tabla, no en Siembra/Pre-Cría) y, si la Siembra
 *   proviene de una Pre-Cría, también la Pre-Cría de origen (para
 *   mostrar sus datos heredados en modo lectura).
 * - Administra modo consulta y edición.
 * - Maneja cambios de campos.
 * - Calcula progreso y etapa del cultivo.
 * - Valida y guarda modificaciones.
 * - Al finalizar una Pre-Cría, además de los campos obligatorios de
 *   cierre, valida coherencia: la cantidad final no puede ser mayor
 *   a la inicial, y el PL final no puede ser un estadio menor al
 *   PL inicial.
 * - Al finalizar y navegar a crear la Siembra, usa router.replace
 *   (no push) para no dejar la Pre-Cría ya finalizada en la pila de
 *   navegación (evita que el botón "Volver" salte a una pantalla
 *   vieja/incorrecta).
 *
 * La pantalla utiliza este hook para controlar el formulario
 * de detalle sin manejar lógica de negocio.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  useFieldValidation,
  validarCamposObligatorios,
} from "./useFieldValidation";
import { obtenerCamposObligatorios as obtenerCamposObligatoriosPorTipo } from "./siembraValidationRules";
import {
  calcularCantidadSembrada,
  calcularProgresoCiclo,
} from "./siembraCalculos";
import { obtenerFechaHoy, formatearFechaDesdeISO } from "./dateUtils";
import EstanqueLocalService from "../../../modules/estanques/services/EstanqueLocal.service";
import FincaLocalService from "../../../modules/finca/services/fincaLocal.service";

import SiembraLocalService from "../services/SiembraLocal.services";
import PrecriaLocalService from "../services/PrecriaLocal.service";
import LoteLarvaLocalService from "../services/LoteLarvaLocal.service";
import { localApi } from "../../../database/local/localApi.service";
import ProveedorLarvaLocalService from "../services/ProveedorLarvaLocal.service";
import LaboratorioLocalService from "../services/LaboratorioLocal.service";
import ProcedenciaLocalService from "../services/ProcedenciaLocal.service";
import {
  SiembraDTO,
  PrecriaDTO,
  FinalizarPrecriaDTO,
} from "../dtos/siembra.dto";

function mapCatalogo(items) {
  return (items || []).map((item) => ({ label: item.nombre, value: item.id }));
}

function adaptarSiembraLocal(s) {
  if (!s) return null;
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

function adaptarPrecriaLocal(p) {
  if (!p) return null;
  return {
    ...p,
    id: p.id,
    finca_id: p.fincaId,
    estanque_id: p.estanqueId,
    fecha_inicio: p.fechaInicio,
    fecha_fin: p.fechaFin,
    duracion_dias: p.duracionDias,
    cantidad_inicial: p.cantidadInicial,
    cantidad_final: p.cantidadFinal,
    pl_inicial: p.plInicial,
    pl_final: p.plFinal,
    lote_larva_id: p.loteLarvaId,
    estado: p.estado,
  };
}

function adaptarLoteLocal(l) {
  if (!l) return null;
  return {
    ...l,
    id: l.id,
    codigo_lote: l.codigoLote,
    proveedor_larva_id: l.proveedorLarvaId,
    laboratorio_id: l.laboratorioId,
    procedencia_id: l.procedenciaId,
    certificado_larva: l.certificadoLarva,
    pl_inicial: l.plInicial,
    cantidad_inicial: l.cantidadInicial,
    fecha_ingreso: l.fechaIngreso,
    estado_lote: l.estadoLote,
  };
}

function mapSiembraAFormData(siembra, lote, precriaOrigen, areaHectareas = "") {
  if (!siembra) return null;

  return {
    id: siembra.id,
    tipoRegistro: "siembra",
    pasoPorPrecria: siembra.precria_id ? "si" : "no",
    precriaId: siembra.precria_id || "",

    finca: siembra.finca_id || "",
    estanque: siembra.estanque_id || "",
    codigoLoteLarva: lote?.codigo_lote || "",
    estado: siembra.estado || "Activa",

    fechaSiembra: formatearFechaDesdeISO(siembra.fecha_siembra),
    tecnicaCultivo: siembra.tecnica_cultivo || "semi",
    densidadPoblacional: String(siembra.densidad_poblacional || 8),
    cantidadSembrada: String(siembra.cantidad_sembrada || ""),
    plSiembra: siembra.pl_siembra != null ? `PL${siembra.pl_siembra}` : "",
    diasMaduracion: String(siembra.duracion_ciclo || 90),
    areaHectareas: String(areaHectareas),

    fechaInicio: "",
    fechaFin: "",
    duracionDias: "15",
    cantidadInicial: "",
    cantidadFinal: "",
    plInicial: "",
    plFinal: "",

    loteId: siembra.lote_larva_id || null,
    proveedorLarva: lote?.proveedor_larva_id || "",
    laboratorioLarva: lote?.laboratorio_id || "",
    procedenciaLarva: lote?.procedencia_id || "",
    certificadoLarva: lote?.certificado_larva || "",

    duracionPrecria: precriaOrigen?.duracion_dias
      ? String(precriaOrigen.duracion_dias)
      : "",
    fechaSalidaPrecria: precriaOrigen?.fecha_fin
      ? formatearFechaDesdeISO(precriaOrigen.fecha_fin)
      : "",
    cantidadSobrevivientePrecria: precriaOrigen?.cantidad_final
      ? String(precriaOrigen.cantidad_final)
      : "",
  };
}

function mapPrecriaAFormData(precria, lote, areaHectareas = "") {
  if (!precria) return null;

  return {
    id: precria.id,
    tipoRegistro: "precria",
    pasoPorPrecria: "no",
    precriaId: "",

    finca: precria.finca_id || "",
    estanque: precria.estanque_id || "",
    codigoLoteLarva: lote?.codigo_lote || "",
    estado: precria.estado || "En Proceso",

    fechaSiembra: "",
    tecnicaCultivo: "semi",
    densidadPoblacional: "8",
    cantidadSembrada: "",
    plSiembra: "",
    diasMaduracion: "90",
    areaHectareas: String(areaHectareas),

    fechaInicio: formatearFechaDesdeISO(precria.fecha_inicio),
    fechaFin: formatearFechaDesdeISO(precria.fecha_fin),
    duracionDias: String(precria.duracion_dias || 15),
    cantidadInicial: String(precria.cantidad_inicial || ""),
    cantidadFinal: String(precria.cantidad_final || ""),
    plInicial: precria.pl_inicial != null ? `PL${precria.pl_inicial}` : "",
    plFinal: precria.pl_final != null ? `PL${precria.pl_final}` : "",

    loteId: precria.lote_larva_id || null,
    proveedorLarva: lote?.proveedor_larva_id || "",
    laboratorioLarva: lote?.laboratorio_id || "",
    procedenciaLarva: lote?.procedencia_id || "",
    certificadoLarva: lote?.certificado_larva || "",

    duracionPrecria: "",
    fechaSalidaPrecria: "",
    cantidadSobrevivientePrecria: "",
  };
}

function obtenerNumeroPL(pl) {
  if (pl == null || pl === "") return null;
  const match = String(pl).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function validarCoherenciaCierrePrecria(formData) {
  const errores = {};
  const cantidadInicial = Number(formData.cantidadInicial);
  const cantidadFinal = Number(formData.cantidadFinal);

  if (
    !Number.isNaN(cantidadInicial) &&
    !Number.isNaN(cantidadFinal) &&
    cantidadFinal > cantidadInicial
  ) {
    errores.cantidadFinal = "No puede ser mayor a la cantidad inicial.";
  }

  const plInicialNumero = obtenerNumeroPL(formData.plInicial);
  const plFinalNumero = obtenerNumeroPL(formData.plFinal);

  if (
    !Number.isNaN(plInicialNumero) &&
    !Number.isNaN(plFinalNumero) &&
    plFinalNumero < plInicialNumero
  ) {
    errores.plFinal = "No puede ser un estadio menor al PL inicial.";
  }

  return errores;
}

function calcularEtapa(progreso) {
  if (progreso >= 66) return 3;
  if (progreso >= 33) return 2;
  return 1;
}

export default function useDetalleSiembra() {
  const router = useRouter();
  const { id, tipoRegistro: tipoRegistroParam } = useLocalSearchParams();

  const [siembra, setSiembra] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [mensajeVariant, setMensajeVariant] = useState("info");

  const [fincas, setFincas] = useState([]);
  const [todosEstanques, setTodosEstanques] = useState([]);

  const {
    submitted,
    setSubmitted,
    errors,
    setErrors,
    hasError,
    requiredLabel,
  } = useFieldValidation();

  const cargarDetalle = useCallback(async () => {
    try {
      setCargando(true);
      await localApi.inicializar();

      // Cargar catálogos
      const [listaFincas, listaEstanques] = await Promise.all([
        FincaLocalService.getFincas(),
        EstanqueLocalService.getEstanques(),
      ]);
      setFincas(
        (listaFincas || []).map((f) => ({
          label: f.nombreFinca || f.codigoCBO || `Finca #${f.id}`,
          value: String(f.id),
        }))
      );
      setTodosEstanques(listaEstanques || []);

      let registro;
      if (tipoRegistroParam === "precria") {
        registro = adaptarPrecriaLocal(await PrecriaLocalService.getById(id));
      } else {
        registro = adaptarSiembraLocal(await SiembraLocalService.getById(id));
      }

      const lote = registro?.lote_larva_id
        ? adaptarLoteLocal(await LoteLarvaLocalService.getById(registro.lote_larva_id))
        : null;

      const precriaOrigen =
        tipoRegistroParam !== "precria" && registro?.precria_id
          ? adaptarPrecriaLocal(await PrecriaLocalService.getById(registro.precria_id))
          : null;
      
      const estanqueGuardado = registro?.estanque_id
        ? await EstanqueLocalService.getEstanqueById(registro.estanque_id)
        : null;
      let areahectareas = estanqueGuardado?.areaHectareas;
      if (areahectareas == null && estanqueGuardado?.largo && estanqueGuardado?.ancho) {
        areahectareas = (Number(estanqueGuardado.largo) * Number(estanqueGuardado.ancho)) / 10000;
      }
      const areaHectareasStr = areahectareas != null && areahectareas !== "" ? String(areahectareas) : "";

      const mapeado =
        tipoRegistroParam === "precria"
          ? mapPrecriaAFormData(registro, lote, areaHectareasStr)
          : mapSiembraAFormData(registro, lote, precriaOrigen, areaHectareasStr);

      setSiembra(mapeado);
      setFormData(mapeado);
    } catch (err) {
      setMensaje("No fue posible cargar el registro.");
      setMensajeVariant("danger");
    } finally {
      setCargando(false);
    }
  }, [id, tipoRegistroParam]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  useEffect(() => {
    if (!isEditing || !formData || formData.tipoRegistro !== "precria") return;
    if (formData.fechaFin && formData.fechaFin.trim() !== "") return;

    const formattedToday = obtenerFechaHoy();
    setFormData((prev) => ({ ...prev, fechaFin: formattedToday }));
  }, [formData, isEditing]);

  const handleChange = useCallback(
    (field, value) => {
      setFormData((previousData) => {
        const updatedData = { ...previousData, [field]: value };

        if (field === "areaHectareas" || field === "densidadPoblacional") {
          updatedData.cantidadSembrada = calcularCantidadSembrada(
            updatedData.areaHectareas,
            updatedData.densidadPoblacional,
          );
        }

        if (submitted) {
          const camposAValidar = Object.keys(errors).length
            ? Array.from(
                new Set([
                  ...Object.keys(errors),
                  ...obtenerCamposObligatoriosPorTipo(updatedData),
                ]),
              )
            : obtenerCamposObligatoriosPorTipo(updatedData);

          const erroresActualizados = validarCamposObligatorios(
            updatedData,
            camposAValidar,
          );

          setErrors((prev) => {
            const filtrados = {};
            Object.keys(prev).forEach((k) => {
              if (erroresActualizados[k]) filtrados[k] = erroresActualizados[k];
            });
            return filtrados;
          });
        }

        return updatedData;
      });
    },
    [submitted, setErrors],
  );

  const handleChangeFinca = useCallback((value) => {
    setFormData((previousData) => ({
      ...previousData,
      finca: value,
      estanque: "",
      areaHectareas: "",
      cantidadSembrada: "",
    }));
  }, []);

  const handleChangeEstanque = useCallback(
    (value) => {
      const estanqueObj = todosEstanques.find(
        (e) => String(e.id) === String(value) || String(e.servidorId) === String(value)
      );
      let area = estanqueObj?.areaHectareas;
      if (area == null && estanqueObj?.largo && estanqueObj?.ancho) {
        area = (Number(estanqueObj.largo) * Number(estanqueObj.ancho)) / 10000;
      }
      const areaStr = area != null && area !== "" ? String(area) : "";

      setFormData((previousData) => ({
        ...previousData,
        estanque: value,
        areaHectareas: areaStr,
        cantidadSembrada: calcularCantidadSembrada(
          areaStr,
          previousData.densidadPoblacional,
        ),
      }));
    },
    [todosEstanques],
  );

  const estanques = useMemo(() => {
    if (!formData?.finca) return [];
    return todosEstanques
      .filter((e) => String(e.fincaId) === String(formData.finca) || String(e.idFinca) === String(formData.finca))
      .map((e) => ({
        label: e.codigo ? `Estanque ${e.codigo}` : `Estanque #${e.id}`,
        value: String(e.id),
        ...e,
      }));
  }, [formData?.finca, todosEstanques]);

  const fincasList = useMemo(() => mapCatalogo(fincas), [fincas]);
  const tecnicasCultivo = useMemo(
    () => [
      { label: "Extensiva", value: "extensiva" },
      { label: "Semi-intensiva", value: "semi" },
      { label: "Intensiva", value: "intensiva" },
    ],
    [],
  );
  const plLarva = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: `PL${i + 1}`,
        value: `PL${i + 1}`,
      })),
    [],
  );

  const [proveedoresLarva, setProveedoresLarva] = useState([]);
  const [laboratoriosLarva, setLaboratoriosLarva] = useState([]);
  const [procedenciasLarva, setProcedenciasLarva] = useState([]);

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [rProv, rLab, rProc] = await Promise.all([
          ProveedorLarvaLocalService.getAll(),
          LaboratorioLocalService.getAll(),
          ProcedenciaLocalService.getAll(),
        ]);
        setProveedoresLarva(mapCatalogo(rProv || []));
        setLaboratoriosLarva(mapCatalogo(rLab || []));
        setProcedenciasLarva(mapCatalogo(rProc || []));
      } catch (err) {
        // no bloquea el detalle si esto falla
      }
    }
    cargarCatalogos();
  }, []);

  const handleAgregarProveedorLarva = useCallback(
    async (nombre) => {
      const nuevo = await ProveedorLarvaLocalService.create(nombre);
      setProveedoresLarva((previo) => [
        ...previo,
        { label: nuevo.nombre, value: nuevo.id },
      ]);
      handleChange("proveedorLarva", nuevo.id);
    },
    [handleChange],
  );

  const handleAgregarLaboratorioLarva = useCallback(
    async (nombre) => {
      const nuevo = await LaboratorioLocalService.create(nombre);
      setLaboratoriosLarva((previo) => [
        ...previo,
        { label: nuevo.nombre, value: nuevo.id },
      ]);
      handleChange("laboratorioLarva", nuevo.id);
    },
    [handleChange],
  );

  const handleAgregarProcedenciaLarva = useCallback(
    async (nombre) => {
      const nuevo = await ProcedenciaLocalService.create(nombre);
      setProcedenciasLarva((previo) => [
        ...previo,
        { label: nuevo.nombre, value: nuevo.id },
      ]);
      handleChange("procedenciaLarva", nuevo.id);
    },
    [handleChange],
  );

  const handleEditarProveedorLarva = useCallback(async (value, nombre) => {
    const actualizado = await ProveedorLarvaLocalService.update(value, nombre);
    setProveedoresLarva((previo) =>
      previo.map((item) =>
        item.value === value
          ? { label: actualizado.nombre, value: actualizado.id }
          : item,
      ),
    );
  }, []);

  const handleEditarLaboratorioLarva = useCallback(async (value, nombre) => {
    const actualizado = await LaboratorioLocalService.update(value, nombre);
    setLaboratoriosLarva((previo) =>
      previo.map((item) =>
        item.value === value
          ? { label: actualizado.nombre, value: actualizado.id }
          : item,
      ),
    );
  }, []);

  const handleEditarProcedenciaLarva = useCallback(async (value, nombre) => {
    const actualizado = await ProcedenciaLocalService.update(value, nombre);
    setProcedenciasLarva((previo) =>
      previo.map((item) =>
        item.value === value
          ? { label: actualizado.nombre, value: actualizado.id }
          : item,
      ),
    );
  }, []);

  const handleEliminarProveedorLarva = useCallback(async (value) => {
    await ProveedorLarvaLocalService.deleteById(value);
    setProveedoresLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo && previo.proveedorLarva === value
        ? { ...previo, proveedorLarva: "" }
        : previo,
    );
  }, []);

  const handleEliminarLaboratorioLarva = useCallback(async (value) => {
    await LaboratorioLocalService.deleteById(value);
    setLaboratoriosLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo && previo.laboratorioLarva === value
        ? { ...previo, laboratorioLarva: "" }
        : previo,
    );
  }, []);

  const handleEliminarProcedenciaLarva = useCallback(async (value) => {
    await ProcedenciaLocalService.deleteById(value);
    setProcedenciasLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo && previo.procedenciaLarva === value
        ? { ...previo, procedenciaLarva: "" }
        : previo,
    );
  }, []);

  const obtenerCamposObligatorios = useCallback(
    (opciones) => obtenerCamposObligatoriosPorTipo(formData, opciones),
    [formData],
  );

  const iniciarEdicion = useCallback(() => {
    setIsEditing(true);
    setMensaje("");

    setFormData((prev) => {
      if (!prev) return prev;
      const formattedToday = obtenerFechaHoy();
      return {
        ...prev,
        fechaSiembra: prev.fechaSiembra || formattedToday,
        fechaInicio: prev.fechaInicio || formattedToday,
        fechaFin: prev.fechaFin || formattedToday,
      };
    });

    setSubmitted(false);
    setErrors({});
  }, [setSubmitted, setErrors]);

  const cancelarEdicion = useCallback(() => {
    setFormData(siembra);
    setSubmitted(false);
    setErrors({});
    setIsEditing(false);
    setMensaje("");
  }, [siembra, setSubmitted, setErrors]);

  const huboCambios = useCallback(() => {
    if (!siembra || !formData) return false;
    try {
      return JSON.stringify(siembra) !== JSON.stringify(formData);
    } catch (e) {
      return true;
    }
  }, [siembra, formData]);

  const guardar = useCallback(async () => {
    setSubmitted(true);

    if (!huboCambios()) {
      setErrors({});
      setMensaje("No hay cambios para guardar.");
      setMensajeVariant("danger");
      return;
    }

    const erroresObligatorios = validarCamposObligatorios(
      formData,
      obtenerCamposObligatorios(),
    );
    if (Object.keys(erroresObligatorios).length > 0) {
      setErrors(erroresObligatorios);
      setMensaje(
        "Revisa los campos obligatorios marcados con * antes de guardar.",
      );
      setMensajeVariant("danger");
      return;
    }

    if (formData.tipoRegistro === "precria") {
      const erroresCoherencia = validarCoherenciaCierrePrecria(formData);
      if (Object.keys(erroresCoherencia).length > 0) {
        setErrors(erroresCoherencia);
        setMensaje(
          "Revisa los datos de cierre: la cantidad final o el PL final no son coherentes con los datos iniciales de la Pre-Cría.",
        );
        setMensajeVariant("danger");
        return;
      }
    }

    setErrors({});
    setGuardando(true);
    try {
      await localApi.inicializar();

      let actualizado;
      if (formData.tipoRegistro === "precria") {
        actualizado = adaptarPrecriaLocal(
          await PrecriaLocalService.update(
            id,
            new PrecriaDTO(formData, formData.loteId),
          ),
        );
        actualizado = mapPrecriaAFormData(actualizado, null);
      } else {
        actualizado = adaptarSiembraLocal(
          await SiembraLocalService.update(
            id,
            new SiembraDTO(formData, formData.loteId),
          ),
        );
        actualizado = mapSiembraAFormData(actualizado, null);
      }

      // El lote no cambia al actualizar siembra/pre-cría, así que se
      // conservan sus datos (proveedor/laboratorio/etc.) del formData actual.
      const conLote = {
        ...actualizado,
        ...(formData.pasoPorPrecria === "si"
          ? {
              duracionPrecria: formData.duracionPrecria,
              fechaSalidaPrecria: formData.fechaSalidaPrecria,
              cantidadSobrevivientePrecria:
                formData.cantidadSobrevivientePrecria,
            }
          : {}),
        ...mapLoteAFormData({
          codigo_lote: formData.codigoLoteLarva,
          proveedor_id: formData.proveedorLarva,
          laboratorio: formData.laboratorioLarva,
          procedencia: formData.procedenciaLarva,
          certificado_larva: formData.certificadoLarva,
        }),
      };

      setSiembra(conLote);
      setFormData(conLote);
      setIsEditing(false);
      setSubmitted(false);
      setMensaje("Registro actualizado correctamente.");
      setMensajeVariant("success");
    } catch (err) {
      const mensajeBackend = err.response?.data?.message;
      setMensaje(mensajeBackend || "No fue posible guardar los cambios.");
      setMensajeVariant("danger");
    } finally {
      setGuardando(false);
    }
  }, [
    formData,
    id,
    obtenerCamposObligatorios,
    setSubmitted,
    setErrors,
    huboCambios,
  ]);

  const finalizarPreCria = useCallback(async () => {
    setSubmitted(true);
    const camposCierre = ["fechaFin", "cantidadFinal", "plFinal"];
    const erroresCampos = validarCamposObligatorios(formData, camposCierre);

    if (Object.keys(erroresCampos).length > 0) {
      setErrors(erroresCampos);
      setIsEditing(true);
      setMensaje(
        "Debes llenar los tres datos finales de Pre-Cría para poder finalizar.",
      );
      setMensajeVariant("danger");
      return null;
    }

    const erroresCoherencia = validarCoherenciaCierrePrecria(formData);
    if (Object.keys(erroresCoherencia).length > 0) {
      setErrors(erroresCoherencia);
      setIsEditing(true);
      setMensaje(
        "Revisa los datos de cierre: la cantidad final o el PL final no son coherentes con los datos iniciales de la Pre-Cría.",
      );
      setMensajeVariant("danger");
      return null;
    }

    setErrors({});
    setGuardando(true);
    try {
      await localApi.inicializar();

      const registro = adaptarPrecriaLocal(
        await PrecriaLocalService.finalizar(
          id,
          new FinalizarPrecriaDTO(formData),
        ),
      );
      const mapeado = mapPrecriaAFormData(registro, null);
      const conLote = {
        ...mapeado,
        ...mapLoteAFormData({
          codigo_lote: formData.codigoLoteLarva,
          proveedor_id: formData.proveedorLarva,
          laboratorio: formData.laboratorioLarva,
          procedencia: formData.procedenciaLarva,
          certificado_larva: formData.certificadoLarva,
        }),
      };

      setSiembra(conLote);
      setFormData(conLote);
      setIsEditing(false);
      setSubmitted(false);
      setMensaje("Pre-Cría finalizada correctamente.");
      setMensajeVariant("success");
      return conLote;
    } catch (err) {
      const mensajeBackend = err.response?.data?.message;
      setMensaje(mensajeBackend || "No fue posible finalizar la Pre-Cría.");
      setMensajeVariant("danger");
      return null;
    } finally {
      setGuardando(false);
    }
  }, [formData, id, setSubmitted, setErrors]);

  const { totalDias, diaActual, progreso } = calcularProgresoCiclo(
    formData || {},
  );
  const etapa = calcularEtapa(progreso);

  const tieneValor = (valor) =>
    valor !== undefined && valor !== null && valor !== "";
  const datosCierrePreCriaCompletos = Boolean(
    siembra &&
    siembra.tipoRegistro === "precria" &&
    tieneValor(siembra.fechaFin) &&
    tieneValor(siembra.plFinal) &&
    tieneValor(siembra.cantidadFinal),
  );

  const construirParamsSiembraDesdePrecria = useCallback(
    () => ({ provieneDePrecriaId: id }),
    [id],
  );

  const handleFinalizarPreCria = useCallback(async () => {
    const registroFinalizado = await finalizarPreCria();
    if (!registroFinalizado) return;

    router.replace({
      pathname: "/(drawer)/siembra/nueva",
      params: construirParamsSiembraDesdePrecria(),
    });
  }, [finalizarPreCria, construirParamsSiembraDesdePrecria, router]);

  const handleCrearSiembraDesdePrecria = useCallback(() => {
    router.push({
      pathname: "/(drawer)/siembra/nueva",
      params: construirParamsSiembraDesdePrecria(),
    });
  }, [construirParamsSiembraDesdePrecria, router]);

  return {
    siembra,
    formData,
    estanques,
    fincas,
    tecnicasCultivo,
    proveedoresLarva,
    laboratoriosLarva,
    procedenciasLarva,
    plLarva,
    isEditing,
    mensaje,
    mensajeVariant,
    cargando,
    guardando,
    diaActual,
    totalDias,
    etapa,
    progreso,
    handleChange,
    handleChangeFinca,
    handleChangeEstanque,
    iniciarEdicion,
    cancelarEdicion,
    guardar,
    handleFinalizarPreCria,
    handleCrearSiembraDesdePrecria,
    datosCierrePreCriaCompletos,
    handleAgregarProveedorLarva,
    handleAgregarLaboratorioLarva,
    handleAgregarProcedenciaLarva,
    handleEditarProveedorLarva,
    handleEditarLaboratorioLarva,
    handleEditarProcedenciaLarva,
    handleEliminarProveedorLarva,
    handleEliminarLaboratorioLarva,
    handleEliminarProcedenciaLarva,
    fieldHelpers: { hasError, requiredLabel },
  };
}