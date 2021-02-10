var mongoose = require("mongoose");
var moment = require("moment");
var ChangeOverMaster = mongoose.Schema(
  {
    changeover_type: {
      type: String
    },
    changeover_name: {
      type: String,
    },
    standard_duration: {
      type: Number,
    },
    field_1: {
      type: String,
      default:null
    },
  },
  { timestamps: true }
);
var changeOverMaster = mongoose.model("changeovermaster", ChangeOverMaster);
module.exports.changeOverMaster = changeOverMaster;