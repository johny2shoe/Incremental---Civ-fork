"use strict";

var setup = {};
var loopTimer = 0;


var civSizes = [
	{ min_pop :      0, name: "Alone"                 , id : "alone"         },
  { min_pop :      1, name: "Some Company"          , id : "company"       },
	{ min_pop :      5, name: "A Small Band"          , id : "band"          },
	{ min_pop :     10, name: "A Hamlet"              , id : "hamlet"        },
	{ min_pop :     20, name: "A [Small] Village"     , id : "smallVillage"  },
	{ min_pop :     50, name: "A Village"             , id : "village"       },
  { min_pop :    100, name: "A Tiny Town"           , id : "tinyTown"      },
  { min_pop :    200, name: "A Small Town"          , id : "smallTown"     },
  { min_pop :    500, name: "A Respectable Town"    , id : "Town"          },
  { min_pop :   1000, name: "A Town No More"        , id : "largeTown"     },
	{ min_pop :   2000, name: "A Small Civ"          , id : "smallCiv"     },
	{ min_pop :   5000, name: "A Beautiful Civ"      , id : "fullCiv"          },
	{ min_pop :  10000, name: "A Crowded Civ"        , id : "crowdedCiv"   },
	{ min_pop : 100000, name: "An Overflowing Civ"   , id : "massiveCiv"   },
	{ min_pop : 500000, name: "A Civ Without Light"  , id : "empire"        },
  { min_pop : 200000, name: "Your Dystopian Fantasy", id : "distopia"      },
];

var statusManager = {
	civName: "Fork City",
	rulerName: "Dev",

	grave: { owned:0 },
	enemySlain: { owned:0 },
	morale: {
		mod: 		1.0,
		efficiency: 1.0
	},

	resourceClicks : 0, // For NeverClick
	attackCounter : 0, // How long since last attack?
};



var population = {
	current:	0,
	living:		0,
	limit:		0,
	healthy:	0,
	extra: 		0
};

//data arrays//
var gameData = getGameData();

var resourceData	= []; // All resources
var actionData    = []; //My own touch
var buildingData	= []; // All buildings
var upgradeData 	= []; // All upgrades
//var powerData 		= []; // All 'powers' //xxx This needs refinement.
var unitData 		= []; // All units
//var achData 		= []; // All achievements
//var sackable		= []; // All buildings that can be destroyed
//var lootable		= []; // All resources that can be stolen
//var killable		= []; // All units that can be destroyed
var homeBuildings	= []; // All buildings to be displayed in the home area
var homeUnits		= []; // All units to be displayed in the home area
//var armyUnits		= []; // All units to be displayed in the army area
var primaryResources	= []; // All primary (click-to-get) resources
var clickActions = [];	//main clickable actions
//var normalUpgrades	= []; // All upgrades to be listed in the normal upgrades area



function setIndexArrays (gameData) {
	gameData.forEach(function(elem){
		if (!(elem instanceof GameObj)) {
			console.error("Unknown type:", elem);
			return;
		}
		if (elem.type == "resource") {
			resourceData.push(elem);
		}
			if (elem.subType == "primary") {
				primaryResources.push(elem);
			}
    if (elem.type == "action") {
  		resourceData.push(elem);
		}
			if (elem.subType == "clickable") {
				clickActions.push(elem);
			}
		if (elem.type == "building") {
			buildingData.push(elem);
		}
		if (elem.type == "unit") {
			unitData.push(elem);
		}
	});
}





