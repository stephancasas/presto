#! /usr/bin/env node

var fs = require('fs');
var path$1 = require('path');
var cheerio = require('cheerio');
var url = require('url');
var babel = require('@babel/core');
var require$$0 = require('util');
var require$$0$1 = require('events');
var assert = require('assert');
var readline = require('readline');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path$1);
var cheerio__default = /*#__PURE__*/_interopDefaultLegacy(cheerio);
var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);
var require$$0__default$1 = /*#__PURE__*/_interopDefaultLegacy(require$$0$1);
var assert__default = /*#__PURE__*/_interopDefaultLegacy(assert);
var readline__default = /*#__PURE__*/_interopDefaultLegacy(readline);

function resolveSnowbladeContext() {
    let code;
    try {
        code = require('vscode');
    }
    catch (err) {
    }
    if (!code?.workspace) {
        let ascend = path$1.resolve(__dirname)
            .split(path$1.sep)
            .includes('node_modules')
            ? 3
            : 2;
        ascend = 2;
        return `${__dirname.split(path$1.sep).slice(0, -ascend).join(path$1.sep)}${path$1.sep}`;
    }
    else {
        const folder = code.workspace.workspaceFolders?.[0];
        return `${folder.uri.path}${path$1.sep}`;
    }
}
function absolutePath(filePath, realPath = false) {
    const abs = `${path$1.isAbsolute(filePath) ? '' : resolveSnowbladeContext()}${filePath}`;
    return realPath ? fs.realpathSync(abs) : abs;
}
function dir(filePath) {
    return `${path$1.dirname(filePath)}${path$1.sep}`;
}
function linkProperties(target, source, properties) {
    const props = properties.reduce((acc, prop) => {
        acc[prop] = {
            get() {
                return source[prop];
            }
        };
        return acc;
    }, {});
    Object.defineProperties(target, props);
}
function resolveCharContext(str, pos) {
    let chars = [];
    let rel = 'html';
    let attr = [];
    let offset;
    for (offset = 1; offset <= pos; offset++) {
        const char = str.charAt(pos - offset);
        if (attr.length === 0 && (char === ' ' || char === '\n'))
            continue;
        if (chars.includes('"')) {
            chars.push(char);
            if (!chars.includes('='))
                break;
            if (char === ' ')
                break;
            attr.push(char);
        }
        else {
            chars.push(char);
        }
    }
    return {
        rel: attr.length !== 0 ? attr.reverse().slice(0, -1).join('') : rel,
        offset
    };
}
function resolveCharCoordinates(str, ln, col) {
    const lines = str.split('\n');
    let pos = 0;
    lines.slice(0, ln - 1).map((line) => {
        pos = pos + line.length + 1;
    });
    pos = pos + col;
    return pos;
}
function replaceAt(str, index, oldValue, newValue) {
    return str.substr(0, index) + newValue + str.substr(index + oldValue.length);
}
function fill(num, char = ' ') {
    return Array(num + 1)
        .map(() => null)
        .join(char);
}

class ComponentImportManager {
    constructor(component) {
        this.component = component;
        linkProperties(this, this.component, ['componentProvider']);
        this.prepareImports();
    }
    prepareImports() {
        const $ = cheerio__default['default'].load(this.component.source);
        this.localImports = [];
        this.imports = [];
        const links = [...$('link[snowblade]')];
        links.map((link) => {
            const component = this.componentProvider.getComponentByHref(this, link.attribs.href);
            this.localImports.push(component);
            this.imports.push(component);
        });
        this.imports = this.imports.concat(this.componentProvider.included);
    }
    prepareAliases() {
    }
    getComponentByExpressionName(expressionName) {
        return expressionName == 'snowblade-root'
            ?
                this.componentProvider.components.slice(-1)[0]
            : this.imports.filter((i) => i.expressionName === expressionName)[0];
    }
}

