JSSpeccy.IOBus = function(opts) {
	var self = {};
	
	var model = opts.model;
	var keyboard = opts.keyboard;
	var display = opts.display;
	var memory = opts.memory;
	var sound = opts.sound;
	var contentionTable = opts.contentionTable;
	var contentionTableLength = contentionTable.length;
	var controller = opts.controller;
	
	var glKeyPortMask = 0xbf;
	var motor = 0;
	var port3ffd = 0xff;
	
	self.read = function(addr) {
	// https://worldofspectrum.org/faq/reference/ports.htm
		if ((addr & 0x0001) === 0x0000) { // 0xFE
			var earBit = 0;//
			if (controller.currentTape!=null && controller.currentTape.getEarBit!=null) earBit = controller.currentTape.getEarBit();
			return (keyboard.poll(addr) & glKeyPortMask) | earBit;
		} else if ((addr & 0xc002) === 0xc000) { 
			/* AY chip */
			return sound.readSoundRegister();
		} else if ((addr & 0x00e0) === 0x0000) {
			/* kempston joystick */
			return 0;
		} else if ((addr & 0xf002) === 0x2000) {
			const val = 0xFF; // 0xff - M: , 0x80 - A: M:
			if (opts.debugPrint) {
				console.log("iobus FDC 0x2ffd read", val.toString(16));
			}
			return val;
		} else if ((addr & 0xf002) === 0x3000) {
			const val = port3ffd; 
			if (opts.debugPrint) {
				console.log("iobus FDC 0x3ffd read", val.toString(16));
			}
			return val;
		}	else {
			if (opts.debugPrint) {
				console.log("iobus read", addr.toString(16));
			}
			return 0xff;
		}
	};
	self.write = function(addr, val, tstates) {
		if (!(addr & 0x01)) { 
			const border = val & 0x07;
			display.setBorder(border);
			const buzzer = (val & 16) >> 4;
			sound.updateBuzzer(buzzer, tstates);
		} else if (((addr & 0xc002) === 0x4000 && model === JSSpeccy.Spectrum.MODEL_PLUS3) || ((addr & 0x8002) === 0x0000 && model === JSSpeccy.Spectrum.MODEL_128K)) { 
			memory.setPaging(val, memory.getPaging2());
		}	else if ((addr & 0xf002) === 0x1000 ) { 
			memory.setPaging(memory.getPaging(), val);
			if (model === JSSpeccy.Spectrum.MODEL_PLUS3) {
				const _motor = (val & 0x08) >> 3;
				if (motor != _motor) {
					motor = _motor;
					if (opts.debugPrint) {
						console.log("iobus FDC motor", motor);
					}
				}
			}
		} else if ((addr & 0xf002) === 0x3000) {
			port3ffd = val;
			if (opts.debugPrint) {
				console.log("iobus FDC 0x3ffd write", val.toString(16));
			}
		} else if ((addr & 0xc002) === 0xc000) {
			/* AY chip - register select */
			sound.selectSoundRegister( val & 0x0F );
		} else if ((addr & 0xc002) === 0x8000) {
			/* AY chip - data write */
			sound.writeSoundRegister(val, tstates);
		} else {
			if (opts.debugPrint) {
				console.log("iobus write", addr.toString(16));
			}
		}
	};

	self.isULAPort = function(addr) {
		return ((addr & 0x0001) === 0x0000);
	};
	self.contend = function(addr, tstates) {
		return contentionTable[tstates % contentionTableLength];
	};

	return self;
};
