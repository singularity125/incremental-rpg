/* global Tabletop */

//global variables
var spreadsheet = 'https://docs.google.com/spreadsheets/d/1kJn0gPnCHnaXb1dxq6xBX2BAKq7fJiUZfV7ogEMqUHo/pubhtml';
var tabletop;
var localtimestamp;


//Wrap other variables within top-level "Game" object
var Game = {};

function newgame()
{
    //fill with all defaults for a new save
    Game.msglog = [];
    Game.locations = [];
    //Game.monsters = []; Let tabletop handle this one otherwise it is wiped on save wipe

    //For testing: generate basic stats for player
    Game.player = new entity({name: "Player", level: 1, strength: 5, agility: 5, endurance: 5, exp: 0, gp: 0});
    
    //stats unique to player
    Game.player.toLevel = 5;
    Game.player.statpoints = 0;

    Game.monster = null; //Point to current monster regardless of location
    Game.location = null; //current location
    Game.incombat = false;
    
    
    //if we had tabs, clean them out
    //var tabs = $("#loctabs > li > p");
    
    $("#loctabs > li").each(function(i) {
        if (i > 0) { //don't remove home tab
            $(this).remove();
        }
    });
    
    $(".tab-content > div").each(function(i) {
        if (i > 0) {
            $(this).remove();
        }
    });
    
    $("#loctabs a:first").tab('show');
    
    $( ".levelup").hide();
}


//entity prototype
function entity(template)
{
    //Base stats
    this.name = template.name;
    this.level = template.level;
    this.strength = template.strength;
    this.agility = template.agility;
    this.endurance = template.endurance;
    this.exp = template.exp;
    this.gp = template.gp;
    
    //Derived stats
    recalcStats(this);
}

//function to format statboxes for player and enemies
function parseStats(creature) {
    if (creature !== null)
    {
        //color highlighting for hp
        var hpcol = 'green';
        if (creature.hp < (creature.maxhp*0.25))
        {
            hpcol = 'red';
        }
        else if (creature.hp < (creature.maxhp*0.5))
        {
            hpcol = 'yellow';
        }

        //common to both
        var label = creature.name + "<br />" +
            "Level: " + creature.level + "<br />" + 
            "HP: <span style=\"color:" + hpcol + "\">" + creature.hp.toFixed(2) + " / " + creature.maxhp + "</span><br />" +
            "Strength: " + creature.strength + "<br />" +
            "Agility: " + creature.agility + "<br />" + 
            "Endurance: " + creature.endurance + "<br />";

        if ("toLevel" in creature){
            //We know it's the player, add more info
            label += "<br />Exp: " + creature.exp + " / " + creature.toLevel + "<br />";
            label += "Gold: " + creature.gp;
        }

        return label;
    }
    else
    {
        //short explanation
        return "Press \"Hunt for monsters\" to find a monster in this location.<br>(Hunting continues automatically \
                until you leave the area or you are defeated.)";
    }
};

//recalculate derived stats on stat change
function recalcStats(creature)
{
    creature.maxhp = (creature.endurance*5);
    //creature.maxhp = creature.hp;
    if(!creature.hp)
    {
        creature.hp = creature.maxhp;
    }
}

//Show location stats
function locStats() {
    var label = "Monsters in this location:<br><br>";
    //console.log(Game.location);
    for (i = 0; i<Game.location.monsters.length; i++)
    {
        //console.log(Game.location.monseen[i]);
        if (Game.location.monsters[i].seen === true)
        {
            label += Game.location.monsters[i].name;  //monster name
            if ('scale' in Game.location.monsters[i])
            {
                label += " (Lv" + Game.location.monsters[i].scale + ")";
            }
            label += "<br>";
        }
        else
        {
            label += "???<br>";
        }
    }
    return label;
}