class SnowbladeError extends Error {
    constructor(props) {
        super();
        const defaults = Object.assign({
            name: 'SnowbladeError',
            message: "A generic SnowbladeError occurred. That's all we know.",
            code: Errors.UNKNOWN,
            showStack: false
        }, props);
        this.name = defaults.name;
        this.message = defaults.message;
        this.code = defaults.code;
        this.showStack = defaults.showStack;
    }
}
class SnowbladeComponentError extends SnowbladeError {
    constructor(props) {
        if (typeof props.message !== 'string')
            props.messageBuilder = props.message;
        super(props);
        const defaults = Object.assign({
            name: 'SnowbladeComponentError',
            message: "A generic SnowbladeComponentError occurred. That's all we know.",
            showStack: true
        }, props);
        this.component = props.component;
        this.message = defaults.message;
        this.name = defaults.name;
        this.showStack = defaults.showStack;
        this.buildStack();
        this.buildMessage(props);
    }
    buildMessage(props) {
        this.message =
            typeof props.messageBuilder === 'undefined'
                ? this.message
                : props.messageBuilder(this);
    }
    buildStack() {
        this.stackArr = ['Import Stack:'];
        let component = this.component;
        while (component.context instanceof ComponentImportManager) {
            const file = typeof component.file === 'undefined' ? component.path : component.file;
            this.stackArr.push(`${fill(4)}- ${file}`);
            component = component.context.component;
        }
        this.stackArr.push(`${fill(4)}- ${component.path}`);
        this.stack = this.stackArr.join('\n');
    }
}
function error(err) {
    throw err;
}
var Errors;
(function (Errors) {
    Errors["UNKNOWN"] = "UNKNOWN_SNOWBLADE_ERROR";
    Errors["NO_SUCH_FILE"] = "NO_SUCH_FILE";
    Errors["CONFIG_BAD_PROP_TYPE"] = "CONFIG_BAD_PROP_TYPE";
    Errors["CONFIG_BAD_PROP_VALUE"] = "CONFIG_BAD_PROP_VALUE";
    Errors["CONFIG_MISSING_PROP"] = "CONFIG_MISSING_PROP";
    Errors["COMPONENT_NO_META"] = "COMPONENT_NO_META";
    Errors["COMPONENT_NO_FILE"] = "COMPONENT_NO_FILE";
    Errors["EXPRESSION_REQUIRED_PROP"] = "EXPRESSION_REQUIRED_PROP";
    Errors["EXPRESSION_ACTION_EXISTS"] = "EXPRESSION_ACTION_EXISTS";
    Errors["EXPRESSION_PROP_EXISTS"] = "EXPRESSION_PROP_EXISTS";
    Errors["COMPONENT_DEFAULT_SLOT_MIX"] = "COMPONENT_DEFAULT_SLOT_MIX";
})(Errors || (Errors = {}));
function errConfigBadPropType(prop, value) {
    return new SnowbladeError({
        code: Errors.CONFIG_BAD_PROP_TYPE,
        name: 'SnowbladeConfigError',
        message: `Property \`${prop}\` of given config has incorrect type \`${typeof value}\`.`
    });
}
function errConfigBadPropValue(prop, value) {
    return new SnowbladeError({
        code: Errors.CONFIG_BAD_PROP_VALUE,
        name: 'SnowbladeConfigError',
        message: `Property \`${prop}\` of given config has incorrect value \`${value}\`.`
    });
}
function errConfigMissingProp(prop) {
    return new SnowbladeError({
        code: Errors.CONFIG_MISSING_PROP,
        name: 'SnowbladeConfigError',
        message: `Required property \`${prop}\` is missing for given config.`
    });
}
function errComponentNoFile(component) {
    return new SnowbladeComponentError({
        component: component,
        code: Errors.COMPONENT_NO_FILE,
        name: 'SnowbladeComponentError',
        message: function (err) {
            return err.stackArr.length === 2
                ? `No such file found for input component at path:\n${fill(30)}-> ${err.component.path}.`
                : `No such file found for imported component at:\n${fill(30)}-> ${err.component.path},\n${fill(29)}linked in:\n${fill(30)}-> ${err.component.context.component.file}.`;
        }
    });
}
function errComponentNoMeta(path) {
    return new SnowbladeError({
        code: Errors.COMPONENT_NO_META,
        name: 'SnowbladeComponentError',
        message: `Imported component at ${path} contains no <meta> tag for named export.`
    });
}
function errComponentDefaultSlotMix(path) {
    return new SnowbladeError({
        code: Errors.COMPONENT_DEFAULT_SLOT_MIX,
        name: 'SnowbladeComponentError',
        message: `Component at "${path}" cannot declare more than one slot when a default/unnamed slot is declared.`
    });
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var Contracts = createCommonjsModule(function (module, exports) {
/**
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagTypes = exports.MustacheTypes = void 0;
(function (MustacheTypes) {
    MustacheTypes["SMUSTACHE"] = "s__mustache";
    MustacheTypes["ESMUSTACHE"] = "es__mustache";
    MustacheTypes["MUSTACHE"] = "mustache";
    MustacheTypes["EMUSTACHE"] = "e__mustache";
})(exports.MustacheTypes || (exports.MustacheTypes = {}));
(function (TagTypes) {
    TagTypes["TAG"] = "tag";
    TagTypes["ETAG"] = "e__tag";
})(exports.TagTypes || (exports.TagTypes = {}));
});

var utils = createCommonjsModule(function (module, exports) {
/*
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLineAndColumn = exports.isEscapedMustache = exports.isSafeMustache = exports.isMustache = exports.isEscapedTag = exports.isTag = void 0;

/**
 * Returns true when token is a tag with a given name
 */
function isTag(token, name) {
    if (token.type === Contracts.TagTypes.TAG || token.type === Contracts.TagTypes.ETAG) {
        return name ? token.properties.name === name : true;
    }
    return false;
}
exports.isTag = isTag;
/**
 * Returns true when token is an escape tag with a given name
 */
function isEscapedTag(token, name) {
    if (token.type === Contracts.TagTypes.ETAG) {
        return name ? token.properties.name === name : true;
    }
    return false;
}
exports.isEscapedTag = isEscapedTag;
/**
 * Returns true when token.type is a mustache type
 */
function isMustache(token) {
    return (token.type === Contracts.MustacheTypes.EMUSTACHE ||
        token.type === Contracts.MustacheTypes.ESMUSTACHE ||
        token.type === Contracts.MustacheTypes.MUSTACHE ||
        token.type === Contracts.MustacheTypes.SMUSTACHE);
}
exports.isMustache = isMustache;
/**
 * Returns true when token.type is a safe mustache type
 */
function isSafeMustache(token) {
    return token.type === Contracts.MustacheTypes.ESMUSTACHE || token.type === Contracts.MustacheTypes.SMUSTACHE;
}
exports.isSafeMustache = isSafeMustache;
/**
 * Returns true when toke.type is an escaped mustache type
 */
function isEscapedMustache(token) {
    return token.type === Contracts.MustacheTypes.EMUSTACHE || token.type === Contracts.MustacheTypes.ESMUSTACHE;
}
exports.isEscapedMustache = isEscapedMustache;
/**
 * Returns line and column number for a given lexer token
 */
function getLineAndColumn(token) {
    if (token.type === 'newline' || token.type === 'raw') {
        return [token.line, 0];
    }
    return [token.loc.start.line, token.loc.start.col];
}
exports.getLineAndColumn = getLineAndColumn;
});

var Detector = createCommonjsModule(function (module, exports) {
/**
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMustache = exports.getTag = void 0;
/**
 * The only regex we need in the entire lexer. Also tested
 * with https://github.com/substack/safe-regex
 */
const TAG_REGEX = /^(\s*)(@{1,2})(!)?([a-zA-Z._]+)(\s{0,2})/;
/**
 * Returns runtime tag node if tag is detected and is a registered tag
 */
function getTag(content, filename, line, col, tags, claimTag) {
    const match = TAG_REGEX.exec(content);
    /**
     * Return when their is no match
     */
    if (!match) {
        return null;
    }
    const name = match[4];
    let tag = tags[name];
    /**
     * See if the tag can be claimed
     */
    if (!tag && claimTag) {
        tag = claimTag(name);
    }
    /**
     * Return when not a registered tag
     */
    if (!tag) {
        return null;
    }
    const escaped = match[2] === '@@';
    const selfclosed = !!match[3];
    const whitespaceLeft = match[1].length;
    const whitespaceRight = match[5].length;
    const seekable = tag.seekable;
    const block = tag.block;
    const noNewLine = !!tag.noNewLine;
    /**
     * Advanced the col position
     */
    col += whitespaceLeft + match[2].length + name.length + whitespaceRight;
    if (selfclosed) {
        col++;
    }
    /**
     * Seekable tags without the brace in same line are invalid
     */
    const hasBrace = seekable && content[col] === '(';
    return {
        name,
        filename,
        seekable,
        selfclosed,
        block,
        line,
        col,
        escaped,
        hasBrace,
        noNewLine,
    };
}
exports.getTag = getTag;
/**
 * Returns the runtime mustache node if mustache is detected. It will look for 3 types of
 * mustache statements.
 *
 * - Comments `{{-- --}}`
 * - Safe Mustache `{{{ }}}`
 * - Escaped Mustache `@{{}}`
 */
function getMustache(content, filename, line, col) {
    const mustacheIndex = content.indexOf('{{');
    if (mustacheIndex === -1) {
        return null;
    }
    const realCol = mustacheIndex;
    /**
     * Mustache is a comment
     */
    const isComment = content[mustacheIndex + 2] === '-' && content[mustacheIndex + 3] === '-';
    if (isComment) {
        return {
            isComment,
            filename,
            line,
            col: col + realCol,
            realCol,
        };
    }
    /**
     * Mustache is for interpolation
     */
    const safe = content[mustacheIndex + 2] === '{';
    const escaped = content[mustacheIndex - 1] === '@';
    return {
        isComment,
        safe,
        filename,
        escaped,
        line,
        col: col + realCol,
        realCol,
    };
}
exports.getMustache = getMustache;
});

var Scanner_1 = createCommonjsModule(function (module, exports) {
/**
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scanner = void 0;
/**
 * Scan a string and seperate it into 2 pairs. The first pair will be series
 * of characters until the ending pattern is found and 2nd pair is the
 * left over.
 *
 * Their are some special behaviors over the regular `string.split` method.
 *
 * 1. Multiple lines can be passed by calling `scan` method for each line.
 * 2. Tolerates characters when they conflict with the ending pattern.
 *
 * ```js
 * const pattern = ')'
 * const tolerations = ['(', ')']
 * const scanner = new Scanner(pattern, tolerations)
 *
 * scanner.scan('2 + 2 * (3))')
 * if (scanner.closed) {
 *   scanner.match // 2 + 2 * (3)
 *   scanner.leftOver // ''
 * }
 * ```
 *
 * If we take the same string `2 + 2 * (3))` and split it using ')', then we
 * will get unexpected result, since the split method splits by finding the
 * first match.
 */
class Scanner {
    constructor(pattern, toleratePair, line, col) {
        this.pattern = pattern;
        this.line = line;
        this.col = col;
        this.tolaretionCounts = 0;
        this.tolerateLhs = '';
        this.tolerateRhs = '';
        this.patternLength = this.pattern.length;
        /**
         * Tracking if the scanner has been closed
         */
        this.closed = false;
        /**
         * The matched content within the pattern
         */
        this.match = '';
        /**
         * The content in the same line but after the closing
         * of the pattern
         */
        this.leftOver = '';
        this.loc = {
            line: this.line,
            col: this.col,
        };
        this.tolerateLhs = toleratePair[0];
        this.tolerateRhs = toleratePair[1];
    }
    /**
     * Returns a boolean telling if the pattern matches the current
     * char and the upcoming chars or not.
     *
     * This will be used to mark the scanner as closed and stop scanning
     * for more chars
     */
    matchesPattern(chars, iterationCount) {
        for (let i = 0; i < this.patternLength; i++) {
            if (this.pattern[i] !== chars[iterationCount + i]) {
                return false;
            }
        }
        return true;
    }
    /**
     * Scan a string and look for the closing pattern. The string will
     * be seperated with the closing pattern and also tracks the
     * toleration patterns to make sure they are not making the
     * scanner to end due to pattern mis-match.
     */
    scan(chunk) {
        if (chunk === '\n') {
            this.loc.line++;
            this.loc.col = 0;
            this.match += '\n';
            return;
        }
        if (!chunk.trim()) {
            return;
        }
        const chunkLength = chunk.length;
        let iterations = 0;
        while (iterations < chunkLength) {
            const char = chunk[iterations];
            /**
             * Toleration count is 0 and closing pattern matches the current
             * or series of upcoming characters
             */
            if (this.tolaretionCounts === 0 && this.matchesPattern(chunk, iterations)) {
                iterations += this.patternLength;
                this.closed = true;
                break;
            }
            /**
             * Increments the tolarate counts when char is the
             * tolerate lhs character
             */
            if (char === this.tolerateLhs) {
                this.tolaretionCounts++;
            }
            /**
             * Decrements the tolare counts when char is the
             * tolerate rhs character
             */
            if (char === this.tolerateRhs) {
                this.tolaretionCounts--;
            }
            /**
             * Append to the matched string and waiting for the
             * closing pattern
             */
            this.match += char;
            iterations++;
        }
        /**
         * If closed, then return the matched string and also the
         * left over string
         */
        if (this.closed) {
            this.loc.col += iterations;
            this.leftOver = chunk.slice(iterations);
        }
    }
}
exports.Scanner = Scanner;
});

var src = createCommonjsModule(function (module, exports) {
/*
 * edge-error
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeError = void 0;
class EdgeError extends Error {
    constructor(message, code, options) {
        super(message);
        this.message = message;
        this.code = code;
        this.line = options.line;
        this.col = options.col;
        this.filename = options.filename;
        const stack = this.stack.split('\n');
        stack.splice(1, 0, `    at anonymous (${this.filename}:${this.line}:${this.col})`);
        this.stack = stack.join('\n');
    }
}
exports.EdgeError = EdgeError;
});

var Exceptions = createCommonjsModule(function (module, exports) {
/**
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unclosedTag = exports.unclosedCurlyBrace = exports.unopenedParen = exports.unclosedParen = exports.cannotSeekStatement = void 0;

/**
 * Raised when there is inline content next to a tag opening
 * block. For example:
 *
 * Incorrect
 * ```
 * @if(username) Hello {{ username }} @endif
 * ```
 *
 * Correct
 * ```
 * @if(username)
 *   Hello {{ username }}
 * @endif
 * ```
 */
function cannotSeekStatement(chars, pos, filename) {
    return new src.EdgeError(`Unexpected token "${chars}"`, 'E_CANNOT_SEEK_STATEMENT', {
        line: pos.line,
        col: pos.col,
        filename: filename,
    });
}
exports.cannotSeekStatement = cannotSeekStatement;
/**
 * Raised when a tag opening body doesn't have a closing brace. For example:
 *
 * Incorrect
 * ```
 * @if(username
 * ```
 *
 * Correct
 * ```
 * @if(username)
 * ```
 */
function unclosedParen(pos, filename) {
    return new src.EdgeError('Missing token ")"', 'E_UNCLOSED_PAREN', {
        line: pos.line,
        col: pos.col,
        filename: filename,
    });
}
exports.unclosedParen = unclosedParen;
/**
 * Raised when a tag is used without an opening brace. For example:
 *
 * Incorrect
 * ```
 * @if username
 * ```
 *
 * Correct
 * ```
 * @if(username)
 * ```
 */
function unopenedParen(pos, filename) {
    return new src.EdgeError('Missing token "("', 'E_UNOPENED_PAREN', {
        line: pos.line,
        col: pos.col,
        filename: filename,
    });
}
exports.unopenedParen = unopenedParen;
/**
 * Raised when the curly closing brace is missing from the mustache
 * statement. For example:
 *
 * Incorrect
 * ```
 * {{ username }
 * ```
 *
 * Correct
 *
 * ```
 * {{ username }}
 * ```
 */
function unclosedCurlyBrace(pos, filename) {
    return new src.EdgeError('Missing token "}"', 'E_UNCLOSED_CURLY_BRACE', {
        line: pos.line,
        col: pos.col,
        filename: filename,
    });
}
exports.unclosedCurlyBrace = unclosedCurlyBrace;
/**
 * Raised when a block level tag is opened but never closed. For example:
 *
 * Incorrect
 * ```
 * @if(username)
 * ```
 *
 * Correct
 * ```
 * @if(username)
 * @endif
 * ```
 */
function unclosedTag(tag, pos, filename) {
    return new src.EdgeError(`Unclosed tag ${tag}`, 'E_UNCLOSED_TAG', {
        line: pos.line,
        col: pos.col,
        filename: filename,
    });
}
exports.unclosedTag = unclosedTag;
});

var Tokenizer_1 = createCommonjsModule(function (module, exports) {
/**
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tokenizer = void 0;




/**
 * Tokenizer converts a bunch of text into an array of tokens. Later
 * these tokens can be used to build the transformed text.
 *
 * Go through the README file to learn more about the syntax and
 * the tokens output.
 */
class Tokenizer {
    constructor(template, tagsDef, options) {
        this.template = template;
        this.tagsDef = tagsDef;
        this.options = options;
        this.tokens = [];
        /**
         * Holds the current tag statement, until it is closed
         */
        this.tagStatement = null;
        /**
         * Holds the current mustache statement, until it is closed
         */
        this.mustacheStatement = null;
        /**
         * Current line number
         */
        this.line = 0;
        /**
         * Tracking if two back to back lines are tags or not. Need it for inserting
         * whitespace between them
         */
        this.isLastLineATag = false;
        /**
         * When true, the tokenizer will drop the newline
         */
        this.dropNewLine = false;
        /**
         * An array of opened block level tags
         */
        this.openedTags = [];
    }
    /**
     * Returns the raw token
     */
    getRawNode(text) {
        return {
            type: 'raw',
            value: text,
            filename: this.options.filename,
            line: this.line,
        };
    }
    /**
     * Returns the new line token
     */
    getNewLineNode(line) {
        return {
            type: 'newline',
            filename: this.options.filename,
            line: (line || this.line) - 1,
        };
    }
    /**
     * Returns the TagToken for a runtime tag. The `jsArg` and ending
     * loc is computed using the scanner and must be passed to this
     * method.
     */
    getTagNode(tag, jsArg, closingLoc) {
        return {
            type: tag.escaped ? Contracts.TagTypes.ETAG : Contracts.TagTypes.TAG,
            filename: tag.filename,
            properties: {
                name: tag.name,
                jsArg: jsArg,
                selfclosed: tag.selfclosed,
            },
            loc: {
                start: {
                    line: tag.line,
                    col: tag.col,
                },
                end: closingLoc,
            },
            children: [],
        };
    }
    /**
     * Consume the runtime tag node.
     *
     * If tag is `block`, then we push it to the list of
     * opened tags and wait for the closing statement to
     * appear.
     *
     * Otherwise, we move it to the tokens array directly.
     */
    consumeTag(tag, jsArg, loc) {
        if (tag.block && !tag.selfclosed) {
            this.openedTags.push(this.getTagNode(tag, jsArg, loc));
        }
        else {
            this.consumeNode(this.getTagNode(tag, jsArg, loc));
        }
    }
    /**
     * Handles the opening of the tag.
     */
    handleTagOpening(line, tag) {
        if (tag.seekable && !tag.hasBrace) {
            throw Exceptions.unopenedParen({ line: tag.line, col: tag.col }, tag.filename);
        }
        /**
         * When tag is not seekable, then their is no need to create
         * a scanner instance, just consume it right away.
         */
        if (!tag.seekable) {
            this.consumeTag(tag, '', { line: tag.line, col: tag.col });
            if (tag.noNewLine || line.endsWith('~')) {
                this.dropNewLine = true;
            }
            return;
        }
        /**
         * Advance the `col`, since we do not want to start from the
         * starting brace `(`.
         */
        tag.col += 1;
        /**
         * Create a new block statement with the scanner to find
         * the closing brace ')'
         */
        this.tagStatement = {
            tag: tag,
            scanner: new Scanner_1.Scanner(')', ['(', ')'], this.line, tag.col),
        };
        /**
         * Pass all remaining content to the scanner
         */
        this.feedCharsToCurrentTag(line.slice(tag.col));
    }
    /**
     * Scans the string using the scanner and waits for the
     * closing brace ')' to appear
     */
    feedCharsToCurrentTag(content) {
        const { tag, scanner } = this.tagStatement;
        scanner.scan(content);
        /**
         * If scanner is not closed, then we need to keep on
         * feeding more content
         */
        if (!scanner.closed) {
            return;
        }
        /**
         * Consume the tag once we have found the closing brace and set
         * block statement to null
         */
        this.consumeTag(tag, scanner.match, scanner.loc);
        /**
         * If tag endswith `~`. Then instruct the tokenizer to drop the
         * next new line
         */
        if (scanner.leftOver.trim() === '~') {
            this.tagStatement = null;
            this.dropNewLine = true;
            return;
        }
        /**
         * Raise error, if there is inline content after the closing brace ')'
         * `@if(username) hello {{ username }}` is invalid
         */
        if (scanner.leftOver.trim()) {
            throw Exceptions.cannotSeekStatement(scanner.leftOver, scanner.loc, tag.filename);
        }
        /**
         * Do not add newline when tag instructs for it
         */
        if (tag.noNewLine) {
            this.dropNewLine = true;
        }
        this.tagStatement = null;
    }
    /**
     * Returns the mustache type by checking for `safe` and `escaped`
     * properties.
     */
    getMustacheType(mustache) {
        if (mustache.safe) {
            return mustache.escaped ? Contracts.MustacheTypes.ESMUSTACHE : Contracts.MustacheTypes.SMUSTACHE;
        }
        return mustache.escaped ? Contracts.MustacheTypes.EMUSTACHE : Contracts.MustacheTypes.MUSTACHE;
    }
    /**
     * Returns the mustache token using the runtime mustache node. The `jsArg` and
     * ending `loc` is fetched using the scanner.
     */
    getMustacheNode(mustache, jsArg, closingLoc) {
        return {
            type: this.getMustacheType(mustache),
            filename: mustache.filename,
            properties: {
                jsArg: jsArg,
            },
            loc: {
                start: {
                    line: mustache.line,
                    col: mustache.col,
                },
                end: closingLoc,
            },
        };
    }
    /**
     * Returns the comment token using the runtime comment node.
     */
    getCommentNode(comment, value, closingLoc) {
        return {
            type: 'comment',
            filename: comment.filename,
            value: value,
            loc: {
                start: {
                    line: comment.line,
                    col: comment.col,
                },
                end: closingLoc,
            },
        };
    }
    /**
     * Handles the line which has mustache opening braces.
     */
    handleMustacheOpening(line, mustache) {
        const pattern = mustache.isComment ? '--}}' : mustache.safe ? '}}}' : '}}';
        const textLeftIndex = mustache.isComment || !mustache.escaped ? mustache.realCol : mustache.realCol - 1;
        /**
         * Pull everything that is on the left of the mustache
         * statement and use it as a raw node
         */
        if (textLeftIndex > 0) {
            this.consumeNode(this.getRawNode(line.slice(0, textLeftIndex)));
        }
        /**
         * Skip the curly braces when reading the expression inside
         * it. We are actually skipping opening curly braces
         * `{{`, however, their length will be same as the
         * closing one's/
         */
        mustache.col += pattern.length;
        mustache.realCol += pattern.length;
        /**
         * Create a new mustache statement with a scanner to scan for
         * closing mustache braces. Note the closing `pattern` is
         * different for safe and normal mustache.
         */
        this.mustacheStatement = {
            mustache,
            scanner: new Scanner_1.Scanner(pattern, ['{', '}'], mustache.line, mustache.col),
        };
        /**
         * Feed text to the mustache statement and wait for the closing braces
         */
        this.feedCharsToCurrentMustache(line.slice(mustache.realCol));
    }
    /**
     * Feed chars to the mustache statement, which isn't closed yet.
     */
    feedCharsToCurrentMustache(content) {
        const { mustache, scanner } = this.mustacheStatement;
        scanner.scan(content);
        /**
         * If scanner is not closed, then return early, since their
         * not much we can do here.
         */
        if (!scanner.closed) {
            return;
        }
        /**
         * Consume the node as soon as we have found the closing brace
         */
        if (mustache.isComment) {
            this.consumeNode(this.getCommentNode(mustache, scanner.match, scanner.loc));
        }
        else {
            this.consumeNode(this.getMustacheNode(mustache, scanner.match, scanner.loc));
        }
        /**
         * If their is leftOver text after the mustache closing brace, then re-scan
         * it for more mustache statements. Example:
         *
         * I following statement, `, and {{ age }}` is the left over.
         * ```
         * {{ username }}, and {{ age }}
         * ```
         *
         * This block is same the generic new line handler method. However, their is
         * no need to check for tags and comments, so we ditch that method and
         * process it here by duplicating code (which is fine).
         */
        if (scanner.leftOver.trim()) {
            /**
             * Scan for another mustache in the same line
             */
            const anotherMustache = Detector.getMustache(scanner.leftOver, this.options.filename, scanner.loc.line, scanner.loc.col);
            if (anotherMustache) {
                this.handleMustacheOpening(scanner.leftOver, anotherMustache);
                return;
            }
            this.consumeNode(this.getRawNode(scanner.leftOver));
        }
        /**
         * Set mustache statement to null
         */
        this.mustacheStatement = null;
    }
    /**
     * Returns a boolean telling if the content of the line is the
     * closing tag for the most recently opened tag.
     *
     * The opening and closing has to be in a order, otherwise the
     * compiler will get mad.
     */
    isClosingTag(line) {
        if (!this.openedTags.length) {
            return false;
        }
        line = line.trim();
        const recentTag = this.openedTags[this.openedTags.length - 1];
        const endStatement = `@end${recentTag.properties.name}`;
        return (line === endStatement || line === `${endStatement}~` || line === '@end' || line === '@end~');
    }
    /**
     * Consume any type of token by moving it to the correct list. If there are
     * opened tags, then the token becomes part of the tag children. Otherwise
     * moved as top level token.
     */
    consumeNode(tag) {
        if (this.openedTags.length) {
            this.openedTags[this.openedTags.length - 1].children.push(tag);
            return;
        }
        this.tokens.push(tag);
    }
    /**
     * Pushes a new line to the list. This method avoids
     * new lines at position 0.
     */
    pushNewLine(line) {
        if ((line || this.line) === 1) {
            return;
        }
        /**
         * Ignore incoming new line
         */
        if (this.dropNewLine) {
            this.dropNewLine = false;
            return;
        }
        this.consumeNode(this.getNewLineNode(line));
    }
    /**
     * Process the current line based upon what it is. What it is?
     * That's the job of this method to find out.
     */
    processText(line) {
        /**
         * Pre process line when the onLine listener is defined
         */
        if (typeof this.options.onLine === 'function') {
            line = this.options.onLine(line);
        }
        /**
         * There is an open block statement, so feed line to it
         */
        if (this.tagStatement) {
            this.feedCharsToCurrentTag('\n');
            this.feedCharsToCurrentTag(line);
            return;
        }
        /**
         * There is an open mustache statement, so feed line to it
         */
        if (this.mustacheStatement) {
            this.feedCharsToCurrentMustache('\n');
            this.feedCharsToCurrentMustache(line);
            return;
        }
        /**
         * The line is an closing statement for a previously opened
         * block level tag
         */
        if (this.isClosingTag(line)) {
            this.consumeNode(this.openedTags.pop());
            /**
             * Do not add next newline when statement ends with `~`
             */
            if (line.endsWith('~')) {
                this.dropNewLine = true;
            }
            return;
        }
        /**
         * Check if the current line is a tag or not. If yes, then handle
         * it appropriately
         */
        const tag = Detector.getTag(line, this.options.filename, this.line, 0, this.tagsDef, this.options.claimTag);
        if (tag) {
            /**
             * When two back to back lines are tags, then we put a newline between them
             * and one can use `skipNewLines` syntax to remove new lines (if required)
             */
            if (this.isLastLineATag) {
                this.pushNewLine();
            }
            this.isLastLineATag = true;
            this.handleTagOpening(line, tag);
            return;
        }
        this.isLastLineATag = false;
        /**
         * Check if the current line contains a mustache statement or not. If yes,
         * then handle it appropriately.
         */
        const mustache = Detector.getMustache(line, this.options.filename, this.line, 0);
        if (mustache) {
            this.pushNewLine();
            this.handleMustacheOpening(line, mustache);
            return;
        }
        this.pushNewLine();
        this.consumeNode(this.getRawNode(line));
    }
    /**
     * Checks for errors after the tokenizer completes it's work, so that we
     * can find broken statements or unclosed tags.
     */
    checkForErrors() {
        /**
         * We are done scanning the content and there is an open tagStatement
         * seeking for new content. Which means we are missing a closing
         * brace `)`.
         */
        if (this.tagStatement) {
            const { tag } = this.tagStatement;
            throw Exceptions.unclosedParen({ line: tag.line, col: tag.col }, tag.filename);
        }
        /**
         * We are done scanning the content and there is an open mustache statement
         * seeking for new content. Which means we are missing closing braces `}}`.
         */
        if (this.mustacheStatement) {
            const { mustache } = this.mustacheStatement;
            throw Exceptions.unclosedCurlyBrace({ line: mustache.line, col: mustache.col }, mustache.filename);
        }
        /**
         * A tag was opened, but forgot to close it
         */
        if (this.openedTags.length) {
            const openedTag = this.openedTags[this.openedTags.length - 1];
            throw Exceptions.unclosedTag(openedTag.properties.name, openedTag.loc.start, openedTag.filename);
        }
    }
    /**
     * Parse the template and generate an AST out of it
     */
    parse() {
        const lines = this.template.split(/\r\n|\r|\n/g);
        const linesLength = lines.length;
        while (this.line < linesLength) {
            const line = lines[this.line];
            this.line++;
            this.processText(line);
        }
        this.checkForErrors();
    }
}
exports.Tokenizer = Tokenizer;
});

var build = createCommonjsModule(function (module, exports) {
/**
 * edge-lexer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (commonjsGlobal && commonjsGlobal.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.TagTypes = exports.MustacheTypes = exports.Tokenizer = void 0;
const utils$1 = __importStar(utils);
exports.utils = utils$1;

Object.defineProperty(exports, "Tokenizer", { enumerable: true, get: function () { return Tokenizer_1.Tokenizer; } });

Object.defineProperty(exports, "MustacheTypes", { enumerable: true, get: function () { return Contracts.MustacheTypes; } });
Object.defineProperty(exports, "TagTypes", { enumerable: true, get: function () { return Contracts.TagTypes; } });
});

const unsafeChars = [
    {
        char: '=',
        sub: 'snowblade-equals',
        safe: '&equals;'
    },
    {
        char: '"',
        sub: 'snowblade-quote',
        safe: '&quot;'
    },
    {
        char: '<',
        sub: 'snowblade-lessthan',
        safe: '&lt;'
    },
    {
        char: '>',
        sub: 'snowblade-greaterthan',
        safe: '&gt;'
    },
    {
        char: '`',
        sub: 'snowblade-backtick',
        safe: '\\`'
    }
];
const specialAttrs = [
    {
        attr: 'x-html',
        sub: ''
    },
    {
        attr: 'x-bind',
        sub: ''
    },
    {
        attr: 'value',
        sub: 'x-model'
    },
    {
        attr: 'x-model',
        sub: ''
    },
    {
        attr: 'x-text',
        sub: ''
    }
];
function resolveTokenCoordinates(src, token) {
    const { line, col } = token.loc.start;
    return resolveCharCoordinates(src, line, col);
}
function resolveTokenContext(src, token) {
    const pos = resolveTokenCoordinates(src, token);
    return resolveCharContext(src, pos);
}
function hasHtmlTokens(source) {
    const tokenizer = new build.Tokenizer(source, {}, { filename: '' });
    tokenizer.parse();
    const tokens = tokenizer.tokens.filter((t) => t.type === 'mustache');
    let hasHtml = false;
    tokens.map((token) => {
        const context = resolveTokenContext(source, token);
        if (hasHtml)
            return;
        hasHtml = context.rel === 'html';
    });
    return hasHtml;
}
function implementMagicAttrs(source) {
    const $ = cheerio__default['default'].load(source);
    $('*[snowblade-magic]').each((i, el) => {
        const keys = Object.keys(el.attribs);
        keys.map((key) => {
            let value = el.attribs[key];
            if (value.indexOf('snowblade-magic') < 0)
                return;
            value = value.replace(/\ssnowblade-magic/g, '');
            if (value.substr(0, 1) !== '`' && value.substr(-1) !== '`') {
                value = '`' + value + '`';
            }
            let special = specialAttrs.filter((s) => key.indexOf(s.attr) >= 0);
            const newKey = special.length > 0
                ? special[0].sub.length > 0
                    ? special[0].sub
                    : key
                : `x-bind:${key}`;
            $(el).removeAttr(key);
            let newAttr = {};
            newAttr[newKey] = value;
            $(el).attr(newAttr);
        });
    });
    let output = $.html();
    unsafeChars.map((u) => {
        const regex = new RegExp(u.sub, 'g');
        output = output.replace(regex, u.safe);
    });
    output = output.replace(/snowblade-magic\s/g, '');
    output = output.replace(/snowblade-magic\=""\s/g, '');
    return output;
}

class ExpressionAttribute {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.prepareAttribute();
    }
    prepareAttribute() {
        this.isProperty = this.key.substr(0, 2) === '::';
        if (this.isProperty)
            this.key = this.key.substr(2);
        const action = this.actions().filter((a) => a === this.key);
        this.action = action.length > 0 ? action[0].substr(2) : '';
    }
    actions() {
        return ['$$render', '$$wrap'];
    }
}

class ExpressionAttributeManager {
    constructor(expression) {
        this.expression = expression;
        this.prepareAttributes();
    }
    prepareAttributes() {
        const attribs = this.expression.element.attribs;
        const keys = Object.keys(attribs);
        this.attributes = [];
        keys.map((key) => {
            const attrib = new ExpressionAttribute(key, attribs[key]);
            if (attrib.action !== '' &&
                typeof this.getActionAttribute(attrib.action) !== 'undefined')
                return;
            this.attributes.push(attrib);
        });
    }
    getAssignedAttributes() {
        return this.attributes.filter((a) => !a.isProperty && a.action === '');
    }
    getActionAttribute(action) {
        const attribs = this.attributes.filter((a) => a.action === action);
        return attribs.length > 0 ? attribs[0].value : undefined;
    }
    getPropertyAttributes() {
        return this.attributes.filter((a) => a.isProperty);
    }
    getActionAttributes() {
        return this.attributes.filter((a) => a.action !== '');
    }
}

class ExpressionProp {
    constructor(attribute, empty = false) {
        this.key = attribute.key.toLowerCase();
        this.value = attribute.value;
        this.empty = empty;
        this.prepareProp();
    }
    prepareProp() {
        this.isMagic = this.key.substr(0, 1) === '$';
        if (this.isMagic)
            this.key = this.key.substr(1);
    }
}

class ExpressionPropManager {
    constructor(expression) {
        this.expression = expression;
        this.componentProps = expression.component.propManager;
        this.prepareProps();
    }
    prepareProps() {
        const attribs = this.expression.attributeManager.getPropertyAttributes();
        this.props = [];
        attribs.map((a) => {
            this.props.push(new ExpressionProp(a));
        });
        this.componentProps.props.map((cProp) => {
            const existing = this.props.filter((eProp) => eProp.key === cProp.key);
            if (existing.length > 0)
                return;
            if (cProp.defaultValue === '')
                return;
            const attr = { key: cProp.key, value: cProp.defaultValue };
            this.props.push(new ExpressionProp(attr));
        });
    }
    getProp(key) {
        key = key.toLowerCase();
        const prop = this.props.filter((p) => p.key === key);
        const global = this.expression.output?.props[key];
        return prop.length === 0
            ? typeof global === 'undefined'
                ? new ExpressionProp({ key, value: '' }, true)
                : new ExpressionProp({ key, value: global })
            : prop[0];
    }
    getPropValue(key, pipe = '') {
        const cProp = this.componentProps.getProp(key);
        const eProp = this.getProp(key);
        const value = typeof cProp === 'undefined' ? undefined : cProp.getValue(eProp);
        return pipe === '' ? value : this.pipeValue(value, pipe);
    }
    pipeValue(value, pipe) {
        const arg = typeof value === 'undefined' ? '' : value;
        const cPipes = this.expression.component.pipes;
        const gPipes = this.expression.output.pipes;
        return pipe in cPipes
            ? cPipes[pipe](arg)
            : pipe in gPipes
                ? gPipes[pipe](arg)
                : value;
    }
    getMagicProps() {
        return this.props.filter((prop) => prop.isMagic);
    }
    getNormalProps() {
        return this.props.filter((prop) => !prop.isMagic);
    }
    processStandardTokens() {
        const props = this.getNormalProps();
        if (props.length === 0)
            return;
        const tokenizer = new build.Tokenizer(this.expression.source, {}, { filename: '' });
        tokenizer.parse();
        const tokens = tokenizer.tokens.filter((t) => t.type === 'mustache');
        let processed = [];
        tokens.map((t) => {
            const arg = t.properties.jsArg;
            let literal = arg;
            let pipe = '';
            if (literal.indexOf('|') >= 0) {
                const split = literal.split('|');
                if (split.length > 2)
                    error(new Error(`Property exposed as "{{${literal}}}" implements more than one pipe.`));
                pipe = split[1].trim();
                literal = split[0];
            }
            const key = `${literal.trim().toLowerCase()}`;
            const prop = this.getProp(key);
            let identical = processed.filter((p) => p.key === key && p.pipe === pipe);
            if (prop.isMagic)
                return;
            let value = this.getPropValue(key, pipe);
            if (identical.length > 0)
                value = identical[0].value;
            processed.push({ key, pipe, value });
            if (typeof value === 'undefined')
                return;
            this.expression.source = this.expression.source.replace(`{{${arg}}}`, value);
        });
    }
    processMagicTokens() {
        const props = this.getMagicProps();
        if (props.length === 0)
            return;
        let template = this.expression.source;
        let ignoreTokens = [];
        let next = true;
        while (next) {
            const tokenizer = new build.Tokenizer(template, {}, { filename: '' });
            tokenizer.parse();
            let tokens = (tokenizer.tokens.filter((t) => t.type === 'mustache'));
            ignoreTokens.forEach((ignore) => {
                const { jsArg } = ignore.properties;
                tokens = tokens.filter((token) => token.properties.jsArg !== jsArg);
            });
            if (tokens.length === 0)
                break;
            next = tokens.length !== 1;
            let token = undefined;
            tokens.map((t) => {
                const context = resolveTokenContext(template, t);
                if ((context.rel !== 'html' && hasHtmlTokens(template)) ||
                    typeof token !== 'undefined')
                    return;
                token = t;
            });
            const literal = token.properties.jsArg;
            const value = this.getPropValue(literal.trim());
            const pos = resolveTokenCoordinates(template, token);
            const context = resolveTokenContext(template, token);
            if (typeof value === 'undefined') {
                ignoreTokens.push(token);
                continue;
            }
            if (context.rel === 'html') {
                template = replaceAt(template, pos - 2, `{{${literal}}}`, `<snowblade-magic>${value}</snowblade-magic>`);
                const $ = cheerio__default['default'].load(template);
                let parent = $('snowblade-magic').parent();
                if ('name' in parent[0]) {
                    const parentTag = parent[0];
                    if (parentTag.name === 'slot' && 'snowblade' in parentTag.attribs) {
                        const nextParent = parent.parent();
                        $(nextParent).html(parent.html());
                        parent = nextParent;
                    }
                }
                let html = parent.html();
                html = html.replace('<snowblade-magic>', '${');
                html = html.replace('</snowblade-magic>', '}');
                unsafeChars.map((u) => {
                    const regex = new RegExp(u.char, 'g');
                    html = html.replace(regex, u.sub);
                });
                let attrs = {};
                attrs['x-html'] = `\`${html}\``;
                parent.attr(attrs);
                parent.empty();
                template = $('body').html();
            }
            else {
                const insert = '${' + value + '} snowblade-magic';
                template = replaceAt(template, pos - 2, `{{${literal}}}`, insert);
                template = replaceAt(template, pos - (context.offset - 1), '', 'snowblade-magic ');
            }
        }
        this.expression.source = template;
    }
}

class Expression {
    constructor(context, element) {
        this.context = context;
        this.element = element;
        if (this.context instanceof Output) {
            this.output = this.context;
        }
        else {
            linkProperties(this, this.context, ['output']);
        }
        this.initializeModules();
        this.processWrap();
        this.escapeUnsafeTags();
        this.processProps();
        this.commitDom();
        this.processSlots();
        this.next();
    }
    initializeModules() {
        const contextComponent = this.context.component;
        const importManager = contextComponent.importManager;
        this.component = importManager.getComponentByExpressionName(this.element.name);
        this.source = this.component.source;
        if (this.component.isInputComponent) {
            const regex = new RegExp(`((?<=\<)${'head'})|((?<=\</)${'head'})`, 'gi');
            this.source = this.source.replace(regex, 'snowblade-head');
        }
        this.attributeManager = new ExpressionAttributeManager(this);
        this.propManager = new ExpressionPropManager(this);
    }
    processProps() {
        this.propManager.processStandardTokens();
        this.propManager.processMagicTokens();
    }
    processWrap() {
        let wrap = this.attributeManager.getActionAttribute('wrap');
        if (typeof wrap === 'undefined')
            return;
        wrap = wrap.toLowerCase();
        this.source = `<${wrap}>${this.source}</${wrap}>`;
    }
    commitDom() {
        this.$ = cheerio__default['default'].load(this.source);
    }
    processSlots() {
        const slotdata = this.context.$(this.element).html();
        this.$('slot[snowblade]').each((i, el) => {
            const slotdefault = this.$(el).html();
            if (slotdata.trim() === '') {
                this.$(el).replaceWith(slotdefault);
            }
            else {
                this.$(el).replaceWith(slotdata);
            }
        });
    }
    escapeUnsafeTags() {
        escapeTags.map((tag) => {
            const regex = new RegExp(`((?<=\<)${tag.unescaped})|((?<=\</)${tag.unescaped})`, 'gi');
            this.source = this.source.replace(regex, tag.escaped);
        });
    }
    next() {
        const attribs = this.attributeManager.getAssignedAttributes();
        attribs.map((attrib) => {
            [...this.$('body').children()].map((ch) => {
                let attr = {};
                attr[attrib.key] =
                    attrib.key in ch.attribs
                        ? `${ch.attribs[attrib.key]} ${attrib.value}`
                        : attrib.value;
                cheerio__default['default'](ch).attr(attr);
            });
        });
        this.component.importManager.imports.map((i) => {
            const embedded = this.$(i.expressionName);
            [...embedded].map((e) => {
                const exp = new Expression(this, e);
                cheerio__default['default'](e).replaceWith(cheerio__default['default'](exp.$('body')[0]).html());
            });
        });
        this.html = this.$.html();
    }
}

let enabled =
  !("NO_COLOR" in process.env) &&
  ("FORCE_COLOR" in process.env ||
    process.platform === "win32" ||
    (process.stdout != null &&
      process.stdout.isTTY &&
      process.env.TERM &&
      process.env.TERM !== "dumb"));

const raw = (open, close, searchRegex, replaceValue) => (s) =>
  enabled
    ? open +
      (~(s += "").indexOf(close, 4) // skip opening \x1b[
        ? s.replace(searchRegex, replaceValue)
        : s) +
      close
    : s;

const init = (open, close) => {
  return raw(
    `\x1b[${open}m`,
    `\x1b[${close}m`,
    new RegExp(`\\x1b\\[${close}m`, "g"),
    `\x1b[${open}m`
  )
};

const options = Object.defineProperty({}, "enabled", {
  get: () => enabled,
  set: (value) => (enabled = value),
});
const bold = raw("\x1b[1m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[1m");
const dim = raw("\x1b[2m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[2m");
const red = init(31, 39);
const green = init(32, 39);
const yellow = init(33, 39);

if (process.env.FORCE_COLOR === '0' || process.env.NO_COLOR) {
    options.enabled = false;
}
const stderr = console.error.bind(console);
function handleError(err, recover = false) {
    let description = err.message || err;
    if (err.name)
        description = `${err.name}: ${description}`;
    const message = description || err.message;
    stderr(bold(red(`[!] ${bold(message.toString())}`)));
    if (err.stack && (err instanceof SnowbladeError ? err.showStack : true)) {
        stderr(dim(err.stack));
    }
    stderr('');
    if (!recover)
        process.exit(0);
}
function progress(msg) {
    stderr(bold(green(`[*] ${bold(msg)}`)));
}
function warning(msg) {
    stderr(bold(yellow(`[?] SnowbladeWarning: ${bold(msg)}`)));
}

class Output {
    constructor(instance, output) {
        this.instance = instance;
        this.output = output;
        linkProperties(this, this.instance, ['componentProvider', 'component']);
        this.prepareOutput();
    }
    prepareOutput() {
        const defaults = {
            type: 'html',
            formatting: 'tidy',
            comments: false,
            mustache: true,
            props: {},
            pipes: {}
        };
        const types = ['html'];
        const formattings = ['none', 'pretty', 'minify'];
        const { type, file, formatting, comments, mustache, props, pipes } = this.output;
        this.file = absolutePath(typeof file === 'undefined'
            ? error(error(errConfigMissingProp('output.file')))
            : typeof file !== 'string'
                ? error(errConfigBadPropType('output.file', file))
                : file);
        this.type =
            typeof type === 'undefined'
                ? defaults.type
                : typeof type !== 'string'
                    ? error(errConfigBadPropType('output.type', type))
                    : types.includes(type.toLowerCase())
                        ? type
                        : error(errConfigBadPropValue('output.type', type));
        this.formatting =
            typeof formatting === 'undefined'
                ? defaults.formatting
                : typeof formatting !== 'string'
                    ? error(errConfigBadPropType('output.formatting', formatting))
                    : formattings.includes(formatting.toLowerCase())
                        ? formatting
                        : error(errConfigBadPropValue('output.formatting', formatting));
        this.comments =
            typeof comments === 'undefined'
                ? defaults.comments
                : typeof comments !== 'boolean'
                    ? error(errConfigBadPropType('output.comments', comments))
                    : comments;
        this.mustache =
            typeof mustache === 'undefined'
                ? defaults.mustache
                : typeof mustache !== 'boolean'
                    ? error(errConfigBadPropType('mustache', mustache))
                    : mustache;
        this.props =
            typeof props === 'undefined'
                ? defaults.props
                : typeof props !== 'object'
                    ? error(errConfigBadPropType('output.props', props))
                    : Array.isArray(props)
                        ? error(errConfigBadPropValue('output.props', props))
                        : props;
        this.pipes =
            typeof pipes === 'undefined'
                ? defaults.pipes
                : typeof pipes !== 'object'
                    ? error(errConfigBadPropType('output.pipes', pipes))
                    : Array.isArray(pipes)
                        ? error(errConfigBadPropValue('output.pipes', pipes))
                        : pipes;
    }
    buildBaseExpression() {
        this.$ = cheerio__default['default'].load(`<snowblade-root/>`);
        const el = this.$('snowblade-root')[0];
        this.expression = new Expression(this, el);
        let html = this.expression.html;
        html = this.collapseHeadElements(html);
        html = implementMagicAttrs(html);
        escapeTags.map((tag) => {
            const regex = new RegExp(`((?<=\<)${tag.escaped})|((?<=\</)${tag.escaped})`, 'g');
            html = html.replace(regex, tag.unescaped);
        });
        fs.writeFileSync(this.file, html);
        progress(`Snowblade successfully compiled to \`${this.file}\``);
    }
    collapseHeadElements(html) {
        const $ = cheerio__default['default'].load(html);
        let heads = [];
        $('snowblade-head').each((i, el) => {
            heads.push($(el).html());
            $(el).remove();
        });
        $('head').first().html(heads.join('\n').trim());
        return $.html();
    }
}
const escapeTags = [
    { escaped: 'snowblade-template', unescaped: 'template' }
];

var crypt = createCommonjsModule(function (module) {
(function() {
  var base64map
      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  crypt = {
    // Bit-wise rotation left
    rotl: function(n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotation right
    rotr: function(n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = crypt.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function(n) {
      for (var bytes = []; n > 0; n--)
        bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
        words[b >>> 5] |= bytes[i] << (24 - b % 32);
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        for (var j = 0; j < 4; j++)
          if (i * 8 + j * 6 <= bytes.length * 8)
            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
          else
            base64.push('=');
      }
      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
          imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
      }
      return bytes;
    }
  };

  module.exports = crypt;
})();
});

var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

var charenc_1 = charenc;

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
var isBuffer_1 = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
};

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

var md5 = createCommonjsModule(function (module) {
(function(){
  var crypt$1 = crypt,
      utf8 = charenc_1.utf8,
      isBuffer = isBuffer_1,
      bin = charenc_1.bin,

  // The core
  md5 = function (message, options) {
    // Convert to byte array
    if (message.constructor == String)
      if (options && options.encoding === 'binary')
        message = bin.stringToBytes(message);
      else
        message = utf8.stringToBytes(message);
    else if (isBuffer(message))
      message = Array.prototype.slice.call(message, 0);
    else if (!Array.isArray(message) && message.constructor !== Uint8Array)
      message = message.toString();
    // else, assume byte array already

    var m = crypt$1.bytesToWords(message),
        l = message.length * 8,
        a =  1732584193,
        b = -271733879,
        c = -1732584194,
        d =  271733878;

    // Swap endian
    for (var i = 0; i < m.length; i++) {
      m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
             ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
    }

    // Padding
    m[l >>> 5] |= 0x80 << (l % 32);
    m[(((l + 64) >>> 9) << 4) + 14] = l;

    // Method shortcuts
    var FF = md5._ff,
        GG = md5._gg,
        HH = md5._hh,
        II = md5._ii;

    for (var i = 0; i < m.length; i += 16) {

      var aa = a,
          bb = b,
          cc = c,
          dd = d;

      a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
      d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
      c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
      b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
      a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
      d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
      c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
      b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
      a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
      d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
      c = FF(c, d, a, b, m[i+10], 17, -42063);
      b = FF(b, c, d, a, m[i+11], 22, -1990404162);
      a = FF(a, b, c, d, m[i+12],  7,  1804603682);
      d = FF(d, a, b, c, m[i+13], 12, -40341101);
      c = FF(c, d, a, b, m[i+14], 17, -1502002290);
      b = FF(b, c, d, a, m[i+15], 22,  1236535329);

      a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
      d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
      c = GG(c, d, a, b, m[i+11], 14,  643717713);
      b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
      a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
      d = GG(d, a, b, c, m[i+10],  9,  38016083);
      c = GG(c, d, a, b, m[i+15], 14, -660478335);
      b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
      a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
      d = GG(d, a, b, c, m[i+14],  9, -1019803690);
      c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
      b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
      a = GG(a, b, c, d, m[i+13],  5, -1444681467);
      d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
      c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
      b = GG(b, c, d, a, m[i+12], 20, -1926607734);

      a = HH(a, b, c, d, m[i+ 5],  4, -378558);
      d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
      c = HH(c, d, a, b, m[i+11], 16,  1839030562);
      b = HH(b, c, d, a, m[i+14], 23, -35309556);
      a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
      d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
      c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
      b = HH(b, c, d, a, m[i+10], 23, -1094730640);
      a = HH(a, b, c, d, m[i+13],  4,  681279174);
      d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
      c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
      b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
      a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
      d = HH(d, a, b, c, m[i+12], 11, -421815835);
      c = HH(c, d, a, b, m[i+15], 16,  530742520);
      b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

      a = II(a, b, c, d, m[i+ 0],  6, -198630844);
      d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
      c = II(c, d, a, b, m[i+14], 15, -1416354905);
      b = II(b, c, d, a, m[i+ 5], 21, -57434055);
      a = II(a, b, c, d, m[i+12],  6,  1700485571);
      d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
      c = II(c, d, a, b, m[i+10], 15, -1051523);
      b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
      a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
      d = II(d, a, b, c, m[i+15], 10, -30611744);
      c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
      b = II(b, c, d, a, m[i+13], 21,  1309151649);
      a = II(a, b, c, d, m[i+ 4],  6, -145523070);
      d = II(d, a, b, c, m[i+11], 10, -1120210379);
      c = II(c, d, a, b, m[i+ 2], 15,  718787259);
      b = II(b, c, d, a, m[i+ 9], 21, -343485551);

      a = (a + aa) >>> 0;
      b = (b + bb) >>> 0;
      c = (c + cc) >>> 0;
      d = (d + dd) >>> 0;
    }

    return crypt$1.endian([a, b, c, d]);
  };

  // Auxiliary functions
  md5._ff  = function (a, b, c, d, x, s, t) {
    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._gg  = function (a, b, c, d, x, s, t) {
    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._hh  = function (a, b, c, d, x, s, t) {
    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._ii  = function (a, b, c, d, x, s, t) {
    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };

  // Package private blocksize
  md5._blocksize = 16;
  md5._digestsize = 16;

  module.exports = function (message, options) {
    if (message === undefined || message === null)
      throw new Error('Illegal argument ' + message);

    var digestbytes = crypt$1.wordsToBytes(md5(message, options));
    return options && options.asBytes ? digestbytes :
        options && options.asString ? bin.bytesToString(digestbytes) :
        crypt$1.bytesToHex(digestbytes);
  };

})();
});

class ComponentProp {
    constructor(attrib, defaultValue) {
        this.attrib = attrib;
        this.defaultValue = defaultValue;
        this.optional = this.attrib.substr(0, 3) === '::?';
        this.key = this.attrib.substr(this.optional ? 3 : 2).toLowerCase();
    }
    getValue(eProp) {
        return eProp.empty ? this.defaultValue : eProp.value;
    }
}

class ComponentPropManager {
    constructor(component) {
        this.component = component;
        linkProperties(this, this.component, ['meta']);
        this.extractProps();
    }
    extractProps() {
        this.props = [];
        if (typeof this.meta === 'undefined')
            return;
        const { attribs } = this.meta;
        const keys = Object.keys(attribs);
        const propAttribs = keys.filter((key) => key.substr(0, 2) === '::');
        propAttribs.map((key) => {
            this.props.push(new ComponentProp(key, attribs[key]));
        });
    }
    getProp(key) {
        key = key.toLowerCase();
        const props = this.props.filter((p) => p.key === key);
        return props.length === 0 ? undefined : props[0];
    }
}

class ComponentSlot {
    constructor(element) {
        this.prepareSlot(element);
    }
    prepareSlot(el) {
        const attribs = Object.assign(el.attribs, {
            name: ''
        });
        this.optional = attribs.type === 'snowblade-opt';
        this.name = attribs.name;
        this.isDefault = this.name.length === 0;
        const innerHTML = cheerio__default['default'](el).html();
        this.defaultContent = innerHTML.trim().length === 0 ? '' : innerHTML;
    }
}

class ComponentSlotManager {
    constructor(component) {
        this.component = component;
        this.prepareSlots();
    }
    prepareSlots() {
        const $ = cheerio__default['default'].load(this.component.source);
        const slots = [...$('slot[snowblade]')];
        const optionals = [...$('slot[snowblade-opt]')];
        this.slots = [];
        slots.concat(optionals).map((el) => {
            const slot = new ComponentSlot(el);
            if (typeof this.getDefaultSlot() !== 'undefined' ||
                (slot.isDefault && this.slots.length > 0))
                error(errComponentDefaultSlotMix(this.component.file));
            this.slots.push(slot);
        });
    }
    getDefaultSlot() {
        const def = this.slots.filter((slot) => slot.isDefault);
        return def.length === 0 ? undefined : def[0];
    }
}

class ComponentImplementation {
    constructor(context, component) {
        this.context = context;
        this.source = context.pureSource;
        this.component = component;
        this.buildOccurrences();
    }
    buildOccurrences() {
        const tag = this.component.name;
        const seqSelfClose = RegExp(`\<${tag}[^\/]*\/>`, 'g');
        const seqOpen = RegExp(`(\<${tag}[^\>\/\<]*>)`, 'g');
        const seqClose = RegExp(`\<\/${tag}>`, 'g');
        let match;
        this.selfClose = [];
        while ((match = seqSelfClose.exec(this.source)) !== null) {
            this.selfClose.push(new ComponentOccurrence({
                literal: match[0],
                start: match.index,
                end: seqSelfClose.lastIndex,
                type: TagType.SELF
            }));
        }
        this.startTags = [];
        while ((match = seqOpen.exec(this.source)) !== null) {
            this.startTags.push({
                literal: match[0],
                start: match.index,
                end: seqOpen.lastIndex,
                type: TagType.START
            });
        }
        this.closeTags = [];
        while ((match = seqClose.exec(this.source)) !== null) {
            this.closeTags.push({
                literal: match[0],
                start: match.index,
                end: seqClose.lastIndex,
                type: TagType.END
            });
        }
        this.occurrences = [];
        this.startTags.forEach(this.resolveTagPairs);
        this.occurrences = this.occurrences.concat(this.selfClose);
    }
    resolveTagPairs(startTag, index) {
        if (index < this.startTags.length - 1) {
            if (this.startTags[index + 1].start < this.closeTags[0].start) {
                this.resolveTagPairs(startTag, index + 1);
            }
            else {
                this.occurrences.push(new ComponentOccurrence(startTag, this.closeTags.shift()));
            }
        }
        else {
            this.occurrences.push(new ComponentOccurrence(startTag, this.closeTags.shift()));
        }
    }
    tokenizeOccurrences() {
        let source = this.source;
        this.occurrences.forEach((occurence) => {
            const symbol = !occurence?.endTag ? 'Ɛ' : '¿';
            const { startTag } = occurence;
            const startToken = `<${symbol}${fill(startTag.literal.length - 3, '~')}>`;
            source = replaceAt(source, startTag.start, startTag.literal, startToken);
            if (!occurence?.endTag)
                return;
            const { endTag } = occurence;
            const endToken = `<¡${fill(endTag.literal.length - 3, '~')}>`;
            source = replaceAt(source, endTag.start, endTag.literal, endToken);
        });
        return source;
    }
    processRename(action) {
        let source = this.tokenizeOccurrences();
        const actionRegex = new RegExp({
            NAME: `(((\<)|(\<\/))${action.oldValue})`,
            PROPERTY: `::${action.oldValue}`
        }[action.type]);
        this.occurrences.forEach((occurrence) => {
            const tokenRegex = new RegExp(!occurrence?.endTag ? '<Ɛ~*>' : '<¿~*>');
            const startLiteral = occurrence.startTag.literal;
            const startPrefix = action.type === 'NAME' ? '<' : '::';
            source = source.replace(tokenRegex, startLiteral.replace(actionRegex, `${startPrefix}${action.newValue}`));
            if (!occurrence?.endTag)
                return;
            const name = action.type === 'NAME' ? action.newValue : this.component.name;
            source = source.replace(/<¡~*>/, `</${name}>`);
        });
        fs.writeFileSync(this.context.file, source);
        this.context.init();
    }
}
var ComponentRenameType;
(function (ComponentRenameType) {
    ComponentRenameType["NAME"] = "NAME";
    ComponentRenameType["PROPERTY"] = "PROPERTY";
})(ComponentRenameType || (ComponentRenameType = {}));
class ComponentOccurrence {
    constructor(startTag, endTag = undefined) {
        this.startTag = startTag;
        this.endTag = endTag;
    }
}
var TagType;
(function (TagType) {
    TagType["START"] = "START";
    TagType["END"] = "END";
    TagType["SELF"] = "SELF";
})(TagType || (TagType = {}));
class Component {
    constructor(context, path) {
        this.context = context;
        this.path = path;
        linkProperties(this, this.context, ['componentProvider']);
        this.init();
    }
    init() {
        this.readSource();
        this.preparePipes();
        this.parseComponentMeta();
        this.prepareManagers();
        this.escapeSource();
        this.prepareDom();
    }
    parseComponentImplementations() {
        this.componentImplementations = [];
        this.importManager.imports.forEach((cImport) => {
            const tag = cImport?.expressionName;
            if (typeof tag === 'undefined')
                return;
            const regex = new RegExp(`((?<=\<)${tag})|((?<=\</)${tag})`, 'gi');
            const matches = this.source.match(regex);
            if (matches !== null)
                this.componentImplementations.push(new ComponentImplementation(this, cImport));
        });
    }
    preparePipes() {
        const $ = cheerio__default['default'].load(this.source);
        const script = [...$('script[snowblade]')];
        if (script.length === 0) {
            this.pipes = {};
            return;
        }
        let functions = $(script).html().trim();
        const filename = md5(this.path.concat(functions));
        const dir = path$1.resolve(`${path$1.resolve(__dirname)}${path$1.sep}..${path$1.sep}.pipes`);
        fs.mkdirSync(dir, { recursive: true });
        const filePath = url.pathToFileURL(`${dir}${path$1.sep}${filename}.cjs`).pathname;
        try {
            fs.realpathSync(filePath);
        }
        catch {
            functions = functions.replace(/function(?=\s*.*\(.*\)\s*{)/g, 'export function');
            const code = babel.transform(functions, {
                presets: ['@babel/preset-env']
            }).code;
            fs.writeFileSync(filePath, code);
        }
        this.pipes = require(filePath);
    }
    readSource() {
        try {
            this.file = fs.realpathSync(this.path);
            this.source = fs.readFileSync(this.file, {
                encoding: 'utf-8'
            });
            this.pureSource = `${this.source}`;
        }
        catch (err) {
            error(err.code === 'ENOENT' ? errComponentNoFile(this) : err);
        }
    }
    escapeSource() {
        this.escapeSelfClosing();
        this.escapeUnsafeTags();
        this.escapeShorthand();
        this.escapeExpressions();
    }
    prepareDom() {
        const $ = cheerio__default['default'].load(this.source);
        const remove = ['script[snowblade]', 'meta[snowblade]', 'link[snowblade]'];
        remove.map((rm) => {
            $(rm).each((i, el) => {
                $(el).remove();
            });
        });
        const head = $('head');
        const wrappedHead = `<snowblade-head>${head.html()}</snowblade-head>`;
        const body = $('body');
        body.html(`${wrappedHead}${body.html()}`);
        head.empty();
        this.source = body.html();
    }
    escapeExpressions() {
        this.importManager.imports.map((i) => {
            const regex = new RegExp(`((?<=\<)${i.name})|((?<=\</)${i.name})`, 'g');
            this.source = this.source.replace(regex, i.expressionName);
        });
    }
    escapeUnsafeTags() {
        escapeTags.map((tag) => {
            const regex = new RegExp(`((?<=\<)${tag.unescaped})|((?<=\</)${tag.unescaped})`, 'gi');
            this.source = this.source.replace(regex, tag.escaped);
        });
    }
    parseComponentMeta() {
        if (this.isInputComponent)
            return;
        const $ = cheerio__default['default'].load(this.source);
        this.meta = $('meta[snowblade]')[0];
        if (typeof this.meta === 'undefined') {
            return error(errComponentNoMeta(this.file));
        }
        this.name = this.meta.attribs.name;
        const escaped = this.name.replace(/[A-Z]/g, (m) => {
            return `_${m.toLowerCase()}`;
        });
        this.expressionName = `snowblade-${escaped}`;
    }
    prepareManagers() {
        this.propManager = new ComponentPropManager(this);
        this.importManager = new ComponentImportManager(this);
        if (!this.isInputComponent)
            this.slotManager = new ComponentSlotManager(this);
    }
    escapeShorthand() {
        const escape = [
            {
                seq: /\?snowblade/,
                sub: 'snowblade-opt:'
            },
            {
                seq: '::!',
                sub: 'snowblade-false:'
            }
        ];
        escape.map((esc) => {
            let regex = new RegExp(esc.seq, 'g');
            this.source = this.source.replace(regex, esc.sub);
        });
    }
    escapeSelfClosing() {
        this.importManager.imports.map((i) => {
            const regex = new RegExp(`<${i.name}(.*)\/>`, 'gi');
            this.source = this.source.replace(regex, `<${i.name}$1></${i.name}>`);
        });
    }
    get isInputComponent() {
        if (this.context instanceof Snowblade) {
            return this.context?.input === this.path;
        }
        else {
            return false;
        }
    }
}

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


var isWindows = process.platform === 'win32';


// JavaScript implementation of realpath, ported from node pre-v6

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  var callback;
  if (DEBUG) {
    var backtrace = new Error;
    callback = debugCallback;
  } else
    callback = missingCallback;

  return callback;

  function debugCallback(err) {
    if (err) {
      backtrace.message = err.message;
      err = backtrace;
      missingCallback(err);
    }
  }

  function missingCallback(err) {
    if (err) {
      if (process.throwDeprecation)
        throw err;  // Forgot a callback but don't know where? Use NODE_DEBUG=fs
      else if (!process.noDeprecation) {
        var msg = 'fs: missing callback ' + (err.stack || err.message);
        if (process.traceDeprecation)
          console.trace(msg);
        else
          console.error(msg);
      }
    }
  }
}

function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

path__default['default'].normalize;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}

var realpathSync = function realpathSync(p, cache) {
  // make p is absolute
  p = path__default['default'].resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs__default['default'].lstatSync(base);
      knownHard[base] = true;
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  // NB: p.length changes.
  while (pos < p.length) {
    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      continue;
    }

    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // some known symbolic link.  no need to stat again.
      resolvedLink = cache[base];
    } else {
      var stat = fs__default['default'].lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }

      // read the link if it wasn't read before
      // dev/ino always return 0 on windows, so skip the check.
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs__default['default'].statSync(base);
        linkTarget = fs__default['default'].readlinkSync(base);
      }
      resolvedLink = path__default['default'].resolve(previous, linkTarget);
      // track this, if given a cache.
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }

    // resolve the link, then start over
    p = path__default['default'].resolve(resolvedLink, p.slice(pos));
    start();
  }

  if (cache) cache[original] = p;

  return p;
};


var realpath = function realpath(p, cache, cb) {
  if (typeof cb !== 'function') {
    cb = maybeCallback(cache);
    cache = null;
  }

  // make p is absolute
  p = path__default['default'].resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return process.nextTick(cb.bind(null, null, cache[p]));
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs__default['default'].lstat(base, function(err) {
        if (err) return cb(err);
        knownHard[base] = true;
        LOOP();
      });
    } else {
      process.nextTick(LOOP);
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  function LOOP() {
    // stop if scanned past end of path
    if (pos >= p.length) {
      if (cache) cache[original] = p;
      return cb(null, p);
    }

    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      return process.nextTick(LOOP);
    }

    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // known symbolic link.  no need to stat again.
      return gotResolvedLink(cache[base]);
    }

    return fs__default['default'].lstat(base, gotStat);
  }

  function gotStat(err, stat) {
    if (err) return cb(err);

    // if not a symlink, skip to the next path part
    if (!stat.isSymbolicLink()) {
      knownHard[base] = true;
      if (cache) cache[base] = base;
      return process.nextTick(LOOP);
    }

    // stat & read the link if not read before
    // call gotTarget as soon as the link target is known
    // dev/ino always return 0 on windows, so skip the check.
    if (!isWindows) {
      var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
      if (seenLinks.hasOwnProperty(id)) {
        return gotTarget(null, seenLinks[id], base);
      }
    }
    fs__default['default'].stat(base, function(err) {
      if (err) return cb(err);

      fs__default['default'].readlink(base, function(err, target) {
        if (!isWindows) seenLinks[id] = target;
        gotTarget(err, target);
      });
    });
  }

  function gotTarget(err, target, base) {
    if (err) return cb(err);

    var resolvedLink = path__default['default'].resolve(previous, target);
    if (cache) cache[base] = resolvedLink;
    gotResolvedLink(resolvedLink);
  }

  function gotResolvedLink(resolvedLink) {
    // resolve the link, then start over
    p = path__default['default'].resolve(resolvedLink, p.slice(pos));
    start();
  }
};

var old = {
	realpathSync: realpathSync,
	realpath: realpath
};

var fs_realpath = realpath$1;
realpath$1.realpath = realpath$1;
realpath$1.sync = realpathSync$1;
realpath$1.realpathSync = realpathSync$1;
realpath$1.monkeypatch = monkeypatch;
realpath$1.unmonkeypatch = unmonkeypatch;


var origRealpath = fs__default['default'].realpath;
var origRealpathSync = fs__default['default'].realpathSync;

var version = process.version;
var ok = /^v[0-5]\./.test(version);


function newError (er) {
  return er && er.syscall === 'realpath' && (
    er.code === 'ELOOP' ||
    er.code === 'ENOMEM' ||
    er.code === 'ENAMETOOLONG'
  )
}

function realpath$1 (p, cache, cb) {
  if (ok) {
    return origRealpath(p, cache, cb)
  }

  if (typeof cache === 'function') {
    cb = cache;
    cache = null;
  }
  origRealpath(p, cache, function (er, result) {
    if (newError(er)) {
      old.realpath(p, cache, cb);
    } else {
      cb(er, result);
    }
  });
}

function realpathSync$1 (p, cache) {
  if (ok) {
    return origRealpathSync(p, cache)
  }

  try {
    return origRealpathSync(p, cache)
  } catch (er) {
    if (newError(er)) {
      return old.realpathSync(p, cache)
    } else {
      throw er
    }
  }
}

function monkeypatch () {
  fs__default['default'].realpath = realpath$1;
  fs__default['default'].realpathSync = realpathSync$1;
}

function unmonkeypatch () {
  fs__default['default'].realpath = origRealpath;
  fs__default['default'].realpathSync = origRealpathSync;
}

var concatMap = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var balancedMatch = balanced;
function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);

  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}

var braceExpansion = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balancedMatch('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balancedMatch('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(',') >= 0;
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length);
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}

var minimatch_1 = minimatch;
minimatch.Minimatch = Minimatch;

var path = { sep: '/' };
try {
  path = path__default['default'];
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};


var plTypes = {
  '!': { open: '(?:(?!(?:', close: '))[^/]*?)'},
  '?': { open: '(?:', close: ')?' },
  '+': { open: '(?:', close: ')+' },
  '*': { open: '(?:', close: ')*' },
  '@': { open: '(?:', close: ')' }
};

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]';

// * => any number of characters
var star = qmark + '*?';

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?';

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?';

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!');

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true;
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/;

minimatch.filter = filter;
function filter (pattern, options) {
  options = options || {};
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {};
  b = b || {};
  var t = {};
  Object.keys(b).forEach(function (k) {
    t[k] = b[k];
  });
  Object.keys(a).forEach(function (k) {
    t[k] = a[k];
  });
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch;

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  };

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  };

  return m
};

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
};

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {};

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {};
  pattern = pattern.trim();

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/');
  }

  this.options = options;
  this.set = [];
  this.pattern = pattern;
  this.regexp = null;
  this.negate = false;
  this.comment = false;
  this.empty = false;

  // make the set of regexps etc.
  this.make();
}

Minimatch.prototype.debug = function () {};

Minimatch.prototype.make = make;
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern;
  var options = this.options;

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true;
    return
  }
  if (!pattern) {
    this.empty = true;
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate();

  // step 2: expand braces
  var set = this.globSet = this.braceExpand();

  if (options.debug) this.debug = console.error;

  this.debug(this.pattern, set);

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  });

  this.debug(this.pattern, set);

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this);

  this.debug(this.pattern, set);

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  });

  this.debug(this.pattern, set);

  this.set = set;
}

Minimatch.prototype.parseNegate = parseNegate;
function parseNegate () {
  var pattern = this.pattern;
  var negate = false;
  var options = this.options;
  var negateOffset = 0;

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate;
    negateOffset++;
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset);
  this.negate = negate;
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
};

Minimatch.prototype.braceExpand = braceExpand;

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options;
    } else {
      options = {};
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern;

  if (typeof pattern === 'undefined') {
    throw new TypeError('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return braceExpansion(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse;
var SUBPARSE = {};
function parse (pattern, isSub) {
  if (pattern.length > 1024 * 64) {
    throw new TypeError('pattern is too long')
  }

  var options = this.options;

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = '';
  var hasMagic = !!options.nocase;
  var escaping = false;
  // ? => one single character
  var patternListStack = [];
  var negativeLists = [];
  var stateChar;
  var inClass = false;
  var reClassStart = -1;
  var classStart = -1;
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)';
  var self = this;

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star;
          hasMagic = true;
        break
        case '?':
          re += qmark;
          hasMagic = true;
        break
        default:
          re += '\\' + stateChar;
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re);
      stateChar = false;
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c);

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c;
      escaping = false;
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar();
        escaping = true;
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c);

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class');
          if (c === '!' && i === classStart + 1) c = '^';
          re += c;
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar);
        clearStateChar();
        stateChar = c;
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar();
      continue

      case '(':
        if (inClass) {
          re += '(';
          continue
        }

        if (!stateChar) {
          re += '\\(';
          continue
        }

        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        });
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:';
        this.debug('plType %j %j', stateChar, re);
        stateChar = false;
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)';
          continue
        }

        clearStateChar();
        hasMagic = true;
        var pl = patternListStack.pop();
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        re += pl.close;
        if (pl.type === '!') {
          negativeLists.push(pl);
        }
        pl.reEnd = re.length;
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|';
          escaping = false;
          continue
        }

        clearStateChar();
        re += '|';
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar();

        if (inClass) {
          re += '\\' + c;
          continue
        }

        inClass = true;
        classStart = i;
        reClassStart = re.length;
        re += c;
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c;
          escaping = false;
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i);
          try {
            RegExp('[' + cs + ']');
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE);
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]';
            hasMagic = hasMagic || sp[1];
            inClass = false;
            continue
          }
        }

        // finish up the class.
        hasMagic = true;
        inClass = false;
        re += c;
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar();

        if (escaping) {
          // no need
          escaping = false;
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\';
        }

        re += c;

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1);
    sp = this.parse(cs, SUBPARSE);
    re = re.substr(0, reClassStart) + '\\[' + sp[0];
    hasMagic = hasMagic || sp[1];
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length);
    this.debug('setting tail', re, pl);
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\';
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    });

    this.debug('tail=%j\n   %s', tail, tail, pl, re);
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type;

    hasMagic = true;
    re = re.slice(0, pl.reStart) + t + '\\(' + tail;
  }

  // handle trailing things that only matter at the very end.
  clearStateChar();
  if (escaping) {
    // trailing \\
    re += '\\\\';
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false;
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true;
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n];

    var nlBefore = re.slice(0, nl.reStart);
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
    var nlAfter = re.slice(nl.reEnd);

    nlLast += nlAfter;

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1;
    var cleanAfter = nlAfter;
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '');
    }
    nlAfter = cleanAfter;

    var dollar = '';
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$';
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
    re = newRe;
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re;
  }

  if (addPatternStart) {
    re = patternStart + re;
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : '';
  try {
    var regExp = new RegExp('^' + re + '$', flags);
  } catch (er) {
    // If it was an invalid regular expression, then it can't match
    // anything.  This trick looks for a character after the end of
    // the string, which is of course impossible, except in multi-line
    // mode, but it's not a /m regex.
    return new RegExp('$.')
  }

  regExp._glob = pattern;
  regExp._src = re;

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
};

Minimatch.prototype.makeRe = makeRe;
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set;

  if (!set.length) {
    this.regexp = false;
    return this.regexp
  }
  var options = this.options;

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot;
  var flags = options.nocase ? 'i' : '';

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|');

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$';

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$';

  try {
    this.regexp = new RegExp(re, flags);
  } catch (ex) {
    this.regexp = false;
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {};
  var mm = new Minimatch(pattern, options);
  list = list.filter(function (f) {
    return mm.match(f)
  });
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list
};

Minimatch.prototype.match = match;
function match (f, partial) {
  this.debug('match', f, this.pattern);
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options;

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/');
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit);
  this.debug(this.pattern, 'split', f);

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set;
  this.debug(this.pattern, 'set', set);

  // Find the basename of the path by looking for the last non-empty segment
  var filename;
  var i;
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i];
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i];
    var file = f;
    if (options.matchBase && pattern.length === 1) {
      file = [filename];
    }
    var hit = this.matchOne(file, pattern, partial);
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options;

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern });

  this.debug('matchOne', file.length, pattern.length);

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop');
    var p = pattern[pi];
    var f = file[fi];

    this.debug(pattern, p, f);

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f]);

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi;
      var pr = pi + 1;
      if (pr === pl) {
        this.debug('** at the end');
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr];

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee);

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee);
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr);
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue');
          fr++;
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr);
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit;
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase();
      } else {
        hit = f === p;
      }
      this.debug('string match', p, f, hit);
    } else {
      hit = f.match(p);
      this.debug('pattern match', p, f, hit);
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '');
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
};

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

var inherits_browser = createCommonjsModule(function (module) {
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}
});

var inherits = createCommonjsModule(function (module) {
try {
  var util = require$$0__default['default'];
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  module.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  module.exports = inherits_browser;
}
});

function posix(path) {
	return path.charAt(0) === '/';
}

function win32(path) {
	// https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
	var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
	var result = splitDeviceRe.exec(path);
	var device = result[1] || '';
	var isUnc = Boolean(device && device.charAt(1) !== ':');

	// UNC paths are always absolute
	return Boolean(result[2] || isUnc);
}

var pathIsAbsolute = process.platform === 'win32' ? win32 : posix;
var posix_1 = posix;
var win32_1 = win32;
pathIsAbsolute.posix = posix_1;
pathIsAbsolute.win32 = win32_1;

var alphasort_1 = alphasort;
var alphasorti_1 = alphasorti;
var setopts_1 = setopts;
var ownProp_1 = ownProp;
var makeAbs_1 = makeAbs;
var finish_1 = finish;
var mark_1 = mark;
var isIgnored_1 = isIgnored;
var childrenIgnored_1 = childrenIgnored;

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}




var Minimatch$1 = minimatch_1.Minimatch;

function alphasorti (a, b) {
  return a.toLowerCase().localeCompare(b.toLowerCase())
}

function alphasort (a, b) {
  return a.localeCompare(b)
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || [];

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore];

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap);
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null;
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '');
    gmatcher = new Minimatch$1(gpattern, { dot: true });
  }

  return {
    matcher: new Minimatch$1(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {};

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern;
  }

  self.silent = !!options.silent;
  self.pattern = pattern;
  self.strict = options.strict !== false;
  self.realpath = !!options.realpath;
  self.realpathCache = options.realpathCache || Object.create(null);
  self.follow = !!options.follow;
  self.dot = !!options.dot;
  self.mark = !!options.mark;
  self.nodir = !!options.nodir;
  if (self.nodir)
    self.mark = true;
  self.sync = !!options.sync;
  self.nounique = !!options.nounique;
  self.nonull = !!options.nonull;
  self.nosort = !!options.nosort;
  self.nocase = !!options.nocase;
  self.stat = !!options.stat;
  self.noprocess = !!options.noprocess;
  self.absolute = !!options.absolute;

  self.maxLength = options.maxLength || Infinity;
  self.cache = options.cache || Object.create(null);
  self.statCache = options.statCache || Object.create(null);
  self.symlinks = options.symlinks || Object.create(null);

  setupIgnores(self, options);

  self.changedCwd = false;
  var cwd = process.cwd();
  if (!ownProp(options, "cwd"))
    self.cwd = cwd;
  else {
    self.cwd = path__default['default'].resolve(options.cwd);
    self.changedCwd = self.cwd !== cwd;
  }

  self.root = options.root || path__default['default'].resolve(self.cwd, "/");
  self.root = path__default['default'].resolve(self.root);
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/");

  // TODO: is an absolute `cwd` supposed to be resolved against `root`?
  // e.g. { cwd: '/test', root: __dirname } === path.join(__dirname, '/test')
  self.cwdAbs = pathIsAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd);
  if (process.platform === "win32")
    self.cwdAbs = self.cwdAbs.replace(/\\/g, "/");
  self.nomount = !!options.nomount;

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true;
  options.nocomment = true;

  self.minimatch = new Minimatch$1(pattern, options);
  self.options = self.minimatch.options;
}

function finish (self) {
  var nou = self.nounique;
  var all = nou ? [] : Object.create(null);

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i];
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i];
        if (nou)
          all.push(literal);
        else
          all[literal] = true;
      }
    } else {
      // had matches
      var m = Object.keys(matches);
      if (nou)
        all.push.apply(all, m);
      else
        m.forEach(function (m) {
          all[m] = true;
        });
    }
  }

  if (!nou)
    all = Object.keys(all);

  if (!self.nosort)
    all = all.sort(self.nocase ? alphasorti : alphasort);

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i]);
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        var notDir = !(/\/$/.test(e));
        var c = self.cache[e] || self.cache[makeAbs(self, e)];
        if (notDir && c)
          notDir = c !== 'DIR' && !Array.isArray(c);
        return notDir
      });
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    });

  self.found = all;
}

function mark (self, p) {
  var abs = makeAbs(self, p);
  var c = self.cache[abs];
  var m = p;
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c);
    var slash = p.slice(-1) === '/';

    if (isDir && !slash)
      m += '/';
    else if (!isDir && slash)
      m = m.slice(0, -1);

    if (m !== p) {
      var mabs = makeAbs(self, m);
      self.statCache[mabs] = self.statCache[abs];
      self.cache[mabs] = self.cache[abs];
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f;
  if (f.charAt(0) === '/') {
    abs = path__default['default'].join(self.root, f);
  } else if (pathIsAbsolute(f) || f === '') {
    abs = f;
  } else if (self.changedCwd) {
    abs = path__default['default'].resolve(self.cwd, f);
  } else {
    abs = path__default['default'].resolve(f);
  }

  if (process.platform === 'win32')
    abs = abs.replace(/\\/g, '/');

  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
  })
}

function childrenIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path))
  })
}

var common = {
	alphasort: alphasort_1,
	alphasorti: alphasorti_1,
	setopts: setopts_1,
	ownProp: ownProp_1,
	makeAbs: makeAbs_1,
	finish: finish_1,
	mark: mark_1,
	isIgnored: isIgnored_1,
	childrenIgnored: childrenIgnored_1
};

var sync = globSync;
globSync.GlobSync = GlobSync;
var setopts$1 = common.setopts;
var ownProp$1 = common.ownProp;
var childrenIgnored$1 = common.childrenIgnored;
var isIgnored$1 = common.isIgnored;

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts$1(this, pattern, options);

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length;
  this.matches = new Array(n);
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false);
  }
  this._finish();
}

GlobSync.prototype._finish = function () {
  assert__default['default'](this instanceof GlobSync);
  if (this.realpath) {
    var self = this;
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null);
      for (var p in matchset) {
        try {
          p = self._makeAbs(p);
          var real = fs_realpath.realpathSync(p, self.realpathCache);
          set[real] = true;
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true;
          else
            throw er
        }
      }
    });
  }
  common.finish(this);
};


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert__default['default'](this instanceof GlobSync);

  // Get the first [n] parts of pattern that are all strings.
  var n = 0;
  while (typeof pattern[n] === 'string') {
    n ++;
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix;
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index);
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null;
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/');
      break
  }

  var remain = pattern.slice(n);

  // get the list of entries.
  var read;
  if (prefix === null)
    read = '.';
  else if (pathIsAbsolute(prefix) || pathIsAbsolute(pattern.join('/'))) {
    if (!prefix || !pathIsAbsolute(prefix))
      prefix = '/' + prefix;
    read = prefix;
  } else
    read = prefix;

  var abs = this._makeAbs(read);

  //if ignored, skip processing
  if (childrenIgnored$1(this, read))
    return

  var isGlobStar = remain[0] === minimatch_1.GLOBSTAR;
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar);
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar);
};


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar);

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0];
  var negate = !!this.minimatch.negate;
  var rawGlob = pn._glob;
  var dotOk = this.dot || rawGlob.charAt(0) === '.';

  var matchedEntries = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.charAt(0) !== '.' || dotOk) {
      var m;
      if (negate && !prefix) {
        m = !e.match(pn);
      } else {
        m = e.match(pn);
      }
      if (m)
        matchedEntries.push(e);
    }
  }

  var len = matchedEntries.length;
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null);

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i];
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e;
        else
          e = prefix + e;
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path__default['default'].join(this.root, e);
      }
      this._emitMatch(index, e);
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift();
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i];
    var newPattern;
    if (prefix)
      newPattern = [prefix, e];
    else
      newPattern = [e];
    this._process(newPattern.concat(remain), index, inGlobStar);
  }
};


GlobSync.prototype._emitMatch = function (index, e) {
  if (isIgnored$1(this, e))
    return

  var abs = this._makeAbs(e);

  if (this.mark)
    e = this._mark(e);

  if (this.absolute) {
    e = abs;
  }

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs];
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true;

  if (this.stat)
    this._stat(e);
};


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries;
  var lstat;
  try {
    lstat = fs__default['default'].lstatSync(abs);
  } catch (er) {
    if (er.code === 'ENOENT') {
      // lstat failed, doesn't exist
      return null
    }
  }

  var isSym = lstat && lstat.isSymbolicLink();
  this.symlinks[abs] = isSym;

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && lstat && !lstat.isDirectory())
    this.cache[abs] = 'FILE';
  else
    entries = this._readdir(abs, false);

  return entries
};

GlobSync.prototype._readdir = function (abs, inGlobStar) {

  if (inGlobStar && !ownProp$1(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp$1(this.cache, abs)) {
    var c = this.cache[abs];
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, fs__default['default'].readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er);
    return null
  }
};

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i];
      if (abs === '/')
        e = abs + e;
      else
        e = abs + '/' + e;
      this.cache[e] = true;
    }
  }

  this.cache[abs] = entries;

  // mark and cache dir-ness
  return entries
};

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f);
      this.cache[abs] = 'FILE';
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd);
        error.path = this.cwd;
        error.code = er.code;
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false;
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false;
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er);
      break
  }
};

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar);

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1);
  var gspref = prefix ? [ prefix ] : [];
  var noGlobStar = gspref.concat(remainWithoutGlobStar);

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false);

  var len = entries.length;
  var isSym = this.symlinks[abs];

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i];
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar);
    this._process(instead, index, true);

    var below = gspref.concat(entries[i], remain);
    this._process(below, index, true);
  }
};

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix);

  if (!this.matches[index])
    this.matches[index] = Object.create(null);

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && pathIsAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix);
    if (prefix.charAt(0) === '/') {
      prefix = path__default['default'].join(this.root, prefix);
    } else {
      prefix = path__default['default'].resolve(this.root, prefix);
      if (trail)
        prefix += '/';
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/');

  // Mark this as a match
  this._emitMatch(index, prefix);
};

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f);
  var needDir = f.slice(-1) === '/';

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp$1(this.cache, abs)) {
    var c = this.cache[abs];

    if (Array.isArray(c))
      c = 'DIR';

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }
  var stat = this.statCache[abs];
  if (!stat) {
    var lstat;
    try {
      lstat = fs__default['default'].lstatSync(abs);
    } catch (er) {
      if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
        this.statCache[abs] = false;
        return false
      }
    }

    if (lstat && lstat.isSymbolicLink()) {
      try {
        stat = fs__default['default'].statSync(abs);
      } catch (er) {
        stat = lstat;
      }
    } else {
      stat = lstat;
    }
  }

  this.statCache[abs] = stat;

  var c = true;
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE';

  this.cache[abs] = this.cache[abs] || c;

  if (needDir && c === 'FILE')
    return false

  return c
};

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
};

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
};

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
var wrappy_1 = wrappy;
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k];
  });

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    var ret = fn.apply(this, args);
    var cb = args[args.length-1];
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k];
      });
    }
    return ret
  }
}

var once_1 = wrappy_1(once);
var strict = wrappy_1(onceStrict);

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  });

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  });
});

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true;
    return f.value = fn.apply(this, arguments)
  };
  f.called = false;
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true;
    return f.value = fn.apply(this, arguments)
  };
  var name = fn.name || 'Function wrapped with `once`';
  f.onceError = name + " shouldn't be called more than once";
  f.called = false;
  return f
}
once_1.strict = strict;

var reqs = Object.create(null);


var inflight_1 = wrappy_1(inflight);

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb);
    return null
  } else {
    reqs[key] = [cb];
    return makeres(key)
  }
}

function makeres (key) {
  return once_1(function RES () {
    var cbs = reqs[key];
    var len = cbs.length;
    var args = slice(arguments);

    // XXX It's somewhat ambiguous whether a new callback added in this
    // pass should be queued for later execution if something in the
    // list of callbacks throws, or if it should just be discarded.
    // However, it's such an edge case that it hardly matters, and either
    // choice is likely as surprising as the other.
    // As it happens, we do go ahead and schedule it for later execution.
    try {
      for (var i = 0; i < len; i++) {
        cbs[i].apply(null, args);
      }
    } finally {
      if (cbs.length > len) {
        // added more in the interim.
        // de-zalgo, just in case, but don't call again.
        cbs.splice(0, len);
        process.nextTick(function () {
          RES.apply(null, args);
        });
      } else {
        delete reqs[key];
      }
    }
  })
}

function slice (args) {
  var length = args.length;
  var array = [];

  for (var i = 0; i < length; i++) array[i] = args[i];
  return array
}

// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

var glob_1 = glob;

var EE = require$$0__default$1['default'].EventEmitter;
var setopts$2 = common.setopts;
var ownProp$2 = common.ownProp;


var childrenIgnored$2 = common.childrenIgnored;
var isIgnored$2 = common.isIgnored;



function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {};
  if (!options) options = {};

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return sync(pattern, options)
  }

  return new Glob(pattern, options, cb)
}

glob.sync = sync;
var GlobSync$1 = glob.GlobSync = sync.GlobSync;

// old api surface
glob.glob = glob;

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_);
  options.noprocess = true;

  var g = new Glob(pattern, options);
  var set = g.minimatch.set;

  if (!pattern)
    return false

  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
};

glob.Glob = Glob;
inherits(Glob, EE);
function Glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync$1(pattern, options)
  }

  if (!(this instanceof Glob))
    return new Glob(pattern, options, cb)

  setopts$2(this, pattern, options);
  this._didRealPath = false;

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length;

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n);

  if (typeof cb === 'function') {
    cb = once_1(cb);
    this.on('error', cb);
    this.on('end', function (matches) {
      cb(null, matches);
    });
  }

  var self = this;
  this._processing = 0;

  this._emitQueue = [];
  this._processQueue = [];
  this.paused = false;

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  var sync = true;
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done);
  }
  sync = false;

  function done () {
    --self._processing;
    if (self._processing <= 0) {
      if (sync) {
        process.nextTick(function () {
          self._finish();
        });
      } else {
        self._finish();
      }
    }
  }
}

Glob.prototype._finish = function () {
  assert__default['default'](this instanceof Glob);
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this);
  this.emit('end', this.found);
};

Glob.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true;

  var n = this.matches.length;
  if (n === 0)
    return this._finish()

  var self = this;
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next);

  function next () {
    if (--n === 0)
      self._finish();
  }
};

Glob.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index];
  if (!matchset)
    return cb()

  var found = Object.keys(matchset);
  var self = this;
  var n = found.length;

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null);
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p);
    fs_realpath.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true;
      else if (er.syscall === 'stat')
        set[p] = true;
      else
        self.emit('error', er); // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set;
        cb();
      }
    });
  });
};

Glob.prototype._mark = function (p) {
  return common.mark(this, p)
};

Glob.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
};

Glob.prototype.abort = function () {
  this.aborted = true;
  this.emit('abort');
};

Glob.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true;
    this.emit('pause');
  }
};

Glob.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume');
    this.paused = false;
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0);
      this._emitQueue.length = 0;
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i];
        this._emitMatch(e[0], e[1]);
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0);
      this._processQueue.length = 0;
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i];
        this._processing--;
        this._process(p[0], p[1], p[2], p[3]);
      }
    }
  }
};

Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert__default['default'](this instanceof Glob);
  assert__default['default'](typeof cb === 'function');

  if (this.aborted)
    return

  this._processing++;
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb]);
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0;
  while (typeof pattern[n] === 'string') {
    n ++;
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix;
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb);
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null;
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/');
      break
  }

  var remain = pattern.slice(n);

  // get the list of entries.
  var read;
  if (prefix === null)
    read = '.';
  else if (pathIsAbsolute(prefix) || pathIsAbsolute(pattern.join('/'))) {
    if (!prefix || !pathIsAbsolute(prefix))
      prefix = '/' + prefix;
    read = prefix;
  } else
    read = prefix;

  var abs = this._makeAbs(read);

  //if ignored, skip _processing
  if (childrenIgnored$2(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch_1.GLOBSTAR;
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
};

Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this;
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  });
};

Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0];
  var negate = !!this.minimatch.negate;
  var rawGlob = pn._glob;
  var dotOk = this.dot || rawGlob.charAt(0) === '.';

  var matchedEntries = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.charAt(0) !== '.' || dotOk) {
      var m;
      if (negate && !prefix) {
        m = !e.match(pn);
      } else {
        m = e.match(pn);
      }
      if (m)
        matchedEntries.push(e);
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length;
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null);

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i];
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e;
        else
          e = prefix + e;
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path__default['default'].join(this.root, e);
      }
      this._emitMatch(index, e);
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift();
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i];
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e;
      else
        e = prefix + e;
    }
    this._process([e].concat(remain), index, inGlobStar, cb);
  }
  cb();
};

Glob.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (isIgnored$2(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e]);
    return
  }

  var abs = pathIsAbsolute(e) ? e : this._makeAbs(e);

  if (this.mark)
    e = this._mark(e);

  if (this.absolute)
    e = abs;

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs];
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true;

  var st = this.statCache[abs];
  if (st)
    this.emit('stat', e, st);

  this.emit('match', e);
};

Glob.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs;
  var self = this;
  var lstatcb = inflight_1(lstatkey, lstatcb_);

  if (lstatcb)
    fs__default['default'].lstat(abs, lstatcb);

  function lstatcb_ (er, lstat) {
    if (er && er.code === 'ENOENT')
      return cb()

    var isSym = lstat && lstat.isSymbolicLink();
    self.symlinks[abs] = isSym;

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && lstat && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE';
      cb();
    } else
      self._readdir(abs, false, cb);
  }
};

Glob.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight_1('readdir\0'+abs+'\0'+inGlobStar, cb);
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp$2(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp$2(this.cache, abs)) {
    var c = this.cache[abs];
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }
  fs__default['default'].readdir(abs, readdirCb(this, abs, cb));
};

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb);
    else
      self._readdirEntries(abs, entries, cb);
  }
}

Glob.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i];
      if (abs === '/')
        e = abs + e;
      else
        e = abs + '/' + e;
      this.cache[e] = true;
    }
  }

  this.cache[abs] = entries;
  return cb(null, entries)
};

Glob.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f);
      this.cache[abs] = 'FILE';
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd);
        error.path = this.cwd;
        error.code = er.code;
        this.emit('error', error);
        this.abort();
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false;
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false;
      if (this.strict) {
        this.emit('error', er);
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort();
      }
      if (!this.silent)
        console.error('glob error', er);
      break
  }

  return cb()
};

Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this;
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
  });
};


Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1);
  var gspref = prefix ? [ prefix ] : [];
  var noGlobStar = gspref.concat(remainWithoutGlobStar);

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb);

  var isSym = this.symlinks[abs];
  var len = entries.length;

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i];
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar);
    this._process(instead, index, true, cb);

    var below = gspref.concat(entries[i], remain);
    this._process(below, index, true, cb);
  }

  cb();
};

Glob.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this;
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb);
  });
};
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null);

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && pathIsAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix);
    if (prefix.charAt(0) === '/') {
      prefix = path__default['default'].join(this.root, prefix);
    } else {
      prefix = path__default['default'].resolve(this.root, prefix);
      if (trail)
        prefix += '/';
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/');

  // Mark this as a match
  this._emitMatch(index, prefix);
  cb();
};

// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f);
  var needDir = f.slice(-1) === '/';

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp$2(this.cache, abs)) {
    var c = this.cache[abs];

    if (Array.isArray(c))
      c = 'DIR';

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }
  var stat = this.statCache[abs];
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE';
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this;
  var statcb = inflight_1('stat\0' + abs, lstatcb_);
  if (statcb)
    fs__default['default'].lstat(abs, statcb);

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return fs__default['default'].stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb);
        else
          self._stat2(f, abs, er, stat, cb);
      })
    } else {
      self._stat2(f, abs, er, lstat, cb);
    }
  }
};

Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
    this.statCache[abs] = false;
    return cb()
  }

  var needDir = f.slice(-1) === '/';
  this.statCache[abs] = stat;

  if (abs.slice(-1) === '/' && stat && !stat.isDirectory())
    return cb(null, false, stat)

  var c = true;
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE';
  this.cache[abs] = this.cache[abs] || c;

  if (needDir && c === 'FILE')
    return cb()

  return cb(null, c, stat)
};

class ComponentProvider {
    constructor(instance) {
        this.instance = instance;
        this.components = [];
        this.included = [];
    }
    prepareIncluded() {
        const paths = this.instance.include.reduce((arr, inc) => {
            return arr.concat(glob_1.sync(absolutePath(inc), {}));
        }, []);
        paths.forEach((fPath) => {
            try {
                const component = this.getComponentByHref(this.instance, fPath);
                this.included.push(component);
            }
            catch (err) {
                warning(`Invalid component at glob-resolved inclusion ${fPath}`);
            }
        });
    }
    getComponentByHref(context, href) {
        const abs = this.resolveHref(context, href);
        const stored = this.components.filter((c) => c.file === abs);
        const component = stored.length === 0 ? new Component(context, abs) : stored[0];
        if (stored.length === 0)
            this.components.push(component);
        return component;
    }
    resolveHref(context, href) {
        return `${path$1.isAbsolute(href) ? '' : dir(context.component.file)}${href}`;
    }
}

class Snowblade {
    constructor(config) {
        this.config = config;
        this.prepareConfig();
        this.initializeModules();
        this.prepareInput();
        this.prepareOutputs();
    }
    initializeModules() {
        this.componentProvider = new ComponentProvider(this);
        this.componentProvider.prepareIncluded();
    }
    prepareOutputs() {
        let { output } = this.config;
        output =
            typeof output === 'undefined'
                ? error(errConfigMissingProp('output'))
                : typeof output === 'object'
                    ? Array.isArray(output)
                        ? output
                        : [output]
                    : error(errConfigBadPropType('config', output));
        this.outputs = [];
        output.map((o) => {
            this.outputs.push(new Output(this, o));
        });
    }
    prepareInput() {
        const { input } = this.config;
        this.input = absolutePath(typeof input === 'undefined'
            ? error(errConfigMissingProp('input'))
            : typeof input !== 'string'
                ? error(errConfigBadPropType('input', input))
                : input);
        this.component = this.componentProvider.getComponentByHref(this, this.input);
    }
    prepareConfig() {
        const defaults = {
            lazy: false,
            mustache: true
        };
        const { include, lazy, mustache } = this.config;
        this.include =
            typeof include === 'undefined'
                ? []
                : typeof include === 'string'
                    ? [include]
                    : Array.isArray(include)
                        ? include
                        : error(errConfigBadPropType('include', include));
        this.lazy =
            typeof lazy === 'undefined'
                ? defaults.lazy
                : typeof lazy !== 'boolean'
                    ? error(errConfigBadPropType('lazy', lazy))
                    : lazy;
    }
}

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match words composed of alphanumeric characters. */
var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

/** Used to match Latin Unicode letters (excluding mathematical operators). */
var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff',
    rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0',
    rsDingbatRange = '\\u2700-\\u27bf',
    rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
    rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
    rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
    rsPunctuationRange = '\\u2000-\\u206f',
    rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
    rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
    rsVarRange = '\\ufe0e\\ufe0f',
    rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;

/** Used to compose unicode capture groups. */
var rsApos = "['\u2019]",
    rsAstral = '[' + rsAstralRange + ']',
    rsBreak = '[' + rsBreakRange + ']',
    rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
    rsDigits = '\\d+',
    rsDingbat = '[' + rsDingbatRange + ']',
    rsLower = '[' + rsLowerRange + ']',
    rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
    rsFitz = '\\ud83c[\\udffb-\\udfff]',
    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
    rsNonAstral = '[^' + rsAstralRange + ']',
    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
    rsUpper = '[' + rsUpperRange + ']',
    rsZWJ = '\\u200d';

/** Used to compose unicode regexes. */
var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
    rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
    rsOptLowerContr = '(?:' + rsApos + '(?:d|ll|m|re|s|t|ve))?',
    rsOptUpperContr = '(?:' + rsApos + '(?:D|LL|M|RE|S|T|VE))?',
    reOptMod = rsModifier + '?',
    rsOptVar = '[' + rsVarRange + ']?',
    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
    rsSeq = rsOptVar + reOptMod + rsOptJoin,
    rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq,
    rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match apostrophes. */
var reApos = RegExp(rsApos, 'g');

/**
 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
 */
var reComboMark = RegExp(rsCombo, 'g');

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/** Used to match complex or compound words. */
var reUnicodeWord = RegExp([
  rsUpper + '?' + rsLower + '+' + rsOptLowerContr + '(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
  rsUpperMisc + '+' + rsOptUpperContr + '(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')',
  rsUpper + '?' + rsLowerMisc + '+' + rsOptLowerContr,
  rsUpper + '+' + rsOptUpperContr,
  rsDigits,
  rsEmoji
].join('|'), 'g');

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');

/** Used to detect strings that need a more robust regexp to match words. */
var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

/** Used to map Latin Unicode letters to basic Latin letters. */
var deburredLetters = {
  // Latin-1 Supplement block.
  '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
  '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
  '\xc7': 'C',  '\xe7': 'c',
  '\xd0': 'D',  '\xf0': 'd',
  '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
  '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
  '\xcc': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
  '\xec': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
  '\xd1': 'N',  '\xf1': 'n',
  '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
  '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
  '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
  '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
  '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
  '\xc6': 'Ae', '\xe6': 'ae',
  '\xde': 'Th', '\xfe': 'th',
  '\xdf': 'ss',
  // Latin Extended-A block.
  '\u0100': 'A',  '\u0102': 'A', '\u0104': 'A',
  '\u0101': 'a',  '\u0103': 'a', '\u0105': 'a',
  '\u0106': 'C',  '\u0108': 'C', '\u010a': 'C', '\u010c': 'C',
  '\u0107': 'c',  '\u0109': 'c', '\u010b': 'c', '\u010d': 'c',
  '\u010e': 'D',  '\u0110': 'D', '\u010f': 'd', '\u0111': 'd',
  '\u0112': 'E',  '\u0114': 'E', '\u0116': 'E', '\u0118': 'E', '\u011a': 'E',
  '\u0113': 'e',  '\u0115': 'e', '\u0117': 'e', '\u0119': 'e', '\u011b': 'e',
  '\u011c': 'G',  '\u011e': 'G', '\u0120': 'G', '\u0122': 'G',
  '\u011d': 'g',  '\u011f': 'g', '\u0121': 'g', '\u0123': 'g',
  '\u0124': 'H',  '\u0126': 'H', '\u0125': 'h', '\u0127': 'h',
  '\u0128': 'I',  '\u012a': 'I', '\u012c': 'I', '\u012e': 'I', '\u0130': 'I',
  '\u0129': 'i',  '\u012b': 'i', '\u012d': 'i', '\u012f': 'i', '\u0131': 'i',
  '\u0134': 'J',  '\u0135': 'j',
  '\u0136': 'K',  '\u0137': 'k', '\u0138': 'k',
  '\u0139': 'L',  '\u013b': 'L', '\u013d': 'L', '\u013f': 'L', '\u0141': 'L',
  '\u013a': 'l',  '\u013c': 'l', '\u013e': 'l', '\u0140': 'l', '\u0142': 'l',
  '\u0143': 'N',  '\u0145': 'N', '\u0147': 'N', '\u014a': 'N',
  '\u0144': 'n',  '\u0146': 'n', '\u0148': 'n', '\u014b': 'n',
  '\u014c': 'O',  '\u014e': 'O', '\u0150': 'O',
  '\u014d': 'o',  '\u014f': 'o', '\u0151': 'o',
  '\u0154': 'R',  '\u0156': 'R', '\u0158': 'R',
  '\u0155': 'r',  '\u0157': 'r', '\u0159': 'r',
  '\u015a': 'S',  '\u015c': 'S', '\u015e': 'S', '\u0160': 'S',
  '\u015b': 's',  '\u015d': 's', '\u015f': 's', '\u0161': 's',
  '\u0162': 'T',  '\u0164': 'T', '\u0166': 'T',
  '\u0163': 't',  '\u0165': 't', '\u0167': 't',
  '\u0168': 'U',  '\u016a': 'U', '\u016c': 'U', '\u016e': 'U', '\u0170': 'U', '\u0172': 'U',
  '\u0169': 'u',  '\u016b': 'u', '\u016d': 'u', '\u016f': 'u', '\u0171': 'u', '\u0173': 'u',
  '\u0174': 'W',  '\u0175': 'w',
  '\u0176': 'Y',  '\u0177': 'y', '\u0178': 'Y',
  '\u0179': 'Z',  '\u017b': 'Z', '\u017d': 'Z',
  '\u017a': 'z',  '\u017c': 'z', '\u017e': 'z',
  '\u0132': 'IJ', '\u0133': 'ij',
  '\u0152': 'Oe', '\u0153': 'oe',
  '\u0149': "'n", '\u017f': 'ss'
};

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * A specialized version of `_.reduce` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @param {boolean} [initAccum] Specify using the first element of `array` as
 *  the initial value.
 * @returns {*} Returns the accumulated value.
 */
function arrayReduce(array, iteratee, accumulator, initAccum) {
  var index = -1,
      length = array ? array.length : 0;

  if (initAccum && length) {
    accumulator = array[++index];
  }
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
}

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

/**
 * Splits an ASCII `string` into an array of its words.
 *
 * @private
 * @param {string} The string to inspect.
 * @returns {Array} Returns the words of `string`.
 */
function asciiWords(string) {
  return string.match(reAsciiWord) || [];
}

/**
 * The base implementation of `_.propertyOf` without support for deep paths.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyOf(object) {
  return function(key) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
 * letters to basic Latin letters.
 *
 * @private
 * @param {string} letter The matched letter to deburr.
 * @returns {string} Returns the deburred letter.
 */
var deburrLetter = basePropertyOf(deburredLetters);

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

/**
 * Checks if `string` contains a word composed of Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a word is found, else `false`.
 */
function hasUnicodeWord(string) {
  return reHasUnicodeWord.test(string);
}

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return hasUnicode(string)
    ? unicodeToArray(string)
    : asciiToArray(string);
}

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

/**
 * Splits a Unicode `string` into an array of its words.
 *
 * @private
 * @param {string} The string to inspect.
 * @returns {Array} Returns the words of `string`.
 */
function unicodeWords(string) {
  return string.match(reUnicodeWord) || [];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (!start && end >= length) ? array : baseSlice(array, start, end);
}

/**
 * Creates a function like `_.lowerFirst`.
 *
 * @private
 * @param {string} methodName The name of the `String` case method to use.
 * @returns {Function} Returns the new case function.
 */
function createCaseFirst(methodName) {
  return function(string) {
    string = toString(string);

    var strSymbols = hasUnicode(string)
      ? stringToArray(string)
      : undefined;

    var chr = strSymbols
      ? strSymbols[0]
      : string.charAt(0);

    var trailing = strSymbols
      ? castSlice(strSymbols, 1).join('')
      : string.slice(1);

    return chr[methodName]() + trailing;
  };
}

/**
 * Creates a function like `_.camelCase`.
 *
 * @private
 * @param {Function} callback The function to combine each word.
 * @returns {Function} Returns the new compounder function.
 */
function createCompounder(callback) {
  return function(string) {
    return arrayReduce(words(deburr(string).replace(reApos, '')), callback, '');
  };
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the camel cased string.
 * @example
 *
 * _.camelCase('Foo Bar');
 * // => 'fooBar'
 *
 * _.camelCase('--foo-bar--');
 * // => 'fooBar'
 *
 * _.camelCase('__FOO_BAR__');
 * // => 'fooBar'
 */
var camelCase = createCompounder(function(result, word, index) {
  word = word.toLowerCase();
  return result + (index ? capitalize(word) : word);
});

/**
 * Converts the first character of `string` to upper case and the remaining
 * to lower case.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to capitalize.
 * @returns {string} Returns the capitalized string.
 * @example
 *
 * _.capitalize('FRED');
 * // => 'Fred'
 */
function capitalize(string) {
  return upperFirst(toString(string).toLowerCase());
}

/**
 * Deburrs `string` by converting
 * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
 * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
 * letters to basic Latin letters and removing
 * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to deburr.
 * @returns {string} Returns the deburred string.
 * @example
 *
 * _.deburr('déjà vu');
 * // => 'deja vu'
 */
function deburr(string) {
  string = toString(string);
  return string && string.replace(reLatin, deburrLetter).replace(reComboMark, '');
}

/**
 * Converts the first character of `string` to upper case.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.upperFirst('fred');
 * // => 'Fred'
 *
 * _.upperFirst('FRED');
 * // => 'FRED'
 */
var upperFirst = createCaseFirst('toUpperCase');

/**
 * Splits `string` into an array of its words.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to inspect.
 * @param {RegExp|string} [pattern] The pattern to match words.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {Array} Returns the words of `string`.
 * @example
 *
 * _.words('fred, barney, & pebbles');
 * // => ['fred', 'barney', 'pebbles']
 *
 * _.words('fred, barney, & pebbles', /[^, ]+/g);
 * // => ['fred', 'barney', '&', 'pebbles']
 */
function words(string, pattern, guard) {
  string = toString(string);
  pattern = guard ? undefined : pattern;

  if (pattern === undefined) {
    return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
  }
  return string.match(pattern) || [];
}

var lodash_camelcase = camelCase;

function _interopDefault$1 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var camelCase$1 = _interopDefault$1(lodash_camelcase);

/**
 * Takes any input and guarantees an array back.
 *
 * - converts array-like objects (e.g. `arguments`) to a real array
 * - converts `undefined` to an empty array
 * - converts any another other, singular value (including `null`) into an array containing that value
 * - ignores input which is already an array
 *
 * @module array-back
 * @example
 * > const arrayify = require('array-back')
 *
 * > arrayify(undefined)
 * []
 *
 * > arrayify(null)
 * [ null ]
 *
 * > arrayify(0)
 * [ 0 ]
 *
 * > arrayify([ 1, 2 ])
 * [ 1, 2 ]
 *
 * > function f(){ return arrayify(arguments); }
 * > f(1,2,3)
 * [ 1, 2, 3 ]
 */

function isObject (input) {
  return typeof input === 'object' && input !== null
}

function isArrayLike (input) {
  return isObject(input) && typeof input.length === 'number'
}

/**
 * @param {*} - the input value to convert to an array
 * @returns {Array}
 * @alias module:array-back
 */
function arrayify (input) {
  if (Array.isArray(input)) {
    return input
  } else {
    if (input === undefined) {
      return []
    } else if (isArrayLike(input)) {
      return Array.prototype.slice.call(input)
    } else {
      return [ input ]
    }
  }
}

/**
 * Takes any input and guarantees an array back.
 *
 * - converts array-like objects (e.g. `arguments`) to a real array
 * - converts `undefined` to an empty array
 * - converts any another other, singular value (including `null`) into an array containing that value
 * - ignores input which is already an array
 *
 * @module array-back
 * @example
 * > const arrayify = require('array-back')
 *
 * > arrayify(undefined)
 * []
 *
 * > arrayify(null)
 * [ null ]
 *
 * > arrayify(0)
 * [ 0 ]
 *
 * > arrayify([ 1, 2 ])
 * [ 1, 2 ]
 *
 * > function f(){ return arrayify(arguments); }
 * > f(1,2,3)
 * [ 1, 2, 3 ]
 */

function isObject$1 (input) {
  return typeof input === 'object' && input !== null
}

function isArrayLike$1 (input) {
  return isObject$1(input) && typeof input.length === 'number'
}

/**
 * @param {*} - the input value to convert to an array
 * @returns {Array}
 * @alias module:array-back
 */
function arrayify$1 (input) {
  if (Array.isArray(input)) {
    return input
  } else {
    if (input === undefined) {
      return []
    } else if (isArrayLike$1(input)) {
      return Array.prototype.slice.call(input)
    } else {
      return [ input ]
    }
  }
}

/**
 * Find and either replace or remove items in an array.
 *
 * @module find-replace
 * @example
 * > const findReplace = require('find-replace')
 * > const numbers = [ 1, 2, 3]
 *
 * > findReplace(numbers, n => n === 2, 'two')
 * [ 1, 'two', 3 ]
 *
 * > findReplace(numbers, n => n === 2, [ 'two', 'zwei' ])
 * [ 1, [ 'two', 'zwei' ], 3 ]
 *
 * > findReplace(numbers, n => n === 2, 'two', 'zwei')
 * [ 1, 'two', 'zwei', 3 ]
 *
 * > findReplace(numbers, n => n === 2) // no replacement, so remove
 * [ 1, 3 ]
 */

/**
 * @param {array} - The input array
 * @param {testFn} - A predicate function which, if returning `true` causes the current item to be operated on.
 * @param [replaceWith] {...any} - If specified, found values will be replaced with these values, else removed.
 * @returns {array}
 * @alias module:find-replace
 */
function findReplace (array, testFn) {
  const found = [];
  const replaceWiths = arrayify$1(arguments);
  replaceWiths.splice(0, 2);

  arrayify$1(array).forEach((value, index) => {
    let expanded = [];
    replaceWiths.forEach(replaceWith => {
      if (typeof replaceWith === 'function') {
        expanded = expanded.concat(replaceWith(value));
      } else {
        expanded.push(replaceWith);
      }
    });

    if (testFn(value)) {
      found.push({
        index: index,
        replaceWithValue: expanded
      });
    }
  });

  found.reverse().forEach(item => {
    const spliceArgs = [ item.index, 1 ].concat(item.replaceWithValue);
    array.splice.apply(array, spliceArgs);
  });

  return array
}

/**
 * Some useful tools for working with `process.argv`.
 *
 * @module argv-tools
 * @typicalName argvTools
 * @example
 * const argvTools = require('argv-tools')
 */

/**
 * Regular expressions for matching option formats.
 * @static
 */
const re = {
  short: /^-([^\d-])$/,
  long: /^--(\S+)/,
  combinedShort: /^-[^\d-]{2,}$/,
  optEquals: /^(--\S+?)=(.*)/
};

/**
 * Array subclass encapsulating common operations on `process.argv`.
 * @static
 */
class ArgvArray extends Array {
  /**
   * Clears the array has loads the supplied input.
   * @param {string[]} argv - The argv list to load. Defaults to `process.argv`.
   */
  load (argv) {
    this.clear();
    if (argv && argv !== process.argv) {
      argv = arrayify(argv);
    } else {
      /* if no argv supplied, assume we are parsing process.argv */
      argv = process.argv.slice(0);
      const deleteCount = process.execArgv.some(isExecArg) ? 1 : 2;
      argv.splice(0, deleteCount);
    }
    argv.forEach(arg => this.push(String(arg)));
  }

  /**
   * Clear the array.
   */
  clear () {
    this.length = 0;
  }

  /**
   * expand ``--option=value` style args.
   */
  expandOptionEqualsNotation () {
    if (this.some(arg => re.optEquals.test(arg))) {
      const expandedArgs = [];
      this.forEach(arg => {
        const matches = arg.match(re.optEquals);
        if (matches) {
          expandedArgs.push(matches[1], matches[2]);
        } else {
          expandedArgs.push(arg);
        }
      });
      this.clear();
      this.load(expandedArgs);
    }
  }

  /**
   * expand getopt-style combinedShort options.
   */
  expandGetoptNotation () {
    if (this.hasCombinedShortOptions()) {
      findReplace(this, re.combinedShort, expandCombinedShortArg);
    }
  }

  /**
   * Returns true if the array contains combined short options (e.g. `-ab`).
   * @returns {boolean}
   */
  hasCombinedShortOptions () {
    return this.some(arg => re.combinedShort.test(arg))
  }

  static from (argv) {
    const result = new this();
    result.load(argv);
    return result
  }
}

/**
 * Expand a combined short option.
 * @param {string} - the string to expand, e.g. `-ab`
 * @returns {string[]}
 * @static
 */
function expandCombinedShortArg (arg) {
  /* remove initial hypen */
  arg = arg.slice(1);
  return arg.split('').map(letter => '-' + letter)
}

/**
 * Returns true if the supplied arg matches `--option=value` notation.
 * @param {string} - the arg to test, e.g. `--one=something`
 * @returns {boolean}
 * @static
 */
function isOptionEqualsNotation (arg) {
  return re.optEquals.test(arg)
}

/**
 * Returns true if the supplied arg is in either long (`--one`) or short (`-o`) format.
 * @param {string} - the arg to test, e.g. `--one`
 * @returns {boolean}
 * @static
 */
function isOption (arg) {
  return (re.short.test(arg) || re.long.test(arg)) && !re.optEquals.test(arg)
}

/**
 * Returns true if the supplied arg is in long (`--one`) format.
 * @param {string} - the arg to test, e.g. `--one`
 * @returns {boolean}
 * @static
 */
function isLongOption (arg) {
  return re.long.test(arg) && !isOptionEqualsNotation(arg)
}

/**
 * Returns the name from a long, short or `--options=value` arg.
 * @param {string} - the arg to inspect, e.g. `--one`
 * @returns {string}
 * @static
 */
function getOptionName (arg) {
  if (re.short.test(arg)) {
    return arg.match(re.short)[1]
  } else if (isLongOption(arg)) {
    return arg.match(re.long)[1]
  } else if (isOptionEqualsNotation(arg)) {
    return arg.match(re.optEquals)[1].replace(/^--/, '')
  } else {
    return null
  }
}

function isValue (arg) {
  return !(isOption(arg) || re.combinedShort.test(arg) || re.optEquals.test(arg))
}

function isExecArg (arg) {
  return ['--eval', '-e'].indexOf(arg) > -1 || arg.startsWith('--eval=')
}

/**
 * For type-checking Javascript values.
 * @module typical
 * @typicalname t
 * @example
 * const t = require('typical')
 */

/**
 * Returns true if input is a number
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 * @example
 * > t.isNumber(0)
 * true
 * > t.isNumber(1)
 * true
 * > t.isNumber(1.1)
 * true
 * > t.isNumber(0xff)
 * true
 * > t.isNumber(0644)
 * true
 * > t.isNumber(6.2e5)
 * true
 * > t.isNumber(NaN)
 * false
 * > t.isNumber(Infinity)
 * false
 */
function isNumber (n) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}

/**
 * A plain object is a simple object literal, it is not an instance of a class. Returns true if the input `typeof` is `object` and directly decends from `Object`.
 *
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 * @example
 * > t.isPlainObject({ something: 'one' })
 * true
 * > t.isPlainObject(new Date())
 * false
 * > t.isPlainObject([ 0, 1 ])
 * false
 * > t.isPlainObject(/test/)
 * false
 * > t.isPlainObject(1)
 * false
 * > t.isPlainObject('one')
 * false
 * > t.isPlainObject(null)
 * false
 * > t.isPlainObject((function * () {})())
 * false
 * > t.isPlainObject(function * () {})
 * false
 */
function isPlainObject (input) {
  return input !== null && typeof input === 'object' && input.constructor === Object
}

/**
 * An array-like value has all the properties of an array, but is not an array instance. Examples in the `arguments` object. Returns true if the input value is an object, not null and has a `length` property with a numeric value.
 *
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 * @example
 * function sum(x, y){
 *     console.log(t.isArrayLike(arguments))
 *     // prints `true`
 * }
 */
function isArrayLike$2 (input) {
  return isObject$2(input) && typeof input.length === 'number'
}

/**
 * returns true if the typeof input is `'object'`, but not null!
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isObject$2 (input) {
  return typeof input === 'object' && input !== null
}

/**
 * Returns true if the input value is defined
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isDefined (input) {
  return typeof input !== 'undefined'
}

/**
 * Returns true if the input value is a string
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isString (input) {
  return typeof input === 'string'
}

/**
 * Returns true if the input value is a boolean
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isBoolean (input) {
  return typeof input === 'boolean'
}

/**
 * Returns true if the input value is a function
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isFunction (input) {
  return typeof input === 'function'
}

/**
 * Returns true if the input value is an es2015 `class`.
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isClass (input) {
  if (isFunction(input)) {
    return /^class /.test(Function.prototype.toString.call(input))
  } else {
    return false
  }
}

/**
 * Returns true if the input is a string, number, symbol, boolean, null or undefined value.
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isPrimitive (input) {
  if (input === null) return true
  switch (typeof input) {
    case 'string':
    case 'number':
    case 'symbol':
    case 'undefined':
    case 'boolean':
      return true
    default:
      return false
  }
}

/**
 * Returns true if the input is a Promise.
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 */
function isPromise (input) {
  if (input) {
    const isPromise = isDefined(Promise) && input instanceof Promise;
    const isThenable = input.then && typeof input.then === 'function';
    return !!(isPromise || isThenable)
  } else {
    return false
  }
}

/**
 * Returns true if the input is an iterable (`Map`, `Set`, `Array`, Generator etc.).
 * @param {*} - the input to test
 * @returns {boolean}
 * @static
 * @example
 * > t.isIterable('string')
 * true
 * > t.isIterable(new Map())
 * true
 * > t.isIterable([])
 * true
 * > t.isIterable((function * () {})())
 * true
 * > t.isIterable(Promise.resolve())
 * false
 * > t.isIterable(Promise)
 * false
 * > t.isIterable(true)
 * false
 * > t.isIterable({})
 * false
 * > t.isIterable(0)
 * false
 * > t.isIterable(1.1)
 * false
 * > t.isIterable(NaN)
 * false
 * > t.isIterable(Infinity)
 * false
 * > t.isIterable(function () {})
 * false
 * > t.isIterable(Date)
 * false
 * > t.isIterable()
 * false
 * > t.isIterable({ then: function () {} })
 * false
 */
function isIterable (input) {
  if (input === null || !isDefined(input)) {
    return false
  } else {
    return (
      typeof input[Symbol.iterator] === 'function' ||
      typeof input[Symbol.asyncIterator] === 'function'
    )
  }
}

var t = {
  isNumber,
  isString,
  isBoolean,
  isPlainObject,
  isArrayLike: isArrayLike$2,
  isObject: isObject$2,
  isDefined,
  isFunction,
  isClass,
  isPrimitive,
  isPromise,
  isIterable
};

/**
 * @module option-definition
 */

/**
 * Describes a command-line option. Additionally, if generating a usage guide with [command-line-usage](https://github.com/75lb/command-line-usage) you could optionally add `description` and `typeLabel` properties to each definition.
 *
 * @alias module:option-definition
 * @typicalname option
 */
class OptionDefinition {
  constructor (definition) {
    /**
    * The only required definition property is `name`, so the simplest working example is
    * ```js
    * const optionDefinitions = [
    *   { name: 'file' },
    *   { name: 'depth' }
    * ]
    * ```
    *
    * Where a `type` property is not specified it will default to `String`.
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | -------------------- | ------------ |
    * | 1   | `--file` | `{ file: null }` |
    * | 2   | `--file lib.js` | `{ file: 'lib.js' }` |
    * | 3   | `--depth 2` | `{ depth: '2' }` |
    *
    * Unicode option names and aliases are valid, for example:
    * ```js
    * const optionDefinitions = [
    *   { name: 'один' },
    *   { name: '两' },
    *   { name: 'три', alias: 'т' }
    * ]
    * ```
    * @type {string}
    */
    this.name = definition.name;

    /**
    * The `type` value is a setter function (you receive the output from this), enabling you to be specific about the type and value received.
    *
    * The most common values used are `String` (the default), `Number` and `Boolean` but you can use a custom function, for example:
    *
    * ```js
    * const fs = require('fs')
    *
    * class FileDetails {
    *   constructor (filename) {
    *     this.filename = filename
    *     this.exists = fs.existsSync(filename)
    *   }
    * }
    *
    * const cli = commandLineArgs([
    *   { name: 'file', type: filename => new FileDetails(filename) },
    *   { name: 'depth', type: Number }
    * ])
    * ```
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | ----------------- | ------------ |
    * | 1   | `--file asdf.txt` | `{ file: { filename: 'asdf.txt', exists: false } }` |
    *
    * The `--depth` option expects a `Number`. If no value was set, you will receive `null`.
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | ----------------- | ------------ |
    * | 2   | `--depth` | `{ depth: null }` |
    * | 3   | `--depth 2` | `{ depth: 2 }` |
    *
    * @type {function}
    * @default String
    */
    this.type = definition.type || String;

    /**
    * getopt-style short option names. Can be any single character (unicode included) except a digit or hyphen.
    *
    * ```js
    * const optionDefinitions = [
    *   { name: 'hot', alias: 'h', type: Boolean },
    *   { name: 'discount', alias: 'd', type: Boolean },
    *   { name: 'courses', alias: 'c' , type: Number }
    * ]
    * ```
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | ------------ | ------------ |
    * | 1   | `-hcd` | `{ hot: true, courses: null, discount: true }` |
    * | 2   | `-hdc 3` | `{ hot: true, discount: true, courses: 3 }` |
    *
    * @type {string}
    */
    this.alias = definition.alias;

    /**
    * Set this flag if the option takes a list of values. You will receive an array of values, each passed through the `type` function (if specified).
    *
    * ```js
    * const optionDefinitions = [
    *   { name: 'files', type: String, multiple: true }
    * ]
    * ```
    *
    * Note, examples 1 and 3 below demonstrate "greedy" parsing which can be disabled by using `lazyMultiple`.
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | ------------ | ------------ |
    * | 1   | `--files one.js two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
    * | 2   | `--files one.js --files two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
    * | 3   | `--files *` | `{ files: [ 'one.js', 'two.js' ] }` |
    *
    * @type {boolean}
    */
    this.multiple = definition.multiple;

    /**
     * Identical to `multiple` but with greedy parsing disabled.
     *
     * ```js
     * const optionDefinitions = [
     *   { name: 'files', lazyMultiple: true },
     *   { name: 'verbose', alias: 'v', type: Boolean, lazyMultiple: true }
     * ]
     * ```
     *
     * | #   | argv input | commandLineArgs() output |
     * | --- | ------------ | ------------ |
     * | 1   | `--files one.js --files two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
     * | 2   | `-vvv` | `{ verbose: [ true, true, true ] }` |
     *
     * @type {boolean}
     */
    this.lazyMultiple = definition.lazyMultiple;

    /**
    * Any values unaccounted for by an option definition will be set on the `defaultOption`. This flag is typically set on the most commonly-used option to make for more concise usage (i.e. `$ example *.js` instead of `$ example --files *.js`).
    *
    * ```js
    * const optionDefinitions = [
    *   { name: 'files', multiple: true, defaultOption: true }
    * ]
    * ```
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | ------------ | ------------ |
    * | 1   | `--files one.js two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
    * | 2   | `one.js two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
    * | 3   | `*` | `{ files: [ 'one.js', 'two.js' ] }` |
    *
    * @type {boolean}
    */
    this.defaultOption = definition.defaultOption;

    /**
    * An initial value for the option.
    *
    * ```js
    * const optionDefinitions = [
    *   { name: 'files', multiple: true, defaultValue: [ 'one.js' ] },
    *   { name: 'max', type: Number, defaultValue: 3 }
    * ]
    * ```
    *
    * | #   | argv input | commandLineArgs() output |
    * | --- | ------------ | ------------ |
    * | 1   |  | `{ files: [ 'one.js' ], max: 3 }` |
    * | 2   | `--files two.js` | `{ files: [ 'two.js' ], max: 3 }` |
    * | 3   | `--max 4` | `{ files: [ 'one.js' ], max: 4 }` |
    *
    * @type {*}
    */
    this.defaultValue = definition.defaultValue;

    /**
    * When your app has a large amount of options it makes sense to organise them in groups.
    *
    * There are two automatic groups: `_all` (contains all options) and `_none` (contains options without a `group` specified in their definition).
    *
    * ```js
    * const optionDefinitions = [
    *   { name: 'verbose', group: 'standard' },
    *   { name: 'help', group: [ 'standard', 'main' ] },
    *   { name: 'compress', group: [ 'server', 'main' ] },
    *   { name: 'static', group: 'server' },
    *   { name: 'debug' }
    * ]
    * ```
    *
    *<table>
    *  <tr>
    *    <th>#</th><th>Command Line</th><th>commandLineArgs() output</th>
    *  </tr>
    *  <tr>
    *    <td>1</td><td><code>--verbose</code></td><td><pre><code>
    *{
    *  _all: { verbose: true },
    *  standard: { verbose: true }
    *}
    *</code></pre></td>
    *  </tr>
    *  <tr>
    *    <td>2</td><td><code>--debug</code></td><td><pre><code>
    *{
    *  _all: { debug: true },
    *  _none: { debug: true }
    *}
    *</code></pre></td>
    *  </tr>
    *  <tr>
    *    <td>3</td><td><code>--verbose --debug --compress</code></td><td><pre><code>
    *{
    *  _all: {
    *    verbose: true,
    *    debug: true,
    *    compress: true
    *  },
    *  standard: { verbose: true },
    *  server: { compress: true },
    *  main: { compress: true },
    *  _none: { debug: true }
    *}
    *</code></pre></td>
    *  </tr>
    *  <tr>
    *    <td>4</td><td><code>--compress</code></td><td><pre><code>
    *{
    *  _all: { compress: true },
    *  server: { compress: true },
    *  main: { compress: true }
    *}
    *</code></pre></td>
    *  </tr>
    *</table>
    *
    * @type {string|string[]}
    */
    this.group = definition.group;

    /* pick up any remaining properties */
    for (let prop in definition) {
      if (!this[prop]) this[prop] = definition[prop];
    }
  }

  isBoolean () {
    return this.type === Boolean || (t.isFunction(this.type) && this.type.name === 'Boolean')
  }
  isMultiple () {
    return this.multiple || this.lazyMultiple
  }

  static create (def) {
    const result = new this(def);
    return result
  }
}

/**
 * @module option-definitions
 */

/**
 * @alias module:option-definitions
 */
class Definitions extends Array {
  /**
   * validate option definitions
   * @returns {string}
   */
  validate () {
    const someHaveNoName = this.some(def => !def.name);
    if (someHaveNoName) {
      halt(
        'INVALID_DEFINITIONS',
        'Invalid option definitions: the `name` property is required on each definition'
      );
    }

    const someDontHaveFunctionType = this.some(def => def.type && typeof def.type !== 'function');
    if (someDontHaveFunctionType) {
      halt(
        'INVALID_DEFINITIONS',
        'Invalid option definitions: the `type` property must be a setter fuction (default: `Boolean`)'
      );
    }

    let invalidOption;

    const numericAlias = this.some(def => {
      invalidOption = def;
      return t.isDefined(def.alias) && t.isNumber(def.alias)
    });
    if (numericAlias) {
      halt(
        'INVALID_DEFINITIONS',
        'Invalid option definition: to avoid ambiguity an alias cannot be numeric [--' + invalidOption.name + ' alias is -' + invalidOption.alias + ']'
      );
    }

    const multiCharacterAlias = this.some(def => {
      invalidOption = def;
      return t.isDefined(def.alias) && def.alias.length !== 1
    });
    if (multiCharacterAlias) {
      halt(
        'INVALID_DEFINITIONS',
        'Invalid option definition: an alias must be a single character'
      );
    }

    const hypenAlias = this.some(def => {
      invalidOption = def;
      return def.alias === '-'
    });
    if (hypenAlias) {
      halt(
        'INVALID_DEFINITIONS',
        'Invalid option definition: an alias cannot be "-"'
      );
    }

    const duplicateName = hasDuplicates(this.map(def => def.name));
    if (duplicateName) {
      halt(
        'INVALID_DEFINITIONS',
        'Two or more option definitions have the same name'
      );
    }

    const duplicateAlias = hasDuplicates(this.map(def => def.alias));
    if (duplicateAlias) {
      halt(
        'INVALID_DEFINITIONS',
        'Two or more option definitions have the same alias'
      );
    }

    const duplicateDefaultOption = hasDuplicates(this.map(def => def.defaultOption));
    if (duplicateDefaultOption) {
      halt(
        'INVALID_DEFINITIONS',
        'Only one option definition can be the defaultOption'
      );
    }

    const defaultBoolean = this.some(def => {
      invalidOption = def;
      return def.isBoolean() && def.defaultOption
    });
    if (defaultBoolean) {
      halt(
        'INVALID_DEFINITIONS',
        `A boolean option ["${invalidOption.name}"] can not also be the defaultOption.`
      );
    }
  }

  /**
   * Get definition by option arg (e.g. `--one` or `-o`)
   * @param {string}
   * @returns {Definition}
   */
  get (arg) {
    if (isOption(arg)) {
      return re.short.test(arg)
        ? this.find(def => def.alias === getOptionName(arg))
        : this.find(def => def.name === getOptionName(arg))
    } else {
      return this.find(def => def.name === arg)
    }
  }

  getDefault () {
    return this.find(def => def.defaultOption === true)
  }

  isGrouped () {
    return this.some(def => def.group)
  }

  whereGrouped () {
    return this.filter(containsValidGroup)
  }
  whereNotGrouped () {
    return this.filter(def => !containsValidGroup(def))
  }
  whereDefaultValueSet () {
    return this.filter(def => t.isDefined(def.defaultValue))
  }

  static from (definitions) {
    if (definitions instanceof this) return definitions
    const result = super.from(arrayify(definitions), def => OptionDefinition.create(def));
    result.validate();
    return result
  }
}

function halt (name, message) {
  const err = new Error(message);
  err.name = name;
  throw err
}

function containsValidGroup (def) {
  return arrayify(def.group).some(group => group)
}

function hasDuplicates (array) {
  const items = {};
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (items[value]) {
      return true
    } else {
      if (t.isDefined(value)) items[value] = true;
    }
  }
}

