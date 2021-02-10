var express = require("express")
var router = express.Router();
const { FGEX } = require("../model/fgex.model");


router.post('/', async (req, res) => {
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var save = FGEX.update({ _id }, data, (err, data) => {
            if (err) {
                res.status(400).send(err.message)
            } else {
                res.status(200).send(data)
            }
        })
    } else {
        var raw = new FGEX(req.body);
        try {
            var save = await raw.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }
});

router.get('/', async (req, res) => {
    var fgex = req.query.fgex;
	//console.log(fgex)
    //FGEX.id()
    if (fgex == "all") {
        var result = await FGEX.find({}).populate('type')
    } else {
        var result = await FGEX.findOne({ fgex: fgex }).populate('type');
    }
    res.send(result);

})


router.get('/:id', async (req, res) => {
    var id = req.params.id
    var data = await FGEX.findById({ _id: id }).populate('type')
    if (data) {
        res.send(data)
    } else {
        res.send("data _id not found")
    }

})




// router.get('/:id', async (req, res) => {
//     var id = req.params.id
//     var data = await FGEX._id(id)
//     data.remove();
//     data.save(function (err) {
//         if (err) return handleError(err);
//         console.log('the subdocs were removed');
//       });
    

// })

// parent.children.id(_id).remove();
// // Equivalent to `parent.child = null`
// parent.child.remove();
// parent.save(function (err) {
//   if (err) return handleError(err);
//   console.log('the subdocs were removed');
// });

// router.get('/', async (req, res) => {
//     var fgex = req.query.fgex
//     var data = await FGEX.find({ fgex: fgex }).sort({_id: -1}).limit(2);
//     const next = data[data.length - 1]._id
//     if (data) {
//         res.json({ data, next })
//     } else {
//         res.send("data _id not found")
//     }

// })


// router.get('/:page', async (req, res) => {
//         var fgex = req.query.fgex
//         var data = await FGEX.find({ fgex: fgex }).limit(1)
//             const resPerPage = 9; // results per page
//             const page = req.params.page || 1
//         res.send(data)
// })



module.exports = router