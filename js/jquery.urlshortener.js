(function($){
	$.shortenUrl = function(longUrl, callback) {
		// Build the URL to query
		var api_call = "http://api.bit.ly/shorten?"
			+"version="+$.shortenUrl.settings.version
			+"&longUrl="+encodeURIComponent(longUrl)
			+"&login="+$.shortenUrl.settings.login
			+"&apiKey="+$.shortenUrl.settings.apiKey
			+"&history="+$.shortenUrl.settings.history
			+"&format=json&callback=?";
		
		// See if we've shortened this url already
		var cached_result = $.shortenUrl.shortenedUrls[longUrl];
		if (cached_result !== undefined) {
			// the timeout is to eliminate race conditions arising 
			// from the assumption that the callback will be
			// called after an ajax call
			window.setTimeout(function() {
				callback(cached_result);
			}, 1);
		}
		else {
			// Utilize the bit.ly API
			$.getJSON(api_call, function(data){
				var short_url = data.results[longUrl].shortUrl;
				$.shortenUrl.shortenedUrls[longUrl] = short_url;
				callback(short_url);
			});
		}
	}
	
	// set up default options
	$.shortenUrl.settings = {
		version:    '2.0.1',
		login:      'o_755g7keami',
		apiKey:     'R_4f57a0080a4683965221664c7a5684a9',
		history:    '0'
	};
	$.shortenUrl.shortenedUrls = {};
})(jQuery);