/**
 * @module argv-parser
 */

/**
 * @alias module:argv-parser
 */
class ArgvParser {
  /**
   * @param {OptionDefinitions} - Definitions array
   * @param {object} [options] - Options
   * @param {string[]} [options.argv] - Overrides `process.argv`
   * @param {boolean} [options.stopAtFirstUnknown] -
   */
  constructor (definitions, options) {
    this.options = Object.assign({}, options);
    /**
     * Option Definitions
     */
    this.definitions = Definitions.from(definitions);

    /**
     * Argv
     */
    this.argv = ArgvArray.from(this.options.argv);
    if (this.argv.hasCombinedShortOptions()) {
      findReplace(this.argv, re.combinedShort.test.bind(re.combinedShort), arg => {
        arg = arg.slice(1);
        return arg.split('').map(letter => ({ origArg: `-${arg}`, arg: '-' + letter }))
      });
    }
  }

  /**
   * Yields one `{ event, name, value, arg, def }` argInfo object for each arg in `process.argv` (or `options.argv`).
   */
  * [Symbol.iterator] () {
    const definitions = this.definitions;

    let def;
    let value;
    let name;
    let event;
    let singularDefaultSet = false;
    let unknownFound = false;
    let origArg;

    for (let arg of this.argv) {
      if (t.isPlainObject(arg)) {
        origArg = arg.origArg;
        arg = arg.arg;
      }

      if (unknownFound && this.options.stopAtFirstUnknown) {
        yield { event: 'unknown_value', arg, name: '_unknown', value: undefined };
        continue
      }

      /* handle long or short option */
      if (isOption(arg)) {
        def = definitions.get(arg);
        value = undefined;
        if (def) {
          value = def.isBoolean() ? true : null;
          event = 'set';
        } else {
          event = 'unknown_option';
        }

      /* handle --option-value notation */
    } else if (isOptionEqualsNotation(arg)) {
        const matches = arg.match(re.optEquals);
        def = definitions.get(matches[1]);
        if (def) {
          if (def.isBoolean()) {
            yield { event: 'unknown_value', arg, name: '_unknown', value, def };
            event = 'set';
            value = true;
          } else {
            event = 'set';
            value = matches[2];
          }
        } else {
          event = 'unknown_option';
        }

      /* handle value */
    } else if (isValue(arg)) {
        if (def) {
          value = arg;
          event = 'set';
        } else {
          /* get the defaultOption */
          def = this.definitions.getDefault();
          if (def && !singularDefaultSet) {
            value = arg;
            event = 'set';
          } else {
            event = 'unknown_value';
            def = undefined;
          }
        }
      }

      name = def ? def.name : '_unknown';
      const argInfo = { event, arg, name, value, def };
      if (origArg) {
        argInfo.subArg = arg;
        argInfo.arg = origArg;
      }
      yield argInfo;

      /* unknownFound logic */
      if (name === '_unknown') unknownFound = true;

      /* singularDefaultSet logic */
      if (def && def.defaultOption && !def.isMultiple() && event === 'set') singularDefaultSet = true;

      /* reset values once consumed and yielded */
      if (def && def.isBoolean()) def = undefined;
      /* reset the def if it's a singular which has been set */
      if (def && !def.multiple && t.isDefined(value) && value !== null) {
        def = undefined;
      }
      value = undefined;
      event = undefined;
      name = undefined;
      origArg = undefined;
    }
  }
}

