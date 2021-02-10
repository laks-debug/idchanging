var express = require("express");
var moment = require("moment");
var router = express.Router();
var {
  changeOver,
  changesku,
  updateChangeOver,
} = require("../model/changeover.model");
var { Batchskutrigger, postSkuTrigger } = require("../model/batch.model");
const { EventEmitter } = require("events");
var { Type } = require("../model/type.model");
var mongoose = require("mongoose");
var { Roster } = require("../model/roster.model");
var { SkuMaster } = require("../model/product.model");
var { CurrentShift } = require("../model/shift.model");
var { Batchskutrigger } = require("../model/batch.model");
var { updateChangeoverMode } = require("../model/goodTemp.model");
var { Condition, getCondition } = require("../model/status.model");
//var { maintananaceMailer,ChangeovermailFormatter } = require('./email.controller');
const e = new EventEmitter();
var critical_machine = "cam_blister";

router.post("/", async (req, res) => {
  var data = req.body;
  var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss");
  console.log(timestamp);
  var powercheck = await Condition.findOne({});
  if (powercheck.condition == "updt") {
    res.send("machine in poweroff condition");
  } else {
    if (data.changeover_finished != null) {
      var check_finish_null = await changeOver.findOneAndUpdate(
        { changeover_finished: null },
        { changeover_finished: timestamp },
        {
          new: true,
          //upsert: true,
          sort: { changeover_start_date: -1 },
        }
      );
      res.send(check_finish_null);
    } else {
      if (data.changeover_end_date != null) {
        global.changeSkuManualEntry = false;
        updateChangeOver("manual", (data) => {
          res.send(data);
        });
      } else {
        var checkend_null = await changeOver.findOne({
          changeover_end_date: null,
        });
        //var check_finish_data = await changeOver.findOne({ changeover_finished: null })
        var check_batch_name = await Batchskutrigger.findOne({
          batch: data.batch_name,
        });
        if (checkend_null || check_batch_name) {
          res.send(
            "previous changeover already running first finished it/please update changeover_finish time/Recheck Batch Name it already present"
          );
        } else {
          var pre_batch = await Batchskutrigger.findOne({ end_time: null });
          var curretshitordate = await CurrentShift();
          var shift = curretshitordate.shift;
          var d = curretshitordate.date;
          var get_op = await Roster.find(
            { date: d },
            { shift_wise: { $elemMatch: { shift_name: shift } } }
          );
          var operator = get_op[0]
            ? get_op[0].shift_wise[0].operator_name
            : null;
          var product = req.query.product_id;
          req.body.changeover_start_date = timestamp;
          req.body.pre_batch = pre_batch.batch;
          req.body.pre_product_id = pre_batch.product_name;
          req.body.shift = shift;
          req.body.date = d;
          req.body.shift_wise = [
            {
              date:d,
              shift: shift,
              changeover_start_time: timestamp,
              opertor: operator,
            },
          ];
          req.body.operator = operator;
          console.log(req.body, data);
          var raw = new changeOver(req.body);
          try {
            global.changeSkuManualEntry = true;
            updateChangeoverMode(
              critical_machine,
              data.line_id,
              global.changeSkuManualEntry
            );
            postSkuTrigger(
              data.batch_name,
              data.product_id,
              data.batch_size,
              data.line_id
            );
            var save = await raw.save();
            res.status(200).send(save);
          } catch (error) {
            res.status(400).send(error.message);
          }
        }
      }
    }
  }
});

router.get("/current", async (req, res) => {
  var data = await changeOver
    .findOne({ changeover_end_date: null })
    .populate("changeover_type_id")
    .populate("product_id");
  if (data) {
    data.changeover_start_date = moment(data.changeover_start_date)
      .local()
      .format("YYYY-MM-DDTHH:mm:ss");
    res.send(data);
  } else {
    res.send("no changeover running");
  }
});

router.get("/roo", async (req, res) => {
  var curretshitordate = await CurrentShift();
  var shift = curretshitordate.shift;
  var d = curretshitordate.date;
  console.log(shift, d);
  //var get_opretor = await Roster.findOne({date:d})
  //console.log(get_opretor.shift_wise);
  var data = await Roster.find(
    { date: d },
    { shift_wise: { $elemMatch: { shift_name: shift } } }
  );
  console.log(data[0].shift_wise[0].operator_name);
  res.send(data);
});