function calculatePopulation () {

	population = {
		current:	0,
		living:		0,
		limit:		0,
		healthy:	0,
		extra: 		0
	};

	//Update population limit by multiplying out housing numbers
	population.limit = (
		gameData.tent.owned
		+ (gameData.hut.owned * 3)
		+ (gameData.cottage.owned * 6)
		//+ (gameData.house.owned * 10)
		//+ (gameData.mansion.owned * 50)
	);

	//Update sick workers
	unitData.forEach(function(unit) {
		if (unit.isPopulation) { // has to be a player, non-special, non-mechanical
			population.current += unit.owned;

			if (unit.vulnerable) {
				// TODO Should this use 'killable'?
				population.healthy += unit.owned;
			}
			 else {
				population.healthy += 1; // TODO: Not sure if this is calculated right
			}
		} else {
			population.extra += unit.owned;
		}
	});
	// Calculate housed/fed population (excludes zombies)
	population.living = Math.max(0, population.current);
	// Calculate healthy workers (should exclude sick, zombies and deployed units)
	// TODO: Doesn't subtracting the zombies here throw off the calculations in randomHealthyWorker()?
	population.healthy = Math.max(0, population.healthy);

}

function getCivType () {
	var civType = civSizes.getCivSize(population.living).name;
	return civType;
}



function getReqText(costObj, qty)
{
	if (!isValid(qty)) { qty = 1; }
	costObj = valOf(costObj,qty); // valOf evals it if it's a function
	if (!isValid(costObj)) { return ""; }

	var i, num;
	var text = "";
	for(i in costObj)
	{
		// If the cost is a function, eval it with qty as a param.  Otherwise
		// just multiply by qty.
		num = (typeof costObj[i] == "function") ? (costObj[i](qty)) : (costObj[i]*qty);
		if (!num) { continue; }
		if (text) { text += ", "; }
		text += Math.round(num) + " " + gameData[i].getQtyName(num);
		//text += prettify(Math.round(num)) + " " + gameData[i].getQtyName(num);
	}

	return text;
}

function meetsPrereqs(prereqObj)  {
	if (!isValid(prereqObj)) { return false; }

	var i;
	for(i in prereqObj) {
	   if (isValid(gameData[i]) && isValid(gameData[i].owned)) { // Resource/Building/Upgrade
			    if (gameData[i].owned < prereqObj[i]) { return false; }
		}
	}

	return true;
}


function canAfford(costObj, qty)
{
	if (!isValid(costObj)) { return 0; }
	if (qty === undefined) { qty = Infinity; } // default to as many as we can
	if (qty === false) { qty = -1; } // Selling back a boolean item.
	var i;
	for(i in costObj)
	{
		if (costObj[i] === 0) { continue; }

		//xxx We don't handle nonlinear costs here yet.
		// Cap nonlinear purchases to one at a time.
		// Block nonlinear sales.
		if (typeof costObj[i] == "function") { qty = Math.max(0,Math.min(1,qty)); }

		qty = Math.min(qty,Math.floor(gameData[i].owned/valOf(costObj[i])));
		if (qty === 0) { return qty; }
	}

	return qty;
}


function payFor(costObj, qty)
{
	if (qty === undefined) { qty = 1; } // default to 1
	if (qty === false) { qty = -1; } // Selling back a boolean item.
	costObj = valOf(costObj,qty); // valOf evals it if it's a function
	if (!isValid(costObj)) { return 0; }

	qty = Math.min(qty,canAfford(costObj));
	if (qty === 0) { return 0; }

	var i,num;
	for(i in costObj)
	{
		// If the cost is a function, eval it with qty as a param.  Otherwise
		// just multiply by qty.
		num = (typeof costObj[i] == "function") ? (costObj[i](qty)) : (costObj[i]*qty);
		if (!num) { continue; }
		gameData[i].owned -= num;
	}

	return qty;
}


function canPurchase (purchaseObj, qty) {
	if (!purchaseObj) { return 0; }
	if (qty === undefined) { qty = Infinity; } // Default to as many as we can.
	if (qty === false) { qty = -1; } // Selling back a boolean item.

	// Can't buy if we don't meet the prereqs.
	if (!meetsPrereqs(purchaseObj.prereqs)) {
		qty = Math.min(qty, 0);
	}

	// Can't sell more than we have (if salable at all)
	qty = Math.max(qty, -(purchaseObj.salable ? purchaseObj.owned : 0));

	// If this is a relocation, can't shift more than our source pool.
	if (purchaseObj.source) {
		qty = Math.min(qty, gameData[purchaseObj.source].owned);
	}

	// If this is a destination item, it's just a relocation of an existing
	// item, so we ignore purchase limits.  Otherwise we check them.
	if (purchaseObj.isDest && !purchaseObj.isDest()) {
		qty = Math.min(qty, purchaseObj.limit - purchaseObj.total);
	}

	// See if we can afford them; return fewer if we can't afford them all
	return Math.min(qty, canAfford(purchaseObj.require));
}


