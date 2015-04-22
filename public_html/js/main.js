//global variables
var spreadsheet = 'https://docs.google.com/spreadsheets/d/1kJn0gPnCHnaXb1dxq6xBX2BAKq7fJiUZfV7ogEMqUHo/pubhtml';
var tabletop;


//Wrap other variables within top-level "Game" object
var Game = {};

function newgame()
{
    //fill with all defaults for a new save
    Game.msglog = [];
    Game.locations = [];
    Game.monsters = [];

    //For testing: generate basic stats for player
    Game.player = new entity({name: "Player", level: 1, strength: 3, agility: 3, endurance: 3, exp: 0, gp: 0});
    
    //stats unique to player
    Game.player.toLevel = 5;
    Game.player.statpoints = 0;

    Game.monster = null; //Point to current monster regardless of location
    Game.location = null; //current location
    Game.incombat = false;
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
    this.hp = (this.level*10 + this.endurance*5);
    this.maxhp = this.hp;
}



//Basic monster
//var monster = new entity("Goblin", 1, 2, 2, 2, 1, 1);

//function to format statboxes for player and enemies
function parseStats(creature) {
    if (creature != null)
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
            label += "<br />Exp: " + Game.player.exp + " / " + Game.player.toLevel + "<br />";
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

//Attack function
function attackMonster() {
    if (Game.monster !== null)
    {
        Game.incombat = true;
        //damage reduction of monster
        var def = Math.max((-0.01 + 0.1*Math.log10(Game.monster.endurance)), 0);
        //calculate damage
        var dmg = Math.max((Game.player.strength * 2 * (1-def)), 1);

        //$( "#footer" ).html("Monster def: " + def + ", your dmg: " + dmg);
        log("You attacked " + Game.monster.name + " for " + dmg.toFixed(2) + " damage.");

        Game.monster.hp -= dmg;
        if (Game.monster.hp <= 0)
        {
            //handle player exp/leveling
            defeatMonster();
        }
        else
        {
            //monster attacks back
            def = Math.max((-0.01 + 0.1*Math.log10(Game.player.endurance)), 0);
            //calculate damage
            dmg = Math.max((Game.monster.strength * 2 * (1-def)), 1);

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
        Game.player.level++;
        Game.player.statpoints += 3;
        Game.player.maxhp = (Game.player.level*10 + Game.player.endurance*5);
        Game.player.hp = Game.player.maxhp;
        Game.player.toLevel = 5 * Math.pow((Game.player.level + 1),2);
        
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
    
    $( ".statbox" ).html(parseStats(Game.player));
}

//default jQuery "ready" event

$( document ).ready(function() {
    //load monster data
    tabletop = Tabletop.init( { key: spreadsheet, callback: loaddata, simpleSheet: true, parseNumbers: true } );
    
    newgame();
    
   //Set the label for the stats to match the player stats
   //Build the label
   
   $( ".statbox" ).html(parseStats(Game.player));
   
   //monster stats
   //$( ".monstatbox").html(parseStats(monster));
   //$( ".attack" ).on("click",attackMonster);
   
   //$( ".sel" ).on("click", gohome);
   $( ".explore" ).on("click", explore);
   
   //turn on default tab clicks
   $("#loctabs a").click(function(e){
    	e.preventDefault();
    	$(this).tab('show');
    });
   
   setInterval(tick, 1000);
});

function loaddata(data, tabletop)
{
    console.log(data);
    //monster = new entity(data[Math.floor(Math.random()*data.length)]);
    Game.monsters = data;
}

function explore(targetlevel)
{
    //Todo: generate areas based on a player level
    //For now pick random monsters
    var newloc = {monsters: []};
    for (i = 0; i<5; i++)
    {
        //only push a name to save memory, do lookup later
        newloc.monsters.push(Game.monsters[Math.floor(Math.random()*Game.monsters.length)].name);
    }
    console.log(newloc);
    
    Game.locations.push(newloc);
    var locname = "Location " + Game.locations.length;
    
    //add new tab 
    $("#loctabs").append(
        $("<li>").attr("role", "presentation").append(
            $("<a>").attr("href", "#loc"+Game.locations.length).attr("role", "tab")
            .click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            }).on("shown.bs.tab", function (e) {
                Game.location = Game.locations[$(e.target).closest("li").index()-1];
                //console.log($(e.target).closest("li").index());
                
                //reset monster and disable button until hunt
                Game.monster = null;
                
                $( ".attack" ).addClass("disabled");
                
            }).append(locname)
    ));
    
    //add tab pane
    $(".tab-content").append(
        $("<div>").attr("role", "tabpanel").attr("class", "tab-pane").attr("id", "loc"+Game.locations.length).append(
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
    var monname = Game.location.monsters[Math.floor(Math.random()*Game.location.monsters.length)];
    
    //filter to find the right monster
    var match = Game.monsters.filter(function(obj) {
        return (obj.name === monname);
    });
    
    // naively use first match 
    // (locations are generated from this list to begin with so at least 1 match SHOULD be guaranteed)
    Game.monster = new entity(match[0]);
    
    //enable attack
    //$( ".attack" ).on("click",attackMonster);
    $( ".attack" ).removeClass("disabled");
    
    //disable hunt
    $( ".hunt" ).addClass("disabled");
    
    $( ".monstatbox" ).html(parseStats(Game.monster));
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
    //for now hp regen is half of endurance per second
    //only regen when not in combat:
    if (!Game.incombat)
    {
        Game.player.hp = Math.min((Game.player.hp + (Game.player.endurance / 2)), Game.player.maxhp);
    }
    
    if (Game.monster === null)
    {
        $(".hunt").removeClass("disabled");
    }
    
    //redraw stat displays
    $( ".statbox" ).html(parseStats(Game.player));
    $( ".monstatbox" ).html(parseStats(Game.monster));
    
    $( "#msglog" ).html(Game.msglog.join('<br />'));
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