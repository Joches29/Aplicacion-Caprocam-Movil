export class mantCrecmientoDTO {
  constructor({
    finca,
    estanque,
    pesoActual,
    colaborador = null,
    fechaRegistro,
    muestreos = [],
  }) {
    this.finca = finca;
    this.estanque = estanque;
    this.colaborador = colaborador;
    this.fechaRegistro = fechaRegistro;
    this.pesoActual = pesoActual;
    this.muestreos = Array.isArray(muestreos) ? muestreos : [];
  }
}
