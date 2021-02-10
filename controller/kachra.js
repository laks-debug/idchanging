var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var router = express.Router();
var { CurrentShift } = require("../model/shift.model");
var { Project } = require("../model/project.model");
var { TempGood } = require("../model/goodTemp.model");
var { Condition } = require("../model/status.model");
var { Batchskutrigger } = require('../model/batch.model')
var fault_obj = {
    cam_blister:{
        fault_1:"Signal Red",
        fault_13:"test"
    }
}
router.get("/", async (req, res) => {
  var data = await CurrentShift();
  var shift = data.shift;
  var d = data.date;
  var line_id = req.query.line_id;
  var batch_data = await Batchskutrigger.findOne({end_time:null}).populate('product_name');
  console.log(batch_data);
  var batch = batch_data._id;
  console.log(batch)
  var end = moment(d).format("YYYY-MM-DD");
  var start = moment(batch_data.start_time).format("YYYY-MM-DD");
  var total_time = data.total_time;
  var tempGood = await TempGood.find({ line_id: line_id });
  var condition = await Condition.find({ line_id: line_id });
  console.log(end,start,batch)
  var data = await Project.aggregate([
    {
      $match: {
        line_id: mongoose.Types.ObjectId(line_id),
        $and: [
            {
              date: {
                $lte: new Date(end),
              },
            },
            {
              date: {
                $gte: new Date(start),
              },
            },
          ],
      },
    },
    { $unwind: "$shift_wise" },
    {
      $lookup: {
        from: "operators",
        localField: "shift_wise.operator_name",
        foreignField: "_id",
        as: "operator_name",
      },
    },
    {
      $unwind: {
        path: "$operator_name",
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
      $match: {
        "shift_wise.batch_wise.batch": mongoose.Types.ObjectId(batch),
      },
    },
    {
      $unwind: {
        path: "$shift_wise.batch_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line_id",
        shift:"$shift_wise.shift_name",
        machine_name: "$shift_wise.batch_wise.machine_wise.machine_name",
        goodCount: "$shift_wise.batch_wise.machine_wise.goodCount",
        reject_count: "$shift_wise.batch_wise.machine_wise.reject_count",
        fault: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "fault"] },
          },
        },
        date:"$date",
        changeover: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "changeover"] },
          },
        },
        blocked: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "blocked"] },
          },
        },
        pdt: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "pdt"] },
          },
        },
        manual_stop: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "manual_stop"] },
          },
        },
        updt: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "updt"] },
          },
        },
        waiting: {
          $filter: {
            input: "$shift_wise.batch_wise.machine_wise.stop_wise",
            as: "stop",
            cond: { $eq: ["$$stop.stop_name", "waiting"] },
          },
        },
        operator_name: {
          $ifNull: ["$operator_name", "Not Defined"],
        },
        batch_start: "$shift_wise.batch_wise.start_timestamp",
        batch_end: {
          $ifNull: ["$shift_wise.batch_wise.end_timestamp", new Date()],
        },
      },
    },
    {
      $unwind: {
        path: "$waiting",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$changeover",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$pdt",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$updt",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$blocked",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$manual_stop",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: 1,
        rated_speed: 1,
        isCurrent: 1,
        machine_name: 1,
        goodCount: 1,
        reject_count: 1,
        operator_name:1,
        date:1,
        shift:1,
        fault: {
          $ifNull: [
            "$fault",
            {
              duration: 0,
              count: 0,
              stop_name: "fault",
              details: [],
            },
          ],
        },
        blocked: {
          $ifNull: [
            "$blocked",
            {
              duration: 0,
              count: 0,
              stop_name: "blocked",
              details: [],
            },
          ],
        },
        waiting: {
          $ifNull: [
            "$waiting",
            {
              duration: 0,
              count: 0,
              stop_name: "waiting",
              details: [],
            },
          ],
        },
        updt: {
          $ifNull: [
            "$updt",
            {
              duration: 0,
              count: 0,
              stop_name: "updt",
              details: [],
            },
          ],
        },
        pdt: {
          $ifNull: [
            "$pdt",
            {
              duration: 0,
              count: 0,
              stop_name: "pdt",
              details: [],
            },
          ],
        },
        changeover: {
          $ifNull: [
            "$changeover",
            {
              duration: 0,
              count: 0,
              stop_name: "changeover",
              details: [],
            },
          ],
        },
        manual_stop: {
          $ifNull: [
            "$manual_stop",
            {
              duration: 0,
              count: 0,
              stop_name: "manual_stop",
              details: [],
            },
          ],
        },
        total_batch_duration: {
          $round: [
            {
              $divide: [
                {
                  $subtract: ["$batch_end", "$batch_start"],
                },
                1000 * 60,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: {
            shift:"$shift",
            date:"$date",
            machine_name:"$machine_name",
            operator_name:"$operator_name"
        },
        goodCount: { $sum: "$goodCount" },
        reject_count: { $sum: "$stop_count" },
        blocked: { $sum: "$blocked.duration" },
        blocked_count: { $sum: "$blocked.count" },
        waiting: { $sum: "$waiting.duration" },
        waiting_count: { $sum: "$waiting.count" },
        manual_stop: { $sum: "$manual_stop.duration" },
        manual_stop_count: { $sum: "$manual_stop.count" },
        pdt: { $sum: "$pdt.duration" },
        pdt_count: { $sum: "$pdt.count" },
        updt: { $sum: "$updt.duration" },
        updt_count: { $sum: "$updt.count" },
        changeover: { $sum: "$changeover.duration" },
        changeover_count: { $sum: "$changeover.count" },
        fault: { $sum: "$fault.duration" },
        fault_count: { $sum: "$fault.count" },
        total_batch_duration: { $sum: "$total_batch_duration" },
        fault_arr: {
          $push: "$fault.details",
        },
      },
    },
    {
        $group:{
            _id:"$_id.date",
            shift:{
                $push:{
                    shift:"$_id.shift",
                    machine_name:"$_id.machine_name",
                    operator_name:"$_id.operator_name",
                    fault_arr: "$fault_arr",
                    goodCount: "$goodCount",
                    reject_count: "$reject_count",
                    blocked: "$blocked",
                    blocked_count: "$blocked_count",
                    waiting: "$waiting",
                    waiting_count: "$waiting_count",
                    manual_stop: "$manual_stop",
                    manual_stop_count: "$manual_stop_count",
                    pdt: "$pdt",
                    pdt_count: "$pdt_count",
                    updt: "$updt",
                    updt_count: "$updt_count",
                    changeover: "$changeover",
                    changeover_count: "$changeover_count",
                    fault: "$fault",
                    fault_count: "$fault_count",
                    total_batch_duration: "$total_batch_duration",
                }
            }
        }
    },
    {
      $unwind: {
        path: "$shift",
        preserveNullAndEmptyArrays: true,
      },
    },
      {
        $group: {
            _id: "$shift.machine_name",
            goodCount: { $sum: "$shift.goodCount" },
            reject_count: { $sum: "$shift.reject_count" },
            blocked: { $sum: "$shift.blocked" },
            blocked_count: { $sum: "$shift.blocked_count" },
            waiting: { $sum: "$shift.waiting" },
            waiting_count: { $sum: "$shift.waiting_count" },
            manual_stop: { $sum: "$shift.manual_stop" },
            manual_stop_count: { $sum: "shift.$manual_stop_count" },
            pdt: { $sum: "$shift.pdt" },
            pdt_count: { $sum: "$shift.pdt_count" },
            updt: { $sum: "$shift.updt" },
            updt_count: { $sum: "$shift.updt_count" },
            changeover: { $sum: "$shift.changeover" },
            changeover_count: { $sum: "$shift.changeover_count" },
            fault: { $sum: "$shift.fault" },
            fault_count: { $sum: "$shift.fault_count" },
            total_batch_duration: { $sum: "$shift.total_batch_duration" },
            fault_arr: {
              $push: "$shift.fault_arr",
            },
            shift_wise:{
                $push:{
                    shift:"$shift.shift",
                    goodCount:"$shift.goodCount",
                    date:"$_id",
                    reject_count:"$shift.reject_count",
                    operator_name:"$shift.operator_name"
                }
            }
          },
      },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$fault_arr",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
        $unwind: {
          path: "$fault_arr",
          preserveNullAndEmptyArrays: true,
        },
      },
    // {
    //   $match: {
    //     fault_arr: {
    //       $ne: null,
    //     },
    //   },
    // },
    {
      $project: {
        _id: 1,
        goodCount: 1,
        reject_count: 1,
        shift_wise:1,
        blocked: {
            $round: [
              {
                $divide: ["$blocked", 60],
              },
              0,
            ],
          },
        blocked_count: 1,
        waiting: {
            $round: [
              {
                $divide: ["$waiting", 60],
              },
              0,
            ],
        },
        waiting_count: 1,
        manual_stop: {
            $round: [
              {
                $divide: ["$manual_stop", 60],
              },
              0,
            ],
        },
        manual_stop_count: 1,
        pdt: {
            $round: [
              {
                $divide: ["$pdt", 60],
              },
              0,
            ],
        },
        pdt_count: 1,
        updt: {
            $round: [
              {
                $divide: ["$updt", 60],
              },
              0,
            ],
        },
        updt_count: 1,
        changeover: {
            $round: [
              {
                $divide: ["$changeover", 60],
              },
              0,
            ],
        },
        changeover_count: 1,
        fault: {
            $round: [
              {
                $divide: ["$fault", 60],
              },
              0,
            ],
        },
        fault_count: 1,
        total_batch_duration: 1,
        fault_arr: {
          count: "$fault_arr.count",
          fault_name: "$fault_arr.fault_name",
          duration: {
            $round: [
              {
                $divide: ["$fault_arr.duration", 60],
              },
              2,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: {
          machine_name: "$_id",
          fault_name: "$fault_arr.fault_name"
        },
        duration: { $sum: "$fault_arr.duration" },
        count: { $sum: "$fault_arr.count" },
        parent_arr:{
            $push:{
          goodCount: "$goodCount",
          reject_count: "$reject_count",
          blocked: "$blocked",
          blocked_count: "$blocked_count",
          waiting: "$waiting",
          waiting_count: "$waiting_count",
          manual_stop: "$manual_stop",
          manual_stop_count: "$manual_stop_count",
          pdt: "$pdt",
          pdt_count: "$pdt_count",
          updt: "$updt",
          updt_count: "$updt_count",
          changeover: "$changeover",
          changeover_count: "$changeover_count",
          fault: "$fault",
          fault_count: "$fault_count",
          total_batch_duration: "$total_batch_duration",
          shift_wise:"$shift_wise"
            }
        }
      },
    },
    {
      $group: {
        _id: "$_id.machine_name",
        fault_arr: {
          $push: {
            fault_name: "$_id.fault_name",
            duration: {
                $round: [
                  "$duration",
                  2,
                ],
              },
            count: "$count",
          },
        },
        parent_arr:{$addToSet:"$parent_arr"},
      },
    },
    {
        $project:{
            machine_name:"$_id",
            fault_arr:"$fault_arr",
            parent_arr:{ $arrayElemAt: ["$parent_arr", 0] }
        }
    },
    {
        $project:{
            machine_name:"$_id",
            fault_arr:"$fault_arr",
            parent_arr:{ $arrayElemAt: ["$parent_arr", 0] }
        }
    },
    {
        $unwind: {
          path: "$parent_arr",
          preserveNullAndEmptyArrays: true,
        },
    },
    {
     $project:{
      machine_name:1,
      fault_arr:1,
      goodCount: "$parent_arr.goodCount",
      reject_count: "$parent_arr.reject_count",
      blocked: "$parent_arr.blocked",
      blocked_count: "$parent_arr.blocked_count",
      waiting: "$parent_arr.waiting",
      waiting_count: "$parent_arr.waiting_count",
      manual_stop: "$parent_arr.manual_stop",
      manual_stop_count: "$parent_arr.manual_stop_count",
      pdt: "$parent_arr.pdt",
      pdt_count: "$parent_arr.pdt_count",
      updt: "$parent_arr.updt",
      updt_count: "$parent_arr.updt_count",
      changeover: "$parent_arr.changeover",
      changeover_count: "$parent_arr.changeover_count",
      fault: "$parent_arr.fault",
      fault_count: "$parent_arr.fault_count",
      total_batch_duration: "$parent_arr.total_batch_duration",
     }

    }
  ]);
  var send_arr = [];
  //res.send(data)
  data.forEach((element,i) => {
    send_data = {}
    var machine_temp = tempGood.find(data=> data.machine == element._id);
    var machine_condition = condition.find(data=> data.machine == element._id);
    var current_good_count = machine_temp.current_good_value - machine_temp.shift_start_good_count;   
    var current_reject_count = machine_temp.current_reject_value - machine_temp.shift_start_reject_count; 
    element.goodCount += current_good_count;
    element.reject_count += current_reject_count;
    var current_duration = moment().diff(moment(machine_condition.last_update), "minutes");
    if(machine_condition.condition =='fault'){
        element['fault'] = element[machine_condition.condition] + current_duration;
        element['fault_count'] += 1;
        var check_code = element.fault_arr.find(data=>data.fault_name == machine_condition.code);
        var check_index = element.fault_arr.findIndex(data=>data.fault_name == machine_condition.code);
        if(check_code){
            var check_data = {
              duration:check_code.duration+=current_duration,
              count:check_code.count+=1,
              fault_name:check_code.fault_name
            }
            element.fault_arr[check_index] = check_data;
        }else{
            element.fault_arr.push({
              duration:current_duration,
              count:1,
              fault_name:machine_condition.code
          })
        }
    }
    var sort_arr = element.fault_arr.sort((a,b)=>{
        return b.duration - a.duration
    });
    var cal_data = calculation(element.goodCount,element.reject_count,element.total_batch_duration,element.pdt,element.changeover,element.updt,element.fault,element.fault_count,batch_data.product_name.rated_speed)
    send_data['fault'] = `${element.fault} / ${element.fault_count}`; 
    send_data['batch'] = batch_data.batch;
    send_data['batch_size'] = batch_data.batch_size;
    send_data['target_quantity'] = 360 * batch_data.product_name.tablet_per_blister * batch_data.product_name.blister_per_format * batch_data.product_name.machine_cycle;
    send_data['product'] = batch_data.product_name.product_name;
    send_data['fgex'] = batch_data.product_name.fgex;
    send_data['product_id'] = batch_data.product_name
    send_data['total_count'] = element.goodCount + element.reject_count;
    send_data['waiting'] = `${element.waiting} / ${element.waiting_count}`; 
    send_data['count'] = `${element.goodCount} / ${element.reject_count}`
    send_data['blocked'] = `${element.blocked} / ${element.blocked_count}`;
    send_data['changeover_time'] = `${element.changeover} / ${element.changeover_count}`;
    send_data['manual_stop'] = `${element.manual_stop} / ${element.manual_stop_count}`;
    send_data['pdt'] = `${element.pdt} / ${element.pdt_count}`;
    send_data['shift'] = shift;
    send_data['updt'] = `${element.updt} / ${element.updt_count}`;
    send_data['batch_oee']= (cal_data.oee * 100).toFixed(2);
    send_data['batch_aviability'] = (cal_data.aviability* 100).toFixed(2);
    send_data['batch_performance'] = (cal_data.performance * 100).toFixed(2);
    send_data['batch_quality'] = (cal_data.quality* 100).toFixed(2);
    send_data['batch_mttr'] = cal_data.mttr.toFixed(2);
    send_data['batch_mtbf'] = cal_data.mtbf.toFixed(2);
    send_data['condition']= machine_condition.condition,
    send_data['mode'] =  machine_temp.mode;
    send_data['current_timeStamp'] = moment().local().format();
    send_data['speed_blisters'] = machine_temp.bpm;
    send_data['machine'] = element._id;
    var count = 1;
    sort_arr.forEach(fault => {
       if(fault.fault_name){
        send_data[`fault_${count}`] =  `${fault_obj[element._id][fault.fault_name]} ${fault.duration} / ${fault.count}`;
        count ++
       }
    });
    send_arr.push(send_data);
    if(send_arr.length == (i+1)){
        res.send(send_arr)
    }
  });
});

function calculation(goodCount,reject_count,total_batch_time,pdt,changeover,updt,fault,fault_count,rated_speed){
    var data = {}
    var total_count = goodCount + reject_count;
    var working_time = total_batch_time - pdt - changeover - updt;
    data.performance = checkValidation(total_count / (rated_speed * (working_time - fault)));
    data.quality = checkValidation(goodCount / total_count);
    data.aviability = checkValidation((working_time - fault) / working_time);
    data.oee = data.quality * data.aviability * data.performance;
    data.mtbf = checkValidation(working_time / fault_count);
    data.mttr = checkValidation(fault / fault_count)
    return data
  }
//
function checkValidation(value) {
  if (value < 0 || value === Infinity || !value) {
    return 0;
  } else if (value > 1) {
    return 1;
  } else {
    return value;
  }
}

function convertMinute(seconds) {
  return Math.round(seconds / 60);
}




///////////////







module.exports = router;





