var express = require('express');
var router = express.Router();
var moment = require('moment');

router.get('/' , async (req,res)=>{
	var data = [
	{
		machine_name:"cam_blister",
		status : 'ok',
		current_timestamp:moment().local().format(),
	}
	]
	res.send(data)
	
});


module.exports = router;
