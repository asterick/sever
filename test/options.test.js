const { describe, expect, test } = require('@jest/globals');
const sever = require("..");

describe('match options', () => {
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