//Attack function
function attackMonster() {
    if (Game.monster !== null)
    {
        Game.incombat = true;
        
        //Hit calc:
        var hitchance = 0.3+(1/(1+Game.monster.agility/Game.player.agility));
        
        if (Math.random() <= hitchance)
        {
            //damage reduction of monster
            //var def = Math.max((-0.01 + 0.1*Math.log10(Game.monster.endurance)), 0);
            var def = (1-25/(25+Math.log10(Game.monster.endurance)));
            
            //calculate damage
            //use a random factor
            var mult = 1+ (0.2 * (Math.random()-0.5)); //should range from 80-120% of damage
            var dmg = mult * Math.max((Game.player.strength * 1 * (1-def)), 1);

            //$( "#footer" ).html("Monster def: " + def + ", your dmg: " + dmg);
            log("You attacked " + Game.monster.name + " for " + dmg.toFixed(2) + " damage.");

            Game.monster.hp -= dmg;
        }
        else
        {
            //missed
            log("You swung at " + Game.monster.name + " but missed!");
        }
            
        if (Game.monster.hp <= 0)
        {
            //handle player exp/leveling
            defeatMonster();
        }            
        else
        {
            //monster attacks back
            hitchance = 0.3+(1/(1+Game.player.agility/Game.monster.agility));
            if (Math.random() <= hitchance)
            {
                def = (1-25/(25+Math.log10(Game.player.endurance)));
                //calculate damage
                mult = 1+ (0.2 * (Math.random()-0.5)); //should range from 80-120% of damage
                dmg = mult * Math.max((Game.monster.strength * 1 * (1-def)), 1);

                log(Game.monster.name + " attacked you for " + dmg.toFixed(2) + " damage.");

                Game.player.hp -= dmg;
                if (Game.player.hp <= 0)
                {
                    Game.player.hp = 0;

                    log("You died! You can't attack for 5 seconds.");

                    //disable attacking for 5 seconds
                    //$( ".attack" ).off("click");
                    $( ".attack" ).addClass("disabled");
                    setTimeout(function(){
                        //$( ".attack" ).on("click",attackMonster);
                        $( ".attack" ).removeClass("disabled");
                    }, 5000);

                    //monster runs away
                    Game.monster = null;
                    Game.incombat = false;
                }
            }
            else
            {
                log(Game.monster.name + " attacked you but missed!");
            }
        }
    }
    
    
    //update stats
    $( ".statbox" ).html(parseStats(Game.player));
    $( ".monstatbox" ).html(parseStats(Game.monster));
}

function defeatMonster() {
    Game.player.exp += Game.monster.exp;
    Game.player.gp += Game.monster.gp;
    log("You defeated " + Game.monster.name + " earning " + Game.monster.exp + " EXP and " + Game.monster.gp + " gold!");
    
    if (Game.player.exp >= Game.player.toLevel)
    {
        while (Game.player.exp >= Game.player.toLevel)
        {
            Game.player.exp -= Game.player.toLevel;
            Game.player.level++;
            Game.player.statpoints += 3;
        
            Game.player.toLevel = 5 * Math.pow((Game.player.level),2);
        }
        
        Game.player.hp = Game.player.maxhp;
        recalcStats(Game.player);
        log("Level up! You are now level " + Game.player.level);
        
        $( "#statpoints").html("You have " + Game.player.statpoints + " stat points remaining.<br />");
        $( ".statup").removeClass("disabled");
        $( ".levelup").show();
    }
    
    //pick new monster randomly
    //Game.monster = new entity(tabletop.data()[Math.floor(Math.random()*tabletop.data().length)]);
    Game.incombat = false;
    hunt();
}

function level(stat) {
    if (Game.player.statpoints > 0 && stat in Game.player)
    {
        Game.player[stat]++;
        Game.player.statpoints--;
        $( "#statpoints").html("You have " + Game.player.statpoints + " stat points remaining.<br />");
    }
    if (Game.player.statpoints === 0)
    {
        $( ".statup").addClass("disabled");
    }
    
    recalcStats(Game.player);
    $( ".statbox" ).html(parseStats(Game.player));
}

//default jQuery "ready" event

$( document ).ready(function() {
    //load monster data
    tabletop = Tabletop.init( { key: spreadsheet, callback: loaddata, simpleSheet: true, parseNumbers: true } );
    
    newgame();
    
    localtimestamp = Date.now();
    
    //try loading old data
    loadgame();
    
   //Set the label for the stats to match the player stats
   //Build the label
   
   $( ".statbox" ).html(parseStats(Game.player));
   
   //monster stats
   //$( ".monstatbox").html(parseStats(monster));
   //$( ".attack" ).on("click",attackMonster);
   
   //$( ".sel" ).on("click", gohome);
   $( ".explore" ).on("click", addLocation);
   
   //turn on default tab clicks
   $("#loctabs a").click(function(e){
    	e.preventDefault();
        if (!Game.incombat)
            $(this).tab('show');
    });
    
    $(".reset").click(function(e){
        e.preventDefault();
        localStorage.clear();
        newgame();
        log("Data cleared!");
    });
   
   setInterval(tick, 1000);
});

