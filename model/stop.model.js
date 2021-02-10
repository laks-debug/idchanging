var mongoose = require("mongoose");
const { batchEnd } = require("./project.model");
var stopSchema = mongoose.Schema({
  machine_name: {
    type: String,
  },
  stop_name: {
    type: String,
  },
  start_time: {
    type: Date,
    default: Date.now,
  },
  line_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "line",
  },
  end_time: {
    type: Date,
    default: null,
  },
  shift: {
    type: String,
  },
  date: {
    type: Date,
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "batch",
  },
  critical_off: {
    type: Boolean,
    default: false,
  },
  fgex: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
  },
});

var Stop = mongoose.model("Stop", stopSchema);

var postStop = async (machine, stop_name, timestamp,line_id, shift, batch, fgex,date) => {
  //console.log(machine,stop_name,timestamp)
  Stop.findOneAndUpdate(
    { machine_name: machine, end_time: null,line_id:line_id },
    { end_time: timestamp },
    {
      new: true,
    },
    (err, doc) => {
      if (!err) {
        var data = new Stop({
          machine_name: machine,
          stop_name: stop_name,
          start_time: timestamp,
          shift: shift,
          line_id:line_id,
          date:date,
          batch: batch,
          fgex: fgex,
        });
        data.save();
      }
    }
  );
};

