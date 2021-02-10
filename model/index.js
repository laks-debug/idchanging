const request = require("request");
const dotenv = require("dotenv");
const logger = require("morgan");
const helmet = require("helmet");
const express = require("express");
var moment = require("moment");
var mongoose = require("mongoose");
var cors = require("cors");
var {
  updateStopData,
  addLineData,
  addShiftData,
  addMachineData,
  updateGoodCount,
  updateMaxBpm,
  batchEnd,
  updateStartupReject,
} = require("./model/project.model");
var { getCondition, updateCondition } = require("./model/status.model");
var { CurrentShift, updateShiftPosition } = require("./model/shift.model");
var {
  frequentGoodUpdate,
  getTempGood,
  preShift,
  updateChangeoverMode,
} = require("./model/goodTemp.model");
var { postStop, updateStop, updateLast, Stop } = require("./model/stop.model");
var { getCurrentBatch } = require("./model/batch.model");
var { getshiftWiseRoster, indexoperatorid } = require("./model/roster.model");
var { updateAlarm, updateAlarmStatus } = require("./model/alarm.model");
//api controller
var shift = require("./controller/shift.controller");
var sku = require("./controller/sku.controller");
var stop = require("./controller/stops.controller");
var connection = require("./controller/connection.controller");
var manual = require("./controller/manualEntry.controller");
var alarm = require("./controller/alarm.controller");
var Changeover = require("./controller/changeover.controller");
var type = require("./controller/type.controller");
var report = require("./controller/report.controller");
var Changeovermaster = require("./controller/changeovermaster.controller");
var fgex = require("./controller/fgex.controller");
//global variable
const thing_data_map = {};
var line_id = "5f0809fdc2b1ce30cc53eb8d";
var operator_name;
var batch;
var fgex;
var date_change_shift = "Shift C";
var critical_machine = "cam_blister";
var changeover_force_stop_count = 500;
global.changeSkuManualEntry = false;

//express app
const app = express();

// Load environment variables from.env file, where API keys and passwords are configured.
dotenv.config({ path: "./.env" });

// Mongoose options
const mongoose_options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
};
mongoose
  .connect(process.env.MONGODB_OFFLINE_DB, mongoose_options)
  .then((connected) => console.log(`Database connection established`))
  .catch((err) =>
    console.error(
      `There was an error connecting to database, the err is ${err}`
    )
  );
//app
app.use(helmet());
//app.use(logger("dev"));

//thing array
const things = ["CAM1"];

//header for request
var header = {
  "content-type": "application/json",
  appKey: process.env.thingworx_appKey,
  Accept: "application/json",
};

//api
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.use(cors());
app.use("/api/shift", shift);
app.use("/api/sku", sku);
app.use("/api/stops", stop);
app.use("/api/connection", connection);
app.use("/api/manual", manual);
app.use("/api/alarm", alarm);
app.use("/api/report", report);
app.use("/api/changeover", Changeover);
app.use("/api/type", type);
app.use("/api/changeovermaster", Changeovermaster);
app.use("/api/fgex", fgex);
//get
async function processFunction(data) {
  var current_batch = await getCurrentBatch();
  batch = current_batch._id;
  fgex = current_batch.product_name;
  //console.log(batch);
  if (thing_data_map.hasOwnProperty("CAM1")) {
    var data = await CurrentShift();
    var pre_shift = await preShift(critical_machine, line_id);
    var shift = data.shift;
    var d = data.date;
    //console.log(shift,d,pre_shift,thing_data_map)
    operator_name = await indexoperatorid(d, shift);
    var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
    var mode = 1;
    var mode_obj = {
      1: thing_data_map.CAM1.INTAS_CAM1_StackGreen,
      2: thing_data_map.CAM1.INTAS_CAM1_IdleMode,
      3: global.changeSkuManualEntry,
    };
    var stop = 0;
    if (
      thing_data_map.CAM1.INTAS_CAM1_StackRed &&
      !thing_data_map.CAM1.INTAS_CAM1_LidMaterialEnd &&
      !thing_data_map.CAM1.INTAS_CAM1_FormFilmEnd
    ) {
      if (thing_data_map.CAM1.INTAS_CAM1_FirstFault > 0) {
        stop = thing_data_map.CAM1.INTAS_CAM1_FirstFault;
      } else {
        stop = 21;
      }
    }
    var waiting_obj = {
      0: false,
      1: thing_data_map.CAM1.INTAS_CAM1_LidMaterialEnd,
      2: thing_data_map.CAM1.INTAS_CAM1_FormFilmEnds,
    };
    var mode = object_filter(mode_obj);
    var wait = object_filter(waiting_obj);
    //when shift change
    if (shift != pre_shift) {
      updateShiftPosition(d);
      if (pre_shift == date_change_shift) {
        var date = moment().local().subtract(1, "days").startOf("day").format();
        var split = date.split("+");
        d = split[0] + "+00:00";
      }
      addstop(
        "cam_blister",
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        0,
        false,
        false,
        true,
        pre_shift,
        line_id,
        d,
        timestamp
      );
      goodCount(
        thing_data_map.CAM1.INTAS_CAM1_GoodCount,
        thing_data_map.CAM1.INTAS_CAM1_RejectCount1,
        "cam_blister",
        thing_data_map.CAM1.INTAS_CAM1_CycleBPM,
        mode,
        shift,
        batch,
        data.date,
        line_id
      );
      return;
    }
    //when no shift change
    addstop(
      "cam_blister",
      false,
      global.changeSkuManualEntry,
      false,
      !thing_data_map.CAM1.INTAS_CAM1_PowerON,
      stop,
      thing_data_map.CAM1.INTAS_CAM1_OrangeBlinking,
      wait,
      thing_data_map.CAM1.INTAS_CAM1_FaultWarningScroll,
      thing_data_map.CAM1.INTAS_CAM1_ManualMode,
      thing_data_map.CAM1.INTAS_CAM1_StackGreen,
      true,
      shift,
      line_id,
      d,
      timestamp
    );
    goodCount(
      thing_data_map.CAM1.INTAS_CAM1_GoodCount,
      thing_data_map.CAM1.INTAS_CAM1_RejectCount1,
      "cam_blister",
      thing_data_map.CAM1.INTAS_CAM1_CycleBPM,
      mode,
      shift,
      batch,
      d,
      line_id
    );
  }
}

