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

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigation, useRouter } from "expo-router";

import {
  useFieldValidation,
  validarCamposObligatorios,
} from "./useFieldValidation";
import { obtenerCamposObligatorios as obtenerCamposObligatoriosPorTipo, determinarCampoDelError } from "./siembraValidationRules";
import {
  calcularDensidadDesdeCantidad,
  calcularProgresoCiclo,
} from "./siembraCalculos";
import { obtenerFechaHoy, formatearFechaDesdeISO, esFechaAnterior } from "./dateUtils";
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
  LoteLarvaDTO,
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
    tecnica_cultivo: s.tecnicaCultivo,
    densidad_poblacional: s.densidadPoblacional,
    cantidad_sembrada: s.cantidadSembrada,
    pl_siembra: s.plSiembra,
    precria_id: s.precriaId,
    lote_larva_id: s.loteLarvaId,
    duracion_ciclo: s.duracionCiclo,
    produccion_kg: s.produccionKg,
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

function mapLoteAFormData(lote) {
  if (!lote) return {};
  return {
    codigoLoteLarva: lote.codigo_lote || lote.codigoLoteLarva || "",
    proveedorLarva: lote.proveedor_id || lote.proveedorLarva || "",
    laboratorioLarva: lote.laboratorio || lote.laboratorioLarva || "",
    procedenciaLarva: lote.procedencia || lote.procedenciaLarva || "",
    certificadoLarva: lote.certificado_larva || lote.certificadoLarva || "",
    estadoLote: lote.estado_lote || lote.estadoLote || "",
  };
}

