var mongoose = require("mongoose");
const { FaultCause } = require("./fault_cause.model");
var goodTempSchema = new mongoose.Schema(
  {
    shift_start_good_count: {
      type: Number,
      default: 0,
    },
    shift_start_reject_count: {
      type: Number,
      default: 0,
    },
    mode: {
      type: Number,
      default: 0,
    },
    bpm: {
      type: Number,
      default: 0,
    },
    current_good_value: {
      type: Number,
      default: 0,
    },
    current_reject_value: {
      type: Number,
      default: 0,
    },
    current_shift: {
      type: String,
    },
    currnt_batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bacth",
    },
    machine: {
      type: String,
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "line",
    },
    changeover_mode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
var TempGood = mongoose.model("TempGood", goodTempSchema);

//get temp good
const getTempGood = async (
  machine,
  line_id,
  shift,
  batch,
  current_good_value,
  current_reject_value
) => {
  var temp = await TempGood.findOne({ machine: machine, line_id: line_id });
  if (!temp) {
    var newTemp = new TempGood({
      line_id: line_id,
      machine: machine,
      current_shift: shift,
      currnt_batch: batch,
      current_good_value: current_good_value,
      current_reject_value: current_reject_value,
      shift_start_good_count: current_good_value,
      shift_start_reject_count: current_reject_value,
    });
    var result = await newTemp.save();
    return result;
  } else {
    return temp;
  }
};
//pre_shift
var preShift = async function (machine, line_id) {
  var tempGood = await TempGood.findOne({ line_id: line_id, machine: machine });
  if (!tempGood) {
    return "Shift A";
  }
  var pre_shift = tempGood.current_shift;
  return pre_shift;
};
//update frequent
const frequentGoodUpdate = async (machine, line_id, obj) => {
  var result = await TempGood.updateOne(
    {
      machine: machine,
      line_id: line_id,
    },
    {
      $set: obj,
    }
  );
  return result;
};

const updateChangeoverMode = async (machine, line_id, status) => {
  var result = await TempGood.updateOne(
    {
      machine: machine,
      line_id: line_id,
    },
    {
      $set: {
        changeover_mode:status
      },
    }
  );
  return result;
};

module.exports.TempGood = TempGood;
module.exports.getTempGood = getTempGood;
module.exports.frequentGoodUpdate = frequentGoodUpdate;
module.exports.preShift = preShift;
module.exports.updateChangeoverMode = updateChangeoverMode;
