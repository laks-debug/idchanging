var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var { FaultCause } = require('../model/fault_cause.model');
var { Shift } = require('../model/shift.model');
var { Project } = require('../model/project.model')
var mongoose = require('mongoose');
var { Comment } = require('../model/comment.model');
var { ShiftComment } = require('../model/shift_comment.model');
var { getStop } = require('../model/stop.model');
//var { maintananaceMailer, ChangeovermailFormatter } = require('./email.controller');
var { addCompany, addCountry, addLocation, addPlant, addLine, addState, getCompany, getCountry, getLocation, getPlant, getState, getLine, updateValue, Manual, Sku, getLineDetails, qualityReject, faultName, Equipment, scheduleMaintanance, Pdt, Holiday, WeeklyOff } = require('../model/manualEntry.model')
var moment = require('moment');
//var { postSkuTrigger } = require('../model/batchSkuTrigger.model');
var { CurrentShift } = require("../model/shift.model");
//var { skuAdd } = require("../model/sku.model");
const { Statusname } = require("../model/statusname.model");
var { Batchskutrigger } = require('../model/batch.model');
var { Operator } = require('../model/operator.model')
var {} = require('../model/fgex.model')
var { postRoster, getDateWiseRoster } = require("../model/roster.model")
var { SkuMaster } = require("../model/product.model")
var { Format } = require('../model/format.model')
var faultDescritions = {
    siapi: {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "blocked": {
            "full": "Siapi Outfeed Blocked",
            "short": "Siapi Outfeed Blocked"
        },
        "waiting": {
            "full": "Infeed Lack",
            "short": "Infeed Lack"
        }
    },
    and_or: {
        "fault_0": {
            "full": "No Fault",
            "short": "No Fault"
        },
        "fault_1": {
            "full": "AndOr SignalRed",
            "short": "AndOr SignalRed"
        },
        "fault_2": {
            "full": "AndOr ExitFallenBottle2",
            "short": "AndOr ExitFallenBottle2"
        },
        "wait_1": {
            "full": "AndOr InfeedBottleStarve",
            "short": "AndOr InfeedBottleStarve"
        },
        "wait_2": {
            "full": "AndOr Feed Chute Handle Lack",
            "short": "AndOr Feed Chute Handle Lack"
        },
        "wait_3": {
            "full": "AndOr Hopper Handle Lack",
            "short": "AndOr Hopper Handle Lack"
        },
        "blocked": {
            "full": "AndOr OutfeedBlocked",
            "short": "AndOr OutfeedBlocked"
        },
    },
    inkjet: {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "blocked": {
            "full": "Inkjet Outfeed Blocked",
            "short": "Inkjet Outfeed Blocked"
        }
    },
    rinse_fillcap: {
        "fault_0": {
            "full": "No Fault",
            "short": "No Fault"
        },
        "fault_1": {
            "full": "RinseFillCap Signal Red",
            "short": "RinseFillCap Signal Red"
        },
        "fault_2": {
            "full": "RinseFillCap Baby Tank Oil Level Low",
            "short": "RinseFillCap Baby Tank Oil Level Low"
        },
        "waiting_1": {
            "full": "RinseFillCap InfeedStarve",
            "short": "RinseFillCap InfeedStarve"
        },
        "waiting_2": {
            "full": "RinseFillCap ChuteCapLack",
            "short": "RinseFillCap ChuteCapLack"
        },
        "blocked": {
            "full": " RinseFillCap OutfeedBlocked",
            "short": " RinseFillCap OutfeedBlocked"
        }
    },
    leak_tester: {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "blocked": {
            "full": "Leak Detect Outfeed Blocked",
            "short": "Leak Detect Outfeed Blocked"
        },
    },
    induction: {
        "fault_0": {
            "full": "No Fault",
            "short": "No Fault"
        },
        "fault_1": {
            "full": "IndSealer SignalRed",
            "short": "IndSealer SignalRed"
        },
        "fault_2": {
            "full": "Wad Transfer Plate Fallen Bottle",
            "short": "Wad Transfer Plate Fallen Bottle"
        }
    },
    "ave_glue": {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "blocked": {
            "full": "AveGlue Label Outfeed Blocked",
            "short": "AveGlue Label Outfeed Blocked"
        },
    },
    "new_tech_labeller": {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "blocked": {
            "full": "New Tech Oufeed Blocked",
            "short": "New Tech Oufeed Blocked"
        },
    },
    "outer_capper": {
        "fault_0": {
            "full": "No Fault",
            "short": "No Fault"
        },
        "fault_1": {
            "full": "OverCapper Chute Lack of Cap",
            "short": "OverCapper Chute Lack of Cap"
        },
        "fault_2": {
            "full": "OverCapper OutfeedBlocked",
            "short": "OverCapper OutfeedBlocked"
        },
        "fault_3": {
            "full": "OverCapper Hopper Cap Low",
            "short": "OverCapper Hopper Cap Low"
        },
        "fault_4": {
            "full": "OverCapper InfeedLack",
            "short": "OverCapper InfeedLack"
        },
        "fault_5": {
            "full": "Signal red",
            "short": "Signal red"
        },
        "wait_1": {
            "full": "Over Capper Chute Lack of Cap",
            "short": "OverCapper Chute Lack of Cap"
        },
        "wait_2": {
            "full": "Over Capper InfeedLack",
            "short": "Over Capper InfeedLack"
        },
        "blocked": {
            "full": "Over Capper Outfeed Blocked",
            "short": "Over Capper Outfeed Blocked"
        }
    },
    "tmgcp": {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_2": {
            "full": "Door Open",
            "short": "Door Opens"
        },
        "blocked": {
            "full": " TMGCP OutfeedBlocked",
            "short": " TMGCP OutfeedBlocked"
        },
    },
    "weigher_case_sealer": {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },
        "blocked": {
            "full": "Weigher Outfeed Blocked",
            "short": "Weigher Outfeed Blocked"
        },
    },
    "palletizer": {
        "fault_0": {
            "full": " No Fault",
            "short": "No Fault"
        },
        "fault_1": {
            "full": "Fault",
            "short": "Pal. fallen case1"
        },
        "fault_2": {
            "full": "Fault",
            "short": "Pal. fallen case2"
        },
        "fault_3": {
            "full": "Fault",
            "short": "Pal. fallen case3"
        },
        "fault_4": {
            "full": "Fault",
            "short": "ID Machine Signal RedOrange"
        },
        "blocked": {
            "full": " Stretch Wrap OutfeedBlocked",
            "short": " Stretch Wrap OutfeedBlocked"
        },
    },
    "pallet_id": {
        "fault_0": {
            "full": "FAULT",
            "short": "Fault"
        },
        "fault_1": {
            "full": "FAULT",
            "short": "Fault"
        },

    },
    "fallen_1": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle",
            "short": "Exit Conv. Fallen Bottle"
        },

    },
    "fallen_2": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle 2",
            "short": "Exit Conv. Fallen Bottle 2"
        },

    },
    "fallen_3": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle 3",
            "short": "Exit Conv. Fallen Bottle 3"
        },

    },
    "fallen_4": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle 4",
            "short": "Exit Conv. Fallen Bottle 4"
        },

    },
    "fallen_5": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle 5",
            "short": "Exit Conv. Fallen Bottle 5"
        },

    },
    "bottleflow_1": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle 5",
            "short": "Exit Conv. Fallen Bottle 5"
        },

    },
    "bottleflow_2": {
        "fault_1": {
            "full": "Exit Conv. Fallen Bottle 5",
            "short": "Exit Conv. Fallen Bottle 5"
        },

    }
}
router.get('/', async (req, res) => {
    var data = await MaualEntry.find();
    res.send(data)
});
//for master purpose only
router.get('/faultcause', async (req, res) => {
    var line = req.query.line_id
    var machine_state = req.query.machine_state;

    if (machine_state == "fault") {
        var fault = await FaultCause.find({ line_id: line, machine_state: machine_state }).populate({ path: 'line_id' }).populate({ path: 'machine_name' });
    } else {
        var fault = await FaultCause.find({ line_id: line, machine_state: { $ne: "fault" } }).populate({ path: 'line_id' }).populate({ path: 'machine_name' });
    }
    res.status(200).send(fault)
});
//for chart purpose only
router.get('/statecause', async (req, res) => {
    var line = req.query.line_id
    var machine_state = req.query.machine_state;
    var fault = await FaultCause.find({ line_id: line, machine_state: machine_state }).populate({ path: 'line_id' }).populate({ path: 'machine_name' });
    res.status(200).send(fault)
});

