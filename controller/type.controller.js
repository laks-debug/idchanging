var express = require("express")
var router = express.Router();
const { Type } = require("../model/type.model")


router.post('/', async (req, res) => {
    var data = req.body;
    console.log(data)
    var _id = req.body._id;
    if (_id) {
        var save = Type.update({ _id: _id }, data, (err, data) => {
            if (err) {
                res.status(400).send(err.message)
            } else {
                res.status(200).send(data)
            }
        })
    }else {
        var type = new Type(req.body);
        try {
            var save = await type.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }
});

router.get('/', async (req, res) => {
 var type = req.query.type;
 var line_id = req.query.line_id;
 if(type == "all"){
    var data = await Type.find({})
}else{
    var data = await Type.find({type:type,line_id:line_id});
}
 res.send(data)
})

module.exports = router