//this allows us to modify location.hash w/o jquery mobile getting in the way
$(document).bind("mobileinit", function(){
	$.mobile.hashListeningEnabled = false;
});

var RemoteLogger = {
	logEvent: function(string,data){
		console.log(data);	
	}
}

var PPL = new (function(){
	
	this.currentPage = 1;
	this.activePage = ko.observable({
		getTracks: ko.dependentObservable(function(){
			
		})
	});
	
	this.hash = ko.dependentObservable({
	    read: function () {
	        return location.hash.replace("#","");
	    },
	    write: function (value) {
	        location.hash = "#" + value;
	    }
	});
		
	this.init = function(){
		$.mobile.page.prototype.options.domCache = true;
		frmObj = document.getElementById('frm_login');
		frmObj.onsubmit = PPL.searchSubmit;
		frmObj.searchText.onkeyup = function(evt){
			var theValue = this.value;
			window.isRun = false;
			setTimeout(function(){
				if (this.value == theValue && isRun == false){
					isRun = true;
					PPL.jsonpRequest(theValue);
				}	
			}.bind(this),1200);
		};
		ko.applyBindings(this);
		if (PPL.hash() != ""){
			frmObj.searchText.value = PPL.hash();
			PPL.jsonpRequest(PPL.hash());
		}
	}
	//yql doesnt allow for sub functions()
	this.setActivePageTrackImages = function(data){
		this.activePage().setTrackImages(data);
	}
	
	var TrackPage = function(keyword, number){
		var trackpage = this;
		var missingAlbumArt = [];
		var secondsToDuration = function(seconds){
			var durationStr = new Array();
			durationStr.push(parseInt(seconds / 60));
			durationStr.push(":");
			var secs = seconds % 60;
			durationStr.push((secs  < 10) ? '0'+secs : secs);
			return durationStr.join("");
		}
		
		this.pageNumber = ko.observable();
		this.keyword = ko.observable();
		this.tracks = ko.observableArray();
		
		var load = function(keyword, number){
			//add the results to the page
			for(var index in PPL.search.trackdata)
				tracks.push(new Track(PPL.search.trackdata[index]));

			//this part goes to YQL for all the missingAlbumArt array and finds their images	
			PPL.fetchMissingAlbums();
			
			//jquery mobile method
			$("ul").listview("refresh");
		}
			
		this.setTrackImages = function(data){
			console.log(data);
			//$.each(data.query.results.entries.result,function(i,o){
				//if (o.album != 0)
					//PPL.setTrackImage[o.trackid](o.album);
			//});
		}
		
		var Track = function(item){
			this.noAlbumImg = "http://static.pplaylist.com/img/elements/album-art.gif"
			this.artist = item.artist;
			this.title = item.title;
			this.albumImage = ko.observable(item.album);
			this.trackid = item.trackid;
			this.duration = secondsToDuration(item.duration);
			//encryption key for the lulz
			this.song_url = decrypt(item.song_url,"Error, this track is not valid!"); 
			
			this.clean = function(str){
				//increase chances of returning a match by removing extra unessecary parts to a song name
				return str.replace("&amp;","and").replace("&","and").toLowerCase().split("(")[0].split("feat")[0].split("ft.")[0].split("-")[0].split("f. ")[0].split(" ft ")[0];
			}		
			//the album art might missing so add a placeholder and try to fetch a new one
			if (item.album == this.noAlbumImg || item.album == ""){
				this.albumImage("images/noAlbumImage.png");
				
				missingAlbumArt.push([this.trackid , this.clean(this.artist) + ' ' + this.clean(this.title)]);
			}
			
			this.setTrackImage = function(image){
				this.albumImage(image);
			}
			this.open = function(){
				location.href = this.song_url;	
			}
		
		};
		
		load(keyword, number);
	}
	
	this.requestURL = function(searchFor){
		return "http://www.playlist.com/async/searchbeta/tracks?searchfor=" + searchFor +"&page=" + PPL.currentPage;
	}
	
	//these are placeholder objects that must be here for playlist.com's api
	this.user = {}
	this.search = {
		searchVersion: "",
		searchTerm: ko.observable(),
		trackdata: null, 
		//This function gets called automatically due to the Playlist.com API
		searchResultsFn: function(){
			PPL.loadMusic(); 
			$.mobile.hidePageLoadingMsg();	
		}
	}
	
	this.loadMusic = function(){
		this.activePage(new TrackPage(PPL.search.searchTerm, this.currentPage));
	}
	
	this.fetchMissingAlbums = function(){		
		var SQL = 'USE "http://thepillage.co.cc/mts.xml" AS musicTrackSearch;SELECT * FROM musicTrackSearch WHERE tracks = @tracks';
		var reqURL = "http://query.yahooapis.com/v1/public/yql?format=json&q=" + escape(SQL) + "&tracks=" + JSON.stringify(this.missingAlbumArt);
		var APIKey = "dj0yJmk9djdSUFVWdmRtVTdUJmQ9WVdrOU0xRlBhRFY0TlRnbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD01Mw--";
		var SharedSecret = "9d32e10aa87b51eacbd1a328d1ee0912067115db";
		var signedURL = makeSignedRequest(APIKey,SharedSecret,reqURL);
		$.ajax({
				type: 'GET',
				url: signedURL, 
				dataType: 'jsonp',
				jsonp: 'callback',
				jsonpCallback: 'PPL.setActivePageTrackImages' 
			}
		);
	}
	
	this.searchSubmit = function(evt){
		PPL.jsonpRequest(evt.target.search.value);
		return false;
	}
	
	this.jsonpRequest = function(){
		//the onload attribute doesnt need to be set because the callback is hardcoded into the response (searchResultsFn)
		$.mobile.showPageLoadingMsg();	
		var script = document.createElement("script"); 
		script.setAttribute("type","text/javascript"); 
		script.setAttribute("src",PPL.requestURL());
		document.body.appendChild(script);
	}

})();


$(document).ready(PPL.init);