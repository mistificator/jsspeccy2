JSSpeccy.SoundGenerator = function (opts) {
	var backend = opts.soundBackend;
	var snd_worker = new Worker("sound.min.js");
	var queue = [];
	const forcedPostMessage = true;
	var postMessage = function(msg, forced) {
		if (!backend.isEnabled && (forced || false) !== forcedPostMessage) {
			return;
		}
		if (msg[0] === "updateBuzzer" && queue.length > 0) {
			var q_msg = queue[queue.length - 1];
			if (q_msg[0] === msg[0] && q_msg[1][0] === msg[1][0]) {
				q_msg = msg;
				return;
			}
		}
		queue.push(msg);
	}
	
	var wrapper_buffer = [];
	var ayRegSelected = 0;
	var AY8912_Regs = new Int32Array(16); // fake duplicate of AY8912_Regs of sound.js 
	for (var reg of AY8912_Regs) {
		reg = 0;
	}
	
	postMessage(["SoundGenerator", 
	[{
		model: opts.model,
		backendSampleRate: backend.sampleRate,
		backendEnabled: backend.isEnabled,
		backendAudioBufferSize: backend.audioBufferSize,
		debugPrint: opts.debugPrint	
	}]], forcedPostMessage);

	var fillBuffer = function(buffer) {
		const count = Math.min(buffer.length, wrapper_buffer.length);
		var i = 0;
		for (; i < count; i++) {
			buffer[i] = wrapper_buffer[i];
		}
		const fill_val = buffer[Math.max(0, count - 1)];
		for (; i < buffer.length; i++) {
			buffer[i] = fill_val;
		}
		postMessage(["fillBuffer", []]);
		wrapper_buffer = wrapper_buffer.slice(buffer.length);
	}
	backend.setSource(fillBuffer);

	self.updateBuzzer = function (val, currentTstates) {
		postMessage(["updateBuzzer", Array.prototype.slice.call(arguments, 0)]);
	}
	
	var prev_state = false;
	self.endFrame = function () {
		if (prev_state != backend.isEnabled) {
			postMessage(["setEnabled", [backend.isEnabled]], forcedPostMessage);
			prev_state = backend.isEnabled;
			if (backend.isEnabled) {
				postMessage(["fillBuffer", [backend.audioBufferSize]]); // force buffer init
			}
			else {
				wrapper_buffer = [];
				queue = [];
			}
		}		

		postMessage(["endFrame", []]);
		if (backend.isEnabled && queue.length > 0) {
			snd_worker.postMessage(queue);
			queue = [];
		}
	}
	self.selectSoundRegister = function (reg) {
		if (ayRegSelected === reg) {
			return;
		}
		ayRegSelected = reg;
		postMessage(["selectSoundRegister", Array.prototype.slice.call(arguments, 0)]);
	}
	self.writeSoundRegister = function (val, currentTstates) {
		AY8912_Regs[ayRegSelected] = val;
		postMessage(["writeSoundRegister", Array.prototype.slice.call(arguments, 0)]);
	}
	self.readSoundRegister = function () {
		postMessage(["readSoundRegister", []]);
		return AY8912_Regs[ayRegSelected];
	}
	self.reset = function () {
		wrapper_buffer = [];
		queue = [];
		postMessage(["reset", []]);
	}
	
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
			audioNode = audioContext.createScriptProcessor(buffer_size, 0, 1);
			if (debugPrint) {
				console.log("audioNode is ScriptProcessorNode");
			}
		}
		else
		if (audioContext.createJavaScriptNode != null) {
			audioNode = audioContext.createJavaScriptNode(buffer_size, 0, 1);
			if (debugPrint) {
				console.log("audioNode is JavaScriptNode");
			}
		} 

		if (audioNode != null) {
			onAudioProcess = function (e) {
				fillBuffer(e.outputBuffer.getChannelData(0));
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