const _value = new WeakMap();

/**
 * Encapsulates behaviour (defined by an OptionDefinition) when setting values
 */
class Option {
  constructor (definition) {
    this.definition = new OptionDefinition(definition);
    this.state = null; /* set or default */
    this.resetToDefault();
  }

  get () {
    return _value.get(this)
  }

  set (val) {
    this._set(val, 'set');
  }

  _set (val, state) {
    const def = this.definition;
    if (def.isMultiple()) {
      /* don't add null or undefined to a multiple */
      if (val !== null && val !== undefined) {
        const arr = this.get();
        if (this.state === 'default') arr.length = 0;
        arr.push(def.type(val));
        this.state = state;
      }
    } else {
      /* throw if already set on a singlar defaultOption */
      if (!def.isMultiple() && this.state === 'set') {
        const err = new Error(`Singular option already set [${this.definition.name}=${this.get()}]`);
        err.name = 'ALREADY_SET';
        err.value = val;
        err.optionName = def.name;
        throw err
      } else if (val === null || val === undefined) {
        _value.set(this, val);
        // /* required to make 'partial: defaultOption with value equal to defaultValue 2' pass */
        // if (!(def.defaultOption && !def.isMultiple())) {
        //   this.state = state
        // }
      } else {
        _value.set(this, def.type(val));
        this.state = state;
      }
    }
  }