router.get('/comment/:stop_id', async (req, res) => {
    var stop_id = req.params.stop_id;
    if (stop_id) {
        var stop = await Comment.findOne({ stop_id: stop_id }).populate({ path: 'stop_id' }).populate({ path: 'selected_causes' });
        if (stop) {
            res.send(stop)
        } else {
            res.send({})
        }
    } else {
        res.status(404).send("Please give me valid stop_id")
    }
});

router.post('/faultcause', async (req, res) => {
    var machine = req.body.machine_name;
    var _id = req.body._id
    var fault_cause = req.body.cause_name;
    var machine_state = req.body.machine_state;
    var line_id = req.body.line_id;
    var fault_name = req.body.fault_name;
    if (_id) {
        var data = await FaultCause.findOne({ _id: _id });
        if (data) {
            var result = await FaultCause.findOne({ machine_name: machine, cause_name: fault_cause, machine_state: machine_state, _id: { $ne: _id } });
            if (result) {
                res.status(409).send('Duplicate record');
            } else {
                data.machine_name = machine;
                data.cause_name = fault_cause;
                data.machine_state = machine_state;
                data.fault_name = fault_name
                data.line_id = line_id;
                var result = await data.save();
                res.status(200).send(result)
            }
        } else {
            res.status(404).send('No record found')
        }
    } else {
        var data = await FaultCause.findOne({ machine_name: machine, cause_name: fault_cause, machine_state: machine_state });
        if (data) {
            res.status(409).send('Duplicate record');
        } else {
            var cause = new FaultCause({
                machine_name: machine,
                cause_name: fault_cause,
                line_id: line_id,
                fault_name: fault_name,
                machine_state: machine_state
            });
            var result = await cause.save();
            res.status(200).send(result)
        }
    }
});


router.post('/comment', async (req, res) => {
    var stop_id = req.body.stop_id;
    var comment_d = await getStop(stop_id)
    var c_d = comment_d['start_time'];
    var c_date = moment(c_d).local().startOf('day').format();
    var c_split = c_date.split('+');
    var comment_date = c_split[0] + '+00:00';
    var user_name = req.body.user_name;
    var parts = req.body.parts;
    var comment = req.body.user_comment;
    var date = moment().startOf('day').format();
    var split = date.split('+');
    var created_date = split[0] + '+00:00';
    var fault = req.body.selected_causes;
    var user_comment = [
        {
            user_name: user_name,
            comment: comment
        },
    ];
    if (stop_id) {
        var comment_schema = new Comment({
            stop_id: stop_id,
            parts: parts,
            selected_causes: fault,
            user_comment: user_comment,
            created_date: created_date,
            comment_date: comment_date
        });

        var result = await comment_schema.save();
        console.log(result)
        res.status(200).send(result)
    } else {
        res.status(404).send("Wrong Id")
    }
});

router.post('/addcomment', async (req, res) => {
    var comment_id = await Comment.findOne({ stop_id: req.body.stop_id });
    if (comment_id) {
        var user_name = req.body.addcomment_user_name;
        var comment = req.body.comment;
        comment_id.user_comment.push({
            user_name: user_name,
            comment: comment,
            timestamp: new Date()
        });
        var result = comment_id.save();
        res.send(result);
    } else {
        res.status(401).send('No Form Add on this comment')
    }
});

//post shift end comment 
router.post('/shiftcomment', async (req, res) => {

    var shift_comment = new ShiftComment(req.body);
    var result = await shift_comment.save();
    res.send(result)
	/* var result = await ShiftComment.findOne({shift_name:req.body.shift_name,comment_date:req.body.comment_date});
	if(result){
		res.status(401).send("Already Comment of this shift")
	}else{
    var shift_comment = new ShiftComment(req.body);
    var result = await shift_comment.save();
    res.send(result)
	} */
});
// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
//                                             All plant related manula api                                         // 
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//to add company in database
router.post('/company', async (req, res) => {
    var company = req.body.company_name;
    var company_id = req.body._id;
    var company_code = req.body.company_code;
    var code = req.body.company_code;
    if (company_id) {
        try {
            var data = await updateValue('Company', company_id, { company_name: company, company_code: company_code });
            res.status(data.statusCode).send(data)
        } catch (e) {
            console.error(e);
            res.status(409).send(e)
        }


    } else {
        var result = await addCompany(company, code);
        res.status(result.statusCode).send(result)
    }
});

//get company api
router.get('/company', async (req, res) => {
    var result = await getCompany();
    if (result.length > 0) {
        /*  var send_data = [];
         result.forEach((company) => {
             var data = {
                 company_name: company.company_name,
                 company_id: company._id,
                 company_code:company.code,
                 country:company.country,
                 state:company.country
             }
             send_data.push(data)
         }) */

        res.send(result)
    } else {
        res.status(404).send([])
    }
})

//add country in database
router.post('/country', async (req, res) => {
    var company = req.body.company_id;
    var country = req.body.country_name;
    var code = req.body.country_code;
    var country_id = req.body._id;
    if (country_id) {
        var data = await updateValue('Country', country_id, { company_id: company, country_name: country, country_code: code });
        res.status(data.statusCode).send(data)
    } else {
        var result = await addCountry(company, country, code);
        res.status(result.statusCode).send(result)
    }
});

