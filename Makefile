.PHONY: all

DIST_FILES=\
	build\jsspeccy-core.min.js \
	lib\jquery-1.12.4.min.js \
	build\sound.min.js \
	README

MKDIR=-mkdir  
COPY_DST=for %I in ($(DIST_FILES)) do xcopy /y %I dist
CLEAN=-del /s /q
NPX=call npx
ARES_PACK=-call $(LG_WEBOS_TV_SDK_HOME)\CLI\bin\ares-package
   
all: $(DIST_FILES)
	$(MKDIR) build
	$(MKDIR) dist
	$(MKDIR) dist\OutputIPK
	$(COPY_DST)

build/roms.js: bin2js.pl roms/*
	$(MKDIR) build
	perl bin2js.pl roms JSSpeccy.roms > build/roms.js

build/autoloaders.js: bin2js.pl autoloaders/*
	$(MKDIR) build
	perl bin2js.pl autoloaders JSSpeccy.autoloaders > build/autoloaders.js

build/z80.js: core/z80.coffee
	$(MKDIR) build
	$(NPX) coffee -c -o build/ core/z80.coffee

build/sound.min.js: core/sound.js
	$(NPX) minify core/sound.js > build/sound.min.js
	
CORE_JS_FILES=\
	core/jsspeccy.js \
	core/display.js \
	core/io_bus.js \
	core/keyboard.js \
	core/memory.js \
	core/sound_wrapper.js \
	core/sound.js \
	build/roms.js \
	build/autoloaders.js \
	core/sna_file.js \
	core/spectrum.js \
	core/tap_file.js \
	core/tzx_file.js \
	core/viewport.js \
	build/z80.js \
	core/z80_file.js

build/jsspeccy-core.min.js: $(CORE_JS_FILES)
	$(MKDIR) build
	$(NPX) google-closure-compiler \
		--js=core/jsspeccy.js --js=core/display.js --js=core/io_bus.js --js=core/keyboard.js --js=core/sound_wrapper.js \
		--js=core/memory.js --js=build/roms.js --js=build/autoloaders.js --js=core/sna_file.js --js=core/spectrum.js \
		--js=core/tap_file.js --js=core/tzx_file.js --js=core/viewport.js --js=build/z80.js \
		--js=core/z80_file.js \
		--js=lib/jdataview.js \
		--js=lib/js-unzip.js \
		--js=lib/js-inflate.js \
		--js=lib/hqx.js \
		--js=wos/wos.js \
		--js=wos/zxcz.js \
		--js=wos/rgb2019.js \
		--js=wos/arch.js \
		--js_output_file=build/jsspeccy-core.min.js
    $(CLEAN) .\dist\OutputIPK\*.*
    $(ARES_PACK) -o .\dist\OutputIPK -n .\dist

.PHONY: clean
clean:
	$(CLEAN) build
    $(CLEAN) .\dist\OutputIPK\
