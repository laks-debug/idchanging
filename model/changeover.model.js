var mongoose = require("mongoose");
var moment = require("moment");
var { postSkuTrigger } = require('./batch.model');
var { CurrentShift } = require("./shift.model");
var Project = require('./project.model');
var {getCondition} = require('./status.model');
var critcal_machine = 'cam_blister';
var line_id = "5f0809fdc2b1ce30cc53eb8d";

// var {skuAdd} = require("./sku.model");
var ChangeOver = mongoose.Schema(
  {
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'line',
    },
    changeover_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "changeovermaster",
    },
    changeover_end_date: {
      type: Date,
      default: null
    },
    changeover_start_date: {
      type: Date,
      default: Date.now
    },
    batch_name: {
      type: String,
    },
    standard_duration: {
      type: Number
    },
    batch_size: {
      type: String,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    fgex: {
      type: String,
      require: true,
    },
    pre_batch: {
      type: String,
    },
    pre_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    shift: {
      type: String
    },
    date: {
      type: Date
    },
    changeover_finished: {
      type: Date,
      default: null
    },
    finished_type: {
      type: String
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "operator",
    },
    quality_power_off:{
      type:Number,
      default:0
    },
    mechanical_power_off:{
      type:Number,
      default:0
    },
    shift_wise:[{
      date:{
        type:Date,
      },
      shift: String,
      changeover_start_time: Date,
      changeover_end_time: {
        type: Date,
        default: null
      },
      quality_power_off:{
        type:Number,
        default:0
      },
      mechanical_power_off:{
        type:Number,
        default:0
      },
      operator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "operator",
      },
    }]
  },
  { timestamps: true }
);

var changeOver = mongoose.model("changeOver", ChangeOver);


const getIsNullTrue = async () => {
  let changeover = await changeOver.findOne({ changeover_end_date: null });
  return changeover;
};


// const saveType = async (req) => {
//   let changeOver = await changeOver.findOne({end_time: null});
//   changeOver.update({ end_time: null }, { $set: { start_time: req.start_time , subprocess:[{type: type, start_time: req.start_time}] } } , data =>{

//   });
//   return changeOver;
// };


var changesku = async (batch, product, format, batch_size) => {
  console.log(batch, product, format, batch_size);
  var data = await CurrentShift();
  var shift = data.CurrentShift;
  var d = data.date;

  postSkuTrigger(batch, product, format, batch_size);
  return
}


var pushChangeover = async (shift, start_timestamp, operator) => {
  var data = await changeOver.updateOne({
    changeover_end_date: null,
  },
    {
      $push: {
        shift_wise: {
          shift: shift,
          changeover_start_time: start_timestamp,
          operator: operator
        },
      }
    }
  );
  return data;
}

var updateChangeOver = async (type,cb) => {
  var status = await getCondition(critcal_machine,line_id);
  var power_off = 0
  if(status.condition == 'updt'){
    var diff = Math.floor((new Date() - new Date(status.last_update)) / 1000);
    power_off += diff
  }
  var data = changeOver.updateOne({
    changeover_end_date: null,
    'shift_wise.changeover_end_time': null
  },
    {
      $set: {
        changeover_end_date: new Date(),
        // changeover_finished: new Date(),
        // power_off:power_off,
        finished_type: type,
        "shift_wise.$.changeover_end_time": new Date(),
        // "shift_wise.$.power_off":power_off
      },
      $inc:{
        power_off:power_off,
        "shift_wise.$.power_off":power_off
      }
    },
    (err, data) => {
      cb(data)
    }
  );
  return data
};



/////push and update new shift
var pushAndUpdateChangeover = async (shift, operator,date, cb) => {
  var data = await changeOver.updateOne(
    {
      changeover_end_date: null,
      "shift_wise.changeover_end_time": null,
    },
    {
      $set: {
        "shift_wise.$.changeover_end_time": new Date(),
      },
    },
    (err, data) => {
      if (!err) {
        changeOver.updateOne(
          {
            changeover_end_date: null,
          },
          {
            $push: {
              shift_wise: {
                shift: shift,
                changeover_start_time: new Date(),
                operator: operator,
                date:date
              },
            },
          },
          (err, data) => {
            cb(data)
          }
        );
      }
    }
  );
  return data
};

//update only power off
var updatePowerOff = async (shift,value,d)=>{
 // console.log(shift,value,d);
  var check = await changeOver.findOne({changeover_end_date:null});
  if(!check.changeover_finished){
    var data = await changeOver.updateOne(
      {
        changeover_end_date: null,
        // "shift_wise.date":d,
        //  "shift_wise.shift": shift,
         "shift_wise": { "$elemMatch": { "date": d, "shift": shift }}
      },
      {
        $inc: {
          "shift_wise.$.mechanical_power_off": value,
          mechanical_power_off:value
        },
      },
    );
   // console.log(data);
    return data
  }else{
    var data = await changeOver.updateOne(
      {
        changeover_end_date: null,
        // "shift_wise.shift": shift,
        // "shift_wise.date":d
        "shift_wise": { "$elemMatch": { "date": d, "shift": shift }}
      },
      {
        $inc: {
          "shift_wise.$.quality_power_off": value,
          quality_power_off:value
        },
      },
    );
   // console.log(data);
    return data
  } 
}
module.exports.changeOver = changeOver;
module.exports.getIsNullTrue = getIsNullTrue;
module.exports.changesku = changesku;
module.exports.pushChangeover = pushChangeover;
module.exports.pushAndUpdateChangeover = pushAndUpdateChangeover;
module.exports.updateChangeOver = updateChangeOver;
module.exports.updatePowerOff = updatePowerOff;