//get country in database
router.get('/country/:id', async (req, res) => {
    var id = req.params.id
    var result = await getCountry(id);
    if (result.length > 0) {
        var send_data = [];
        /*  result.forEach((country) => {
             var data = {
                 company_name: country.company.company_name,
                 country_id: country._id,
                 country_code:country.code,
                 country_name: country.country_name
             }
             send_data.push(data)
         }) */

        res.send(result)
    } else {
        res.status(404).send('No record found')
    }
});

//add state in database
router.post('/state', async (req, res) => {
    var id = req.body.country_id;
    var name = req.body.state_name;
    var code = req.body.state_code;
    var state_id = req.body._id;
    if (state_id) {
        var data = await updateValue('State', state_id, { country: id, state_name: name, state_code: code });
        res.status(data.statusCode).send(data)

    } else {
        var state = await addState(id, name, code);
        res.status(state.statusCode).send(state);
    }
});

//get state 
router.get('/state/:id', async (req, res) => {
    var id = req.params.id
    var result = await getState(id);
    if (result.length > 0) {
        var send_data = [];
        /* result.forEach((state) => {
            var data = {
                company_name: state.country.company.company_name,
                state_id: state._id,
				state_code:state.code,
                country_name: state.country.country_name,
                state_name: state.state_name
            }
            send_data.push(data)
        }) */

        res.send(result)
    } else {
        res.status(404).send([])
    }
});

// add location
router.post('/location', async (req, res) => {
    var id = req.body.state_id;
    var name = req.body.location_name;
    var code = req.body.location_code;
    var location_id = req.body._id;
    if (location_id) {
        var result = await updateValue('Location', location_id, { state: id, location_name: name, location_code: code });
        res.status(result.statusCode).send(result)
    } else {
        var location = await addLocation(id, name, code)
        res.status(location.statusCode).send(location)
    }
});

//get location
router.get('/location/:id', async (req, res) => {
    var id = req.params.id;
    var result = await getLocation(id);
    if (result.length > 0) {
        res.send(result)
    } else {
        res.status(404).send([])
    }
});

//add plant
router.post('/plant', async (req, res) => {
    var id = req.body.location_id;
    var name = req.body.plant_name;
    var code = req.body.plant_code;
    var plant_id = req.body._id;
    if (plant_id) {
        var data = await updateValue('Plant', plant_id, { location: id, plant_name: name, plant_code: code });
        res.status(data.statusCode).send(data)
    } else {
        var plant = await addPlant(id, name, code)
        res.status(plant.statusCode).send(plant)
    }
});

//get plant
router.get('/plant/:id', async (req, res) => {
    var id = req.params.id;
    var result = await getPlant(id);
    if (result.length > 0) {
        /* var send_data = [];
        result.forEach((plant) => {
            var data = {
                plant_name: plant.plant_name,
                location_name: plant.location.location_name,
                company_name: plant.location.state.country.company.company_name,
                plant_id: plant._id,
				plant_code:plant.code,
                country_name: plant.location.state.country.country_name,
                state_name: plant.location.state.state_name
            }
            send_data.push(data)
        }) */

        res.send(result)
    } else {
        res.status(404).send([])
    }
});

//add line
router.post('/line', async (req, res) => {
    var id = req.body.plant_id;
    var name = req.body.line_name;
    var line_id = req.body._id;
    var code = req.body.line_code;
    console.log(id, name)
    if (line_id) {
        var data = await updateValue('Line', line_id, { plant: id, line_name: name, line_code: code });
        res.status(data.statusCode).send(data)
    } else {
        var line = await addLine(id, name, code)
        res.status(line.statusCode).send(line)
    }
});

//get line
router.get('/line/:id', async (req, res) => {
    var id = req.params.id;
    var result = await getLine(id);
    var send_data = [];
    if (result.length > 0) {
        /*  result.forEach((line) => {
             var data = {
                 line_name: line.line_name,
                 plant_name: line.plant.plant_name,
                 plant_id:line.plant._id,
                 location_name: line.plant.location.location_name,
                 location_id:line.plant.location._id,
                 company_name: line.plant.location.state.country.company.company_name,
                 company_id:line.plant.location.state.country.company._id,
                 line_id: line._id,
                 line_code:line.code,
                 country_name: line.plant.location.state.country.country_name,
                 country_id:line.plant.location.state.country._id,
                 state_name: line.plant.location.state.state_name,
                 state_id:line.plant.location.state._id
             }
             send_data.push(data)
         }) */

        res.send(result)
    } else {
        res.status(404).send([])
    }
});


//add product in database
router.post('/sku', async (req, res) => {
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var check_sku = await SkuMaster.findOne({ sku_number: req.body.sku_number, _id: { $ne: _id } });
        if (check_sku) {
            res.status(409).send(`SKU number = ${req.body.sku_number} already exist in database`)
        } else {
            var save = SkuMaster.update({ _id }, data, (err, data) => {
                if (err) {
                    res.status(400).send(err.message)
                } else {
                    res.status(200).send(data)
                }
            })
        }
    } else {
        var check_sku = await SkuMaster.findOne({ sku_number: req.body.sku_number });
        if (check_sku) {
            res.status(409).send("Duplicate Entry Found")
        } else {
            var skumaster = new SkuMaster(req.body);
            try {
                var save = await skumaster.save();
                res.status(200).send(save)
            } catch (error) {
                res.status(400).send(error.message)
            }
        }
    }
});

router.get('/sku', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await SkuMaster.find({ line_id: line_id }).populate({ path: 'line_id' }).populate({ path: 'equipments' }).populate({ path: 'format_id', select: 'format_name' });
    res.send(data)
})

// router.get('/sku/:id',async(req,res)=>{
//     var data = await SkuMaster.findById({_id: req.params.id}).populate('format_id')
//     if(data){
//         res.send(data.format_id)
//     }else{
//         res.send("not found")
//     }
// })

router.get('/sku/:id', async (req, res) => {
    var id = req.params.id
    var isValidproduct = mongoose.Types.ObjectId.isValid(id);
    if (isValidproduct == true) {
        var data = await SkuMaster.findById({ _id: id }).populate('format_id')
        if (data) {
            res.send(data.format_id)
        } else {
            res.send("id not Present in database")
        }
    } else {
        res.send("id format is not correct recheck id")
    }

})

//format api
// router.post('/format', async (req, res) => {
//         //console.log(req.body)
//         var data = new Format(req.body);
//         var save = await data.save();
//         res.status(200).send(save)
// });

router.get('/format', async (req, res) => {
    var line_id = req.query.line_id;
    var data = await Format.find({ line_id: line_id })
    res.send(data)
})


router.get('/format/:id',async(req,res)=>{
    var id = req.params.id
    var isValidproduct = mongoose.Types.ObjectId.isValid(id);
    if (isValidproduct == true) {
        var data = await Format.findById({_id: id}).populate('line_id')
        if(data){
            res.send(data)
        }else{
            res.send("id not Present in database")
        } 
    } else {
        res.send("id format is not correct")
    }
    
})


