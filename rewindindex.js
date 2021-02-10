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
var { getCondition, updateCondition, Condition} = require("./model/status.model");
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
var { updateChangeOver,pushAndUpdateChangeover,updatePowerOff,getIsNullTrue } = require("./model/changeover.model");
var {updateConnection} = require('./model/connection.model')
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
var trend = require("./controller/trend.controller.js");
var Changeovermaster = require("./controller/changeovermaster.controller");
var fgex = require("./controller/fgex.controller");
var Threshhold = require("./controller/threshold.controller");
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
const machine_state_obj = {};
var plc_timestamp = new Date();
var plc_status = true;

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
//thing array
const things = ["C1", "C2", "C3","C4","C5","C6","C7","C8","C9","C10","C11"];
//thing map with database machine name
var machine_obj = {
    C1: "siapi/f",
    C2: "And_Or",
    C3: "Inkjet/leaktester",
    C4:"RinseFillCap",
    C5:"Induction",
    C6:"AveGlue/newtech",
    C7:"Stack",
    C8:"Outer_Capper",
    C9:"TMGCP",
    C10:"Weigher",
    C11:"Palletizer/palletID",
};
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
app.use("/api/trend", trend);
app.use("/api/changeovermaster", Changeovermaster);
app.use("/api/fgex", fgex);
app.use("/api/threshold",Threshhold);
//get
async function processFunction(data) {
  var current_batch = await getCurrentBatch();
  batch = current_batch._id;
  fgex = current_batch.product_name;
  //console.log(batch);
  if (thing_data_map.hasOwnProperty("C1")) {
    //console.log(thing_data_map.hasOwnProperty("CAM1"));
    //console.log(global.changeSkuManualEntry)
    var data = await CurrentShift();
    var pre_shift = await preShift(critical_machine, line_id);
    var shift = data.shift;
    var d = data.date;
    //console.log(shift,d,pre_shift,thing_data_map)
    operator_name = await indexoperatorid(d, shift);
    var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
    var mode = 1;
      if (!thing_data_map.C1.C1_Siapi_Mode) {
        mode = 0;
      }
  
      var rcount1 = thing_data_map.C1.C1_Siapi_InfeedPreformCount - thing_data_map.C1.C1_Siapi_PreformLoadCount;
      var rcount2 = thing_data_map.C1.C1_Siapi_PreformLoadCount - thing_data_map.C1.C1_Siapi_OutfeedBottleCount;
      var rcount = rcount1 + rcount2;
    //when shift change
    if (shift != pre_shift) {
      updateShiftPosition(d);
      if (pre_shift == date_change_shift) {
        var date = moment().local().subtract(1, "days").startOf("day").format();
        var split = date.split("+");
        d = split[0] + "+00:00";
      }
      addstop(
        "siapi",
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        0,
        false,
        false,
        false,
        pre_shift,
        line_id,
        d,
        timestamp
      );
      goodCount(
        thing_data_map.C1.C1_Siapi_OutfeedBottleCount,
        rcount,
        machine_obj["C1"],
        thing_data_map.C1.C1_Siapi_InfeedPreformBPM,
        mode,
        shift,
        batch,
        data.date,
        line_id
      );
      return;
    }
    //when no shift change
    var wait1 = false;
    var blocked1 = false;
    if (
      thing_data_map.C1.C1_Siapi_OutfeedBlocked ||
      thing_data_map.C1.C1_Siapi_OutfeedFull
    ) {
      blocked1 = true;
    }
    if (
      (thing_data_map.C1.C1_Siapi_InfeedLackTime > 16 || thing_data_map.C1.C1_Siapi_TrackEmpty) &&
      thing_data_map.C1.C1_Siapi_SignalGreen
    ) {
      wait1 = true;
    }
    addstop(
        "siapi",
        false,
        global.changeSkuManualEntry,
        false,
        false,//!thing_data_map.CAM1.INTAS_CAM1_PowerON,
        stop,
        blocked1,
        wait1,
        0,
        thing_data_map.CAM1.C1_Siapi_GreenBlinking,
        false,
        true,
        shift,
        line_id,
        d,
        timestamp
    );
    goodCount(
        thing_data_map.C1.C1_Siapi_OutfeedBottleCount,
        rcount,
      "siapi",
      thing_data_map.C1.C1_Siapi_InfeedPreformBPM,
      mode,
      shift,
      batch,
      d,
      line_id
    );
    if (!thing_data_map.C1.isConnected) {
      updateConnection("ipc_error", "siapi",line_id);
      return;
    }
    if ((plc_status ^ thing_data_map.C1.C1_Siapi_Watchdog) == 1) {
      plc_timestamp = new Date();
      plc_status = thing_data_map.C1.C1_Siapi_Watchdog;
    }
    if (new Date() - plc_timestamp > 30000) {
      updateConnection("plc_error", "siapi",line_id);
      return;
    }
    updateConnection("ok", "siapi",line_id);
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
  //updateChangeOver('automatic')
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

      });
      pushAndUpdateChangeover(shift,operator_name,d,()=>{
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
  //if batch will change
  if (temp.currnt_batch.toString() != batch) {
    var shift_good = good_count - temp.shift_start_good_count;
    var shift_reject = reject_count - temp.shift_start_reject_count;
    //console.log(shift_reject)
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
  //if count is greater than 500 OR changover global is false
  if (
    (!global.changeSkuManualEntry ||
      good_count - temp.shift_start_good_count > changeover_force_stop_count) &&
    temp.changeover_mode
  ) {
    var changeover_reject = reject_count - temp.shift_start_reject_count;
    console.log(temp.changeover_mode,global.changeSkuManualEntry,"From here",changeover_reject);
    if(good_count - temp.shift_start_good_count > changeover_force_stop_count){
      updateChangeOver('automatic',(data)=>{
		
      }) 
     }
    updateStartupReject(
      line_id,
      d,
      shift,
      batch,
      machine,
      changeover_reject,
      () => {
        
      }
    );
    global.changeSkuManualEntry = false;
    temp.changeover_mode = false;
    temp.shift_start_reject_count = reject_count;
    temp.current_good_value = good_count;
    temp.current_reject_value = reject_count;
    temp.bpm = bpm;
    temp.mode = mode;
    temp.save();
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
    updt,
    changeover,
    not_used,
    pdt,
    non_zero(stop),
    manual_stop,
    blocked,
    non_zero(waiting),
    execution,
    ready,
  ]);
  //console.log(current);
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
  //console.log(machine_state_obj[machine])
  //if state change
  if (current != machine_state_obj[machine].condition) {
      //if poweroff b/w changeover
    var diff = moment(timestamp).diff(moment(condition.last_update), "seconds");
    if(machine_state_obj[machine].condition == 'updt' && global.changeSkuManualEntry){
      updatePowerOff(shift,diff,d)
    }
    machine_state_obj[machine].condition = current;
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
    postStop(machine, code, timestamp, line_id, shift, batch, fgex,d);
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
  "updt",
  "changeover",
  "not_used",
  "pdt",
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
  var state = await Condition.find({});
  var getchangeoverstatus = await getIsNullTrue();
  if(getchangeoverstatus){
    global.changeSkuManualEntry = true;
  }
  //console.log(state)
  state.forEach((element) => {
    machine_state_obj[element.machine] = machine_state_obj[element.machine] || {};
    machine_state_obj[element.machine]["condition"] = element.condition;
    // if (element.condition == "changeover" && element.machine == critical_machine) {
    //   global.changeSkuManualEntry = true;
    // }
  });
}

//function execute on page re
onPageRefresh();
app.listen(process.env.PORT, () => {
  console.log(`App is connected ${process.env.PORT}`);
});