//Display//
// Number format utility functions.
// - Allows testing the sign of strings that might be prefixed with '-' (like "-custom")
// - Output format uses the proper HTML entities for minus sign and infinity.
// Note that the sign of boolean false is treated as -1, since it indicates a
//   decrease in quantity (from 1 to 0).
function sgnnum(x) { return (x > 0) ? 1 : (x < 0) ? -1 : 0; }
function sgnstr(x) { return (x.length === 0) ? 0 : (x[0] == "-") ? -1 : 1; }
function sgnbool(x) { return (x ? 1 : -1); }
function absstr(x) { return (x.length === 0) ? "" : (x[0] == "-") ? x.slice(1) : x; }
function sgn(x) { return (typeof x == "number") ? sgnnum(x)
					   : (typeof x == "string") ? sgnstr(x)
					   : (typeof x == "boolean") ? sgnbool(x) : 0; }
function abs(x) { return (typeof x == "number") ? Math.abs(x) : (typeof x == "string") ? absstr(x) : x; }


function getResourceRowText(purchaseObj)
{
	// Make sure to update this if the number of columns changes.
	if (!purchaseObj) { return "<tr class='purchaseRow'><td colspan='6'/>&nbsp;</tr>"; }

	var objId = purchaseObj.id;
	var objName = purchaseObj.getQtyName(0);
	var s = (
		'<tr id="'+ objId + 'Row" class="purchaseRow" data-target="'+ objId + '">'
		+ '<td>'
		//+ '<img src="images/'+objId+'.png" class="icon icon-lg" alt="'+objName+'"/>'
		+ '<button data-display="increment">' + purchaseObj.name + '</button>'
		+ '<label>' + objName + ':</label>'
		+ '</td>'
		+ '<td class="number mainNumber"><span data-display="display">.</span></td>'
		+ '<td class="number maxNumber">/ max: <span id="max'+objId+'">...</span></td>'
		+ '<td class="number net"><span data-display="displayNet">..</span>/s</td>'
		+ '</tr>'
	);
	return s;
}


function getActionRowText(purchaseObj)
{
	// Make sure to update this if the number of columns changes.
	if (!purchaseObj) { return "<tr class='purchaseRow'><td colspan='7'/>&nbsp;</tr>"; }

	var objId = purchaseObj.id;
	var objName = purchaseObj.getQtyName(0);
	var s = (
		'<tr id="'+ objId + 'Row" class="purchaseRow" data-target="'+ objId + '">'
		+ '<td>'
		//+ '<img src="images/'+objId+'.png" class="icon icon-lg" alt="'+objName+'"/>'
		+ '<button data-display="increment">' + purchaseObj.verb + '</button>'
		+ '<label>' + objName + ':</label>'
		+ '</td>'
		+ '</tr>'
	);
	return s;
}