router.get("/changeoverreport", async (req, res) => {
  var line_id = req.query.line_id;
  var startDate = moment(req.query.startDate).format("YYYY-MM-DDTHH:mm:ss");
  var endDate = moment(req.query.endDate).format("YYYY-MM-DDTHH:mm:ss");
  var data = await changeOver.aggregate([
    {
      $match: {
        $and: [
          {
            changeover_start_date: {
              $lte: new Date(endDate),
            },
          },
          {
            changeover_start_date: {
              $gte: new Date(startDate),
            },
          },
        ],
        changeover_end_date: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "changeovermasters",
        localField: "changeover_type_id",
        foreignField: "_id",
        as: "type",
      },
    },
    {
      $lookup: {
        from: "lines",
        localField: "line_id",
        foreignField: "_id",
        as: "line",
      },
    },
    {
      $lookup: {
        from: "fgexes",
        localField: "product_id",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $lookup: {
        from: "fgexes",
        localField: "pre_product_id",
        foreignField: "_id",
        as: "pre_product",
      },
    },
    {
      $lookup: {
        from: "equipment",
        let: { machine: critical_machine },
        pipeline: [
          { $match: { $expr: { $eq: ["$equipment_name", "$$machine"] } } },
        ],
        as: "machine",
      },
    },
    {
      $unwind: {
        path: "$shift_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$pre_product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$type",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$line",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$machine",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "rosters",
        let: { date: "$shift_wise.date", shift: "$shift_wise.shift" },
        pipeline: [
          { $match: { $expr: { $eq: ["$date", "$$date"] } } },
          {
            $project: {
              operator: {
                $filter: {
                  input: "$shift_wise",
                  as: "shift_name",
                  cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                },
              },
            },
          },
          {
            $unwind: {
              path: "$operator",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "operators",
              let: { operator_name: "$operator.operator_name" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
              ],
              as: "operator",
            },
          },
          {
            $unwind: {
              path: "$operator",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "roster",
      },
    },
    {
      $lookup: {
        from: "projects",
        let: {
          date: "$shift_wise.date",
          shift: "$shift_wise.shift",
          batch: "$batch_name",
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$date", "$$date"] } } },
          {
            $project: {
              shift_wise: {
                $filter: {
                  input: "$shift_wise",
                  as: "shift_name",
                  cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                },
              },
            },
          },
          {
            $unwind: {
              path: "$shift_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$shift_wise.batch_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "batchskutriggers",
              let: { batch_name: "$shift_wise.batch_wise.batch" },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$batch_name"] } } },
              ],
              as: "batch",
            },
          },
          {
            $unwind: {
              path: "$batch",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              $expr: {
                $eq: ["$batch.batch", "$$batch"],
              },
            },
          },
          {
            $project: {
              machine_wise: {
                $filter: {
                  input: "$shift_wise.batch_wise.machine_wise",
                  as: "machine_wise",
                  cond: {
                    $eq: ["$$machine_wise.machine_name", critical_machine],
                  },
                },
              },
            },
          },
          {
            $unwind: {
              path: "$machine_wise",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              changeover_wastage: "$machine_wise.startup_reject",
            },
          },
        ],
        as: "project",
      },
    },
    {
      $unwind: {
        path: "$roster",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$project",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        changeover_wastage: {
          $ifNull: ["$project.changeover_wastage", 0],
        },
        operator_name: {
          $ifNull: ["$roster.operator.display_name", "Operator Not Defined"],
        },
        date: { $ifNull: ["$shift_wise.date", "$date"] },
        shift_power_off: { $ifNull: ["$shift_wise.power_off", 0] },
        total_power_off: { $ifNull: ["$power_off", 0] },
        shift: { $ifNull: ["$shift_wise.shift", "$shift"] },
        line: "$line.line_name",
        changeover_finish_type: { $ifNull: ["$finished_type", "manual"] },
        batch_name: "$batch_name",
        batch_size: "$batch_size",
        changeover_start_date: "$changeover_start_date",
        changeover_end_date: { $ifNull: ["$changeover_end_date", new Date()] },
        changeover_finish: {
          $ifNull: ["$changeover_finished", "$changeover_end_date"],
        },
        type: "$type.changeover_name",
        standard_duration: "$type.standard_duration",
        shift_changeover_start_time: {
          $ifNull: [
            "$shift_wise.changeover_start_time",
            "$changeover_start_date",
          ],
        },
        shift_changeover_end_time: {
          $ifNull: ["$shift_wise.changeover_end_time", "$changeover_end_date"],
        },
        machine_name: "$machine.display_name",
        product_name: "$product.product_name",
        from_fgex: "$product.fgex",
        to_fgex: "$pre_product.fgex",
      },
    },
    {
      $project: {
        changeover_wastage: 1,
        operator_name: 1,
        date: 1,
        shift: 1,
        line: 1,
        changeover_finish_type: 1,
        batch_name: 1,
        batch_size: 1,
        changeover_finish_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$changeover_finish",
            timezone: "+05:30",
          },
        },
        type: 1,
        standard_duration: {
          $multiply: ["$standard_duration", 60],
        },
        machine_name: 1,
        product_name: 1,
        from_fgex: 1,
        total_power_off: 1,
        shift_power_off: 1,
        to_fgex: 1,
        shift_changeover_start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$shift_changeover_start_time",
            timezone: "+05:30",
          },
        },
        shift_changeover_end_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$shift_changeover_end_time",
            timezone: "+05:30",
          },
        },
        changeover_start_time: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$changeover_start_date",
            timezone: "+05:30",
          },
        },
        production_start: {
          $dateToString: {
            format: "%Y-%m-%dT%H:%M:%S.%L",
            date: "$changeover_end_date",
            timezone: "+05:30",
          },
        },
        mechanical_actual_time: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$changeover_finish", "$changeover_start_date"],
                },
                1000,
              ],
            },
            0,
          ],
        },
        quality_actual_time: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$changeover_end_date", "$changeover_finish"],
                },
                1000,
              ],
            },
            0,
          ],
        },
        standard_duration_split: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        {
                          $subtract: [
                            "$shift_changeover_end_time",
                            "$shift_changeover_start_time",
                          ],
                        },
                        "$shift_power_off",
                      ],
                    },
                    {
                      $subtract: [
                        {
                          $subtract: [
                            "$changeover_end_date",
                            "$changeover_start_date",
                          ],
                        },
                        "$total_power_off",
                      ],
                    },
                  ],
                },
                {
                  $multiply: ["$standard_duration", 60],
                },
              ],
            },
            2,
          ],
        },
        actual_total_time: {
          $round: [
            {
              $subtract: [
                {
                  $divide: [
                    {
                      $subtract: [
                        "$changeover_end_date",
                        "$changeover_start_date",
                      ],
                    },
                    1000,
                  ],
                },
                "$total_power_off",
              ],
            },
            0,
          ],
        },
        shift_actual_time: {
          $round: [
            {
              $subtract: [
                {
                  $divide: [
                    {
                      $subtract: [
                        "$shift_changeover_end_time",
                        "$shift_changeover_start_time",
                      ],
                    },
                    1000,
                  ],
                },
                "$shift_power_off",
              ],
            },
            0,
          ],
        },
        efficency: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $multiply: ["$standard_duration", 60],
                    },
                    {
                      $subtract: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                "$changeover_end_date",
                                "$changeover_start_date",
                              ],
                            },
                            1000,
                          ],
                        },
                        "$total_power_off",
                      ],
                    },
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
      },
    },
  ]);
  res.send(data);
});