function mapSiembraAFormData(siembra, lote, precriaOrigen, areaHectareas = "") {
  if (!siembra) return null;

  return {
    id: siembra.id,
    tipoRegistro: "siembra",
    pasoPorPrecria: siembra.precria_id ? "si" : "no",
    precriaId: siembra.precria_id || "",

    finca: siembra.finca_id != null ? String(siembra.finca_id) : "",
    estanque: siembra.estanque_id != null ? String(siembra.estanque_id) : "",
    codigoLoteLarva: lote?.codigo_lote || "",
    estado: siembra.estado || "Activa",

    fechaSiembra: formatearFechaDesdeISO(siembra.fecha_siembra),
    tecnicaCultivo: siembra.tecnica_cultivo || "semi",
    densidadPoblacional: siembra.densidad_poblacional
      ? String(siembra.densidad_poblacional)
      : (siembra.cantidad_sembrada && areaHectareas
          ? calcularDensidadDesdeCantidad(areaHectareas, siembra.cantidad_sembrada)
          : ""),
    cantidadSembrada: String(siembra.cantidad_sembrada || ""),
    plSiembra: siembra.pl_siembra != null ? `PL${siembra.pl_siembra}` : "",
    duracionCiclo: String(siembra.duracion_ciclo || 90),
    produccionKg: siembra.produccion_kg != null ? String(siembra.produccion_kg) : "",
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

    finca: precria.finca_id != null ? String(precria.finca_id) : "",
    estanque: precria.estanque_id != null ? String(precria.estanque_id) : "",
    codigoLoteLarva: lote?.codigo_lote || "",
    estado: precria.estado || "En Proceso",

    fechaSiembra: "",
    tecnicaCultivo: "semi",
    densidadPoblacional: "",
    cantidadSembrada: "",
    plSiembra: "",
    duracionCiclo: "90",
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

  // obtenerNumeroPL devuelve null (no NaN) cuando el campo esta vacio,
  // asi que se compara contra null en vez de Number.isNaN. Antes,
  // Number.isNaN(null) era false, entonces cuando plFinal aun estaba
  // vacio (Pre-Cria en curso, caso normal) el null se coaccionaba a 0
  // en la comparacion y disparaba el error de coherencia aunque el
  // usuario no hubiera tocado los campos de cierre.
  if (
    plInicialNumero !== null &&
    plFinalNumero !== null &&
    plFinalNumero < plInicialNumero
  ) {
    errores.plFinal = "No puede ser un estadio menor al PL inicial.";
  }

  if (
    formData.fechaInicio &&
    formData.fechaFin &&
    esFechaAnterior(formData.fechaFin, formData.fechaInicio)
  ) {
    errores.fechaFin = "La fecha de fin de Pre-Cría no puede ser anterior a la fecha de inicio.";
  }

  return errores;
}

function calcularEtapa(progreso) {
  if (progreso >= 66) return 3;
  if (progreso >= 33) return 2;
  return 1;
}

export default function useDetalleSiembra(id, tipoRegistroParam, esFinalizar = false) {
  const router = useRouter();
  const navigation = useNavigation();

  const [siembra, setSiembra] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);

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
          id: f.id,
          servidorId: f.servidorId || f.servidor_id,
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
      setMensaje(err.response?.data?.message || err.message || "No fue posible cargar el registro.");
      setMensajeVariant("danger");
    } finally {
      setCargando(false);
    }
  }, [id, tipoRegistroParam]);

  useEffect(() => {
    cargarDetalle();
    // Vuelve a consultar la base local cada vez que esta pantalla
    // recupera el foco (ej. al volver de Editar con router.back()).
    // Sin esto, la pantalla de Detalle -que queda montada debajo de
    // Editar en el stack- se queda con los datos viejos en memoria
    // aunque el guardado en Editar sí haya actualizado la base local.
    const unsubscribe = navigation.addListener("focus", cargarDetalle);
    return unsubscribe;
  }, [navigation, cargarDetalle]);

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

        if (field === "areaHectareas" || field === "cantidadSembrada") {
          updatedData.densidadPoblacional = calcularDensidadDesdeCantidad(
            updatedData.areaHectareas,
            updatedData.cantidadSembrada,
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
        densidadPoblacional: calcularDensidadDesdeCantidad(
          areaStr,
          previousData.cantidadSembrada,
        ),
      }));
    },
    [todosEstanques],
  );

  const estanques = useMemo(() => {
    const mapEstanque = (e) => ({
      label: e.codigo
        ? e.codigo.toLowerCase().startsWith("estanque") || e.codigo.toLowerCase().startsWith("tanque")
          ? e.codigo
          : `Estanque ${e.codigo}`
        : e.nombre
        ? e.nombre
        : `Estanque #${e.id}`,
      value: String(e.id),
      ...e,
    });

    if (!formData?.finca) {
      return todosEstanques.map(mapEstanque);
    }

    const fincaObj = fincas.find(
      (f) =>
        String(f.id) === String(formData.finca) ||
        String(f.value) === String(formData.finca) ||
        String(f.servidorId) === String(formData.finca)
    );

    const fincaLocalId = fincaObj ? String(fincaObj.id || fincaObj.value) : String(formData.finca);
    const fincaServidorId = fincaObj ? String(fincaObj.servidorId || fincaObj.servidor_id || "") : "";

    return todosEstanques
      .filter((e) => {
        const estanqueFincaId = String(e.fincaId || e.idFinca || e.finca_id || "");
        return (
          estanqueFincaId === fincaLocalId ||
          (fincaServidorId !== "" && estanqueFincaId === fincaServidorId)
        );
      })
      .map(mapEstanque);
  }, [formData?.finca, todosEstanques, fincas]);

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

  const verificarCatalogoEnUso = useCallback(async (campoCamel, campoSnake, valorId) => {
    const [lotes, siembras, precrias] = await Promise.all([
      LoteLarvaLocalService.getAll(),
      SiembraLocalService.getAll(),
      PrecriaLocalService.getAll(),
    ]);

    return lotes.some((lote) => {
      const valorLote = lote[campoCamel] || lote[campoSnake];
      if (String(valorLote) !== String(valorId)) return false;

      const siembraActiva = siembras.some(
        (s) => String(s.loteLarvaId || s.lote_larva_id) === String(lote.id) && String(s.estado || "Activa").toLowerCase() !== "finalizada"
      );
      const precriaActiva = precrias.some(
        (p) => String(p.loteLarvaId || p.lote_larva_id) === String(lote.id) && String(p.estado || "Activa").toLowerCase() !== "finalizada"
      );

      return siembraActiva || precriaActiva;
    });
  }, []);

  const handleEliminarProveedorLarva = useCallback(async (value) => {
    const enUso = await verificarCatalogoEnUso("proveedorLarvaId", "proveedor_larva_id", value);
    if (enUso) {
      throw new Error("No se puede eliminar este proveedor porque está asignado a una siembra o pre-cría activa.");
    }
    await ProveedorLarvaLocalService.deleteById(value);
    setProveedoresLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo && previo.proveedorLarva === value
        ? { ...previo, proveedorLarva: "" }
        : previo,
    );
  }, [verificarCatalogoEnUso]);

  const handleEliminarLaboratorioLarva = useCallback(async (value) => {
    const enUso = await verificarCatalogoEnUso("laboratorioId", "laboratorio_id", value);
    if (enUso) {
      throw new Error("No se puede eliminar este laboratorio porque está asignado a una siembra o pre-cría activa.");
    }
    await LaboratorioLocalService.deleteById(value);
    setLaboratoriosLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo && previo.laboratorioLarva === value
        ? { ...previo, laboratorioLarva: "" }
        : previo,
    );
  }, [verificarCatalogoEnUso]);

  const handleEliminarProcedenciaLarva = useCallback(async (value) => {
    const enUso = await verificarCatalogoEnUso("procedenciaId", "procedencia_id", value);
    if (enUso) {
      throw new Error("No se puede eliminar esta procedencia porque está asignada a una siembra o pre-cría activa.");
    }
    await ProcedenciaLocalService.deleteById(value);
    setProcedenciasLarva((previo) =>
      previo.filter((item) => item.value !== value),
    );
    setFormData((previo) =>
      previo && previo.procedenciaLarva === value
        ? { ...previo, procedenciaLarva: "" }
        : previo,
    );
  }, [verificarCatalogoEnUso]);

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

    if (formData.tipoRegistro === "siembra" && formData.pasoPorPrecria === "si") {
      const sembrada = Number(formData.cantidadSembrada || 0);
      const sobrevivientes = Number(formData.cantidadSobrevivientePrecria || 0);
      if (sembrada > sobrevivientes) {
        erroresObligatorios.cantidadSembrada = "No puede superar los sobrevivientes de Pre-Cría.";
      }
    }

    if (Object.keys(erroresObligatorios).length > 0) {
      setErrors(erroresObligatorios);
      const msj = erroresObligatorios.cantidadSembrada === "No puede superar los sobrevivientes de Pre-Cría."
        ? "La cantidad sembrada no puede superar la cantidad de sobrevivientes de la Pre-Cría de origen."
        : "Revisa los campos obligatorios marcados con * antes de guardar.";
      setMensaje(msj);
      setMensajeVariant("danger");
      return;
    }

    if (formData.tipoRegistro === "precria") {
      const erroresCoherencia = validarCoherenciaCierrePrecria(formData);
      if (Object.keys(erroresCoherencia).length > 0) {
        setErrors(erroresCoherencia);
        const msj = erroresCoherencia.fechaFin
          ? "La fecha de fin de Pre-Cría no puede ser anterior a la fecha de inicio."
          : "Revisa los datos de cierre: la cantidad final o el PL final no son coherentes con los datos iniciales de la Pre-Cría.";
        setMensaje(msj);
        setMensajeVariant("danger");
        return;
      }
    }

    setGuardando(true);
    try {
      await localApi.inicializar();

      if (String(formData.estanque) !== String(siembra?.estanque)) {
        const estanqueSeleccionado = todosEstanques.find(
          (e) => String(e.id) === String(formData.estanque) || String(e.servidorId) === String(formData.estanque)
        );
        if (estanqueSeleccionado) {
          const estadoEst = String(estanqueSeleccionado.estado || estanqueSeleccionado.estadoEstanque || "").toLowerCase();
          if (estadoEst !== "" && estadoEst !== "activo") {
            setMensaje("El estanque seleccionado no se encuentra en estado 'Activo'.");
            setMensajeVariant("danger");
            setGuardando(false);
            return;
          }
        }

        const [todasSiembras, todasPrecrias] = await Promise.all([
          SiembraLocalService.getAll(),
          PrecriaLocalService.getAll(),
        ]);

        const tieneSiembraActiva = (todasSiembras || []).some(
          (s) => String(s.id) !== String(formData.id) && String(s.estanqueId || s.estanque_id) === String(formData.estanque) && String(s.estado || "").toLowerCase() !== "finalizada"
        );
        const tienePrecriaActiva = (todasPrecrias || []).some(
          (p) => String(p.id) !== String(formData.id) && String(p.estanqueId || p.estanque_id) === String(formData.estanque) && String(p.estado || "").toLowerCase() !== "finalizada"
        );

        if (tieneSiembraActiva || tienePrecriaActiva) {
          setMensaje("El estanque seleccionado ya cuenta con un ciclo de cultivo (Siembra o Pre-Cría) activo.");
          setMensajeVariant("danger");
          setGuardando(false);
          return;
        }
      }

      // Los campos de "Datos de Larva" (proveedor, laboratorio,
      // procedencia, código de lote, certificado) viven en el Lote
      // de Larva, no en Siembra/Pre-Cría, y en esta pantalla se
      // muestran editables salvo cuando la Siembra viene de una
      // Pre-Cría (ahí son heredados/solo lectura, ver DatosLarvaSection
      // con mode="view"). Sin este guardado, los cambios del usuario
      // en esos campos se perdían: solo quedaban en memoria hasta
      // salir de la pantalla, y el Detalle volvía a mostrar los
      // valores viejos al releer el Lote desde la base local.
      const loteEsEditable = !(
        formData.tipoRegistro === "siembra" && formData.pasoPorPrecria === "si"
      );
      if (loteEsEditable && formData.loteId) {
        await LoteLarvaLocalService.update(
          formData.loteId,
          new LoteLarvaDTO(formData),
        );
      }

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

      // El lote ya se guardó arriba (o no era editable en este caso);
      // acá solo se conservan sus valores actuales del formData para
      // reflejarlos de inmediato en pantalla sin esperar otra lectura.
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
      
      const msjExito = formData.tipoRegistro === "precria"
        ? "Pre-Cría editada correctamente."
        : "Siembra editada correctamente.";
      setMensaje(msjExito);
      setMensajeVariant("success");
    } catch (err) {
      const data = err.response?.data;
      const detalle = Array.isArray(data?.error) ? data.error[0] : "";
      const mensajeFinal = detalle || data?.message || err.message || "No fue posible guardar los cambios.";

      const campoConError = determinarCampoDelError(mensajeFinal);
      if (campoConError) {
        setErrors((prev) => ({ ...prev, [campoConError]: mensajeFinal }));
      }
      
      setMensaje(mensajeFinal);
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
      const msj = erroresCoherencia.fechaFin
        ? "La fecha de fin de Pre-Cría no puede ser anterior a la fecha de inicio."
        : "Revisa los datos de cierre: la cantidad final o el PL final no son coherentes con los datos iniciales de la Pre-Cría.";
      setMensaje(msj);
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
      const data = err.response?.data;
      const detalle = Array.isArray(data?.error) ? data.error[0] : "";
      const mensajeFinal = detalle || data?.message || err.message || "No fue posible finalizar la Pre-Cría.";

      const campoConError = determinarCampoDelError(mensajeFinal);
      if (campoConError) {
        setErrors((prev) => ({ ...prev, [campoConError]: mensajeFinal }));
      }
      
      setMensaje(mensajeFinal);
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

    setTimeout(() => {
      router.replace({
        pathname: "/siembra/nueva",
        params: construirParamsSiembraDesdePrecria(),
      });
    }, 3000);
  }, [finalizarPreCria, construirParamsSiembraDesdePrecria, router]);

  const handleFinalizarSiembra = useCallback(async () => {
    setGuardando(true);
    try {
      await localApi.inicializar();
      const registro = adaptarSiembraLocal(
        await SiembraLocalService.finalizar(id)
      );

      const conLote = {
        ...mapSiembraAFormData(registro, null),
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
      setMensaje("Siembra finalizada correctamente.");
      setMensajeVariant("success");
    } catch (err) {
      const data = err.response?.data;
      const detalle = Array.isArray(data?.error) ? data.error[0] : "";
      const mensajeFinal = detalle || data?.message || err.message || "No fue posible finalizar la siembra.";

      const campoConError = determinarCampoDelError(mensajeFinal);
      if (campoConError) {
        setErrors((prev) => ({ ...prev, [campoConError]: mensajeFinal }));
      }
      
      setMensaje(mensajeFinal);
      setMensajeVariant("danger");
    } finally {
      setGuardando(false);
    }
  }, [id, formData]);

  const handleCrearSiembraDesdePrecria = useCallback(() => {
    router.push({
      pathname: "/(drawer)/siembra/nueva",
      params: construirParamsSiembraDesdePrecria(),
    });
  }, [construirParamsSiembraDesdePrecria, router]);

  const fincaObj = fincas.find(
    (f) => String(f.value) === String(formData?.finca) || String(f.id) === String(formData?.finca)
  );
  const fincaLabel =
    fincaObj?.label || (formData?.finca ? `Finca #${formData.finca}` : "Sin finca");

  const estanqueObj =
    estanques.find(
      (e) => String(e.value) === String(formData?.estanque) || String(e.id) === String(formData?.estanque)
    ) ||
    (todosEstanques || []).find(
      (e) => String(e.id) === String(formData?.estanque) || String(e.value) === String(formData?.estanque) || String(e.servidorId) === String(formData?.estanque)
    );

  const estanqueLabel =
    estanqueObj?.label ||
    (estanqueObj?.codigo
      ? estanqueObj.codigo.toLowerCase().startsWith("estanque") || estanqueObj.codigo.toLowerCase().startsWith("tanque")
        ? estanqueObj.codigo
        : `Estanque ${estanqueObj.codigo}`
      : null) ||
    (estanqueObj?.nombre ? estanqueObj.nombre : null) ||
    (formData?.estanque ? `Estanque #${formData.estanque}` : "Sin estanque");

  const scrollRef = useRef(null);
  useEffect(() => {
    if (mensaje !== "" && mensajeVariant === "danger") {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [mensaje, mensajeVariant]);

  const handlePresionarGuardar = useCallback(() => {
    if (esFinalizar) {
      handleFinalizarPreCria();
    } else {
      guardar();
    }
  }, [esFinalizar, handleFinalizarPreCria, guardar]);

  return {
    siembra,
    formData,
    estanques,
    todosEstanques,
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
    confirmarFinalizar,
    setConfirmarFinalizar,
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
    handleFinalizarSiembra,
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

    // Nuevos retornos compartidos con las pantallas
    fincaLabel,
    estanqueLabel,
    scrollRef,
    handlePresionarGuardar,
  };
}