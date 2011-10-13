enyo.kind({
	name: "TracksPlayer",
	kind: enyo.HFlexBox,
	components: [
		{
			kind: "Sound",
			name: "playSound",
			src: ""
		}
	],
	create: function () {
		this.inherited(arguments);
		enyo.dispatcher.rootHandler.addListener(this);
		window.audioPlayer = this.$.playSound.audio;
	},
	playEventHandler: function (sender, param) {
		enyo.log("customGlobalEvent", param.data); 
		this.$.playSound.audio.src = param.data;
		this.$.playSound.play();
	},
	btnSoundClick: function () {
		this.$.playSound.play();
	}
});
/*window.enyo.dispatch({type:"playEvent", data: "http://www.jplayer.org/audio/mp3/TSP-01-Cro_magnon_man.mp3" });*/