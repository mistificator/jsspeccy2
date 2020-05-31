JSSpeccy.SoundGenerator = function (opts) {
	var snd_worker = new Worker("sound.min.js");
	var wrapper_buffer = [];
	var ayRegSelected = 0;
	var AY8912_Regs = new Int32Array(16); // fake duplicate of AY8912_Regs of sound.js 
	for (var reg of AY8912_Regs) {
		reg = 0;
	}
	
	var backend = opts.soundBackend;
	snd_worker.postMessage(["SoundGenerator", 
	[{
		model: opts.model,
		backendSampleRate: backend.sampleRate,
		backendEnabled: backend.isEnabled,
		debugPrint: opts.debugPrint	
	}]]);

	var fillBuffer = function(buffer) {
		for (var i = 0; i < buffer.length; i++)
		{
			buffer[i] = wrapper_buffer[i];
		}
		snd_worker.postMessage(["fillBuffer", [backend.audioBufferSize]]);
		wrapper_buffer = wrapper_buffer.slice(buffer.length);
	}
	backend.setSource(fillBuffer);

	self.updateBuzzer = function (val, currentTstates) {
		snd_worker.postMessage(["updateBuzzer", Array.prototype.slice.call(arguments, 0)]);
	}
	self.createSoundData = function (size, val) {
		snd_worker.postMessage(["createSoundData", Array.prototype.slice.call(arguments, 0)]);
	}
	self.endFrame = function () {
		snd_worker.postMessage(["endFrame", []]);
	}
	self.selectSoundRegister = function (reg) {
		ayRegSelected = reg;
		snd_worker.postMessage(["selectSoundRegister", Array.prototype.slice.call(arguments, 0)]);
	}
	self.writeSoundRegister = function (val, currentTstates) {
		AY8912_Regs[ayRegSelected] = val;
		snd_worker.postMessage(["writeSoundRegister", Array.prototype.slice.call(arguments, 0)]);
	}
	self.readSoundRegister = function () {
		snd_worker.postMessage(["readSoundRegister", []]);
		return AY8912_Regs[ayRegSelected];
	}
	self.reset = function () {
		wrapper_buffer = [];
		snd_worker.postMessage(["reset", []]);
	}
	
	var prev_state = false;
	snd_worker.onmessage = function(e) {
		switch (e.data[0]) {
			case "fillBuffer":
				wrapper_buffer = wrapper_buffer.concat(e.data[1]);
				break;
			case "readSoundRegister":
				AY8912_Regs[ayRegSelected] = e.data[1];
				break;
			case "notifyReady":
				break;
		};
		if (prev_state != backend.isEnabled) {
			snd_worker.postMessage(["setEnabled", [backend.isEnabled]]);
			prev_state = backend.isEnabled;
			if (backend.isEnabled) {
				snd_worker.postMessage(["fillBuffer", [backend.audioBufferSize]]); // force buffer init
			}
		}
	}
	
	return self;
}

JSSpeccy.SoundBackend = function (opts) {
	var self = {};
	
	opts = opts || {};
	var debugPrint = opts.debugPrint;
	var buffer_size = self.audioBufferSize = Number.parseInt(new String(opts.audioBufferSize || 1024));

	/* Regardless of the underlying implementation, an instance of SoundBackend exposes the API:
	sampleRate: sample rate required by this backend
	isEnabled: whether audio is currently enabled
	setSource(fn): specify a function fn to be called whenever we want to receive audio data.
	fn is passed a buffer object to be filled
	setAudioState(state): if state == true, enable audio; if state == false, disable.
	Return new state (may not match the passed in state - e.g. if sound is unavailable,
	will always return false)
	notifyReady(dataLength): tell the backend that there is dataLength samples of audio data
	ready to be received via the callback we set with setSource. Ignored for event-based
	backends (= Web Audio) that trigger the callback whenever they feel like it...
	 */

	self.sampleRate = 44100;

	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var fillBuffer = null;

	if (AudioContext) {
		/* Use Web Audio API as backend */
		var audioContext = new AudioContext();
		audioContext.suspend();
		var audioNode = null;

		//Web audio Api changed createJavaScriptNode to CreateScriptProcessor - we support both
		if (audioContext.createScriptProcessor != null) {
			audioNode = audioContext.createScriptProcessor(buffer_size, 1, 1);
			if (debugPrint) {
				console.log("audioNode is ScriptProcessorNode");
			}
		}
		else
		if (audioContext.createJavaScriptNode != null) {
			audioNode = audioContext.createJavaScriptNode(buffer_size, 1, 1);
			if (debugPrint) {
				console.log("audioNode is JavaScriptNode");
			}
		} 

		if (audioNode != null) {
			onAudioProcess = function (e) {
				var buffer = e.outputBuffer.getChannelData(0);
				fillBuffer(buffer);
			};

			self.isEnabled = false;
			self.setSource = function (fillBufferCallback) {
				fillBuffer = fillBufferCallback;
				if (self.isEnabled) {
					audioNode.onaudioprocess = onAudioProcess;
					audioNode.connect(audioContext.destination);
				};
			}
			self.setAudioState = function (state) {
				if (state) {
					/* enable */
					self.isEnabled = true;
					if (fillBuffer) {
						audioNode.onaudioprocess = onAudioProcess;
						audioNode.connect(audioContext.destination);
					}
					if (debugPrint) {
						console.log("Sound enabled");
					}
					return true;
				} else {
					/* disable */
					self.isEnabled = false;
					audioNode.onaudioprocess = null;
					audioNode.disconnect(0);
					if (debugPrint) {
						console.log("Sound disabled");
					}
					return false;
				}
			}
			self.notifyReady = function (dataLength) {
				/* do nothing */
			}

			document.querySelector("*").addEventListener("click", function () {
				audioContext.resume().then(() => {
					if (debugPrint) {
						console.log("Playback resumed successfully");
					}
				});
			});
			
			return self;
		}
	}

	/* use dummy no-sound backend. We still keep a handle to the callback function and
	call it on demand, so that it's not filling up a buffer indefinitely */
	self.isEnabled = false;
	self.setAudioState = function (state) {
		return false;
	}
	self.setSource = function (fn) {
		fillBuffer = fn;
	};
	self.notifyReady = function (dataLength) {
		var buffer = new Float32Array(dataLength);
		fillBuffer(buffer);
	}
	return self;

}