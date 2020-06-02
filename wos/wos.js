// from https://stackoverflow.com/questions/2686855/is-there-a-javascript-function-that-can-pad-a-string-to-get-to-a-determined-leng
/*
String.prototype.padStart = String.prototype.padStart || function (targetLength, padString) {
	var paddingValue = "";
	for (var i = 0; i < targetLength; i++) paddingValue += (padString.toString() || " ");
	return String(paddingValue + this).slice(- paddingValue.length);
};
*/
	
function WoS() {
	var self = {};

	self.cors_proxy = "https://non-cors.herokuapp.com/";
	self.wos_base = "https://www.worldofspectrum.org";
	self.wos_search = "/infoseekid.cgi%3Fid=";
	self.wos_index = "/games/";
	self.wos_top100 = "/bestgames.html";
	
	var loadResource = function (url) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url);
			xhr.onload = function() { if (xhr.status == 200) resolve(xhr.responseText); else reject(xhr.responseStatus); }
			xhr.onerror = function() { reject(xhr.responseStatus); }
			xhr.send();
		});
	}
	
	self.getIndex = async function(letter) {
		if (letter == "#") {
			letter = "1";
		}
		var str = letter != "-" ? await loadResource(self.cors_proxy + self.wos_base + self.wos_index + letter.toLowerCase() + ".html") : await loadResource(self.cors_proxy + self.wos_base + self.wos_top100);
		var html = $.parseHTML(str);
		var out = [];
		if (letter != "-") {
			$("pre", html).each(function(i, el) {
				var n = 0;
				for (var a of $("a", el)) {
					out.push({title: (++n).toString() + "." + $(a).text(), catalogue_url: self.cors_proxy + self.wos_base + ($(a).attr("href")).split("?").join("%3F")});
				}
			});
		}
		else {
			$("table", html).each(function(i, el) {
				var score_label = $("tr:contains('Score')", el);
				if (score_label.length) {
					var n = 0;
					for (var a of $("a", el)) {
						out.push({title: (++n).toString() + "." + $(a).text(), catalogue_url: self.cors_proxy + self.wos_base + ($(a).attr("href")).split("?").join("%3F")});
					}
				}
			});
		}
		return new Promise((resolve) => { resolve(out); });
	}
	
	self.getLinks = async function(catalogue_url) {
		var str = await loadResource(catalogue_url);
		var html = $.parseHTML(str);	
		var tapes_links = [];
		$("table", html).each(function(i, el) {
			var filename_label = $("tr:contains('Filename')", el);
			if (filename_label.length) {			
				var index = $("td:contains('Filename')", filename_label).index();
				for (var tr of filename_label.siblings()) {
					var href = $("a", $("td:eq(" + index + ")", tr)).attr("href");
					if (!href) {
						continue;
					}
					var href_parts = href.split(".");
					var ext = href_parts.pop().toUpperCase();
					if (ext == "ZIP") {
						ext = href_parts.pop().toUpperCase();
					}
					if (ext != "TZX" && ext != "TAP" && ext != "Z80" && ext != "SNA") {
						continue;
					}
					if (ext == "TAP") {
						tapes_links.unshift(self.cors_proxy + self.wos_base + href);
					}
					else {
						tapes_links.push(self.cors_proxy + self.wos_base + href);
					}
				}
				return false; // break
			}
		});
		return new Promise((resolve) => { resolve(tapes_links); });
	}

	var is_wos_catalogue = false;
	self.init = function(catalogue_container, letter_container, index_container, links_container) {
		var count = $(catalogue_container + " option", ).length;
		$(catalogue_container).append($("<option></option>").text('TOP-100 - WorldOfSpectrum.org TOP-100'));
		$(catalogue_container).append($("<option></option>").text('WoS All - WorldOfSpectrum.org full catalogue'));
		
		$(catalogue_container).change(function() {
			is_wos_catalogue = false;
			switch ($(catalogue_container + " option:selected").index() - count) {
				case 0: // top-100
					is_wos_catalogue = true;
					$(letter_container).empty();
					$(letter_container).append($("<option></option>").text('-'));
					$(letter_container).trigger("change");
					break;
				case 1: // full catalogue
					is_wos_catalogue = true;
					$(letter_container).empty();
					for (var c = ("A").charCodeAt(0); c <= ("Z").charCodeAt(0); c++) {
						$(letter_container).append($("<option></option>").text(String.fromCharCode(c)));
					}
					$(letter_container).append($("<option></option>").text('#'));
					$(letter_container).trigger("change");
					break;
			}
		});		

		$(letter_container).change(function() {
			if (!is_wos_catalogue) {
				return;
			}
			$(index_container).empty();
			self.getIndex($(letter_container + " option:selected").html()).then(function(index) {
				for (var i of index) {
					var opt = $("<option></option>");
					opt.text(i.title);
					opt.attr("href", i.catalogue_url);
					$(index_container).append(opt);
				}
				$(index_container).trigger("change");
			});	
		});
		
		$(index_container).change(function() {
			if (!is_wos_catalogue) {
				return;
			}		
			$(links_container).empty();
			self.getLinks($(index_container + " option:selected").attr("href")).then(function(links) {
				for (var i = 0; i < links.length; i++) {
					var opt = $("<option></option>");
					opt.text((i + 1).toString() + "." + links[i].slice(links[i].lastIndexOf("/") + 1));
					opt.attr("href", links[i]);
					$(links_container).append(opt);
				}
				$(links_container).trigger("change");
			});	
		});
		
		if (count == 0) {
			$(catalogue_container).trigger("change");
		}
	}
	
	return self;
};