////////////////post and update format
router.post('/format', async (req, res) => {
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var check_sku = await Format.findOne({ format_code: req.body.format_code, _id: { $ne: _id } });
        if (check_sku) {
            res.status(409).send("code already present")
        } else {
            var save = Format.update({ _id }, data, (err, data) => {
                if (err) {
                    res.status(400).send(err.message)
                } else {
                    res.status(200).send(data)
                }
            })
        }
    } else {
        var check_f = await Format.findOne({ format_code: req.body.format_code });
        if (check_f) {
            res.status(409).send("Duplicate Entry Found....")
        } else {
            var format = new Format(req.body);
            try {
                var save = await format.save();
                res.status(200).send(save)
            } catch (error) {
                res.status(400).send(error.message)
            }
        }
    }
});











//batch 
router.post('/batchtrigger', async (req, res) => {
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var save = batchskutrigger.update({ _id }, data, (err, data) => {
            if (err) {
                res.status(400).send(err.message)
            } else {
                res.status(200).send(data)
            }
        })
    } else {
        var batchskutrigger = new Batchskutrigger(req.body);
        try {
            var save = await batchskutrigger.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }
});
/////////////batchtrigger
router.get('/batchtrigger', async (req, res) => {
    var line_id = req.query.line_id
    line_id = "5f0809fdc2b1ce30cc53eb8d"
     var data = await Batchskutrigger.find({}).populate('product_name');
   // console.log(data);
    res.send(data)
})
/////statusname 
router.get('/statusname', async (req, res) => {
    var data = await Statusname.find({});
    res.send(data)
})

//post state name
router.post('/statusname', async (req, res) => {
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var save = statusname.update({ _id }, data, (err, data) => {
            if (err) {
                res.status(400).send(err.message)
            } else {
                res.status(200).send(data)
            }
        })
    }else {
        var statusname = new Statusname(req.body);
        try {
            var save = await statusname.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }
});


//Rejected quantity Api

router.post('/qualityreject', async (req, res) => {
    var quantity = req.body.reject_quantity;
    var user_name = req.body.user_name;
    var comment = req.body.comment;
    var machine_name = req.body.machine_name;
    var shift_name = req.body.shift_name;
    var date = req.body.shift_date + "T00:00:00Z";
    var check_data = await qualityReject.findOne({ shift_name: shift_name, machine_name: machine_name, date: date });
    if (check_data) {
        check_data.comments.push({
            user_name: user_name,
            comment: comment
        });
        check_data.quantity = quantity;
        var data = await check_data.save();
        var result = {};
        result._id = data._id;
        result.machine_name = data.machine_name;
        result.shift_name = data.shift_name;
        result.shift_date = data.date;
        result.reject_quantity = data.quantity;
        result.comments = [{
            created_date: moment(data.comments[0].created_date).local().format(),
            comment: data.comments[0].comment,
            user_name: data.comments[0].user_name
        }];
        res.status(200).send(result);
    } else {
        var quntity = new qualityReject({
            machine_name: machine_name,
            shift_name: shift_name,
            date: date,
            quantity: quantity,
            comments: [{
                user_name: user_name,
                comment: comment
            }]
        });
        var data = await quntity.save();
        var result = {};
        result._id = data._id;
        result.machine_name = data.machine_name;
        result.shift_name = data.shift_name;
        result.shift_date = data.date;
        result.reject_quantity = data.quantity;
        result.comments = [{
            created_date: moment(data.comments[0].created_date).local().format(),
            comment: data.comments[0].comment,
            user_name: data.comments[0].user_name
        }];
        res.status(200).send(result);
    }
});

//get quality reject data
router.get('/qualityreject', async (req, res) => {
    var shift_name = req.query['shift_name'];
    var date = req.query['shift_date'] + "T00:00:00Z";
    var data = await qualityReject.find({ shift_name: shift_name, date: date });
    if (data.length > 0) {
        var result = [];
        data.forEach((reject) => {
            var push_data = {};
            push_data._id = reject._id;
            push_data.machine_name = reject.machine_name;
            push_data.shift_name = reject.shift_name;
            push_data.shift_date = reject.date;
            push_data.reject_quantity = reject.quantity;
            push_data.created_date = moment(reject.created_date).local().format();
            push_data.comments = [];
            reject.comments.forEach((comment) => {
                push_data.comments.push({
                    comment_id: comment._id,
                    created_date: moment(comment.created_date).local().format(),
                    comment: comment.comment,
                    user_name: comment.user_name
                })
            });
            result.push(push_data)
        })
        res.status(200).send(result);
    } else {
        res.status(404).send([]);
    }
});
///////////////////////////
////post operator
router.post('/postoperator', async (req, res) => {
    // var data = new Operator(req.body);
    // try {
    //     var save = await data.save();
    //     res.status(200).send(save)
    // } catch (error) {
    //     res.status(400).send(error.message)
    // }
    var data = req.body;
    var _id = req.body._id;
    if (_id) {
        var save = Operator.updateOne({ _id }, data, (err, data) => {
            if (err) {
                res.status(400).send(err.message)
            } else {
                res.status(200).send(data)
            }
        })
    } else {
        var operator = new Operator(req.body);
        try {
            var save = await operator.save();
            res.status(200).send(save)
        } catch (error) {
            res.status(400).send(error.message)
        }
    }
});

//get operator
router.get('/getoperator', async (req, res) => {
    var origin = req.query.origin;
    if (origin == "all") {
        var result = await Operator.find({})
    } else {
        var result = await Operator.find({ origin: origin });
    }
    res.send(result);
})

//post a operator
// router.post('/operator', async (req, res) => {
// var date = req.body.date + 'T00:00:00.000Z'
// var shift = req.body.shift
// var operator = req.body.operator
// var data = await Project.findOne({ shiftName: shift, date: date })
// //console.log(data)
// if (data) {
// var result = await Project.updateMany({
// shiftName: shift,
// date: date
// },
// { $set: { "operator_name": operator } },
// { multi: true })
// res.send(result)
// }
// else {
// res.send("data not found")
// }
// })
//////////////


