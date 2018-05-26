const CLIENT_ID = '2rciyhzluifcp5gt7dtw2qlm8bvp74';
const ACCEPT_HEADER = 'application/vnd.twitchtv.v5+json';
const GET_BY_USERNAME = 'https://api.twitch.tv/kraken/users?login=';
const GET_BY_USER_ID = 'https://api.twitch.tv/kraken/users/';
const GET_STREAM = 'https://api.twitch.tv/kraken/streams/';
const ONE_HOUR_IN_MILLIS  = 1000 * 60  * 60;

var LivePanelStatus = {
  OFF: 1,
  LOADING: 2,
  ON: 3,
};

var list = [];
var channelList = [];


//Default live panel state
var livePanelStatus = LivePanelStatus.OFF;



//Loads live stream list
$("#showLive").click(function(){
	if(livePanelStatus == LivePanelStatus.OFF){
		checkForLive();
		$("#loading").toggle();
		livePanelStatus = LivePanelStatus.LOADING;
	}else if(livePanelStatus == LivePanelStatus.ON){
		$("#main").toggle();
		livePanelStatus = LivePanelStatus.OFF;
	} 
});

//Channel list
$("#menageStreams").click(function(){
	showList();
    $("#menage").toggle();
});

//Adds new channel
$("#addChannel").click(function(){
	addStreamToList();
});

//Syncs list
$("#syncList").click(function(){
	syncChannelList();
});





/*
 * SYNC 
 *
 */ 
function syncChannelList(){
		chrome.storage.local.get({"usersID" : []}, function(result){
		usersID = result.usersID;
		sync(usersID);
	});
	


}


function sync(usersID){
	chrome.storage.sync.get({'synchronizedList': []}, function(result){
 			synchronizedList = result.synchronizedList;
 			var syncList = [];

			for(var i = 0; i < usersID.length; i++){
				var exists = false;
				for(var j = 0; j < synchronizedList.length; j++){
					if(usersID[i] == synchronizedList[i]){
						exists = true;
					}
				}

				if(!exists){
					syncList.push(usersID[i]);
				}
			}

			chrome.storage.sync.set({'synchronizedList' : syncList}, function(){
				showMessage(true, "The list has been synchornized!");
			});


 	});


}


/*
 * MENAGE LIST 
 *
 */ 
function showList(){
	
	
	chrome.storage.local.get({"usersID" : []}, function(result){
		usersID = result.usersID;
		createChannelList(usersID);
	});

}

function createChannelList(usersID){


	$("#menage").html("");

	for(var i = 0; i < usersID.length; i++){
			var us = usersID[i].id;

			var listDiv = document.createElement("div");
			listDiv.setAttribute("class", us);
			

			var streamID = document.createElement("span");
			streamID.appendChild(document.createTextNode(usersID[i].username));

			var remove = document.createElement("button");

			remove.setAttribute("id", us);
			remove.setAttribute("type", "button");
			remove.setAttribute("class", "removeButton");
			remove.appendChild(document.createTextNode("remove"));
			remove.addEventListener("click", removeFromList, false);
			


			listDiv.appendChild(streamID);
			listDiv.appendChild(remove);

			

		$("#menage").append(listDiv);
	}


}


function removeFromList(e){
	var channel = getChannel(this.id);
	var message = "This channel will be permanently removed from the list. Are you sure?";
	var title = "Remove " + channel.name + " from the list.";
	
	showDialog(message, title,
		function(){
			if(channel.index > -1){
				removeFromStorage(channel.index);
				showList();
			}
		});

	
}


function removeFromStorage(index){
	usersID.splice(index, 1);

	chrome.storage.local.set({'usersID' : usersID}, function(){
				 $("#manage").toggle();
				showMessage(true, "Channel has been removed sucessfully");

			});

}


function getChannel(id){
	var channel = {};
	for(var i = 0; i < usersID.length; i++){
		if(usersID[i].id == id){
			channel.index  = i;
			channel.name = usersID[i].username;
			return channel;
		}
	}
	channel.index = -1;

	return channel;
}

/*
 * LIVE CHANNELS 
 *
 */ 

// Checks is any channel live
function checkForLive(){
 chrome.storage.local.get({'usersID': [] }, function(result){
 	usersID = result.usersID;

 	fetchStreams();


 });

}

