JSSpeccy.Z80SnapshotCreate = function(processor, memory, display, sound, opts) {
	var model = opts.model || JSSpeccy.Spectrum.MODEL_128K;

	var snapshot = new ArrayBuffer(9 * 16384); // 9 pages reserve
	(new Uint8Array(snapshot)).fill(0);
	var view = new jDataView(snapshot);
	// based on https://www.worldofspectrum.org/faq/reference/z80format.htm and https://sourceforge.net/p/fuse-emulator/code/HEAD/tree/trunk/libspectrum/z80.c
	// v1
	view.writeUint16(processor.getAF(), false); // 0
	view.writeUint16(processor.getBC(), true); // 2
	view.writeUint16(processor.getHL(), true); // 4
	view.writeUint16(0, true); // 6 
	view.writeUint16(processor.getSP(), true); // 8
	view.writeUint8(processor.getI()); // 10
	view.writeUint8(processor.getR() & 0x7f); // 11
	view.writeUint8(((processor.getR() >> 7) & 0x01) | ((display.getBorder() & 0x03) << 1) ); // 12
	view.writeUint16(processor.getDE(), true); // 13
	view.writeUint16(processor.getBC_(), true); // 15
	view.writeUint16(processor.getDE_(), true); // 17
	view.writeUint16(processor.getHL_(), true); // 19
	view.writeUint16(processor.getAF_(), false); // 21
	view.writeUint16(processor.getIY(), true); // 23
	view.writeUint16(processor.getIX(), true); // 25
	view.writeUint8(processor.getIFF1() ? 0xff : 0); // 27
	view.writeUint8(processor.getIFF2() ? 0xff : 0); // 28
	view.writeUint8(processor.getIM() & 0x03); // 29
	
	// v2
	view.writeUint16(23, true); // 30
	view.writeUint16(processor.getPC(), true); // 32 // v2
	view.writeUint8(model === JSSpeccy.Spectrum.MODEL_48K ? 0 : 3); // 34
	view.writeUint8(model === JSSpeccy.Spectrum.MODEL_48K ? 0 : memory.getPaging()); // 35
	view.writeUint8(0); // 36
	view.writeUint8(7); // 37
	view.writeUint8(sound.readSoundRegister()); // 38
	var ay_regs = sound.readSoundRegisters(); 
	for (var r = 0; r < 16; r++) // 39 - 55
	{
		view.writeUint8(ay_regs[r]); 
	}
	if (opts.debugPrint) {
		console.log("z80 header size", view.tell());
	}
	var rampage;
	if (model === JSSpeccy.Spectrum.MODEL_48K) {
		view.writeUint16(0xffff, true);
		view.writeUint8(4);
		rampage = memory.getRamPage(2).memory;
		for (var i = 0; i < rampage.length; i++) {
			view.writeUint8(rampage[i]); 
		}

		view.writeUint16(0xffff, true);
		view.writeUint8(5);
		rampage = memory.getRamPage(0).memory;
		for (var i = 0; i < rampage.length; i++) {
			view.writeUint8(rampage[i]); 
		}
		
		view.writeUint16(0xffff, true);
		view.writeUint8(8);
		rampage = memory.getRamPage(5).memory;
		for (var i = 0; i < rampage.length; i++) {
			view.writeUint8(rampage[i]); 
		}
	}
	else {
		for (var p = 0; p < 8; p++) {
			view.writeUint16(0xffff, true);
			view.writeUint8(3 + p);
			rampage = memory.getRamPage(p).memory;
			for (var i = 0; i < rampage.length; i++) {
				view.writeUint8(rampage[i]); 
			}
		}
	}
	
	snapshot = snapshot.slice(0, view.tell());
	if (opts.debugPrint) {
		console.log(snapshot);
	}

	return snapshot;
};