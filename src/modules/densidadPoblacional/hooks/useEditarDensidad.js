/**
 * ============================================================
 * HOOK USEEDITARDENSIDAD
 * ============================================================
 *
 * Calco de useDensidadPoblacional para edicion.
 *
 * RECONECTADO: getById/update llamaban a
 * densidadPoblacionalService (HTTP). Ahora llaman a
 * DensidadPoblacionalLocalService (SQLite), con localApi.inicializar()
 * antes de leer, igual que el resto del modulo.
 *
 * El conteo se registra tiro por tiro y el promedio, la densidad y
 * la poblacion total se calculan (ver useDatosConteo.js y
 * DensidadPoblacionalLocal.service.js).
 *
 * Este hook reusa useDatosConteo, el mismo hook que usa el alta:
 * asi los dos formularios comparten validaciones y formulas.
 *
 * Sobre cargar un registro existente: el detalle tiro por tiro se
 * persiste en la tabla local densidad_detalle_tiros, asi que
 * DensidadPoblacionalLocalService.getById() ya lo devuelve armado
 * en `registro.tiros` y aqui simplemente se carga tal cual.
 *
 * Registros creados antes de la migracion pueden no tener detalle.
 * En ese caso se abre con un tiro vacio y la validacion obliga a
 * capturar el conteo real antes de poder guardar, en vez de
 * inventar cifras.
 */

import { useCallback, useEffect, useState } from "react";
import { useDatosConteo } from "./useDatosConteo";
import DensidadPoblacionalLocalService from "../services/DensidadPoblacionalLocal.service.js";
import useFincaEstanqueDensidad from "./useFincaEstanqueDensidad";
import { useDatosBaseEstanque } from "./useDatosBaseEstanque";
import { localApi } from "../../../database/local/localApi.service";

function hoy() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function toMysqlDate(fecha) {
  if (!fecha) return "";
  if (fecha.includes("-") && !fecha.includes("/")) return fecha.slice(0, 10);
  const [d, m, y] = fecha.split("/");
  return `${y}-${m}-${d}`;
}

function formatearFechaUI(fecha) {
  if (!fecha) return hoy();
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    const [y, m, d] = fecha.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return fecha;
}

