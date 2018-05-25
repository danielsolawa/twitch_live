const CLIENT_ID = '2rciyhzluifcp5gt7dtw2qlm8bvp74';
const ACCEPT_HEADER = 'application/vnd.twitchtv.v5+json';
const GET_BY_USERNAME = 'https://api.twitch.tv/kraken/users?login=';
const GET_BY_USER_ID = 'https://api.twitch.tv/kraken/users/';
const GET_STREAM = 'https://api.twitch.tv/kraken/streams/';
const ONE_HOUR_IN_MILLIS  = 1000 * 60 * 62;
const FIFTEEN_MIN_IN_MILLIS = 1000 * 60 * 15;
const NOTIFICATION_DISPLAY_TIME = 3000;


const TEMP = 1000 * 60;


var liveChannels;
var usersID = [];
var synchronizedList = [];
var notificationList = [];



showAllLiveStreams();

setInterval(showAllLiveStreams, ONE_HOUR_IN_MILLIS);
setInterval(seekForLiveChannel, FIFTEEN_MIN_IN_MILLIS);



//shows all channels in the list
function showAllLiveStreams(){
	
	liveChannels = [];
	syncStorage();
	
}


function seekForLiveChannel(){
/*

*/

	fetchStreamList();
}

//synchronizes sync storage with local storage.
function syncStorage(){
	chrome.storage.sync.get({'synchronizedList': []}, function(result){
		synchronizedList = result.synchronizedList;

		chrome.storage.local.get({'usersID': []}, function(result){
		 	usersID = result.usersID;
		 	var syncList = mergeStorage(usersID, synchronizedList);
			saveAll(syncList);
			});

		
	});

}

//saves all data.
function saveAll(data){
	chrome.storage.local.set({'usersID' : data}, function(){
		console.log("local storage has been updated.");
		fetchStreamList();
	});


}

//Merges local and sync storage
function mergeStorage(locStorage, syncStorage){

	var syncList = [];
	for(var i = 0; i < locStorage.length; i++){
			var exists = false;
			for(var j = 0; j < syncStorage.length; j++){
				if(locStorage[i] == syncStorage[i]){
					exists = true;
				}
			}

			if(!exists){
				syncList.push(locStorage[i]);
			}
	}

	return syncList;
}




// Fetches stream list from local storage
function fetchStreamList(){
 chrome.storage.local.get({'usersID': []}, function(result){

 	usersID = result.usersID;
	fetchLiveStreams();
 });

}

// fetches live stream data
function fetchLiveStreams(){

	 var requestCallback = new MyRequestsCompleted({
        numRequest: usersID.length,
        singleCallback: function(){
        notifyAll();
        
        setTimeout(clearNotificationList, 20000);
        }
    });
	for(var i = 0; i < usersID.length; i++){
		$.ajax({
		type : 'GET',
		url: GET_STREAM + usersID[i].id,
		headers : {'Accept' :  ACCEPT_HEADER, 'Client-ID' : CLIENT_ID},
		success : function(data){requestCallback.requestComplete(data, true)},
		error : liveError
	});

	
	

	}//end of loop

	
}






function clearNotificationList(){



	
	for(var i = 0; i < notificationList.length; i++){
		chrome.notifications.clear(notificationList[i].id, function(wasCleared){
			if(wasCleared){
				console.log("notifications were removed");
			}
			
	});
	}


	chrome.notifications.getAll(function(notfs){
		console.log(notfs);

	});


	notificationList = [];





}



