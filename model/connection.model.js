var mongooose = require('mongoose');
var {connectionLog,postStop,firstLog } = require('./connection_log')
var connectionSchema = new mongooose.Schema({
    status:{
        type:String
    },
    machine_name:{
        type:String
    },
    lastUpdate:{
        type:Date,
        default:Date.now
    }
});

var Connection = mongooose.model('Connection',connectionSchema);

var updateConnection = async function (status,machine,line_id){
    var connection = await Connection.findOne({machine_name:machine});
    var timestamp = new Date();
    if(!connection){
        var conn = new Connection({
            status:status,
            machine_name:machine,
        });
        conn.save();
        return;
    }
    //firstLog(line_id,machine)
    connection.status = status;
    if(status != connection.status){
        postStop(machine,status,timestamp,line_id)
    }
	connection.lastUpdate = timestamp;
    connection.save();
}

var getConnection = async function(machine){
var connection = await Connection.findOne({machine_name:machine});
return connection
}

module.exports.Connection = Connection;
module.exports.updateConnection = updateConnection;
module.exports.getConnection = getConnection;