function loaddata(data, tabletop)
{
    console.log(data);
    //monster = new entity(data[Math.floor(Math.random()*data.length)]);
    Game.monsters = data;
}

function savegame()
{
    if (Modernizr.localstorage)
    {
        localStorage.Game = JSON.stringify(Game);
        log("Game was saved!");
    }
}

function loadgame()
{
    //try to load a previous save
    if (Modernizr.localstorage)
    {
        if (localStorage.Game)
        {
            Game = JSON.parse(localStorage.Game);
            
            //Have to rebuild the tabs for locations
            for (var i = 0; i < Game.locations.length; i++)
            {
                //add new tab 
                addLocation(undefined, Game.locations[i], Game.locations[i].name);
            }
            
            Game.incombat = false;
            
            //if needed reshow level buttons
            if (Game.player.statpoints > 0)
            {
                $( "#statpoints").html("You have " + Game.player.statpoints + " stat points remaining.<br />");
                $( ".statup").removeClass("disabled");
                $( ".levelup").show();
            }
            
            log("Game successfully loaded");
        }
    }
}

//This function is used to add both new locations and existing ones (i.e. from reload)
function addLocation(e, newloc, locname)
{
    console.log(newloc);
    console.log(locname);
    
    locname = locname || "Location " + (Game.locations.length+1); //default name
    
    if (newloc === undefined)
    {
        //Generate areas based on a player level (25-125% of player level)
        var monlist = Game.monsters.filter(function(mon) {
           return (mon.level >= Math.floor(Game.player.level * 0.75) && mon.level <= Math.ceil(Game.player.level * 1.25));
        });

        //For now pick random monsters
        newloc = {monsters: [], name: locname};

        shuffle(monlist);

        for (i = 0; i<5; i++)
        {
            if (monlist.length > i)
            {
                //only push a name to save memory, do lookup later
                newloc.monsters.push({name: monlist[i].name, seen: false});
            }
            else //scaled monster test
            {
                //pull a random monster
                var index = Math.floor(Math.random()*Game.monsters.length);

                //scale to player level +/- 1
                var newlev = Math.round(Game.player.level + 2*Math.random() - 1);

                console.log("Level: " + newlev);

                newloc.monsters.push({name: Game.monsters[index].name, seen: false, scale: newlev});
            }
        }
        console.log(newloc);
    
        Game.locations.push(newloc);
    }
    
    //add new tab 
    $("#loctabs").append(
        $("<li>").attr("role", "presentation").append(
            $("<a>").attr("href", "#loc"+Game.locations.length).attr("role", "tab")
            .click(function (e) {
                e.preventDefault();
                if (!Game.incombat)
                    $(this).tab('show');
            }).on("shown.bs.tab", function (e) {
                Game.location = Game.locations[$(e.target).closest("li").index()-1];
                //console.log($(e.target).closest("li").index());
                
                $( ".locstatbox" ).html(locStats());
                //reset monster and disable button until hunt
                Game.monster = null;
                
                $( ".attack" ).addClass("disabled");
                
            }).append(locname)
    ));
    
    //add tab pane
    $(".tab-content").append(
        $("<div>").attr("role", "tabpanel").attr("class", "tab-pane").attr("id", "loc"+Game.locations.length).append(
            $("<div>").attr("class", "locstatbox well")).append(
            $("<div>").attr("class", "monstatbox well")).append(
                $("<a>").attr("href", "#hunt").attr("class", "hunt btn btn-default").text("Hunt for monsters").click(function (e) {
                e.preventDefault();
                hunt();
            })).append(

            $("<a>").attr("href", "#attack").attr("class", "attack btn btn-default").text("Attack!").click(function (e) {
                e.preventDefault();
                attackMonster();
            })
    ));
    
    /*$("<li/>", {
        role: "presentation",
        text: locname,
        href: "#tab"+locations.length,
        click: function() {
            gotoloc(locations.length);
        }
    }).appendTo("#loctabs");*/
    
    //$( "#loctabs" ).append("<span class='tab sel'>" + locname + "</span>");
}