  resetToDefault () {
    if (t.isDefined(this.definition.defaultValue)) {
      if (this.definition.isMultiple()) {
        _value.set(this, arrayify(this.definition.defaultValue).slice());
      } else {
        _value.set(this, this.definition.defaultValue);
      }
    } else {
      if (this.definition.isMultiple()) {
        _value.set(this, []);
      } else {
        _value.set(this, null);
      }
    }
    this.state = 'default';
  }

  static create (definition) {
    definition = new OptionDefinition(definition);
    if (definition.isBoolean()) {
      return FlagOption.create(definition)
    } else {
      return new this(definition)
    }
  }
}

class FlagOption extends Option {
  set (val) {
    super.set(true);
  }

  static create (def) {
    return new this(def)
  }
}

/**
 * A map of { DefinitionNameString: Option }. By default, an Output has an `_unknown` property and any options with defaultValues.
 */
class Output$1 extends Map {
  constructor (definitions) {
    super();
    /**
     * @type {OptionDefinitions}
     */
    this.definitions = Definitions.from(definitions);

    /* by default, an Output has an `_unknown` property and any options with defaultValues */
    this.set('_unknown', Option.create({ name: '_unknown', multiple: true }));
    for (const def of this.definitions.whereDefaultValueSet()) {
      this.set(def.name, Option.create(def));
    }
  }

