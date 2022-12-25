const tokenizer = require("..");

function dump(tokenizer) {
    for(let token of tokenizer) {
        console.log(token);
    }
}

/*
 * Basic test case
 */

const basic = tokenizer.compile({
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

basic.reset(`1234 \n .1234 \r 1234. \n\r \r\n  x,y,z elseif  1234.1234 \r\n asdf and ( ) [[Hello\\]]] --[asdf[World]\\]]asdf]`);
dump(basic);

/*
 * Stateful test case
 */

const states_next = tokenizer.states({
    words: {
        WhiteSpace:  { match: /\s+/, lineBreaks: true, discard: true },
        Numbers: { match: "[", next: 'numbers', discard: true },
        Identifer: /\w+/,
    },
    numbers: {
        WhiteSpace:  { match: /\s+/, lineBreaks: true, discard: true },
        Words: { match: "]", next: 'words', discard: true },
        Number: { match: /\d+\.\d*|\d*\.\d+|\d+/, value: (v) => Number(v) }
    }
})

states_next.reset('asdf [ 1 2 3 ] asdf asdf [ asdf ]');
//dump(states_next);

const states_push = tokenizer.states({
    words: {
        WhiteSpace:  { match: /\s+/, lineBreaks: true, discard: true },
        Numbers: { match: "[", push: 'numbers', discard: true },
        Identifer: /\w+/,
    },
    numbers: {
        WhiteSpace:  { match: /\s+/, lineBreaks: true, discard: true },
        Words: { match: "]", pop: true, discard: true },
        Number: { match: /\d+\.\d*|\d*\.\d+|\d+/, value: (v) => Number(v) }
    }
})

states_push.reset('asdf [ 1 2 3 ] asdf asdf [ asdf ]');
//dump(states_push);
