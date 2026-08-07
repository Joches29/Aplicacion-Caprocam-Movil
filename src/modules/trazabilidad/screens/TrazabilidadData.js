/**
 * Datos estaticos del modulo Trazabilidad.
 *
 * initialForm: estado inicial del formulario "Agregar Trazabilidad".
 * El campo dias viene prellenado con "30" (valor tipico del ciclo
 * de pre-cria), tal como lo pide la especificacion del modulo.
 *
 * fecha: arranca con el valor REAL de hoy (getCurrentDate), no con
 * "". DateInput.jsx (componente compartido, src/shared/components)
 * muestra la fecha de hoy como placeholder visual cuando el value
 * esta vacio, pero eso NO actualiza formData.fecha -- es solo
 * cosmetico. Si initialForm.fecha se deja en "", el usuario ve
 * "hoy" en pantalla pero el formulario sigue sin fecha real
 * guardada, y el submit se rechaza hasta que la persona toca el
 * campo y la selecciona a mano. Al arrancar con getCurrentDate()
 * ya real, ese problema no ocurre.
 *
 * NOTA: el bug de fondo esta en DateInput.jsx y probablemente
 * afecta a cualquier otro modulo que use ese componente con un
 * valor inicial vacio esperando que "hoy" quede seleccionado por
 * defecto. No se toca ese archivo compartido desde aqui -- vale
 * la pena avisarlo en el PR para que el dueño de shared/components
 * lo revise.
 */

import { getCurrentDate } from "../../../shared/utils/dateUtils";

export const initialForm = {
  fincaId: "",
  estanqueOrigenId: "",
  estanqueDestinoId: "",
  fecha: getCurrentDate(),
  tamaño: "",
  dias: "30",
  pl: "",
};