//post fault Name
router.post('/equipment', async (req, res) => {
    var _id = req.body._id;
    var equipment_name = req.body.equipment_name;
    var display_name = req.body.display_name;
    var product = req.body.product;
    var line_id = req.body.line_id;
    if (_id) {
        var check_data = await Sku.findOne({ line_id: line_id, equipment_name: equipment_name, _id: { $ne: _id } });
        if (check_data) {
            res.status(409).send({
                statusCode: 409,
                type: "Duplicate",
                message: "Duplicate record Found"
            })
        } else {
            data = await Equipment.findOne({ _id: _id });
            data.equipment_name = equipment_name,
                data.display_name = display_name,
                data.line_id = line_id,
                data.product = product;
            var result = await data.save();
            res.status(200).send(result)
        }
    } else {
        var check_data = await Equipment.findOne({ line_id: line_id, equipment_name: equipment_name });
        if (check_data) {
            res.status(409).send({
                statusCode: 409,
                type: "Duplicate",
                message: "Duplicate record Found"
            })
        } else {
            var name = new Equipment({
                equipment_name: equipment_name,
                display_name: display_name,
                line_id: line_id,
                product: product
            });
            var result = await name.save();
            res.status(200).send(result)
        }
    }
});
// router.get('/equipment/:id',async(req,res)=>{
//     var line_id = req.params.id;
// 	if(line_id == "all"){
// 		var result = await Equipment.find({}).populate({path:'line_id'});
// 		res.status(200).send(result)
// 	}else if (!mongoose.Types.ObjectId.isValid(line_id)) {
//     return res.status(400).send("Invalid object id");
// 	}else{
// 		var result = await Equipment.find({line_id:line_id}).populate({path:'line_id'});
// 		res.status(200).send(result)
// 	}
//    //var data = await faultName.updateMany({},$set:{line_id:""})
// });
////////////////////////////////////
router.get('/equipment/:id', async (req, res) => {
    var line_id = req.params.id;
    var product = req.query.type;
    console.log(product)
    if (product == "all") {
        var result = await Equipment.find({}).populate({ path: 'line_id' });
        res.send(result);
    } else {
        var result = await Equipment.find({ product: product }).populate({ path: 'line_id' });
        res.send(result);
    }
    //var data = await faultName.updateMany({},$set:{line_id:""})

});
////////////////////////////////
//post fault Name
router.post('/faultname', async (req, res) => {
    var _id = req.body._id;
    var short_desc = req.body.short_desc;
    var long_desc = req.body.long_desc;
    var line_id = req.body.line_id;
    var machine_name = req.body.machine_name;
    var code = req.body.code;
    if (_id) {
        var check_data = await faultName.findOne({ machine_name: machine_name, $or: [{ long_desc: long_desc }, { short_desc: short_desc }], _id: { $ne: _id } });
        if (check_data) {
            res.status(409).send({
                statusCode: 409,
                type: "Duplicate",
                message: "Duplicate record Found"
            })
        } else {
            data = await faultName.findOne({ _id: _id });
            data.short_desc = short_desc,
                data.long_desc = long_desc,
                data.code = code,
                data.line_id = line_id,
                data.machine_name = machine_name;
            var result = await data.save();
            res.status(200).send(result);
        }
    } else {
        var check_data = await faultName.findOne({ machine_name: machine_name, $or: [{ long_desc: long_desc }, { short_desc: short_desc }] });
        if (check_data) {
            res.status(409).send({
                statusCode: 409,
                type: "Duplicate",
                message: "Duplicate record Found"
            })
        } else {
            if (!code) {
                code = await faultName.countDocuments({}) + 1;
            }
            var name = new faultName({
                short_desc: short_desc,
                long_desc: long_desc,
                line_id: line_id,
                code: code,
                machine_name: machine_name
            });
            var result = await name.save();
            res.status(200).send(result)
        }
    }
});

router.get('/faultname', async (req, res) => {
    var line = req.query.line_id;
    var result = await faultName.find({ line_id: line }).populate({ path: 'line_id' });
    res.status(200).send(result)
});

router.post('/schedulemaintanance', async (req, res) => {
    var _id = req.body._id;
    var line_id = req.body.line_id;
    var end_time = req.body.end_time;
    var start_time = req.body.start_time;
    console.log(start_time, end_time)
    var activity = req.body.activity;
    var title = req.body.title;
    var closed_date = req.body.closed_date;
    var status = req.body.status;
    if (_id) {
        var data = await scheduleMaintanance.findOne({ _id: _id });
        var pre_start = data.start_time;
        var pre_end = data.end_time;
        data.end_time = end_time;
        data.start_time = start_time;
        data.activity = activity;
        data.title = title;
        data.modified_date = new Date();
        data.status = status;
        data.line_id = line_id;
        if (status == 'Done') {
            data.closed_date = closed_date;
        }
        var result = await data.save();
        var re_data = await scheduleMaintanance.findOne({ _id: result._id }).populate('line_id').populate('activity.machine_name');
        if (re_data.status == 'Done') {
            var subject = `Completed Schedule Maintenance from ${moment(re_data.start_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} to ${moment(re_data.end_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} `;
            var body = mailFormatter(`Below Schedule Maintenance has been Completed which was scheduled from  ${moment(data.start_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} to ${moment(data.end_time).format("dddd, MMMM Do YYYY, h:mm:ss a")}`, [re_data])
            maintananaceMailer('sfwreports@gmail.com', 'shivam.singh@smartfactoryworx.com', subject, body)
        } else {
            var subject = `Re-Schedule Maintenance from ${moment(re_data.start_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} to ${moment(re_data.end_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} `;
            var body = mailFormatter(`Event has been modified/re-scheduled, which was scheduled:  ${moment(pre_start).format("dddd, MMMM Do YYYY, h:mm:ss a")} to ${moment(pre_end).format("dddd, MMMM Do YYYY, h:mm:ss a")}`, [re_data])
            maintananaceMailer('sfwreports@gmail.com', 'shivam.singh@smartfactoryworx.com', subject, body)
        }
        res.status(200).send(result)
    } else {
        /* 	var check_data = await scheduleMaintanance.findOne({line_id:line_id,start_time:start_time});
            if(check_data){
                 res.status(409).send({
                    statusCode: 409,
                    type: "Duplicate",
                    message: "Duplicate record Found"
                })
            }else{ */
        var maintanace = new scheduleMaintanance({
            line_id: line_id,
            title: title,
            end_time: end_time,
            start_time: start_time,
            activity: activity
        });
        var result = await maintanace.save();
        var mail_event = await scheduleMaintanance.findOne({ _id: result._id }).populate('line_id').populate('activity.machine_name');
        var subject = `Schedule Maintenance added from ${moment(mail_event.start_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} to ${moment(mail_event.end_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} `;
        var body = mailFormatter(`Below Event has been scheduled from  ${moment(mail_event.start_time).format("dddd, MMMM Do YYYY, h:mm:ss a")} to ${moment(mail_event.end_time).format("dddd, MMMM Do YYYY, h:mm:ss a")}`, [mail_event])
        maintananaceMailer('sfwreports@gmail.com', 'shivam.singh@smartfactoryworx.com', subject, body)
        res.status(200).send(result)
        //}
    }
});