// function for good count
async function goodCount(
  good_count,
  reject_count,
  machine,
  bpm,
  mode,
  shift,
  batch,
  d,
  line_id
) {
  var temp = await getTempGood(
    machine,
    line_id,
    shift,
    batch,
    good_count,
    reject_count
  );
  var reset_counter = temp.current_good_value * 0.5;
  var date = d;
  //shift change all changes
  if (temp.current_shift != shift) {
    var pre_shift = temp.current_shift;
    if (pre_shift == date_change_shift) {
      var date = moment().local().subtract(1, "days").startOf("day").format();
      var split = date.split("+");
      date = split[0] + "+00:00";
    }
    var shift_good = good_count - temp.shift_start_good_count;
    var shift_reject;
    if(!temp.changeover_mode){
      shift_reject = reject_count - temp.shift_start_reject_count
    }else{
      shift_reject = 0;
      var changover_reject = reject_count - temp.shift_start_reject_count;
      updateStartupReject(line_id,date,pre_shift,batch,machine,changover_reject,()=>{
        
      })
    }
    updateGoodCount(
      line_id,
      date,
      pre_shift,
      batch,
      machine,
      shift_good,
      shift_reject,
      () => {
        batchEnd(line_id, date, pre_shift, () => {
          frequentGoodUpdate(machine, line_id, {
            shift_start_good_count: good_count,
            shift_start_reject_count: reject_count,
            current_good_value: good_count,
            current_reject_value: reject_count,
            current_shift: shift,
          });
          addMachineData(
            line_id,
            d,
            shift,
            operator_name,
            batch,
            machine,
            () => {
              //can do operation after shift end process
            }
          );
        });
      }
    );
    return;
  }
  //if count is greater than 500 OR changover global is false
  if (
    (!global.changeSkuManualEntry ||
      good_count - temp.shift_start_good_count > changeover_force_stop_count) &&
    temp.changeover_mode
  ) {
    var changeover_reject = reject_count - temp.shift_start_reject_count;
    updateStartupReject(
      line_id,
      d,
      shift,
      batch,
      machine,
      changeover_reject,
      () => {
        global.changeSkuManualEntry = false;
        temp.changeover_mode = false;
        temp.temp.shift_start_reject_count = reject_count;
        temp.current_good_value = good_count;
        temp.current_reject_value = reject_count;
        (temp.bpm = bpm), (temp.mode = mode), temp.save();
      }
    );
    return;
  }
  //if batch will change
  if (temp.currnt_batch.toString() != batch) {
    var shift_good = good_count - temp.shift_start_good_count;
    var shift_reject = reject_count - temp.shift_start_reject_count;
    updateGoodCount(
      line_id,
      date,
      shift,
      temp.currnt_batch,
      machine,
      shift_good,
      shift_reject,
      () => {
        frequentGoodUpdate(machine, line_id, {
          shift_start_good_count: good_count,
          shift_start_reject_count: reject_count,
          current_good_value: good_count,
          current_reject_value: reject_count,
          currnt_batch: batch,
        });
        addMachineData(line_id, d, shift, operator_name, batch, machine, () => {
          //can do operation after batch end process
        });
      }
    );
    return;
  }
  //check for max bpm
  if (bpm > temp.bpm) {
    updateMaxBpm(
      line_id,
      d,
      shift,
      operator_name,
      batch,
      machine,
      bpm,
      () => {}
    );
  }
  //if plc value get reset
  if (good_count < reset_counter) {
    return;
  }

  frequentGoodUpdate(machine, line_id, {
    bpm: bpm,
    mode: mode,
    current_good_value: good_count,
    current_reject_value: reject_count,
  });
}
//add stop function
async function addstop(
  machine,
  not_used,
  changeover,
  pdt,
  updt,
  stop,
  blocked,
  waiting,
  alarm,
  manual_stop,
  execution,
  ready,
  shift,
  line_id,
  d,
  timestamp
) {
  // console.log(
  //   machine,
  //   not_used,
  //   changeover,
  //   pdt,
  //   updt,
  //   stop,
  //   blocked,
  //   waiting,
  //   alarm,
  //   manual_stop,
  //   ready,
  //   shift,
  //   line_id,
  //   d,
  //   timestamp
  // )
  var code;
  var current = preference([
    changeover,
    not_used,
    pdt,
    updt,
    non_zero(stop),
    manual_stop,
    blocked,
    non_zero(waiting),
    execution,
    ready,
  ]);
  if (current == "fault") {
    code = `fault_${stop}`;
  } else if (current == "waiting" && typeof waiting == "number") {
    code = `waiting_${waiting}`;
  } else {
    code = current;
  }
  var condition = await getCondition(
    machine,
    line_id,
    d,
    shift,
    operator_name,
    batch
  );
  // console.log(stop)
  //if any alarm
  if (alarm > 0) {
    updateAlarm(machine, line_id, stop, alarm);
  } else {
    updateAlarmStatus(machine, line_id);
  }
  //if state change
  if (current != condition.condition) {
    var diff = moment(timestamp).diff(moment(condition.last_update), "seconds");
    //console.log(diff)
    updateStopData(
      line_id,
      d,
      shift,
      machine,
      condition.condition,
      condition.code,
      diff,
      (data) => {
        //console.log(data);
      }
    );
    postStop(machine, code, timestamp, line_id, shift, batch, fgex);
    updateCondition(machine, line_id, current, timestamp, code, (err, data) => {
      //console.log(data);
    });
  }
}
//get thingdata from thingworx
async function getThingData(thing) {
  const result = await new Promise((resolve, reject) => {
    request.get(
      {
        url: `http://103.205.66.170:8082/Thingworx/Things/${thing}/Properties/`,
        headers: header,
      },
      (error, response, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(JSON.parse(data).rows[0]);
        }
      }
    );
  });

  return result;
}
//api data map

