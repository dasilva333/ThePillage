var RemoteLogger = {
	logEvent: function(string,data){
		console.log(data);	
	}
}

var PPL = new (function(){
	this.isInit	= false;
	this.currentPage = 1;
	this.showShortUrl = ko.observable(false); 
	this.activePageName = "search-results";
	
	this.activePage = ko.observable({
		//todo remove this dependency for the foreach template
		tracks: ko.observableArray()
	});
	
	this.activeTrack = ko.observable({
		albumImage: ko.observable(""),
		short_url: ko.observable("")
	})
	
	this.trackPages = ko.observableArray();
	
	var secondsToDuration = function(seconds){
		var durationStr = new Array();
		durationStr.push(parseInt(seconds / 60));
		durationStr.push(":");
		var secs = seconds % 60;
		durationStr.push((secs  < 10) ? '0'+secs : secs);
		return durationStr.join("");
	}
		
	var TrackPage = function(keyword, number){
		var trackpage = this;
		this.pageNumber = number;
		this.keyword = keyword;
		this.tracks = ko.observableArray();

		var load = function(keyword, number){
			//add the results to the page
			for(var index in PPL.search.trackdata)
				trackpage.tracks.push(new Track(PPL.search.trackdata[index]));

			//this part goes to YQL for all the missingAlbumArt array and finds their images	
			PPL.missingAlbumArt.fetch('PPL.missingAlbumArt.setTrackImages');
			
			setTimeout(function(){
				PPL.finishPageLoad();
			},250);
		}
				
		this.findTrackById = function(trackid){
			return ko.utils.arrayFilter(this.tracks(), function(track){
				return track.trackid == trackid ? track: null;
			})[0];
		};
		
		load(keyword, number);
	}
	
	this.missingAlbumArt = new (function(){
		var missingAlbumArt	= [];
		
		//These three functions find the missing albumArt and attaches it to the appropriate track
		this.fetch = function(callback){
			//Image size is hardcoded to 80x80, its possible to add a parameter in the future to specificy album art size
			var SQL = 'USE "http://thepillage.co.cc/mts.xml" AS musicTrackSearch;SELECT * FROM musicTrackSearch WHERE tracks = @tracks';
			var reqURL = "http://query.yahooapis.com/v1/public/yql?format=json&q=" + escape(SQL) + "&tracks=" + JSON.stringify(missingAlbumArt);
			var APIKey = "dj0yJmk9djdSUFVWdmRtVTdUJmQ9WVdrOU0xRlBhRFY0TlRnbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD01Mw--";
			var SharedSecret = "9d32e10aa87b51eacbd1a328d1ee0912067115db";
			var signedURL = makeSignedRequest(APIKey,SharedSecret,reqURL);
			$.ajax({
					type: 'GET',
					url: signedURL, 
					dataType: 'jsonp',
					jsonp: 'callback',
					jsonpCallback: callback
				}
			);
		}
		
		this.reset = function(){
			missingAlbumArt = [];	
		}
		
		this.addItem = function(item){
			missingAlbumArt.push(item);	
		}
		
		this.setTrackImages = function(data){
			var curData = data.query.results.entries.result;
			//TODO figure out how to remove the PPL. to this.
			var curPage = PPL.activePage();
			$.each(curData,function(i,o){
				if (o.album.length > 3){
				   curPage.findTrackById(o.trackid).setTrackImage(o.album);
				}
			});
			this.reset();
		}
		
		this.setActiveTrackImage = function(data){
			PPL.activeTrack().albumImage(data.query.results.entries.result.album);
		}
		
	})()
	
	
	var Track = function(item){
		this.noAlbumImg = "http://static.pplaylist.com/img/elements/album-art.gif"
		this.artist = item.artist;
		this.title = unescape(item.title);
		this.albumImage = ko.observable(item.album);
		this.trackid = item.trackid;
		this.linkid =  this.artist + "-" + item.linkid;
		this.duration = secondsToDuration(item.duration);
		//encryption key for the lulz
		this.song_url = decrypt(item.song_url,"Error, this track is not valid!"); 
		this.short_url = ko.observable("");
		
		this.fetchShortUrl = function(){
			$.shortenUrl(this.song_url, function(short_url) {
				this.short_url(this.artist + " - " + this.title + ": " + short_url);
			}.bind(this));
		}
		this.clean = function(str){
			//increase chances of returning a match by removing extra unessecary parts to a song name
			return str.replace("&amp;","and").replace("&","and").toLowerCase().split("(")[0].split("feat")[0].split("ft.")[0].split("-")[0].split("f. ")[0].split(" ft ")[0];
		}	
			
		//the album art might missing so add a placeholder and try to fetch a new one
		if (item.album == this.noAlbumImg || item.album == ""){
			this.albumImage("images/noAlbumImage.png");				
			PPL.missingAlbumArt.addItem([this.trackid , this.clean(this.artist) + ' ' + this.clean(this.title)]);
		}
		
		this.setTrackImage = function(image){
			this.albumImage(image);
		}
		
		this.open = function(){
			PPL.audioPlayer.jPlayer("setMedia", { mp3 : this.song_url }).jPlayer("play");
			return false;
		}
		this.setActiveTrack = function(){
			//TODO fix the PPL usage here... somehow
			PPL.activeTrack(this);
		}
		this.promptMoreOfArtist = function(){
			//TODO replace confirm, does not work on the touchpad
			if (confirm("Would you like to search more songs by " + this.artist + "?"))	
				location.href = "#search-results?keyword=" + this.artist;
		}
	};
	
	//these are placeholder objects that must be here for playlist.com's api
	this.user = {};
	this.player = {
		playWhenReady: function(){}
	};
	this.search = {
		searchVersion: "",
		searchTerm: "",
		trackdata: null, 
		//This function gets called automatically due to the Playlist.com API
		searchResultsFn: function(){
				
				if (this.activePageName == "search-results")
					this.loadTracks(); 
				else if (this.activePageName == "track-view")
					this.loadTrackView();

			$.mobile.hidePageLoadingMsg();	
		}.bind(this),
		submit: function(form){
			PPL.search.searchFor(form.searchBox.value);
			return false;			
		},
		autoSubmit: function(elem){
			var theValue = elem.value;
			window.isRun = false;
			setTimeout(function(){
				if (elem.value == theValue && isRun == false){
					isRun = true;
					PPL.search.searchFor(theValue);
				}	
			}.bind(this),3000);	
		},
		searchFor: ko.dependentObservable({
			read: function() {
				return location.hash.replace( /.*keyword=/, "" );
			},
			write: function (value) {
				location.hash = "#search-results?keyword=" + value;
			}
		})
	}
	
	this.searchHistory = new (function(){
		var KEY_NAME = "history";
		var DEFAULT_HISTORY = ["Muse","Radiohead"];
		var items =  ko.observableArray();
		var history = $.jStorage.get(KEY_NAME, DEFAULT_HISTORY);
		
		var load = function(items){
			console.log(items);
			$.each(items,function(index){
				this.addItem(items[index]);
			}.bind(this));
		}.bind(this);
		
		var Item = function(item){
			this.keyword = unescape(item.keyword);
			this.count = ko.observable(item.count || 1);
			
			this.remove = function(){
				items.remove(this);
			}
			
		}
		this.addItem = function(value){
			if (typeof value == "string" && value != '')
				value = { keyword: value, count: 1 }
			if (typeof value == "object" && 'keyword' in value){
				var arr = ko.utils.arrayFilter(this.getItems(), function(item){
				   return item.keyword == value.keyword ? item: null;
				});
				if (arr.length == 0){
					items.unshift(new Item(value));
				}
				else {
					arr[0].count(arr[0].count()+1);
				}
				this.save()
			}
		} 
		this.getItems = function(){
			return items();	
		}
		
		this.save = function(){
			$.jStorage.set(KEY_NAME, this.getItems());
		}
		
		this.refresh = function(){
			
		}
		
		this.toString = function(){
            var keys = [];
            var items = this.getItems();

            $.each(items,function(i,o){
				keys.push(o.keyword);
			});
            
            return keys.join(",");
		}
		
		load(history);
	})()
	
	
	this.loadTrackView = function(){

		var activeLinkid = PPL.activeTrack().linkid;
		$.each(PPL.search.trackdata, function(i,o){
			if (o.linkid == activeLinkid)
				this.activeTrack(new Track(o));
		}.bind(this));	
		
		//this part goes to YQL for all the missingAlbumArt array and finds their images	
		PPL.missingAlbumArt.fetch('PPL.missingAlbumArt.setActiveTrackImage');
			
		PPL.finishPageLoad();
	} 
	
	this.loadTracks = function(){
		this.activePage(new TrackPage(PPL.search.searchFor(), this.currentPage));		
	} 
	
	this.searchTracks = function(keyword){
		if (typeof keyword != "undefined" && keyword != ""){
			//the onload attribute doesnt need to be set because the callback is hardcoded into the response (searchResultsFn)
			$.mobile.showPageLoadingMsg();	
			if (typeof PPL.searchHistory == "object"){
				PPL.searchHistory.addItem(keyword);
			}
			this.remoteRequest("http://www.playlist.com/async/searchbeta/tracks?searchfor=" + keyword + "&page=1");	
		}
	}
	
	this.searchTrack = function(keyword){
		if (PPL.activeTrack().linkid != keyword){
			$.mobile.showPageLoadingMsg();	
			var artist = keyword.split("-")[0];
			var linkid = keyword.split("-")[1];
			this.activeTrack().artist = artist;
			this.activeTrack().linkid = linkid;
			this.remoteRequest("http://www.playlist.com/async/searchbeta/tracks?searchfor=" + keyword + "&page=1&facet=all&hl=" + linkid);	
		}
		else {
			PPL.finishPageLoad();		
		}
	}
	
	this.remoteRequest = function(src){
		var script = document.createElement("script"); 
		script.setAttribute("type","text/javascript"); 
		script.setAttribute("src",src);
		document.body.appendChild(script);
	}
	
	this.pageLoad = function(){
		//$.mobile.page.prototype.options.domCache = true;
	    
		if (this.isInit	== false){
						
			PPL.audioPlayer = $("#jquery_jplayer_1").jPlayer({
				swfPath: "swf",
				supplied: "mp3",
				wmode: "window"
			});
			
			$('#jquery_jplayer_1').jPlayer({
					swfPath: 'swf',
					solution: 'html, flash',
					supplied: 'mp3',
					preload: 'metadata',
					volume: 0.8,
					muted: false,
					backgroundColor: '#000000',
					cssSelectorAncestor: '#jp_container_1',
					cssSelector: {
					videoPlay: '.jp-video-play',
					play: '.jp-play',
					pause: '.jp-pause',
					stop: '.jp-stop',
					seekBar: '.jp-seek-bar',
					playBar: '.jp-play-bar',
					mute: '.jp-mute',
					unmute: '.jp-unmute',
					volumeBar: '.jp-volume-bar',
					volumeBarValue: '.jp-volume-bar-value',
					volumeMax: '.jp-volume-max',
					currentTime: '.jp-current-time',
					duration: '.jp-duration',
					fullScreen: '.jp-full-screen',
					restoreScreen: '.jp-restore-screen',
					repeat: '.jp-repeat',
					repeatOff: '.jp-repeat-off',
					gui: '.jp-gui',
					noSolution: '.jp-no-solution'
				},
				errorAlerts: false,
				warningAlerts: false
			});
		}
		ko.applyBindings(this);	
		
		this.isInit	= true;
	}.bind(this);
	
	this.finishPageLoad = function(){
		//jquery mobile method
		pageSelector = u.hash.replace( /\?.*$/, "" );
		// Get the page we are going to dump our content into.
		var $page = $( pageSelector );
		var $content = $page.children( ":jqmData(role=content)" );
		
		// Pages are lazily enhanced. We call page() on the page
		// element to make sure it is always enhanced before we
		// attempt to enhance the listview markup we just injected.
		// Subsequent calls to page() are ignored since a page/widget
		// can only be enhanced once.
		$page.page();
	
		// Enhance the listview we just injected.
		$content.find( ":jqmData(role=listview)" ).listview('refresh');
	
		//Enhance the footer/navbars
		$(":jqmData(role='navbar')").navbar();	
		
		// We don't want the data-url of the page we just modified
		// to be the url that shows up in the browser's location field,
		// so set the dataUrl option to the URL for the category
		// we just loaded.
		options.dataUrl = u.href;
	
		// Now call changePage() and tell it to switch to
		// the page we just modified.
		$.mobile.changePage( $page, options );
	}
	
	this.refreshNavbar = function(){
		console.log("refresh navbar");
		
	}
	    
    this.toString = function(){
        return ko.toJSON({
            history: ""
        });
    };	
	
})(); 
 