function fetchStreams(){

	$("#main").html("");
	for(var i = 0; i < usersID.length; i++){
		$.ajax({
		type : 'GET',
		url: GET_STREAM + usersID[i].id,
		headers : {'Accept' :  ACCEPT_HEADER, 'Client-ID' : CLIENT_ID},
		success : addToList,
		error : liveError
	});
	}

	setTimeout(toggleList, 1500);
}


function toggleList(){
	livePanelStatus = LivePanelStatus.ON;
	$("#loading").toggle();
	$("#main").toggle();
}


function addToList(data){

	if(data.stream != null){

		var list = document.createElement("div");
		list.setAttribute("class", "list");

		var stream = document.createElement("div");


		
		var streamLink = document.createElement("a");
		
		streamLink.setAttribute("href", data.stream.channel.url);
		streamLink.setAttribute("target", '_blank');
		streamLink.appendChild(document.createTextNode(data.stream.channel.display_name 
			+ " - " + data.stream.game));

		


		stream.appendChild(streamLink);
		list.appendChild(stream);
		
		$("#main").append(list);
	
		}

		
	
}





function liveError(){
	console.log("something went wrong");
}

/*
 * ADD CHANNEL TO LIST 
 *
 */ 


//adds channel to local storage
function addStreamToList(){
	var streamName = document.getElementById("streamName").value;

	if(streamName.length > 0){
		var finalName = getChannelName(streamName);

			$.ajax({
		type : 'GET',
		url: GET_BY_USERNAME + finalName,
		headers : {'Accept' :  ACCEPT_HEADER, 'Client-ID' : CLIENT_ID},
		success : checkChannel,
		error : saveError
	});

	}else{
		showMessage(false, "This field can't be empty");
	}


}
//extracts channel name from url
function getChannelName(streamName){
	var name = streamName.split("/");

	return name[name.length-1];
}



function checkChannel(data){
	$("#streamName").val("");
	if(data.users.length == 0){
		var message = "Wrong channel name";
		showMessage(false, message);
	}else{
		saveChannel(data);
	}
	
	
}

// saves channel id 
function saveChannel(data){
	var userID = data.users[0]._id;
	var userName = data.users[0].display_name;

	chrome.storage.local.get({'usersID' : [] }, function(result){
		var usersID = result.usersID;

		if(!isAlreadyStored(userID, usersID)){
			usersID.push({'id' : userID, 'username' : userName});
			chrome.storage.local.set({'usersID' : usersID}, function(){
				showMessage(true, "The channel has been added sucessfully!");
				showList();
			});
			
		}else{
			showMessage(false, "The channel already exists.");
		}
	
	});

	

}

function isAlreadyStored(userID, usersID){

	for(var i = 0; i < usersID.length; i++){
		if(usersID[i].id == userID){
			return true;
		}
	}

	return false;

}


function saveError(){
	alert("error");
}

/*
 * DIALOGS
 *
 */ 

function showDialog(message, title, confirm){
	openDialog(message, title);

	$( function() {
    $( "#dialog-confirm" ).dialog({
      resizable: false,
      height: "auto",
      width: 400,
      modal: true,
       open: function () {
                        $(this).parents(".ui-dialog:first").find(".ui-dialog-titlebar").addClass("ui-state-error");
                    },
      beforeClose: function( event, ui ) {
		closeDialog();
      },
      buttons: {
        "Delete ": function() {
          confirm();
          $( this ).dialog( "close" );
        },
        Cancel: function() {
          $( this ).dialog( "close" );
        }
      }
    });
  	});
}


function openDialog(message, title){
	 $("#dialog-confirm").attr("title", title);
	 $("#dText").append(document.createTextNode(message));
	 $("#dText").toggle();
}


function closeDialog(){
	 $("#dText").html("");
	 $("#dText").toggle();
	 $( "#dialog-confirm" ).dialog( "destroy" );
}

/*
 * MESSAGES
 *
 */ 



function showMessage(isSuccess, message){
	var text = document.createElement("div");
	
	if(isSuccess){
		$("#message").addClass("alertsuccess");
	}else{
		$("#message").addClass("alerterror");
	}

	text.appendChild(document.createTextNode(message));

	$("#message").append(text);
  	$("#message").toggle();
	setTimeout(clearMessageTab, 2000);
}




function clearMessageTab(){
	$("#message").html("");
	$("#message").removeClass();
	$("#message").toggle();

}








