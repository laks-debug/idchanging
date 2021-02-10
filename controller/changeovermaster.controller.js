var express = require("express")
var router = express.Router();
const {changeOverMaster} = require("../model/changeovermaster.model");


router.post('/', async (req, res) => {
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var save = changeOverMaster.update({ _id }, data, (err, data) => {
            if (err) {
                res.status(400).send(err.message)
            } else {
                res.status(200).send(data)
            }
        })
    }else {
        var raw = new changeOverMaster(req.body);
        try {
            var save = await raw.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }
});

router.get('/', async (req, res) => {
    var data = await changeOverMaster.find({});
    res.send(data)
   })

module.exports = router