async function update_thing_data(thing) {
  try {
    const data = await getThingData(thing);
    thing_data_map[thing] = data;
  } catch (err) {
    console.log("error thing", thing, err);
    return;
  }
}

//check value with status
function non_zero(value) {
  var status;
  if (value == 0 || false) {
    status = false;
  } else {
    status = true;
  }
  return status;
}
// make a API call every 7 seconds
const interval = 7 * 1000;
setInterval(() => {
  things.forEach(async (thing, i) => {
    update_thing_data(thing);
    if (i + 1 == things.length) {
      processFunction();
    }
  });
}, interval);

// object filter
function object_filter(obj) {
  var keys = Object.keys(obj);
  var true_filter = keys.filter((key) => {
    return obj[key];
  });
  var result = 0;
  true_filter.forEach((element) => {
    if (Number(element) != 0) {
      result = Number(element);
    }
  });
  return result;
}

//give stop preference

var arr = [
  "changeover",
  "not_used",
  "pdt",
  "updt",
  "fault",
  "manual_stop",
  "blocked",
  "waiting",
  "executing",
  "ready",
];

function preference(array) {
  var return_value;
  var r_data = array.findIndex((data) => {
    return data == true;
  });
  if (r_data == -1) {
    return_value = "ready";
  } else {
    return_value = arr[r_data];
  }
  return return_value;
}

async function onPageRefresh() {
  var condition = await getCondition(critical_machine, line_id);
  console.log();
  if (condition.condition == "changeover") {
    global.changeSkuManualEntry = true;
  }
}
//function execute on page re
onPageRefresh();
app.listen(process.env.PORT, () => {
  console.log(`App is connected ${process.env.PORT}`);
});
