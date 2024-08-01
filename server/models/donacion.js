import mongoose from "mongoose";

const DonationSchema = new mongoose.Schema(
  {
    idOrden: String,
    donationDate: {
      fecha: String,
      hora: String,
    },
  },
  { collection: "Donacion" }
);

const Donacion = mongoose.model("Donacion", DonationSchema);

export default Donacion;
