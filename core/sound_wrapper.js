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

	var fillBuffer = function(channel_buffer) {
		if (opts.debugPrint) {
			if (wrapper_buffer.length == 0) {
				console.log("WebAudio buffer underrun");
			}
		}
		if (wrapper_buffer.length > 0) {
			channel_buffer.copyToChannel(wrapper_buffer.shift(), 0, 0);
		}		
		postMessage(["fillBuffer", []]);
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
	self.readSoundRegisters = function() {
		return AY8912_Regs;
	}
	self.reset = function () {
		wrapper_buffer = [];
		queue = [];
		postMessage(["reset", []]);
	}
	
	snd_worker.onmessage = function(e) {
		switch (e.data[0]) {
			case "fillBuffer":
				while (wrapper_buffer.length > 8) {			
					if (opts.debugPrint) {
						console.log("WebAudio buffer overflow");
					}				
					wrapper_buffer.shift();
				}
				wrapper_buffer.push(e.data[1]);
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
				fillBuffer(e.outputBuffer);
			};
			
			var createFilter = function (entry) {
				var filter = audioContext.createBiquadFilter(); 
				filter.type = "peaking"; 						// type
				filter.frequency.value = entry[0]; 	// frequency
				filter.Q.value = 1; 								// Q-factor
				filter.gain.value = entry[1]; 			// gain
				if (opts.debugPrint) {
					console.log(filter);
				}
				return filter;
			};

			var createCompressor = function() {
				var compressor = audioContext.createDynamicsCompressor();
		    compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
				compressor.knee.setValueAtTime(2, audioContext.currentTime);
				compressor.ratio.setValueAtTime(2, audioContext.currentTime);
				compressor.attack.setValueAtTime(0.004, audioContext.currentTime);
				compressor.release.setValueAtTime(0.100, audioContext.currentTime);
				if (opts.debugPrint) {
					console.log(compressor);
				}
				return compressor;
			}
			
			var createSoundChain = function () {
//				var equalizer = [[32, -3], [64, 0], [125, 3], [250, 0], [500, -3], [1000, -4.5], [2000, -1.5], [4000, 3], [8000, 4.5], [16000, 3]]; // winamp
//				var equalizer = [[60, 0], [170, 3], [310, 0], [600, -2], [1000, -4.5], [3000, -1.5], [6000, 3], [12000, 4.5], [14000, 4.5], [16000, 3]]; // iphone
				var equalizer = opts.equalizer || [[100, 5], [300, 2], [857, 0], [2400, 2], [6900, 5], [9000, -3], [16000, -12]];	// https://www.reddit.com/r/chiptunes/comments/2ffuzd/good_eq_settings_for_chip/
				var filters = [audioNode];
				if (opts.audioHiFi && equalizer.length > 0 && equalizer[0].length > 0) {
					filters = filters.concat(equalizer.map(createFilter));
					filters = filters.concat(createCompressor());
					filters.reduce(function (prev, curr) {
						prev.connect(curr);
						return curr;
					});
				}
				return filters;
			};
			
			var filters = createSoundChain();

			self.isEnabled = false;
			var soundChain = function(state) {
				if (state) {
					audioNode.onaudioprocess = onAudioProcess;
					filters[filters.length - 1].connect(audioContext.destination);
				}
				else {
					filters[filters.length - 1].disconnect();
					audioNode.onaudioprocess = null;
				}
			}
			self.setSource = function (fillBufferCallback) {
				fillBuffer = fillBufferCallback;
				if (self.isEnabled) {
					soundChain(true);
				};
			}
			self.setAudioState = function (state) {
				if (state) {
					/* enable */
					self.isEnabled = true;
					if (fillBuffer) {
						soundChain(true);
					}
					if (debugPrint) {
						console.log("Sound enabled");
					}
					return true;
				} else {
					/* disable */
					self.isEnabled = false;
					soundChain(false);
					if (debugPrint) {
						console.log("Sound disabled");
					}
					return false;
				}
			}

			function enableAudio() {
				audioContext.resume().then(() => {
					if (debugPrint) {
						console.log("Playback resumed successfully");
					}
					document.querySelector("*").removeEventListener("click", enableAudio);
				});
			}
			document.querySelector("*").addEventListener("click", enableAudio);
			
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

	return self;

}