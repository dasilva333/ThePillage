enyo.kind({
	name: "DownloadService",
	kind: enyo.VFlexBox,
	components: [
	{
		name: "fileDownload",
		kind: "PalmService",
		service: "palm://com.palm.downloadmanager/",
		method: "download",
		onSuccess: "downloadFinished",
		onFailure: "downloadFail",
		onResponse: "gotResponse",
		subscribe: true
	}],
	create: function () {
		this.inherited(arguments);
		enyo.dispatcher.rootHandler.addListener(this);
	},
	customGlobalEventHandler: function (sender, param) {
		enyo.log("customGlobalEvent", param.data.url); 
		enyo.log("customGlobalEvent", param.data.filename); 
		this.$.fileDownload.call({
			target: param.data.url,
			mime: "audio/mpeg",
			targetDir: "/media/internal/Music/Downloaded/",
			targetFilename: param.data.filename,
			keepFilenameOnRedirect: false,
			canHandlePause: true,
			subscribe: true
		});
	},
	downloadFinished: function (inSender, inResponse) {
		enyo.log("Download success, results=" + enyo.json.stringify(inResponse));
		if (inResponse.completed) enyo.windows.addBannerMessage("File Added To Music", "{}");
	},
	downloadFail: function (inSender, inResponse) {
		enyo.log("Download failure, results=" + enyo.json.stringify(inResponse));
		enyo.windows.addBannerMessage("File Download Failed", "{}");
	}

});