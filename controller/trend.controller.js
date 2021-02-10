var express = require('express');
var router = express.Router();
var moment = require('moment');
var mongoose = require('mongoose')
var Project = require('../model/project.model');
var { Stop, aggregate } = require('../model/stop.model');
//var { History } = require('../model/datahistroy.model')
var { CurrentShift, Shift } = require('../model/shift.model');
const major_minor_duration = 5;
//var { conveyormachine } = require("../model/equipment.model");
//var {getReworkDateRange,getReworkShiftWise} = require('../model/rework.model');

router.get('/daywise', async (req, res) => {
    var project_start = req.query['startDate'] + 'T00:00:00.000+00:00';
    var project_end = req.query['endDate'] + 'T00:00:00.000+00:00';
    var project = await Project.aggregate([{
        $match: {
            machine_name: "filler",
            $and: [{
                "date": {
                    $lte: new Date(project_end)
                }
            }, {
                "date": {
                    $gte: new Date(project_start)
                }
            },]
        }
    },
    {
        $group: {
            _id: "$date",
            goodCount: {
                $sum: "$goodCount"
            },
            rejected_quantity: {
                $sum: "$rejected_quantity"
            },
            critical_machine_off_time: {
                $sum: "$critical_machine_off_time"
            },
            critical_machine_off: {
                $sum: "$critical_machine_off"
            },
            blocked: {
                $sum: "$blocked"
            },
            waiting: {
                $sum: "$waiting"
            },
            no_of_stop: {
                $sum: "$no_of_stop"
            },
            pdt: {
                $sum: "$pdt"
            },
            fault: {
                $sum: "$stop"
            },
        }
    },
    {
        $sort: {
            _id: 1
        }
    },
    ]);
    var rated_speed = 16;
    var total_time = 1440;
    var send_data = [];
    var para = req.query.parameter.split(',');;
    para.forEach(data => {
        send_data.push({
            name: data,
            data: []
        })
    });
    project.forEach((data) => {
        var push_data = {};
        var fault_time = data.fault.toFixed(2);
        var fault_count = data.no_of_stop;
        var waiting_time = data.waiting.toFixed(2);
        var blocked_time = data.blocked.toFixed(2);
        var pdt = data.pdt.toFixed(2);
        var working_time = total_time - pdt;
        var total_working_time = working_time - fault_time;
        var aviability = (working_time - fault_time) / working_time;
        var total_count = data.goodCount + data.rejected_quantity;
        var performance = total_count / (rated_speed * (working_time - fault_time));
        var quality = data.goodCount / total_count;
        var break_down = fault_time / total_time;
        if (aviability < 0 || aviability == Infinity) {
            aviability = 0;
        }
        if (!performance || performance == Infinity || performance < 0) {
            performance = 0;
        }
        if (performance > 1) {
            performance = 1;
        }
        if (break_down > 1) {
            performance = 1;
        }
        if (!quality || quality == Infinity || quality < 0) {
            quality = 0;
        }
        if (!break_down || break_down == Infinity || break_down < 0) {
            break_down = 0;
        }
        if (quality > 1) {
            quality = 1
        }
        var oee = aviability * performance * quality;
        if (!oee || oee == Infinity || oee < 0) {
            oee = 0;
        }
        if (oee > 1) {
            oee = 1;
        }
        push_data['date'] = data._id;
        var timestamp = moment(data._id).unix() * 1000;
        push_data['machine_name'] = "Filler",
            push_data['oee'] = Number((oee * 100).toFixed(2));
        push_data['break_down'] = Number((break_down * 100).toFixed(2));
        push_data['performance'] = Number((performance * 100).toFixed(2));
        push_data['fault_time'] = Number(fault_time);
        push_data['waiting_time'] = Number(waiting_time);
        push_data['aviability'] = Number((aviability * 100).toFixed(2));
        push_data['quality'] = Number((quality * 100).toFixed(2));
        push_data['no_of_stop'] = Number(fault_count);
        push_data['good_count'] = Number(data.goodCount);
        push_data['total_count'] = Number(total_count);
        push_data['rejected_quantity'] = Number(data.rejected_quantity);
        para.forEach(parameter => {
            var parameter_find = send_data.find(data => data.name == parameter);
            parameter_find.data.push([timestamp, push_data[parameter]]);
        });
        //send_data.push([timestamp,Number((oee * 100).toFixed(2))])
    })
    res.send(send_data)
});
router.get('/shiftwise', async (req, res) => {
    var project_start = req.query['startDate'] + 'T00:00:00.000+00:00';
    var project_end = req.query['endDate'] + 'T00:00:00.000+00:00';
    var send_data = [];
    var para = req.query.parameter.split(',');;
    para.forEach(data => {
        send_data.push({
            name: data,
            data: []
        })
    });
    var project = await Project.find({
        machine_name: "filler",
        date: {
            $lte: new Date(project_end),
            $gte: new Date(project_start)
        }
    }).sort({
        date: 1,
        shiftName: 1
    });
    var rated_speed = 16;
    var total_time = 720;

    project.forEach((data) => {
        var push_data = {};
        var fault_time = data.stop.toFixed(2);
        var fault_count = data.no_of_stop;
        var waiting_time = data.waiting.toFixed(2);
        var blocked_time = data.blocked.toFixed(2);
        var pdt = data.pdt.toFixed(2);
        var working_time = total_time - pdt;
        var total_working_time = working_time - fault_time;
        var aviability = Number((working_time - fault_time) / working_time).toFixed(2);
        var total_count = data.goodCount + data.rejected_quantity;
        var performance = Number(total_count / (rated_speed * (working_time - fault_time))).toFixed(2);
        var quality = Number(data.goodCount / total_count).toFixed(2);
        var break_down = fault_time / total_time;
        if (aviability < 0 || aviability == Infinity) {
            aviability = 0;
        }
        if (!performance || performance == Infinity || performance < 0) {
            performance = 0;
        }
        if (performance > 1) {
            performance = 1;
        }
        if (break_down > 1) {
            performance = 1;
        }
        if (!quality || quality == Infinity || quality < 0) {
            quality = 0;
        }
        if (!break_down || break_down == Infinity || break_down < 0) {
            break_down = 0;
        }
        if (quality > 1) {
            quality = 1
        }
        var oee = Number(aviability * performance * quality).toFixed(2);
        if (!oee || oee == Infinity || oee < 0) {
            oee = 0;
        }
        if (oee > 1) {
            oee = 1;
        }
        var timestamp;
        if (data.shiftName == 'Shift A') {
            timestamp = moment(data.date).add(8, 'hours').unix() * 1000;
        } else {
            timestamp = moment(data.date).add(20, 'hours').unix() * 1000;
        }

        push_data['performance'] = Number((performance * 100).toFixed(2));
        push_data['break_down'] = Number((break_down * 100).toFixed(2));
        push_data['oee'] = Number((oee * 100).toFixed(2));
        push_data['fault_time'] = Number(fault_time);
        push_data['waiting_time'] = Number(waiting_time);
        push_data['aviability'] = Number((aviability * 100).toFixed(2));
        push_data['quality'] = Number((quality * 100).toFixed(2));
        push_data['no_of_stop'] = Number(fault_count);
        push_data['good_count'] = Number(data.goodCount);
        push_data['total_count'] = Number(total_count);
        push_data['rejected_quantity'] = Number(data.rejected_quantity);
        para.forEach(parameter => {
            var parameter_find = send_data.find(data => data.name == parameter);
            parameter_find.data.push([timestamp, push_data[parameter], data.shiftName]);
        });
        //send_data.push([timestamp,Number((oee * 100).toFixed(2)),push_data['shift']]);
    });
    res.send(send_data)

});
router.get('/oeeloss', async (req, res) => {
    var project_start = req.query['startDate'] + 'T00:00:00.000+00:00';
    var project_end = req.query['endDate'] + 'T00:00:00.000+00:00';
    var project = await Project.aggregate(
        [{
            $match: {
                $and: [{
                    "date": {
                        $lte: new Date(project_end)
                    }
                }, {
                    "date": {
                        $gte: new Date(project_start)
                    }
                },]
            }
        },
        {
            $project: {
                machine_name: 1,
                duration: {
                    $cond: {
                        if: {
                            $eq: ["$machine_name", "filler"]
                        },
                        then: {
                            $round: ["$stop", 2]
                        },
                        else: {
                            $round: ["$critical_machine_off_time", 2]
                        }
                    }
                },
            }
        },
        // Stage 1
        {
            $group: {
                _id: "$machine_name",
                sum: {
                    $sum: "$duration"
                },
            }
        },
        // Stage 2
        {
            $group: {
                _id: null,
                total_sum: {
                    $sum: "$sum"
                },
                machine_name: {
                    $push: {
                        machine_name: "$_id",
                        duration: "$sum"
                    }
                }
            }
        },
        // Stage 3
        {
            $unwind: {
                path: "$machine_name",

            }
        },
        {
            $project: {
                _id: 0,
                name: "$machine_name.machine_name",
                duration: {
                    $round: ["$machine_name.duration", 2]
                },
                "y": {
                    $round: [{
                        $multiply: [{
                            $divide: ["$machine_name.duration", "$total_sum"]
                        }, 100]
                    }, 2]
                },
                "drilldown": "$machine_name.machine_name"
            }
        },
        {
            $match: {
                "duration": {
                    $gt: 0
                }
            }
        },
        {
            $sort: {
                duration: -1
            }
        }
        ]
    );
    res.send(project)
});
router.get('/shift', async (req, res) => {
    var date = req.query['date'] + 'T00:00:00.000Z';
    var shift = req.query.shift;
    var type = req.query.type;
    var line_id = req.query.line_id;
    var total_time, start_timestamp, end_timestamp, shift;
    var current_shift = await Shift.findOne({ shiftName: shift });
    var machie_arr = [];
    if (type == "machine") {
        var data = await Project.findOne({ shiftName: shift, date: req.query['date'] + "T00:00:00Z" }).populate({ path: 'sku', select: { _id: 0, equipments: 1 }, populate: { path: 'equipments', select: { _id: 0, equipment_name: 1 } } });
        if (!data) {
            res.send({
                line_id: line_id,
                shiftname: shift,
                shiftStartime: start_timestamp,
                shiftEndime: end_timestamp,
                data: []

            })
            return
        }
        data.sku.equipments.forEach(element => {
            machie_arr.push(element.equipment_name)
        });
    } else {
        machie_arr = await conveyormachine()
    }
    start_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftStartTime * 60000).format('HH:mm:ss');
    if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
        end_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss');
    } else {
        end_timestamp = moment(req.query['date']).add(1, 'days').format('YYYY-MM-DD') + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss')
    }
    var current_timestamp = moment().local().format();
    var project = await Project.aggregate([
        {
            $match: {
                machine_name: { "$in": machie_arr },
                shiftName: shift,
                date: new Date(date)
            }
        },
        {
            $addFields: {
                rated_speed: {
                    $switch: {
                        "branches": [
                            { "case": { $eq: ['$machine_name', 'tmgcp'] }, then: 12 },
                            { "case": { $eq: ['$machine_name', 'weigher_case_sealer'] }, then: 12 },
                            { "case": { $eq: ['$machine_name', 'pallet_id'] }, then: 0.2315 },
                            { "case": { $eq: ['$machine_name', 'palletizer'] }, then: 0.2315 },
                        ],
                        "default": 60
                    }
                }
            }
        },
        {
            $lookup:
            {
                from: 'stops',
                let: { machine_name: "$machine_name" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$machine_name", "$$machine_name"] },

                                    {
                                        $or: [
                                            {

                                                $and: [
                                                    {
                                                        $lte: ["$start_time", new Date(start_timestamp)]
                                                    },
                                                    {
                                                        $gte: ["$end_time", new Date(start_timestamp)]
                                                    }
                                                ],
                                                $and: [
                                                    {
                                                        $lte: ["$start_time", new Date(end_timestamp)],
                                                    },
                                                    {
                                                        $gte: ["$end_time", new Date(end_timestamp)]

                                                    },
                                                ],
                                                $and: [

                                                    {
                                                        $gte: ["$start_time", new Date(start_timestamp)],
                                                    },
                                                    {
                                                        $lte: ["$end_time", new Date(end_timestamp)]

                                                    },

                                                ],

                                            }
                                        ]
                                    }
                                ],
                            }

                        }
                    },

                ],
                as: 'stops'
            }
        },
        // {
        //     $lookup: {
        //         from: 'equipment',
        //         localField: 'machine_name',
        //         foreignField: 'equipment_name',
        //         as: 'equipments'
        //     }
        // },
        // {
        // $lookup: {
        // from: 'status',
        // localField: 'machine_name',
        // foreignField: 'machine_name',
        // as: 'condition'
        // }
        // },
        // {
        //     $unwind:{
        //         path:'$equipments',
        //         preserveNullAndEmptyArrays: true

        //     }
        // },
        // {
        //     $lookup: {
        //         from: 'skumasters',
        //         let: {
        //             sku_name: "$current_sku",
        //             equipment: "$equipments._id"
        //         },
        //         pipeline: [
        //             {
        //                 $match: {
        //                     $expr: {
        //                         $eq: ['$sku_name', '$$sku_name'],
        //                     }
        //                 }
        //             },
        //             {
        //                 $project:{
        //                     equipment_id:{
        //                         "$toObjectId":"$$equipment"
        //                     },
        //                     equipment:1
        //                 }
        //             },
        //             {
        //                 $project:
        //                     { 
        //                         items: {
        //                              $filter: { 
        //                                  input: "$equipment",
        //                                   as: "equipment", 
        //                                   cond: { $eq: ["$$equipment.equipment_name", '$equipment_id'] } 
        //                                 } 
        //                             } 
        //                         }
        //             },
        //             {
        //                 $unwind:{
        //                     path:'$items',
        //                     preserveNullAndEmptyArrays: true

        //                 }
        //             },

        //         ],
        //         as: 'sku'
        //     }
        // },

        // {
        //     $unwind:{
        //         path: "$equipment",
        //     }
        // },
        // {
        //     $lookup:{
        //         from:'equipment',
        //         localField:'equipment.equipment_name',
        //         foreignField:'_id',
        //         as:'equipment'
        //     }
        // },
        // {
        //     $unwind:{
        //         path:'$sku',
        //         preserveNullAndEmptyArrays: true

        //     }
        // },
        {
            $project: {
                //rated_speed: "$sku.items.rated_speed",
                //equipment: "$equipments",
                machine_name: 1,
                condition: 1,
                rated_speed: 1,
                critical_machine_off: 1,
                critical_machine_off_time: 1,
                goodCount: 1,
                rejected_quantity: 1,
                bpm: 1,
                mode: 1,
                stop: "$stops",
            }
        }/* , {
            $project: {
                rated_speed: 1,
                equipment: 1,
                machine_name: 1,
                rated_speed: 1,
                condition: 1,
                goodCount: 1,
                bpm:1,
                mode:1,
                rejected_quantity: 1,
                critical_machine_off: 1,
                critical_machine_off_time: 1,
                fault: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'fault'] }
                    }
                },
                waiting: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'waiting'] }
                    }
                },
                blocked: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'blocked'] }
                    }
                },
                manual_stop: {
                    $filter: {
                        input: "$stop",
                        as: "stop",
                        cond: { $eq: ["$$stop._id", 'manual_stop'] }
                    }
                },
            }
        },
        {
            $unwind: {
                path: '$fault',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$blocked',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$manual_stop',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$condition',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$waiting',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $project: {
                fault: { $ifNull: ["$fault", 0] },
                blocked: 1,
                manual_stop: 1,
                waiting: { $ifNull: ["$waiting", 0] },
                critical_machine_off: 1,
                condition: 1,
                goodCount: 1,
                bpm:1,
                mode:1,
                rejected_quantity: 1,
                rated_speed: 1,
                critical_machine_off_time: 1,
                lack_1: {
                    $filter: {
                        input: "$waiting.stop_breakup",
                        as: "stop",
                        cond: { $eq: ["$$stop.stop_name", 'waiting_1'] }
                    }
                },
                lack_2: {
                    $filter: {
                        input: "$waiting.stop_breakup",
                        as: "stop",
                        cond: { $eq: ["$$stop.stop_name", 'waiting_2'] }
                    }
                },
                machine_name: 1
            }
        }, 
        {
            $unwind: {
                path: '$lack_1',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$lack_2',
                preserveNullAndEmptyArrays: true

            }
        },
        
        {
            $project: {
                aviability: {
                    $cond: [{ $lte: ['$fault', 0] }, 100, {
                        $round: [{
                                $divide: [{
                                    $subtract: [
                                        total_time,
                                        '$fault.total'
                                    ]
                                }, total_time]
                        }, 2]
                    }]
                },
                performance: {
                    $cond: [{
                        $or: [
                            { $lte: [{
                                $subtract: [
                                    total_time,
                                    '$fault.total'
                                ]
                            }, 0] },
                            { $lte: ['$goodCount', 0] },
                        ]
                    }, 0, {
                        $round: [{
                                $divide: ['$goodCount', {
                                    $multiply: [
                                        {
                                            $subtract: [
                                                total_time,
                                                '$fault.total'
                                            ]
                                        },
                                        '$rated_speed'
                                    ]
                                }]
                        }, 2]
                    }]
                },
                quality: {
                    $cond: [{ $lte: ["$goodCount", 0] }, 0, {
                        $round: [{
                                $divide: ['$goodCount', {
                                    $sum: [
                                        '$goodCount',
                                        '$rejected_quantity'
                                    ]
                                }]

                        }, 2]
                    }]
                },
                mttr:{
                    $cond: [{ $lte: ['$fault', 0] }, 'N/A', {
                        $round: [{
                                $divide: ['$fault.total','$fault.count']
                        }, 2]
                    }]
                },
                mtbf:{
                    $cond: [{ $lte: ['$fault', 0] }, 0, {
                        $round: [{
                                $divide: [total_time,'$fault.count']
                        }, 2]
                    }]
                },
                lack_1: { $ifNull: [{$concat:[{$toString:"$lack_1.stop_count"},"/",{$toString:"$lack_1.stop_total"}]}, "0/0"] },
                lack_2:  { $ifNull: [{$concat:[{$toString:"$lack_2.stop_count"},"/",{$toString:"$lack_2.stop_total"}]}, "0/0"] }, 
                machine_name:"$machine_name",
                total_count:'$goodCount',
                blocked:{ $ifNull: [{$concat:[{$toString:"$blocked.count"},"/",{$toString:"$blocked.total"}]}, "0/0"] },
                filler_min:{$round:['$critical_machine_off_time',2]},
                filler_stop:{$round:['$critical_machine_off',2]},
                shift: shift,
                no_of_stop:{ $ifNull: ["$fault.count", 0] },
                bpm:"$bpm",
                fault_duration:"$fault.total",
                mode:"$mode",/////
                condition:"$condition.current_condition",
                current_timestamp:current_timestamp,
                rejected_quantity:1,
            },
        },
        {
            $project:{
                oee:{
                    $round:[{
                        $multiply:['$performance','$quality','$aviability',100]
                    },2]
                    
                },
                lack_1: 1,
                lack_2:  1,
                performance:{$multiply:['$performance',100]},
                quality:{$multiply:['$quality',100]},
                aviability:{$multiply:['$aviability',100]},
                machine:'$machine_name',
                total_count:1,
                blocked:1,
                filler_min:1,
                filler_stop:1,
                shift: shift,
                time_loss:"0",
                bottle_loss:"0",
                bpm:1,
                mttr:1,
                no_of_stop:1,
                mode:"$mode",
                mtbf:1,
                condition:1,
                fault_duration:1,
                total_time:{ $ifNull: [total_time, 0] },
                current_timestamp:current_timestamp,
                rejected_quantity:1,
            }
        } */
    ]);
    res.send(project)

});
router.get('/faultwise', async (req, res) => {
    var startDate = req.query['startDate'] + 'T08:00:00+05:30';
    var end = req.query['endDate'] + 'T08:00:00+05:30';
    var machine_name = req.query['machine']
    var start = moment(start)
    var endDate = moment(end).local().add(1, 'day').format();
    var stop = await Stop.aggregate([{
        $match: {
            stop_name: /^fault_/,
            machine_name: machine_name,
            $or: [
                {
                    end_time: null
                },
                {
                    $and: [
                        {
                            "start_time": {
                                $lte: new Date(startDate)
                            }
                        }, {
                            "end_time": {
                                $gte: new Date(startDate)
                            }
                        }
                    ]
                }, {
                    $and: [
                        {
                            "start_time": {
                                $lte: new Date(endDate)
                            }
                        }, {
                            "end_time": {
                                $gte: new Date(endDate)
                            }
                        }
                    ]
                }, {
                    $and: [
                        {
                            "start_time": {
                                $gte: new Date(startDate)
                            }
                        }, {
                            "end_time": {
                                $lte: new Date(endDate)
                            }
                        }
                    ]
                }
            ]
        }
    }, {
        $project: {
            stop_name: 1,
            machine_name: 1,
            start: {
                $cond: { if: { $lt: ["$start_time", new Date(startDate)] }, then: new Date(startDate), else: "$start_time" }
            },
            end: {
                $switch: {
                    "branches": [
                        { "case": { $eq: ["$end_time", null] }, then: new Date() },
                        { "case": { $gt: ["$end_time", new Date(endDate)] }, then: new Date(endDate) }
                    ],
                    "default": "$end_time"
                }
            }
        }
    },
    {
        $project: {
            stop_name: 1,
            machine_name: 1,
            dateDifference: {
                $divide: [{
                    $subtract: ["$end", "$start"]
                }, (1000 * 60)
                ]
            }

        }
    },
    {
        $group: {
            _id: "$stop_name",
            sum: {
                $sum: "$dateDifference"
            },
        }
    },
    {
        $group: {
            _id: null,
            total_sum: {
                $sum: "$sum"
            },
            stop_name: {
                $push: {
                    stop_name: "$_id",
                    duration: "$sum"
                }
            }
        }
    },
    {
        $unwind: {
            path: "$stop_name",

        }
    },
    {
        $project: {
            _id: 0,
            name: "$stop_name.stop_name",
            duration: {
                $round: ["$stop_name.duration", 2]
            },
            "y": {
                $round: [{
                    $multiply: [{
                        $divide: ["$stop_name.duration", "$total_sum"]
                    }, 100]
                }, 2]
            },
        }
    },
    {
        $match: {
            duration: {
                $gt: 1
            }
        }
    },
    {
        $sort: {
            duration: -1
        }
    },
    ]);
    res.send(stop)
});

