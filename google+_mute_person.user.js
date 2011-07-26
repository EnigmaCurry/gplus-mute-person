// ==UserScript==
// @name          Google+ Mute Person
// @namespace 	  http://www.enigmacurry.com
// @description	  Hide people from your Google+ stream without blocking them or removing from your circles
// @author        Ryan McGuire (EnigmaCurry)
// @include       http://plus.google.com/*
// ==/UserScript==

var circles      = {};
var users        = {};
var mutedUserIDs = [];

function parseCircleGraph(googleCircleGraph) {
    //Parse the google circle graph response from: /u/0/_/socialgraph/lookup/circles/?ct=2&m=1
    //Return a dictionary of circle names pointing to a list of users in that circle
    
    //Google puts a bit of unparseable junk at the beginning. Just strip off the first 6 bytes:
    var data = googleCircleGraph.substring(6, googleCircleGraph.length);
    data = eval(data);
    
    //Map the circle IDs to names
    var circleIDs = {};
    var circleNames = {};
    $.each(data[1], function(x, value) {
            circleNames[value[0][0]] = value[1][0];
            circleIDs[value[1][0]] = value[0][0];
        });

    //Map user IDs to user names
    var userNames = {};
    //Map circles to list of users in the circle
    var circleUsers = {};
    $.each(data[2], function(x, value) {
            var user = {};
            user["email"] = value[0][0];
            user["id"] = value[0][2];
            user["name"] = value[2][0];
            user["groups"] = [];
            userNames[user["id"]] = user["name"];
            //Get the user groups:
            $.each(value[3], function(y, group) {
                    var groupID = group[2][0];
                    var groupName = circleNames[groupID];
                    user["groups"].push(groupName);
                    if(circleUsers[groupName] == null){
                        circleUsers[groupName] = [user];
                    } else {
                        circleUsers[groupName].push(user);
                    }
                });
        });
    return [circleUsers, userNames];
}


function processNodeForDeletion(node) {
    //Check to see if it's an update:
    if(node.id.indexOf("update-") == 0){
        //Only remove updates on the main stream page:
        //I would use location.pathname but it changes at erratic times.
        //The name at the top of the contentPane seems reliable though:
        if($("#contentPane").find(".a-b-f-U-R").last().text() == "Stream"){
            var update_div = $(node);
            var author_div = update_div.find(".a-f-i-do");
            var author = author_div.attr("title");
            var author_id = author_div.attr("oid");
            //Check to see if this update is from a muted user:
            if ($.inArray(author_id, mutedUserIDs) >= 0) {            
                update_div.remove();
                console.log("Removing update from : " + users[author_id]);
            }
        }
    }
}

$(document).ready(function(){
        var contentPane = $("div#contentPane");

        //Whenever an element is added, check if it's a update we should remove:
        contentPane.bind("DOMSubtreeModified", function(event){
                processNodeForDeletion(event.target);
            });

        //Get the users' circles
        $.get("/u/0/_/socialgraph/lookup/circles/?ct=2&m=1", function(data){
                circlesParsed = parseCircleGraph(data);
                circles = circlesParsed[0];
                users = circlesParsed[1];
                //Create a list of those users that should be muted
                $.each(circles["Muted"], function(x, user) {
                        mutedUserIDs.push(user["id"]);
                    });
                //Bootstrap: get rid of updates that are already on the screen at this point:
                contentPane.find("div[id^='update-']").each(function(x, node){
                        processNodeForDeletion(node);
                    });
            }, "html");        
    });
