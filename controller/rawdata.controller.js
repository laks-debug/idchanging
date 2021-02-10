var express = require("express")
var router = express.Router();
const {Rawdata} = require("../model/rawdata");



router.get('/', async (req, res) => {
    var data = await Rawdata.find({});
//    data.forEach(element => {
//           var check =  element._id.split("/")
//         console.log(check); 
//     });
    res.send(data)
   })

module.exports = router