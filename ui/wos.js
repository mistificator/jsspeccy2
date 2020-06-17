// from https://stackoverflow.com/questions/2686855/is-there-a-javascript-function-that-can-pad-a-string-to-get-to-a-determined-leng
/*
String.prototype.padStart = String.prototype.padStart || function (targetLength, padString) {
	var paddingValue = "";
	for (var i = 0; i < targetLength; i++) paddingValue += (padString.toString() || " ");
	return String(paddingValue + this).slice(- paddingValue.length);
};
*/
	
function WoSCat(cors_proxy) {
	var self = {};

	self.cors_proxy = cors_proxy || "https://non-cors.herokuapp.com/";
	self.wos_base = "https://www.worldofspectrum.org";
	self.wos_csv = "/software/software_export?";
	self.wos_index = "/archive/software/games/";
	self.wos_storage = "WoS_CSV";
	
	var loadResource = function (url) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			xhr.onload = function() { if (xhr.status == 200) resolve(xhr.responseText); else reject(xhr.responseStatus); }
			xhr.onerror = function() { reject(xhr.responseStatus); }
			xhr.send();
		});
	}
	
	var csv_index = JSON.parse(localStorage.getItem(self.wos_storage));
	self.getCSV = async function() {
		var csv_str = await loadResource(self.cors_proxy + self.wos_base + self.wos_csv);
		var out = {};
		var newline_index = 0, next_newline_index = csv_str.indexOf("\n", newline_index + 1);
		newline_index = next_newline_index; next_newline_index = csv_str.indexOf("\n", newline_index + 1); // skip horizontal header
		while (next_newline_index > 0) {
			var line = csv_str.substring(newline_index + 1, next_newline_index).trim();
			var splitted_line = line.split(",", 4);
			if (splitted_line[2] && splitted_line[3]) {
				var str_no_quotes = splitted_line[2].replace(/['"]+/g, "");
				str_no_quotes = str_no_quotes.replace(/^./, str_no_quotes.charAt(0).toUpperCase());
				out["\"" + str_no_quotes + "\""] = splitted_line[3];
			}
			newline_index = next_newline_index;
			next_newline_index = csv_str.indexOf("\n", newline_index + 1);
		} 
		var sorted_out = {};
		Object.keys(out).sort().forEach(function(key) {
			sorted_out[key] = out[key];
		});		
		return new Promise((resolve) => { resolve(sorted_out); });
	}
	
	self.getIndex = async function(letter) {
		var out = [];
		var n = 0;
		Object.keys(csv_index).forEach(function(key) {
			if (key.charAt(1).toUpperCase() == letter) {
				out.push({
					title: (++n).toString() + "." + key.replace(/['"]+/g, ""), 
					catalogue_url: self.cors_proxy + self.wos_base + self.wos_index + csv_index[key]
				});
			}
		});
		return new Promise((resolve) => { resolve(out); });
	}
	
	self.getLinks = async function(catalogue_url) {
		var str = await loadResource(catalogue_url);
		var html = $.parseHTML(str);	
		var tapes_links = [];
		var table = $("h3:hidden", html).first().siblings("table").first(); // wtf?
		$("tr", table).each(function(i, el) {
			if (i == 0) {
				return true;
			}
			var href = $("a", $("td:eq(1)", el)).attr("href");
			if (!href) {
				return true;
			}
			var href_parts = href.split(".");
			var ext = href_parts.pop().toUpperCase();
			if (ext == "ZIP") {
				ext = href_parts.pop().toUpperCase();
			}
			if (ext != "TZX" && ext != "TAP" && ext != "Z80" && ext != "SNA") {
				return true;
			}
			if (ext == "TAP") {
				tapes_links.unshift(self.cors_proxy + href);
			}
			else {
				tapes_links.push(self.cors_proxy + href);
			}			
		});
		return new Promise((resolve) => { resolve(tapes_links); });
	}

	var is_wos_catalogue = false;
	self.init = function(catalogue_container, letter_container, index_container, links_container) {
		var count = $(catalogue_container + " option").length;
		$(catalogue_container).append($("<option></option>").text('WoS - WorldOfSpectrum.org full catalogue'));
		$(catalogue_container).change(function() {
			is_wos_catalogue = false;
			switch ($(catalogue_container + " option:selected").index() - count) {
				case 0: // full catalogue
					is_wos_catalogue = true;
					$(letter_container).empty();
					for (var c = ("A").charCodeAt(0); c <= ("Z").charCodeAt(0); c++) {
						$(letter_container).append($("<option></option>").text(String.fromCharCode(c)));
					}
					for (var c = ("0").charCodeAt(0); c <= ("9").charCodeAt(0); c++) {
						$(letter_container).append($("<option></option>").text(String.fromCharCode(c)));
					}
					var csv_index_empty = !csv_index;
					self.getCSV().then(function(out) { // always update or create csv_index
						if (out) {
							localStorage.setItem(self.wos_storage, JSON.stringify(out)); // update csv_index in local storage
							if (csv_index_empty) {
								csv_index = out; // create csv_index
								$(letter_container).trigger("change");
							}
						}
					});
					if (!csv_index_empty) { // use current csv_index from local storage
						$(letter_container).trigger("change");
					}
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
