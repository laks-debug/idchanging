var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({
    shift_name:{
        type:String
    },
    comment_date:{
        type:Date
    },
    user_name:{
        type:String
    },
    comment:{
        type:String
    },
	created_date:{
		type:Date,
		default:Date.now
	}
});

var ShiftComment = mongoose.model('shiftComment',commentSchema);
var getComment = async function (shift,date){
	var comment = await ShiftComment.find({shift_name:shift,comment_date:date});
	return comment
}
module.exports.ShiftComment = ShiftComment;
module.exports.getComment = getComment;