export default function useEditarDensidad(registroId, onGuardado) {
  const [finca, setFinca] = useState(null);
  const [estanque, setEstanque] = useState(null);
  const [fecha, setFecha] = useState(hoy());
  const [submitted, setSubmitted] = useState(false);
  const [errores, setErrores] = useState({});
  const [alerta, setAlerta] = useState({ visible: false, variant: "success", mensaje: "" });
  const [cargando, setCargando] = useState(true);

  const datosConteo = useDatosConteo();

  const { fincasOptions, estanquesOptions, errorCatalogos } = useFincaEstanqueDensidad(finca);
  const fincas = fincasOptions;
  const estanques = estanquesOptions;

  /*
  Precarga de area y siembra al cambiar de estanque, igual que en el
  alta, pero con omitirPrimerValor: el primer estanque que llega es
  el del registro que se esta abriendo, y sus valores tienen que
  quedar como se guardaron. Solo si el usuario cambia el estanque a
  proposito se traen los datos del nuevo.
  */
  const { cargandoDatosBase, errorDatosBase } = useDatosBaseEstanque(
    estanque,
    datosConteo.rellenarDesdeEstanque,
    { omitirPrimerValor: true }
  );

  const setFincaYResetEstanque = useCallback((v) => {
    setFinca(v);
    setEstanque(null);
  }, []);

  useEffect(() => {
    if (!registroId) { setCargando(false); return; }
    let activo = true;
    setCargando(true);

    (async () => {
      try {
        await localApi.inicializar();
        const r = await DensidadPoblacionalLocalService.getById(registroId);
        if (!activo || !r) return;

        setFinca(r.fincaId != null ? String(r.fincaId) : null);
        setEstanque(r.estanqueId != null ? String(r.estanqueId) : null);
        setFecha(formatearFechaUI(r.fecha));

        /*
        El detalle real del muestreo viene de SQLite
        (densidad_detalle_tiros). Si el registro es anterior a la
        migracion y no tiene detalle, cargarTiros deja un tiro vacio
        y la validacion obliga a capturarlo antes de guardar.
        */
        datosConteo.cargarTiros(r.tiros);

        datosConteo.setAreaAtarraya(String(r.areaAtarraya ?? ""));
        datosConteo.setSiembraPorM2(String(r.cantidadSiembra ?? ""));
        datosConteo.setAreaEstanque(String(r.areaEstanque ?? ""));
        datosConteo.setNotasConteo(r.notasConteo ?? "");
      } catch (error) {
        if (activo) {
          setAlerta({
            visible: true,
            variant: "danger",
            mensaje: error?.message || "No se pudo cargar el registro.",
          });
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registroId]);

  /*
  Revalida en vivo mientras el usuario escribe, pero solo despues de
  que ya intento guardar una vez (submitted=true). Sin este efecto,
  `errores` quedaba congelado con el resultado del ultimo click en
  Guardar: un campo que el usuario ya corrigio se seguia viendo en
  rojo hasta el proximo intento de guardado.
  */
  useEffect(() => {
    if (!submitted) return;

    const err = {};
    if (!finca) err.finca = "La finca es obligatoria";
    if (!estanque) err.estanque = "El estanque es obligatorio";
    if (!fecha) err.fecha = "La fecha es obligatoria";

    const { errores: erroresDatos } = datosConteo.validar();

    setErrores({ ...err, ...erroresDatos });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    submitted,
    finca,
    estanque,
    fecha,
    datosConteo.tiros,
    datosConteo.areaAtarraya,
    datosConteo.siembraPorM2,
    datosConteo.areaEstanque,
  ]);

  const handleGuardar = useCallback(async () => {
    setSubmitted(true);

    const err = {};
    if (!finca) err.finca = "La finca es obligatoria";
    if (!estanque) err.estanque = "El estanque es obligatorio";
    if (!fecha) err.fecha = "La fecha es obligatoria";

    const { valido: datosValidos, errores: erroresDatos } = datosConteo.validar();
    const combinados = { ...err, ...erroresDatos };
    setErrores(combinados);

    if (Object.keys(combinados).length > 0 || !datosValidos) {
      setAlerta({ visible: true, variant: "danger", mensaje: "Por favor complete todos los campos obligatorios." });
      return;
    }

    try {
      // Mismo criterio que el alta: solo se envian los datos
      // capturados. El promedio, la densidad, la poblacion total y
      // la sobrevivencia las recalcula DensidadPoblacionalLocal.service.js.
      await DensidadPoblacionalLocalService.update(registroId, {
        idFinca: finca,
        idEstanque: estanque,
        fecha: toMysqlDate(fecha),
        tiros: datosConteo.tirosParaEnviar,
        areaAtarraya: datosConteo.areaAtarraya,
        notasConteo: datosConteo.notasConteo?.trim() ? datosConteo.notasConteo : "No hay notas",
        cantidadSiembra: datosConteo.siembraPorM2,
        areaEstanque: datosConteo.areaEstanque,
      });
      setAlerta({ visible: true, variant: "success", mensaje: "Registro actualizado exitosamente" });
      onGuardado?.();
    } catch (e) {
      setAlerta({
        visible: true,
        variant: "danger",
        mensaje: e?.message || "No se pudo actualizar el registro.",
      });
    }
  }, [finca, estanque, fecha, datosConteo, registroId, onGuardado]);

  return {
    finca,
    setFinca: setFincaYResetEstanque,
    estanque,
    setEstanque,
    fecha,
    setFecha,
    fincas,
    estanques,
    submitted,
    errores,
    alerta,
    errorCatalogos: errorCatalogos || errorDatosBase,
    cargandoDatosBase,
    handleGuardar,
    cargando,
    ...datosConteo,
  };
}