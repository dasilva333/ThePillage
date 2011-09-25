<cfcontent reset="yes"><cfsetting showdebugoutput="No">
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">

<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="white" />
<meta name="format-detection" content="telephone=no" />
<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0" />

<link rel="shortcut icon" href="images/favicon.png" type="image/x-icon" />
<link rel="apple-touch-icon" href="images/icon.png" />

<link rel="stylesheet" href="styles.css">

<title>Mobile Music</title>

<script type="text/javascript" src="js/jquery.js"></script>
<script type="text/javascript" src="js/iScroll.js"></script>
<script type="text/javascript" src="js/oauth.js"></script>
<script type="text/javascript" src="js/sha1.js"></script>
<script type="text/javascript" src="js/rc4.js"></script>  
<script type="text/javascript">

//if (typeof console == "undefined") window.console = { log: function(){} }

var touchMoveNoScroll;
var touchMoveScroll;
var mainScroll;
var isAndroid = navigator.appVersion.match(/android/gi) ? true : false;

touchMoveNoScroll = function(event) {
	event.preventDefault();
}

var controls = {
	isStreaming: false,
	curSongObj: null,
	curSongEntry : null,	
	imgDir: "images/",
	activeAppend: "_blue",
	playInactive: function (){
		return controls.imgDir + "control_play.png";	
	},
	playActive: function(){
		return controls.imgDir + "control_play" + controls.activeAppend + ".png";	
	},
	AssignControls : function(){
		$('img.controls').each(function(){
			controls.toggleState($(this).attr('id'));
		})
		$('#control_play').click(controls.resumeStream);
		$('#control_pause').click(controls.pauseStream);
	},
	resumeStream: function(){
		if (controls.isStreaming){
			isAndroid ? audioStreamer.pauseStreaming : console.log('paused streaming');
			controls.isStreaming = false;
		}
		else {
			isAndroid ? controls.streamSong(curSongObj, curSongEntry) : console.log('streaming resumed');
			controls.isStreaming = true;
		}
		toggleState('control_play');
	},
	streamSong: function(songObj, songEntry){
		controls.curSongObj = songObj;
		controls.curSongEntry = songEntry;
		//isAndroid ? audioStreamer.startStreaming(songObj.song_url,null,null) : location.href = songObj.song_url;
		location.href = songObj.song_url;
		$('#control_play').attr('src',controls.playActive());
		$(songEntry).addClass('activeSong');
		controls.isStreaming = true;
	},
	pauseStream: function(){
		if (controls.isStreaming){
			isAndroid ? audioStreamer.pauseStreaming : console.log('paused streaming');
		}	
		controls.toggleState('control_pause');
	},
	toggleState: function(control){
		curObj = $('#' + control);
		if (curObj.attr('src').indexOf(controls.activeAppend) == -1){
			curObj.attr('src',controls.imgDir + control + controls.activeAppend + ".png");
		    setTimeout(function(){
			    curObj.attr('src',controls.imgDir + control + ".png");
		    },1000);
		} 
		else {
			 curObj.attr('src',controls.imgDir + control + ".png");
		}		 
	}
}

function refreshApp() {
	window.location.reload()
}

function showLoading() {
	loader.showLoading();
}

function hideLoading() {
	loader.hideLoading();
}

var loader = {
	loadObjs: null,
	init: function(){
		loadObjs = $('.loadObj');
		loadObjs.bind('click',loader.hideLoading);
	},
	hideLoading: function(){
		if (isAndroid){
			$('#androidloadingOverlay').fadeOut(200);
			$('#androidloaderSpinner').fadeOut(200);
		}
		else {
			$('#loaderOverlay.loadObj').fadeOut(200);
			$('#loaderSpinner.loadObj').fadeOut(200);
		}
	},
	showLoading: function(){
		if (isAndroid){
			$('#androidloadingOverlay').show().fadeIn(200);
			$('#androidloaderSpinner').fadeIn(200);
		}
		else {
			$('#loaderOverlay.loadObj').fadeIn(200);
			$('#loaderSpinner.loadObj').fadeIn(200);
		}
	}
}

var RemoteLogger = {
	logEvent: function(string,data){
		console.log(data);	
	}
}