  toObject (options) {
    options = options || {};
    const output = {};
    for (const item of this) {
      const name = options.camelCase && item[0] !== '_unknown' ? camelCase$1(item[0]) : item[0];
      const option = item[1];
      if (name === '_unknown' && !option.get().length) continue
      output[name] = option.get();
    }

    if (options.skipUnknown) delete output._unknown;
    return output
  }
}

class GroupedOutput extends Output$1 {
  toObject (options) {
    const superOutputNoCamel = super.toObject({ skipUnknown: options.skipUnknown });
    const superOutput = super.toObject(options);
    const unknown = superOutput._unknown;
    delete superOutput._unknown;
    const grouped = {
      _all: superOutput
    };
    if (unknown && unknown.length) grouped._unknown = unknown;

    this.definitions.whereGrouped().forEach(def => {
      const name = options.camelCase ? camelCase$1(def.name) : def.name;
      const outputValue = superOutputNoCamel[def.name];
      for (const groupName of arrayify(def.group)) {
        grouped[groupName] = grouped[groupName] || {};
        if (t.isDefined(outputValue)) {
          grouped[groupName][name] = outputValue;
        }
      }
    });

    this.definitions.whereNotGrouped().forEach(def => {
      const name = options.camelCase ? camelCase$1(def.name) : def.name;
      const outputValue = superOutputNoCamel[def.name];
      if (t.isDefined(outputValue)) {
        if (!grouped._none) grouped._none = {};
        grouped._none[name] = outputValue;
      }
    });
    return grouped
  }
}

