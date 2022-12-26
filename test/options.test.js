const { describe, expect, test } = require('@jest/globals');
const sever = require("..");

describe('match options', () => {
    test('lineBreaks can do simple increment', () => {
        const lexer = sever.compile({
            identifier: /\w+/,
            lineFeed: { match: /\r\n?|\n\r?/, lineBreaks: 1 },
            WS: { match: /\s/, discard: true }
        });

        lexer.reset("\r\n\r\n  asdf\n\r\r\n    asdf");

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                lineBreaks: 1
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                lineBreaks: 1
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                offset: 6,
                line: 3,
                col: 3,
                type: "identifier"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                lineBreaks: 1
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                lineBreaks: 1
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                offset: 18,
                line: 5,
                col: 5,
                type: "identifier"
            })
        );
    });

    test('simple lineBreaks track column correctly while discarded', () => {
        const lexer = sever.compile({
            identifier: /\w+/,
            lineFeed: { match: /\r\n?|\n\r?/, lineBreaks: 1, discard: true },
            WS: { match: /\s/, discard: true }
        });

        lexer.reset("\r\n\r\n  asdf\n\r\r\n    asdf");

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                offset: 6,
                line: 3,
                col: 3,
                type: "identifier"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                offset: 18,
                line: 5,
                col: 5,
                type: "identifier"
            })
        );
    });

    test('lineBreaks can count line feeds', () => {
        const lexer = sever.compile({
            identifier: /\w+/,
            WS: { match: /\s+/, discard: true, lineBreaks: true }
        });

        lexer.reset("   \r\n\r\n   asdf");

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                offset: 10,
                line: 3,
                col: 4,
                type: "identifier"
            })
        );
    });

    test('lineBreaks passes linebreaks', () => {
        const lexer = sever.compile({
            identifier: /\w+/,
            WS: { match: /\s+/, lineBreaks: true }
        });

        lexer.reset("   \r\n\r\n   asdf");

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                lineBreaks: 2,
                type: "WS"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                offset: 10,
                line: 3,
                col: 4,
                type: "identifier"
            })
        );
    });

    test('word boundaries work as expected', () => {
        const lexer = sever.compile({
            keyword: {
                match: [ 'class', 'className', 'and', 'or', 'xor' ],
                wordBound: true,
            },
            identifier: /\w+/,
            WS: { match: /\s+/, discard: true }
        });

        lexer.reset("classclass class className and or xorb");

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                type: "identifier",
                value: "classclass"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                type: "keyword",
                value: "class"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                type: "keyword",
                value: "className"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                type: "keyword",
                value: "and"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                type: "keyword",
                value: "or"
            })
        );

        expect(lexer.next()).toEqual(
            expect.objectContaining({
                type: "identifier",
                value: "xorb"
            })
        );
    });
});