$("#main-page, #search-results, #track-view").live('pagebeforecreate',PPL.pageLoad);

 
// Listen for any attempts to call changepage.
$(document).bind( "pagebeforechange", function( e, data ) {
	// We only want to handle changepage calls where the caller is
	// asking us to load a page by URL.
	if ( typeof data.toPage === "string" ) {
		// We are being asked to load a page by URL, but we only
		// want to handle URLs that request the data for a specific
		// category.
		window.u = $.mobile.path.parseUrl( data.toPage );
		window.options = data;
		var sr = /^#search-results/; 
		var tv = /^#track-view/; 
		var mp = /^#main-page/; 
		
		if ( u.hash.search(sr) !== -1 ) {
			// We're being asked to display the items for a specific category.
			// Call our internal method that builds the content for the category
			// on the fly based on our in-memory category data structure.
			
			// The pages we use to display our content are already in
			// the DOM. The id of the page we are going to write our
			// content into is specified in the hash before the '?'.			
			PPL.activePageName = "search-results";
			PPL.searchTracks(u.hash.replace( /.*keyword=/, "" ));
			
			// Make sure to tell changepage we've handled this call so it doesn't
			// have to do anything.
			e.preventDefault();
		}
		else if ( u.hash.search(tv) !== -1){
			PPL.activePageName = "track-view";
			PPL.searchTrack(u.hash.replace( /.*linkid=/, "" ));
			e.preventDefault();
		}
		else if ( u.hash.search(mp) !== -1 ){
			PPL.finishPageLoad();
			e.preventDefault();
		}
	}
});