/**
 * @module command-line-args
 */

/**
 * Returns an object containing all option values set on the command line. By default it parses the global  [`process.argv`](https://nodejs.org/api/process.html#process_process_argv) array.
 *
 * Parsing is strict by default - an exception is thrown if the user sets a singular option more than once or sets an unknown value or option (one without a valid [definition](https://github.com/75lb/command-line-args/blob/master/doc/option-definition.md)). To be more permissive, enabling [partial](https://github.com/75lb/command-line-args/wiki/Partial-mode-example) or [stopAtFirstUnknown](https://github.com/75lb/command-line-args/wiki/stopAtFirstUnknown) modes will return known options in the usual manner while collecting unknown arguments in a separate `_unknown` property.
 *
 * @param {module:definition[]} - An array of [OptionDefinition](https://github.com/75lb/command-line-args/blob/master/doc/option-definition.md) objects
 * @param {object} [options] - Options.
 * @param {string[]} [options.argv] - An array of strings which, if present will be parsed instead  of `process.argv`.
 * @param {boolean} [options.partial] - If `true`, an array of unknown arguments is returned in the `_unknown` property of the output.
 * @param {boolean} [options.stopAtFirstUnknown] - If `true`, parsing will stop at the first unknown argument and the remaining arguments returned in `_unknown`. When set, `partial: true` is also implied.
 * @param {boolean} [options.camelCase] - If `true`, options with hypenated names (e.g. `move-to`) will be returned in camel-case (e.g. `moveTo`).
 * @returns {object}
 * @throws `UNKNOWN_OPTION` If `options.partial` is false and the user set an undefined option. The `err.optionName` property contains the arg that specified an unknown option, e.g. `--one`.
 * @throws `UNKNOWN_VALUE` If `options.partial` is false and the user set a value unaccounted for by an option definition. The `err.value` property contains the unknown value, e.g. `5`.
 * @throws `ALREADY_SET` If a user sets a singular, non-multiple option more than once. The `err.optionName` property contains the option name that has already been set, e.g. `one`.
 * @throws `INVALID_DEFINITIONS`
 *   - If an option definition is missing the required `name` property
 *   - If an option definition has a `type` value that's not a function
 *   - If an alias is numeric, a hyphen or a length other than 1
 *   - If an option definition name was used more than once
 *   - If an option definition alias was used more than once
 *   - If more than one option definition has `defaultOption: true`
 *   - If a `Boolean` option is also set as the `defaultOption`.
 * @alias module:command-line-args
 */
