var mongoose = require("mongoose");
var moment = require("moment");
var {addMachineData} = require('./project.model');
var statusSchema = mongoose.Schema({
  machine: {
    type: String,
  },
  condition: {
    type: String,
    default: "ready",
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  critical_machine_off: {
    type: Boolean,
    default: false,
  },
  last_update: {
    type: Date,
    default: Date.now,
  },
  code: {
    type: String,
    default: "ready",
  },
});

var Condition = mongoose.model("Status", statusSchema);

//get current condition of machine
var getCondition = async (machine, line_id,date,shift,operator_name,batch) => {
  var condition = await Condition.findOne({
    machine: machine,
    line_id: line_id,
  });
  if (!condition) {
    var con = new Condition({
      machine: machine,
      last_update: moment().format("YYYY-MM-DDTHH:mm:ss"),
      line_id: line_id,
    });
    addMachineData( line_id,date,shift,operator_name,batch,machine)
    var condition = con.save();
    return condition;
  } else {
    return condition;
  }
};

//update conditio
var updateCondition = (machine, line_id, condition, timestamp, code, cb) => {
  //console.log(machine,condition);
  Condition.updateOne(
    {
      machine: machine,
      line_id: line_id,
    },
    {
      $set: {
        condition: condition,
        last_update: timestamp,
        code: code,
      },
    },
    (err, doc) => {
      if (err) {
        cb(err);
      } else {
        cb(null,doc);
      }
    }
  );
};
module.exports.Condition = Condition;
module.exports.getCondition = getCondition;
module.exports.updateCondition = updateCondition;
