var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var router = express.Router();
var { CurrentShift } = require("../model/shift.model");
var { Project } = require("../model/project.model");
var { TempGood } = require("../model/goodTemp.model");
var { Condition } = require("../model/status.model");
var {FGEX} = require("../model/fgex.model")
var fault_obj = {
    cam_blister:{
        fault_1:"Singnal Red",
        fault_13:"test"
    }
}
router.get("/", async (req, res) => {
  var data = await CurrentShift();
  var shift = data.shift;
  var d = data.date;
  var end = moment(d).format("YYYY-MM-DD");
  var line_id = req.query.line_id;
  var batch = "5e54a412ddf58e3866836791";
  var total_time = data.total_time;
  var tempGood = await TempGood.find({ line_id: line_id });
  var condition = await Condition.find({ line_id: line_id });
  var fgex = await Fgex.find()
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
              $gte: new Date("2020-04-2020"),
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
      $lookup: {
        from: "batchs",
        localField: "shift_wise.batch_wise.batch",
        foreignField: "_id",
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
      $unwind: {
        path: "$shift_wise.batch_wise.machine_wise",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        line_id: "$line_id",
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
          $ifNull: ["$operator_name", "Not Defied in Database"],
        },
        batch_start: "$shift_wise.batch_wise.start_timestamp", //{$dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L+05:30", date: "$shift_wise.batch_wise.start_timestamp", timezone: "+05:30" }},//,
        batch_end: {
          $ifNull: ["$shift_wise.batch_wise.end_timestamp", new Date()],
        },
        rated_speed: {
          $ifNull: ["$batch", 60],
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
        _id: "$machine_name",
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
      $match: {
        fault_arr: {
          $ne: null,
        },
      },
    },
    {
      $project: {
        _id: 1,
        goodCount: 1,
        reject_count: 1,
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
          fault_name: "$fault_arr.fault_name",
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
        },
        duration: { $sum: "$fault_arr.duration" },
        count: { $sum: "$fault_arr.count" },
      },
    },
    {
      $group: {
        _id: "$_id.machine_name",
        goodCount: { $avg: "$_id.goodCount" },
        reject_count:{ $avg: "$_id.reject_count" },
        blocked: { $avg: "$_id.blocked" },
        blocked_count: { $avg: "$_id.blocked_count" },
        waiting: { $avg: "$_id.waiting" },
        waiting_count: { $avg: "$_id.waiting_count" },
        manual_stop: { $avg: "$_id.manual_stop" },
        manual_stop_count: { $avg: "$_id.manual_stop_count" },
        pdt: { $avg: "$_id.pdt" },
        pdt_count: { $avg: "$_id.pdt_count" },
        updt: { $avg: "$_id.updt" },
        updt_count: { $avg: "$_id.updt_count" },
        changeover: { $avg: "$_id.changeover" },
        changeover_count: { $avg: "$_id.changeover_count" },
        fault: { $avg: "$_id.fault" },
        fault_count: { $avg: "$_id.fault_count" },
        total_batch_duration: { $avg: "$_id.total_batch_duration" },
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
      },
    },
  ]);
  var send_arr = [];
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
        element['fault'] = element[machine_condition.condition]['duration'] + current_duration;
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
    var cal_data = calculation(element.goodCount,element.reject_count,element.total_batch_duration,element.pdt,element.changeover,element.updt,element.fault,element.fault_count,60)
    send_data['fault'] = `${element.fault} / ${element.fault_count}`; 
    send_data['batch'] = "-",
    send_data['target_quantity'] = "-",
    send_data['product'] = "-",
    send_data['format'] = "-",
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
        send_data[`fault_${count}`] =  `${fault_obj[element._id][fault.fault_name]} ${fault.duration} / ${fault.count}`;
        count ++
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
module.exports = router;
