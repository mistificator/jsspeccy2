JSSpeccy.UI = function(opts) {
	var self = {};

	var container = opts.container;
	if (typeof(container) === 'string') {
		container = document.getElementById(container);
	}
	var controller = opts.controller;

	var setInnerText;
	if (document.getElementsByTagName("body")[0].innerText !== undefined) {
		setInnerText = function (elem, text) {
			elem.innerText = text;
		};
	} else {
		setInnerText = function (elem, text) {
			elem.textContent = text;
		};
	}

	$(container).addClass('jsspeccy');

	/* Set up toolbar */
	var toolbar = $('.toolbar', container);

	var stopStartButton = $('button.stop-start', toolbar);
	stopStartButton.click(function() {
		if (controller.isRunning) {
			controller.stop();
		} else {
			controller.start();
		}
	});
	function refreshStopStartButton() {
		if (controller.isRunning) {
			stopStartButton.removeClass('start').addClass('stop');
		} else {
			stopStartButton.removeClass('stop').addClass('start');
		}
	}
	controller.onStart.bind(refreshStopStartButton);
	controller.onStop.bind(refreshStopStartButton);
	refreshStopStartButton();

	$('button.reset', toolbar).click(function() {
		controller.reset();
		controller.setKeymap("");
		$("#preinstalled-games").prop("selectedIndex", 0);
	});

	var audioButton = $('button.audio', toolbar);
	audioButton.click(function() {
		controller.setAudioState(!controller.getAudioState());
	});
	function refreshAudioButton(audioState) {
		audioButton.toggleClass('enabled', audioState);
	}
	controller.onChangeAudioState.bind(refreshAudioButton);
	refreshAudioButton(controller.getAudioState());

	$('button.open', toolbar).click(function() {
		showPanel('.open-file');
	});

	$('button.about', toolbar).click(function() {
		showPanel('.about');
	});

	$('button.joystick_keys', toolbar).click(function() {
		showPanel('.joystick_keys');
	});
	
	var fps_html = "<div>Video FPS: <span class=\"fps\">0.0</span></div><div>CPU FPS: <span class=\"cfps\">0.0</span></div>";
	$(".jsspeccy #jsspeccy-fps").html(fps_html);
	
	var checkUserAgent = function(what) {
		var deviceAgent = navigator.userAgent.toLowerCase();
		var deviceMatch = deviceAgent.match("(" + what + ")");
		return deviceMatch && Array.isArray(deviceMatch) && deviceMatch.length > 0;
	}
	
	var isSmartTV = checkUserAgent("webos");
	var isMobile = checkUserAgent("android|ios");
	$('button.deviceinfo', toolbar).click(function() {
		$('.panel.information #content').html(
				"<br/>Device information" + 
				"<p>User agent: " + navigator.userAgent + "</p>" +
				"<p>" + fps_html + "</p>" +
				"<p>Screen size: " + window.screen.width + "x" + window.screen.height + "</p>" +
				"<p>URL: " + document.URL + "</p>");
		showPanel('.information');
	});
	
	var isFullscreen = false;
	var disableFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msExitFullscreen || function() {};
	var fullscreenContext = document.documentElement;
	var enableFullscreen = fullscreenContext.requestFullscreen || fullscreenContext.webkitRequestFullscreen || fullscreenContext.mozRequestFullscreen || fullscreenContext.msRequestFullscreen || function() {};	
	var isFullscreenAvailable = !isSmartTV && (document.fullscreenEnabled || document.webkitFullscreenEnabled || document.webkitCancelFullScreen || document.mozFullscreenEnabled || document.msFullscreenEnabled);
	if (isFullscreenAvailable) {
		$('button.fullscreen', toolbar).click(function() {
			if (!isFullscreen) {
				enableFullscreen.call(fullscreenContext);
				isFullscreen = true;
			  } else {
				disableFullscreen.call(document); 
				isFullscreen = false;
			  }
		});		
	}
	else {
		$('button.fullscreen', toolbar).hide();
	}
	
	var selectModel = $('select.select-model', toolbar);
	$('select.select-model', toolbar).hide();
	var modelsById = {};
	for (var i = 0; i < JSSpeccy.Spectrum.MODELS.length; i++) {
		var model = JSSpeccy.Spectrum.MODELS[i];
		modelsById[model.id] = model;
		selectModel.append(
			$('<option></option>').text(model.name).attr({'value': model.id})
		);
	}
	selectModel.change(function() {
		var modelId = $(this).val();
		controller.setModel(modelsById[modelId]);
	});
	function refreshModel() {
		selectModel.val(controller.getModel().id);
	}
	refreshModel();
	controller.onChangeModel.bind(refreshModel);

	var autoloadTapes = $('input.autoload-tapes');
	$('input.autoload-tapes').parent().hide();

	/* Set up panels */
	var panels = [];

	function showPanel(selector) {
		$('.panel', container).not(selector).hide();
		$('.panel', container).filter(selector).show();
		controller.deactivateKeyboard();
	}

	function hidePanels() {
		$('.panel', container).hide();
		controller.activateKeyboard();
	}

	$('.panel button.close', container).click(function() {
		hidePanels();
	});

	var openFilePanel = $('.panel.open-file', container);

	var fileSelect = openFilePanel.find('input[type="file"]');
	fileSelect.change(function() {
		controller.loadLocalFile(this.files[0], {'autoload': autoloadTapes.is(':checked')});
		fileSelect.val('');
		hidePanels();
	});
	if (isSmartTV) {
		$(".jsspeccy #load_file").hide();
	}
	
	var urlField = openFilePanel.find('input[type="url"]');
	openFilePanel.find('button.open-url').click(function() {
		var url = urlField.val();
		if (url !== '') {
			controller.loadFromUrl(url, {'autoload': autoloadTapes.is(':checked')});
			hidePanels();
		}
	});
	
	const app_url = new URL(document.URL);
	const path_url = app_url.protocol + "//" + (app_url.host.length > 0 ? app_url.host + "/" : "") + app_url.pathname.substring(0, app_url.pathname.lastIndexOf('/'));
//	const downloads_path = "file:///media/internal/downloads"; 
	const usb_path = "file://usb:0/"; // first usb
	if (isSmartTV) {
		urlField.val(usb_path);	
	}
	else {
		urlField.val(path_url);	
	}
	
	var loadScript = function (url, callback) {
		var request = new XMLHttpRequest();
		request.addEventListener('load', function(e) {
			callback(request.response);
		});
		request.open('GET', url);
		request.send();
	}

	var addSelectEntry = function(data) {		
		var tapes = eval("(function() { return " + data + ";})()");
		for (var [key, value] of Object.entries(tapes)) {
			$("#preinstalled-games")
					.append($("<option></option>")
                    .attr("value", Object.keys(value)[0])
                    .attr("id", Object.values(value)[0])
                    .text(key)); 
		}	
	};
	
	self.loadPreinstalledGames = function() {
		(function() {
			$("#preinstalled-games")
			.empty()
			.append($("<option></option>")
	        .text("PLAY NOW")); 				
		})();
		loadScript("tapes.js?" + performance.now(), addSelectEntry);
		if (isSmartTV) {
			loadScript(usb_path + "tapes.js", addSelectEntry);
		}		
	};
	
	return self;
};