router.get('/state_wise_report', async (req, res) => {
    var date = req.query['date'] + 'T00:00:00.000Z';
    var shift = req.query.shift;
    var state = new RegExp(req.query.machine_state);
    console.log(state)
    var total_time, start_timestamp, end_timestamp, shift;
    var current_shift = await Shift.findOne({ shiftName: shift });
    start_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftStartTime * 60000).format('HH:mm:ss');
    if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
        end_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss');
    } else {
        end_timestamp = moment(req.query['date']).add(1, 'days').format('YYYY-MM-DD') + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss')
    }
    var current_timestamp = moment().local().format();
    if (req.query.machine_state == "all") {
        var project = await Stop.aggregate([
            {
                $match: {
                    //stop_name: state,
                    $or: [
                        {
                            end_time: null
                        },
                        {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'statusnames',
                    localField: 'stop_name',
                    foreignField: 'fault_code',
                    as: 'status_name'
                }
            },
            {
                $lookup: {
                    from: 'equipment',
                    localField: 'machine_name',
                    foreignField: 'equipment_name',
                    as: 'machine_name'
                }
            },
            {
                $lookup: {
                    from: 'comments',
                    let: { "stop_id": "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
                        {
                            $lookup: {
                                from: 'faultcauses',
                                let: { 'selected_causes': '$selected_causes' },
                                pipeline: [
                                    { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                                ],
                                as: "selected_causes"
                            }
                        },
                        {
                            $project: {
                                selected_causes: 1,
                                parts: 1,
                                user_comment:
                                {
                                    $map:
                                    {
                                        input: "$user_comment",
                                        as: "comment",
                                        in: {
                                            username: "$$comment.user_name",
                                            comment: "$$comment.comment",
                                            comment_date: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$$comment.timestamp", timezone: "+04:00" } }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    as: "comments"
                }
            },
            {
                $lookup: {
                    from: 'rosters',
                    let: { "date": "$date", "shift":"$shift"},
                    pipeline: [
                        { $match: { $expr: { $eq: ["$date", "$$date"] } } },
                        // {
                        //     $project: {
                        //          operator: {
                        //             $filter: {
                        //               input: "$shift_wise",
                        //               as: "shift_name",
                        //               cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                        //             },
                        //           }
                        //     }
                        // },
                        // {
                        //     $lookup: {
                        //         from: 'faultcauses',
                        //         let: { 'selected_causes': '$selected_causes' },
                        //         pipeline: [
                        //             { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                        //         ],
                        //         as: "selected_causes"
                        //     }
                        // },
                    ],
                    as: "roster"
                }
            },
            {
                $unwind: {
                    path: '$status_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$roster',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$machine_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$comments',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $project: {
                    start_time: {
                        $switch: {
                            "branches": [
                                { "case": { $lte: ["$start_time", new Date(start_timestamp)] }, then: new Date(start_timestamp) },
                                { "case": { $gt: ["$start_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$start_time"
                        }
                    },
                    end_time: {
                        $switch: {
                            "branches": [
                                { "case": { $eq: ["$end_time", null] }, then: new Date(end_timestamp) },
                                { "case": { $gt: ["$end_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$end_time"
                        }
                    },
                    machine_name: "$machine_name.display_name",
                    status_name: '$status_name',
                    roster:"$roster",
                    parts: {
                        $reduce: {
                            'input': '$comments.parts',
                            'initialValue': '',
                            'in': {
                                '$concat': [
                                    '$$value',
                                    { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                    '$$this']
                            }
                        }
                    },
                    selected_causes: "$comments.selected_causes.cause_name",
                    user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
                    stop_name: 1,
                }
            },
            {
                $lookup: {
                    from: 'batchskutriggers',
                    localField: 'batch',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $lookup: {
                    from: 'fgexes',
                    localField: 'fgex',
                    foreignField: '_id',
                    as: 'fgex'
                }
            },
            {
                $project: {
                    stop_name: 1,
                    machine_name: 1,
                    roster:1,
                    start_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$start_time", timezone: "+04:00" } },
                    end_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$end_time", timezone: "+04:00" } },
                    fault_name:{ $ifNull: ["$status_name.fault_name", "Not Define in Database"] },
                    batch:"$batch.batch",
                    fgex:"$fgex.fgex",
                    shift:"$shift",
                    date:"$date",
                    operator_name:"$roster",
                    parts: { $ifNull: ["$parts", ""] },
                    user_comment1: { $ifNull: ["$user_comment1", {}] }/* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
                    fault_cause: {
                        $ifNull: [{
                            $reduce: {
                                'input': '$selected_causes',
                                'initialValue': '',
                                'in': {
                                    '$concat': [
                                        '$$value',
                                        { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                        '$$this']
                                }
                            }
                        }, ""]
                    },
                    duration: {
                        $round: [{
                            $divide: [{
                                $subtract: ["$end_time", "$start_time"]
                            }, (1000 * 60)
                            ]
                        }, 2]
                    }
    
                }
            },
            {
                $match: {
                    $expr: {
                        $gt: ['$duration', 0]
                    }
                }
            },
        ]);
        
    } else {
        var project = await Stop.aggregate([
            {
                $match: {
                    stop_name: state,
                    $or: [
                        {
                            end_time: null
                        },
                        {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'statusnames',
                    localField: 'stop_name',
                    foreignField: 'fault_code',
                    as: 'status_name'
                }
            },
            {
                $lookup: {
                    from: 'equipment',
                    localField: 'machine_name',
                    foreignField: 'equipment_name',
                    as: 'machine_name'
                }
            },
            {
                $lookup: {
                    from: 'batchskutriggers',
                    localField: 'batch',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $lookup: {
                    from: 'fgexes',
                    localField: 'fgex',
                    foreignField: '_id',
                    as: 'fgex'
                }
            },
            {
                $lookup: {
                    from: 'comments',
                    let: { "stop_id": "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
                        {
                            $lookup: {
                                from: 'faultcauses',
                                let: { 'selected_causes': '$selected_causes' },
                                pipeline: [
                                    { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                                ],
                                as: "selected_causes"
                            }
                        },
                        {
                            $project: {
                                selected_causes: 1,
                                parts: 1,
                                user_comment:
                                {
                                    $map:
                                    {
                                        input: "$user_comment",
                                        as: "comment",
                                        in: {
                                            username: "$$comment.user_name",
                                            comment: "$$comment.comment",
                                            comment_date: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$$comment.timestamp", timezone: "+05:00" } }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    as: "comments"
                }
            },
            {
                $lookup: {
                    from: 'rosters',
                    let: { "date": new Date(date), "shift":"$shift"},
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
                                  }
                            }
                        },
                        {
                            $unwind: {
                                path: '$operator',
                                preserveNullAndEmptyArrays: true
                
                            }
                        },
                        {
                            $lookup: {
                                from: 'operators',
                                let: { 'operator_name': '$operator.operator_name' },
                                pipeline: [
                                    { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
                                ],
                                as: "operator"
                            }
                        },
                        {
                            $unwind: {
                                path: '$operator',
                                preserveNullAndEmptyArrays: true
                
                            }
                        },
                    ],
                    as: "roster"
                }
            },
            {
                $unwind: {
                    path: '$status_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$roster',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$machine_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$comments',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $project: {
                    start_time: {
                        $switch: {
                            "branches": [
                                { "case": { $lte: ["$start_time", new Date(start_timestamp)] }, then: new Date(start_timestamp) },
                                { "case": { $gt: ["$start_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$start_time"
                        }
                    },
                    end_time: {
                        $switch: {
                            "branches": [
                                { "case": { $eq: ["$end_time", null] }, then: new Date(end_timestamp) },
                                { "case": { $gt: ["$end_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$end_time"
                        }
                    },
                    machine_name: "$machine_name.display_name",
                    status_name: '$status_name',
                    batch:"$batch.batch",
                    fgex:"$fgex.fgex",
                    shift:"$shift",
                    date:"$date",
                    operator_name:"$roster.operator.display_name",
                    parts: {
                        $reduce: {
                            'input': '$comments.parts',
                            'initialValue': '',
                            'in': {
                                '$concat': [
                                    '$$value',
                                    { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                    '$$this']
                            }
                        }
                    },
                    selected_causes: "$comments.selected_causes.cause_name",
                    user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
                    stop_name: 1,
                }
            },
            {
                $unwind: {
                    path: '$batch',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$fgex',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $project: {
                    stop_name: 1,
                    machine_name: 1,
                    start_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$start_time", timezone: "+04:00" } },
                    end_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$end_time", timezone: "+04:00" } },
                    fault_name:{ $ifNull: ["$status_name.fault_name", "Not Define in Database"] },
                    parts: { $ifNull: ["$parts", ""] },
                    batch:1,
                    fgex:1,
                    shift:1,
                    date:1,
                    operator_name:{ $ifNull: ["$operator_name", 'Not Defined'] },
                    user_comment1: { $ifNull: ["$user_comment1", {}] }/* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
                    fault_cause: {
                        $ifNull: [{
                            $reduce: {
                                'input': '$selected_causes',
                                'initialValue': '',
                                'in': {
                                    '$concat': [
                                        '$$value',
                                        { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                        '$$this']
                                }
                            }
                        }, ""]
                    },
                    duration: {
                        $round: [{
                            $divide: [{
                                $subtract: ["$end_time", "$start_time"]
                            }, (1000 * 60)
                            ]
                        }, 2]
                    }
    
                }
            },
            {
                $match: {
                    $expr: {
                        $gt: ['$duration', 0]
                    }
                }
            },
        ]);
    }
    
    res.send(project)
})
router.get('/day_state_wise_report', async (req, res) => {
    var start_timestamp = req.query.startDate + 'T07:00:00';
    var date = req.query.startDate + 'T00:00:00.000Z';
    var end = req.query.endDate + 'T07:00:00';
    var state = new RegExp(req.query.machine_state);
    var end_timestamp = moment(end).utc().local().add(1, 'day').format();
    if (req.query.machine_state == "all") {
        var project = await Stop.aggregate([
            {
                $match: {
                    //stop_name: state,
                    $or: [
                        {
                            end_time: null
                        },
                        {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'statusnames',
                    localField: 'stop_name',
                    foreignField: 'fault_code',
                    as: 'status_name'
                }
            },
            {
                $lookup: {
                    from: 'equipment',
                    localField: 'machine_name',
                    foreignField: 'equipment_name',
                    as: 'machine_name'
                }
            },
            {
                $lookup: {
                    from: 'comments',
                    let: { "stop_id": "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
                        {
                            $lookup: {
                                from: 'faultcauses',
                                let: { 'selected_causes': '$selected_causes' },
                                pipeline: [
                                    { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                                ],
                                as: "selected_causes"
                            }
                        },
                        {
                            $project: {
                                selected_causes: 1,
                                parts: 1,
                                user_comment:
                                {
                                    $map:
                                    {
                                        input: "$user_comment",
                                        as: "comment",
                                        in: {
                                            username: "$$comment.user_name",
                                            comment: "$$comment.comment",
                                            comment_date: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$$comment.timestamp", timezone: "+05:30" } }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    as: "comments"
                }
            },
            {
                $lookup: {
                    from: 'rosters',
                    let: { "date": "$date", "shift":"$shift"},
                    pipeline: [
                        { $match: { $expr: { $eq: ["$date", "$$date"] } } },
                        // {
                        //     $project: {
                        //          operator: {
                        //             $filter: {
                        //               input: "$shift_wise",
                        //               as: "shift_name",
                        //               cond: { $eq: ["$$shift_name.shift_name", "$$shift"] },
                        //             },
                        //           }
                        //     }
                        // },
                        // {
                        //     $lookup: {
                        //         from: 'faultcauses',
                        //         let: { 'selected_causes': '$selected_causes' },
                        //         pipeline: [
                        //             { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                        //         ],
                        //         as: "selected_causes"
                        //     }
                        // },
                    ],
                    as: "roster"
                }
            },
            {
                $unwind: {
                    path: '$status_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$roster',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$machine_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$comments',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $project: {
                    start_time: {
                        $switch: {
                            "branches": [
                                { "case": { $lte: ["$start_time", new Date(start_timestamp)] }, then: new Date(start_timestamp) },
                                { "case": { $gt: ["$start_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$start_time"
                        }
                    },
                    end_time: {
                        $switch: {
                            "branches": [
                                { "case": { $eq: ["$end_time", null] }, then: new Date(end_timestamp) },
                                { "case": { $gt: ["$end_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$end_time"
                        }
                    },
                    machine_name: "$machine_name.display_name",
                    status_name: '$status_name',
                    roster:"$roster",
                    parts: {
                        $reduce: {
                            'input': '$comments.parts',
                            'initialValue': '',
                            'in': {
                                '$concat': [
                                    '$$value',
                                    { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                    '$$this']
                            }
                        }
                    },
                    selected_causes: "$comments.selected_causes.cause_name",
                    user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
                    stop_name: 1,
                }
            },
            {
                $lookup: {
                    from: 'batchskutriggers',
                    localField: 'batch',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $lookup: {
                    from: 'fgexes',
                    localField: 'fgex',
                    foreignField: '_id',
                    as: 'fgex'
                }
            },
            {
                $project: {
                    stop_name: 1,
                    machine_name: 1,
                    roster:1,
                    start_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$start_time", timezone: "+05:30" } },
                    end_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$end_time", timezone: "+05:30" } },
                    fault_name:{ $ifNull: ["$status_name.fault_name", "Not Define in Database"] },
                    batch:"$batch.batch",
                    fgex:"$fgex.fgex",
                    shift:"$shift",
                    date:"$date",
                    operator_name:"$roster",
                    parts: { $ifNull: ["$parts", ""] },
                    user_comment1: { $ifNull: ["$user_comment1", {}] }/* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
                    fault_cause: {
                        $ifNull: [{
                            $reduce: {
                                'input': '$selected_causes',
                                'initialValue': '',
                                'in': {
                                    '$concat': [
                                        '$$value',
                                        { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                        '$$this']
                                }
                            }
                        }, ""]
                    },
                    duration: {
                        $round: [{
                            $divide: [{
                                $subtract: ["$end_time", "$start_time"]
                            }, (1000 * 60)
                            ]
                        }, 2]
                    }
    
                }
            },
            {
                $project:{
                    stop_name: 1,
                    machine_name: 1,
                    roster:1,
                    start_time:1,
                    end_time:1,
                    fault_name:1,
                    batch:1,
                    fgex:1,
                    shift:1,
                    date:1,
                    operator_name:1,
                    user_comment1:1,
                    fault_cause:1,
                    duration:1,
                    duration_type:{
                        $cond:[
                            { $lte: ['$duration', major_minor_duration] }, "minor",
                            "major"
                        ]
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $gt: ['$duration', 0]
                    }
                }
            },
        ]);
        
    } else {
        var project = await Stop.aggregate([
            {
                $match: {
                    stop_name: state,
                    $or: [
                        {
                            end_time: null
                        },
                        {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $gte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }, {
                            $and: [
                                {
                                    "start_time": {
                                        $gte: new Date(start_timestamp)
                                    }
                                }, {
                                    "end_time": {
                                        $lte: new Date(end_timestamp)
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'statusnames',
                    localField: 'stop_name',
                    foreignField: 'fault_code',
                    as: 'status_name'
                }
            },
            {
                $lookup: {
                    from: 'equipment',
                    localField: 'machine_name',
                    foreignField: 'equipment_name',
                    as: 'machine_name'
                }
            },
            {
                $lookup: {
                    from: 'batchskutriggers',
                    localField: 'batch',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $lookup: {
                    from: 'fgexes',
                    localField: 'fgex',
                    foreignField: '_id',
                    as: 'fgex'
                }
            },
            {
                $lookup: {
                    from: 'comments',
                    let: { "stop_id": "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
                        {
                            $lookup: {
                                from: 'faultcauses',
                                let: { 'selected_causes': '$selected_causes' },
                                pipeline: [
                                    { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                                ],
                                as: "selected_causes"
                            }
                        },
                        {
                            $project: {
                                selected_causes: 1,
                                parts: 1,
                                user_comment:
                                {
                                    $map:
                                    {
                                        input: "$user_comment",
                                        as: "comment",
                                        in: {
                                            username: "$$comment.user_name",
                                            comment: "$$comment.comment",
                                            comment_date: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$$comment.timestamp", timezone: "+05:30" } }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    as: "comments"
                }
            },
            {
                $lookup: {
                    from: 'rosters',
                    let: { "date": "$date", "shift":"$shift"},
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
                                  }
                            }
                        },
                        {
                            $unwind: {
                                path: '$operator',
                                preserveNullAndEmptyArrays: true
                
                            }
                        },
                        {
                            $lookup: {
                                from: 'operators',
                                let: { 'operator_name': '$operator.operator_name' },
                                pipeline: [
                                    { $match: { $expr: { $eq: ["$_id", "$$operator_name"] } } },
                                ],
                                as: "operator"
                            }
                        },
                        {
                            $unwind: {
                                path: '$operator',
                                preserveNullAndEmptyArrays: true
                
                            }
                        },
                    ],
                    as: "roster"
                }
            },
            {
                $unwind: {
                    path: '$status_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$roster',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$machine_name',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$comments',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $project: {
                    start_time: {
                        $switch: {
                            "branches": [
                                { "case": { $lte: ["$start_time", new Date(start_timestamp)] }, then: new Date(start_timestamp) },
                                { "case": { $gt: ["$start_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$start_time"
                        }
                    },
                    end_time: {
                        $switch: {
                            "branches": [
                                { "case": { $eq: ["$end_time", null] }, then: new Date(end_timestamp) },
                                { "case": { $gt: ["$end_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                            ],
                            "default": "$end_time"
                        }
                    },
                    machine_name: "$machine_name.display_name",
                    status_name: '$status_name',
                    batch:"$batch.batch",
                    fgex:"$fgex.fgex",
                    shift:"$shift",
                    date:"$date",
                    operator_name:"$roster.operator.display_name",
                    parts: {
                        $reduce: {
                            'input': '$comments.parts',
                            'initialValue': '',
                            'in': {
                                '$concat': [
                                    '$$value',
                                    { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                    '$$this']
                            }
                        }
                    },
                    selected_causes: "$comments.selected_causes.cause_name",
                    user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
                    stop_name: 1,
                }
            },
            {
                $unwind: {
                    path: '$batch',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $unwind: {
                    path: '$fgex',
                    preserveNullAndEmptyArrays: true
    
                }
            },
            {
                $project: {
                    stop_name: 1,
                    machine_name: 1,
                    start_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$start_time", timezone: "+05:30" } },
                    end_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L", date: "$end_time", timezone: "+05:30" } },
                    fault_name:{ $ifNull: ["$status_name.fault_name", "Not Define in Database"] },
                    parts: { $ifNull: ["$parts", ""] },
                    batch:1,
                    fgex:1,
                    shift:1,
                    date:1,
                    operator_name:{ $ifNull: ["$operator_name", 'Not Defined'] },
                    user_comment1: { $ifNull: ["$user_comment1", {}] }/* {
                    username:"$user_comment1.user_name",
                    comment_date:"$user_comment1.timestamp",
                    comment:"$user_comment1.comment"
                } */,
                    fault_cause: {
                        $ifNull: [{
                            $reduce: {
                                'input': '$selected_causes',
                                'initialValue': '',
                                'in': {
                                    '$concat': [
                                        '$$value',
                                        { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                        '$$this']
                                }
                            }
                        }, ""]
                    },
                    duration: {
                        $round: [{
                            $divide: [{
                                $subtract: ["$end_time", "$start_time"]
                            }, (1000 * 60)
                            ]
                        }, 2]
                    }
    
                }
            },
            {
                $project:{
                    stop_name: 1,
                    machine_name: 1,
                    roster:1,
                    start_time:1,
                    end_time:1,
                    fault_name:1,
                    batch:1,
                    fgex:1,
                    shift:1,
                    date:1,
                    operator_name:1,
                    user_comment1:1,
                    fault_cause:1,
                    duration:1,
                    duration_type:{
                        $cond:[
                            { $lte: ['$duration', major_minor_duration] }, "minor",
                            "major"
                        ]
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $gt: ['$duration', 0.7]
                    }
                }
            },
        ]);
    }
    
    res.send(project)
})

router.get('/state_wise', async (req, res) => {
    var date = req.query['date'] + 'T00:00:00.000Z';
    var shift = req.query.shift;
    var state = new RegExp(req.query.machine_state);
    //console.log(state)
    var total_time, start_timestamp, end_timestamp, shift;
    // var current_shift = await CurrentShift();
    // var current_shift = cur_shift.CurrentShift
    // console.log(cur_shift);
    var current_shift = await Shift.findOne({ shiftName: shift });
   // console.log(current_shift);
    var oper = await Project.findOne({date:date,shiftName:shift}).populate('operator_name')
    //console.log(oper);
    var operater = oper.operator_name.operator_name;
    start_timestamp = req.query['date'] //+ "T" + moment.utc(current_shift.shiftStartTime * 60000).format('HH:mm:ss');
    if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
        end_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss');
    } else {
        end_timestamp = moment(req.query['date']).add(1, 'days').format('YYYY-MM-DD') + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss')
    }
    var current_timestamp = moment().local().format();
    var project = await Stop.aggregate([
        {
            $match: {
                stop_name: state,
                $or: [
                    {
                        end_time: null
                    },
                    {
                        $and: [
                            {
                                "start_time": {
                                    $lte: new Date(start_timestamp)
                                }
                            }, {
                                "end_time": {
                                    $gte: new Date(start_timestamp)
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "start_time": {
                                    $lte: new Date(end_timestamp)
                                }
                            }, {
                                "end_time": {
                                    $gte: new Date(end_timestamp)
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "start_time": {
                                    $gte: new Date(start_timestamp)
                                }
                            }, {
                                "end_time": {
                                    $lte: new Date(end_timestamp)
                                }
                            }
                        ]
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'statusnames',
                localField: 'stop_name',
                foreignField: 'fault_code',
                as: 'status_name'
            }
        },
        {
            $lookup: {
                from: 'equipment',
                localField: 'machine_name',
                foreignField: 'equipment_name',
                as: 'machine_name'
            }
        },
        {
            $lookup: {
                from: 'comments',
                let: { "stop_id": "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$stop_id", "$$stop_id"] } } },
                    {
                        $lookup: {
                            from: 'faultcauses',
                            let: { 'selected_causes': '$selected_causes' },
                            pipeline: [
                                { '$match': { '$expr': { '$in': ['$_id', '$$selected_causes'] } } },
                            ],
                            as: "selected_causes"
                        }
                    },
                    {
                        $project: {
                            selected_causes: 1,
                            parts: 1,
                            user_comment:
                            {
                                $map:
                                {
                                    input: "$user_comment",
                                    as: "comment",
                                    in: {
                                        username: "$$comment.user_name",
                                        comment: "$$comment.comment",
                                        comment_date: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L+04:00", date: "$$comment.timestamp", timezone: "+04:00" } }
                                    }
                                }
                            }
                        }
                    }
                ],
                as: "comments"
            }
        },
        {
            $unwind: {
                path: '$status_name',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$machine_name',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$comments',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $project: {
                start_time: {
                    $switch: {
                        "branches": [
                            { "case": { $lte: ["$start_time", new Date(start_timestamp)] }, then: new Date(start_timestamp) },
                            { "case": { $gt: ["$start_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                        ],
                        "default": "$start_time"
                    }
                },
                end_time: {
                    $switch: {
                        "branches": [
                            { "case": { $eq: ["$end_time", null] }, then: new Date(end_timestamp) },
                            { "case": { $gt: ["$end_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                        ],
                        "default": "$end_time"
                    }
                },
                machine_name: "$machine_name.display_name",
                status_name: '$status_name',
                parts: {
                    $reduce: {
                        'input': '$comments.parts',
                        'initialValue': '',
                        'in': {
                            '$concat': [
                                '$$value',
                                { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                '$$this']
                        }
                    }
                },
                selected_causes: "$comments.selected_causes.cause_name",
                user_comment1: { $arrayElemAt: ["$comments.user_comment", 0] },
                stop_name: 1,
            }
        },
        {
            $project: {
                stop_name: 1,
                machine_name: 1,
                start_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L+04:00", date: "$start_time", timezone: "+04:00" } },
                end_time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%L+04:00", date: "$end_time", timezone: "+04:00" } },
                fault_name: "$status_name.fault_name",
                shift:current_shift.shiftName,
                operator:operater,
                parts: { $ifNull: ["$parts", ""] },
                user_comment1: { $ifNull: ["$user_comment1", {}] }/* {
				username:"$user_comment1.user_name",
				comment_date:"$user_comment1.timestamp",
				comment:"$user_comment1.comment"
			} */,
                fault_cause: {
                    $ifNull: [{
                        $reduce: {
                            'input': '$selected_causes',
                            'initialValue': '',
                            'in': {
                                '$concat': [
                                    '$$value',
                                    { '$cond': [{ '$eq': ['$$value', ''] }, '', ', '] },
                                    '$$this']
                            }
                        }
                    }, ""]
                },
                duration: {
                    $round: [{
                        $divide: [{
                            $subtract: ["$end_time", "$start_time"]
                        }, (1000 * 60)
                        ]
                    }, 2]
                }

            }
        },
        {
            $match: {
                $expr: {
                    $gt: ['$duration', 0]
                }
            }
        },
    ]);
    res.send(project)
})




router.get('/shifthistory', async (req, res) => {
    var date = req.query['date'] + 'T00:00:00.000Z';
    var shift = req.query.shift;
    var line_id = req.query.line_id;
    var total_time, start_timestamp, end_timestamp, shift;
    var current_shift = await Shift.findOne({ shiftName: shift });
    start_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftStartTime * 60000).format('HH:mm:ss');
    if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
        end_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss');
    } else {
        end_timestamp = moment(req.query['date']).add(1, 'days').format('YYYY-MM-DD') + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss')
    }
    var current_timestamp = moment().local().format();
    var project = await Stop.aggregate([
        {
            $match: {
                $or: [
                    {
                        end_time: null
                    },
                    {
                        $and: [
                            {
                                "start_time": {
                                    $lte: new Date(start_timestamp)
                                }
                            }, {
                                "end_time": {
                                    $gte: new Date(start_timestamp)
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "start_time": {
                                    $lte: new Date(end_timestamp)
                                }
                            }, {
                                "end_time": {
                                    $gte: new Date(end_timestamp)
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "start_time": {
                                    $gte: new Date(start_timestamp)
                                }
                            }, {
                                "end_time": {
                                    $lte: new Date(end_timestamp)
                                }
                            }
                        ]
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'statusnames',
                localField: 'stop_name',
                foreignField: 'fault_code',
                as: 'status_name'
            }
        },
        {
            $lookup: {
                from: 'equipment',
                localField: 'machine_name',
                foreignField: 'equipment_name',
                as: 'equipment_name'
            }
        },
        {
            $unwind: {
                path: '$status_name',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $unwind: {
                path: '$equipment_name',
                preserveNullAndEmptyArrays: true

            }
        },
        {
            $project: {
                start_time: {
                    $switch: {
                        "branches": [
                            { "case": { $lte: ["$start_time", new Date(start_timestamp)] }, then: new Date(start_timestamp) },
                            { "case": { $gt: ["$start_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                        ],
                        "default": "$start_time"
                    }
                },
                end_time: {
                    $switch: {
                        "branches": [
                            { "case": { $eq: ["$end_time", null] }, then: new Date(end_timestamp) },
                            { "case": { $gt: ["$end_time", new Date(end_timestamp)] }, then: new Date(end_timestamp) }
                        ],
                        "default": "$end_time"
                    }
                },
                machine_name: "$machine_name",
                display_name: "$equipment_name.display_name",
                status_name: '$status_name',
                stop_name: {
                    $switch: {
                        "branches": [
                            { "case": { $regexMatch: { "input": "$stop_name", "regex": /waiting_/ } }, then: 'waiting' }
                        ],
                        "default": "$stop_name"
                    }
                },
            }
        },
        {
            $project: {
                stop_name: 1,
                machine_name: 1,
                start_time: 1,
                end_time: 1,
                fault_name: { $ifNull: ["$status_name.fault_name", "Not Defined in Database"] },
                machine_name: 1,
                display_name: { $ifNull: ["$display_name", "Not Defined in Database"] },
                duration: {
                    $round: [{
                        $divide: [{
                            $subtract: ["$end_time", "$start_time"]
                        }, (1000 * 60)
                        ]
                    }, 2]
                }

            }
        },
        {
            $match: {
                $expr: {
                    $gt: ['$duration', 0]
                }
            }
        },
    ]);
    res.send({
        line_id: line_id,
        shiftname: shift,
        shiftStartime: start_timestamp,
        shiftEndime: end_timestamp,
        data: project

    })
})
router.get('/history', async (req, res) => {
    var query = Object.values(req.query)[0];
    var startDate = queryDate(query);
    var endQuery = Object.values(req.query)[1];
    var para = req.query.parameter.split(',');
    var send_data = [];
    para.forEach(data => {
        send_data.push({ name: data, data: [] })
    });
    var startDate = queryDate(query);
    var endDate = queryDate(endQuery);
    var history = await History.find({ timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    history.forEach(async (data, i) => {
        var timestamp = moment(data.timestamp).local().unix() * 1000;
        var time = new Date(data.timestamp).getHours() * 60 + new Date(data.timestamp).getMinutes();
        var aviability, performance, quality;
		/* aviability = Number(data.shift.aviability);
		performance = Number(data.shift.performance);
		quality = Number(data.shift.quality); */
		/* if(time == 60 ){
			console.log(data._id);
		} */
		/* if(time == 60 ){
			var id = data._id;
			console.log(id)
			aviability = (Number(history[i - 2].shift.aviability) + Number(history[i + 2].shift.aviability)) / 2;
			console.log(history[i - 2].shift.aviability,Number(history[i + 3].shift.aviability));
			performance = (Number(history[i - 2].shift.performance) + Number(history[i + 2].shift.performance)) / 2;
			var oee = (aviability * performance * quality) / 10000;
			var result = await History.updateOne({_id :id},{$set : {"shift.performance" : performance,"shift.aviability":aviability,"shift.oee":oee}});
			console.log(result)
		}else{
	       send_data.push([ moment(data.timestamp).local().format(),timestamp,data._id,data.shift.aviability,data.shift.performance]);
		}  */
        //send_data.push([ moment(data.timestamp).local().format(),timestamp,data.shift.oee,data.shift.aviability,data.shift.performance]);
        var push_data = {};
        push_data['machine_name'] = "siapi",
        push_data['oee'] = Number(data.oee);
        push_data['performance'] = Number(data.performance);
        push_data['quality'] = Number(data.quality);
        push_data['aviability'] = Number(data.avaibility);
        para.forEach(parameter => {
            var parameter_find = send_data.find(data => data.name == parameter);
            parameter_find.data.push([timestamp, push_data[parameter]]);
        });
    });
    res.send(send_data);
});


router.get('/reportday', async (req, res) => {
    var project_start = req.query['startDate'] + 'T00:00:00.000+00:00';
    var project_end = req.query['endDate'] + 'T00:00:00.000+00:00';
	var startDate = req.query['startDate'] + 'T07:00:00';
    var end = req.query['endDate'] + 'T07:00:00';
    var start = moment(start);
    var critical_machine = 'siapi'
    var match = {
        $match: {
            $and: [{
                "date": {
                    $lte: new Date(project_end)
                }
            }, {
                "date": {
                    $gte: new Date(project_start)
                }
            },
			]
        }
    }
    var endDate = moment(end).utc().local().add(1, 'day').format();
	var total_time = 480;
    var project = await Project.aggregate([
	 match,
	{
		$lookup: {
                from: 'skumasters',
                let: { "sku": "$sku" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$sku"] } } },
                    {
                        $lookup: {
                            from: 'equipment',
                            let: { 'equipments': '$equipments' },
                            pipeline: [
							{ '$match': { '$expr': { '$in': ['$_id', '$$equipments'] } } },
							{
								$project:{
									_id:0,
									machine_name:"$equipment_name"
								}
							},
							],
							as:'equipments'
						}
					},
					{
								$project:{
									_id:0,
									machine_name:"$equipments",
									rated_speed:1,
									cpp:1,
									sku_name:1,
									bpc:1
								}
					},
						{
								$unwind: {
									path: '$machine_name',
									preserveNullAndEmptyArrays: true

								}
						},
					],
					as:'sku'
		}
	},
	{
            $unwind: {
                path: '$sku',
                preserveNullAndEmptyArrays: true

            }
    },
	{ $match: { $expr: { $eq: ["$machine_name", "$sku.machine_name.machine_name"] } } },
	 {
			$addFields: {
				rated_speed: {
							$switch: {
							"branches": [
							{ "case": { $eq: ['$machine_name', 'tmgcp'] }, then:
							{
							$divide:[
							{
							$divide: [ "$sku.rated_speed", 60 ]
							},"$sku.bpc"
							]
							}
							},
							{ "case": { $eq: ['$machine_name', 'weigher_case_sealer'] }, then: {
							$divide:[
							{
							$divide: [ "$sku.rated_speed", 60 ]
							},"$sku.bpc"
							]
							}
							},
							{ "case": { $eq: ['$machine_name', 'pallet_id'] }, then: {
							$divide:[
							{
							$divide:[
							{
							$divide: [ "$sku.rated_speed", 60 ]
							},"$sku.bpc"
							]
							},
							"$sku.cpp"
							]
							}
							},
							{ "case": { $eq: ['$machine_name', 'palletizer'] }, then: 

							{
							$divide:[
							{
							$divide:[
							{
							$divide: [ "$sku.rated_speed", 60 ]
							},"$sku.bpc"
							]
							},
							"$sku.cpp"
							]
							}
							},
							],
							"default": { $divide: [ "$sku.rated_speed", 60 ] }
							}
				},
			}
	},
	{
		$project:{
			_id:0,
			machine_name:"$machine_name",
			sku:"$sku",
			date:"$date",
			shiftName:"$shiftName",
			stop:{$round: ["$stop",2]},
            goodCount:"$goodCount",
			rejected_quantity:"$rejected_quantity",
            no_of_stop:"$no_of_stop",
            speed_loss:{
                $subtract:[
                    total_time,{
                    $subtract:[
                        "$stop",{
                            $subtract:[
                                "$blocked",
                                {
                                    $subtract:[
                                        "$waiting",
                                        {
                                            $divide:[
                                                "$goodCount",
                                                "$rated_speed"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        } 
                    ]
                }]
            },
			critical_machine_off:"$critical_machine_off",
			critical_machine_off_time:{$round: ["$critical_machine_off_time",2]},
			manual_rejected_quantity:{
				 $cond: [{ $lte: ['$manual_rejected_quantity', 0] }, '$rejected_quantity','$manual_rejected_quantity' ]
			},
			manual_rework:{
				 $cond: [{ $lte: ['$manual_rework', 0] }, 0,'$manual_rework' ]
			},
			blocked:{$round: ["$blocked",2]},
			waiting: {$round:["$waiting",2]},
			rated_speed:"$rated_speed",
		}
	},
	{
		$project:{
			total_days:1,
            stop:1,
            speed_loss:1,
            bottle_loss:{
                $round:[
                    {
                        $multiply:[
                            {
                                $sum:[
                                    "$stop",
                                    "$waiting",
                                    "$blocked",
                                    "$speed_loss",
                                    {
                                        $divide:[
                                            "$manual_rejected_quantity",
                                            "$rated_speed"
                                        ]
                                    }
                                ]
                            },
                            "$rated_speed"
                        ]
                    }
                ,0]
            },
			machine_name:1,
			goodCount:1,
			no_of_stop:1,
			manual_rejected_quantity:1,
            manual_rework:1,
			critical_machine_off_time:1,
			rejected_quantity:1,
			blocked:1,
			waiting:1,
			sku_name:"$sku.sku_name",
			rated_speed:'$rated_speed',
		    aviability: {
                    $cond: [{ $lte: ['$stop', 0] }, 1, {
                        $round: [{
                                $divide: [{
                                    $subtract: [
                                        total_time,
                                        '$stop'
                                    ]
                                }, total_time]
                        }, 2]
                    }]
                },
		    performance: {
                    $cond: [{
                        $or: [
                            { $lte: [{
                                $subtract: [
                                    total_time,
                                    '$stop'
                                ]
                            }, 0] },
                            { $lte: ['$goodCount', 0] },
                        ]
                    }, 0, {
                        $round: [{
                                $divide: ['$goodCount', {
                                    $multiply: [
                                        {
                                            $subtract: [
                                                total_time,
                                                '$stop'
                                            ]
                                        },
                                        '$rated_speed'
                                    ]
                                }]
                        }, 2]
                    }]
            },
		  quality: {
			$cond: [{ 
			$lte: [{
				$sum: [
						'$goodCount',
						'$manual_rejected_quantity'
					]
				}, 0] }, 0, {
				$round: [{
						$divide: ['$goodCount', {
							$sum: [
								'$goodCount',
								'$manual_rejected_quantity'
							]
						}]

				}, 2]
			}]
		},
	  }
	},
	{
		$project:{
			total_days:1,
			stop:1,
			machine_name:1,
			goodCount:1,
			no_of_stop:1,
            manual_rejected_quantity:1,
			manual_rework:1,
			critical_machine_off_time:1,
			rejected_quantity:1,
            blocked:1,
            bottle_loss:{
                $cond: [{ $lt: ['$bottle_loss', 0] }, 0,'$bottle_loss' ]
            },
			waiting:1,
			sku_name:1,
			rated_speed:1,
			aviability:{
				$cond: [{ $gt: ['$aviability', 1] }, 1,'$aviability' ]
			},
			performance:{
				$cond: [{ $gt: ['$performance', 1] }, 1,'$performance' ]
			},
			quality:{
				$cond: [{ $gt: ['$quality', 1] }, 1,'$quality' ]
			},
		}
		
	},
	{
		$group:{
			_id: "$machine_name",
            goodCount: { $sum: "$goodCount" },
            rated_speed:{$avg:"$rated_speed"},
            rejected_quantity: { $sum: "$rejected_quantity" },
            critical_machine_off_time: { $sum: "$critical_machine_off_time" },
            critical_machine_off: { $sum: "$critical_machine_off" },
			no_of_stop:{ $sum:"$no_of_stop"},
			aviability:{$sum:"$aviability"},
			quality:{$sum:"$quality"},
			stop:{$sum:"$stop"},
			waiting:{$sum:"$waiting"},
			blocked:{$sum:"$blocked"},
            performance:{$sum:"$performance"},
            bottle_loss:{$sum:"$bottle_loss"},
			manual_rework:{$sum:"$manual_rework"},
			manual_rejected_quantity:{$sum:"$manual_rejected_quantity"},
			sku:{$addToSet:"$sku_name"},
			count: { $sum: 1 },
		}
	},
	{
		$project:{
			machine_name:"$_id",
			goodCount:1,
			rejected_quantity:1,
			critical_machine_off_time:{$round: ["$critical_machine_off_time",2]},
			critical_machine_off:1,
            no_of_stop:1,
            rated_speed:1,
            manual_rework:1,
            count:1,
            sku:1,
            bottle_loss:1,
			stop:{$round: ["$stop",2]},
			waiting:{$round: ["$waiting",2]},
			blocked:{$round: ["$blocked",2]},
			manual_rejected_quantity:1,
			aviability:{
				$round:[
					{
				$divide: [
				'$aviability'
				,
				 '$count'
				]
				}
				,2]
			},
			performance:{
				$round:[
				{
				$divide: [
				'$performance'
				,
				 '$count'
				]
				},2]
			},
			quality:{
				$round:[
				{
				$divide: [
				'$quality'
				,
				 '$count'
				]
			},2]
			},
			
		}
	},
	{
		$project:{
			machine_name:"$_id",
            goodCount:1,
            count:1,
            rejected_quantity:1,
            rated_speed:1,
			critical_machine_off_time:1,
			oee:{
				$round:[{
					$multiply:['$aviability','$performance','$quality',100]
				}
				,2]
			},
			critical_machine_off:1,
			no_of_stop:1,
			manual_rework:1,
			sku:1,
			stop:1,
            waiting:1,
            bottle_loss:1,
			blocked:1,
			manual_rejected_quantity:1,
			aviability:{$round:[{$multiply:['$aviability',100]},2]},
			performance:{$round:[{$multiply:['$performance',100]},2]},
			quality:{$round:[{$multiply:['$quality',100]},2]},
			
		}
	}
    ]);
	var machine_arr = [];
    var data_arr = [];
    var cal_arr = [];
    var send_obj = {};
    var machine_obj = {};
    machine_obj['vision'] = "-";
    machine_arr.push('vision');
    var parameter_wise,machine_wise,rework;
	project.forEach(async (data,i)=>{
		machine_obj[data._id] = "-"
		machine_arr.push(data._id);
		data_arr.push(data);
		if(project.length == (i+1)){
            parameter_wise = await aggregate('parameter_wise',startDate,endDate,machine_arr);
            machine_wise = await aggregate('machine_wise',startDate,endDate,machine_arr);
            rework = await getReworkDateRange(project_start,project_end,machine_arr);
            var original_rework = {
                "siapi":0,
                "and_or":rework["siapi"]["and_or_rework"] - rework["and_or"]["rework"] -rework["stack"]["Handle"],
                "leaktester" :rework["and_or"]["rework"]-rework["stack"]["Handle"]  - rework["leak_tester"]["rework"],
                "new_tech_labeller" : rework["stack"]["Front_Label"],
                "ave_glue" : rework["stack"]["Front_Label"],
                "indution" : rework["rinse_fillcap"]["rinserfill_rework"]- rework["induction"]["rework"],
            }
            var original_reject = {
                "new_tech_labeller" : rework["stack"]["Front_Label"] || 0,
                "ave_glue" : rework["stack"]["Front_Label"] || 0,
                "inkjet" : rework["stack"]["Date"] || 0,
                "siapi":rework["siapi"]["reject"] || 0,
                "and_or":rework["and_or"]["reject"] || 0,
                "tmgcp":rework["tmgcp"]["reject"] || 0,
                "weigher_case_sealer":rework["weigher_case_sealer"]["reject"] || 0,
                "outer_capper":rework["outer_capper"]["reject"] || 0,
                "palletizer":rework["palletizer"]["reject"] || 0,
                "pallet_id":rework["pallet_id"]["reject"] || 0,
                "leak_tester":rework["leak_tester"]["reject"] || 0,
                "induction":rework["induction"]["reject"] || 0,
                "rinse_fillcap":rework["rinse_fillcap"]["reject"] || 0
            }
            cal_arr.push({
                oee: 0,
                performance: 0,
                total_count: 0,
                quality: 0,
                manual_rejected_quantity: "Total_Reject:" + rework['stack']['Total_Reject'] +"|Back_Label:" +  rework['stack']['Back_Label'] +"| Cap:" + rework['stack']['Cap'] +"| Date:" + rework['stack']['Date'] +"|Front_Label:"+ rework['stack']['Front_Label'] +"| Handle:"+ rework['stack']['Handle'],
                rejected_quantity:"Total_Reject:" + rework['stack']['Total_Reject'] +"|Back_Label:" +  rework['stack']['Back_Label'] +"| Cap:" + rework['stack']['Cap'] +"| Date:" + rework['stack']['Date'] +"|Front_Label:"+ rework['stack']['Front_Label'] +"| Handle:"+ rework['stack']['Handle'],
                aviability: 0,
                good_count:"-",
                manual_rework:"-",
                bottle_loss:"-",
                machine: 'vision',
                mttr:0,
                mtbf:0,
                no_of_stop: 0,
                filler_stop: 0,
                filler_min:0
        })
            data_arr.forEach((element,i) => {
                var fault  = faultFilter(machine_wise,element._id,'fault');
                var waiting_data = faultFilter(machine_wise,element._id,'waiting');
                var blocked_data = faultFilter(machine_wise,element._id,'blocked');
                var stop, no_of_fault,stop_arr,waiting,waiting_arr,blocked,mtbf,mttr;
                if(!fault){
                    stop = 0;
                    no_of_fault = 0
                    stop_arr = [],
                    mtbf = 'N/A',
                    mttr = 'N/A'
                }else{
                    stop = fault.total;
                    no_of_fault = fault.count;
                    stop_arr = fault.stop_name;
                    mtbf = (element.count * total_time) / fault.count;
                    mttr = fault.total / fault.count;
                }
                if(!waiting_data){
                    waiting = 0;
                    waiting_arr = []
                }else{
                    waiting = waiting_data.total;
                    waiting_arr = waiting_data.stop_name
                }
                if(!blocked_data){
                    blocked = 0;
                }else{
                    blocked = blocked_data.total;
                }
                if(element._id == critical_machine){
                    send_obj['rated_speed'] = element.rated_speed;
                    send_obj['critical_stop'] = send_obj['critical_stop'] || {};
                    send_obj['critical_stop']['machine_name'] = critical_machine;
                    send_obj['critical_stop']['stop'] = stop_arr;
                    send_obj['critical_stop']['waiting'] = waiting_arr;
                    send_obj['critical_stop']['blocked'] = blocked_data.stop_name
                }
                cal_arr.push({
                    machine:element._id,
                    stop:stop,
                    blocked:blocked,
                    waiting:waiting,
                    total_count:element.goodCount,
                    waiting_arr:waiting_arr,
                    no_of_stop:no_of_fault,
                    stop_arr:stop_arr,
                    oee:element.oee,
                    aviability:element.aviability,
                    performance:element.performance,
                    quality:element.quality,
                    mtbf:mtbf,
                    mttr:mttr,
                    bottle_loss:element.bottle_loss,
                    manual_rejected_quantity:element.manual_rejected_quantity,
                    rejected_quantity:original_reject[element._id] || 0,
                    rework:original_rework[element._id] || 0,
                    manual_rework:element.manual_rework,
                    critical_machine_off:element.critical_machine_off,
                    critical_machine_off_time:element.critical_machine_off_time,
                    rated_speed:element.rated_speed,

                });
                if(data_arr.length == (i+1)){
                    send_obj['parameter_wise'] = parameter_wise;
                    send_obj['machine_wise '] =machine_wise ;
                    send_obj['project'] = cal_arr;
                    send_obj['machine_obj'] = machine_obj;
                    res.send(send_obj)
                }
            });
		}
    });
   
	
});

router.get('/reportshift', async (req, res) => {
    var date = req.query['date'] + 'T00:00:00.000Z';
    var shift = req.query.shift;
    var start_timestamp,end_timestamp;
    var current_shift = await Shift.findOne({ shiftName: shift });
    var total_time = 480;
    start_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftStartTime * 60000).format('HH:mm:ss');
    if (current_shift.shiftEndTime > current_shift.shiftStartTime) {
        end_timestamp = req.query['date'] + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss');
    } else {
        end_timestamp = moment(req.query['date']).add(1, 'days').format('YYYY-MM-DD') + "T" + moment.utc(current_shift.shiftEndTime * 60000).format('HH:mm:ss')
    }
    var critical_machine = 'siapi'
    var match = {
        $match: {
            $and: [{
                "date": {
                    $eq: new Date(date)
                }
            }, {
                "shiftName": {
                    $eq: shift
                }
            },
			]
        }
    }
    var project = await Project.aggregate([
        match,
       {
           $lookup: {
                   from: 'skumasters',
                   let: { "sku": "$sku" },
                   pipeline: [
                       { $match: { $expr: { $eq: ["$_id", "$$sku"] } } },
                       {
                           $lookup: {
                               from: 'equipment',
                               let: { 'equipments': '$equipments' },
                               pipeline: [
                               { '$match': { '$expr': { '$in': ['$_id', '$$equipments'] } } },
                               {
                                   $project:{
                                       _id:0,
                                       machine_name:"$equipment_name"
                                   }
                               },
                               ],
                               as:'equipments'
                           }
                       },
                       {
                                   $project:{
                                       _id:0,
                                       machine_name:"$equipments",
                                       rated_speed:1,
                                       cpp:1,
                                       sku_name:1,
                                       bpc:1
                                   }
                       },
                           {
                                   $unwind: {
                                       path: '$machine_name',
                                       preserveNullAndEmptyArrays: true
   
                                   }
                           },
                       ],
                       as:'sku'
           }
       },
       {
               $unwind: {
                   path: '$sku',
                   preserveNullAndEmptyArrays: true
   
               }
       },
       { $match: { $expr: { $eq: ["$machine_name", "$sku.machine_name.machine_name"] } } },
       {
            $lookup:{
                from: "operators",
                localField: "operator_name",
                foreignField: "_id",
                as: "operator"
            }
       },
       {
        $unwind: {
            path: '$operator',
            preserveNullAndEmptyArrays: true

        }
       },
        {
               $addFields: {
                   rated_speed: {
                               $switch: {
                               "branches": [
                               { "case": { $eq: ['$machine_name', 'tmgcp'] }, then:
                               {
                               $divide:[
                               {
                               $divide: [ "$sku.rated_speed", 60 ]
                               },"$sku.bpc"
                               ]
                               }
                               },
                               { "case": { $eq: ['$machine_name', 'weigher_case_sealer'] }, then: {
                               $divide:[
                               {
                               $divide: [ "$sku.rated_speed", 60 ]
                               },"$sku.bpc"
                               ]
                               }
                               },
                               { "case": { $eq: ['$machine_name', 'pallet_id'] }, then: {
                               $divide:[
                               {
                               $divide:[
                               {
                               $divide: [ "$sku.rated_speed", 60 ]
                               },"$sku.bpc"
                               ]
                               },
                               "$sku.cpp"
                               ]
                               }
                               },
                               { "case": { $eq: ['$machine_name', 'palletizer'] }, then: 
   
                               {
                               $divide:[
                               {
                               $divide:[
                               {
                               $divide: [ "$sku.rated_speed", 60 ]
                               },"$sku.bpc"
                               ]
                               },
                               "$sku.cpp"
                               ]
                               }
                               },
                               ],
                               "default": { $divide: [ "$sku.rated_speed", 60 ] }
                               }
                   },
               }
       },
       {
           $project:{
               _id:"$machine_name",
               machine_name:"$machine_name",
               sku:"$sku.sku_name",
               date:"$date",
               shiftName:"$shiftName",
               goodCount:"$goodCount",
               rejected_quantity:"$rejected_quantity",
               no_of_stop:"$no_of_stop",
               critical_machine_off:"$critical_machine_off",
               critical_machine_off_time:{$round: ["$critical_machine_off_time",2]},
               manual_rejected_quantity:{
                    $cond: [{ $lte: ['$manual_rejected_quantity', 0] }, '$rejected_quantity','$manual_rejected_quantity' ]
               },
               manual_rework:{
                    $cond: [{ $lte: ['$manual_rework', 0] }, 0,'$manual_rework' ]
               },
               operator_name:{ $ifNull: [ "$operator.operator_name", "Not Added for this date" ] },
               rated_speed:"$rated_speed",
           }
       },
       ]);
    //calculatio
    var machine_arr = [];
    var data_arr = [];
    var cal_arr = [];
    var send_obj = {};
    var machine_obj = {};
    machine_obj['vision'] = "-";
    machine_arr.push('vision');
    var parameter_wise,machine_wise,rework;
    project.forEach(async (data,i)=>{
		machine_obj[data.machine_name] = "-"
		machine_arr.push(data.machine_name);
		data_arr.push(data);
		if(project.length == (i+1)){
            parameter_wise = await aggregate('parameter_wise',start_timestamp,end_timestamp,machine_arr);
            machine_wise = await aggregate('machine_wise',start_timestamp,end_timestamp,machine_arr);
            rework = await getReworkShiftWise(date,shift);
            var original_rework = {
                "siapi":0,
                "and_or":rework["siapi"]["and_or_rework"] - rework["and_or"]["rework"] -rework["stack"]["Handle"],
                "leaktester" :rework["and_or"]["rework"]-rework["stack"]["Handle"]  - rework["leak_tester"]["rework"],
                "new_tech_labeller" : rework["stack"]["Front_Label"],
                "ave_glue" : rework["stack"]["Front_Label"],
                "indution" : rework["rinse_fillcap"]["rinserfill_rework"]- rework["induction"]["rework"],
            }
            var original_reject = {
                "new_tech_labeller" : rework["stack"]["Front_Label"] || 0,
                "ave_glue" : rework["stack"]["Front_Label"] || 0,
                "inkjet" : rework["stack"]["Date"] || 0,
                "siapi":rework["siapi"]["reject"] || 0,
                "and_or":rework["and_or"]["reject"] || 0,
                "tmgcp":rework["tmgcp"]["reject"] || 0,
                "weigher_case_sealer":rework["weigher_case_sealer"]["reject"] || 0,
                "outer_capper":rework["outer_capper"]["reject"] || 0,
                "palletizer":rework["palletizer"]["reject"] || 0,
                "pallet_id":rework["pallet_id"]["reject"] || 0,
                "leak_tester":rework["leak_tester"]["reject"] || 0,
                "induction":rework["induction"]["reject"] || 0,
                "rinse_fillcap":rework["rinse_fillcap"]["reject"] || 0
            }
            cal_arr.push({
                oee: 0,
                performance: 0,
                total_count: 0,
                quality: 0,
                manual_rejected_quantity: "Total_Reject:" + rework['stack']['Total_Reject'] +"|Back_Label:" +  rework['stack']['Back_Label'] +"| Cap:" + rework['stack']['Cap'] +"| Date:" + rework['stack']['Date'] +"|Front_Label:"+ rework['stack']['Front_Label'] +"| Handle:"+ rework['stack']['Handle'],
                rejected_quantity:"Total_Reject:" + rework['stack']['Total_Reject'] +"|Back_Label:" +  rework['stack']['Back_Label'] +"| Cap:" + rework['stack']['Cap'] +"| Date:" + rework['stack']['Date'] +"|Front_Label:"+ rework['stack']['Front_Label'] +"| Handle:"+ rework['stack']['Handle'],
                aviability: 0,
                good_count:"-",
                manual_rework:"-",
                bottle_loss:"-",
                sku:"-",
                machine: 'vision',
                mttr:0,
                mtbf:0,
                no_of_stop: 0,
                critical_machine_off: 0,
                critical_machine_off_time:0
        })
            data_arr.forEach((element,i) => {
                var fault  = faultFilter(machine_wise,element._id,'fault');
                var waiting_data = faultFilter(machine_wise,element._id,'waiting');
                var blocked_data = faultFilter(machine_wise,element._id,'blocked');
                var stop, no_of_fault,stop_arr,waiting,waiting_arr,blocked,blocked_arr,mtbf,mttr;
                if(!fault){
                    stop = 0;
                    no_of_fault = 0
                    stop_arr = [],
                    mtbf = 'N/A',
                    mttr = 'N/A'
                }else{
                    stop = fault.total;
                    no_of_fault = fault.count;
                    stop_arr = fault.stop_name;
                    mtbf = total_time / fault.count;
                    mttr = fault.total / fault.count;
                }
                if(!waiting_data){
                    waiting = 0;
                    waiting_arr = []
                }else{
                    waiting = waiting_data.total;
                    waiting_arr = waiting_data.stop_name
                }
                if(!blocked_data){
                    blocked = 0;
                    blocked_arr = [];
                }else{
                    blocked = blocked_data.total;
                    blocked_arr = blocked_data.stop_name
                }
                if(element._id == critical_machine){
                    send_obj['rated_speed'] = element.rated_speed;
                    send_obj['critical_stop'] = send_obj['critical_stop'] || {};
                    send_obj['critical_stop']['machine_name'] = critical_machine;
                    send_obj['critical_stop']['stop'] = stop_arr;
                    send_obj['critical_stop']['waiting'] = waiting_arr;
                    send_obj['critical_stop']['blocked'] = blocked_arr;
                    send_obj['start_timestamp'] =  start_timestamp;
                    send_obj['end_timestamp'] =  end_timestamp;
                    send_obj['date'] = moment(date).local().format('LL');
                    send_obj['shift'] =  shift;
                    send_obj['operator_name'] = element.operator_name;
                }
                var cal_return = calculation(0,stop,element.goodCount,element.manual_rejected_quantity,shift,date,element.rated_speed)
                cal_arr.push({
                    machine:element._id,
                    stop:stop,
                    blocked:blocked,
                    waiting:waiting,
                    sku:element.sku,
                    total_count:element.goodCount,
                    waiting_arr:waiting_arr,
                    no_of_stop:no_of_fault,
                    stop_arr:stop_arr,
                    oee:cal_return.oee,
                    aviability:cal_return.aviability,
                    performance:cal_return.performance,
                    quality:cal_return.quality,
                    mtbf:mtbf,
                    mttr:mttr,
                    bottle_loss:element.bottle_loss,
                    manual_rejected_quantity:element.manual_rejected_quantity,
                    rejected_quantity:original_reject[element._id] || 0,
                    rework:original_rework[element._id] || 0,
                    manual_rework:element.manual_rework,
                    critical_machine_off:element.critical_machine_off,
                    critical_machine_off_time:element.critical_machine_off_time,
                    rated_speed:element.rated_speed,

                });
                if(data_arr.length == (i+1)){
                    send_obj['parameter_wise'] = parameter_wise;
                    send_obj['machine_wise '] =machine_wise ;
                    send_obj['project'] = cal_arr;
                    send_obj['machine_obj'] = machine_obj;
                    res.send(send_obj)
                }
            });
		}
    });
});
var queryDate = function (query) {
    var year = Number(query.split("T")[0].split("-")[0]);
    var month = Number(query.split("T")[0].split("-")[1]) - 1;
    var date = Number(query.split("T")[0].split("-")[2]);
    var hour = Number(query.split("T")[1].split(":")[0]);
    var minute = Number(query.split("T")[1].split(":")[1]);
    var secound = Number(query.split("T")[1].split(":")[2]);

    return new Date(year, month, date, hour, minute, secound)
}

function getValue(machine_name, value) {
    console.log(machine_name, value)
    var data = faultDescritions[machine_name][value];
    return data

}
function calculation(pdt_time, fault_time, total_good_count, total_reject_count, shift, date, rated_speed) {
    //console.log(pdt_time, fault_time, total_good_count, total_reject_count, shift, date, rated_speed)
    var total_time = 480;
    var total_count = total_good_count + total_reject_count
    var working_time = total_time - pdt_time;
    var aviability = checkValidation((working_time - fault_time) / working_time);
    var performance = checkValidation(total_good_count / (rated_speed * (working_time - fault_time)));
    var quality = checkValidation(total_good_count / total_count);
    var oee = aviability * performance * quality;
    return {
        oee: (oee * 100).toFixed(2),
        quality: (quality * 100).toFixed(2),
        performance: (performance * 100).toFixed(2),
        aviability: (aviability * 100).toFixed(2),
        total_good_count: total_good_count,
        shift: shift,
        date: date,
        total_reject_count: total_reject_count
    }
}
function checkValidation(value) {
    if (value < 0 || value === Infinity || !value) {
        return 0
    } else if (value > 1) {
        return 1
    } else {
        return value
    }
}

function faultFilter(arr,machine_name,type){
    var machine = arr.find((machine)=> {return machine._id == machine_name});
    if(machine){
        var fault = machine.parent_stop.find((fault)=>{return fault.parent_stop == type});
        return fault
    }else{
        return null
    }
}
module.exports = router;