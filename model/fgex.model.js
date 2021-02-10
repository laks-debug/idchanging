var mongoose = require("mongoose");
var moment = require("moment");
var Fgex = mongoose.Schema(
  {
    fgex: {
      type: String
    },
    product_name: {
      type: String,
    },
    pack: {
      type: Number,
    },
    halb_code: {
      type: String,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "type",
    },
    blister_size: {
      type: String,
    },
    blister_min: Number,
    blister_max: Number,
    current_machine: String,
    blister_per_format: Number,
    machine_cycle: Number,
    rated_speed: Number,
    tablet_per_blister: Number,
    layout_no: String,
    weight_per_format:Number,
  },
  { timestamps: true }
);
var FGEX = mongoose.model("Fgex", Fgex);
module.exports.FGEX = FGEX;