var updateStop = async (machine, stop_name, start_time, end_time) => {
  //console.log(machine,stop_name,start_time,end_time)
  var stop = await Stop.findOne({
    machine_name: machine,
    stop_name: stop_name,
    start_time: start_time,
  });
  if (!stop) {
    console.log(machine, stop_name, start_time, end_time);
  }
  //remove milisecound stop with stop
  stop.end_time = end_time;
  stop.save();
};
var getStop = async (id) => {
  var stop = await Stop.findOne({ _id: id });
  return stop;
};
var aggregate = async (wise, startDate, endDate, machie_arr) => {
  var stop;
  if (wise == "current_machine_wise") {
    stop = await Stop.aggregate([
      {
        $match: {
          machine_name: { $in: machie_arr },
          $or: [
            {
              end_time: null,
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(startDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(endDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(endDate),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start: {
            $cond: {
              if: { $lt: ["$start_time", new Date(startDate)] },
              then: new Date(startDate),
              else: "$start_time",
            },
          },
          end: {
            $switch: {
              branches: [
                { case: { $eq: ["$end_time", null] }, then: new Date() },
                {
                  case: { $gt: ["$end_time", new Date(endDate)] },
                  then: new Date(endDate),
                },
              ],
              default: "$end_time",
            },
          },
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          dateDifference: {
            $divide: [
              {
                $subtract: ["$end", "$start"],
              },
              1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            machine_name: "$machine_name",
            stop_name: "$stop_name",
          },
          total: { $sum: "$dateDifference" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.machine_name",
          details: {
            $push: {
              stop_name: "$_id.stop_name",
              total: "$total",
              count: "$count",
            },
          },
        },
      },
    ]);
  } else if (wise == "machine_wise") {
    stop = await Stop.aggregate([
      {
        $match: {
          machine_name: { $in: machie_arr },
          $or: [
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(startDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(endDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(endDate),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          start_time: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$start_time", new Date(startDate)] },
                  then: new Date(startDate),
                },
                {
                  case: { $gt: ["$start_time", new Date(endDate)] },
                  then: new Date(endDate),
                },
              ],
              default: "$start_time",
            },
          },
          machine_name: 1,
          stop_name: {
            $switch: {
              branches: [
                { case: { $eq: ["$stop_name", "waiting"] }, then: "waiting_1" },
              ],
              default: "$stop_name",
            },
          },
          parent_stop: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: { input: "$stop_name", regex: /fault_/ },
                  },
                  then: "fault",
                },
                {
                  case: {
                    $regexMatch: { input: "$stop_name", regex: /waiting_/ },
                  },
                  then: "waiting",
                },
              ],
              default: "$stop_name",
            },
          },
          end_time: {
            $switch: {
              branches: [
                { case: { $eq: ["$end_time", null] }, then: new Date(endDate) },
                {
                  case: { $gt: ["$end_time", new Date(endDate)] },
                  then: new Date(endDate),
                },
              ],
              default: "$end_time",
            },
          },
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start_time: 1,
          end_time: 1,
          parent_stop: 1,
          dateDifference: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$end_time", "$start_time"],
                  },
                  1000 * 60,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $gt: ["$dateDifference", 0],
          },
        },
      },
      {
        $group: {
          _id: {
            machine_name: "$machine_name",
            parent_stop: "$parent_stop",
            stop_name: "$stop_name",
          },
          stop_total: { $sum: "$dateDifference" },
          stop_count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            machine_name: "$_id.machine_name",
            parent_stop: "$_id.parent_stop",
          },
          total: { $sum: "$stop_total" },
          count: { $sum: "$stop_count" },
          stop_name: {
            $push: {
              stop_name: "$_id.stop_name",
              stop_total: "$stop_total",
              stop_count: "$stop_count",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.machine_name",
          parent_stop: {
            $push: {
              parent_stop: "$_id.parent_stop",
              total: "$total",
              count: "$count",
              stop_name: "$stop_name",
            },
          },
        },
      },
    ]);
  } else if (wise == "current_parameter_wise") {
    stop = await Stop.aggregate([
      {
        $match: {
          machine_name: { $in: machie_arr },
          $or: [
            {
              end_time: null,
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(startDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(endDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(endDate),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start: {
            $cond: {
              if: { $lt: ["$start_time", new Date(startDate)] },
              then: new Date(startDate),
              else: "$start_time",
            },
          },
          end: {
            $switch: {
              branches: [
                { case: { $eq: ["$end_time", null] }, then: new Date() },
                {
                  case: { $gt: ["$end_time", new Date(endDate)] },
                  then: new Date(endDate),
                },
              ],
              default: "$end_time",
            },
          },
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          dateDifference: {
            $divide: [
              {
                $subtract: ["$end", "$start"],
              },
              1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            machine_name: "$machine_name",
            stop_name: "$stop_name",
          },
          total: { $sum: "$dateDifference" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.stop_name",
          details: {
            $push: {
              machine_name: "$_id.machine_name",
              total: "$total",
              count: "$count",
            },
          },
        },
      },
    ]);
  } else if (wise == "parameter_wise") {
    console.log(startDate, endDate);
    stop = await Stop.aggregate([
      {
        $match: {
          machine_name: { $in: machie_arr },
          $or: [
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(startDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $lte: new Date(endDate),
                  },
                },
                {
                  end_time: {
                    $gte: new Date(endDate),
                  },
                },
              ],
            },
            {
              $and: [
                {
                  start_time: {
                    $gte: new Date(startDate),
                  },
                },
                {
                  end_time: {
                    $lte: new Date(endDate),
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          start: {
            $cond: {
              if: { $lt: ["$start_time", new Date(startDate)] },
              then: new Date(startDate),
              else: "$start_time",
            },
          },
          end: {
            $switch: {
              branches: [
                { case: { $eq: ["$end_time", null] }, then: new Date() },
                {
                  case: { $gt: ["$end_time", new Date(endDate)] },
                  then: new Date(endDate),
                },
              ],
              default: "$end_time",
            },
          },
        },
      },
      {
        $project: {
          stop_name: 1,
          machine_name: 1,
          dateDifference: {
            $divide: [
              {
                $subtract: ["$end", "$start"],
              },
              1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            machine_name: "$machine_name",
            stop_name: "$stop_name",
          },
          total: { $sum: "$dateDifference" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.stop_name",
          details: {
            $push: {
              machine_name: "$_id.machine_name",
              total: "$total",
              count: "$count",
            },
          },
        },
      },
    ]);
  }
  return stop;
};
module.exports.Stop = Stop;
module.exports.postStop = postStop;
module.exports.getStop = getStop;
module.exports.updateStop = updateStop;
module.exports.aggregate = aggregate;
