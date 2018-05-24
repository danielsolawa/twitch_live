const CLIENT_ID = '2rciyhzluifcp5gt7dtw2qlm8bvp74';
const ACCEPT_HEADER = 'application/vnd.twitchtv.v5+json';
const GET_BY_USERNAME = 'https://api.twitch.tv/kraken/users?login=';
const GET_BY_USER_ID = 'https://api.twitch.tv/kraken/users/';
const GET_STREAM = 'https://api.twitch.tv/kraken/streams/';
const ONE_HOUR_IN_MILLIS  = 1000 * 60  * 60;

var streamPanelHidden = true;
var list = [];
var channelList = [];

$("#showLive").click(function(){
	checkForLive();
    $("#main").toggle();
});

$("#manageStreams").click(function(){
	showList();
    $("#manage").toggle();
});

$("#addChannel").click(function(){
	addStreamToList();
});


$("#syncList").click(function(){
	syncChannelList();
});


function showList(){
	
	
	chrome.storage.local.get({"usersID" : []}, function(result){
		usersID = result.usersID;
		createChannelList(usersID);
	});

	

	
}


//Synchronizes channel list
function syncChannelList(){
		chrome.storage.local.get({"usersID" : []}, function(result){
		usersID = result.usersID;
		sync(usersID);
	});
	
	
	


}


function sync(usersID){

	chrome.storage.sync.set({'synchronizedList' : usersID}, function(){
		showMessage(true, "The list has been synchornized!");

		chrome.storage.sync.get({'synchronizedList': []}, function(result){
 			synchronizedList = result.synchronizedList;
 			showMessage(true, synchronizedList.length + " length " );
 		});

	});
}



function createChannelList(usersID){


	$("#manage").html("");

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

			

		$("#manage").append(listDiv);
	}


}


function removeFromList(e){
	var index = getIndex(this.id);
	if(index > -1){
		var streamToRemove = $("." + this.id);
		removeFromStorage(index);
		streamToRemove.remove();
	}
	
}


function removeFromStorage(index){
	usersID.splice(index, 1);

	chrome.storage.local.set({'usersID' : usersID}, function(){
				 $("#manage").toggle();
				showMessage(true, "Channel removed sucessfully");

			});

}


function getIndex(id){
	for(var i = 0; i < usersID.length; i++){
		if(usersID[i].id == id){
			return i;
		}
	}

	return -1;
}



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


//adds channel to local storage

function addStreamToList(){
	var streamName = document.getElementById("streamName").value;

	if(streamName.length > 0){
			$.ajax({
		type : 'GET',
		url: GET_BY_USERNAME + streamName,
		headers : {'Accept' :  ACCEPT_HEADER, 'Client-ID' : CLIENT_ID},
		success : checkChannel,
		error : saveError
	});
	}else{
		showMessage(false, "This field can't be empty");
	}


}



function checkChannel(data){
	$("#streamName").val("");
	
	if(data.users.length == 0){
		wrongName();
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

			});
			
		}else{
			showMessage(false, "The channel already exists.");
		}
	
	});

	

}


function showMessage(isSuccess, message){
	var text = document.createElement("div");
	
	if(isSuccess){
		text.setAttribute("class", "success");
	}else{
		text.setAttribute("class", "error");
	}

	text.appendChild(document.createTextNode(message));

	$("#message").append(text);


	setTimeout(clearMessageTab, 3000);
}

function wrongName(){
	var error = document.createElement("div");
	error.setAttribute("class", "error");
	error.appendChild(document.createTextNode("Wrong channel name"));
	
	$("#message").append(error);

	setTimeout(clearMessageTab, 3000);
}


function clearMessageTab(){
	$("#message").html("");
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






