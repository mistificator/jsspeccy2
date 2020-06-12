function DummyCat() {
	var self = {};
	
	var is_dummy_catalogue = false;
	self.init = function(catalogue_container, letter_container, index_container, links_container) {
		var count = $(catalogue_container + " option").length;
		$(catalogue_container).append($("<option></option>").text("-"));

		$(catalogue_container).change(function() {
			is_dummy_catalogue = false;
			switch ($(catalogue_container + " option:selected").index() - count) {
				case 0: 
					is_dummy_catalogue = true;
					$(letter_container).empty();
					var opt = $("<option></option>");
					opt.text("-");
					opt.attr("href", "");
					$(letter_container).append(opt);
					setTimeout(function() {
							$(letter_container).trigger("change");
						}, 0);
					break;
			}
		});
		
		$(letter_container).change(function() {
			if (!is_dummy_catalogue) {
				return;
			}
			$(index_container).empty();
			var opt = $("<option></option>");
			opt.text("-");
			opt.attr("href", "");
			$(index_container).append(opt);
			setTimeout(function() {
					$(index_container).trigger("change");
				}, 0);
		});
		
		$(index_container).change(function() {
			if (!is_dummy_catalogue) {
				return;
			}
			$(links_container).empty();
			var opt = $("<option></option>");
			opt.text("-");
			opt.attr("href", "");
			$(links_container).append(opt);
			setTimeout(function() {
					$(links_container).trigger("change");
				}, 0);
		});
		
		if (count == 0) {
			$(catalogue_container).trigger("change");
		}
	}
	
	return self;
}