function hunt() {
    //look at current location
    //Relies on Game.location being set!
    //Get a random monster
    var monindex = Math.floor(Math.random()*Game.location.monsters.length);
    var montemp = Game.location.monsters[monindex];
    
    //filter to find the right monster
    var match = Game.monsters.filter(function(obj) {
        return (obj.name === montemp.name);
    });
    
    // naively use first match 
    // (locations are generated from this list to begin with so at least 1 match SHOULD be guaranteed)
    Game.monster = new entity(match[0]);
    
    //show we found this monster
    montemp.seen = true;
    
    //scale if needed
    if ('scale' in montemp)
    {
        //get stat ratios
        var stattotal = (Game.monster.strength + Game.monster.agility + Game.monster.endurance);
        var newstatpool = (12+(3*montemp.scale));
        
        Game.monster.strength = Math.floor(Game.monster.strength / stattotal * newstatpool);
        Game.monster.agility = Math.floor(Game.monster.agility / stattotal * newstatpool);
        Game.monster.endurance = Math.floor(Game.monster.endurance / stattotal * newstatpool);
        
        //Game.monster.exp = Math.floor(Game.monster.exp / Game.monster.level * montemp.scale);
        //Game.monster.gp = Math.floor(Game.monster.gp / Game.monster.level * montemp.scale);
        
        Game.monster.exp = (montemp.scale * montemp.scale);
        Game.monster.gp = (2*montemp.scale);
        
        Game.monster.level = montemp.scale;
        
        Game.monster.name += " (Lv" + montemp.scale + ")";
        
        recalcStats(Game.monster);
        
        Game.monster.hp = Game.monster.maxhp;
    }
    
    //enable attack
    //$( ".attack" ).on("click",attackMonster);
    $( ".attack" ).removeClass("disabled");
    
    //disable hunt
    $( ".hunt" ).addClass("disabled");
    
    $( ".monstatbox" ).html(parseStats(Game.monster));
    $( ".locstatbox" ).html(locStats());
}

/*function gohome() {
    //hide locations
    $( ".page" ).hide();
    $( ".tab" ).removeClass("sel");
    
    //show home
    $( "#homecon" ).show();
    $( ".tab" ).first().addClass("sel");
}

function gotoloc(num) {
    //hide home and other locations
    $( "#homecon" ).hide();
    $( ".tab" ).removeClass("sel");
    
    //try to find existing div
    var divname = "loc" + num;
    if ($( divname ).length) {
        $( divname ).show();
    }
    else //else create new div
    {
        $("<div/>", {
            id: divname
        }).appendTo($("#content"));
    }
    
    $( ".tab" ).get(num).addClass("sel");
}*/

//tick function for updates
function tick()
{
    //console.log(Game.incombat);
    //for now hp regen is endurance per second
    //only regen when not in combat:
    if (!Game.incombat)
    {
        Game.player.hp = Math.min((Game.player.hp + (Game.player.endurance)), Game.player.maxhp);
        $("#loctabs li").removeClass("disabled");
        //console.log($("#loctabs li a"));
        $(".monstatbox").removeClass("panel-warning");
        $(".monstatbox").addClass("panel-default");
    }
    else
    {
        //lock down location tabs -- no fleeing!
        $("#loctabs li").addClass("disabled");
        $(".monstatbox").removeClass("panel-default");
        $(".monstatbox").addClass("panel-warning");
    }
    
    if (Game.monster === null)
    {
        $(".hunt").removeClass("disabled");
    }
    
    //redraw stat displays
    $( ".statbox" ).html(parseStats(Game.player));
    $( ".monstatbox" ).html(parseStats(Game.monster));
    
    $( "#msglog" ).html(Game.msglog.join('<br />'));
    
    //save every 30 seconds by default
    if (Date.now() - localtimestamp >= 30000)
    {
        savegame();
        localtimestamp = Date.now();
    }
}

//log to game's event/combat log. Newest entries at the top.
function log(string)
{
    Game.msglog.unshift(string);
    
    //phase out old entries to keep log short
    while (Game.msglog.length > 20)
    {
        Game.msglog.pop();
    }
}

//helper functions
//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};