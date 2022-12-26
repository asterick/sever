const { describe, expect, test } = require('@jest/globals');
const sever = require("..");

describe('error conditions', () => {
    test('default errors work', () => {
        const lexer = sever.compile({
            WS: { match: /\s+/, discard: true },
            identifier: /\w+/,
            error: sever.error
        });

        lexer.reset("hello there!");

        expect(lexer.next().error).toBeFalsy();
        expect(lexer.next().error).toBeFalsy();
        expect(lexer.next().error).toBeTruthy();
        expect(lexer.next()).toBeUndefined();
    });

    test('can be formatted', () => {
        const lexer = sever.compile({
            WS: { match: /\s+/, discard: true },
            identifier: { match: /\w+/, discard: true },
            error: sever.error
        });

        lexer.reset("hello there!");
        const err = lexer.next();

        expect(err).toEqual(expect.objectContaining({
            error: true,
            type: 'error',
            match: '!'
        }));

        const formatted = lexer.formatError(err).replace(/\r\n?|\n\r?/g,"\n");
        const expected = "Error: error at line 1 col 12:\n\nhello there!\n           ^";

        expect(formatted).toBe(expected);
    });
});