var PPL = {
	frmObj: null,
	arrSongs: [],
	searchfor: "",
	currentPage: 1,
	noAlbumImg: "http://static.pplaylist.com/img/elements/album-art.gif",
	init: function(){
		loader.init();
		frmObj = document.getElementById('frm_login');
		frmObj.onsubmit = PPL.searchSubmit;
		controls.AssignControls();
	},
	requestURL: function(){
		return "http://www.playlist.com/async/searchbeta/tracks?searchfor=" + PPL.searchFor +"&page=" + PPL.currentPage;
	},
	search: {
		searchVersion: "",
		searchTerm: "",
		trackdata: null,
		searchResultsFn: function(){
			PPL.loadMusic(); 
		}
	},
	searchSubmit: function(){
		PPL.searchFor = frmObj.q.value;
		PPL.search.searchTerm = frmObj.q.value;
		frmObj.q.blur();
		showLoading();	
		PPL.jsonpRequest();
		return false;
		
	},
	jsonpRequest: function(){
		var script = document.createElement("script");        
		//script.onload = PPL.loadMusic;
		script.setAttribute("type","text/javascript"); 
		script.setAttribute("src",PPL.requestURL());
		document.body.appendChild(script);
		
	},
	cleanArtistOrTitle: function(str){
		return str.replace("&amp;","and").replace("&","and").toLowerCase().split("(")[0].split("feat")[0].split("ft.")[0].split("-")[0];
	},
	loadMusic: function(evt){
		console.log("loadMusic");
		//$(evt.currentTarget).remove();
		PPL.arrSongs = PPL.search.trackdata;
		if (PPL.arrSongs.length == 0){
			alert("No results found");
			hideLoading();
			return;
		}
		var lstKeywords = [];
		var albumArt = $(newHtml).filter('#results').find('a.album img');
		$appContainer = $('#scrollerObj');
		$appContainer.html("");
		$(PPL.arrSongs).each(function(i, obj){
			
			obj.song_url = decrypt(obj.song_url,"Error, this track is not valid!");	
			var songEntry = jQuery(" <div />" )
				.addClass( "songEntry" )
			   	.click(function(){
			   		controls.streamSong(obj,this);
				});
			/*<div class="albumImage" id="albumImage_1">
				<div class="albumArtFrame"><img src="images/shim.gif"></div>
				<div class="albumContainer"><img src="{albumArtSrc}"></div>
			</div>*/
			
			var albumImage = jQuery(" <div />" )
				.addClass( "albumImage" );
			var albumArtFrame = jQuery(" <div />" )
				.addClass( "albumArtFrame" )
				.html("<img src='images/shim.gif'>")
				.appendTo( albumImage );
			
			/*var albumImg = jQuery(" <img />" )
				.attr('src',obj.album)
				.attr('width',80);*/
			var albumImg = albumArt.eq(i).attr('width',80);
			if (albumImg.attr('src') == PPL.noAlbumImg){
				albumImg.attr('src',"images/noAlbumImage.png");
				var vArtist = PPL.cleanArtistOrTitle(obj.artist);
				var vTitle = PPL.cleanArtistOrTitle(obj.title);
				var keyword = vArtist + ' ' + vTitle;
				lstKeywords.push(keyword);
				albumImg.addClass("noAlbumImg");
			}
			albumImg[0].onerror = function (){ 
				this.src = "images/noAlbumImage.png"; 
			}
			var albumContainer = jQuery(" <div />" )
				.addClass( "albumContainer" )
				.html(albumImg)
				.appendTo( albumImage );
			albumImage.appendTo(songEntry);
			
			/* <div class="infoEntry">
				<div class="resultInfo">
					<div class="artistName">Artist Name</div>
					<div class="titleName">Song Name</div>
				</div>
			   </div> */
			var infoEntry = jQuery(" <div />" )
				.addClass( "infoEntry" );
			var resultInfo = jQuery(" <div />" )
				.addClass( "resultInfo" )
				.appendTo( infoEntry );
			var artistName = jQuery(" <div />" )
				.addClass( "artistName" )
				.html(obj.artist)
				.appendTo( resultInfo );
			var titleName = jQuery(" <div />" )
				.addClass( "titleName" )
				.html(obj.title)
				.appendTo( resultInfo );
			var titleName = jQuery(" <div />" )
				.addClass( "duration" )
				.html(PPL.util.secondsToDuration(obj.duration))
				.appendTo( resultInfo );		
			infoEntry.appendTo(songEntry);
			
			$appContainer.append(songEntry);
			if (i == PPL.arrSongs.length - 1){
				var pagingEntry = jQuery(" <div />" ).addClass( "pagingEntry" );
				jQuery(" <div />" )
					.addClass( "pagingPrev" )
					.appendTo(pagingEntry)
					.html("<img src='images/navLeft.png' align='absmiddle'>&nbsp; Prev Page")
					.click(function(){ PPL.movePage(0) });
				jQuery(" <div />" )
					.addClass( "pagingNext" )
					.appendTo(pagingEntry)
					.html("<img src='images/navRight.png' align='absmiddle'>&nbsp; Next Page")
					.click(function(){ PPL.movePage(1) });
				$appContainer.append(pagingEntry);
				hideLoading();
				mainScroll = new iScroll('scrollerObj');
				if (lstKeywords.length > 0)
					PPL.fetchAlbums(lstKeywords.join(","));
			}
		})
		
	},
	fetchAlbums: function(keywords){
		reqURL = "http://query.yahooapis.com/v1/public/yql?q=use%20%22store%3A%2F%2Frichard.webtron.net%2FmusicTrackSearch2%22%20AS%20musicTrackSearch%3B%20SELECT%20*%20FROM%20musicTrackSearch%20WHERE%20keyword%20%3D%20%40keyword&format=json&keyword=";
		reqURL = reqURL + escape(keywords);
		var APIKey = "dj0yJmk9djdSUFVWdmRtVTdUJmQ9WVdrOU0xRlBhRFY0TlRnbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD01Mw--";
		var SharedSecret = "9d32e10aa87b51eacbd1a328d1ee0912067115db";
		var signedURL = makeSignedRequest(APIKey,SharedSecret,reqURL);
		$.ajax({
				type: 'GET',
				url: signedURL, 
				dataType: 'jsonp',
				jsonp: 'callback',
				jsonpCallback: 'PPL.loadAlbum'
			}
		);
	},
	fetchAlbums2: function(keywords){
		var APIKey = "hk9c28vgwnzrgf9z9aqkaerh";
		$.ajax({
				type: 'GET',
				url: signedURL, 
				dataType: 'jsonp',
				jsonp: 'callback',
				jsonpCallback: 'PPL.loadAlbum'
			}
		);
	},
	loadAlbum: function(data){
		arrAlbums = data.query.results.entries.album;
		albumContainers = $(".albumContainer img.noAlbumImg");
		$(arrAlbums).each(function(i, obj){
			albumContainers.eq(i).attr("src",obj);
			albumContainers.eq(i).removeClass("noAlbumImg");
		});
	},
	movePage: function(direction){
		if (direction == 0){
			if (PPL.currentPage > 1){
				PPL.currentPage = PPL.currentPage - 1;
				PPL.searchSubmit();
			}
		}
		else if (direction == 1){
			PPL.currentPage = PPL.currentPage + 1;
			PPL.searchSubmit();
		}
	},
	user: {},
	util: {
		secondsToDuration: function(seconds){
			var durationStr = new Array();
			durationStr.push(parseInt(seconds / 60));
			durationStr.push(":");
			var secs = seconds % 60;
			durationStr.push((secs  < 10) ? '0'+secs : secs);
			return durationStr.join("");
		}
	}
}

