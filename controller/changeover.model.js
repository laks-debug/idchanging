var mongoose = require("mongoose");
var moment = require("moment");
var { postSkuTrigger } = require('./batch.model');
var { CurrentShift } = require("./shift.model");
var Project = require('./project.model');
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
    shift_wise:[{
      date:{
        type:Date,
        default:Date.now()
      },
      shift: String,
      changeover_start_time: Date,
      changeover_end_time: {
        type: Date,
        default: null
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
  let changeOver = await changeOver.findOne({ end_time: null });
  return changeOver;
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
  console.log(type);
  var data = changeOver.updateOne({
    changeover_end_date: null,
    'shift_wise.changeover_end_time': null
  },
    {
      $set: {
        changeover_end_date: new Date(),
        // changeover_finished: new Date(),
        finished_type: type,
        "shift_wise.$.changeover_end_time": new Date()
      }
    },
    (err, data) => {
      cb(data)
    }
  );
  
  return data
};



/////push and update new shift
var pushAndUpdateChangeover = async (shift, start_timestamp, operator, cb) => {
  console.log(shift, start_timestamp, operator, cb);
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
                changeover_start_time: start_timestamp,
                operator: operator,
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


module.exports.changeOver = changeOver;
module.exports.getIsNullTrue = getIsNullTrue;
module.exports.changesku = changesku;
module.exports.pushChangeover = pushChangeover;
module.exports.pushAndUpdateChangeover = pushAndUpdateChangeover;
module.exports.updateChangeOver = updateChangeOver;


