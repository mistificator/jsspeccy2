/**
 * @license JSSpeccy v2.2.1 - http://jsspeccy.zxdemo.org/
 * Copyright 2014 Matt Westcott <matt@west.co.tt> and contributors
 *
 * webOS JSSpeccy v. 1.0
 * Copyright 2020 Mist Poryvaev <mist.poryvaev@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of
 * the GNU General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <http://www.gnu.org/licenses/>.
 */

if (!window.DataView) window.DataView = jDataView;

function JSSpeccy(container, opts) {
	var self = {};

	opts = opts || {};

	if (typeof(container) === 'string') {
		container = document.getElementById(container);
	}

	if (!opts.cpuFpsLimit) {
		opts.cpuFpsLimit = 50;
	}

	/* == Z80 core == */
	/* define a list of rules to be triggered when the Z80 executes an opcode at a specified address;
		each rule is a tuple of (address, opcode, expression_to_run). If expression_to_run evaluates
		to false, the remainder of the opcode's execution is skipped */
	var z80Traps = [
		[0x056b, 0xc0, 'JSSpeccy.traps.tapeLoad()'],
		[0x0111, 0xc0, 'JSSpeccy.traps.tapeLoad()']
	];

	JSSpeccy.buildZ80({
		traps: z80Traps,
		applyContention: opts.applyContention // slightly faster on webOS without contention
	});


	/* == Event mechanism == */
	function Event() {
		var self = {};
		var listeners = [];

		self.bind = function(callback) {
			listeners.push(callback);
		};
		self.unbind = function(callback) {
			for (var i = listeners.length - 1; i >= 0; i--) {
				if (listeners[i] == callback) listeners.splice(i, 1);
			}
		};
		self.trigger = function() {
			var args = arguments;
			/* event is considered 'cancelled' if any handler returned a value of false
				(specifically false, not just a falsy value). Exactly what this means is
				up to the caller - we just return false */
			var cancelled = false;
			for (var i = 0; i < listeners.length; i++) {
				cancelled = cancelled || (listeners[i].apply(null, args) === false);
			}
			return !cancelled;
		};

		return self;
	}

	function Setting(initialValue) {
		var self = {};

		var value = initialValue;

		self.onChange = Event();

		self.get = function() {
			return value;
		};
		self.set = function(newValue) {
			if (newValue == value) return;
			value = newValue;
			self.onChange.trigger(newValue);
		};
		return self;
	}

	self.settings = {
		'checkerboardFilter': Setting(opts.checkerboardFilter || false)
	};

	/* == Execution state == */
	self.isDownloading = false;
	self.isRunning = false;
	self.currentTape = null;
	var currentModel, spectrum;


	/* == Set up viewport == */
	var viewport = JSSpeccy.Viewport({
		container: container,
		panelXWidth: opts.panelXWidth,
		panelYWidth: opts.panelYWidth,
		onClickIcon: function() {self.start();}
	});

	if (!('dragToLoad' in opts) || opts['dragToLoad']) {
		/* set up drag event on canvas to load files */
		viewport.canvas.ondragenter = function() {
			// Needed for web browser compatibility
			return false;
		};
		viewport.canvas.ondragover = function () {
			// Needed for web browser compatibility
			return false;
		};
		viewport.canvas.ondrop = function(evt) {
			var files = evt.dataTransfer.files;
			self.loadLocalFile(files[0], opts);
			return false;
		};
	}

	function updateViewportIcon() {
		if (self.isDownloading) {
			viewport.showIcon('loading');
		} else if (!self.isRunning) {
			viewport.showIcon('play');
		} else {
			viewport.showIcon(null);
		}
	}


	/* == Keyboard control == */
	var kbd = JSSpeccy.Keyboard();
	self.deactivateKeyboard = function() {
		kbd.active = false;
	};
	self.activateKeyboard = function() {
		kbd.active = true;
	};

  self.keyboard = function() {
    return kbd;
  }
  self.setKeymap = function(keymap_str) {
    kbd.setKeymap(keymap_str);
  }; 
  
	/* == Audio == */
	var soundBackend = JSSpeccy.SoundBackend({debugPrint: opts.debugPrint, audioBufferSize: opts.audioBufferSize});
	self.onChangeAudioState = Event();
	self.getAudioState = function() {
		return soundBackend.isEnabled;
	};
	self.setAudioState = function(requestedState) {
		var originalState = soundBackend.isEnabled;
		var newState = soundBackend.setAudioState(requestedState);
		if (originalState != newState) self.onChangeAudioState.trigger(newState);
	};

	/* == Snapshot / Tape file handling == */
	self.loadLocalFile = function(file, opts) {
		var reader = new FileReader();
		self.isDownloading = true;
		updateViewportIcon();
		reader.onloadend = function() {
			self.isDownloading = false;
			updateViewportIcon();
			self.loadFile(file.name, this.result, opts);
		};
		reader.readAsArrayBuffer(file);
	};
	self.loadFromUrl = function(url, opts) {
		var request = new XMLHttpRequest();

		request.addEventListener('error', function(e) {
			alert('Error loading from URL: ' + url);
      self.isDownloading = false;
		  updateViewportIcon();
		});

		request.addEventListener('load', function(e) {
			const reader = new FileReader();
			reader.addEventListener('loadend', () => {
				self.loadFile(url, reader.result, opts);
			});
			reader.readAsArrayBuffer(request.response);
			self.isDownloading = false;
			updateViewportIcon();
			/* URL is not ideal for passing as the 'filename' argument - e.g. the file
			may be served through a server-side script with a non-indicative file
			extension - but it's better than nothing, and hopefully the heuristics
			in loadFile will figure out what it is either way.
			Ideally we'd look for a header like Content-Disposition for a better clue,
			but XHR (on Chrome at least) doesn't give us access to that. Grr. */
		});

		/* trigger XHR */
		request.open('GET', url, true);
		request.responseType = "blob";
		self.isDownloading = true;
		updateViewportIcon();
		request.send();
	};

	self.loadFile = function(name, data, opts) {
		if (!opts) opts = {};

		var fileType = 'unknown';
		
		if (name && name.match(/\.zip$/i)) {
			if (opts.debugPrint) {
				console.log("Zipped data ", data);
			}			
			var unzipper = new JSUnzip(new Uint8Array(data));
			if (opts.debugPrint) {
				console.log("Open ZIP file ", name);
			}
			if (unzipper.isZipFile()) {
				if (opts.debugPrint) {
					console.log("ZIP signature ok");
				}
				unzipper.readEntries();
				for (var entry of unzipper.entries) {
					if (opts.debugPrint) {
						console.log("ZIP entry ", entry.fileName, ", compression ", entry.compressionMethod);
					}					
					var uncompressed = (entry.compressionMethod === 0) ? entry.data : (entry.compressionMethod === 8) ? JSInflate.inflate(entry.data) : null;
					if (uncompressed) {
						if (self.loadFile(entry.fileName, new Uint8Array(uncompressed).buffer, opts)) {
							return true;
						}
					}
				}				
			}
			return false;
		}
		
		if (name && name.match(/\.sna$/i)) {
			fileType = 'sna';
		} else if (name && name.match(/\.tap$/i)) {
			fileType = 'tap';
		} else if (name && name.match(/\.tzx$/i)) {
			fileType = 'tzx';
		} else if (name && name.match(/\.z80$/i)) {
			fileType = 'z80';
		} else {
			var signatureBytes = new Uint8Array(data, 0, 8);
			var signature = String.fromCharCode.apply(null, signatureBytes);
			if (signature == "ZXTape!\x1A") {
				fileType = 'tzx';
			} else if (data.byteLength === 49179 || data.byteLength === 131103 || data.byteLength === 147487) {
				fileType = 'sna';
			} else if (JSSpeccy.TapFile.isValid(data)) {
				fileType = 'tap';
			}
		}

		if (opts.debugPrint) {
			console.log("File type is", fileType);
		}
		
		switch (fileType) {
			case 'sna':
				loadSnapshot(JSSpeccy.SnaFile(data));
				break;
			case 'z80':
				loadSnapshot(JSSpeccy.Z80File(data));
				break;
			case 'tap':
				loadTape(JSSpeccy.TapFile(data), opts);
				break;
			case 'tzx':
				loadTape(JSSpeccy.TzxFile(data), opts);
				break;
      default:
				if (opts.debugPrint) {
					console.log('Unknown type of file ' + name);
				}
				return false;
		}
		return true;
	};

	/* Load a snapshot from a snapshot object (i.e. JSSpeccy.SnaFile or JSSpeccy.Z80File) */
	function loadSnapshot(snapshot) {
		self.setModel(snapshot.model);
		self.reset(); /* required for the scenario that setModel does not change the current
			active machine, and current machine state would interfere with the snapshot loading -
			e.g. paging is locked */
		spectrum.loadSnapshot(snapshot);
		if (!self.isRunning) {
			spectrum.drawFullScreen();
		}
	}
	function loadTape(tape, opts) {
		if (!opts) opts = {};
		self.currentTape = tape;
		if (opts.autoload) {
			var snapshotBuffer = JSSpeccy.autoloaders[currentModel.tapeAutoloader].buffer;
			var snapshot = JSSpeccy.Z80File(snapshotBuffer);
			loadSnapshot(snapshot);
			if (tape.isTurbo()) tape.startTape();
		}
	}


	/* == Selecting Spectrum model == */
	self.onChangeModel = Event();
	self.getModel = function() {
		return currentModel;
	};
	self.setModel = function(newModel) {
		if (newModel != currentModel) {
			spectrum = JSSpeccy.Spectrum({
				viewport: viewport,
				keyboard: kbd,
				model: newModel,
				soundBackend: soundBackend,
				controller: self,
				border: ('border' in opts) ? opts.border : 4,
				collectOpcodesStats: opts.collectOpcodesStats,
				cpuFpsLimit: opts.cpuFpsLimit,
				debugPrint: opts.debugPrint
			});
			currentModel = newModel;
			self.onChangeModel.trigger(newModel);
			if (opts.debugPrint) {
				console.log("model is " + (currentModel == JSSpeccy.Spectrum.MODEL_128K ? "128k" : (currentModel == JSSpeccy.Spectrum.MODEL_48K ? "48k" : "unknown")));
			}
		}
	};

  var
    cpu_frame_count = 0,
    prev_timestamp = performance.now();  

  var cfps = opts.cpuFpsLimit;
	var last_cfps = cfps;
  self.getCfps = function() {
    return last_cfps;
  };

//  var nativeRequestAnimationFrame = window.requestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;
	const timer_interval = Math.ceil(1000.0 / opts.cpuFpsLimit);
  var timer_id = setInterval(
    function() {
      if (!self.isRunning) return;
      
      var timestamp = performance.now();
      if (cfps <= opts.cpuFpsLimit) {
        cpu_frame_count++;
        if (timestamp - prev_timestamp > 1000 - timer_interval/2) { // - timer_interval/2 is more precise
					while (cpu_frame_count < opts.cpuFpsLimit) { // make extra frames
						cpu_frame_count++;
						spectrum.runFrame();
					}
          last_cfps = cfps = 1000.0 * cpu_frame_count / (timestamp - prev_timestamp);
					if (opts.debugPrint) {
						console.log("Timer ticks", cpu_frame_count, "time", (timestamp - prev_timestamp).toFixed(2), "CPU FPS", cfps.toFixed(2)); 
					}
          prev_timestamp = timestamp;
          cpu_frame_count = 0;
        }
        spectrum.runFrame();
      }
      else {
        cfps--;
      }
    }
   , timer_interval);

	var load_on_start = "";
	self.setLoadUrlOnStart = function(url) {
		load_on_start = self.isRunning ? "" : url;
	}
	 
	var saved_audio_state = false;
	self.onStart = Event();
	self.start = function() {
		if (self.isRunning) {
			load_on_start = "";
			return;
		}
		self.isRunning = true;
		updateViewportIcon();
		self.onStart.trigger();
		self.setAudioState(saved_audio_state);
		if (load_on_start.length > 0) {
			self.loadFromUrl(load_on_start, {"autoload": true, 'debugPrint': opts.debugPrint});
		}
		load_on_start = "";
	};
	self.onStop = Event();
	self.stop = function() {
		if (self.isRunning) {
			saved_audio_state = self.getAudioState();
		}
		self.setAudioState(false);
		self.isRunning = false;
		updateViewportIcon();
		self.onStop.trigger();
		load_on_start = "";
	};
	self.reset = function() {
		spectrum.reset();
	};

	self.getFps = function() {
		return spectrum.getFps();
	};

	self.poke = function(addr, val) {
		return spectrum.poke(addr, val);
	};
	
	/* == Startup conditions == */
	self.setModel(JSSpeccy.Spectrum.MODEL_128K);

	if (opts.loadFile) {
		self.loadFromUrl(opts.loadFile, {'autoload': opts.autoload, 'debugPrint': opts.debugPrint});
	}

	if (!('audio' in opts) || opts['audio']) {
		self.setAudioState(true);
	} else {
		self.setAudioState(false);
	}

	saved_audio_state = self.getAudioState();
	if (!('autostart' in opts) || opts['autostart']) {
		saved_audio_state = self.getAudioState();
		self.start();
	} else {
		self.stop();
	}


	return self;
}
JSSpeccy.traps = {};
JSSpeccy.traps.tapeLoad = function() {
	/* will be overridden when a JSSpeccy.Spectrum object is initialised */
};
