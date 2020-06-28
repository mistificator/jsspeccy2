JSSpeccy.Memory = function(opts) {
	var self = {};
	var model = opts.model || JSSpeccy.Spectrum.MODEL_128K;

	var contentionTableLength = model.frameLength;

	var noContentionTable = model.noContentionTable;
	var contentionTable = model.contentionTable;

	function MemoryPage(data, isContended) {
		var self = {};
		self.memory = (data || new Uint8Array(0x4000));
		self.contentionTable = (isContended ? contentionTable : noContentionTable);
		return self;
	}
	
	var ramPages = [];
	if (model == JSSpeccy.Spectrum.MODEL_48K || model == JSSpeccy.Spectrum.MODEL_128K) {
		for (var i = 0; i < 8; i++) {
			ramPages[i] = MemoryPage(null, i & 0x01); /* for MODEL_128K (and implicitly 48K), odd pages are contended */
		}
	}
	else {
		for (var i = 0; i < 8; i++) {
			ramPages[i] = MemoryPage(null, i >= 4); 
		}
	}
	
	self.getRamPage = function(i) {
		return ramPages[i];
	}
	
	var romPages = {
		'48.rom': MemoryPage(JSSpeccy.roms['48.rom']),
		'128-0.rom': MemoryPage(JSSpeccy.roms['128-0.rom']),
		'128-1.rom': MemoryPage(JSSpeccy.roms['128-1.rom']),
		'plus3-0.rom': MemoryPage(JSSpeccy.roms['plus3-0.rom']),
		'plus3-1.rom': MemoryPage(JSSpeccy.roms['plus3-1.rom']),
		'plus3-2.rom': MemoryPage(JSSpeccy.roms['plus3-2.rom']),
		'plus3-3.rom': MemoryPage(JSSpeccy.roms['plus3-3.rom'])
	};

	var scratch = MemoryPage();
	
	var readSlots = [
		model === JSSpeccy.Spectrum.MODEL_48K ? romPages['48.rom'].memory : 
		model === JSSpeccy.Spectrum.MODEL_128K ? romPages['128-0.rom'].memory :
			romPages['plus3-0.rom'].memory,
		ramPages[5].memory,
		ramPages[2].memory,
		ramPages[0].memory
	];

	var writeSlots = [
		scratch.memory,
		ramPages[5].memory,
		ramPages[2].memory,
		ramPages[0].memory
	];

	var contentionBySlot = [
		noContentionTable,
		contentionTable,
		noContentionTable,
		noContentionTable
	];

	self.isContended = function(addr) {
		return (contentionBySlot[(addr >> 14) & 0x3] == contentionTable);
	};

  var prev_addr_14 = 0, prev_slot = contentionBySlot[0];
	self.contend = function(addr, tstate) {
    var addr_14 = (addr >> 14) & 0x3;
    if (addr_14 != prev_addr_14) {
      prev_slot = contentionBySlot[prev_addr_14 = addr_14];
    }
  	return prev_slot[tstate < contentionTableLength ? tstate : tstate % contentionTableLength];
	};

	self.read = function(addr) {
		var page = readSlots[(addr >> 14) & 0x3];
		return page[addr & 0x3fff];
	};
	self.write = function(addr, val) {
		var page = writeSlots[(addr >> 14) & 0x3];
		page[addr & 0x3fff] = val;
	};
	
	var screenPage = ramPages[5].memory;
	self.readScreen = function(addr) {
		return screenPage[addr];
	};

	var pagingIsLocked = false;
	var pagingValue = 0;
	var pagingValue2 = 0;
	if (model === JSSpeccy.Spectrum.MODEL_128K) {
		self.setPaging = function(val, val2) {
			if (pagingIsLocked) return;
			readSlots[0] = (val & 0x10) ? romPages['128-1.rom'].memory : romPages['128-0.rom'].memory;
			contentionBySlot[0] = noContentionTable;
			readSlots[1] = writeSlots[1] = screenPage = (val & 0x08) ? ramPages[7].memory : ramPages[5].memory;
			contentionBySlot[1] = (val & 0x08) ? ramPages[7].contentionTable : ramPages[5].contentionTable;
			readSlots[2] = writeSlots[2] = ramPages[2].memory;
			contentionBySlot[2] = ramPages[2].contentionTable;
			readSlots[3] = writeSlots[3] = ramPages[val & 0x07].memory;
			contentionBySlot[3] = ramPages[val & 0x07].contentionTable;
			pagingIsLocked = val & 0x20;
			pagingValue = val;
		};
	}
	else
	if (model === JSSpeccy.Spectrum.MODEL_PLUS3) {
		self.setPaging = function(val, val2) {
			console.log("setPaging", val, val2);
			if (pagingIsLocked) return;
			if ((val2 & 0x01) == 0) {
				console.log("setPaging", (val & 0x10) ? ((val2 & 0x04) ? 'plus3-3.rom' : 'plus3-1.rom') 
					: ((val2 & 0x04) ? 'plus3-2.rom' : 'plus3-0.rom'));
				readSlots[0] = (val & 0x10) ? ((val2 & 0x04) ? romPages['plus3-3.rom'].memory : romPages['plus3-1.rom'].memory) 
					: ((val2 & 0x04) ? romPages['plus3-2.rom'].memory : romPages['plus3-0.rom'].memory);
				contentionBySlot[0] = noContentionTable;
				readSlots[1] = writeSlots[1] = screenPage = (val & 0x08) ? ramPages[7].memory : ramPages[5].memory;
				contentionBySlot[1] = (val & 0x08) ? ramPages[7].contentionTable : ramPages[5].contentionTable;
				readSlots[2] = writeSlots[2] = ramPages[2].memory;
				contentionBySlot[2] = ramPages[2].contentionTable;
				readSlots[3] = writeSlots[3] = ramPages[val & 0x07].memory;
				contentionBySlot[3] = ramPages[val & 0x07].contentionTable;
				pagingIsLocked = val & 0x20;
			}
			else {
				const page = (val2 >> 1) & 0x03;
				readSlots[0] = page == 0 ? ramPages[0].memory : ramPages[4].memory;
				contentionBySlot[0] = page == 0 ? ramPages[0].contentionTable : ramPages[4].contentionTable;
				readSlots[1] = page == 0 ? ramPages[1].memory : page == 3 ? screenPage = ramPages[7].memory : screenPage = ramPages[5].memory;
				contentionBySlot[1] = page == 0 ? ramPages[1].contentionTable : page == 3 ? ramPages[7].contentionTable : ramPages[5].contentionTable;
				readSlots[2] = page == 0 ? ramPages[2].memory : ramPages[6].memory;
				contentionBySlot[2] = page == 0 ? ramPages[2].contentionTable : ramPages[6].contentionTable;
				readSlots[3] = page == 1 ? ramPages[7].memory : ramPages[3].memory;
				contentionBySlot[3] = page == 1 ? ramPages[7].contentionTable : ramPages[3].contentionTable;
			}
			pagingValue = val;
			pagingValue2 = val2;
		};
	} 
	else {
		self.setPaging = function(val, val2) {
		};
	}
	self.getPaging = function(val) {
		return pagingValue;
	}
	self.getPaging2 = function(val) {
		return pagingValue2;
	}
	
	self.loadFromSnapshot = function(snapshotPages) {
		for (var p in snapshotPages) {
			var ramPage = ramPages[p].memory;
			var snapshotPage = snapshotPages[p];
			for (var i = 0; i < 0x4000; i++) {
				ramPage[i] = snapshotPage[i];
			}
		}
	};

	self.reset = function() {
		pagingIsLocked = false;
		self.setPaging(0, 0);
	};

	return self;
};
