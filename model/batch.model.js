const mongoose = require("mongoose");
var {FGEX} = require('../model/fgex.model')
var moment = require('moment')
var batchskutrigger = new mongoose.Schema(
  {
    start_time: {
      type: Date,
      required: true,
      default:Date.now()
    },
    // target_quantity: {
    //   type: Number,
    // },
    product_name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fgex",
    },
    line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'line',
    },
    batch: {
      type: String,
      unique:true,
    },
    // format: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "format",
    // },
    batch_size:{
        type:Number,
    },
    end_time: {
      type: Date,
      default: null,
    },
    rated_speed: {
      type: Number,
    },
  },
  { timestamps: true }
);

var Batchskutrigger = mongoose.model("batchskutrigger", batchskutrigger);

var getCurrentBatch = async () => {
  var batch = await Batchskutrigger.findOne({ end_time: null });
  if (!batch) {
    var data = new Batchskutrigger({
      start_time: new Date(),
      batch_size: 28800,
      product_name: "5e53d256f931b906783a17c3",
      line_id:"5f0809fdc2b1ce30cc53eb8d",
      //format: "5ea94dd6b5959e13903d309e",
      batch: "intial",
    });
    var result = await data.save();
    return result;
  }
  return batch;
};
var postSkuTrigger = async (batch_name, product, batch_size , line_id) => {
  console.log(batch_name, product, batch_size,line_id);
  var batch = await Batchskutrigger.findOne({ end_time: null });
  // batch.isactive = false;
  batch.end_time = new Date();
  batch.save();
  var new_batch = new Batchskutrigger({
    start_time: moment().format("YYYY-MM-DDTHH:mm:ss"),
    //target_quantity: target_quantity,
    batch_size: batch_size,
    line_id: line_id,
    product_name : product,
    batch : batch_name,
  });
  //console.log(new_batch);
  var result = await new_batch.save();
  if (result) {
    return result;
  } else {
    return "duplicate";
  }

};

var MachineCheckSku = async () => {
  var arr = [];
  var data = await Batchskutrigger.findOne({ isactive: true }).populate({
    path: "sku",
    select: { _id: 0, equipments: 1 },
    populate: { path: "equipments", select: { _id: 0, equipment_name: 1 } },
  });
  //console.log(data)
  data.sku.equipments.forEach((element) => {
    arr.push(element.equipment_name);
  });
  return arr;
};
module.exports.Batchskutrigger = Batchskutrigger;
module.exports.getCurrentBatch = getCurrentBatch;
module.exports.postSkuTrigger = postSkuTrigger;
module.exports.MachineCheckSku = MachineCheckSku;