// router.get('/schedulemaintanance',async (req,res)=>{
// 	var startDate = req.query['startTime']+"T00:00:00";
// 	var endDate = req.query['endTime']+"T23:59:00";
// 	var line_id = req.query['line_id'];
// 	var data  = await scheduleMaintanance.find({
// 		  line_id:line_id,
// 		  $or: [
//                 {
//                     $and: [
//                         {
//                             "start_time": {
//                                 $lte: new Date(startDate)
//                             }
//                         }, {
//                             "end_time": {
//                                 $gte: new Date(startDate)
//                             }
//                         }
//                     ]
//                 }, {
//                     $and: [
//                         {
//                             "start_time": {
//                                 $lte: new Date(endDate)
//                             }
//                         }, {
//                             "end_time": {
//                                 $gte: new Date(endDate)
//                             }
//                         }
//                     ]
//                 }, {
//                     $and: [
//                         {
//                             "start_time": {
//                                 $gte: new Date(startDate)
//                             }
//                         }, {
//                             "end_time": {
//                                 $lte: new Date(endDate)
//                             }
//                         }
//                     ]
//                 }
//             ]
// 	}).populate({path:'line_id'});
// 	var equipment = await Equipment.find({});
// 	var send_data =[];
// 	data.forEach((result)=>{
// 		var push_data = {};
// 		push_data._id = result._id;
// 		push_data.line = result.line;
// 		push_data.title = result.title;
// 		push_data.start_time = moment(result.start_time).local().format();
// 		push_data.end_time = moment(result.end_time).local().format();
// 		push_data.line_id = result.line_id;
// 		if(result.closed_date == null){
// 			push_data.closed_date = null;
// 		}else{
// 			push_data.closed_date = moment(result.closed_date).local().format();
// 		}
// 		push_data.status = result.status;
// 		push_data.created_date = moment(result.created_date).local().format();
// 		push_data.modified_date = moment(result.modified_date).local().format();
// 		var activity =[];
// 		result.activity.forEach((act)=>{
// 			activity.push({
// 				_id:act._id,
// 				machine_name:equipment.find(item => String(item._id) == String(act.machine_name)),
// 				byWhom:act.byWhom,
// 				activity:act.activity,
// 				comment:act.comment
// 			})
// 		});
// 		push_data.activity = activity;
// 		send_data.push(push_data);
// 	})
// 	res.send({results:send_data})
// });
//schedule maitanance 2
router.get('/schedulemaintanance', async (req, res) => {
    var startDate = req.query['startTime'] + "T00:00:00";
    var endDate = req.query['endTime'] + "T23:59:00";
    var line_id = req.query['line_id'];
    var data = await scheduleMaintanance.find({
        line_id: line_id,
        $or: [
            {
                $and: [
                    {
                        "start_time": {
                            $lte: new Date(startDate)
                        }
                    }, {
                        "end_time": {
                            $gte: new Date(startDate)
                        }
                    }
                ]
            }, {
                $and: [
                    {
                        "start_time": {
                            $lte: new Date(endDate)
                        }
                    }, {
                        "end_time": {
                            $gte: new Date(endDate)
                        }
                    }
                ]
            }, {
                $and: [
                    {
                        "start_time": {
                            $gte: new Date(startDate)
                        }
                    }, {
                        "end_time": {
                            $lte: new Date(endDate)
                        }
                    }
                ]
            }
        ]
    }).populate({ path: 'line_id' });
    var equipment = await Equipment.find({});
    var send_data = [];
    data.forEach((result) => {
        var push_data = {};
        push_data._id = result._id;
        push_data.line = result.line;
        push_data.title = result.title;
        push_data.start_time = moment(result.start_time).local().format('YYYY-MM-DDTHH:mm:ss');
        push_data.end_time = moment(result.end_time).local().format('YYYY-MM-DDTHH:mm:ss');
        push_data.line_id = result.line_id;
        if (result.closed_date == null) {
            push_data.closed_date = null;
        } else {
            push_data.closed_date = moment(result.closed_date).local().format('YYYY-MM-DDTHH:mm:ss');
        }
        push_data.status = result.status;
        push_data.created_date = moment(result.created_date).local().format('YYYY-MM-DDTHH:mm:ss');
        push_data.modified_date = moment(result.modified_date).local().format('YYYY-MM-DDTHH:mm:ss');
        var activity = [];
        result.activity.forEach((act) => {
            activity.push({
                _id: act._id,
                machine_name: equipment.find(item => String(item._id) == String(act.machine_name)),
                byWhom: act.byWhom,
                activity: act.activity,
                comment: act.comment
            })
        });
        push_data.activity = activity;
        send_data.push(push_data);
    })
    res.send({ results: send_data })
});

//pdt api
router.post('/pdt', async (req, res) => {
    var line_id = req.body.line_id;
    var _id = req.body._id;
    console.log(_id)
    var check_data;
    var pdt_name = req.body.pdt_name;
    var shift = req.body.shift;
    var pdt_type = req.body.pdt_type;
    var start_time = req.body.start_time;
    var end_time = req.body.end_time;
    var pdt_type = req.body.pdt_type;
    if (req.body.pdt_start_time && req.body.pdt_end_time) {
        var pdt_start_time = Number(req.body.pdt_start_time.split(":")[0]) * 60 + Number(req.body.pdt_start_time.split(":")[1]);
        var pdt_end_time = Number(req.body.pdt_end_time.split(":")[0]) * 60 + Number(req.body.pdt_end_time.split(":")[1]);
        /* check_data = await Pdt.find({
              _id: { $ne: _id},
              line_id:line_id,
              $or: [
                    {
                        $and: [
                            {
                                "pdt_start_time": {
                                    $lte: pdt_start_time
                                }
                            }, {
                                "pdt_end_time": {
                                    $gte: pdt_start_time
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "pdt_start_time": {
                                    $lte: pdt_end_time
                                }
                            }, {
                                "pdt_end_time": {
                                    $gte: pdt_end_time
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "pdt_start_time": {
                                    $gte: pdt_start_time
                                }
                            }, {
                                "pdt_end_time": {
                                    $lte: pdt_end_time
                                }
                            }
                        ]
                    }
                ]
        });
        }else{
            check_data = await Pdt.find({
              _id: { $ne: _id},
              line_id:line_id,
              $or: [
                    {
                        $and: [
                            {
                                "start_time": {
                                    $lte: new Date(start_time)
                                }
                            }, {
                                "end_time": {
                                    $gte: new Date(start_time)
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "start_time": {
                                    $lte: new Date(end_time)
                                }
                            }, {
                                "end_time": {
                                    $gte: new Date(end_time)
                                }
                            }
                        ]
                    }, {
                        $and: [
                            {
                                "start_time": {
                                    $gte: new Date(start_time)
                                }
                            }, {
                                "end_time": {
                                    $lte: new Date(end_time)
                                }
                            }
                        ]
                    }
                ]
        })*/
    }
    if (_id) {
        if (check_data) {
            res.status(409).send({
                statusCode: 409,
                type: "Duplicate",
                message: "Event Already Scheduled Between this Time"
            })
        } else {
            var pdt = await Pdt.findOne({ _id: _id });
            pdt.shift = shift;
            pdt.line_id = line_id;
            pdt.pdt_name = pdt_name;
            pdt.pdt_type = pdt_type;
            pdt.start_time = start_time;
            pdt.end_time = end_time;
            pdt.pdt_start_time = pdt_start_time
            pdt.pdt_end_time = pdt_end_time;
            var result = await pdt.save();
            res.status(200).send(result)
        }
    } else {
        if (check_data) {
            res.status(409).send({
                statusCode: 409,
                type: "Duplicate",
                message: "Event Already Scheduled Between this Time"
            })
        } else {
            var data = new Pdt({
                line_id: line_id,
                pdt_name: pdt_name,
                shift: shift,
                start_time: start_time,
                end_time: end_time,
                pdt_type: pdt_type,
                pdt_start_time: pdt_start_time,
                pdt_end_time: pdt_end_time
            });
            var result = await data.save();
            res.status(200).send(result)
        }
    }

});

