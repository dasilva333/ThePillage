var RemoteLogger = {
	logEvent: function(string,data){
		console.log(data);	
	}
}
 
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
		var re = /^#search-results/;
		console.log('page before change');
		if ( u.hash.search(re) !== -1 ) {
			// We're being asked to display the items for a specific category.
			// Call our internal method that builds the content for the category
			// on the fly based on our in-memory category data structure.
			
			// The pages we use to display our content are already in
			// the DOM. The id of the page we are going to write our
			// content into is specified in the hash before the '?'.			
			PPL.jsonpRequest(u.hash.replace( /.*keyword=/, "" ));
			
			// Make sure to tell changepage we've handled this call so it doesn't
			// have to do anything.
			e.preventDefault();
		}
	}
});

var PPL = new (function(){
	
	this.currentPage = 1;
	this.activePage = ko.observable({
		//todo remove this dependency for the foreach template
		tracks: ko.observableArray()
	});
	this.trackPages = ko.observableArray();
		
	this.init = function(){
		$.mobile.page.prototype.options.domCache = true;
		ko.applyBindings(this);
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
				trackpage.tracks.push(new Track(PPL.search.trackdata[index]));

			//this part goes to YQL for all the missingAlbumArt array and finds their images	
			fetchMissingAlbums();
			
			setTimeout(function(){
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
			
				// We don't want the data-url of the page we just modified
				// to be the url that shows up in the browser's location field,
				// so set the dataUrl option to the URL for the category
				// we just loaded.
				options.dataUrl = u.href;
			
				// Now call changePage() and tell it to switch to
				// the page we just modified.
				$.mobile.changePage( $page, options );
			},100);
		}
			
		this.setTrackImages = function(data){
			var curData = data.query.results.entries.result
			var curPage = PPL.activePage();
			$.each(curData,function(i,o){
				if (o.album != 0){
				   curPage.findTrackById(o.trackid).setTrackImage(o.album);
				}
			});
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
		
		this.findTrackById = function(trackid){
			return ko.utils.arrayFilter(this.tracks(), function(track){
				return track.trackid == trackid ? track: null;
			})[0];
		};
		
		var fetchMissingAlbums = function(){		
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
					jsonpCallback: 'PPL.setActivePageTrackImages' 
				}
			);
		}
		load(keyword, number);
	}
	
	this.requestURL = function(searchFor){
		return "http://www.playlist.com/async/searchbeta/tracks?searchfor=" + searchFor + "&page=" + PPL.currentPage;
	}
	
	//these are placeholder objects that must be here for playlist.com's api
	this.user = {}
	this.search = {
		searchVersion: "",
		searchTerm: "",
		trackdata: null, 
		//This function gets called automatically due to the Playlist.com API
		searchResultsFn: function(){
			PPL.loadMusic(); 
			$.mobile.hidePageLoadingMsg();	
		},
		submit: function(evt){
			console.log("evt "+evt.target.searchBox.value);
			PPL.search.searchFor("Eminem");
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
			}.bind(this),1200);	
		}
	}
	
	this.loadMusic = function(){
		var tp = new TrackPage(PPL.search.searchFor(), this.currentPage);
		this.trackPages.push(tp);
		this.activePage(tp);		
	} 
	
	this.jsonpRequest = function(keyword){
		if (typeof keyword != "undefined" && keyword != ""){
			//the onload attribute doesnt need to be set because the callback is hardcoded into the response (searchResultsFn)
			$.mobile.showPageLoadingMsg();	
			var script = document.createElement("script"); 
			script.setAttribute("type","text/javascript"); 
			script.setAttribute("src",PPL.requestURL(keyword));
			document.body.appendChild(script);
		}
	}

})();

PPL.search.searchFor = ko.dependentObservable({
    read: function() {
		return location.hash.replace( /.*keyword=/, "" );
    },
    write: function (value) {
		location.href = "#search-results?keyword=" + value;
    },
    owner: PPL
});

//$(document).ready(PPL.init);
$("#main-page, #search-results").live('pagecreate',function(event){
  PPL.init();
});
