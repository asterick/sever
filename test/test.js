const tokenizer = require("..");

const working = tokenizer.states({
    main: {
        lineFeed:  { match: /\r\n?|\n\r?/, lineBreaks: true, discard: true },
        whiteSpace: { match: /\s+/, discard: true },
        number: { match: /\d+.\d*|\d*.\d+|\d+/, value: (v) => Number(v) },
        identifer: /\w+/,
        lparen: '(',
        rparen: ')',
        LuaComment: /\[(?<marker>[^[]*]).*\]\g<marker>\]/,
        keyword: {
            match: [
                "and",   "break", "do",       "else",  "elseif", "end",
                "false", "for",   "function", "goto",  "if",     "in",
                "local", "nil",   "not",      "or",    "repeat", "return",
                "then",  "true",  "until",    "while",
            ],
            wordBreaks: true
        }
    }
});
