export class MantVentaDTO {
    constructor({
        finca,
        estanque,
        comprador,
        pesoPromedio,
        cantVendida,
        precioKilo,
        fecha
    }) {
        this.finca = finca;
        this.estanque = estanque;
        this.comprador = comprador;

        this.pesoPromedio = pesoPromedio;
        this.cantVendida = cantVendida;
        this.precioKilo = precioKilo;

        this.total = Number(cantVendida) * Number(precioKilo);

        this.fecha = fecha;
    }
}