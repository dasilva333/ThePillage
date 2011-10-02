var RemoteLogger = {
	logEvent: function(string,data){
		console.log(data);	
	}
}

var PPL = new (function(){
	var context = this;
	this.showShortUrl = ko.observable(false); 
	this.activePageName = "search-results";
	
	this.activeTrack = ko.observable({
		albumImage: ko.observable(""),
		short_url: ko.observable("")
	})
			
	var TrackPage = function(keyword, number){
		var trackpage = this;
		this.pageNumber = number;
		this.keyword = keyword;
		this.tracks = ko.observableArray();

		var load = function(keyword, number){
			//add the results to the page
			for(var index in this.search.trackdata)
				trackpage.tracks.push(new Track(this.search.trackdata[index]));

			//this part goes to YQL for all the missingAlbumArt array and finds their images	
			this.missingAlbumArt.fetch('PPL.missingAlbumArt.setTrackImages');
			
			setTimeout(function(){
				this.finishPageLoad();
			}.bind(this),250);
			
		}.bind(context);
				
		this.findTrackById = function(trackid){
			return ko.utils.arrayFilter(this.tracks(), function(track){
				return track.trackid == trackid ? track: null;
			})[0];
		};
		
		load(keyword, number);
	}
	this.missingAlbumArt = new (function(){
		var missingAlbumArt	= [];
		var missingAlbums = this;
		
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
			var curPage = this.search.activePage();
			$.each(curData,function(i,o){
				if (o.album.length > 3){
				   curPage.findTrackById(o.trackid).setTrackImage(o.album);
				}
			});
			missingAlbums.reset();
		}.bind(context);
		
		this.setActiveTrackImage = function(data){
			this.activeTrack().albumImage(data.query.results.entries.result.album);
		}.bind(context);
		
	})()
	
	var Track = function(item){
		var track = this;
		this.noAlbumImg = "http://static.pplaylist.com/img/elements/album-art.gif"
		this.artist = item.artist;
		this.title = unescape(item.title);
		this.albumImage = ko.observable(item.album);
		this.trackid = item.trackid;
		this.linkid =  this.artist + "-" + item.linkid;
		this.duration = $.jPlayer.convertTime( item.duration);
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
			context.missingAlbumArt.addItem([this.trackid , this.clean(this.artist) + ' ' + this.clean(this.title)]);			
		}
		
		this.setTrackImage = function(image){
			this.albumImage(image);
		}
		
		this.open = function(){
			console.log(track.song_url);
			this.audioPlayer.jPlayer("setMedia", { mp3 : track.song_url }).jPlayer("play");
			return false;
		}.bind(context);
		
		this.setActiveTrack = function(){
			//TODO fix the PPL usage here... somehow
			this.activeTrack(track);
		}.bind(context);
		
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
	
	this.search = new (function(){
		var search = this;
		this.searchVersion = "",
		this.searchTerm = "";
		this.trackdata = null;
		this.currentPage = 1;
		this.activePage = ko.observable({
			//TODO remove this dependency for the foreach template
			tracks: ko.observableArray()
		});
			
		//This function gets called automatically due to the Playlist.com API
		this.searchResultsFn = function(){
			console.log("searchResultsFn");
			if (this.activePageName == "search-results")
				search.loadTracks(); 
			else if (this.activePageName == "track-view")
				search.loadTrackView();
			$.mobile.hidePageLoadingMsg();	
		}.bind(context)
		
		this.submit = function(form){
			this.searchFor(form.searchBox.value);
			return false;			
		};
		
		this.autoSubmit = function(elem){
			var theValue = elem.value;
			window.isRun = false;
			setTimeout(function(){
				if (elem.value == theValue && isRun == false){
					isRun = true;
					this.searchFor(theValue);
				}	
			}.bind(this),3000);	
		};
		
		this.searchFor = ko.dependentObservable({
			read: function() {
				return location.hash.replace( /.*keyword=/, "" );
			},
			write: function (value) {
				location.hash = "#search-results?keyword=" + value;
			}
		})
		
		this.loadTracks = function(){
			this.activePage(new TrackPage(this.searchFor(), this.currentPage));		
		};
	
		this.tracks = function(keyword){
			if (typeof keyword != "undefined" && keyword != ""){
				//the onload attribute doesnt need to be set because the callback is hardcoded into the response (searchResultsFn)
				$.mobile.showPageLoadingMsg();	
				if (typeof this.history == "object"){
					this.history.addItem(keyword);
				}
				this.remoteRequest("http://www.playlist.com/async/searchbeta/tracks?searchfor=" + keyword + "&page=1");	
			}
		}
		
		this.track = function(keyword){
			if (this.activeTrack().linkid != keyword){
				$.mobile.showPageLoadingMsg();	
				var artist = keyword.split("-")[0];
				var linkid = keyword.split("-")[1];
				this.activeTrack().artist = artist;
				this.activeTrack().linkid = linkid;
				this.remoteRequest("http://www.playlist.com/async/searchbeta/tracks?searchfor=" + keyword + "&page=1&facet=all&hl=" + linkid);	
			}
			else {
				this.finishPageLoad();		
			}
		}.bind(context);
		
		this.history = new (function(){
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
	            return ko.toJS(this.getItems());
			}
			
			load(history);
		})()
	})()
	
	this.loadTrackView = function(){

		var activeLinkid = this.activeTrack().linkid;
		$.each(search.trackdata, function(i,o){
			if (o.linkid == activeLinkid)
				this.activeTrack(new Track(o));
		}.bind(this));	
		
		//this part goes to YQL for all the missingAlbumArt array and finds their images	
		this.missingAlbumArt.fetch('PPL.missingAlbumArt.setActiveTrackImage');
			
		this.finishPageLoad();
	}.bind(context); 

	this.remoteRequest = function(src){
		var script = document.createElement("script"); 
		script.setAttribute("type","text/javascript"); 
		script.setAttribute("src",src);
		document.body.appendChild(script);
	}

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
	
	this.pageBeforeCreate = function(){
		console.log("pagebeforecreate");
		//this gets called AFTER pageBeforeChange and BEFORE document.ready
		
	}.bind(this);
	
})(); 
 
$(document).ready(function(){
	console.log("document.ready");
	PPL.audioPlayer = $('#jquery_jplayer_1').jPlayer(
		{
			swfPath: 'swf',
			solution: 'html, flash',
			supplied: 'mp3',
			preload: 'metadata',
			volume: 0.8,
			muted: false,
			backgroundColor: '#000000',
			cssSelectorAncestor: '.jp-audio',
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
});
 
$("#main-page, #search-results, #track-view").live('pagebeforecreate',PPL.pageBeforeCreate);

 
// Listen for any attempts to call changepage.
$(document).bind( "pagebeforechange", function( e, data ) {
	console.log("pagebeforechange");
	console.log(data);
	
	if ( typeof data.options.fromPage == "undefined" && data.options.transition == "none")
		ko.applyBindings(PPL);	
		
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
			PPL.search.track(u.hash.replace( /.*keyword=/, "" ));
			
			// Make sure to tell changepage we've handled this call so it doesn't
			// have to do anything.
			e.preventDefault();
		}
		else if ( u.hash.search(tv) !== -1){
			PPL.activePageName = "track-view";
			PPL.search.track(u.hash.replace( /.*linkid=/, "" ));
			e.preventDefault();
		}
		else if ( u.hash.search(mp) !== -1 ){
			PPL.finishPageLoad();
			e.preventDefault();
		}
	}
});