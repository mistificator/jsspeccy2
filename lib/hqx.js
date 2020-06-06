// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// ==/ClosureCompiler==

/**
 * @license hqx Pixel Art Scaling Algorithm for JavaScript/Canvas
 * This project is a direct port of the C source code for the hqx scaling algorithm.
 *
 * Copyright (C) 2003 Maxim Stepin ( maxst@hiend3d.com )
 *
 * Copyright (C) 2010 Cameron Zemek ( grom@zeminvaders.net )
 *
 * Copyright (C) 2010 Dominic Szablewski ( mail@phoboslab.org )
 *
 * Copyright (C) 2020 Mist Poryvaev ( mist.poryvaev@gmail.com )
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 */


(function(window){

"use strict"; // strict will be optimized on engines (https://developer.mozilla.org/en/JavaScript/Strict_mode)

var 
	_src = null,
	_src_cached = null,
	_cache_dirty = null,
	_dest = null,
	_src_yuv = null,
	_srcBuffer = null,
	_destBuffer = null;

const	
	_MASK_2 = 0x00FF00,
	_MASK_13 = 0xFF00FF,
	
	_Ymask = 0x00FF0000,
	_Umask = 0x0000FF00,
	_Vmask = 0x000000FF,
	
	_trY = 0x00300000,
	_trU = 0x00000700,
	_trV = 0x00000006;

var _Math = window.Math; // global to local. SHALL NOT cache abs directly (http://jsperf.com/math-vs-global/2)

var _RGBtoYUV = function( c ) {
	const r = (c & _Ymask) >> 16,
				g = (c & _Umask) >> 8,
				b =  c & _Vmask;
	return  ((/*y=*/(0.299*r + 0.587*g + 0.114*b) | 0) << 16) +
		((/*u=*/((-0.169*r - 0.331*g + 0.5*b) + 128) | 0) << 8) + 
		(/*v=*/((0.5*r - 0.419*g - 0.081*b) + 128) | 0);
};

var _Diff = function( YUV1, YUV2 ) {
	// Mask against RGB_MASK to discard the alpha channel
	return	((_Math.abs((YUV1 & _Ymask) - (YUV2 & _Ymask)) > _trY ) ||
			( _Math.abs((YUV1 & _Umask) - (YUV2 & _Umask)) > _trU ) ||
			( _Math.abs((YUV1 & _Vmask) - (YUV2 & _Vmask)) > _trV ) );
};

/* Interpolate functions */

var _Interp1 = function( pc, c1, c2 ) {
    //*pc = (c1*3+c2) >> 2;
    if (c1 === c2) {
        _dest[pc] = c1;
        return;
    }
    _dest[pc] = ((((c1 & _MASK_2) * 3 + (c2 & _MASK_2)) >> 2) & _MASK_2) +
        ((((c1 & _MASK_13) * 3 + (c2 & _MASK_13)) >> 2) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp2 = function( pc, c1, c2, c3 ) {
    //*pc = (c1*2+c2+c3) >> 2;
    _dest[pc] = (((((c1 & _MASK_2) << 1) + (c2 & _MASK_2) + (c3 & _MASK_2)) >> 2) & _MASK_2) +
          (((((c1 & _MASK_13) << 1) + (c2 & _MASK_13) + (c3 & _MASK_13)) >> 2) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp3 = function( pc, c1, c2 ) {
    //*pc = (c1*7+c2)/8;
    if (c1 === c2) {
        _dest[pc] = c1;
        return;
    }
    _dest[pc] = ((((c1 & _MASK_2) * 7 + (c2 & _MASK_2)) >> 3) & _MASK_2) +
        ((((c1 & _MASK_13) * 7 + (c2 & _MASK_13)) >> 3) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp4 = function( pc, c1, c2, c3 ) {
    //*pc = (c1*2+(c2+c3)*7)/16;
    _dest[pc] = (((((c1 & _MASK_2) << 1) + (c2 & _MASK_2) * 7 + (c3 & _MASK_2) * 7) >> 4) & _MASK_2) +
          (((((c1 & _MASK_13) << 1) + (c2 & _MASK_13) * 7 + (c3 & _MASK_13) * 7) >> 4) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp5 = function( pc, c1, c2 ) {
    //*pc = (c1+c2) >> 1;
    if (c1 === c2) {
        _dest[pc] = c1;
        return;
    }
    _dest[pc] = ((((c1 & _MASK_2) + (c2 & _MASK_2)) >> 1) & _MASK_2) +
        ((((c1 & _MASK_13) + (c2 & _MASK_13)) >> 1) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp6 = function( pc, c1, c2, c3 ) {
    //*pc = (c1*5+c2*2+c3)/8;
    _dest[pc] = ((((c1 & _MASK_2) * 5 + ((c2 & _MASK_2) << 1) + (c3 & _MASK_2)) >> 3) & _MASK_2) +
          ((((c1 & _MASK_13) * 5 + ((c2 & _MASK_13) << 1) + (c3 & _MASK_13)) >> 3) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp7 = function( pc, c1, c2, c3 ) {
    //*pc = (c1*6+c2+c3)/8;
    _dest[pc] = ((((c1 & _MASK_2) * 6 + (c2 & _MASK_2) + (c3 & _MASK_2)) >> 3) & _MASK_2) +
          ((((c1 & _MASK_13) * 6 + (c2 & _MASK_13) + (c3 & _MASK_13)) >> 3) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp8 = function( pc, c1, c2 ) {
    //*pc = (c1*5+c2*3)/8;
    if (c1 === c2) {
        _dest[pc] = c1;
        return;
    }
    _dest[pc] = ((((c1 & _MASK_2) * 5 + (c2 & _MASK_2) * 3) >> 3) & _MASK_2) +
          ((((c1 & _MASK_13) * 5 + (c2 & _MASK_13) * 3) >> 3) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp9 = function( pc, c1, c2, c3 ) {
    //*pc = (c1*2+(c2+c3)*3)/8;
    _dest[pc] = (((((c1 & _MASK_2) << 1) + (c2 & _MASK_2) * 3 + (c3 & _MASK_2) * 3) >> 3) & _MASK_2) +
          (((((c1 & _MASK_13) << 1) + (c2 & _MASK_13) * 3 + (c3 & _MASK_13) * 3) >> 3) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

var _Interp10 = function( pc, c1, c2, c3 ) {
    //*pc = (c1*14+c2+c3)/16;
    _dest[pc] = ((((c1 & _MASK_2) * 14 + (c2 & _MASK_2) + (c3 & _MASK_2)) >> 4) & _MASK_2) +
          ((((c1 & _MASK_13) * 14 + (c2 & _MASK_13) + (c3 & _MASK_13)) >> 4) & _MASK_13);

	_dest[pc] |= (c1 & 0xFF000000);
};

window.hqxReset = function() {
	_src = null,
	_src_cached = null,
	_cache_dirty = null,
	_dest = null,
	_src_yuv = null,
	_srcBuffer = null,
	_destBuffer = null;
}

window.hqx = function(src_img, dst_img) {
	var scale = Math.floor(dst_img.width / src_img.width);
	if (scale != Math.floor(dst_img.height / src_img.height)) {
		return dst_img;
	}
	if(scale != 2) {
		return dst_img;
	}

	_src = new Int32Array(src_img.data.buffer); 
	_dest = new Int32Array(dst_img.data.buffer); 
	
	if (!_src_yuv || _src_yuv.length != _src.length) {
		_src_yuv = new Int32Array(_src.length); 
	}
	if (!_src_cached || _src_cached.length != _src.length) {
		_src_cached = new Int32Array(_src.length);
	}
	
	if (!_cache_dirty || _cache_dirty.length != _src.length) {
		_cache_dirty = new Int8Array(_src.length);
		_cache_dirty.fill(0);
	}
	
	const width = src_img.width;
	for (var i = 0; i < _src_yuv.length; i++) {
		if (_src[i] != _src_cached[i]) {
			_src_yuv[i] = _RGBtoYUV(_src_cached[i] = _src[i]);
			_cache_dirty[i - width - 1] = _cache_dirty[i - width] = _cache_dirty[i - width + 1] = 
			_cache_dirty[i - 1] = _cache_dirty[i] = _cache_dirty[i + 1] = 
			_cache_dirty[i + width - 1] = _cache_dirty[i + width] = _cache_dirty[i + width + 1] = 1;
		}
	}
	
	hq2x(
			src_img.width, 
			src_img.height
		);

	return dst_img;
};



//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
// hq 2x

function hq2x(width, height ) {
	var
		i, j, k,
		prevline, nextline,
		w = [], w2 = [],
		dpL = width << 1,

		dp = 0,
		sp = 0;
		
	// internal to local optimization
	var 
		Diff = _Diff,
		Math = _Math,
		RGBtoYUV = _RGBtoYUV,
		Interp1 = _Interp1,
		Interp2 = _Interp2,
		Interp3 = _Interp3,
		Interp4 = _Interp4,
		Interp5 = _Interp5,
		Interp6 = _Interp6,
		Interp7 = _Interp7,
		Interp8 = _Interp8,
		Interp9 = _Interp9,
		Interp10 = _Interp10,
		src = _src,
		dest = _dest,
		src_yuv = _src_yuv,
		cache_dirty = _cache_dirty,
		MASK_2 = _MASK_2,
		MASK_13 = _MASK_13,
		Ymask = _Ymask,
		Umask = _Umask,
		Vmask = _Vmask,
		trY = _trY,
		trU = _trU,
		trV = _trV;
		

    //   +----+----+----+
    //   |    |    |    |
    //   | w1 | w2 | w3 |
    //   +----+----+----+
    //   |    |    |    |
    //   | w4 | w5 | w6 |
    //   +----+----+----+
    //   |    |    |    |
    //   | w7 | w8 | w9 |
    //   +----+----+----+

		var interp = function(pattern) {
		
//first phase
						switch (pattern)
            {
                case 0:
                case 1:
                case 4:
                case 5:
                case 32:
                case 33:
                case 36:
                case 37:
                case 64:
                case 65:
                case 68:
                case 69:
                case 96:
                case 97:
                case 100:
                case 101:
                case 128:
                case 129:
                case 132:
                case 133:
                case 160:
                case 161:
                case 164:
                case 165:
                case 192:
                case 193:
                case 196:
                case 197:
                case 224:
                case 225:
                case 228:
                case 229:
                    {
                        Interp2(dp, w[5], w[4], w[2]);
                        Interp2(dp+1, w[5], w[2], w[6]);
												break;
										}
                case 2:
                case 34:
                case 66:
                case 98:
                case 130:
                case 162:
                case 194:
                case 226:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        Interp2(dp+1, w[5], w[3], w[6]);
												break;
										}	
                case 16:
                case 17:
                case 48:
                case 49:
                case 80:
                case 81:
                case 112:
                case 113:
                case 144:
                case 145:
                case 176:
                case 177:
                case 208:
                case 209:
                case 240:
                case 241:
                    {
                        Interp2(dp, w[5], w[4], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
												break;
										}
                case 8:
                case 12:
                case 40:
                case 44:
                case 72:
                case 76:
                case 104:
                case 108:
                case 136:
                case 140:
                case 168:
                case 172:
                case 200:
                case 204:
                case 232:
                case 236:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp2(dp+1, w[5], w[2], w[6]);
												break;
										}
                case 3:
                case 35:
                case 67:
                case 99:
                case 106:
                case 131:
                case 163:
                case 195:
                case 227:
                    {
                        Interp1(dp, w[5], w[4]);
                        Interp2(dp+1, w[5], w[3], w[6]);
												break;
										}
                case 6:
                case 38:
                case 70:
                case 102:
                case 134:
                case 166:
                case 198:
                case 230:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        Interp1(dp+1, w[5], w[6]);										
												break;
										}
                case 20:
                case 21:
                case 52:
                case 53:
                case 116:
                case 117:
                case 148:
                case 149:
                case 180:
                case 181:
                case 244:
                case 245:
                    {
                        Interp2(dp, w[5], w[4], w[2]);
                        Interp1(dp+1, w[5], w[2]);
												break;
										}
                case 9:
                case 13:
                case 41:
                case 45:
                case 137:
                case 141:
                case 169:
                case 173:
                case 201:
                case 205:
                case 233:
                case 237:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[2], w[6]);
												break;
										}
                case 24:
                case 56:
                case 88:
                case 120:
                case 152:
                case 184:
                case 216:
                case 248:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
												break;
										}
                case 7:
                case 39:
                case 71:
                case 103:
                case 110:
                case 135:
                case 167:
                case 199:
                case 231:
                case 238:
                    {
                        Interp1(dp, w[5], w[4]);
                        Interp1(dp+1, w[5], w[6]);
												break;
										}
												
						}
		
		
		
// second phase
            switch (pattern)
            {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 32:
                case 33:
                case 34:
                case 35:
                case 36:
                case 37:
                case 38:
                case 39:
                case 128:
                case 129:
                case 130:
                case 131:
                case 132:
                case 133:
                case 134:
                case 135:
                case 160:
                case 161:
                case 162:
                case 163:
                case 164:
                case 165:
                case 166:
                case 167:
                    {
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 16:
                case 17:
                case 20:
                case 21:
                case 48:
                case 49:
                case 52:
                case 53:
                    {
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 64:
                case 65:
                case 66:
                case 67:
                case 68:
                case 69:
                case 70:
                case 71:
                   {
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 8:
                case 9:
                case 12:
                case 13:
                case 136:
                case 137:
                case 140:
                case 141:
                    {
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 144:
                case 145:
                case 148:
                case 149:
                case 176:
                case 177:
                case 180:
                case 181:
                   {
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 192:
                case 193:
                case 194:
                case 195:
                case 196:
                case 197:
                case 198:
                case 199:
                   {
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 96:
                case 97:
                case 98:
                case 99:
                case 100:
                case 101:
                case 102:
                case 103:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 40:
                case 41:
                case 44:
                case 45:
                case 168:
                case 169:
                case 172:
                case 173:
                    {
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 18:
                case 50:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 80:
                case 81:
                    {
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 72:
                case 76:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 10:
                case 138:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 24:
                    {
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 224:
                case 228:
                case 225:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 22:
                case 54:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 208:
                case 209:
                    {
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 104:
                case 108:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 11:
                case 139:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 19:
                case 51:
                    {
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp, w[5], w[4]);
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp6(dp, w[5], w[2], w[4]);
                            Interp9(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 146:
                case 178:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                            Interp1(dp+dpL+1, w[5], w[8]);
                        }
                        else
                        {
                            Interp9(dp+1, w[5], w[2], w[6]);
                            Interp6(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        break;
                    }
                case 84:
                case 85:
                    {
                        Interp2(dp, w[5], w[4], w[2]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+1, w[5], w[2]);
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp6(dp+1, w[5], w[6], w[2]);
                            Interp9(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        break;
                    }
                case 112:
                case 113:
                    {
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL, w[5], w[4]);
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp6(dp+dpL, w[5], w[8], w[4]);
                            Interp9(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 200:
                case 204:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                            Interp1(dp+dpL+1, w[5], w[6]);
                        }
                        else
                        {
                            Interp9(dp+dpL, w[5], w[8], w[4]);
                            Interp6(dp+dpL+1, w[5], w[8], w[6]);
                        }
                        break;
                    }
                case 73:
                case 77:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp, w[5], w[2]);
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp6(dp, w[5], w[4], w[2]);
                            Interp9(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+1, w[5], w[2], w[6]);
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 42:
                case 170:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                            Interp1(dp+dpL, w[5], w[8]);
                        }
                        else
                        {
                            Interp9(dp, w[5], w[4], w[2]);
                            Interp6(dp+dpL, w[5], w[4], w[8]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 14:
                case 142:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                            Interp1(dp+1, w[5], w[6]);
                        }
                        else
                        {
                            Interp9(dp, w[5], w[4], w[2]);
                            Interp6(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 28:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 152:
                    {
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 56:
                    {
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 25:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 26:
                case 31:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 82:
                case 214:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 88:
                case 248:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 74:
                case 107:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 27:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[3]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 86:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 216:
                    {
                        Interp1(dp+dpL, w[5], w[7]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 106:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 30:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 210:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        Interp1(dp+1, w[5], w[3]);
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 120:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 75:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        Interp1(dp+dpL, w[5], w[7]);
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 29:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 184:
                    {
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 57:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 156:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 226:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 60:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 153:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 58:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 83:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 92:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 202:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 78:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 154:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 114:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 89:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 90:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 55:
                case 23:
                    {
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp, w[5], w[4]);
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp6(dp, w[5], w[2], w[4]);
                            Interp9(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 182:
                case 150:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                            Interp1(dp+dpL+1, w[5], w[8]);
                        }
                        else
                        {
                            Interp9(dp+1, w[5], w[2], w[6]);
                            Interp6(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        break;
                    }
                case 213:
                case 212:
                    {
                        Interp2(dp, w[5], w[4], w[2]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+1, w[5], w[2]);
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp6(dp+1, w[5], w[6], w[2]);
                            Interp9(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        break;
                    }
                case 241:
                case 240:
                    {
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL, w[5], w[4]);
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp6(dp+dpL, w[5], w[8], w[4]);
                            Interp9(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 236:
                case 232:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                            Interp1(dp+dpL+1, w[5], w[6]);
                        }
                        else
                        {
                            Interp9(dp+dpL, w[5], w[8], w[4]);
                            Interp6(dp+dpL+1, w[5], w[8], w[6]);
                        }
                        break;
                    }
                case 109:
                case 105:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp, w[5], w[2]);
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp6(dp, w[5], w[4], w[2]);
                            Interp9(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+1, w[5], w[2], w[6]);
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 171:
                case 43:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                            Interp1(dp+dpL, w[5], w[8]);
                        }
                        else
                        {
                            Interp9(dp, w[5], w[4], w[2]);
                            Interp6(dp+dpL, w[5], w[4], w[8]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 143:
                case 15:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                            Interp1(dp+1, w[5], w[6]);
                        }
                        else
                        {
                            Interp9(dp, w[5], w[4], w[2]);
                            Interp6(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 124:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 203:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        Interp1(dp+dpL, w[5], w[7]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 62:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 211:
                    {
                        Interp1(dp, w[5], w[4]);
                        Interp1(dp+1, w[5], w[3]);
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 118:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 217:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        Interp1(dp+dpL, w[5], w[7]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 110:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 155:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[3]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 188:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 185:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 61:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 157:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 227:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 230:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 220:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 158:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 234:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 242:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 59:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 121:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 87:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 79:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 122:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 94:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 218:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 91:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 229:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 186:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 115:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 93:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 206:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 205:
                case 201:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        else
                        {
                            Interp7(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 174:
                case 46:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        else
                        {
                            Interp7(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 179:
                case 147:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        else
                        {
                            Interp7(dp+1, w[5], w[2], w[6]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 117:
                case 116:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        else
                        {
                            Interp7(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 189:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 231:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 126:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 219:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[3]);
                        Interp1(dp+dpL, w[5], w[7]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 125:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            Interp1(dp, w[5], w[2]);
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp6(dp, w[5], w[4], w[2]);
                            Interp9(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+1, w[5], w[2]);
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 221:
                    {
                        Interp1(dp, w[5], w[2]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+1, w[5], w[2]);
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp6(dp+1, w[5], w[6], w[2]);
                            Interp9(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        Interp1(dp+dpL, w[5], w[7]);
                        break;
                    }
                case 207:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                            Interp1(dp+1, w[5], w[6]);
                        }
                        else
                        {
                            Interp9(dp, w[5], w[4], w[2]);
                            Interp6(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[7]);
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 238:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                            Interp1(dp+dpL+1, w[5], w[6]);
                        }
                        else
                        {
                            Interp9(dp+dpL, w[5], w[8], w[4]);
                            Interp6(dp+dpL+1, w[5], w[8], w[6]);
                        }
                        break;
                    }
                case 190:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                            Interp1(dp+dpL+1, w[5], w[8]);
                        }
                        else
                        {
                            Interp9(dp+1, w[5], w[2], w[6]);
                            Interp6(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        break;
                    }
                case 187:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                            Interp1(dp+dpL, w[5], w[8]);
                        }
                        else
                        {
                            Interp9(dp, w[5], w[4], w[2]);
                            Interp6(dp+dpL, w[5], w[4], w[8]);
                        }
                        Interp1(dp+1, w[5], w[3]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 243:
                    {
                        Interp1(dp, w[5], w[4]);
                        Interp1(dp+1, w[5], w[3]);
                        if (Diff(w2[6], w2[8]))
                        {
                            Interp1(dp+dpL, w[5], w[4]);
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp6(dp+dpL, w[5], w[8], w[4]);
                            Interp9(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 119:
                    {
                        if (Diff(w2[2], w2[6]))
                        {
                            Interp1(dp, w[5], w[4]);
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp6(dp, w[5], w[2], w[4]);
                            Interp9(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 237:
                case 233:
                    {
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 175:
                case 47:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        break;
                    }
                case 183:
                case 151:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        Interp2(dp+dpL, w[5], w[8], w[4]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 245:
                case 244:
                    {
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
                case 250:
                    {
                        Interp1(dp, w[5], w[4]);
                        Interp1(dp+1, w[5], w[3]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 123:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[3]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 95:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[7]);
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 222:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[7]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 252:
                    {
                        Interp2(dp, w[5], w[1], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
                case 249:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp2(dp+1, w[5], w[3], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 235:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp2(dp+1, w[5], w[3], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 111:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp2(dp+dpL+1, w[5], w[9], w[6]);
                        break;
                    }
                case 63:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp2(dp+dpL+1, w[5], w[9], w[8]);
                        break;
                    }
                case 159:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 215:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        Interp2(dp+dpL, w[5], w[7], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 246:
                    {
                        Interp2(dp, w[5], w[1], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
                case 254:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
                case 253:
                    {
                        Interp1(dp, w[5], w[2]);
                        Interp1(dp+1, w[5], w[2]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
                case 251:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        Interp1(dp+1, w[5], w[3]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 239:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        Interp1(dp+1, w[5], w[6]);
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        Interp1(dp+dpL+1, w[5], w[6]);
                        break;
                    }
                case 127:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+1, w[5], w[2], w[6]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL, w[5], w[8], w[4]);
                        }
                        Interp1(dp+dpL+1, w[5], w[9]);
                        break;
                    }
                case 191:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        Interp1(dp+dpL, w[5], w[8]);
                        Interp1(dp+dpL+1, w[5], w[8]);
                        break;
                    }
                case 223:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp2(dp, w[5], w[4], w[2]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        Interp1(dp+dpL, w[5], w[7]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp2(dp+dpL+1, w[5], w[6], w[8]);
                        }
                        break;
                    }
                case 247:
                    {
                        Interp1(dp, w[5], w[4]);
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        Interp1(dp+dpL, w[5], w[4]);
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
                case 255:
                    {
                        if (Diff(w2[4], w2[2]))
                        {
                            dest[dp] = w[5];
                        }
                        else
                        {
                            Interp1(dp, w[5], w[4]);
                        }
                        if (Diff(w2[2], w2[6]))
                        {
                            dest[dp+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+1, w[5], w[3]);
                        }
                        if (Diff(w2[8], w2[4]))
                        {
                            dest[dp+dpL] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL, w[5], w[7]);
                        }
                        if (Diff(w2[6], w2[8]))
                        {
                            dest[dp+dpL+1] = w[5];
                        }
                        else
                        {
                            Interp1(dp+dpL+1, w[5], w[9]);
                        }
                        break;
                    }
            }		
		}		

		var iter = function() {
			var pattern = 0;
			var flag = 1;

			const YUV1 = w2[5];
			const y1 = (YUV1 & Ymask);
			const u1 = (YUV1 & Umask);
			const v1 = (YUV1 & Vmask);

			for (k=1; k < 10; k++) 
			{
					if (k===5) continue;

					if ( w[k] !== w[5] )
					{
							const YUV2 = w2[k];
							if ( ( Math.abs(y1 - (YUV2 & Ymask)) > trY ) ||
											( Math.abs(u1 - (YUV2 & Umask)) > trU ) ||
											( Math.abs(v1 - (YUV2 & Vmask)) > trV ) )
									pattern |= flag;
					}
					flag <<= 1;
			}
			interp(pattern);
			sp++;
			dp += 2;		
		}
		
		var cycleFirst = function() {
			w[1] = w[2] = src[sp + prevline];
			w[4] = w[5] = src[sp];
			w[7] = w[8] = src[sp + nextline];

			w[3] = src[sp + prevline + 1];
			w[6] = src[sp + 1];
			w[9] = src[sp + nextline + 1];

			w2[2] = src_yuv[sp + prevline];
			w2[4] = w2[5] = src_yuv[sp];
			w2[6] = src_yuv[sp + 1];
			w2[8] = src_yuv[sp + nextline];

			iter();
		}
		
		var cycleMid = function() {
			w[1] = src[sp + prevline - 1];
			w[4] = src[sp - 1];
			w[7] = src[sp + nextline - 1];

			w[2] = src[sp + prevline];
			w[5] = src[sp];
			w[8] = src[sp + nextline];

			w[3] = src[sp + prevline + 1];
			w[6] = src[sp + 1];
			w[9] = src[sp + nextline + 1];
			
			w2[2] = src_yuv[sp + prevline];
			w2[4] = w2[5];
			w2[5] = w2[6];
			w2[6] = src_yuv[sp + 1];
			w2[8] = src_yuv[sp + nextline];

			iter();
		}
		
		var cycleLast = function() {
			w[3] = w[2] = src[sp + prevline];
			w[6] = w[5] = src[sp];
			w[9] = w[8] = src[sp + nextline];

			w[1] = src[sp + prevline - 1];
			w[4] = src[sp - 1];
			w[7] = src[sp + nextline - 1];
			
			w2[2] = src_yuv[sp + prevline];
			w2[4] = src_yuv[sp - 1];
			w2[6] = w2[5] = src_yuv[sp];
			w2[8] = src_yuv[sp + nextline];

			iter();
		}

    for (j=0; j<height; j++)
    {
				prevline = j>0 ? -width : 0;
				nextline = j<height-1 ? width : 0;

				const index_base = j * width;
				cycleFirst();
        for (i = 1; i<width-1; i++)
        {
					const index = index_base + i;
					if (cache_dirty[index] > 0) {
						cycleMid();
						cache_dirty[index] = 0;
					}
					else {
						sp++;
						dp += 2;
					}
        }
				cycleLast();
				
        dp += dpL;
    }
	
	};

})(this);