function getPurchaseCellText(purchaseObj, qty, inTable) {
	if (inTable === undefined) { inTable = true; }
	// Internal utility functions.
	function sgnchr(x) { return (x > 0) ? "+" : (x < 0) ? "&minus;" : ""; }
	//xxx Hack: Special formatting for booleans, Infinity and 1k.
	function infchr(x) { return (x == Infinity) ? "&infin;" : (x == 1000) ? "1k" : x; }
	function fmtbool(x) {
		var neg = (sgn(x) < 0);
		return (neg ? "(" : "") + purchaseObj.getQtyName(0) + (neg ? ")" : "");
	}
	function fmtqty(x) { return (typeof x == "boolean") ? fmtbool(x) : sgnchr(sgn(x))+infchr(abs(x)); }
	function allowPurchase() {
		if (!qty) { return false; } // No-op

		// Can't buy/sell items not controlled by player
		if (purchaseObj.alignment && (purchaseObj.alignment != "player")) { return false; }

		// Quantities > 1 are meaningless for boolean items.
		if ((typeof purchaseObj.initOwned == "boolean")&&(abs(qty) > 1)) { return false; }

		// Don't buy/sell unbuyable/unsalable items.
		if ((sgn(qty) > 0) && (purchaseObj.require === undefined)) { return false; }
		if ((sgn(qty) < 0) && (!purchaseObj.salable)) { return false; }

		//xxx Right now, variable-cost items can't be sold, and are bought one-at-a-time.
		if ((qty != 1) && purchaseObj.hasVariableCost()) { return false; }

		return true;
	}

	var tagName = inTable ? "td" : "span";
	var className = (abs(qty) == "custom") ? "buy" : purchaseObj.type;  // 'custom' buttons all use the same class.

	var s = "<"+tagName+" class='"+className+abs(qty)+"' data-quantity='"+qty+"' >";
	if (allowPurchase())
	{
		s +="<button class='x"+abs(qty)+"' data-display='purchase'"+" disabled='disabled'>"+fmtqty(qty)+"</button>";
	}
	s += "</"+tagName+">";
	return s;
}

// Pass this the item definition object.
// Or pass nothing, to create a blank row.
function getPurchaseRowText (purchaseObj) {
	// Make sure to update this if the number of columns changes.
	if (!purchaseObj) { return "<tr class='purchaseRow'><td colspan='13'/>&nbsp;</tr>"; }

	var objId = purchaseObj.id;
	var s = "<tr id='"+objId+"Row' class='purchaseRow' data-target='"+purchaseObj.id+"'>";

	[-Infinity, "-custom", -100, -10, -1]
	.forEach(function(elem) { s += getPurchaseCellText(purchaseObj, elem); });

	var display = (isValid(population[objId])) ? "display_pop" : "display"; //xxx Hack
	s += "<td class='number'><span data-display='"+display+"'>0</span></td>";

	// Don't allow Infinite (max) purchase on things we can't sell back.
	[1, 10, 100, "custom", ((purchaseObj.salable) ? Infinity : 1000)]
	.forEach(function(elem) { s += getPurchaseCellText(purchaseObj, elem); });

	//s += "<td>" + getCostNote(purchaseObj) + "</td>";
	s += "</tr>";

	return s;
}


// For efficiency, we set up a single bulk listener for all of the buttons, rather
// than putting a separate listener on each button.
function onBulkEvent(e) {
	switch (dataset(e.target,"display"))
	{
		case "increment": return onIncrement(e.target);
		case "purchase" : return onPurchase(e.target);
	}
	return false;
}



function addUITable(gameObjs, groupElemName)
{
	var elemString="";
	gameObjs.forEach(function(elem) {
		elemString += elem.type == "resource" ? getResourceRowText(elem)
        :elem.type == "action" ? getActionRowText(elem)
				  : elem.type == "upgrade"  ? getUpgradeRowText(elem)
					     : getPurchaseRowText(elem);
	});
	var groupElem = document.getElementById(groupElemName);
	groupElem.innerHTML += elemString;
	groupElem.onmousedown = onBulkEvent;
	return groupElem;
}

// We have a separate row generation function for upgrades, because their
// layout is differs greatly from buildings/units:
//  - Upgrades are boolean, so they don't need multi-purchase buttons.
//  - Upgrades don't need quantity labels, and put the name in the button.
//  - Upgrades are sometimes generated in a table with <tr>, but sometimes
//    outside of one with <span>.
function getUpgradeRowText(upgradeObj, inTable)
{
	if (inTable === undefined) { inTable = true; }
	var cellTagName = inTable ? "td" : "span";
	var rowTagName = inTable ? "tr" : "span";
	// Make sure to update this if the number of columns changes.
	if (!upgradeObj) { return inTable ? "<"+rowTagName+" class='purchaseRow'><td colspan='2'/>&nbsp;</"+rowTagName+">" : ""; }

	var s=  "<"+rowTagName+" id='"+upgradeObj.id+"Row' class='purchaseRow'";
	s +=    " data-target='"+upgradeObj.id+"'>";
	s +=    getPurchaseCellText(upgradeObj, true, inTable);
	s +=    "<"+cellTagName+">" + getCostNote(upgradeObj) + "</"+cellTagName+">";
	if (!inTable) { s += "<br />"; }
	s +=    "</"+rowTagName+">";
	return s;
}




