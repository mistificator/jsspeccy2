// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// ==/ClosureCompiler==

var url_pars_list = [];
$.urlPar = function(key, val) {
	if (!val && !url_pars_list.includes(key)) {
		url_pars_list.push(key);
	}
	if (val) {
		var addr_url = new URL(document.URL);
		addr_url.searchParams.set(key, val);
		history.pushState({id: "homepage"}, document.title, document.URL = addr_url.toString());
	}
	else {
		return (new URL(document.URL)).searchParams.get(key);
	}
}

JSSpeccy.UI = function(opts) {
	var self = {};
	
	$.key_timeout = 50;

	var container = opts.container;
	if (typeof(container) === "string") {
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

	$(container).addClass("jsspeccy");
	
	var load_url = $.urlPar("load");
	if (load_url) {
		load_url = decodeURI(load_url).replace(opts.corsProxy, "");
		if (opts.debugPrint) {
			console.log("load url: ", load_url);
		}
		controller.stop();
		controller.setLoadUrlOnStart(opts.corsProxy + load_url);
	}	

	/* Set up toolbar */
	var toolbar = $(".toolbar", container);

	var stopStartButton = $("button.stop-start", toolbar);
	stopStartButton.click(function() {
		if (controller.isRunning) {
			controller.stop();
		} else {
			controller.start();
		}
	});
	function refreshStopStartButton() {
		if (controller.isRunning) {
			stopStartButton.removeClass("start").addClass("stop");
		} else {
			stopStartButton.removeClass("stop").addClass("start");
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
	
	$("button.reset", toolbar).click(function() {
		controller.reset();
		if (!controller.isRunning) {
			controller.setLoadUrlOnStart("");
			controller.start();
		}
		$("#catalogue").prop("selectedIndex", 0);
		$("#catalogue").trigger("change");
	});

	var toolbar_full = true;
	$("button.menu", toolbar).click(function() {
		if (toolbar_full) {
			$("li", toolbar).not(":first").hide();
			$(".toolbar-div").width($(".toolbar-div").height());
		}
		else {
			$(".toolbar-div").width("100%");
			$("li", toolbar).not(":first").show();
		}
		toolbar_full = !toolbar_full;
	});
	$("button.menu", toolbar).trigger("click");
	
	var audioButton = $("button.audio", toolbar);
	audioButton.click(function() {
		controller.setAudioState(!controller.getAudioState());
	});
	function refreshAudioButton(audioState) {
		audioButton.toggleClass("enabled", audioState);
	}
	controller.onChangeAudioState.bind(refreshAudioButton);
	refreshAudioButton(controller.getAudioState());

	$("button.open", toolbar).click(function() {
		controller.stop();
		showPanel(".open-file");
	});

	$("button.about", toolbar).click(function() {
		controller.stop();
		showPanel(".about");
	});

	$("button.joystick_keys", toolbar).click(function() {
		controller.stop();
		showPanel(".joystick_keys");
	});
	
	$("button.pokes", toolbar).click(function() {
		controller.stop();
		$("#error_text", pokesPanel).text("");
		showPanel(".pokes");

		selectPokes();
	});

	$("button.run", toolbar).click(function() {
		var url = $("#links").children(":selected").attr("href").replace(opts.corsProxy, "");
		hidePanels();
		controller.stop();
		controller.setLoadUrlOnStart(opts.corsProxy + url);
		controller.start();
		$.urlPar("load", url);
		load_url = null;
	});
	
	$("#links").change(function() {
		var url = $("#links").children(":selected").attr("href").replace(opts.corsProxy, "");
		hidePanels();
		if (!load_url) {
			if (!controller.isRunning) {
				controller.setLoadUrlOnStart(opts.corsProxy + url);
			}
		}
		urlField.val(url);
		$.urlPar("load", url);
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
  var isWindows = (os.name == "Windows") || $.urlPar("is_windows") === "on";
  var isLinux = (os.name == "Linux") || $.urlPar("is_linux") === "on";
	var isSmartTV = (os.name == "webOS") || $.urlPar("is_smarttv") === "on";
	var isMobile = (os.name == "Android") || $.urlPar("is_mobile") === "on";
	$("button.deviceinfo", toolbar).click(function() {
		$(".panel.information #content").html(
				"<br/>Device information" + 
				"<p>User agent: " + navigator.userAgent + "</p>" +
				"<p>" + fps_html + "</p>" +
				"<p>Screen size: " + window.screen.width + "x" + window.screen.height + "<br/>" +
				"Device pixel ratio: " + window.devicePixelRatio + "</p>" +
				"<p>URL: " + document.URL + "</p>" + 
        "<p>Platform: " + (isSmartTV ? "SmartTV" : (isMobile ? "Mobile" : (isWindows ? "Windows" : (isLinux ? "Linux" : "Unknown")))) + "</p>" +
        "<p>OS: " + os.name + " " + os.version + "</p>"
        );
		showPanel(".information");
	});   

	var isFullscreen = false;
	var disableFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || document.msExitFullscreen || function() {};
	var fullscreenContext = document.documentElement;
	var enableFullscreen = fullscreenContext.requestFullscreen || fullscreenContext.webkitRequestFullscreen || fullscreenContext.mozRequestFullscreen || fullscreenContext.msRequestFullscreen || function() {};	
	var isFullscreenAvailable = !isSmartTV && $.urlPar("always_fullscreen") !== "on" && (document.fullscreenEnabled || document.webkitFullscreenEnabled || document.webkitCancelFullScreen || document.mozFullscreenEnabled || document.msFullscreenEnabled);
	if (isFullscreenAvailable) {
		$("button.fullscreen", toolbar).click(function() {
			if (!isFullscreen) {
				enableFullscreen.call(fullscreenContext);
				isFullscreen = true;
				if (toolbar_full) {
					$("button.menu", toolbar).trigger("click");
				}
			} else {
				disableFullscreen.call(document); 
				isFullscreen = false;
			}
		});		
	}
	else {
		$("button.fullscreen", toolbar).hide();
	}
	
	/* // remap joystick is always ok =)
  if (!isMobile && !isSmartTV && $.urlPar("joystick_keys") !== "on") {
		$("button.joystick_keys", toolbar).hide();
	}
	*/
	var selectModel = $("select.select-model", toolbar);
	$("select.select-model", toolbar).hide();
	var modelsById = {};
	for (var i = 0; i < JSSpeccy.Spectrum.MODELS.length; i++) {
		var model = JSSpeccy.Spectrum.MODELS[i];
		modelsById[model.id] = model;
		selectModel.append(
			$("<option></option>").text(model.name).attr({"value": model.id})
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

	var autoloadTapes = $("input.autoload-tapes");
	$("input.autoload-tapes").parent().hide();

	var checkerboardFilterCheckbox = $("input.checkerboard-filter");
	function reflectCheckerboardFilter(val) {
		if (val) {
			checkerboardFilterCheckbox.attr("checked", true);
			$(container).addClass("hard-edged-pixels");
		} else {
			checkerboardFilterCheckbox.removeAttr("checked");
			$(container).removeClass("hard-edged-pixels");
		}
	}
	reflectCheckerboardFilter(controller.settings.checkerboardFilter.get());
	controller.settings.checkerboardFilter.onChange.bind(reflectCheckerboardFilter);
	checkerboardFilterCheckbox.change(function() {
		controller.settings.checkerboardFilter.set(
			checkerboardFilterCheckbox.is(":checked")
		);
	});
	checkerboardFilterCheckbox.attr("checked", $.urlPar("hq2x") === "on");
	
	/* Set up panels */
	var panels = [];

	function showPanel(selector) {
		$(".panel", container).hide();
		$(".panel", container).filter(selector).show();
		controller.deactivateKeyboard();
	}

	function hidePanels() {
		$(".panel", container).hide();
		controller.activateKeyboard();
	}

	$(".panel button.close", container).click(function() {
		hidePanels();
	});

	var openFilePanel = $(".panel.open-file", container);
	var fileSelect = openFilePanel.find("input[type='file']");
	fileSelect.change(function() {
		hidePanels();
		controller.stop();
		controller.loadLocalFile(this.files[0], {"autoload": autoloadTapes.is(":checked"), "debugPrint": opts.debugPrint});
		fileSelect.val("");
	});
	if (isSmartTV && $.urlPar("load_file") !== "on") {
		$("#load_file", container).hide();
	}
	if (isSmartTV && $.urlPar("save_file") !== "on") {
		$("#save_file", container).hide();
	}
	
	var urlField = openFilePanel.find("input[type='url']");
	openFilePanel.find("button.open-url").click(function() {
		var url = urlField.val();
		if (url !== "") {
			hidePanels();
			controller.stop();
			controller.setLoadUrlOnStart(opts.corsProxy + url);
			controller.start();
			$.urlPar("load", url);
		}
	});
	openFilePanel.find("button.save-file").click(function() {
		var filename = $("#index option:selected").text();
		if (filename.length == 0 || filename == "-") {
			filename = "snapshot_" + (new Date(Date.now())).toISOString().replace(/[\:\.\-\T\Z]+/g, "_"); 
		}
		if (filename !== "") {
			controller.stop();
			controller.saveZ80Snapshot(filename.replace(/[\s]+/g, "_") + ".z80");
			hidePanels();
		}
	});
	
	var pokesPanel = $(".panel.pokes", container);
	pokesPanel.find("button.apply_pokes").click(function () {
		var poke = pokesPanel.find("input[type='text']");
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
	
	function selectPokes() {
		var pokes_textarea = $(pokesPanel.find("textarea")[0]);
		var pokes_text = pokes_textarea.val();
		var title = $("#index option:selected").text().toUpperCase().trim();
		if (title.indexOf(" 1") == title.length - 2) {
			title = title.slice(0, title.length - 2);
		}
		if (title.indexOf(".") > 0 && parseInt(title.slice(0, title.indexOf("."))) > 0) {
			title = title.slice(title.indexOf(".") + 1);
		}
		var position = pokes_text.indexOf(title);
		if (position < 0) {
			if (title.indexOf(" 2") > 0) {
				title = title.replace(" 2", " II");
			}
			position = pokes_text.indexOf(title);
		}
		if (position >= 0) {
			if (pokes_text.indexOf(" ", position + title.length + 1) > 0) {
				var pokes_str = pokes_text.slice(position + title.length, pokes_text.indexOf(" ", position + title.length + 1)).trim();
				pokesPanel.find("input[type='text']").val(pokes_str);
			}
			pokes_textarea[0].setSelectionRange(position, position);
			pokes_textarea.blur();
			pokes_textarea.focus();
			pokes_textarea[0].setSelectionRange(position, position + title.length);
		}	
	}
	
	const app_url = new URL(document.URL);
	const path_url = app_url.protocol + "//" + (app_url.host.length > 0 ? app_url.host + "/" : "") + app_url.pathname.substring(0, app_url.pathname.lastIndexOf("/"));
//	const downloads_path = "file:///media/internal/downloads"; 
	const usb_path = "file://usb:0/"; // first usb
	if (isSmartTV) {
		urlField.val(usb_path);	
	}
	else {
		urlField.val(path_url.replace(opts.corsProxy, ""));	
	}

  /* Pokes */
	var loadResource = function (url, callback) {
		var request = new XMLHttpRequest();
		request.addEventListener("load", function(e) {
			callback(request.response);
		});
		request.open("GET", url);
		request.send();
	}
 
	loadResource("zx_spectrum_pokes.txt", function(text) {
		pokesPanel.find("textarea").val(text);
	});
	
  /* Padblock routines */
  function addKeySelect(id, code, label, initial) {
      var opt = document.createElement("option")
      opt.appendChild(document.createTextNode(label));
      opt.value = code;
      if (label == initial) opt.selected = true;
      document.getElementById(id).appendChild(opt);
  }
  function populateJoystickKeySelect(id, initial) {
      document.getElementById(id).innerHTML = "";
      addKeySelect(id, 38, "\u2191", initial);
      addKeySelect(id, 40, "\u2193", initial);
      addKeySelect(id, 37, "\u2190", initial);
      addKeySelect(id, 39, "\u2192", initial);
      addKeySelect(id, 32, "Space", initial);
      addKeySelect(id, 13, "Enter", initial);
      addKeySelect(id, 17, "Symbol Shift", initial);
      for (i = 48; i < 58; i++) {
          addKeySelect(id, i, String.fromCharCode(i), initial);
      }
      for (i = 65; i < 91; i++) {
          addKeySelect(id, i, String.fromCharCode(i), initial);
      }
  }
  $.setJoystick = function(keys) {
      var keysarr = keys.split(",");
      up = keysarr[0];
      down = keysarr[1];
      left = keysarr[2];
      right = keysarr[3];
      fire = keysarr[4];
      action = keysarr[5];
      populateJoystickKeySelect("select_key_up", up);
      populateJoystickKeySelect("select_key_down", down);
      populateJoystickKeySelect("select_key_left", left);
      populateJoystickKeySelect("select_key_right", right);
      populateJoystickKeySelect("select_key_fire", fire);
      populateJoystickKeySelect("select_key_action", action);		
		if (isSmartTV) {
			controller.setKeymap(keys);
  }      
  }      
  $.setJoystick(document.getElementById("selcontrol").value); 
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

  if (!isMobile && $.urlPar("padblock") !== "on") {
    $(".padblock", container).hide();
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
          saved_padblock_visibility = $(".padblock", container).is(":visible");
          $(".padblock", container).hide();
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
        $(".padblock", container).show();
      }
      controller.keyboard().active = true;
  });

  if (!isSmartTV && !isMobile && $.urlPar("typer") !== "on") {
    $("#typer-div", container).hide();
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
  
	if (opts.debugPrint) {
		console.log("URL keys: ", url_pars_list);
	}
	else {
		$(document).bind("contextmenu", function (e) {
			if ($(container).find($(e.target)).length > 0 && $(e.target).is("canvas")) {
				console.log($(container).find($(e.target)));
				e.preventDefault();
			}
		});	
	}
	
	if (isSmartTV) { // ignore autostart: false on SmartTV
		setTimeout(function() {
			controller.start();
		}, 0);
	}
	
	var cat_containers = ["#catalogue", "#letter", "#index", "#links"];
	(new DummyCat()).init(...cat_containers);
	(new ZxCzCat(opts.cors_proxy)).init(...cat_containers);
	(new Rgb2019Cat(opts.cors_proxy)).init(...cat_containers);
	(new WoSCat(opts.cors_proxy)).init(...cat_containers); 
	(new ArchCat(opts.cors_proxy)).init(...cat_containers);	
	
	return self;
};
