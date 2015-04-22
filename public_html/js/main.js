//global variables
var spreadsheet = 'https://docs.google.com/spreadsheets/d/1kJn0gPnCHnaXb1dxq6xBX2BAKq7fJiUZfV7ogEMqUHo/pubhtml';
var tabletop;
var msglog = [];
var locations = [];
var monsters = [];

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


//For testing: generate basic stats for player
var player = new entity({name: "Player", level: 1, strength: 3, agility: 3, endurance: 3, exp: 0, gp: 0});
//stats unique to player
player.toLevel = 5;
player.statpoints = 0;

//Basic monster
var monster = new entity("Goblin", 1, 2, 2, 2, 1, 1);

//function to format statboxes for player and enemies
function parseStats(creature) {

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
        label += "<br />Exp: " + player.exp + " / " + player.toLevel + "<br />";
    }
    
    return label;
};

//Attack function
function attackMonster() {
    //damage reduction of monster
    var def = Math.max((-0.01 + 0.1*Math.log10(monster.endurance)), 0);
    //calculate damage
    var dmg = Math.max((player.strength * 2 * (1-def)), 1);
    
    //$( "#footer" ).html("Monster def: " + def + ", your dmg: " + dmg);
    log("You attacked " + monster.name + " for " + dmg.toFixed(2) + " damage.");
    
    monster.hp -= dmg;
    if (monster.hp <= 0)
    {
        //handle player exp/leveling
        defeatMonster();
    }
    else
    {
        //monster attacks back
        def = Math.max((-0.01 + 0.1*Math.log10(player.endurance)), 0);
        //calculate damage
        dmg = Math.max((monster.strength * 2 * (1-def)), 1);
        
        log(monster.name + " attacked you for " + dmg.toFixed(2) + " damage.");
        
        player.hp -= dmg;
        if (player.hp <= 0)
        {
            player.hp = 0;
            
            log("You died! You can't attack for 5 seconds.");
            
            //disable attacking for 5 seconds
            $( ".attack" ).off("click");
            $( ".attack" ).addClass("disabled");
            setTimeout(function(){
                $( ".attack" ).on("click",attackMonster);
                $( ".attack" ).removeClass("disabled");
            }, 5000);
        }
    }
    
    
    //update stats
    $( ".statbox" ).html(parseStats(player));
    $( ".monstatbox" ).html(parseStats(monster));
}

function defeatMonster() {
    player.exp += monster.exp;
    player.gp += monster.gp;
    log("You defeated " + monster.name + " earning " + monster.exp + " EXP and " + monster.gp + " gold!");
    
    if (player.exp >= player.toLevel)
    {
        player.level++;
        player.statpoints += 3;
        player.maxhp = (player.level*10 + player.endurance*5);
        player.hp = player.maxhp;
        player.toLevel = 5 * Math.pow((player.level + 1),2);
        
        log("Level up! You are now level " + player.level);
        
        $( "#statpoints").html("You have " + player.statpoints + " stat points remaining.<br />");
        $( ".statup").removeClass("disabled");
        $( ".levelup").show();
    }
    
    //pick new monster randomly
    monster = new entity(tabletop.data()[Math.floor(Math.random()*tabletop.data().length)]);
}

function level(stat) {
    if (player.statpoints > 0 && stat in player)
    {
        player[stat]++;
        player.statpoints--;
        $( "#statpoints").html("You have " + player.statpoints + " stat points remaining.<br />");
    }
    if (player.statpoints === 0)
    {
        $( ".statup").addClass("disabled");
    }
    
    $( ".statbox" ).html(parseStats(player));
}

//default jQuery "ready" event

$( document ).ready(function() {
    //load monster data
    tabletop = Tabletop.init( { key: spreadsheet, callback: loaddata, simpleSheet: true, parseNumbers: true } );
    
   //Set the label for the stats to match the player stats
   //Build the label
   
   $( ".statbox" ).html(parseStats(player));
   
   //monster stats
   //$( ".monstatbox").html(parseStats(monster));
   //$( ".attack" ).on("click",attackMonster);
   
   $( ".sel" ).on("click", gohome);
   $( ".explore" ).on("click", explore);
   
   setInterval(tick, 1000);
});

function loaddata(data, tabletop)
{
    console.log(data);
    //monster = new entity(data[Math.floor(Math.random()*data.length)]);
    monsters = data;
}

function explore(targetlevel)
{
    //Todo: generate areas based on a player level
    //For now pick random monsters
    var newloc = {monsters: []};
    for (i = 0; i<5; i++)
    {
        newloc.monsters.push(monsters[Math.floor(Math.random()*monsters.length)]);
    }
    console.log(newloc);
    
    locations.push(newloc);
    var locname = "Location " + locations.length;
    
    //add new tab 
    $("#loctabs").append(
        $("<li>").attr("role", "presentation").append(
            $("<a>").attr("href", "#loc"+locations.length).attr("role", "tab").attr("data-toggle", "tab")
            .click(function (e) {
                e.preventDefault();
                $(this).tab('show');
                //Load a monster from this area
                var index = $("#loctabs").index(".active");
                monster = locations[index-1].monsters[Math.floor(Math.random()*locations[index-1].monsters.length)];
            }).append(locname)
    ));
    
    //add tab pane
    $(".tab-content").append(
        $("<div>").attr("role", "tabpanel").attr("class", "tab-pane").attr("id", "loc"+locations.length).append(
            $("<div>").attr("class", "monstatbox")).append(
            $("<a>").attr("href", "#attack").text("Attack!").click(function (e) {
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

function gohome() {
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
}

//tick function for updates
function tick()
{
    //for now hp regen is half of endurance per second
    player.hp = Math.min((player.hp + (player.endurance / 2)), player.maxhp);
    monster.hp = Math.min((monster.hp + (monster.endurance / 2)), monster.maxhp);
    
    //redraw stat displays
    $( ".statbox" ).html(parseStats(player));
    $( ".monstatbox" ).html(parseStats(monster));
    
    $( "#msglog" ).html(msglog.join('<br />'));
}

//log to game's event/combat log. Newest entries at the top.
function log(string)
{
    msglog.unshift(string);
    
    //phase out old entries to keep log short
    while (msglog.length > 20)
    {
        msglog.pop();
    }
}

//helper functions
//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};