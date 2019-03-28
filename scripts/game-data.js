
function getGameData() {


  var gameData = [
      //primary resources
      new Resource ( {
          id:"food", name:"food", subType:"primary",
    		  get limit() { return 200 + (gameData.barn.owned * 200); },
    	  	set limit(value) { return this.limit; } // Only here for JSLint.
  	    } ),

      new Resource({
      		id:"wood", name:"wood",	subType:"primary",
      		get limit() { return 200 * (gameData.woodstock.owned  * 200); },
      		set limit(value) { return this.limit; } // Only here for JSLint.
    	}),
    	new Resource({
      		id:"stone", name:"stone", subType:"primary",
      		get limit() { return 200 + (gameData.stonestock.owned  * 200); },
      		set limit(value) { return this.limit; } // Only here for JSLint.
    	}),


    //secondary Resources
      new Resource ( {id: "herbs", name: "herb", plural: "herbs"} ),
      new Resource ( {id: "flint", name: "flint"} ),

      new Resource ( {id: "vines", name: "vine", plural: "vines"} ),
      new Resource ( {id: "sap", name: "sap"} ),

      new Resource ( {id: "ore", name: "ore"} ),
      new Resource ( {id: "gold", name: "gold"} ),

        //hunting based//
      new Resource ( { id:"skins", name:"skin", plural:"skins"} ),
      new Resource ( { id:"bones", name:"bone", plural:"bones"} ),

      //crafted//
      new Resource({ id:"leather", name:"leather" }),
	    new Resource({ id:"metal", name:"metal" }),


      //Housing//
      new Building( {
                    id:"freeLand", name:"free land", plural:"free land",
                    subType: "land",
                    prereqs: undefined,  // Cannot be purchased.
                  	require: undefined,  // Cannot be purchased.
                    vulnerable:false, // Cannot be stolen
                    initOwned:1000,
                    effectText:"Conquer more from your neighbors."
                    } ),
  	  new Building( {
  		            id:"tent", singular:"tent", plural:"tents",
  		            require: { wood:2, skins:2 },
  		            effectText:"+1 max pop."
                  } ),
    	new Building( {
              		id:"hut", singular:"wooden hut", plural:"wooden huts",
              		require : { wood:20, skins:1 },
              		effectText:"+3 max pop."
                  } ),
    	new Building( {
              		id:"cottage", singular:"cottage", plural:"cottages",
              		prereqs:{ masonry: true },
              		require:{ wood:10, stone:30 },
              		effectText:"+6 max pop."
                  } ),

      //Storage//
      new Building( {
                  id: "barn", singular:"barn", plural:"barns",
                  require:{ wood: 100 },
                  effectText: "+200 food storage"
                  } ),
     new Building( {
                  id: "woodstock", singular:"wood stockpile", plural:"wood stockpiles",
              		require:{ wood:100 },
              		effectText: "+200 wood storage"
                  } ),
     new Building( {
                  id: "stonestock", singular:"stone stockpile", plural:"stone stockpiles",
              		require:{ wood:100 },
              		effectText: "+200 stone storage"
                	} ),

    //actions//
     new Action({
        id:"forage", name: "forage", verb: "forage", activity: "foraging",
        type: "action", subType: "clickable",
        effectText:"Forage for Food",
        harvest:[
                { name: "food", baseChance: 1, get baseValue(){
                        var baseMin = 1;
                        var baseMax = 2;
                        return getRandomInt(this.baseMin, this.baseMax);
                } },
                {name: "herb",  basechance: 0.05, baseValue: 1},
                {name: "flint", basechance: 0.01, baseValue: 1},
                {name: "artifact", basechance: 0, baseValue: 1}
      ] }),
     new Action({
        id:"cutwood", name: "cut wood", verb: "cut", activity: "woodcutting",
        type: "action", subType: "clickable",
        effectText:"Forage for Food",
        harvest: [
            {name: "wood", baseChance: 1, get baseValue() {
                    var baseMin = 1;
                    var baseMax = 2;
                    return getRandomInt(this.baseMin, this.baseMax);
             } },
            {name: "vine",  basechance: 0.05, baseValue: 1},
            {name: "sap",   basechance: 0.01, baseValue: 1},
            {name: "nymph", basechance: 0,    baseValue: 1}
      ] }),
     new Action({
        id:"minestone", name: "mine", verb: "mine", activity: "mining",
        type: "action", subType: "clickable",
        effectText:"Mine for Stone",
        harvest: [
            {name: "stone", baseChance: 1, get baseValue() {
                    var baseMin = 1;
                    var baseMax = 2;
                    return getRandomInt(this.baseMin, this.baseMax);
            } },
            {name: "ore",   basechance: 0.05, baseValue: 1},
            {name: "gold",  basechance: 0.01, baseValue: 1},
            {name: "gem",   basechance: 0,    baseValue: 1}
      ] }),
     new Action({
        id:"hunt", name: "hunt", verb: "hunt", activity: "hunting",
        type: "action", subType: "clickable",
        effectText:"Hunt for Food",
        //base chance for entire action should be 0.5, either kill animal or come home empty handed//
        harvest: [
            {name: "food", baseChance: 0.5, get baseValue() {
                 var baseMin = 5;
                 var baseMax = 10;
                 return getRandomInt(this.baseMin, this.baseMax);
            } },
            {name: "skin",   basechance: 0.1,  baseValue: 1},
            {name: "bone",   basechance: 0.02, baseValue: 1},
            {name: "teeth",  basechance: 0.01, baseValue: 1}
        ] }),


      //units//
      new Unit({
            		id:"unemployed", singular:"idle citizen", plural:"idle citizens",
            		require: undefined,  // Cannot be purchased (through normal controls) xxx Maybe change this?
            		salable: false,  // Cannot be sold.
            		customQtyId:"spawnCustomQty",
            		effectText:"Playing idle games" }),
  	  new Unit({
          		id:"forager", singular:"forager", plural:"foragers",
          		source:"unemployed",
          		efficiency_base: 0.2,
          		get efficiency() {
          			return this.efficiency_base },
          		set efficiency(value) { this.efficiency_base = value },
          		effectText:"Automatically harvest food"
          	}),
  	  new Unit({
          		id:"woodcutter", singular:"woodcutter", plural:"woodcutters",
          		source:"unemployed",
          		efficiency: 0.5,
          		effectText:"Automatically cut wood" }),
  	  new Unit({
          		id:"miner", singular:"miner", plural:"miners",
          		source:"unemployed",
          		efficiency: 0.2,
          		effectText:"Automatically mine stone" }),
      new Unit({
              id:"hunter", singular:"hunter", plural:"hunters",
              source:"unemployed",
              efficiency: 0.2,
              effectText:"Automatically hunt beasts" }),

    ]; //end gameData array//




 //eventually want to increase chances & values linearly based on experience; i.e. scaling multipliers to the nearest thousandth (increments of +0.1% ...)//



  function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
  };

  indexArrayByAttr(gameData,"id");

  	// Initialize our data.
  gameData.forEach(function(elem)   {
      if (elem instanceof GameObj) {  elem.init();  }
  });

  return gameData;

//end getGameData function//
}
