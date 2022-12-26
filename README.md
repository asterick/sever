![](dagger.png)

Sever
=====

Sever is a mostly-optimized tokenizer/lexer generator.  It is designed to support back-references, capture groups and modern language features while maintaining compatiblity with most of the ![🐄 moo](https://github.com/no-context/moo/) API.

* [Why not just use moo](#why-not-just-use-moo)
* [Usage](#usage)
* [API](#api)
* [Tokenizer](#class-tokenize)
* [Optioned Token](#optioned-token)
* [States](#states)

Why not just use moo?
---------------------

Moo is a fantastic lexer, and I have personally been using it for years.  With that comes some caveats, especially around which features of RegExp objects can be used without complaints.  Being able to parse things such as Lua, where back-references are nessesary to capture multiline strings easily.  Additionally, capture groups make value tranformations simpler.

This results in a few trade offs:

1. Convenience features deprioritize speed as the primary optimization metric.
2. I do not support legacy runtime environments
3. Undocumented features, or ones that can easily be replaced with ES6 operations are not a firm requirement.

Usage
-----

Basic installation is as follows: `npm install sever` for a node like environment, alternatively, you can include `sever.js` in a script tag directly.

```js
const lexer = tokenizer.compile({
    WhiteSpace:  { match: /\s+/, lineBreaks: true },
    Number: { match: /\d+\.\d*|\d*\.\d+|\d+/, value: (v) => Number(v) },
    Keyword: {
        match: [
            "and",   "break", "do",       "else",  "elseif", "end",
            "false", "for",   "function", "goto",  "if",     "in",
            "local", "nil",   "not",      "or",    "repeat", "return",
            "then",  "true",  "until",    "while",
        ],
        wordBound: true
    },
    Tuple: { match: /(\w+),(\w+),(\w+)/, value: (token, ... groups) => groups  },
    Identifer: /\w+/,
    LeftParen: '(',
    RightParn: ')',
    String: { match: /\[(?<smark>.*?)\[(?<string>(?:(?!\]\k<smark>\])\\?.)*)\]\k<smark>\]/, value: (token, groups) => groups.string },
    LuaComment: /--\[(?<cmark>.*?)\[(?<content>(?:(?!\]\k<cmark>\])\\?.)*)\]\k<cmark>\]/
});
```

Finally, you must feed a source file to the returned [Tokenizer](#class-tokenize).

```js
lexer.reset('Hello world');
lexer.next(); // { type: 'Identifier', value: 'Hello', ... }
lexer.next(); // { type: 'Identifier', value: 'world', ... }
```

API
---

## sever.compile(tokens) ##

Generates a lexer.  Tokens must be an object providing keys (Token type name), and values (matching option for type).
** Order of matches determines priority **.  Returns a [Tokenizer](#class-tokenize),

```js
sever.compile({
    keyword: ["and", "xor", "or", "not"],
    identifier: /\w+/,
    number: /[0-9]+/,
    semicolon: ";",
    ws: { match: /\s+/, discard: true }
})
```

Matching objects can be:
* Literal string
* RegExp object
* Array of Matching objects
* [Optioned Token](#optioned-token)

## sever.states(states) ##

Generates a stateful lexer.  This works much like `.compile()`, with the exception that you have multiple matching groups that can be statefully

```js
sever.states({
    main: {
        enter: { match: '"', push: "string", discard: true },
        whitespace: { match: /\s+/, discard: true },
        identifier: /\w+/,
        number: /[0-9]+/
    },
    string: {
        exit: { match: '"', pop: 1, discard: true },
        escape: /\\./,
        character: /./
    }
})
```

## sever.error ##

This is a default error catch all that can be inserted into any token group.  It matches an arbitrary group of characters from the feed of a similar type.

```js
const lexer = sever.compile({
    Error: sever.error
});

lexer.reset("BadToken!");
lexer.next(); // { type: 'Error', value: 'BadToken', error: true, ... }
```

class Tokenize
--------------

## Tokenize.reset(source, state?) ##

Initialize the tokenizer, or restore it to a previous state.

Source is the string to be tokenized, and state is an optional parameter (returned from `.save()`)

## Tokenize.next() ##

Returns the next matched token in the provided source

### Token Format ##
* **`type`**: the name of the group, as passed to compile.
* **`text`**: the string that was matched.
* **`value`**: the string that was matched, transformed by your `value` function (if any).
* **`offset`**: the number of bytes from the start of the buffer where the match starts.
* **`lineBreaks`**: the number of line breaks found in the match. (Always zero if this rule has `lineBreaks: false`.)
* **`line`**: the line number of the beginning of the match, starting from 1.
* **`col`**: the column where the match begins, starting from 1.

## *\[Symbol.iterator] ##

Provides iterator support.

```js
const lexer = sever.compile({...});
for (let token of sever) {
    console.log(token);
}
```

## Tokenize.save() ##

Preserves the current state of the lexer.  The value may be passed to `.reset(...)` as it's second argument to rewind history

## Tokenize.has(token) ##

States wether or not the tokenizer will match the name of a given token type.

## Tokenize.formatError(token) ##

Returns a formatted message describing the token.  Useful for printing debug information to console.

```
Error: BadOperator at line 5 col 15:
This is a?failure
         ^
```

Optioned Token
--------------

Some tokens require a little more complex matching than a basic regular expression or literal string.

## Token Options ##
* **[`.match`](#match) (required)**: Matching pattern for token
* **[`.value`](#value)**: Value transformation function
* **[`.error`](#error)**: Token should be treated as a failure
* **[`.push`](#states)**: Push state to stack, and swap context
* **[`.pop`](#states)**: Restore previously pushed context from stack
* **[`.next`](#states)**: Set context to new state
* **[`.discard`](#discard)**: Match but discard token
* **[`.wordBound`](#wordbound)**: Token is word bound
* **[`.lineBreaks`](#lineBreaks)**: Token may contain linebreaks

### `match` ###

This is the matching pattern for the token.  This will accept: Literal Strings, RegExp objects, and Arrays of Literal Strings or RegExp objects.

```js
const complexMatches = {
    whitespace: { match: /\s+/ },
    number: { match: /[0-9]*.[0-9]+|[0-9]+.[0-9]*|[0-9]+/ }
    keywords: { match: [ 'yes' , 'no', 'maybe' ] }
};
```

Optioned tokens cannot be nested inside one another, and will result in an error.

### `error` ###

This will define the token as a failure case, causing tokenization to stop following this, and an error flag will be set inside of the return token object.

### `discard` ###

This flags a token as matched, but unused.  This is helpful for things such as whitespace which must be removed, but are generally unused inside of your parser.

### `wordBound` ###

This defines the match as being wordbound.  This is especially helpful for keywords, as you no longer need to sort the values by length.

```js
const lexer = sever.compile({
    ...
    keywords: {
        match: [
            "and",   "break", "do",       "else",  "elseif", "end",
            "false", "for",   "function", "goto",  "if",     "in",
            "local", "nil",   "not",      "or",    "repeat", "return",
            "then",  "true",  "until",    "while",
        ],
        wordBound: true
    },
    ...
});
```

### `lineBreaks` ###

This specifies that the matched token contains line breaks.   If the value is a number, the token is treated as a fixed number of line breaks.

```js
{ match: /\n\r?|\r\n?/, lineBreaks: 1 }
```

Any other truthy value will simply specify that the token may contain line breaks and a second pass must be taken to determine what the location is after the match.
** This case should be avoided, as it will have a significant impact on matching this token type **

```js
{ match: /[\s]+/, lineBreaks: true }
```

### `value` ###

This provides a value transformation function to the token.  This operates in 3 different calling conventions depending on if you are matching a RegExp, and if that RegExp contains capture groups.  Regardless of which mode, the provided function will be called with the match (and optionally the capture groups), and should return a value to be placed in the returned token as a property named `.value`.

#### Named capture group value transformation ###

If you provided a regular expression with named groups, the 2nd argument of your value transformation will be an object containing all of your capture groups by name.
```js
{ match: /'(?<string>[^']*)'/, value: (match, groups) => (groups.string) }
```

#### Numbered capture groups ####

If you provided a regular expression with ordered capture groups, they will be provided as a spread of arguments.  If no capture groups are supplied, or a literal string is matched only the match will be passed to the transformation function.

```js
{ match: /(\w+).(\w)/, value: (match, ident, property) => ({ident, property}) }
```

### States ###

I need to describe how states work in depth.
