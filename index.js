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
var {Rawdata,datamaking} = require("./model/rawdata")
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
var raw = require("./controller/rawdata.controller");
//global variable
const thing_data_map = {};
var line_id = "5f0809fdc2b1ce30cc53eb8d";
var operator_name;
var batch;
var fgex;
var date_change_shift = "Shift C";
var critical_machine = "siapi";
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
// var machine_obj = {
//     C1: "siapi/f",
//     C2: "And_Or",
//     C3: "Inkjet/leaktester",
//     C4:"RinseFillCap",
//     C5:"Induction",
//     C6:"AveGlue/newtech",
//     C7:"Stack",
//     C8:"Outer_Capper",
//     C9:"TMGCP",
//     C10:"Weigher",
//     C11:"Palletizer/palletID",
// };
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
app.use("/api/raw",raw)
//get
async function processFunction(data) {
  var current_batch = await getCurrentBatch();
  batch = current_batch._id;
  //console.log(batch);
  fgex = current_batch.product_name;
  //console.log(batch);
  if (thing_data_map.hasOwnProperty("C1")) {
    //console.log(thing_data_map);
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

      var rcountrinser = thing_data_map.C4.C4_RinseFillCap_InfeedCount - thing_data_map.C4.C4_RinseFillCap_OutfeedCount;

      
    var gcountaveglue = thing_data_map.C6.C6_1_AveGlueLabelInfeedCount - thing_data_map.C7.C7_Inspect_StackFrontLabelCount;
    
    


    // datamaking("line_1",shift,thing_data_map.C4.C4_RinseFillCap_OutfeedCount,rcountrinser,"rise_filler")
    // datamaking("line_2",shift,thing_data_map.C1.C1_Siapi_OutfeedBottleCount,rcount,"siapi")
    // datamaking("line_1",shift,thing_data_map.C1.C1_Siapi_OutfeedBottleCount,rcount,"siapi")
    // datamaking("line_3",shift,thing_data_map.C5.C5_1_IndSealerInfeedCount, thing_data_map.C5.C5_1_WadRejectCount,"induction")
    // datamaking("line_4",shift,thing_data_map.C2.C2_AndOr_InfeedBottleCount, thing_data_map.C2.C2_AndOr_ExitRejectCount,"AndOr")
    // datamaking("line_5",shift,thing_data_map.C6.C6_1_AveGlueLabelInfeedCount, thing_data_map.C7.C7_Inspect_StackFrontLabelCount,"ave_glue")
    // datamaking("line_6",shift,thing_data_map.C6.C6_1_NewTechInfeedCount, thing_data_map.C7.C7_Inspect_StackFrontLabelCount,"new_tech_labeller")
    // datamaking("line_7",shift,thing_data_map.C11.C11_1_StretchWrapPalletCount, 0 ,"palletizer")
    // datamaking("line_2",shift,thing_data_map.C11.C11_1_StretchWrapPalletCount, 0 ,"palletizer")

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
        timestamp,
        gcount,
        rcount,

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
    var siapi_execution = false;
    if (thing_data_map.C1.C1_Siapi_InfeedPreformBPM > 0) {
      siapi_execution = true
    }

    addstop(
        "siapi",
        false,
        global.changeSkuManualEntry,
        false,
        false,//!thing_data_map.CAM1.INTAS_CAM1_PowerON,
        thing_data_map.C1.C1_Siapi_SignalRed,
        blocked1,
        wait1,
        0,
        thing_data_map.C1.C1_Siapi_GreenBlinking,
        siapi_execution,
        true,
        shift,
        "line_1",
        d,
        timestamp,
        thing_data_map.C1.C1_Siapi_OutfeedBottleCount,
        rcount,
    );

    //riser filler 

    var stop_obj = {
      0: true,
      1: thing_data_map.C4.C4_RinseFillCap_SignalRed,
      2: thing_data_map.C4.C4_RinseFillCap_BabyTankOilLevelLow
    };
    var stoprinser = object_filter(stop_obj);
    //console.log(stoprinser);
    var wait_obj = {
      0: true,
      1: thing_data_map.C4.C4_RinseFillCap_InfeedStarve,
      2: thing_data_map.C4.C4_RinseFillCap_ChuteCapLack
    };
    var waitr = 0;
    var wait_res = object_filter(wait_obj);
    if (
      wait_res > 0 &&
      thing_data_map.C4.C4_RinseFillCap_SignalGreen
    ) {
      waitr = wait_res;
    }

    var rinser_execution = false;
    if (thing_data_map.C1.C1_Siapi_InfeedPreformBPM > 0) {
      rinser_execution = true
    }
    addstop(
      "rinse_fillcap",
      false,
      global.changeSkuManualEntry,
      false,
      false,
      stoprinser,
      thing_data_map.C4.C4_RinseFillCap_OutfeedBlocked,
      waitr,
      0,
      false,
      rinser_execution,
      thing_data_map.C4.C4_RinseFillCap_SignalGreen,
      shift,
      "line_2",
      d,
      timestamp,
      thing_data_map.C4.C4_RinseFillCap_OutfeedCount,
      rcountrinser,
    );

    //////////////////induction
    var stop_obj = {
      0: true,
      1: thing_data_map.C5.C5_1_IndSealerSignalRed,
      2: thing_data_map.C5.C5_1_WadTransferPlateFallenBottle
    };
    var stopind = object_filter(stop_obj);

    var ind_execution = false;
    if (thing_data_map.C1.C1_Siapi_InfeedPreformBPM > 0) {
      ind_execution = true
    }

    addstop(
      "induction",
      false,
      global.changeSkuManualEntry,
      false,
      false,
      stopind,
      false,
      0,
      0,
      false,
      ind_execution,
      thing_data_map.C5.C5_1_IndSealerSignalGreen,
      shift,
      "line_3",
      d,
      timestamp,
      thing_data_map.C5.C5_1_IndSealerInfeedCount,
      thing_data_map.C5.C5_1_WadRejectCount,
    );

    //avle glue
    var waitave = false;
    var stopave = false;
    if (
      thing_data_map.C6.C6_1_AveGlueLabelSignalGreen &&
      thing_data_map.C6.C6_1_AveGlueLabelBottleStarve
    ) {
      waitave = true;
    }
    if (thing_data_map.C6.C6_1_AveGlueLabelSignalRed && !thing_data_map.C6.C6_1_AveGlueRedBlinking) {
      stopave = true
    }

    var ave_execution = false;
    if (thing_data_map.C1.C1_Siapi_InfeedPreformBPM > 0) {
      ave_execution = true
    }

    addstop(
     "aveglue",
      false,
      global.changeSkuManualEntry,
      false,
      false,
      stopave,
      false,
      waitave,
      0,
      false,
      ave_execution,
      thing_data_map.C6.C6_1_AveGlueLabelSignalGreen,
      shift,
      "line_4",
      d,
      timestamp,
      gcountaveglue,
      thing_data_map.C7.C7_Inspect_StackFrontLabelCount,
    );
    var pall_execution = false;
    if (thing_data_map.C1.C11_1_StretchWrapBPM > 0) {
      pall_execution = true
    }
  
    addstop(
      "palletizer",
       false,
       global.changeSkuManualEntry,
       false,
       false,
       false,
       thing_data_map.C11.C11_1_StretchWrapOutfeedBlocked,
       waitave,
       0,
       false,
       pall_execution,
       true,
       shift,
       "line_1",
       d,
       timestamp,
       thing_data_map.C11.C11_1_StretchWrapPalletCount,
       0,
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
  timestamp,
  gcount,
  rcount,
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
  //   execution,
  //   ready,
  //   shift,
  //   line_id,
  //   d,
  //   timestamp,
  // gcount,
  // rcount,
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
  //console.log(alarm,line_id,d,current,machine,"curent method");
  var code = 0
  var mode = 1
  var bpm =  20
 datamaking(line_id,shift,gcount,rcount,machine,current,d,timestamp,code,alarm,mode,bpm)
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
var lines = ["line_1","line_4","line_3","line_2",]
function random_item(items) {

  return items[Math.floor(Math.random() * items.length)];

}

//function execute on page re
//onPageRefresh();
app.listen(process.env.PORT, () => {
  console.log(`App is connected ${process.env.PORT}`);
});
