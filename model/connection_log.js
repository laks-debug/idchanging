var mongoose = require("mongoose");
var connectionLogSchema = mongoose.Schema({
  machine_name: {
    type: String,
  },
  error_name: {
    type: String,
  },
  start_time: {
    type: Date,
    default: Date.now,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  end_time: {
    type: Date,
    default: null,
  },
});

var connectionLog = mongoose.model("ConnectionLog", connectionLogSchema);

var postStop = async (machine, stop_name, timestamp,line_id) => {
  connectionLog.findOneAndUpdate(
    { machine_name: machine, end_time: null,line_id:line_id },
    { end_time: timestamp },
    {
      new: true,
    },
    (err, doc) => {
      if (!err) {
        var data = new connectionLog({
          machine_name: machine,
          error_name: stop_name,
          start_time: timestamp,
          line_id:line_id,
        });
        data.save();
      }
    }
  );
};

//new log
var firstLog  = async (line_id,machine) =>{
    var data = new connectionLog({
        machine_name: machine,
        error_name: 'ok',
        start_time: new Date(),
        line_id:line_id,
      });
    var save =  await data.save();
    console.log(save)
}
module.exports.connectionLog  = connectionLog ;
module.exports.postStop = postStop;
module.exports.firstLog = firstLog