function getLandTotals () {
	//Update land values
	var ret = { lands: 0, buildings: 0, free: 0 };
	buildingData.forEach(function(elem) {
		if (elem.subType == "land") { ret.free     += elem.owned; }
		else                        { ret.buildings += elem.owned; }
	});
	ret.lands = ret.free + ret.buildings;
	return ret;
}

//game functions//


function increment (objId) {
	var purchaseObj = gameData[objId];

	if (!purchaseObj) { console.log("Unknown purchase: "+objId); return; }

	purchaseObj.owned += purchaseObj.increment

	//Handles random collection of special resources.
	if (purchaseObj == gameData.action) {
		for (var i =0; i< purchaseObj.action.length; i++) {
				var a = purchaseObj.name[j];
				var act = a.name;
			}
  	for (var j =0; j< purchaseObj.act.harvest.length; j++) {
      	var h = purchaseObj.act.harvest[j];
      	var hRes = h.name;
  		}
		var resChance = purchaseObj.hRes.baseChance;
		if (purchaseObj.harvest && gameData[purchaseObj.harvest]) {  ///need adjusting//
			if (Math.random() <= resChance){
				var res = gameData[purchaseObj.hRes];
				var resQty =  purchaseObj.hRes.baseValue * (1); //modifiers will go here
				res.owned += res;
				gameLog("Found " + res.getQtyName(resQty) + " while " + purchaseObj.activity); // I18N
			}
		}
	}
	//Checks to see that resources are not exceeding their limits
	if (purchaseObj.owned > purchaseObj.limit) { purchaseObj.owned = purchaseObj.limit; }

	ui.find("#clicks").innerHTML = Math.round(++statusManager.resourceClicks);
	//ui.find("#clicks").innerHTML = prettify(Math.round(++statusManager.resourceClicks));
	//updateActionTotals();
	updateResourceTotals(); //Update the page with totals
}

function onIncrement(control) {
	// We need a valid target to complete this display.
	var targetId = dataset(control,"target");
	if (targetId === null) { return false; }

	return increment(targetId);
}




function doPurchase(objId,num){
	var purchaseObj = gameData[objId];
	if (!purchaseObj) { console.log("Unknown purchase: "+objId); return 0; }
	if (num === undefined) { num = 1; }
	if (abs(num) ==  "custom") { num =  sgn(num) * getCustomNumber(purchaseObj); }

	num = canPurchase(purchaseObj,num);  // How many can we actually get?

	// Pay for them
	num = payFor(purchaseObj.require,num);
	if (abs(num) < 1) {
		gameLog("Could not build, insufficient resources."); // I18N
		return 0;
	}

	//Then increment the total number of that building
	// Do the actual purchase; coerce to the proper type if needed
	purchaseObj.owned = matchType(purchaseObj.owned + num,purchaseObj.initOwned);
	if (purchaseObj.source) { gameData[purchaseObj.source].owned -= num; }

	// Post-purchase triggers
	if (isValid(purchaseObj.onGain)) { purchaseObj.onGain(num); } // Take effect


	// If building, then you use up free land
	if (purchaseObj.type == "building") {
		gameData.freeLand.owned -= num;
		// check for overcrowding
		if (gameData.freeLand.owned < 0) {
			gameLog("You are suffering from overcrowding.");  // I18N
			adjustMorale(Math.max(num,-gameData.freeLand.owned) * -0.0025 * (gameData.codeoflaws.owned ? 0.5 : 1.0));
		}
	}

	updateRequirements(purchaseObj); //Increases buildings' costs
	updateResourceTotals(); //Update page with lower resource values and higher building total
	updatePopulation(); //Updates the army display
	updateResourceRows(); //Update resource display
	updateBuildingButtons(); //Update the buttons themselves
	updateJobButtons(); //Update page with individual worker numbers, since limits might have changed.
	updatePartyButtons();
	//updateTargets(); // might enable/disable raiding

	return num;
}