// router.get("/", async (req, res) => {
//   var query_type = req.query.type;
//   var line_id = req.query.line_id;
//   var batch = req.query.batch;
//   var product = req.query.product;
//   var format = req.query.format;
//   var batch_size = req.query.batch_size;
//   //var target_quantity = req.query.target_quantity
//   // var sku = req.query.sku;
//   console.log(line_id, batch, product, format, batch_size);
//   var data = await changeOver.findOne({ end_time: null, line_id: line_id }).populate('line_id')
//   var current_timestamp = new Date();
//   if (data && query_type) {
//     if (query_type == "changeover") {
//       global.changeSkuManualEntry = false;
//       changeOver.findOneAndUpdate(
//         { line_id: line_id, end_time: null, "subprocess.status": "running" },
//         {
//           $set: {
//             "subprocess.$.end_time": current_timestamp, "subprocess.$.status": "completed", end_time: current_timestamp
//           }
//         },
//         { new: true },
//         (err, resp) => {
//           var result = format_data(resp, data.line_id.line_name);
//           // ChangeovermailFormatter(resp._id)
//           res.send(result)
//         }
//       );
//     } else {
//       var check_unique = data.subprocess.find(changeover => {
//         return (changeover.type === query_type && changeover.status == "running");
//       });
//       if (check_unique) {
//         res.status(409).send("Process alreay starded");
//       } else {
//         changeOver.findOneAndUpdate(
//           { line_id: line_id, end_time: null, "subprocess.status": "running" },
//           { $set: { "subprocess.$.end_time": current_timestamp, "subprocess.$.status": "completed" } },
//           (err, resp) => {
//             if (!err) {
//               changeOver.findOneAndUpdate(
//                 { line_id: line_id, end_time: null, "subprocess.type": query_type },
//                 {
//                   $set: {
//                     "subprocess.$.start_time": current_timestamp, "subprocess.$.status": "running"
//                   }
//                 },
//                 { new: true },
//                 (err, resp) => {
//                   var result = format_data(resp, data.line_id.line_name);
//                   res.send(result)
//                 }
//               );
//             }
//           }
//         );
//       }
//     }
//   } else {
//     if (!query_type) {
//       if (data) {
//         var result = format_data(data, data.line_id.line_name);
//         res.send(result)
//       } else {
//         //res.status(400).send("No Changover")
//         var types = await Type.find({ type: "setupclassification", line_id: line_id }).populate('line_id');
//         var send_data = {};
//         var setups = {};
//         var line_name;
//         types.forEach(type => {
//           var push_obj = {};
//           push_obj.type = type.value;
//           push_obj.status = "pending";
//           push_obj.start_time = null;
//           push_obj.end_time = null;
//           line_name = type.line_id.line_name
//           setups[push_obj.type] = push_obj
//         });
//         send_data['setups'] = setups;
//         send_data['linename'] = line_name;
//         send_data['current_timestamp'] = moment().local().format()
//         res.send(send_data)
//       }
//     } else {
//       var sku_check = false;
//       var checkbatch = await Batchskutrigger.findOne({ batch: batch })
//       if (checkbatch) {
//         sku_check = true;
//       }
//       var isValidproduct = mongoose.Types.ObjectId.isValid(product);
//       var isValidformat = mongoose.Types.ObjectId.isValid(format);
//       if (!product || !isValidproduct || sku_check || !format || !batch || !batch_size || !isValidformat) {
//         res.status(404).send("please send a valid data")
//         return
//       }
//       var push_data = [];
//       var types = await Type.find({ type: "setupclassification", line_id: line_id });
//       //console.log(types);
//       types.forEach(type => {
//         var push_obj = {};
//         if (type.value == query_type) {
//           push_obj.type = type.value;
//           push_obj.status = "running";
//           push_obj.start_time = new Date();
//           push_obj.end_time = null;
//         } else {
//           push_obj.type = type.value;
//           push_obj.status = "pending";
//           push_obj.start_time = null;
//           push_obj.end_time = null;
//         }
//         push_data.push(push_obj)
//       });
//       var pre_sku = await Batchskutrigger.findOne({ end_time: null })
//       //changesku(sku);
//       postSkuTrigger(batch, product, format,batch_size);
//       global.changeSkuManualEntry = true;
//       var changover = new changeOver({
//         start_time: new Date(),
//         line_id: line_id,
//         batch_name: batch,
//         product_name: product,
//         format: format,
//         batch: batch,
//         pre_batch: pre_sku.batch,
//         subprocess: push_data
//       });
//       var save = await changover.save();
//       var resp = await changeOver.findById(save._id).populate('line_id');
//       var result = format_data(resp, resp.line_id.line_name);
//       res.send(result)
//     }

//   }
// });

/////////////get
// router.get("/current", async (req, res) => {
//   await changeOver.findOne({ end_time: null }, (err, data) => {
//     res.send(data);
//   });
// });

// function format_data(resp, line_name) {
//   var send_data = {
//     current_timestamp: moment().local().format()
//   };
//   var setups = {}
//   resp.subprocess.forEach((subprocess) => {
//     setups[subprocess.type] = {
//       name: subprocess.type,
//       status: subprocess.status,
//       startTime: moment(subprocess.start_time).isValid() ? moment(subprocess.start_time).local().format() : null,
//       stopTime: moment(subprocess.end_time).isValid() ? moment(subprocess.end_time).local().format() : null,
//       //current_timestamp:moment().local().format()
//     }
//   });
//   send_data['setups'] = setups;
//   send_data['linename'] = line_name;
//   return send_data
// }
module.exports = router;
