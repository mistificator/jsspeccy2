function ZxCzCat(cors_proxy) {
	var self = {};
	
	var encode = function(url) {
		return url.split("?").join("%3F").split("&").join("%26");
	}
	
	self.cors_proxy = cors_proxy || "https://non-cors.herokuapp.com/";
	self.zxcz_base = "https://www.zx-spectrum.cz";
	self.zxcz_index = encode("/index.php?cat1=3&cat2=3&games_page=");
	self.zxcz_download = "/data/games/files/";

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

	self.getIndex = async function() {
		var page_1 = self.cors_proxy + self.zxcz_base + self.zxcz_index + "1";
		var str = await loadResource(page_1);
		var html = $.parseHTML(str);
		var out = [];
		out.push({page: "1", catalogue_url: page_1});
		for (var a of $("a", $(".paging", html).first())) {
			out.push({page: $(a).text().trim(), catalogue_url: self.cors_proxy + self.zxcz_base + "/" + encode($(a).attr("href"))});
		}
		return new Promise((resolve) => { resolve(out); });
	}
	
	self.getLinks = async function(catalogue_url) {
		var str = await loadResource(catalogue_url);
		var html = $.parseHTML(str);
		var out = [];
		$("tr", $("table.listbox", html)).each(function(i, tr) {
			if (i > 0) {
				var text = $("a", $("td:eq(0)", tr)).text().replace(/\s\(\d+\)$/, "");
				var tape_url = $("a:first", $("td:eq(6)", tr)).attr("href");
				if (text && tape_url) {
					tape_url = self.cors_proxy + self.zxcz_base + self.zxcz_download + tape_url.slice(tape_url.lastIndexOf("=") + 1);
					out.push({title: text, tape_url: tape_url});
				}
			}
		});
		return new Promise((resolve) => { resolve(out); });
	}
	
	var is_zxcz_catalogue = false;
	self.init = function(catalogue_container, letter_container, index_container, links_container) {
		var count = $(catalogue_container + " option").length;
		$(catalogue_container).append($("<option></option>").text('ZXCZ - ZX-Spectrum.CZ full catalogue'));

		$(catalogue_container).change(function() {
			is_zxcz_catalogue = false;
			switch ($(catalogue_container + " option:selected").index() - count) {
				case 0: 
					is_zxcz_catalogue = true;
					$(letter_container).empty();
					self.getIndex().then(function(index) {
						for (var i of index) {
							var opt = $("<option></option>");
							opt.text(i.page);
							opt.attr("href", i.catalogue_url);
							$(letter_container).append(opt);
						}
						$(letter_container).trigger("change");
					});
					break;
			}
		});
		
		$(letter_container).change(function() {
			if (!is_zxcz_catalogue) {
				return;
			}
			$(index_container).empty();
			self.getLinks($(letter_container + " option:selected").attr("href")).then(function(index) {
				for (var i of index) {
					var opt = $("<option></option>");
					opt.text(i.title);
					opt.attr("href", i.tape_url);
					$(index_container).append(opt);
				}
				$(index_container).trigger("change");
			});
		});
		
		$(index_container).change(function() {
			if (!is_zxcz_catalogue) {
				return;
			}
			$(links_container).empty();
			var tape_url = $(index_container + " option:selected").attr("href");
			var opt = $("<option></option>");
			opt.text(tape_url.slice(tape_url.lastIndexOf("/") + 1));
			opt.attr("href", tape_url);
			$(links_container).append(opt);
			$(links_container).trigger("change");
		});
		
		if (count == 0) {
			$(catalogue_container).trigger("change");
		}
	}
	
	return self;
}