var MyRequestsCompleted = (function() {
    var numRequestToComplete, 
        requestsCompleted, 
        callBacks, 
        singleCallBack; 

    return function(options) {
        if (!options) options = {};

        numRequestToComplete = options.numRequest || 0;
        requestsCompleted = options.requestsCompleted || 0;
        callBacks = [];
        var fireCallbacks = function () {
            for (var i = 0; i < callBacks.length; i++) callBacks[i]();
        };
        if (options.singleCallback) callBacks.push(options.singleCallback);

        

        this.addCallbackToQueue = function(isComplete, callback) {
            if (isComplete) requestsCompleted++;
            if (callback) callBacks.push(callback);
            if (requestsCompleted == numRequestToComplete) fireCallbacks();
        };
        this.requestComplete = function(data, isComplete) {
            if (isComplete){
            	requestsCompleted++;
            	addToLive(data);
            } 
            if (requestsCompleted == numRequestToComplete){
            	fireCallbacks();
            } 
        };
        this.setCallback = function(callback) {
            callBacks.push(callBack);
        };
    };
    })();


// adds channel to list (if it's live)
function addToLive(data){
	

	if(data.stream != null){
	var channelID = data.stream.channel._id;
	var channelName = data.stream.channel.name;
	var channelViewers = data.stream.viewers;
	var channelStatus = data.stream.channel.status;
	var channelGame = data.stream.game;
	var channelUrl = data.stream.channel.url;
	var channelLogo = data.stream.channel.logo;
	var channelPreview = data.stream.preview.medium;
	
	var liveChannel = {'id' : channelID, 'channelName' : channelName, 
		'channelViewers' : channelViewers, 'channelStatus': channelStatus, 
		'channelGame': channelGame, 'channelUrl' : channelUrl, 'channelLogo' : channelLogo,'channelPreview' : channelPreview, 'isNotified' : false};
		if(!(isChannelAdded(liveChannel.id))){
			liveChannels.push(liveChannel);
		}
		
			
		
		
}

}


function isChannelAdded(id){
	for(var i = 0; i < liveChannels.length; i++){
		if(liveChannels[i].id == id){
			return true;
		}
	}

	return false;
}


function notifyAll(){
	for(var i = 0; i < liveChannels.length; i++){
		if(!(liveChannels[i].isNotified)){
			liveChannels[i].isNotified = true;
			notify(liveChannels[i]);
		}
	}

	
}


function notifyList(){
	var liveList = [];
	for(var i = 0; i < liveChannels.length; i++){
		if(!(liveChannels[i].isNotified)){
			liveChannels[i].isNotified = true;
			liveList.push({'title': liveChannels[i].channelName,  'message': liveChannels[i].channelViewers + ' viewers\n' + liveChannels[i].channelStatus});
		}
	}

	testNot(liveList);

	
}


function testNot(list){
var notification = {
		type : "list",
		title: "Live Steams",
		iconUrl: "../icon.png",
		message: "message",
		items: list
	};

	chrome.notifications.create(notification, function(notificationId){
		streamId = notificationId;
	});


}




//notifys user about live streams
function notify(stream){
	var notification = {
		type : "image",
		title: stream.channelName + " is live" + " " + stream.channelViewers + " viewers",
		iconUrl: stream.channelLogo,
		imageUrl: stream.channelPreview,
		message: stream.channelStatus + "\nGame: " + stream.channelGame,
		eventTime: getDisplayTime(),
		isClickable : true
	};

	var url = stream.channelUrl;
	var streamId = "";

	console.log(getCurrentTime() + " name: " +stream.channelName + " notified");


	chrome.notifications.create(notification, function(notificationId){
		streamId = notificationId;
		notificationList.push({'id' : streamId});
	});



	

	chrome.notifications.onClicked.addListener(function(notificationId){
		if(notificationId == streamId){
			window.open(url, "_blank");


			chrome.notifications.clear(streamId, function(wasCleared){
			
		});
		}
		
	});



}


function getCurrentTime(){
	var d = new Date();
	var h = d.getHours();
	var m = d.getMinutes();
	var s = d.getSeconds();


	var currentTime = h +":" + m + ":" + s;

	return currentTime;


}


function getDisplayTime(){
	var date = Date.now();

	return date + NOTIFICATION_DISPLAY_TIME;
}






function liveError(data){
	console.log("something went wrong");
}