//get pdt
router.get('/pdt', async (req, res) => {
    var line_id = req.query.line_id;
    var pdt = await Pdt.find({ line_id: line_id }).populate({ path: 'line_id' }).populate({ path: 'shift' });
    var send_data = [];
    pdt.forEach((data) => {
        var send_obj = {};
        send_obj.line_id = data.line_id;
        send_obj._id = data._id;
        send_obj.pdt_name = data.pdt_name;
        send_obj.shift = data.shift;
        send_obj.pdt_type = data.pdt_type;
        if (data.pdt_start_time && data.pdt_end_time) {
            send_obj.pdt_start_time = checkNumber(Math.floor(data.pdt_start_time / 60)) + ":" + checkNumber(data.pdt_start_time % 60);
            send_obj.pdt_end_time = checkNumber(Math.floor(data.pdt_end_time / 60)) + ":" + checkNumber(data.pdt_end_time % 60);
        } else {
            send_obj.start_time = moment(data.start_time).local().format();
            send_obj.end_time = moment(data.end_time).local().format();
        }
        send_data.push(send_obj)
    });
    res.send(send_data)
});

//shift
router.get('/shift', async (req, res) => {
    var line_id = req.query.line_id;
    var shift = await Shift.find({ line_id: line_id }).populate({ path: 'line_id' });
    console.log(shift);
    var send_data = [];
    shift.forEach((data) => {
        var send_obj = {};
        send_obj._id = data._id;
        send_obj.shift = data.shiftName;
        send_obj.line_id = data.line_id;
        send_obj.shiftStartTime = checkNumber(Math.floor(data.shiftStartTime / 60)) + ":" + checkNumber(data.shiftStartTime % 60);
        send_obj.shiftEndTime = checkNumber(Math.floor(data.shiftEndTime / 60)) + ":" + checkNumber(data.shiftEndTime % 60);
        send_data.push(send_obj)
    });
    res.send(send_data)
});
//holiday
router.post('/holiday', async (req, res) => {
    var _id = req.body._id;
    var line_id = req.body.line_id;
    var plant_id = req.body.plant_id;
    var holiday_date = req.body.holiday_date + 'T00:00:00.000+00:00';
    var holiday_name = req.body.holiday_name;
    if (_id) {
        var holiday = await Holiday.findOne({ _id: _id });
        holiday.line_id = line_id;
        holiday.plant_id = plant_id;
        holiday.holiday_date = holiday_date;
        holiday.holiday_name = holiday_name;
        var result = await holiday.save();
        res.status(200).send(result)
    } else {
        var holiday = new Holiday({
            line_id: line_id,
            plant_id: plant_id,
            holiday_date: holiday_date,
            holiday_name: holiday_name
        });
        var result = await holiday.save();
        res.status(200).send(result)
    }

});

router.get('/holiday', async (req, res) => {
    var line_id = req.query.line_id;
    var plant_id = req.query.plant_id;
    var start_date = req.query.start_date;
    var end_date = req.query.end_date;
    if (start_date == "all" || end_date == "all") {
        var result = await Holiday.find({ plant_id: plant_id }).populate('plant_id').populate('line_id');
        res.send(result)
    } else {
        var result = await Holiday.find({ start_date: { $gte: start_date, $lte: end_date }, plant_id: plant_id }).populate('line_id');
        res.status(200).send(result)
    }
});
//weekly off
var week_arr = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
router.post('/weeklyoff', async (req, res) => {
    var _id = req.body._id;
    var week = week_arr.indexOf(req.body.week) + 1;
    var week_days = req.body.week_days;
    var line_id = req.body.line_id;
    if (_id) {
        var weeklyoff = await WeeklyOff.findOne({ _id: _id });
        weeklyoff.line_id = line_id;
        weeklyoff.week = week_arr.indexOf(req.body.week) + 1;
        weeklyoff.week_days = week_days;
        var result = await weeklyoff.save();
        res.status(200).send(result)
    } else {
        var weeklyoff = new WeeklyOff({
            week: week,
            week_days: week_days,
            line_id: line_id
        });
        var result = await weeklyoff.save();
        res.status(200).send(result);
    }
});

// get weekly off
router.get('/weeklyoff', async (req, res) => {
    var line_id = req.query.line_id;
    var weeklyoff = await WeeklyOff.find({ line_id: line_id }).populate({ path: 'line_id' });
    send_data = [];
    weeklyoff.forEach((data) => {
        var send_obj = {};
        send_obj.week = week_arr[data.week - 1];
        send_obj.week_days = data.week_days;
        send_obj.line_id = data.line_id;
        send_obj._id = data._id;
        send_data.push(send_obj);
    });
    res.send(send_data)
})

// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
//                                             All plant related manula api end                                     // 
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get shift commnet

router.get('/shiftcomment', async (req, res) => {
    var shift_name = req.query['shift_name'];
    var comment_date = req.query['date'];
    var limit = req.query['limit'];
    var date = moment(comment_date).startOf('day').format();
    var split = date.split('+');
    var d = split[0] + '+00:00';
    if (limit == 1 || !limit) {
        var result = await ShiftComment.findOne({ shift_name: shift_name, comment_date: d });
        if (result) {
            res.status(200).send(result)
        } else {
            res.status(404).send('Shift Comment not found')
        }
    } else {
        var result = await ShiftComment.find({}).limit(Number(limit)).sort({ comment_date: 'desc' });
        res.status(200).send(result)
    }
});

//get range of shift comment

router.get('/commentreport', async (req, res) => {
    var s_Date = req.query['startDate'];
    var e_Date = req.query['endDate'];
    var startDate = dateFormat(s_Date);
    var endDate = dateFormat(e_Date)
    var stop = await Comment.find({ comment_date: { $gte: startDate, $lte: endDate } }).populate({ path: 'stop_id', populate: { path: 'status_name' } }).populate({ path: 'selected_causes' });
    var send_data = []
    if (stop.length > 0) {
        stop.forEach((element, i) => {
            var data = {};
            data['machine_name'] = element.stop_id.machine_name;
            data['parts'] = element.parts;
            data['start_time'] = moment(element.stop_id.start_time).local().format();
            data['end_time'] = moment(element.stop_id.end_time).local().format();
            data['comment_date'] = element.comment_date;
            data['created_date'] = element.created_date;
            if (element.stop_id.stop_name.match(/^fault/) || element.stop_id.stop_name.match(/^waiting/)) {
                data['fault_name'] = element.stop_id.status_name.fault_name;
                if (element.stop_id.stop_name.match(/^fault/)) {
                    data['state'] = 'Not Ready'
                } else {
                    data['state'] = 'Waiting'
                }
            } else {
                data['fault_name'] = element.stop_id.stop_name;
                data['state'] = element.stop_id.stop_name
            }

            data['user_comment'] = [];
            data['selected_causes'] = [];
            if (element.selected_causes.length > 0) {
                element.selected_causes.forEach((cause) => {
                    data['selected_causes'].push(cause.cause_name);
                });
            }
            element.user_comment.forEach((comment) => {
                data['user_comment'].push({
                    user_name: comment.user_name,
                    comment: comment.comment,
                    timestamp: moment(comment.timestamp).local().format(),
                })
            });
            send_data.push(data)
            if ((i + 1) == stop.length) {
                res.send(send_data)
            }
        })
    } else {
        res.send(stop)
    }
})

