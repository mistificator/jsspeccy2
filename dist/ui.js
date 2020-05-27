JSSpeccy.UI = function(opts) {
	var self = {};
	
	$.key_timeout = 50;

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
	
	var url_pars_list = [];
	function urlPar(key) {
		if (!url_pars_list.includes(key)) {
			url_pars_list.push(key);
		}
		return (new URL(document.URL)).searchParams.get(key);
	}

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

	document.addEventListener("visibilitychange", function() {
		if (document.hidden && controller.isRunning) {
			controller.stop();
		}
	}, false);
	
	$('button.reset', toolbar).click(function() {
		controller.reset();
//		$("#preinstalled-games", toolbar).prop("selectedIndex", 0);
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
		controller.stop();
		showPanel('.open-file');
	});

	$('button.about', toolbar).click(function() {
		controller.stop();
		showPanel('.about');
	});

	$('button.joystick_keys', toolbar).click(function() {
		controller.stop();
		showPanel('.joystick_keys');
	});
	
	$('button.pokes', toolbar).click(function() {
		controller.stop();
		$("#error_text", pokesPanel).text("");
		showPanel('.pokes');
	});

	$('button.run', toolbar).click(function() {
		controller.loadFromUrl($("#links").children(":selected").attr("href"), {"autoload": true, 'debugPrint': opts.debugPrint});
		hidePanels();
		controller.start();
	});
	
	var fps_html = "<div>Video FPS: <span class=\"fps\">0.0</span></div><div>CPU FPS: <span class=\"cfps\">0.0</span></div>";
	$("#jsspeccy-fps", container).html(fps_html);
	
  function checkUserAgent() {
    var ua = navigator.userAgent.toLowerCase(), os = {},
    android = ua.match(/(android)\s+([\d.]+)/),
    iphone = ua.match(/(iphone\sos)\s([\d_]+)/),
    ipad = ua.match(/(ipad).*os\s([\d_]+)/),
    webos = ua.match(/(web[o0]s)/), // 0! Crazy bastards.
    windows = ua.match(/(windows)\D+([\d.]+)/),
    linux = ua.match(/(linux)\s+([\d.]+)/),
    not_detected = ua.match(/\((\w+)\;/);

    if (android) os.name = "Android", os.version = android[2] || "";
    else
    if (iphone) os.name = "iOS", os.version = iphone[2].replace(/_/g, ".") || "";
    else
    if (ipad) os.name = "iOS", os.version = ipad[2].replace(/_/g, ".") || "";
    else
    if (webos) os.name = "webOS", os.version = "";
    else
    if (windows) os.name = "Windows", os.version = windows[2] || "";
    else
    if (linux) os.name = "Linux", os.version = linux[2] || "";
    else
      os.name = (not_detected ? not_detected[1] : "Not detected"), os.version = "";
    
    return os;
  }  

  var os = checkUserAgent();
  var isWindows = (os.name == "Windows") || urlPar("is_windows") === "on";
  var isLinux = (os.name == "Linux") || urlPar("is_linux") === "on";
	var isSmartTV = (os.name == "webOS") || urlPar("is_smarttv") === "on";
	var isMobile = (os.name == "Android") || urlPar("is_mobile") === "on";
	$('button.deviceinfo', toolbar).click(function() {
		$('.panel.information #content').html(
				"<br/>Device information" + 
				"<p>User agent: " + navigator.userAgent + "</p>" +
				"<p>" + fps_html + "</p>" +
				"<p>Screen size: " + window.screen.width + "x" + window.screen.height + "<br/>" +
				"Device pixel ratio: " + window.devicePixelRatio + "</p>" +
				"<p>URL: " + document.URL + "</p>" + 
        "<p>Platform: " + (isSmartTV ? "SmartTV" : (isMobile ? "Mobile" : (isWindows ? "Windows" : (isLinux ? "Linux" : "Unknown")))) + "</p>" +
        "<p>OS: " + os.name + " " + os.version + "</p>"
        );
		showPanel('.information');
	});   

	var isFullscreen = false;
	var disableFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msExitFullscreen || function() {};
	var fullscreenContext = document.documentElement;
	var enableFullscreen = fullscreenContext.requestFullscreen || fullscreenContext.webkitRequestFullscreen || fullscreenContext.mozRequestFullscreen || fullscreenContext.msRequestFullscreen || function() {};	
	var isFullscreenAvailable = !isSmartTV && urlPar("always_fullscreen") !== "on" && (document.fullscreenEnabled || document.webkitFullscreenEnabled || document.webkitCancelFullScreen || document.mozFullscreenEnabled || document.msFullscreenEnabled);
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
	
  if (!isMobile && !isSmartTV && urlPar("joystick_keys") !== "on") {
		$('button.joystick_keys', toolbar).hide();
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
		$('.panel', container).hide();
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
		controller.loadLocalFile(this.files[0], {'autoload': autoloadTapes.is(':checked'), 'debugPrint': opts.debugPrint});
		fileSelect.val('');
		hidePanels();
	});
	if (isSmartTV && urlPar("load_file") !== "on") {
		$("#load_file", container).hide();
	}
	
	var urlField = openFilePanel.find('input[type="url"]');
	openFilePanel.find('button.open-url').click(function() {
		var url = urlField.val();
		if (url !== '') {
			controller.loadFromUrl(url, {'autoload': autoloadTapes.is(':checked'), 'debugPrint': opts.debugPrint});
			hidePanels();
		}
	});
	
	var pokesPanel = $('.panel.pokes', container);
	pokesPanel.find("button.apply_pokes").click(function () {
		var poke = pokesPanel.find('input[type="text"]');
		var str = poke.val();
		var ok = true;
		if (str !== "") {
		  for (var substr of str.split(":")) {
				var addr, val;
				[addr, val] = substr.split(",").map(Number);;
				if (opts.debugPrint) {
					console.log("Poke ", addr, " ", val);
				}
				if (addr >= 16384 && addr < 65536 && val >= 0 && val < 256) {
					controller.poke(addr, val);
				}
				else {
					$("#error_text", pokesPanel).text("Addresses or values are wrong");
					ok = false;
					break;
				}
			}
		}
		else {
			$("#error_text", pokesPanel).text("Pokes string is empty");
			ok = false;
		}
		if (ok) {
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

  /* Preinstalled games routines */
	var loadResource = function (url, callback) {
		var request = new XMLHttpRequest();
		request.addEventListener('load', function(e) {
			callback(request.response);
		});
		request.open('GET', url);
		request.send();
	}

	/*
	var addSelectEntry = function(data) {		
		var tapes = eval("(function() { return " + data + ";})()");
		for (var [key, value] of Object.entries(tapes)) {
			$("#preinstalled-games", toolbar)
					.append($("<option></option>")
                    .attr("value", Object.keys(value)[0])
                    .attr("id", isSmartTV ? Object.values(value)[0] : "")
                    .text(key)); 
		}	
	};
	
	self.loadPreinstalledGames = function() {
		(function() {
			$("#preinstalled-games", container)
			.empty()
			.append($("<option></option>")
	        .text("PLAY NOW")); 
		})();
		loadResource("tapes.js?" + performance.now(), addSelectEntry);
	};
	
  $("#preinstalled-games", toolbar).change(function() {
    if ($("#preinstalled-games", toolbar).prop('selectedIndex') === 0) {
      $('button.reset', toolbar).click();
      return;
    }
    var filename = $(this).val();
    if (filename) {
      controller.loadFromUrl(
        filename,
        {"autoload": true, 'debugPrint': opts.debugPrint}
      );
//      controller.setKeymap($(this).children(":selected").attr("id") || "");
    }
  });
	*/
  
	loadResource("zx_spectrum_pokes.txt", function(text) {
		pokesPanel.find("textarea").val(text);
	});
	
  /* Padblock routines */
  function addKeySelect(id, code, label, initial) {
      var opt = document.createElement('option')
      opt.appendChild(document.createTextNode(label));
      opt.value = code;
      if (label == initial) opt.selected = true;
      document.getElementById(id).appendChild(opt);
  }
  function populateJoystickKeySelect(id, initial) {
      document.getElementById(id).innerHTML = '';
      addKeySelect(id, 38, '\u2191', initial);
      addKeySelect(id, 40, '\u2193', initial);
      addKeySelect(id, 37, '\u2190', initial);
      addKeySelect(id, 39, '\u2192', initial);
      addKeySelect(id, 32, 'Space', initial);
      addKeySelect(id, 13, 'Enter', initial);
      addKeySelect(id, 17, 'Symbol Shift', initial);
      for (i = 48; i < 58; i++) {
          addKeySelect(id, i, String.fromCharCode(i), initial);
      }
      for (i = 65; i < 91; i++) {
          addKeySelect(id, i, String.fromCharCode(i), initial);
      }
  }
  $.setJoystick = function(keys) {
      var keysarr = keys.split(',');
      up = keysarr[0];
      down = keysarr[1];
      left = keysarr[2];
      right = keysarr[3];
      fire = keysarr[4];
      action = keysarr[5];
      populateJoystickKeySelect('select_key_up', up);
      populateJoystickKeySelect('select_key_down', down);
      populateJoystickKeySelect('select_key_left', left);
      populateJoystickKeySelect('select_key_right', right);
      populateJoystickKeySelect('select_key_fire', fire);
      populateJoystickKeySelect('select_key_action', action);		
		if (isSmartTV) {
			controller.setKeymap(keys);
  }      
  }      
  $.setJoystick(document.getElementById('selcontrol').value); 
	$.prev_keyupdown_time = performance.now();
  $.padTouch = function(selectId,obj) {
      var select = document.getElementById(selectId);
      var opt = select.options[select.selectedIndex];
			setTimeout(function() {
				controller.keyboard().registerKeyDown(opt.value);
			}, Math.max($.key_timeout - (performance.now() - $.prev_keyupdown_time), 0));
			$.prev_keyupdown_time = performance.now();
  }
  $.padUntouch = function(selectId,obj) {
      var select = document.getElementById(selectId);
      var opt = select.options[select.selectedIndex];
			setTimeout(function() {
				controller.keyboard().registerKeyUp(opt.value);
			}, Math.max($.key_timeout - (performance.now() - $.prev_keyupdown_time), 0));
			$.prev_keyupdown_time = performance.now();
  }

  if (!isMobile && urlPar("padblock") !== "on") {
    $('.padblock', container).hide();
  }
    
  /* On-screen keyboard routines */
  var saved_keypress = document.onkeypress;
  var saved_padblock_visibility = false;
  $("#typer", container).click(function() {
      if (controller.keyboard().active) {
					if (opts.debugPrint) {
						console.log("focus in on-screen keyboard");
					}
          saved_keypress = document.onkeypress;
          document.onkeypress = function() { return true; }
          saved_padblock_visibility = $('.padblock', container).is(":visible");
          $('.padblock', container).hide();
          controller.keyboard().active = false;
          $("#typer", container).focus();
      }
      else {
          $("#typer", container).blur();
      }
  });
  const android_keydown_code = 0xE5;
  var keydown_code = android_keydown_code;
  function downUp(code, printable) {
		if (opts.debugPrint) {
			console.log(printable + " " + code);
		}
    controller.keyboard().registerKeyDown(code);
    setTimeout(function() { controller.keyboard().registerKeyUp(code); $("#typer", container).val(printable.length == 1 ? printable : ""); }, $.key_timeout);  
  }
  $("#typer", container).keydown(function(e) {
      keydown_code = e.keyCode;
      if (keydown_code !== android_keydown_code) {
        downUp(keydown_code, e.key);
      }
  });
  $("#typer", container).on("input", function(e) {
    if (keydown_code === android_keydown_code) {
      keydown_code = e.target.value.toUpperCase().charCodeAt(e.target.value.length - 1);
      downUp(keydown_code, e.target.value);
    }
    else {
      keydown_code = android_keydown_code;
    }
  });
  $("#typer", container).focusout(function() {
			if (opts.debugPrint) {
				console.log("focus out on-screen keyboard");
			}
      $("#typer", container).val("");
      document.onkeypress = saved_keypress;
      if (saved_padblock_visibility) {
        $('.padblock', container).show();
      }
      controller.keyboard().active = true;
  });

  if (!isSmartTV && !isMobile && urlPar("typer") !== "on") {
    $('#typer-div', container).hide();
  }  
  
  /* webOS virtual keyboard management */
  if (isSmartTV) {
    document.addEventListener("keyboardStateChange", function() {
      var visibility = event.detail.visibility;
      if (!visibility) {
        $("#typer", container).blur();
      }
    });  
    document.addEventListener("keydown", function(e) {
      console.log(e.key + " " + e.keyCode);
      if (e.keyCode == controller.keyboard().TV_Blue) {// LG remote blue button
        $("#typer", container).click();
      }
      if (e.keyCode == controller.keyboard().TV_Back) {// LG remote back button
        $("#typer", container).blur();
      }
    });  
  }
  
  /* FPS update */
  setInterval(function() {
      $(".fps").text(controller.getFps().toFixed(1));
      $(".cfps").text(controller.getCfps().toFixed(1));
  }, 1000);      

  /* Kill back button */
  history.pushState(null, null, location.href);
  window.onpopstate = function () {
      history.go(1);
      $("#typer", container).blur();
  };
  
	var load_url = urlPar("load");
	if (load_url) {
	  setTimeout(function() {
			load_url = decodeURI(load_url);
			if (opts.debugPrint) {
				console.log("load url: ", load_url);
			}
			controller.loadFromUrl(load_url, {'autoload': autoloadTapes.is(':checked'), 'debugPrint': opts.debugPrint});
		}, 0);
	}

	if (opts.debugPrint) {
		console.log("URL keys: ", url_pars_list);
	}	

	if (isSmartTV) { // ignore autostart: false on SmartTV
		setTimeout(function() {
			controller.start();
		}, 0);
	}
	
	return self;
};
