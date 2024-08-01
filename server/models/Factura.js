import mongoose from "mongoose";

const facturaSchema = new mongoose.Schema({
  dateCreation: {
    fecha: String,
    hora: String,
  },
  codRecibo: String,
  dateRecepcion: {
    fecha: String,
    hora: String,
  },
  Modalidad: String,
  Nombre: String,
  idCliente: String,
  Items: [
    {
      identificador: String,
      tipo: String,
      item: String,
      simboloMedida: String,
      cantidad: Number,
      descripcion: String,
      precio: String,
      monto: String,
      descuentoManual: String,
      total: String,
    },
  ],
  celular: String,
  direccion: String,
  datePrevista: {},
  dateEntrega: {},
  dateRecojo: {},
  descuento: {
    estado: Boolean,
    modoDescuento: String, // Puntos | Promocion | Manual | Ninguno
    info: { type: mongoose.Schema.Types.Mixed },
    monto: Number,
  },
  estadoPrenda: String, // entregado | anulado | pendiente | donado
  estado: String, // reservado | registrado | preliminar
  listPago: [],
  dni: String,
  subTotal: String,
  totalNeto: String,
  cargosExtras: {},
  modeRegistro: String, // nuevo || antiguo
  notas: [],
  gift_promo: [],
  location: Number,
  attendedBy: {
    name: String,
    rol: String,
  },
  lastEdit: [],
  typeRegistro: String, // normal
});

const Factura = mongoose.model("Factura", facturaSchema);

export default Factura;
