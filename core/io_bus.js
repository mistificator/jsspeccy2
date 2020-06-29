JSSpeccy.IOBus = function(opts) {
	var self = {};
	
	var keyboard = opts.keyboard;
	var display = opts.display;
	var memory = opts.memory;
	var sound = opts.sound;
	var contentionTable = opts.contentionTable;
	var contentionTableLength = contentionTable.length;
	var controller = opts.controller;
	
	var glKeyPortMask = 0xbf;
	var motor = 0;
	
	self.read = function(addr) {
		if ((addr & 0x0001) === 0x0000) {
			var earBit = 0;//
			if (controller.currentTape!=null && controller.currentTape.getEarBit!=null) earBit = controller.currentTape.getEarBit();
			return (keyboard.poll(addr) & glKeyPortMask) | earBit;
		} else if ((addr & 0xc002) == 0xc000) {
			/* AY chip */
			return sound.readSoundRegister();
		} else if ((addr & 0x00e0) === 0x0000) {
			/* kempston joystick */
			return 0;
		}  else if (addr == 0x2FFD) {
			const val = 0xFF; // 0xff - M: , 0x80 - A: M:
			console.log("iobus FDC 0x2ffd read", val.toString(16));
			return val;
		}	
		else {
			console.log("iobus read", addr.toString(16));
			return 0xff;
		}
	};
	self.write = function(addr, val, tstates) {
		if (!(addr & 0x01)) { 
			const border = val & 0x07;
			display.setBorder(border);
			const buzzer = (val & 16) >> 4;
			sound.updateBuzzer(buzzer, tstates);
			console.log("border", border, "buzzer", buzzer);
		}
		if (addr == 0x7FFD) { 
			memory.setPaging(val & 0x1F, memory.getPaging2());
		}	
		else if (addr == 0x1FFD) { 
			memory.setPaging(memory.getPaging(), val & 0x07);
			const _motor = (val & 0x08) >> 3;
			if (motor != _motor) {
				motor = _motor;
				console.log("iobus FDC motor", motor);
			}
		}
		else if (addr == 0x3FFD) {
			console.log("iobus FDC 0x3ffd write", val.toString(16));
		}
		else {
			console.log("iobus write", addr.toString(16));
		}
		
		if ((addr & 0xc002) == 0xc000) {
			/* AY chip - register select */
			sound.selectSoundRegister( val & 0xF );
		}
		
		if ((addr & 0xc002) == 0x8000) {
			/* AY chip - data write */
			sound.writeSoundRegister(val, tstates);
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