window.onload = PPL.init;


</script>

</head>
<body>
	<div id="androidloadingOverlay" class="loadObj" ontouchmove="touchMoveNoScroll(event);" style="display:none;">
		<p id="androidloading">Loading</p>
		<p id="spinner">&nbsp;</p>
	</div>
	<div id="loaderOverlay" class="loadObj" ontouchmove="touchMoveNoScroll(event);">&nbsp;</div>
	<div id="loaderSpinner" class="loadObj" ontouchmove="touchMoveNoScroll(event);">&nbsp;</div>
	
	<div id="appContainer" ontouchmove="touchMoveNoScroll(event);">
		
		<div ontouchmove="touchMoveNoScroll(event);" id="topBar">
			<div class="padding_std" style="margin:14px;">
				<div style="width:100%; margin:auto;">
					<form id="frm_login">
                    	<input type="text" name="q" placeholder="Search Songs" />
					</form>	
				</div>
			</div>
		</div>
		
		<div style="overflow: auto;" id="contentWindow">
			<div id="scrollerObj"></div>
		</div>
		
		<div ontouchmove="touchMoveNoScroll(event);" id="bottomBar">
			
			<div class="padding_std">
				<img src="images/control_start.png" id="control_start" class="controls">
				<img src="images/control_play.png" id="control_play" class="controls">
				<img src="images/control_pause.png" id="control_pause" class="controls">
				<img src="images/control_stop.png" id="control_stop" class="controls">
				<img src="images/control_end.png" id="control_end" class="controls">
			</div>	
			
		</div>
		
	</div>
</body>
</html>