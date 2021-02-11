const mongoose = require("mongoose");
var moment = require("moment");
const ObjectId = mongoose.Types.ObjectId;

var rawSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    shiftname:{
        type:String,
    },
    lineName:{
        type:String,
        
    },
    machine_name:{
        type: String,

    },
    sku:{
        type: String,

    },
    current_state:{
        type:String,
    },
    good_count:{
        type:Number,
    },
    reject_count:{
        type:Number
    },
    status:{
        type:String
    },
    kepwaretimestamp:{
        type:Date,
        default:Date.now()
    }

   
}, { timestamps: true })

var Rawdata = mongoose.model("realraw", rawSchema);

//var current_timestamp = new Date();
// console.log(current_timestamp,"date console");
// var current_timestamp = moment().local().format("YYYY-MM-DDTHH:mm:ss.SSS")
// //console.log(current_timestamp,"date console");
// var num1 = Math.floor(Math.random() * (6 + 1))
// var num2 = Math.floor(Math.random() * (6 + 1))
// console.log(num1,num2);
// var machines = ["filler", "case_packer", "case_selar", "palletizer", "weigher","Stack","tmgc","rinse_filler",];
// var stattes = ["ready","waiting","blocked","stop","pdt","updt","execution"]
// var sku = `sku${num1}`
// var allshift = ["A","B","C"]
// //var shift = `Shift_${random_item(allshift)}`
// var shift = "Shift_C"
// //console.log(shift);
// var machinename = random_item(machines)
// var linename = `nova_${num2}`
//console.log(current_timestamp+"/"+linename);



max = 9876543
var gcount = Math.floor(Math.random() * max)
var rcount = Math.floor(Math.random() * max)

//datamaking(line_1,shift,good_count_rinse,rcount,mname)
var datamaking = async(linex,shiftx,gx,rx,mx,sx)=>{
    console.log("data making")

    ////
    var current_timestamp = moment().local().format("YYYY-MM-DDTHH:mm:ss.SSS")
    //console.log(current_timestamp,"date console");
    var num1 = Math.floor(Math.random() * (6 + 1))
    var num2 = Math.floor(Math.random() * (6 + 1))
    console.log(num1,num2);
    var machines = ["filler", "case_packer", "case_selar", "palletizer", "weigher","Stack","tmgc","rinse_filler",];
    var stattes = ["ready","waiting","blocked","stop","pdt","updt","execution"]
    var sku = `sku${num1}`
    var allshift = ["A","B","C"]
    //var shift = `Shift_${random_item(allshift)}`
    var shift = "Shift_C"
    //console.log(shift);
    var machinename = random_item(machines)
    var linename = `line_${num2}`

    console.log(`${current_timestamp}/${linex}/${mx}/${shiftx}/${sku}`);
    
    var new_data = new Rawdata({
        _id:`${current_timestamp}/${linex}/${mx}/${shiftx}/${sku}`,
        shiftname:shiftx,
        lineName:linex,
        machine_name:mx,
        sku:sku,
        good_count:gx,
        reject_count:rx,
        current_state:sx
    });
    var result = await new_data.save();
    return result
}

function random_item(items) {

    return items[Math.floor(Math.random() * items.length)];
  
  }
  

 // console.log(random_item(machines));
  
  


module.exports.Rawdata = Rawdata;
module.exports.datamaking = datamaking;