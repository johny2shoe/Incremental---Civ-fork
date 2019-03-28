function updateAll () {
	updateResourceRows(); //Update resource display
	updateBuildingButtons();
	updateJobButtons();
	//updatePartyButtons();
	updatePopulation();
	//updateTargets();
};


//xxx This should become an onGain() member method of the building classes
function updateRequirements(buildingObj){
	var displayNode = document.getElementById(buildingObj.id + "Cost");
	if (displayNode) { displayNode.innerHTML = getReqText(buildingObj.require); }
}

function updatePurchaseRow (purchaseObj) {
	if (!purchaseObj) { return; }

	var elem = ui.find("#" + purchaseObj.id + "Row");
	if (!elem) { console.warn("Missing UI element for "+purchaseObj.id); return; }

	// If the item's cost is variable, update its requirements.
	if (purchaseObj.hasVariableCost()) { updateRequirements(purchaseObj); }

	// Already having one reveals it as though we met the prereq.
	var havePrereqs = (purchaseObj.owned > 0) || meetsPrereqs(purchaseObj.prereqs);

	// Special check: Hide one-shot upgrades after purchase; they're
	// redisplayed elsewhere.
	var hideBoughtUpgrade = ((purchaseObj.type == "upgrade") && (purchaseObj.owned == purchaseObj.limit) && !purchaseObj.salable);

	var maxQty = canPurchase(purchaseObj);
	var minQty = canPurchase(purchaseObj,-Infinity);

	var buyElems = elem.querySelectorAll("[data-display='purchase']");

	buyElems.forEach(function(elt){
		var purchaseQty = dataset(elt, "quantity");
		// Treat 'custom' or Infinity as +/-1.
		//xxx Should we treat 'custom' as its appropriate value instead?
		var absQty = abs(purchaseQty);
		if ((absQty == "custom") || (absQty == Infinity)) {
			purchaseQty = sgn(purchaseQty);
		}
		elt.disabled = ((purchaseQty > maxQty) || (purchaseQty < minQty));
	});

	// Reveal the row if  prereqs are met
	ui.show(elem, havePrereqs && !hideBoughtUpgrade);
}


// Only set up for the primary resources right now.
function updateResourceRows() {
	primaryResources.forEach(function(elem) { updatePurchaseRow(elem); });
}
// Enables/disabled building buttons - calls each type of building in turn
// Can't do altars; they're not in the proper format.
function updateBuildingButtons() {
	homeBuildings.forEach(function(elem) { updatePurchaseRow(elem); });
}
// Update the page with the latest worker distribution and stats
function updateJobButtons(){
	homeUnits.forEach(function(elem) { updatePurchaseRow(elem); });
}
// Updates the party (and enemies)
//function updatePartyButtons(){
//	armyUnits.forEach(function(elem) { updatePurchaseRow(elem); });
//

//xxx Maybe add a function here to look in various locations for vars, so it
//doesn't need multiple action types?			*changed data-actiion to data-display
function updateResourceTotals(){
	var i,displayElems,elem,val;
	var landTotals = getLandTotals();

	// Scan the HTML document for elements with a "data-action" element of
	// "display".  The "data-target" of such elements (or their ancestors)
	// is presumed to contain
	// the global variable name to be displayed as the element's content.
	//xxx Note that this is now also updating nearly all updatable values,
	// including population
	displayElems = document.querySelectorAll("[data-display='display']");
	for (i=0;i<displayElems.length;++i)
	{
		elem = displayElems[i];
		//xxx Have to use statusManager here because of zombies and other non-gameData displays.
		//elem.innerHTML = prettify(Math.floor(statusManager[dataset(elem,"target")].owned)); //removed prettify
	}

	// Update net production values for primary resources.  Same as the above,
	// but look for "data-action" == "displayNet".
	displayElems = document.querySelectorAll("[data-display='displayNet']");
	for (i=0;i<displayElems.length;++i)
	{
		elem = displayElems[i];
		val = gameData[dataset(elem,"target")].net;
		if (!isValid(val)) { continue; }

		// Colourise net production values.
		if      (val < 0) { elem.style.color="#f00"; }
		else if (val > 0) { elem.style.color="#0b0"; }
		else              { elem.style.color="#000"; }

		elem.innerHTML = ((val < 0) ? "" : "+") + val.toFixed(1); //removed prettify
	}


	//if (gameData.gold.owned >= 1){
	//	ui.show("#goldRow",true);
	//}

	//Update page with building numbers, also stockpile limits.
	ui.find("#maxfood").innerHTML = gameData.food.limit; //removed prettify
	ui.find("#maxwood").innerHTML = gameData.wood.limit; //removed prettify
	ui.find("#maxstone").innerHTML = gameData.stone.limit; //removed prettify
	ui.find("#totalBuildings").innerHTML = landTotals.buildings; //removed prettify
	ui.find("#totalLand"     ).innerHTML = landTotals.lands; //removed prettify

	// Unlock advanced control tabs as they become enabled (they never disable)
	// Temples unlock Deity, barracks unlock Conquest, having gold unlocks Trade.
	// Deity is also unlocked if there are any prior deities present.

}