//post current sku
router.post('/currentsku', async (req, res) => {
    var data = await CurrentShift();
    var shift = data.shift;
    var d = data.date;
    var current_operator_shift = req.body.operator.shift_wise.find(data => { return data.shift_name == shift })
    var shift_A_operator = req.body.operator.shift_wise.find(data => { return data.shift_name == 'Shift A' });
    var shift_B_operator = req.body.operator.shift_wise.find(data => { return data.shift_name == 'Shift B' });
    var shift_C_operator = req.body.operator.shift_wise.find(data => { return data.shift_name == 'Shift C' });
    //console.log(d,shift);
    // var sku = req.body.sku;
    // console.log(sku);
    //var batch_id = req.body.batch_id;
    //var target_quantity = req.body.target_quantity
    var operator = req.body.operator
    if (!shift_A_operator || !shift_B_operator || !shift_C_operator || !operator) {
        res.status(403).send('Please send All require Data');
        return
    }
    //postSkuTrigger(sku);
    var data = await Project.updateOne({
        date: d,
    }, {
        $set: {
            'shift_wise.$[shiftElement].operator_name': current_operator_shift.operator_name
        }
    }, {
        arrayFilters: [
            { "shiftElement.shift_name": shift },
        ]
    })
    postRoster(operator);
    res.send(data)
})


router.get('/currentsku', async (req, res) => {
    var data = await CurrentShift();
    var d = data.date;
    // if (batch.target_quanity == 28800) {
    //     target_quanity = Math.round((batch.sku_name.rated_speed * 24))
    // } else {
    //     target_quanity = batch.target_quanity;
    // }
    var roster = await getDateWiseRoster(d)
    var batchdata = await Batchskutrigger.findOne({ end_time: null }).populate('product_name');
    //console.log(batchdata);
    var send_obj = {
        //batch_id: batch.sku_id,
        batch: batchdata.batch,
        date: d,
        target_quantity: batchdata.batch_size,
        product: batchdata.product_name,
        line_id: batchdata.line_id,
        operator: roster
    }
    res.send(send_obj)
})

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sfwreport@gmail.com',
        pass: 'Smart@12345'
    }
});

function sendemailer(from, to, subject, attachments, body) {
    console.log(from)
    // Setup email
    var mailOptions = {
        from: from,
        to: to,
        //cc:'gopalbha@gmail.com,govind@sg.clearpack.com,nishant.george@in.clearpack.com',
       // bcc: 'reports@smartfactoryworx.com',
        subject: subject,
        attachments: attachments,
        html: body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function (error, response) {
        if (error) console.log(error);
        else console.log("Message sent: " + response.message);
        // shut down the connection pool, no more messages
        transporter.close();
    });
}

router.post('/emailreportdata', async (req, res) => {
    //console.log(req.body.emailbody);
    var emailbody = req.body.emailbody;
    var to = req.body.to;
    var subject = req.body.subject;
    setTimeout(() => {
        sendemailer("sfwreport@gmail.com", to, subject, '', emailbody);
    }, 60000)

});
//for mail 
function mailFormatter(body_text, data) {
    var send_data = '';
    var greet = `Dear All, <br>`;
    var regards = `
    Link :  <a href ="https://avod968rus.smartfactoryworx.tech/#/schedule">https://avod968rus.smartfactoryworx.tech/#/schedule</a>
    <br><br>
    Thanks,
    <br>
    Admin
    <br> <br>
    Note : This is an auto-generated email send from the system.`;
    data.forEach(mail_event => {
        var body, line_name, title, start_timestamp, end_timestamp, created_date;
        var comment = '';
        var whom = '';
        var activity = '';
        var machine = '';
        var comment = '';
        mail_event.activity.forEach(element => {
            machine += element.machine_name.display_name + ",";
            activity += element.activity + ",";
            comment += element.comment + ",",
                whom += element.byWhom + ','
        });
        line_name = mail_event.line_id.line_name;
        start_timestamp = moment(mail_event.start_time).local().format("dddd, MMMM Do YYYY, h:mm:ss a");
        end_timestamp = moment(mail_event.end_time).local().format("dddd, MMMM Do YYYY, h:mm:ss a");
        title = mail_event.title;
        body = body_text;
        created_date = moment(mail_event.created_date).local().format();
        send_data += html_table(body, line_name, title, start_timestamp, end_timestamp, machine, whom, comment, activity, created_date);
    });
    return (greet + send_data + regards)
}
function html_table(body, line_name, title, start_timestamp, end_timestamp, machine, whom, comment, activity, created_date) {
    var format = `<br>
    ${body}<br><br>
    <table style='border-collapse: collapse;border: 1px solid black'>
    <tr style='border: 1px solid black'>
       <td style='border: 1px solid black'>Line Name
       <td style='border: 1px solid black'>
       <td style='border: 1px solid black;padding-left:20px;'>${line_name}</td>
    </tr>
    <tr style='border: 1px solid black'>
       <td style='border: 1px solid black'>Event Title
       <td>
       <td style='border: 1px solid black;padding-left:20px;'>${title}</td>
    </tr>
    <tr style='border: 1px solid black'>
       <td style='border: 1px solid black'>Scheduled Date
       <td>
       <td style='border: 1px solid black;padding-left:20px;'> ${start_timestamp} to ${end_timestamp}</td>
    </tr>
    <tr style='border: 1px solid black'>
       <td style='border: 1px solid black'>Machine
       <td>
       <td style='border: 1px solid black;padding-left:20px;'>${machine}</td>
    </tr>
    <tr style='border: 1px solid black'>
       <td style='border: 1px solid black'>Comment
       <td>
       <td style='border: 1px solid black;padding-left:20px;'>${comment}</td>
    </tr>
    <tr style='border: 1px solid black'>
       <td style='border: 1px solid black'>Activity
       <td>
       <td style='border: 1px solid black;padding-left:20px;'>${activity}</td>
    </tr>
    <tr style='border: 1px solid black'>
    <td style='border: 1px solid black'>Date Created
    <td>
    <td style='border: 1px solid black;padding-left:20px;'>${created_date}</td>
 </tr>
 </table>
 <br>
   `
    return format
}
function dateFormat(comment_date) {
    var date = moment(comment_date).startOf('day').format();
    var split = date.split('+');
    var d = split[0] + '+00:00';
    return d
}
function checkNumber(number) {
    if (number < 10) {
        return `0${number}`
    } else {
        return number
    }
}
module.exports = router;