function onPurchase(control) {
	// We need a valid target and a quantity to complete this action.
	var targetId = dataset(control,"target");
	if (targetId === null) { return false; }

	var qty = dataset(control,"quantity");
	if (qty === null) { return false; }

	return doPurchase(targetId, qty);
}


function calcWorkerCost(num, curPop){
	if (curPop === undefined) {
		curPop = population.living;
	}
	return (20*num) + calcArithSum(0.01, curPop, curPop + num);
}

//increment forager by forage action
// forager qty * forageAction * (forager efficiency)
//math rnd
//math ceil for low rate resources, right?//

// TODO: Need to improve 'net' handling.
function doForagers() {
  gameData.forage.net = (
    increment(gameData.forage) * gameData.forager.owned * gameData.forager.efficiency
  );
	gameData.forage.owned += gameData.forage.net;
}

function doWoodcutters() {
  gameData.cutwood.net = (
    increment(gameData.cutwood) * gameData.woodcutter.owned * gameData.woodcutter.efficiency
  );
	gameData.cutwood.owned += gameData.cutwood.net;
}

function doMiners() {
  gameData.minestone.net = (
    increment(gameData.minestone) * gameData.miner.owned * gameData.miner.efficiency
  );
	gameData.minestone.owned += gameData.minestone.net;
}

function doHunters() {
  gameData.hunt.net = (
    increment(gameData.hunt) * gameData.hunter.owned * gameData.hunter.efficiency
  );
	gameData.hunt.owned += gameData.hunt.net;
}


//if (gameData.resource.name == "food") {
	//gameData.resource.net -= (population.living * 0.1);
//}
//else if (gameData.resource.subType !== "primary") {
//	gameData.resource.net = math.round(gameData.resource.net)
//}







//Ui functions//

function paneSelect(control){
	var i,oldTarget;

	// Identify the target pane to be activated, and the currently active
	// selector tab(s).
	var newTarget = dataset(control,"target");
	var selectors = ui.find("#selectors");
	if (!selectors) { console.log("No selectors found"); return null; }
	var curSelects = selectors.getElementsByClassName("selected");

	// Deselect the old panels.
	for (i = 0; i < curSelects.length; ++i) {
		oldTarget = dataset(curSelects[i],"target");
		if (oldTarget == newTarget) { continue; }
		document.getElementById(oldTarget).classList.remove("selected");
		curSelects[i].classList.remove("selected");
	}

	// Select the new panel.
	control.classList.add("selected");
	var targetElem = document.getElementById(newTarget);
	if (targetElem) { targetElem.classList.add("selected"); }
	return targetElem;
}


function prettify(input){
	//xxx TODO: Add appropriate format options
	return input.toString();
	//return (settings.delimiters) ? Number(input).toLocaleString() : input.toString();
}


function clearResourceNets () {
	gameData.food.net = 0;
	gameData.wood.net = 0;
	gameData.stone.net = 0;
	gameData.skins.net = 0;
	gameData.herbs.net = 0;
	gameData.ore.net = 0;
	gameData.leather.net = 0;
	gameData.metal.net = 0;

	gameData.forage.net = 0;
	gameData.cutwood.net = 0;
	gameData.minestone.net = 0;
	gameData.hunt.net = 0;
}


function checkResourceLimits () {
	//Resources occasionally go above their caps.
	//Cull the excess /after/ other workers have taken their inputs.
	resourceData.forEach(function(resource){
		if (resource.owned > resource.limit) {
			resource.owned = resource.limit;
		}
	});
}