//Update page with numbers
function updatePopulation (calc) {
	var i, elem, elems, displayElems,
		spawn1button = ui.find("#spawn1button"),
		spawnCustomButton = ui.find("#spawnCustomButton"),
		spawnMaxbutton = ui.find("#spawnMaxbutton"),
		spawn10button = ui.find("#spawn10button"),
		spawn100button = ui.find("#spawn100button"),
		spawn1000button = ui.find("#spawn1000button");

	if (calc) { calculatePopulation(); }

	// Scan the HTML document for elements with a "data-action" element of
	// "display_pop".  The "data-target" of such elements is presumed to contain
	// the population subproperty to be displayed as the element's content.
	//xxx This selector should probably require data-target too.
	//xxx Note that relatively few values are still stored in the population
	// struct; most of them are now updated by the 'display' action run
	// by updateResourceTotals().
	displayElems = document.querySelectorAll("[data-display='display_pop']");
	displayElems.forEach(function(elt){
		var prop = dataset(elt, "target");
		elt.innerHTML = Math.floor(population[prop]); //removed prettify
	});

	//gameData.house.update(); // TODO: Effect might change dynamically.  Need a more general way to do this.
	//gameData.barn.update();

	ui.show("#graveTotal", (statusManager.grave.owned > 0));
	ui.show("#totalSickRow",(population.totalSick > 0));

	//As population increases, various things change
	// Update our civ type name
	ui.find("#civType").innerHTML = getCivType();

	//Unlocking interface elements as population increases to reduce unnecessary clicking
	//xxx These should be reset in reset()
	if (population.current >= 10) {
		if (!settings.customIncr){
			elems = document.getElementsByClassName("unit10");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
		}
	}
	if (population.current >= 100) {
		if (!settings.customIncr){
			elems = document.getElementsByClassName("building10");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
			elems = document.getElementsByClassName("unit100");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
		}
	}
	if (population.current >= 1000) {
		if (!settings.customIncr){
			elems = document.getElementsByClassName("building100");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
			elems = document.getElementsByClassName("unit1000");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
			elems = document.getElementsByClassName("unitInfinity");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
		}
	}
	if (population.current >= 10000) {
		if (!settings.customIncr){
			elems = document.getElementsByClassName("building1000");
			for(i = 0; i < elems.length; i++) {
				ui.show(elems[i], !settings.customincr);
			}
		}
	}

	//Turning on/off buttons based on free space.
	var maxSpawn = Math.max(0,Math.min((population.limit - population.living),logSearchFn(calcWorkerCost,gameData.food.owned)));

	spawn1button.disabled = (maxSpawn < 1);
	spawnCustomButton.disabled = (maxSpawn < 1);
	spawnMaxbutton.disabled = (maxSpawn < 1);
	spawn10button.disabled = (maxSpawn < 10);
	spawn100button.disabled = (maxSpawn < 100);
	spawn1000button.disabled = (maxSpawn < 1000);


	ui.find("#workerNumMax").innerHTML = Math.round(maxSpawn); //removed prettify

	spawn1button.title = "Cost: " + Math.round(calcWorkerCost(1)) + " food"; //removed prettify
	spawn10button.title = "Cost: " + Math.round(calcWorkerCost(10)) + " food"; //removed prettify
	spawn100button.title = "Cost: " + Math.round(calcWorkerCost(100)) + " food"; //removed prettify
	spawn1000button.title = "Cost: " + Math.round(calcWorkerCost(1000)) + " food"; //removed prettify
	spawnMaxbutton.title = "Cost: " + Math.round(calcWorkerCost(maxSpawn)) + " food"; //removed prettify

	ui.find("#workerCost").innerHTML = Math.round(calcWorkerCost(1)); //removed prettify

	updateJobButtons(); //handles the display of units in the player's kingdom.
	//updatePartyButtons(); // handles the display of units out on raids.
	updateMorale();
	//updateAchievements(); //handles display of achievements
	updatePopulationBar();
	updateLandBar();
}

function updatePopulationBar () {
	var barElt = ui.find("#populationBar");
	var h = '';
	function getUnitPercent (x, y) {
		return (Math.floor(100000 * (x / y)) / 1000);
	}
	unitData.forEach(function(unit){
		var p;
		if (unit.isPopulation) {
			p = getUnitPercent(unit.owned, population.current);
			h += (
				'<div class="' + unit.id + '" '
				+ ' style="width: ' + p + '%">'
				+ '<span>' + (Math.round(p * 10)/10) + '% ' + unit.plural + '</span>'
				+ '</div>'
			);
		}
	});
	barElt.innerHTML = (
		'<div style="min-width: ' + getUnitPercent(population.current, population.limitIncludingUndead) + '%">'
		+ h
		+ '</div>'
	);
}

function updateLandBar () {
	var barElt = ui.find("#landBar");
	var landTotals = getLandTotals();
	var p = (Math.floor(1000 * (landTotals.buildings / landTotals.lands)) / 10);
	barElt.innerHTML = ('<div style="width: ' + p + '%"></div>');
}





// Dynamically create the achievement display

function updateMorale(){
	//updates the morale stat
	var happinessRank; // Lower is better
	var elt = ui.find("#morale");
	//first check there's someone to be happy or unhappy, not including zombies
	if (population.living < 1) {
		elt.className = "";
		return;
	}

	if (statusManager.morale.efficiency > 1.4) { 		happinessRank = 1; }
	else if (statusManager.morale.efficiency > 1.2) { 	happinessRank = 2;    }
	else if (statusManager.morale.efficiency > 0.8) { 	happinessRank = 3;  }
	else if (statusManager.morale.efficiency > 0.6) { 	happinessRank = 4;  }
	else                              { 		happinessRank = 5;    }

	elt.className = "happy-" + happinessRank;
}
