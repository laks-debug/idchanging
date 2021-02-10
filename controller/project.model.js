var mongoose = require("mongoose");
var moment = require("moment");
var projectSchema = new mongoose.Schema({
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  date: {
    type: Date,
  },
  shift_wise: [
    {
      shift_name: {
        type: String,
      },
      operator_name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "operator",
      },
      batch_wise: [
        {
          batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "batch",
          },
          start_timestamp: {
            type: Date,
          },
          end_timestamp: {
            type: Date,
            default: null,
          },
          machine_wise: [
            {
              machine_name: {
                type: String,
              },
              goodCount: {
                type: Number,
                default: 0,
              },
              max_bpm: {
                type: Number,
                default: 0,
              },
              startup_reject: {
                type: Number,
                default: 0,
              },
              reject_count: {
                type: Number,
                default: 0,
              },
              stop_wise: [
                {
                  stop_name: {
                    type: String,
                  },
                  duration: {
                    type: Number,
                    default: 0,
                  },
                  count: {
                    type: Number,
                    default: 0,
                  },
                  details: [
                    {
                      duration_type: {
                        type: String,
                      },
                      duration: {
                        type: Number,
                        default: 0,
                      },
                      count: {
                        type: Number,
                        default: 0,
                      },
                      duration_details: [
                        {
                          fault_name: {
                            type: String,
                          },
                          fault_id: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "fault",
                          },
                          duration: {
                            type: Number,
                            default: 0,
                          },
                          count: {
                            type: Number,
                            default: 0,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

var Project = mongoose.model("Project", projectSchema);
//state array
var state_arr = [
  "changeover",
  "not_used",
  "updt",
  "pdt",
  "fault",
  "blocked",
  "waiting",
  "manual_stop",
  "ready",
  "executing",
  "cip",
];
//duration for major minor in minute
var major_minor_duration = 5;
//add shift data in database
var addShiftData = (line_id, date, shift_name, operator_name, batch, cb) => {
  var shift = {
    shift_name: shift_name,
    operator_name: operator_name,
    batch_wise: [
      {
        batch: batch,
        start_timestamp: moment().format("YYYY-MM-DDTHH:mm"),
      },
    ],
  };
  var shift = Project.updateOne(
    {
      line_id: line_id,
      date: date,
    },
    {
      $push: {
        shift_wise: shift,
      },
    },
    {
      upsert: true,
    },
    (err, doc) => {
      cb(doc);
    }
  );
  return shift;
};

//batch end on shift end
const batchEnd = async (line_id, date, shift, cb) => {
  Project.updateOne(
    {
      line_id: line_id,
      date: date,
    },
    {
      $set: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].end_timestamp": moment().format(
          "YYYY-MM-DDTHH:mm"
        ),
      },
    },
    {
      arrayFilters: [
        { "shiftElement.shift_name": shift },
        { "batchElement.end_timestamp": null },
      ],
    },
    (err, doc) => {
      cb(doc);
    }
  );
};

//add machine data in database
const addMachineData = async (
  line_id,
  date,
  shift,
  operator_name,
  batch,
  machine_name,
  cb
) => {
  var stop_wise = [];
  state_arr.forEach((element) => {
    stop_wise.push({
      stop_name: element,
      details: [
        {
          duration_type: "major",
        },
        {
          duration_type: "minor",
        },
      ],
    });
  });
  //machine data for push
  var machine_data = {
    machine_name: machine_name,
    stop_wise: stop_wise,
  };
  Project.updateOne(
    {
      line_id: line_id,
      date: date,
    },
    {
      $push: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise": machine_data,
      },
    },
    {
      arrayFilters: [
        { "shiftElement.shift_name": shift },
        { "batchElement.batch": batch },
      ],
      upsert: true,
    },
    (err, machine) => {
      if (err) {
        //function will run if line is not in database
        addShiftData(line_id, date, shift, operator_name, batch, () => {
          addMachineData(
            line_id,
            date,
            shift,
            operator_name,
            batch,
            machine_name
          );
        });
      } else {
        //function if batch will not in shift
        if (machine.nModified == 0) {
          Project.updateOne(
            {
              line_id: line_id,
              date: date,
            },
            {
              $set: {
                "shift_wise.$[shiftElement].batch_wise.$[batchElement].end_timestamp": moment().format(
                  "YYYY-MM-DDTHH:mm"
                ),
              },
            },
            {
              arrayFilters: [
                { "shiftElement.shift_name": shift },
                { "batchElement.end_timestamp": null },
              ],
            },
            (err, doc) => {
              if (!err) {
                //function will run if shift is not present in line collection
                if (doc.nModified == 0) {
                  addShiftData(
                    line_id,
                    date,
                    shift,
                    operator_name,
                    batch,
                    () => {
                      addMachineData(
                        line_id,
                        date,
                        shift,
                        operator_name,
                        batch,
                        machine_name,
                        (data) => {
                          cb(data);
                        }
                      );
                    }
                  );
                } else {
                  var batch_data = {
                    batch: batch,
                    start_timestamp: moment().format("YYYY-MM-DDTHH:mm"),
                    machine_wise: machine_data,
                  };
                  Project.updateOne(
                    {
                      line_id: line_id,
                      date: date,
                    },
                    {
                      $push: {
                        "shift_wise.$[shiftElement].batch_wise": batch_data,
                      },
                    },
                    {
                      arrayFilters: [{ "shiftElement.shift_name": shift }],
                    },
                    (err, data) => {
                      if (err) {
                        cb(err);
                      } else {
                        cb(data);
                      }
                    }
                  );
                }
              } else {
                cb(err);
              }
            }
          );
        }
      }
    }
  );
};

//add stop data
const updateStopData = (
  line_id,
  date,
  shift,
  machine,
  stop,
  code,
  duration,
  cb
) => {
  //fault code
  var fault_data = {
    fault_name: code,
    count: 1,
    duration: duration,
  };
  var duration_type = checkMajorMinor(duration);
  //check if stop code avaible in databse
  Project.updateOne(
    {
      line_id: line_id,
      date: date,
    },
    {
      $inc: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration_details.$[durationDetailsElement].count": 1,
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration_details.$[durationDetailsElement].duration": duration,
      },
    },
    {
      arrayFilters: [
        { "shiftElement.shift_name": shift },
        { "machineElement.machine_name": machine },
        { "batchElement.end_timestamp": null },
        { "stopElement.stop_name": stop },
        { "detailsElement.duration_type": duration_type },
        { "durationDetailsElement.fault_name": code },
      ],
      upsert: true,
    },
    (err, doc) => {
      //test parent avaible in
      if (doc.nModified == 0) {
        Project.updateOne(
          {
            line_id: line_id,
            date: date,
          },
          {
            $push: {
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration_details": fault_data,
            },
            $inc: {
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].count": 1,
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].duration": duration,
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].count": 1,
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration": duration,
            },
          },
          {
            arrayFilters: [
              { "shiftElement.shift_name": shift },
              { "machineElement.machine_name": machine },
              { "batchElement.end_timestamp": null },
              { "stopElement.stop_name": stop },
              { "detailsElement.duration_type": duration_type },
            ],
          },
          (err, doc) => {
            cb(doc);
          }
        );
      } else {
        Project.updateOne(
          {
            line_id: line_id,
            date: date,
          },
          {
            $inc: {
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].count": 1,
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].duration": duration,
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].count": 1,
              "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].stop_wise.$[stopElement].details.$[detailsElement].duration": duration,
            },
          },
          {
            arrayFilters: [
              { "shiftElement.shift_name": shift },
              { "machineElement.machine_name": machine },
              { "batchElement.end_timestamp": null },
              { "stopElement.stop_name": stop },
              { "detailsElement.duration_type": duration_type },
            ],
          },
          (err, doc) => {
            cb(doc);
          }
        );
      }
    }
  );
};

var updateGoodCount = async (
  line_id,
  date,
  shift,
  batch,
  machine,
  goodCount,
  reject_count,
  cb
) => {
  Project.updateOne(
    {
      line_id: line_id,
      date: date,
    },
    {
      $set: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].goodCount": goodCount,
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].reject_count": reject_count,
      },
    },
    {
      arrayFilters: [
        { "shiftElement.shift_name": shift },
        { "machineElement.machine_name": machine },
        { "batchElement.batch": batch },
      ],
    },
    (err, data) => {
      cb(data);
    }
  );
};
//update bpm and mode
const updateMaxBpm = async (
  line_id,
  date,
  shift,
  operator_name,
  batch,
  machine,
  bpm,
  cb
) => {
  Project.updateOne(
    {
      line_id: line_id,
      date: date,
    },
    {
      $set: {
        "shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].max_bpm": bpm,
        //"shift_wise.$[shiftElement].batch_wise.$[batchElement].machine_wise.$[machineElement].mode": mode,
      },
    },
    {
      arrayFilters: [
        { "shiftElement.shift_name": shift },
        { "machineElement.machine_name": machine },
        { "batchElement.batch": batch },
      ],
    },
    (err, data) => {
        cb(data)
    }
  );
};

//function check major minor
function checkMajorMinor(duration) {
  if (duration  > (major_minor_duration * 60) ) {
    return "major";
  } else {
    return "minor";
  }
}
module.exports.Project = Project;
module.exports.updateStopData = updateStopData;
module.exports.addShiftData = addShiftData;
module.exports.addMachineData = addMachineData;
module.exports.batchEnd = batchEnd;
module.exports.updateGoodCount = updateGoodCount;
module.exports.updateBpmAndMode = updateMaxBpm;
