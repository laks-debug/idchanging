var mongoose = require("mongoose")
var rosterschema = new mongoose.Schema({
    date: {
        type: Date,
    },
    line_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'line',
    },
    shift_wise:[{
        shift_name:{
            type:String
        },
        operator_name:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "operator"
          },
    }]

}, { timestamps: true })



var Roster = mongoose.model("roster", rosterschema);

var postRoster = async(obj)=>{
    var checkRoster = await Roster.findOne({date:obj.date});
    if(checkRoster){
        checkRoster.shift_wise = obj.shift_wise;
        checkRoster.line_id = obj.line_id;
        var result = await checkRoster.save();
        return
    }else{
        var roster = new Roster(obj);
        var result = await roster.save()
        return
    }

}

var getDateWiseRoster = async(date)=>{
    var getdata = await Roster.findOne({'date':date }).populate('shift_wise.operator_name').populate('line_id');
    return getdata
}

var getshiftWiseRoster = async(date,shift)=>{
    //console.log(new Date(date),shift);
    var getdata = await Roster.findOne({'date':new Date(date),'shift_wise.shift_name':shift},{'shift_wise.$.shift_name':1,date:1,line_id:1}).populate('shift_wise.operator_name').populate('line_id');
   
    return getdata
}

var indexoperatorid = async(date,shift)=>{
    //console.log(new Date(date),shift);
    var getdata = await Roster.findOne({'date':new Date(date),'shift_wise.shift_name':shift},{'shift_wise.$.shift_name':1,date:1,line_id:1})//.populate('shift_wise.operator_name').populate('line_id');
    //var result = getdata.shift_wise[0]._id 
     var result =  getdata ? getdata.shift_wise[0].operator_name : "5e8c6c256a457c1ef8dd615e";
    return result
}





module.exports.Roster = Roster; 
module.exports.postRoster = postRoster;
module.exports.getDateWiseRoster = getDateWiseRoster;
module.exports.getshiftWiseRoster = getshiftWiseRoster;
module.exports.indexoperatorid = indexoperatorid;