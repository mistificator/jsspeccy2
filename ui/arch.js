function ArchCat(cors_proxy) {
	var self = {};

	self.cors_proxy = cors_proxy || "https://cors-free.herokuapp.com/";
	self.arch_base = "https://archive.org";
	self.arch_search = "/advancedsearch.php?fl%5B%5D=identifier&fl%5B%5D=title&sort%5B%5D=titleSorter+asc&rows=100000&page=1&output=json&q=mediatype%3Asoftware+identifier%3Azx_";
	self.arch_download = "/download/";
	
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
	
	self.getIndex = async function(letter) {
		var str = await loadResource(self.arch_base + self.arch_search + letter.toLowerCase() + "*");
		var json = null; 
		var out = [];
		try { 
			json = JSON.parse(str); 
		} catch (e) {}
		if (json) {
			var n = 0;
			for (var entry of json.response.docs) {
				out.push({title: (++n).toString() + "." + entry.title, catalogue_url: self.cors_proxy + self.arch_base + self.arch_download + entry.identifier + "/" + entry.identifier.slice(3) + ".z80"});
			}
		}
		return new Promise((resolve) => { resolve(out); });
	}

	var is_arch_catalogue = false;
	self.init = function(catalogue_container, letter_container, index_container, links_container) {
		var count = $(catalogue_container + " option").length;
		$(catalogue_container).append($("<option></option>").text('Archive - Archive.org full catalogue'));
		
		$(catalogue_container).change(function() {
			is_arch_catalogue = false;
			switch ($(catalogue_container + " option:selected").index() - count) {
				case 0: 
					is_arch_catalogue = true;
					$(letter_container).empty();
					for (var c = ("A").charCodeAt(0); c <= ("Z").charCodeAt(0); c++) {
						$(letter_container).append($("<option></option>").text(String.fromCharCode(c)));
					}
					for (var c = ("0").charCodeAt(0); c <= ("9").charCodeAt(0); c++) {
						$(letter_container).append($("<option></option>").text(String.fromCharCode(c)));
					}
					$(letter_container).trigger("change");
					break;
			}
		});		

		$(letter_container).change(function() {
			if (!is_arch_catalogue) {
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
			if (!is_arch_catalogue) {
				return;
			}		
			$(links_container).empty();
			var href = $(index_container + " option:selected").attr("href");
			var title = href.slice(href.lastIndexOf("/") + 1);
			var opt = $("<option></option>");
			opt.text(title);
			opt.attr("href", href);
			$(links_container).append(opt);
			$(links_container).trigger("change");
		});
		
		if (count == 0) {
			$(catalogue_container).trigger("change");
		}
	}
	
	return self;
};
