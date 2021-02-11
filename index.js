const request = require("request");
const dotenv = require("dotenv");
const logger = require("morgan");
const helmet = require("helmet");
const express = require("express");
var moment = require("moment");
var mongoose = require("mongoose");
var cors = require("cors");

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
  
}

// function for good count

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
  //   execution,
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
const interval = 6 * 1000;
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
