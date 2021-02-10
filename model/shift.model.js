var mongoose = require("mongoose");
var moment = require("moment");
var shiftSchema = new mongoose.Schema({
  shiftName: {
    type: String,
    required: true
  },
  shiftStartTime: {
    type: Number,
    required: true
  },
  line_id:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'line'
  },
  position:{
    type:String
  },
  date:{
    type:Date
  },
  shiftEndTime: {
    type: Number,
    required: true
  }
});
var Shift = mongoose.model("Shift", shiftSchema);

var currentShift = async function() {
  var now = moment().local();
  var today = now.hour();
  var hour = today * 60 + now.minutes();
  var shift,currentShift, total_time, d, shiftStartTime, data;
  // check hour between shift start and end time
  shift = await Shift.findOne({
    shiftStartTime: { $lte: hour },
    shiftEndTime: { $gte: hour }
  });
  //hour is not between shift start and end time
  if (!shift) {
    shift = await Shift.findOne().$where(
      "this.shiftStartTime > this.shiftEndTime"
    );
    if (!shift) {
        const shift_arr = [
            {shiftName: "Shift A", shiftStartTime: 420, shiftEndTime: 900},
            {shiftName: "Shift B", shiftStartTime: 900, shiftEndTime: 1380},
            {shiftName: "Shift C", shiftStartTime: 1380, shiftEndTime: 420}
        ];
      var data = await Shift.insertMany(shift_arr);
      return;
    }
    current_shift = shift.shiftName;
    if (hour < shift.shiftEndTime) {
      var date = moment()
        .local()
        .subtract(1, "days")
        .startOf("day")
        .format();
      var split = date.split("+");
      d = split[0] + "+00:00";
      total_time = hour + 1440 - shift.shiftStartTime;
    } else {
      d = moment()
        .local()
        .utcOffset("+00:00")
        .startOf("day")
        .format();
      total_time = hour - shift.shiftStartTime;
    }
    data = {
      date: d,
      shift: current_shift,
      total_time: total_time,
      shiftStartTime: shift.shiftStartTime,
      shiftEndTime: shift.shiftEndTime
    };
    return data;
  }
  CurrentShift = shift.shiftName;
  d = moment()
    .local()
    .utcOffset("+00:00")
    .startOf("day")
    .format();
  total_time = hour - shift.shiftStartTime;
  data = {
    date: d,
    shift: CurrentShift,
    total_time: total_time,
    shiftStartTime: shift.shiftStartTime,
    shiftEndTime: shift.shiftEndTime
  };
  return data;
};

var updateShiftPosition = async function (date){
  var current = await Shift.findOne({position:'current'});
  var pre_shift = await Shift.findOne({position:'pre_shift'});
  var pre_pre_shift = await Shift.findOne({position:'pre_pre_shift'});
  current.position = 'pre_shift';
  pre_shift.position = 'pre_pre_shift';
  pre_pre_shift.position = 'current';
  pre_pre_shift.date = date;
  current.save();
  pre_shift.save();
  pre_pre_shift.save()
}

var validShift = async function(shiftStartTime, shiftEndTime) {
    console.log(shiftStartTime, shiftEndTime);
  var result;
  var shift = await Shift.findOne({
    $or: [
      {
        $and: [
          {
            shiftStartTime: {
              $lte: shiftStartTime
            }
          },
          {
            shiftEndTime: {
              $gte: shiftStartTime
            }
          }
        ]
      },
      {
        $and: [
          {
            shiftStartTime: {
              $lte: shiftEndTime
            }
          },
          {
            shiftEndTime: {
              $gte: shiftEndTime
            }
          }
        ]
      },
      {
        $and: [
          {
            shiftStartTime: {
              $gte: shiftStartTime
            }
          },
          {
            shiftEndTime: {
              $lte: shiftEndTime
            }
          }
        ]
      },
      {
        $and: [
          {
            shiftStartTime: {
              $gte: shiftStartTime
            }
          },
          {
            shiftEndTime: {
              $gte: shiftEndTime
            }
          },
          {
            $expr: { $gt: ["$shiftStartTime", "$shiftEndTime"] }
          }
        ]
      }
    ]
  });
  if (shift) {
    if (
      shiftStartTime <= shift.shiftStartTime &&
      shiftEndTime <= shift.shiftEndTime
    ) {
      result = true;
    } else {
      result = false;
    }
  } else {
    result = false;
  }
  return result;
};
module.exports.Shift = Shift;
module.exports.CurrentShift = currentShift;
module.exports.validShift = validShift;
module.exports.updateShiftPosition = updateShiftPosition;
