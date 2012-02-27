/**
 * @license
 * Hx JavaScript Library v 0.1
 * Written by Neil E. Pearson
 * 
 * Copyright 2012 Helium Studios
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 **/

(function(window, prop) {

var nothing = {},
    noConflict,
    oldHx = prop in window
        ? window[prop]
        : nothing,
    hx;

window[prop] = hx = {
    
    noConflict : function() {
    
        if(!noConflict) {            
    
            if(oldHx === nothing)
                try {
                    delete window[prop];
                } catch(e) {
                    window[prop] = oldHx;
                }
            else
                window[prop] = oldHx;

            noConflict = true;
            
        }
        
        return hx;
    
    }
    
};



;hx.utils = (function(){

    return {

        extend : function(main) {

            var i = 1, j,
                argv = arguments,
                argc = argv.length;

            for(; i < argc; ++i)
                for(j in argv[i])
                    main[j] = argv[i][j];

            return main;

        }

    }

})()

;hx.binary = (function(){

    var md5Offsets = [
        [7, 12, 17, 22],
        [5,  9, 14, 20],
        [4, 11, 16, 23],
        [6, 10, 15, 21]
    ],

    md5Extra = [
        [0,1],
        [1,5],
        [5,3],
        [0,7]
    ],

    rotateLeft = function(v, o) {
        return (v << o) | (v >>> (32 - o));
    },

    add = function(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xFFFF);
    },

    longToString = function(l) {
        var r = '', i;
        for(i = 0; i < 4; i++)
            r += String.fromCharCode((l >> (i * 8)) & 255);
        return r;
    },

    stringToWords = function(string, littleEndian) {
        var ret = [],
            length = string.length / 4,
            i = 0, j, x;
        for(;i < length; i++) {
            x = 0;
            for(j = 4; j--;)
                x |= string.charCodeAt(i * 4 + j) << ((littleEndian ? j : 3 - j) * 8);
            ret.push(x);
        }
        return ret;
    },

    fromCharCode = String.fromCharCode,

    charCodeAt = function(string, index) {
        return string.charCodeAt(index)
    },

    math = Math,
    floor = math.floor,
    ceil = math.ceil,
    pow = math.pow,

    makeCharacterPool = function(spec) {
        var ret = [],
            v, r, i;

        while(spec.length) {
            ret.push(fromCharCode(v = charCodeAt(spec, 0)));
            if(spec.match(/^.[\da-f]{2}/)) {
                r = parseInt(spec.substr(1, 2), 16);
                for(i = 1; i <= r; i++)
                    ret.push(fromCharCode(v + i));
                spec = spec.substr(3);
            } else
                spec = spec.substr(1);
        }

        return ret;

    },
    baseEncoder = function(characterPool, paddingCharacter, caseSensitive) {

        if(typeof characterPool === 'string')
            characterPool = characterPool.split('');

        // characterPool must be an array with a power-of-two count of characters (2, 4, 8 etc to a max of 256)
        if(!characterPool instanceof Array)
            return false;

        var log = math.log,
            i = characterPool.length,
            bitsPerCharacter = log(i) / log(2),
            bytesPerBlock,
            charsPerBlock = bitsPerCharacter,
            reverseLookup = {},
            encode = function(original) {

                var blockCount = ceil(original.length / bytesPerBlock),
                    i = -1, j,
                    high, low, middle, offset, end, byte1, ret = '';

                while(++i < blockCount)
                    for(j = 0; j < charsPerBlock; j++) {
                        low = floor(middle = j * bitsPerCharacter / 8);
                        high = floor(middle + bitsPerCharacter / 8);
                        offset = (middle - low) * 8;
                        end = (bitsPerCharacter + offset) % 8;
                        ret += isNaN(byte1 = charCodeAt(original, i * bytesPerBlock + low))
                            ? paddingCharacter
                            : characterPool[
                                (low < middle
                                    ? ((byte1 & (pow(2, 8 - offset) - 1 - (end > offset ? pow(2, 8 - end) - 1 : 0))) << end) % 255
                                    : 0)
                                |
                                    (offset + bitsPerCharacter > 8 || !j
                                    ? charCodeAt(original, i * bytesPerBlock + high) >>> (8 - end)
                                    : 0)
                            ];
                    }

                return ret;

            };

        encode.encode = function(x){return encode(x)};
        encode.decode = function(encoded) {

                if(!encoded)
                    return '';

                var encodedLength = encoded.length,
                    blockCount = encodedLength / charsPerBlock,
                    i = -1,
                    bytes,
                    j, charIndex,
                    low, middle, high, offset, end,
                    padding = 0;

                if(blockCount !== floor(blockCount))
                    return false;

                while(encoded.substr(encodedLength - 1 - padding, 1) === paddingCharacter)
                    padding++;

                bytes = Array(blockCount * bytesPerBlock - ceil(padding * bitsPerCharacter / 8));

                while(++i < blockCount)
                    for(j = 0; j < charsPerBlock; j++) {
                        charIndex = reverseLookup[encoded.charAt(i * charsPerBlock + j)]
                        if(charIndex !== undefined)
                        {
                            low = floor(middle = i * bytesPerBlock + j * bitsPerCharacter / 8);
                            high = floor(middle + bitsPerCharacter / 8);
                            offset = (middle - low) * 8;
                            end = (bitsPerCharacter + offset) % 8;
                            if(low === high)
                                bytes[low] |= (charIndex << (8 - bitsPerCharacter - offset));
                            else {
                                bytes[low] |= (charIndex >>> end);
                                if(high < bytes.length)
                                    bytes[high] |= ((charIndex << (8 - end)) & 255);
                            }
                        }
                    }

                while(bytes[bytes.length - 1] === undefined)
                    bytes.pop();

                return fromCharCode.apply(0, bytes);
            };

        if(bitsPerCharacter > 8 || bitsPerCharacter <= 0 || bitsPerCharacter !== floor(bitsPerCharacter))
            return false;

        while(charsPerBlock % 8)
            charsPerBlock += bitsPerCharacter;

        bytesPerBlock = charsPerBlock / 8;
        charsPerBlock /= bitsPerCharacter;

        // make a lookup table for faster decoding
        while(i--)
            if(caseSensitive)
                reverseLookup[characterPool[i]] = i;
            else
                reverseLookup[characterPool[i].toUpperCase()] =
                reverseLookup[characterPool[i].toLowerCase()] = i;

        return encode;

    },

    utf8 = function(string) {
        return unescape(encodeURIComponent(string));
    },

    base64 = baseEncoder(makeCharacterPool("A19a19009+/"), '=', 1),
    base16 = baseEncoder(makeCharacterPool("009a05")),

    base64ToWords = function(string) {
        return stringToWords(base64.decode(string));
    },

    sha1Matrix = base64ToWords("WoJ5mW7Z66GPG7zcymLB1g=="),

    md5Matrix = base64ToWords(
        "12qkeOjHt1YkIHDbwb3O7vV8D69Hh8YqqDBGE/1GlQFpgJjYi0T3r///W7GJXNe+a5ARI" +
        "v2YcZOmeUOOSbQIIfYeJWLAQLNAJl5aUem2x6rWLxBdAkQUU9ih5oHn0/vIIeHN5sM3B9" +
        "b01Q2HRVoU7anj6QX876P4Z28C2Y0qTIr/+jlCh3H2gW2dYSL95TgMpL7qREvez6n2u0t" +
        "gvr+8cCibfsbqoSf61O8whQSIHQXZ1NA55tuZ5R+ifPjErFZl9CkiREMq/5erlCOn/JOg" +
        "OWVbWcOPDMyS/+/0fYWEXdFvqH5P/izm4KMBQxROCBGh91N+gr068jUq19K764bTkQ=="),

    startingPoint = base64.decode('Z0UjAe/Nq4mYutz+EDJUdsPS4fA=');

    utf8.encode = function(string) {
        return utf8(string);
    };

    utf8.decode = function(bytes) {
        return decodeURIComponent(escape(bytes));
    };


    return {

        base64 : base64,

        base16 : base16,

        base128 : baseEncoder(makeCharacterPool("03f°3f"), '~', true),
        base2 : baseEncoder(makeCharacterPool("001")),
        base8 : baseEncoder(makeCharacterPool("007"), '='),
        base4 : baseEncoder('.oO0', '', true),
        base32 : baseEncoder(makeCharacterPool('a19105'), '0'),

        utf8 : utf8,

        sha1 : function(string, raw) {

            string += fromCharCode(128);

            var H = stringToWords(startingPoint),
                len = string.length,
                l = len / 4 + 2,
                l2 = (len - 1) * 8,
                N = ceil(l / 16),
                M = Array(N),
                i = 0, j, s, T,
                W = Array(80),
                w = Array(5),
                ret = '',
                max = 0xffffffff;

            for(; i < N; i++) {
                M[i] = Array(16);
                for(j = 0; j < 16; j++)
                    M[i][j] =
                        (charCodeAt(string, i * 64 + j * 4) << 24) |
                        (charCodeAt(string, i * 64 + j * 4 + 1) << 16) |
                        (charCodeAt(string, i * 64 + j * 4 + 2) << 8) |
                        (charCodeAt(string, i * 64 + j * 4 + 3));
            }

            M[N - 1][14] = floor(l2 / pow(2, 32));
            M[N - 1][15] = l2 & max;

            for(i = 0; i < N; i++) {

                for(j = 16; j--;)
                    W[j] = M[i][j];

                for(j = 16; j < 80; j++)
                    W[j] = rotateLeft(W[j - 3] ^ W[j - 8] ^ W[j - 14] ^ W[j - 16], 1);

                for(j = 5; j--;)
                    w[j] = H[j];

                for(j = 0; j < 80; j++) {
                    s = floor(j / 20);
                    T = (rotateLeft(w[0], 5) + (
                        (s === 0) ? (w[1] & w[2]) ^ (~w[1] & w[3]) :
                        (s === 2) ? (w[1] & w[2]) ^ (w[1] & w[3]) ^ (w[2] & w[3]) :
                        w[1] ^ w[2] ^ w[3]
                    ) + w[4] + sha1Matrix[s] + W[j]) & max;
                    w[4] = w[3];
                    w[3] = w[2];
                    w[2] = rotateLeft(w[1], 30);
                    w[1] = w[0];
                    w[0] = T;
                }

                for(j = 5; j--;)
                    H[j] = add(H[j], w[j]);
            }

            for(j = 0; j < 5; j++)
                for(i = 3; i >= 0; i--)
                    ret += fromCharCode((H[j] >>> (i * 8)) & 255);

            return raw ? ret : base16(ret);

        },

        md5 : function(string, raw) {

            var words = stringToWords(string + fromCharCode(128), true),
                stringLength = string.length,
                quadrants = stringToWords(startingPoint),
                accumulator = [], quarter, k, ret='',
                q = [], i, j, length = words.length;

            if(!(length % 16))
                words.push(0);

            while((length = words.length) % 16)
                words.push(0);

            words[length - 2] = stringLength << 3;
            words[length - 1] = stringLength >>> 29;

            for(k = 0; k < length; k += 16) {

                for(i = 4; i--;)
                    accumulator[i] = quadrants[i];

                for(quarter = 0; quarter < 4; quarter++)
                    for(i = 0; i < 16; i++) {
                        for(j = 4; j--;)
                            q[j] = quadrants[(16 + j - i) % 4];
                        quadrants[(16 - i) % 4] = add(
                            rotateLeft(
                                add(
                                    q[0],
                                    add(
                                        add(
                                            quarter === 3 ?  q[2] ^ (q[1]  |  ~q[3])         :
                                            quarter === 2 ?  q[1] ^  q[2]  ^   q[3]          :
                                            quarter       ? (q[1] &  q[3]) | ( q[2] & ~q[3]) :
                                                            (q[1] &  q[2]) | (~q[1] & q[3]),
                                            words[k + (md5Extra[quarter][0] + md5Extra[quarter][1] * (i % 16)) % 16]
                                            ),
                                        md5Matrix[quarter * 16 + i]
                                        )
                                    ),
                                md5Offsets[quarter][i % 4]
                                ),
                            q[1]
                        );
                    }
                i = 4;
                while(i--)
                    quadrants[i] = add(quadrants[i], accumulator[i]);
            }

            for(i = 0; i < 4; i++)
                ret += longToString(quadrants[i]);

            return raw ? ret : base16(ret);
        }

    };


})()

;hx.Colour = hx.Color = (function(){

    var extend = hx.utils.extend,
        slice = Array.prototype.slice,

        constrain = function(val, min, max) {
            return Math.max(Math.min(parseFloat(val), max), min);
        },

        hsl2rgb = function(h, s, l) {

            s = constrain(s, 0, 1);
            l = constrain(l, 0, 1);

            if(!s)
                return [s = Math.round(l * 255), s, s];

            while(h < 0)
                h += 360;

            h %= 360;

            var ret, i = 3, x;

            switch(Math.floor(h / 60)) {
                case 0:ret = [255, h / 60 * 256, 0];break;
                case 1:ret = [(1 - (h - 60) / 60) * 256, 255, 0];break;
                case 2:ret = [0, 255, (h - 120) / 60 * 256];break;
                case 3:ret = [0, (1 - (h - 180) / 60) * 256, 255];break;
                case 4:ret = [(h - 240) / 60 * 256, 0, 255];break;
                case 5:ret = [255, 0, (1 - (h - 300) / 60) * 256];
            }

            while(i--) {
                x = ret[i];
                x += (1 - s) * (127 - x);
                x = l < .5
                    ? l * 2 * x
                    : l * 2 * (255 - x) + 2 * x - 255;
                ret[i] = constrain(x, 0, 255);
            }

            return ret;

        },

        rgb2hsl = function(r, g, b) {

            var max = Math.max(r, g, b),
                min = Math.min(r, g, b),
                del = max - min,
                l = (max + min) / 510,
                ret = [0, 0, l], h;

            r = constrain(r, 0, 255);
            g = constrain(g, 0, 255);
            b = constrain(b, 0, 255);

            if(del) {

                if(l % 1)
                    ret[1] = del / (l < .5 ? max + min : 510 - max - min);

                switch(max) {
                    case r:h = (g - b) / del;break;
                    case g:h = 2 + (b - r) / del;break;
                    default:h = 4 + (r - g) / del;
                }

                h *= 60;

                while(h < 0)
                    h += 360;

                ret[0] = h % 360;

            }

            return ret;

        },

        Colour = function(original) {

            if(!(this instanceof Colour))
                return new Colour(original);

            this._ = {
                r: 0, // red
                g: 0, // green
                b: 0, // blue
                a: 1, // alpha
                h: 0, // hue
                s: 1, // sat
                l: 0  // lum
            };

            this.set(original);

        },

        rgbaMethod = function(channel, limit) {

            var isAlpha = channel === 'a';

            return function(val, offset) {

                var _ = this._,
                    ret = _[channel],
                    hsl;

                if(val != null) {

                    if(typeof val == 'string') {

                        if(val.match(/%$/))
                            val = parseFloat(val) / 100 * limit;

                        else
                            val = parseFloat(val);
                    }

                    _[channel] = constrain(val + (offset ? ret : 0), 0, limit);

                    if(!isAlpha) {
                        hsl = rgb2hsl(_.r, _.g, _.b);
                        if((_.l = hsl[2]) % 1)
                            if(_.s = hsl[1])
                                _.h = hsl[0]
                    }

                    return this;

                }

                return !isAlpha ? Math.round(ret) : ret;

            }
        },

        hslMethod = function(property, limit) {

            return function(val, offset) {

                var t = this,
                    _ = t._,
                    ret = _[property];

                if(val != null) {

                    if(typeof val == 'string') {

                        if(val.match(/%$/))
                            val = parseFloat(val) / 100 * limit;

                        else
                            val = parseFloat(val);
                    }

                    if(offset)
                        val += ret;

                    if(limit == 360) {
                        while(val < 0)
                            val += 360;
                        val %= 360;
                    } else
                        val = constrain(val, 0, limit);

                    return t.rgb(hsl2rgb(
                        property == 'h' ? val : _.h,
                        property == 's' ? val : _.s,
                        property == 'l' ? val : _.l
                    ));

                }

                return ret;

            }

        },

        addCompoundMethods = function(methods) {

            methods = methods.split(',');

            var name = '', nameA,
                i = 0, l = methods.length,
                prototype = Colour.prototype;

            for(; i < l; ++i)
                name += methods[i].substr(0, 1);

            nameA = name + 'a';

            prototype[nameA] = function() {

                var t = this,
                    ret, i;

                if(arguments.length)
                    return t[name].apply(t, arguments);

                for(ret = [], i = 0; i < l; ++i)
                    ret.push(t[methods[i]]());

                ret.push(t.alpha());

                return ret;

            };

            prototype[name] = function() {

                var t = this, i = l,
                    argv = slice.call(arguments),
                    argc = argv.length;

                if(argc) {

                    if(argv[0] instanceof Array)
                        return t[name].apply(t, argv[0]);

                    if(argc >= l) {
                        while(i--)
                            t[methods[i]](argv[i]);

                        t.alpha(argc > l ? argv[l] : 1)
                    }

                    return t;
                }

                return t[nameA]().slice(0, l);
            }


        },

        byte2hex = function(val) {
            return Math.round(val | 0x100).toString(16).substr(1);
        },

        Gradient = function(definition) {

            if(!(this instanceof Gradient))
                return new Gradient(definition);

            var t = this,

            // can't use regular split() because of commas in rgb() type colour
            // defs, so have to go the long way.

                parts = [''],
                i = 0, x = 0,
                l = definition.length,
                chr, brackets = 0;

            for(; i < l; ++i) {

                switch(chr = definition.substr(i, 1)) {

                    case '(':
                        ++brackets;
                        break;

                    case ')':
                        --brackets
                        break;

                    case !brackets && ',':
                        parts[x] = parts[x].replace(/^\s+|\s+$/g, '');
                        parts[++x] = '';
                        continue;
                }

                parts[x] += chr;
            }

            t.stops = [];

            for(i = 0, l = parts.length; i < l; ++i)
                if(parts[i].match(/^(top|bottom|left|right)$/i))
                    t.from = parts[i].toLowerCase();
                else if(x = parts[i].match(/^\s*(.*?)\s+(\d+)%?\s*$/))
                    t.addStop(x[1], parseInt(x[2]) / 100);

        },

        gradientStopComparer = function(a, b) {
            return a.position - b.position;
        };

    Colour.prototype = {

        set : function() {

            var t = this,
                argv = slice.call(arguments),
                m;

            if(argv.length > 1)
                return t.rgb.apply(t, argv);

            argv = argv[0];

            if(typeof argv === 'string') {

                if(m = argv.match(/^\s*#?([\da-f]{3,8})\s*$/))
                    return t[m[1].length <= 6 ? 'hex' : 'hexa'](m[1]);

                if(m = argv.match(/^\s*(rgba?|hsla?)\s*\(\s*(.*?)\s*\)\s*$/i))
                    return t[m[1].toLowerCase()](m[2].split(/\s*,\s*/));

            }

            else if(argv instanceof Array)
                t.set.apply(t, argv);

            return t;

        },

        hex : function(val, allowTransparent) {
            var t = this;
            if(typeof val === 'string') {
                val = parseInt(val.replace(/[^\da-f]/ig, '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16);
                return t
                    .red(val >> 16 & 255)
                    .green(val >> 8 & 255)
                    .blue(val & 255)
                    .alpha((val >> 24 & 255) / 255 || (allowTransparent ? 0 : 1));
            }
            return (val === false ? '' : '#')
                + byte2hex(t.red())
                + byte2hex(t.green())
                + byte2hex(t.blue());
        },

        hexa : function(val) {
            var t = this,
                a = t.alpha();
            if(typeof val === 'string')
                return t.hex(val, true);
            return (val === false ? '' : '#')
                + (a < 1 ? byte2hex(a * 255) : '')
                + t.hex(false)
        },

        hue : hslMethod('h', 360),

        sat : hslMethod('s', 1),

        lum : hslMethod('l', 1),

        red : rgbaMethod('r', 255),

        green : rgbaMethod('g', 255),

        blue : rgbaMethod('b', 255),

        alpha : rgbaMethod('a', 1),

        toString : function(format) {

            var t = this,
                parts;

            switch(format = (format || 'hex').toLowerCase()) {

                case 'hex':
                case 'hexa':
                    return t[format]();

                case 'rgb':
                case 'rgba':
                case 'hsl':
                case 'hsla':
                    parts = t[format]();
                    if(format.substr(0, 1) === 'h') {
                        parts[1] = Math.round(parts[1] * 100) + '%';
                        parts[2] = Math.round(parts[2] * 100) + '%';
                    }
                    if(parts[3])
                        parts[3] = Math.round(parts[3] * 100) / 100;

                    return format + '(' + parts.join(',') + ')';

                default:
                    return '';
            }

        }

    };

    addCompoundMethods('red,green,blue');
    addCompoundMethods('hue,sat,lum');

    Gradient.prototype = {

        addStop : function(colour, position) {

            var stops = this.stops;

            stops.push(extend((colour instanceof Colour) ? colour : Colour(colour), {position: position}));

            stops.sort(gradientStopComparer);

            return this;

        },

        hasAlpha : function() {

            var stops = this.stops,
                i = stops.length;

            while(i--)
                if(stops[i].alpha() != 1)
                    return true;

        }

    };

    return extend(Colour, {
        Gradient: Gradient
    });

})();

;hx.StyleSheet = (function(){
    
    var declarationPattern = /^\s*((?:-?[a-z])+)\s*:\s*(.*?)\s*(!important)?\s*;?\s*$/i,
        ruleSetSplitPattern = /}\s*/,
        ruleSetPattern = /^\s*(.*?)\s*\{\s*(.*?)\s*$/,
        selectorSplitPattern = /\s*,\s*/,
        commentPattern = /\/\*[\s\S]*?\*\//g,
        collapseWhiteSpacePattern = /\s+/g,
        declarationSplitPattern = /\s*;(?!\w+,)\s*/, // lookahead is to protect dataurls,
        colourReplacePattern = /#[\da-f]{3,8}|(rgb|hsl)(a)?\(.*?\)/ig,
        emptyString = '',
        space = ' ',
        comma = ',',
        hyphen = '-',

        left = 'left',
        top = 'top',
        right = 'right',
        bottom = 'bottom',

        linearGradientPattern = /^linear-gradient\((.*)\)$/,

        msie, moz, opera, webkit, chrome, safari, //firefox,
        version, match,
        userAgent = navigator.userAgent,
        webkitLegacyGradients,

        extend = hx.utils.extend,
        doc = document,

        Colour = hx.Color,

        StyleSheet = function(source) {

            var t = this;

            if(!(t instanceof StyleSheet))
                return new StyleSheet(source);

            t.ruleSets = [];

            if(typeof source === 'string')
                parse.call(this, source);

            else if(typeof source === 'object') {
                t.sheet = source;
                parse.call(this, getCssText(source));
            }

        },

        getCssText = function(object) {
            return object && object.innerHTML || (object.ownerNode && object.ownerNode.innerHTML) || object.cssText || emptyString;
        },

        Declaration = function(declarationString) {
            
            var parts = declarationString.match(declarationPattern),
                t = this;
                
            t.property = parts[1];
            t.value = parts[2];
            if(parts[3])
                t.important = true;
            
        },
        
        RuleSet = function(ruleSetString) {
            
            var t = this,
                parts = ruleSetString.match(ruleSetPattern),
                selectors = (parts[1] || emptyString).split(selectorSplitPattern),
                declarations = [],
                declarationStrings = (parts[2] || emptyString).split(declarationSplitPattern),
                l = declarationStrings.length, i, s;

            for(i = 0; i < l; ++i)
                if(s = declarationStrings[i])
                    declarations.push(new Declaration(s));
                
            t.selectors = selectors;
            t.declarations = declarations;
            
        },
        
        parse = function(styleSheetString, insertBefore) {
            
            var ruleSets = styleSheetString
                    .replace(commentPattern, emptyString)
                    .replace(collapseWhiteSpacePattern, space)
                    .split(ruleSetSplitPattern),
                l = ruleSets.length, i, r,
                newSet = insertBefore ? [] : insertBefore,
                rules = this.ruleSets;
                
            for(i = 0; i < l; ++i)
                if(r = ruleSets[i])
                    (newSet || rules).push(new RuleSet(r));
            
            if(newSet)
                newSet.push.apply(this.ruleSet = newSet, rules);
            
            return this;
            
        },

        gradientToCss = function(gradient) {

            var stops = gradient.stops,
                lastStop = stops.length - 1,
                prefix = moz || webkit || msie || opera,
                from = gradient.from,
                backwards = (from === bottom || from === right),
                i = 0, l = stops.length,
                stopString = [], colour, position,
                format = gradient.hasAlpha() ? 'rgba' : 'hex';

            for(; i < l; ++i) {
                colour = stops[i].toString(format);
                position = Math.round(stops[i].position * 100) + '%';
                stopString.push(webkitLegacyGradients
                    ? 'color-stop(' + position + comma + colour + ')'
                    : colour + space + position
                );
            }

            stopString = ( webkitLegacyGradients
                ?    (from === right ? right : left) +
                    space +
                    (from === bottom ? bottom : top) +
                    comma +
                    (from === left ? left : right) +
                    space +
                    (from === top ? bottom : top)

                : from
            ) + comma + stopString.join(comma);

            if(msie) {
                if(version < 9) {
                    return "progid:DXImageTransform.Microsoft.gradient(startColorstr='" +
                        stops[backwards ? lastStop : 0].hexa() + "',endColorstr='" +
                        stops[backwards ? 0 : lastStop].hexa() + "',GradientType=" +
                        ((from === left || from === right) ? 1 : 0) + ')';
                }
                else if(version == 9)
                    return 'url(data:image/svg+xml,'
                        + escape(gradientToSvg(gradient)) + ')';

            }

            if(webkitLegacyGradients)
                return '-webkit-gradient(linear,' + stopString + ')';

            return (prefix ? hyphen + prefix + hyphen : emptyString) +
                'linear-gradient(' + stopString + ')';

        },

        gradientToSvg = function(gradient) {

            var stops = gradient.stops,
                from = gradient.from,
                i, l = stops.length,
                ret = '<?xml version="1.0" ?>' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">' +
                    '<linearGradient id="a" gradientUnits="userSpaceOnUse"',
                coords = {
                    x1: from === right ? 1 : 0,
                    y1: from === bottom ? 1 : 0,
                    x2: from === left ? 1 : 0,
                    y2: from === top ? 1 : 0
                }, i, stop;

            for(i in coords)
                ret += space + i + '="' + (coords[i] * 100) + '%"';

            ret += '>';

            for(i = 0; i < l; ++i) {
                stop = stops[i];
                ret += '<stop offset="' + Math.round(stop.position * 100) + '%" stop-color="' +
                    stop.hex() + '" stop-opacity="' + stop.alpha() + '"/>';
            }

            return ret + '</linearGradient><rect x="0" y="0" width="1" height="1" fill="url(#a)" /></svg>'

        },
        
        adjustDeclarations = function(callback) {
            
            var ruleSets = this.ruleSets,
                declarations,
                i, l, k, d;
                
            for(i = 0, l = ruleSets.length; i < l; ++i) {
                declarations = ruleSets[i].declarations;
                for(k = declarations.length; k--;) {
                    d = declarations[k];
                    callback.call(d, d.property, d.value)
                }

            }

            return this;
            
        },

        adjustColours = function(callback) {
            
            adjustUserCallback = callback;
            return adjustDeclarations.call(this, function(undefined, value){
                this.value = value.replace(colourReplacePattern, adjustColoursReplaceCallback);
            });
            
        },
        
        adjustColoursReplaceCallback = function(original, method, alpha) {
            
            var colour = Colour(original);
            adjustUserCallback.call(adjustDeclaration, colour);
            return colour.toString(method ? method + alpha : colour.alpha() !== 1 ? 'hexa' : 'hex');
            
        },
        
        adjustUrlsCallback = function(property, value) {
            
            this.value = value.replace(/url\((?!=\w+\/\w+;)([^)]?)/, adjustUrlsReplaceCallback);
            
        },
        
        adjustUrlsReplaceCallback = function(undefined, url) {
            
            return 'url(' + adjustUserCallback(url);
            
        },
        
        adjustUserCallback,
        adjustDeclaration;

    StyleSheet.prototype = {

        backfit : function() {
            
            var t = this,
                ruleSets = t.ruleSets,
                i = ruleSets.length;

            while(i--)
                ruleSets[i].backfit();

            return t;
            
        },

        toString : function() {

            var ret = emptyString,
                ruleSets = this.ruleSets,
                i = 0, l = ruleSets.length;

            for(;i < l; ++i)
                ret += ruleSets[i].toString();

            return ret;

        },

        apply : function(sheet, position) {

            var t = this,
                output = '',
                cssText = 'cssText';

            position = position || 0;

            if(sheet)
                t.sheet = (sheet.rules || sheet.cssRules)
                    ? sheet
                    : sheet.sheet || sheet.styleSheet;
            else
                sheet = t.sheet;

            if(!sheet) {

                doc.getElementsByTagName('head')[0]
                    .appendChild(sheet = doc.createElement('style'));

                t.sheet = sheet = sheet.sheet || sheet.styleSheet;

            }

            if(position)
                output = getCssText(sheet);

            output = (position > 0 ? output : '') + t.toString() + (position < 0 ? output : '');

            if(cssText in sheet)
                sheet[cssText] = output;

            else if(sheet.styleSheet)
                sheet.styleSheet[cssText] = output;

            else if(sheet.sheet)
                sheet.innerHTML = output;

            else
                sheet.ownerNode.innerHTML = output;

            return t;

        },
        
        append : parse,
        
        prepend : function(source) {
            
            return parse.call(this, source, true);
            
        },

        adjustColours : adjustColours,
        adjustColors : adjustColours,
        
        adjustDeclarations : adjustDeclarations,
        
        adjustUrls : function(callback) {
            
            adjustUserCallback = callback;
            return adjustDeclarations.call(this, adjustUrlsCallback);
            
        }

    };

    Declaration.prototype = {

        toString : function() {
            var t = this;
            return t.property + ':' + t.value + (t.important ? '!important' : '') + ';';
        },

        backfit : function() {

            var t = this,
                property = (t.property || emptyString).toLowerCase(),
                value = t.value;

            if(property && value) {

                // linear gradient backgrounds

                if(property === 'background' && (match = value.match(linearGradientPattern))) {

                    value = gradientToCss(Colour.Gradient(match[1]));

                    if(msie && version <= 8)
                        property = 'filter';

                }

                // border radii

                else if(match = property.match(/^(border)(?:-(\w+)-(\w+))?(-radius)/)) {

                    if(webkit)
                        property = hyphen + webkit + hyphen + property;

                    else if(moz)
                        property = hyphen + moz + hyphen + match[1] + match[4] +
                        (match[2] ? hyphen + match[2] + match[3] : emptyString);

                }

                // box shadows

                else if(property === 'box-shadow' && (match = moz || webkit))

                    property = hyphen + match + hyphen + property;

                // opacity

                else if(property === 'opacity' && msie && version < 9) {

                    property = 'filter';
                    value = 'alpha(opacity=' + (parseFloat(value || 0) * 100) + ')';

                    /**
                     * @todo support multiple filters
                     */
                }

                t.property = property;
                t.value = value;

            }

            return t;

        }

    };
    
    RuleSet.prototype = {
        
        selector : function() {
            return this.selectors.join(comma);
        },
        
        append : function(other) {
            var declarations = this.declarations;
            declarations.splice(declarations.length, 0, other.declarations);
        },

        toString : function() {

            var t = this,
                declarations = t.declarations,
                i = 0, l = declarations.length,
                ret = t.selector() + '{';

            for(; i < l; ++i)
                ret += declarations[i].toString();

            return ret + '}';

        },

        backfit : function() {

            var declarations = this.declarations,
                i = declarations.length;

            while(i--)
                declarations[i].backfit();

            return this;

        }
    };
    
    if(match = userAgent.match(/MSIE (\d+\.?\d*)/))
        msie = 'ms';

    else if(match = userAgent.match(/(?:Chrome|Safari)\/(\d+\.?\d*)/)) {
        webkit = 'webkit';
        chrome = !!userAgent.match(/Chrome/);
        safari = !!userAgent.match(/Safari/);
    }

    else if(match = userAgent.match(/Opera\/(\d+\.?\d*)/))
        opera = 'o';

    else if(match = userAgent.match(/Firefox\/(\d+\.?\d*)/) || userAgent.match(/Mozilla\/(\d+\.?\d*)/)) {
        moz = 'moz';
//        firefox = !!userAgent.match(/Firefox/);
    }

    if(match)
        version = parseFloat(match[1]);

    if(match = userAgent.match(/Version\/(\d+\.?\d*)/))
        version = parseFloat(match[1]);

    webkitLegacyGradients = (chrome && version < 10) || (safari && version < 5.1);

    return extend(StyleSheet, {
        RuleSet: RuleSet,
        Declaration: Declaration
    });
    
})();

})(this, 'hx')