function gameLog(message){
	//get the current date, extract the current time in HH.MM format
	//xxx It would be nice to use Date.getLocaleTimeString(locale,options) here, but most browsers don't allow the options yet.
	var d = new Date();
	var curTime = d.getHours() + ":" + ((d.getMinutes() < 10) ? "0": "") + d.getMinutes();

	//Check to see if the last message was the same as this one, if so just increment the (xNumber) value
	if (ui.find("#logL").innerHTML != message) {
		logRepeat = 0; //Reset the (xNumber) value

		//Go through all the logs in order, moving them down one and successively overwriting them.
		var i = 7; // Number of lines of log to keep.
		while (--i > 1) { ui.find("#log"+i).innerHTML = ui.find("#log"+(i-1)).innerHTML; }
		//Since ids need to be unique, log1 strips the ids from the log0 elements when copying the contents.
		ui.find("#log1").innerHTML = (
			"<td>" + ui.find("#logT").innerHTML
			+ "</td><td>" + ui.find("#logL").innerHTML
			+ "</td><td>" + ui.find("#logR").innerHTML + "</td>"
		);
	}
	// Updates most recent line with new time, message, and xNumber.
	var s =  "<td id='logT'>" + curTime + "</td><td id='logL'>" + message + "</td><td id='logR'>";
	if (++logRepeat > 1) { s += "(x" + logRepeat + ")"; } // Optional (xNumber)
	s += "</td>";
	ui.find("#log0").innerHTML = s;
}



function gameLoop () {
	//debugging - mark beginning of loop execution
	//var start = new Date().getTime();


	calculatePopulation();

	// The "net" values for primary resources are just running totals of the
	// adjustments made each tick; as such they need to be zero'd out at the
	// start of each new tick.
	clearResourceNets();

	checkResourceLimits();

	// Production workers do their thing.
	doForagers();
	doWoodcutters();
	doMiners();
	doHunters();
	//doBlacksmiths();
	//doTanners();
	//doClerics();

	checkResourceLimits();

	//updateActionTotals();
	updateResourceTotals();

	updateAll();

};






//setup//

//========== SETUP (Functions meant to be run once on the DOM)

setup.all = function () {
	ui.find("#main").style.display = "none";
	setup.civSizes();
	setup.data();
	document.addEventListener("DOMContentLoaded", function(e){
		//setup.events();//
		setup.game();
		setup.loop();
		// Show the game
		ui.find("#main").style.display = "block";
	});
};


setup.data = function () {
	setIndexArrays(gameData);
};




setup.civSizes = function () {
	indexArrayByAttr(civSizes, "id");

	// Annotate with max population and index.
	civSizes.forEach(function(elem,i,arr) {
		elem.max_pop = (i+1 < arr.length) ? (arr[i+1].min_pop - 1) : Infinity;
		elem.idx = i;
	});

	civSizes.getCivSize = function(popcnt) {
		var i;
		for(i = 0; i< this.length; ++i){
			if (popcnt <= this[i].max_pop) { return this[i]; }
		}
		return this[0];
	};
};


setup.game = function () {
	console.log("Setting up game");
	//document.title = "CivClicker ("+versionData+")"; //xxx Not in XML DOM.

	addUITable(primaryResources, "primaryResources"); // Dynamically create the primary resource table.
	addUITable(clickActions, "clickActions")
	addUITable(homeBuildings, "buildings"); // Dynamically create the building controls table.
	addUITable(homeUnits, "jobs"); // Dynamically create the job controls table.
	//addUITable(armyUnits, "party"); // Dynamically create the party controls table.
	//addUpgradeRows(); // This sets up the framework for the upgrade items.
	//addUITable(normalUpgrades, "upgrades"); // Place the stubs for most upgrades under the upgrades tab.
	//if (!load("localStorage")) { //immediately attempts to load
		//Prompt player for names
		//renameCiv();
		//renameRuler();
	//}

	//setDefaultSettings();
};

setup.loop = function () {
	// This sets up the main game loop, which is scheduled to execute once per second.
	console.log("Setting up Main Loop");
	gameLoop();
	loopTimer = window.setInterval(gameLoop, 1000); //updates once per second (1000 milliseconds)
};

setup.all();