function commandLineArgs (optionDefinitions, options) {
  options = options || {};
  if (options.stopAtFirstUnknown) options.partial = true;
  optionDefinitions = Definitions.from(optionDefinitions);

  const parser = new ArgvParser(optionDefinitions, {
    argv: options.argv,
    stopAtFirstUnknown: options.stopAtFirstUnknown
  });

  const OutputClass = optionDefinitions.isGrouped() ? GroupedOutput : Output$1;
  const output = new OutputClass(optionDefinitions);

  /* Iterate the parser setting each known value to the output. Optionally, throw on unknowns. */
  for (const argInfo of parser) {
    const arg = argInfo.subArg || argInfo.arg;
    if (!options.partial) {
      if (argInfo.event === 'unknown_value') {
        const err = new Error(`Unknown value: ${arg}`);
        err.name = 'UNKNOWN_VALUE';
        err.value = arg;
        throw err
      } else if (argInfo.event === 'unknown_option') {
        const err = new Error(`Unknown option: ${arg}`);
        err.name = 'UNKNOWN_OPTION';
        err.optionName = arg;
        throw err
      }
    }

    let option;
    if (output.has(argInfo.name)) {
      option = output.get(argInfo.name);
    } else {
      option = Option.create(argInfo.def);
      output.set(argInfo.name, option);
    }

    if (argInfo.name === '_unknown') {
      option.set(arg);
    } else {
      option.set(argInfo.value);
    }
  }

  return output.toObject({ skipUnknown: !options.partial, camelCase: options.camelCase })
}

var dist = commandLineArgs;

const args = [
    {
        name: 'config',
        alias: 'c',
        type: String,
        defaultValue: 'snowblade.config.js',
        defaultOption: true
    },
    {
        name: 'init',
        alias: 'i',
        type: Boolean,
        defaultValue: false
    }
];
var options$1 = dist(args);

async function loadConfigFile(fileName, commandOptions) {
    const configPath = absolutePath(fileName);
    const extension = path$1.extname(configPath);
    let configFileExport = extension === '.cjs'
        ? getDefaultFromCjs(require(configPath))
        : await getDefaultFromTranspiledConfigFile(configPath, commandOptions.silent);
    return configFileExport;
}
function getDefaultFromCjs(namespace) {
    return namespace.__esModule ? namespace.default : namespace;
}
async function getDefaultFromTranspiledConfigFile(fileName, silent) {
    const file = fs.readFileSync(fs.realpathSync(fileName), {
        encoding: 'utf-8'
    });
    const code = babel.transform(file, {
        presets: ['@babel/preset-env']
    }).code;
    return loadConfigFromBundledFile(fileName, code);
}
async function loadConfigFromBundledFile(fileName, bundledCode) {
    const resolvedFileName = fs.realpathSync(fileName);
    const extension = path$1.extname(resolvedFileName);
    const defaultLoader = require.extensions[extension];
    require.extensions[extension] = (module, requiredFileName) => {
        if (requiredFileName === resolvedFileName) {
            module._compile(bundledCode, requiredFileName);
        }
        else {
            defaultLoader(module, requiredFileName);
        }
    };
    delete require.cache[resolvedFileName];
    try {
        const config = getDefaultFromCjs(require(fileName));
        require.extensions[extension] = defaultLoader;
        return config;
    }
    catch (err) {
        console.log('Failed to load ES module from CommonJS. This is not supported.');
        throw err;
    }
}

const options$2 = {
    yes: [ 'yes', 'y' ],
    no:  [ 'no', 'n' ]
};


function defaultInvalidHandler ({ question, defaultValue, yesValues, noValues }) {
    process.stdout.write('\nInvalid Response.\n');
    process.stdout.write('Answer either yes : (' + yesValues.join(', ')+') \n');
    process.stdout.write('Or no: (' + noValues.join(', ') + ') \n\n');
}


async function ask ({ question, defaultValue, yesValues, noValues, invalid }) {
    if (!invalid || typeof invalid !== 'function')
        invalid = defaultInvalidHandler;

    yesValues = (yesValues || options$2.yes).map((v) => v.toLowerCase());
    noValues  = (noValues || options$2.no).map((v) => v.toLowerCase());

    const rl = readline__default['default'].createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(function (resolve, reject) {
        rl.question(question + ' ', async function (answer) {
            rl.close();

            const cleaned = answer.trim().toLowerCase();
            if (cleaned == '' && defaultValue != null)
                return resolve(defaultValue);
    
            if (yesValues.indexOf(cleaned) >= 0)
                return resolve(true);
                
            if (noValues.indexOf(cleaned) >= 0)
                return resolve(false);
    
            invalid({ question, defaultValue, yesValues, noValues });
            const result = await ask({ question, defaultValue, yesValues, noValues, invalid });
            resolve(result);
        });
    });
}


var yesno = ask;

const defaultConfig = `export default {
    input: 'src/snowblade/index.html',

    include: [
        'src/snowblade/components/**/*.html'
    ],

    output: {
        file: 'dist/index.html',
        formatting: 'none'
    }
}`;
const samples = {
    index: `<!DOCTYPE html>
    <html lang="en">
      <head>
        <DocHead />
      </head>
      <body>
        <div
          x-data="app()"
          x-init="init()"
          class="h-screen w-screen grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        >
          <MetricCard
            ::title="Reservoir Level"
            ::color="blue"
            ::trend="down"
            ::glyph="water"
            ::value="316 FT"
          ></MetricCard>
    
          <MetricCard
            ::title="Current Output"
            ::color="yellow"
            ::trend="up"
            ::glyph="bolt"
            ::value="3400 MW"
          ></MetricCard>
    
          <MetricCard
            $$wrap="template"
            x-for="m in metrics"
            ::$title="m.name"
            ::$color="m.alarm ? 'red' : 'green'"
            ::$trend="m.trend === 'rise' ? 'up' : 'down'"
            ::$glyph="{turbine: 'fan', flare_stack: 'fire', pump: 'faucet', steam: 'wind', radiation: 'radiation'}[m.type]"
            ::$value="m.value"
          ></MetricCard>
        </div>
      </body>
      <AlpineSource />
    </html>`,
    components: {
        head: `<meta snowblade name="DocHead" />

        <title>Dashboard</title>
        <link
          href="https://unpkg.com/tailwindcss@latest/dist/tailwind.min.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.2/css/all.min.css"
        />
        <script
          src="https://cdn.jsdelivr.net/gh/alpinejs/alpine@latest/dist/alpine.min.js"
          defer
        ></script>`,
        alpineSource: `<meta snowblade name="AlpineSource" />

        <script>
          const metricsData = \`[{"name":"Unit #1 Pri.","trend":"fall","alarm":false,"value":"4,283 RPM","type":"turbine"},{"name":"Unit #1 Sec.","trend":"fall","alarm":false,"value":"4,055 RPM","type":"turbine"},{"name":"Well #3 Relief","trend":"fall","alarm":false,"value":"572 ºC","type":"flare_stack"},{"name":"Toluene Burn-off #2","trend":"fall","alarm":false,"value":"636 ºC","type":"flare_stack"},{"name":"Toluene Burn-off #1","trend":"rise","alarm":false,"value":"623 ºC","type":"flare_stack"},{"name":"Unit #1 LPCI","trend":"fall","alarm":false,"value":"139,357 L/min","type":"pump"},{"name":"Condenser Coolant #1","trend":"rise","alarm":false,"value":"137,889 L/min","type":"pump"},{"name":"Condenser Coolant #2","trend":"fall","alarm":true,"value":"116,146 L/min","type":"pump"},{"name":"Unit #1 Pri. Circuit","trend":"rise","alarm":false,"value":"11 MPa","type":"steam"},{"name":"Unit #1 Sec. Circuit","trend":"rise","alarm":false,"value":"12 MPa","type":"steam"},{"name":"Unit #1 Upper Deck","trend":"rise","alarm":false,"value":"287 Bq","type":"radiation"},{"name":"Unit #1 Relief","trend":"fall","alarm":false,"value":"172 Bq","type":"radiation"},{"name":"Unit #1 Heat Exch.","trend":"fall","alarm":false,"value":"225 Bq","type":"radiation"},{"name":"North Env.","trend":"fall","alarm":false,"value":"361 Bq","type":"radiation"}]\`;
        
          function app() {
            return {
              metrics: [],
              init() {
                this.metrics = JSON.parse(metricsData);
              }
            };
          }
        </script>`,
        metricCard: `<meta
        snowblade
        name="MetricCard"
        ::color="blue"
        ::title
        ::glyph
        ::trend
        ::value
      />
      
      <div class="w-full p-6">
        <div
          class="bg-gradient-to-b from-{{ color }}-200 to-{{ color }}-100 border-b-4 border-{{ color }}-600 rounded-lg shadow-xl p-5"
        >
          <div class="flex flex-row items-center">
            <div class="flex-shrink pr-4">
            <div class="rounded-full h-16 w-16 flex items-center text-center bg-{{ color }}-600">
            <i class="fa fa-{{ glyph }} fa-2x fa-inverse mx-auto"></i>
          </div>
            </div>
            <div class="flex-1 text-right md:text-center">
              <h5 class="font-bold uppercase text-gray-600">{{ title }}</h5>
              <h3 class="font-bold text-3xl">
                {{ value }}
                <span class="text-{{ color }}-500"
                  ><i class="fas fa-caret-{{ trend }}"></i
                ></span>
              </h3>
            </div>
          </div>
        </div>
      </div>`
    }
};
async function verifyOverwrite(filePath, desc) {
    try {
        fs.realpathSync(filePath);
        const ok = await yesno({
            question: `A ${desc} already exists in your project directory. Do you want to overwrite it?`
        });
        return ok;
    }
    catch (err) {
        return true;
    }
}
async function writeConfig() {
    const configPath = absolutePath('snowblade.config.js');
    const ok = await verifyOverwrite(configPath, 'Snowblade config file');
    if (!ok)
        return;
    fs.writeFileSync(configPath, defaultConfig);
}
const basePath = absolutePath('');
const snowbladePath = [basePath, 'src', 'snowblade'].join(path$1.sep);
const componentsPath = [snowbladePath, 'components'].join(path$1.sep);
const distPath = [basePath, 'dist'].join(path$1.sep);
function makeDirectories() {
    fs.mkdirSync(componentsPath, {
        recursive: true
    });
    fs.mkdirSync(distPath, {
        recursive: true
    });
}
async function makeSampleComponents() {
    let ok = await yesno({
        question: 'Do you want to start with some sample components?'
    });
    if (!ok)
        return;
    let descPrefix = `file named src/snowblade/`;
    let filePath = `${snowbladePath}${path$1.sep}index.html`;
    ok = await verifyOverwrite(filePath, `${descPrefix}index.html`);
    if (ok)
        fs.writeFileSync(filePath, samples.index);
    descPrefix = `${descPrefix}components/`;
    filePath = `${componentsPath}${path$1.sep}dochead.html`;
    ok = await verifyOverwrite(filePath, `${descPrefix}dochead.html`);
    if (ok)
        fs.writeFileSync(filePath, samples.components.head);
    filePath = `${componentsPath}${path$1.sep}alpinesource.html`;
    ok = await verifyOverwrite(filePath, `${descPrefix}alpinesource.html`);
    if (ok)
        fs.writeFileSync(filePath, samples.components.alpineSource);
    filePath = `${componentsPath}${path$1.sep}metriccard.html`;
    ok = await verifyOverwrite(filePath, `${descPrefix}metriccard.html`);
    if (ok)
        fs.writeFileSync(filePath, samples.components.metricCard);
}
async function init$1() {
    await writeConfig();
    makeDirectories();
    await makeSampleComponents();
}

async function load() {
    try {
        const config = await loadConfigFile(options$1.config, true);
        return Array.isArray(config) ? config : [config];
    }
    catch (error) {
        handleError(error);
    }
}
async function run() {
    if (options$1.init) {
        init$1();
        return;
    }
    const configs = await load();
    try {
        configs.map((conf) => {
            const snowblade = new Snowblade(conf);
            snowblade.outputs.forEach((output) => output.buildBaseExpression());
        });
    }
    catch (err) {
        handleError(err, true);
    }
}
run();
