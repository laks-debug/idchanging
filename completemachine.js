const request = require("request");
const dotenv = require("dotenv");
//const logger = require("morgan");
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
  updateBpmAndMode,
  batchEnd,
} = require("./model/project.model");
var { getCondition, updateCondition } = require("./model/status.model");
var { CurrentShift } = require("./model/shift.model");
var {
  frequentGoodUpdate,
  getTempGood,
  preShift,
} = require("./model/goodTemp.model");
var { postStop, updateStop, updateLast, Stop } = require("./model/stop.model");
//var { updateAlarm,updateAlarmStatus } = require("./model/alarm.model");
//var { getCurrentBatch } = require("./model/batch.model");
//var { getshiftWiseRoster, indexoperatorid } = require("./model/roster.model");
//api controller
var shift = require("./controller/shift.controller");
//var sku = require("./controller/sku.controller");
//var stop = require("./controller/stops.controller");
//var connection = require("./controller/connection.controller");
//var manual = require("./controller/manualEntry.controller");
//var alarm = require("./controller/alarm.controller");
//var Changeover = require("./controller/changeover.controller");
//var type = require("./controller/type.controller");
//var report = require("./controller/report.controller");
//global variable
const thing_data_map = {};
var line_id = "5e54a412ddf58e3866836970";
var line_obj = {
  AVOD:'5e54a412ddf58e3866836970',
  
}
var operator_name = "5e54a412ddf58e3866836970";
var date_change_shift = "Shift A";
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
// app.use("/api/sku", sku);
// app.use("/api/stops", stop);
// app.use("/api/connection", connection);
// app.use("/api/manual", manual);
//app.use("/api/alarm", alarm);
// app.use("/api/report", report);
// app.use("/api/changeover", Changeover);
// app.use("/api/type", type);
//get
async function processFunction() {
  var data = await CurrentShift();
  var shift = data.shift;
  var d = data.date;
  var pre_shift = await preShift(process.env.critical_machine, line_obj["AVOD"], shift, d);
  var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
  // addShiftData(line_obj["HULRaj1"], d, shift, operator_name, () => { });
  // addShiftData(line_obj["HULRaj2"], d, shift, operator_name, () => { });
  // addShiftData(line_obj["HULHFal2"], d, shift, operator_name, () => { });
  // when shift change
  if (thing_data_map.hasOwnProperty(things[0])) {
    var mode = 1;
    if (!thing_data_map.C1.C1_Siapi_Mode) {
      mode = 0;
    }

    var rcount1 = thing_data_map.C1.C1_Siapi_InfeedPreformCount - thing_data_map.C1.C1_Siapi_PreformLoadCount;
    var rcount2 = thing_data_map.C1.C1_Siapi_PreformLoadCount - thing_data_map.C1.C1_Siapi_OutfeedBottleCount;
    var rcount = rcount1 + rcount2;

    var rcountrinser = thing_data_map.C4.C4_RinseFillCap_InfeedCount - thing_data_map.C4.C4_RinseFillCap_OutfeedCount;

    var gcountaveglue = thing_data_map.C6.C6_1_AveGlueLabelInfeedCount - thing_data_map.C7.C7_Inspect_StackFrontLabelCount;
    var gcountnewtech = thing_data_map.C6.C6_1_NewTechInfeedCount - thing_data_map.C7.C7_Inspect_StackFrontLabelCount;

    var gcountandor = thing_data_map.C2.C2_AndOr_InfeedBottleCount - thing_data_map.C2.C2_AndOr_ExitRejectCount - thing_data_map.C7.C7_Inspect_StackHandleCount;
    var rcountandor = thing_data_map.C2.C2_AndOr_ExitRejectCount + thing_data_map.C7.C7_Inspect_StackHandleCount;
    var gcountoutercapper = thing_data_map.C8.C8_1_OverCapperInfeedCount - thing_data_map.C8.C8_1_OverCapperMissingOverCapCount;
    var gcountweigher = thing_data_map.C10.C10_1_CWeigherInfeedCount - thing_data_map.C10.C10_1_CWeigherRejectCount;

    var gcountinkjet = thing_data_map.C2.C2_AndOr_InfeedBottleCount - thing_data_map.C2.C2_AndOr_ExitRejectCount;
    var gcountleaktester = thing_data_map.C3.C3_1_LeakDetectInfeedCount - thing_data_map.C3.C3_1_LeakDetectRejectCount;



    //check shift in database
    if (
      shift != pre_shift.pre_shift ||
      moment(d).diff(moment(pre_shift.date), "days") > 0
    ) {
      if (pre_shift == date_change_shift) {
        var date = moment()
          .local()
          .subtract(1, "days")
          .startOf("day")
          .format();
        var split = date.split("+");
        d = split[0] + "+00:00";
      }
      things.forEach((element) => {
        addstop(
          machine_obj[element],
          false,
          false,
          false,
          false,
          0,
          false,
          0,
          0,
          false,
          true,
          p_shift,
          line_obj["AVOD"],
          d,
          timeStamp,
        );
      });
      //saipi machine
      goodCount(
        thing_data_map.C1.C1_Siapi_OutfeedBottleCount,
        rcount,
        machine_obj["C1"],
        thing_data_map.C1.C1_Siapi_InfeedPreformBPM,
        mode,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //rinser filler
      goodCount(
        thing_data_map.C4.C4_RinseFillCap_OutfeedCount,
        rcountrinser,
        machine_obj["C4"],
        thing_data_map.C4.C4_RinseFillCap_InfeedBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //induction
      goodCount(
        thing_data_map.C5.C5_1_IndSealerInfeedCount,
        thing_data_map.C5.C5_1_WadRejectCount,
        machine_obj["C5"],
        thing_data_map.C5.C5_1_IndSealeInfeedBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //avle glue
      goodCount(
        gcountaveglue,
        thing_data_map.C7.C7_Inspect_StackFrontLabelCount,
        machine_obj["C6"],
        thing_data_map.C6.C6_1_AveGlueLabelInfeedBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //new tech
      goodCount(
        gcountnewtech,
        thing_data_map.C7.C7_Inspect_StackFrontLabelCount,
        machine_obj["C6"],
        thing_data_map.C6.C6_1_NewTechInfeedBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //pallatizer
      goodCount(
        thing_data_map.C11.C11_1_StretchWrapPalletCount,
        0,
        machine_obj["C11"],
        thing_data_map.C11.C11_1_StretchWrapBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //palletid
      goodCount(
        thing_data_map.C11.C11_1_IDmachineCount,
        0,
        machine_obj["C11"],
        thing_data_map.C11.C11_1_IDmachineBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //tmgc
      goodCount(
        thing_data_map.C9.C9_TMGCP_CaseCount,
        0,
        machine_obj["C9"],
        thing_data_map.C9.C9_TMGCP_CasePM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //andor
      goodCount(
        gcountandor,
        rcountandor,
        machine_obj["C2"],
        thing_data_map.C2.C2_AndOr_InfeedBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //outercapper
      goodCount(
        gcountoutercapper,
        thing_data_map.C8.C8_1_OverCapperMissingOverCapCount,
        machine_obj["C2"],
        thing_data_map.C8.C8_1_OverCapperInfeeBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //weigher
      goodCount(
        gcountweigher,
        thing_data_map.C10.C10_1_CWeigherRejectCount,
        machine_obj["C10"],
        thing_data_map.C10.C10_1_SealerCaseBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //inkjet

      goodCount(
        gcountinkjet,
        thing_data_map.C7.C7_Inspect_StackDateCount,
        machine_obj["C3"],
        0,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      //leaktester
      goodCount(
        gcountleaktester,
        thing_data_map.C3.C3_1_LeakDetectRejectCount,
        machine_obj["C3"],
        thing_data_map.C3.C3_1_LeakDetectBPM,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      ///////////conveyer data 
      goodCount(
        0,
        0,
        machine_obj["C1"],
        0,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
      return;
    }

    //when no shift change
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    //c1 siapi 1 wait

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
    ////
    //siapi
    addstop(
      machine_obj["C1"],
      false,
      false,
      false,
      false,
      thing_data_map.C1.C1_Siapi_SignalRed,
      blocked1,
      wait1,
      0,
      thing_data_map.C1.C1_Siapi_GreenBlinking,
      true,
      shift,
      line_obj["AVOD"],
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
      data.date,
      line_obj["AVOD"],
    );
    //riser filler 

    var stop_obj = {
      0: true,
      1: thing_data_map.C4.C4_RinseFillCap_SignalRed,
      2: thing_data_map.C4.C4_RinseFillCap_BabyTankOilLevelLow
    };
    var stoprinser = object_filter(stop_obj);
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
    addstop(
      machine_obj["C4"],
      false,
      false,
      false,
      false,
      stoprinser,
      thing_data_map.C4.C4_RinseFillCap_OutfeedBlocked,
      waitr,
      0,
      false,
      thing_data_map.C4.C4_RinseFillCap_SignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );
    goodCount(
      thing_data_map.C4.C4_RinseFillCap_OutfeedCount,
      rcountrinser,
      machine_obj["C4"],
      thing_data_map.C4.C4_RinseFillCap_InfeedBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );

    //////////////////induction
    var stop_obj = {
      0: true,
      1: thing_data_map.C5.C5_1_IndSealerSignalRed,
      2: thing_data_map.C5.C5_1_WadTransferPlateFallenBottle
    };
    var stopind = object_filter(stop_obj);

    addstop(
      machine_obj["C5"],
      false,
      false,
      false,
      false,
      stopind,
      false,
      0,
      0,
      false,
      thing_data_map.C5.C5_1_IndSealerSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );
    goodCount(
      thing_data_map.C5.C5_1_IndSealerInfeedCount,
      thing_data_map.C5.C5_1_WadRejectCount,
      machine_obj["C5"],
      thing_data_map.C5.C5_1_IndSealeInfeedBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
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

    addstop(
      machine_obj["C6"],
      false,
      false,
      false,
      false,
      stopave,
      false,
      waitave,
      0,
      false,
      thing_data_map.C6.C6_1_AveGlueLabelSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );

    goodCount(
      gcountaveglue,
      thing_data_map.C7.C7_Inspect_StackFrontLabelCount,
      machine_obj["C6"],
      thing_data_map.C6.C6_1_AveGlueLabelInfeedBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );

    //new tech
    var stop6 = false
    var wait6 = false
    if (
      thing_data_map.C6.C6_1_NewTechSignalGreen &&
      thing_data_map.C6.C6_1_NewTechBottleStarve
    ) {
      wait6 = true;
    }

    if (thing_data_map.C6.C6_1_NewTechSignalRed && !thing_data_map.C6.C6_1_NewTechRedBlinking) {
      stop6 = true
    }

    addstop(
      machine_obj["C6"],
      false,
      false,
      false,
      false,
      stop6,
      thing_data_map.C6.C6_1_NewTechOufeedBlocked,
      wait6,
      0,
      thing_data_map.C6.C6_1_NewTechManualStop,
      thing_data_map.C6.C6_1_NewTechSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );
    goodCount(
      gcountnewtech,
      thing_data_map.C7.C7_Inspect_StackFrontLabelCount,
      machine_obj["C6"],
      thing_data_map.C6.C6_1_NewTechInfeedBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );
    //palletizer 
    var stop_obj = {
      0: true,
      1: thing_data_map.C11.C11_1_PalletizerFallenCase1,
      2: thing_data_map.C11.C11_1_PalletizerFallenCase2,
      3: thing_data_map.C11.C11_1_PalletizerFallenCase3,
      //4: JSON.parse(body).rows[0].C11_1_IDmachineSignalRedOrange
    };
    var stop11 = object_filter(stop_obj);
    addstop(
      machine_obj["C11"],
      false,
      false,
      false,
      false,
      stop11,
      thing_data_map.C11.C11_1_StretchWrapOutfeedBlocked,
      0,
      0,
      false,
      thing_data_map.C11.C11_1_IDmachineSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );
    goodCount(
      thing_data_map.C11.C11_1_StretchWrapPalletCount,
      0,
      machine_obj["C11"],
      thing_data_map.C11.C11_1_StretchWrapBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );
    //pallet Id
    addstop(
      machine_obj["C11"],
      false,
      false,
      false,
      false,
      thing_data_map.C11.C11_1_IDmachineSignalRedOrange,
      false,
      0,
      0,
      false,
      thing_data_map.C11.C11_1_IDmachineSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );
    goodCount(
      thing_data_map.C11.C11_1_IDmachineCount,
      0,
      machine_obj["C11"],
      thing_data_map.C11.C11_1_IDmachineBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );

    //tmgc
    var wait9 = false;
    var stop9 = false;
    if (
      thing_data_map.C9.C9_TMGCP_InfeedBottleStarve &&
      thing_data_map.C9.C9_TMGCP_SignalGreen
    ) {
      wait9 = true;
    }
    if (thing_data_map.C9.C9_TMGCP_SignalRed && !thing_data_map.C9.C9_TMGCP_RedBlinking) {
      stop9 = true
    }
    var stop_obj = {
      0: true,
      1: stop1,
      2: thing_data_map.C9.C9_TMGCP_DoorSafteySense
    };
    var stoptmgc = object_filter(stop_obj);

    addstop(
      machine_obj["C9"],
      false,
      false,
      false,
      false,
      stoptmgc,
      thing_data_map.C9.C9_TMGCP_OutfeedBlocked,
      wait9,
      0,
      false,
      thing_data_map.C9.C9_TMGCP_SignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );

    goodCount(
      thing_data_map.C9.C9_TMGCP_CaseCount,
      0,
      machine_obj["C9"],
      thing_data_map.C9.C9_TMGCP_CasePM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );
    // and_or
    var wait_obj = {
      0: true,
      1:thing_data_map.C2.C2_AndOr_InfeedBottleStarve,
      2:thing_data_map.C2.C2_AndOr_FeedChuteHandleLack,
      3: thing_data_map.C2.C2_AndOr_HopperHandleLack
    };
    var wait2 = 0;
    var manual2 = false;
    if (thing_data_map.C2.C2_AndOr_SignalRed && !thing_data_map.C2.C2_AndOr_RedBlinking) {
      manual2 = true;
    }
    var wait_res = object_filter(wait_obj);
    if (wait_res > 0 && thing_data_map.C2.C2_AndOr_SignalGreen) {
      wait2 = wait_res;
    }
    var stop_obj = {
      0: true,
      1: thing_data_map.C2.C2_AndOr_RedBlinking,
      2: thing_data_map.C2.C2_AndOr_ExitFallenBottle2
    };
    var stop2 = object_filter(stop_obj);


    addstop(
      machine_obj["C2"],
      false,
      false,
      false,
      false,
      stop2,
      thing_data_map.C2.C2_AndOr_OutfeedBlocked,
      wait2,
      0,
      manual2,
      thing_data_map.C2.C2_AndOr_SignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );



    goodCount(
      gcountandor,
      rcountandor,
      machine_obj["C2"],
      thing_data_map.C2.C2_AndOr_InfeedBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );
    /////////outcapper

    var wait_obj = {
      0: true,
      1: thing_data_map.C8.C8_1_OverCapperChuteLackofCap,
      2: thing_data_map.C8.C8_1_OverCapperInfeedLack
    };
    var wait8 = 0;
    var wait_res = object_filter(wait_obj);
    if (wait_res > 0 && thing_data_map.C8.C8_1_OverCapperSignalGreen) {
      wait8 = wait_res;
    }
    var stop_obj = {
      0: true,
      3: thing_data_map.C8.C8_1_OverCapperHopperCapLow,
      5: !thing_data_map.C8.C8_1_OverCapperSignalGreen,
    };
    var stop8 = object_filter(stop_obj);

    addstop(
      machine_obj["C8"],
      false,
      false,
      false,
      false,
      stop8,
      thing_data_map.C8.C8_1_OverCapperOutfeedBlocked,
      wait8,
      0,
      false,
      thing_data_map.C8.C8_1_OverCapperSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );

    goodCount(
      gcountoutercapper,
      C8_1_OverCapperMissingOverCapCount,
      machine_obj["C2"],
      thing_data_map.C2.C8_1_OverCapperInfeeBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );

    /////weigher

    var stop_obj = {
      0: true,
      1: thing_data_map.C10.C10_1_CWeigherRejectBinFull,
    };
    var stop10 = object_filter(stop_obj);

    addstop(
      machine_obj["C10"],
      false,
      false,
      false,
      false,
      stop10,
      thing_data_map.C10.C10_1_CWeigherOutfeedBlocked,
      0,
      0,
      false,
      thing_data_map.C8.C8_1_OverCapperSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );


    goodCount(
      gcountweigher,
      thing_data_map.C10.C10_1_CWeigherRejectCount,
      machine_obj["C10"],
      thing_data_map.C10.C10_1_SealerCaseBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );

    ///////inkjet

    addstop(
      machine_obj["C3"],
      false,
      false,
      false,
      false,
      thing_data_map.C3.C3_1_InkjetSignalRed,
      thing_data_map.C3.C3_1_InkjetOutfeedBlocked,
      0,
      0,
      false,
      thing_data_map.C3.C3_1_InkjetSignalGreen,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );


    goodCount(
      gcountinkjet,
      thing_data_map.C7.C7_Inspect_StackDateCount,
      machine_obj["C3"],
      0,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );



    //leaktester
    addstop(
      machine_obj["C3"],
      false,
      false,
      false,
      false,
      0,
      thing_data_map.C3.C3_1_LeakDetectOutfeedBlocked,
      0,
      0,
      false,
      true,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );

    goodCount(
      gcountleaktester,
      thing_data_map.C3.C3_1_LeakDetectRejectCount,
      machine_obj["C3"],
      thing_data_map.C3.C3_1_LeakDetectBPM,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );
    /////////////////////////////////convyer data
    ///fallen_1
    addstop(
      machine_obj["C1"],
      false,
      global.changeSkuManualEntry,
      false,
      global_updt,
      thing_data_map.C1.C1_Siapi_ExitConvFallenBottle,
      false,
      0,
      0,
      false,
      true,
      shift,
      line_obj["AVOD"],
      d,
      timestamp
    );
    goodCount(
      0,
      0,
      machine_obj["C1"],
      0,
      0,
      shift,
      data.date,
      line_obj["AVOD"],
    );
      //////bottleflow1
      addstop(
        machine_obj["C1"],
        false,
        global.changeSkuManualEntry,
        false,
        global_updt,
        !thing_data_map.C1.C1_Siapi_ConvBottleFlow1,
        false,
        0,
        0,
        false,
        true,
        shift,
        line_obj["AVOD"],
        d,
        timestamp
      );
      goodCount(
        0,
        0,
        machine_obj["C1"],
        0,
        0,
        shift,
        data.date,
        line_obj["AVOD"],
      );
        //////bottleflow2
        addstop(
          machine_obj["C1"],
          false,
          global.changeSkuManualEntry,
          false,
          global_updt,
          !thing_data_map.C1.C1_Siapi_ConvBottleFlow2,
          false,
          0,
          0,
          false,
          true,
          shift,
          line_obj["AVOD"],
          d,
          timestamp
        );
        goodCount(
          0,
          0,
          machine_obj["C1"],
          0,
          0,
          shift,
          data.date,
          line_obj["AVOD"],
        );
        ///bollte stuck 1
        addstop(
          machine_obj["C1"],
          false,
          global.changeSkuManualEntry,
          false,
          global_updt,
          thing_data_map.C1.C1_Siapi_BottleStuckSiapiAndOr,
          false,
          0,
          0,
          false,
          true,
          shift,
          line_obj["AVOD"],
          d,
          timestamp
        );
        goodCount(
          0,
          0,
          machine_obj["C1"],
          0,
          0,
          shift,
          data.date,
          line_obj["AVOD"],
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
  d,
  line_id
) {
  var temp = await getTempGood(
    machine,
    line_id,
    shift,
    d,
    good_count,
    reject_count
  );
  var reset_counter = temp.current_value * 0.5;
  var date = d;
  //shift change all changes
  if (
    temp.current_shift != shift ||
    moment(d).diff(moment(temp.date), "days") > 0
  ) {
    var pre_shift = temp.current_shift;
    if (pre_shift == date_change_shift) {
      var date = moment().local().subtract(1, "days").startOf("day").format();
      var split = date.split("+");
      date = split[0] + "+00:00";
    }
    var shift_good = good_count - temp.shift_start_good_count;
    var shift_reject = reject_count - temp.shift_start_reject_count;
    updateGoodCount(
      line_id,
      date,
      pre_shift,
      machine,
      shift_good,
      shift_reject,
      () => {
        frequentGoodUpdate(machine, line_id, {
          shift_start_good_count: good_count,
          shift_start_reject_count: reject_count,
          current_good_value: good_count,
          date: d,
          current_reject_value: reject_count,
          current_shift: shift,
        });
        addMachineData(line_id, d, shift, operator_name, machine, () => {
          //can do operation after shift end process
        });
      }
    );
    return;
  }
  //if batch will change

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
  ready,
  shift,
  line_id,
  d,
  timestamp
) {
  console.log(machine,
    not_used,
    changeover,
    pdt,
    updt,
    stop,
    blocked,
    waiting,
    alarm,
    manual_stop,
    ready,
    shift,
    line_id,
    d,
    timestamp);
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
    ready,
  ]);
  if (current == "fault") {
    code = `fault_${stop}`;
  } else if (current == "waiting" && typeof waiting == "number") {
    code = `waiting_${waiting}`;
  } else {
    code = current;
  }
  getCondition(machine, line_id, d, shift, operator_name,(condition)=>{
     //if any alarm 
    if (alarm > 0) {
      updateAlarm(machine, line_id, stop, alarm);
    }else{
      updateAlarmStatus(machine, line_id);
    }
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
      postStop(machine, code, timestamp);
      updateCondition(machine, line_id, current, timestamp, code, (err, data) => {
        //console.log(data);
      });
    }
  }); 
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
          console.log(error)
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

app.listen(process.env.PORT, () => {
  console.log(`App is connected ${process.env.PORT}`);
});
