function Rgb2019() {
	var self = {};
	
	self.cors_proxy = "https://non-cors.herokuapp.com/";
	self.rgb2019_base = "https://rgb.yandex/";

	var loadResource = function (url) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url);
			xhr.onload = function() { if (xhr.status == 200) resolve(xhr.responseText); else reject(xhr.responseStatus); }
			xhr.onerror = function() { reject(xhr.responseStatus); }
			xhr.send();
		});
	}
	
	self.getLinks = async function() {
		var str = await loadResource(self.cors_proxy + self.rgb2019_base);
		var html = $.parseHTML(str);
		var out = [];
		$("div.game__card", html).each(function(i, div) {
			var text = (i + 1) + "." + $("h4", div).text().trim();
			var tape_url = $("a:first", div).attr("href");
			if (text && tape_url) {
				tape_url = self.cors_proxy + self.rgb2019_base + tape_url;
				out.push({title: text, tape_url: tape_url});
			}
		});
		return new Promise((resolve) => { resolve(out); });
	}
	
	var is_rgb2019_catalogue = false;
	self.init = function(catalogue_container, letter_container, index_container, links_container) {
		var count = $(catalogue_container + " option", ).length;
		$(catalogue_container).append($("<option></option>").text('RGB - Yandex Retro Games Battle 2019'));

		$(catalogue_container).change(function() {
			is_rgb2019_catalogue = false;
			switch ($(catalogue_container + " option:selected").index() - count) {
				case 0: 
					is_rgb2019_catalogue = true;
					$(letter_container).empty();
					var opt = $("<option></option>");
					opt.text("-");
					$(letter_container).append(opt);

					$(index_container).empty();
					self.getLinks().then(function(index) {
						for (var i of index) {
							var opt = $("<option></option>");
							opt.text(i.title);
							opt.attr("href", i.tape_url);
							$(index_container).append(opt);
						}
						$(index_container).trigger("change");
					});

					break;
			}
		});
		
		$(index_container).change(function() {
			if (!is_rgb2019_catalogue) {
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